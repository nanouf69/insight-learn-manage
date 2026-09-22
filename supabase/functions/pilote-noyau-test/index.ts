// PILOTE DU NOYAU SÉCURISÉ — création et purge d'un jeu de données TEST.
// Aucune donnée réelle n'est lue, modifiée ni supprimée : tout est marqué TEST
// (is_test = true, comptes @pilote.test, apprenants nommés TEST-PILOTE).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const MDP = "PiloteNoyau!2026";
const DOMAINE = "@pilote.test";
const EXAM_ID = "TEST-EB-PILOTE";

const MATIERES = [
  { subject_id: "test_a", lettre: "A", titre: "TEST — Matière A", ordre: 1 },
  { subject_id: "test_b", lettre: "B", titre: "TEST — Matière B", ordre: 2 },
  { subject_id: "test_c", lettre: "C", titre: "TEST — Matière C", ordre: 3 },
];

function construireQuestions() {
  const questions: Record<string, unknown>[] = [];
  for (const m of MATIERES) {
    for (let i = 1; i <= 2; i++) {
      questions.push({
        id: `${m.subject_id}-q${i}`,
        matiere: m.subject_id,
        type: "QRC",
        enonce: `[TEST] ${m.titre} — question ouverte n°${i} : expliquez le point ${m.lettre}${i}.`,
        reponseQRC: `[TEST] Réponse officielle attendue pour ${m.titre} n°${i} (figée dans le snapshot).`,
        points: i === 1 ? 2 : 1.5,
      });
    }
  }
  return questions;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // Seul un administrateur connecté peut piloter ce test.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData } = await asUser.auth.getUser();
  if (!userData?.user) return json({ error: "Authentification requise" }, 401);
  const { data: estAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (!estAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

  let action = "etat";
  try {
    action = (await req.json())?.action ?? "etat";
  } catch { /* corps vide */ }

  if (action === "seed") {
    // 1) Comptes TEST (formateur + 5 apprenants)
    const comptes = [
      { email: `formateur${DOMAINE}`, nom: "TEST-PILOTE", prenom: "Formateur", formateur: true },
      ...Array.from({ length: 5 }, (_, i) => ({
        email: `apprenant${i + 1}${DOMAINE}`,
        nom: "TEST-PILOTE",
        prenom: `Apprenant ${i + 1}`,
        formateur: false,
      })),
    ];

    const crees: Record<string, string> = {};
    for (const c of comptes) {
      const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existant = liste?.users.find((u) => u.email === c.email);
      const uid = existant
        ? existant.id
        : (await admin.auth.admin.createUser({ email: c.email, password: MDP, email_confirm: true })).data.user!.id;
      crees[c.email] = uid;

      if (c.formateur) {
        await admin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        const { data: dejaLa } = await admin.from("apprenants").select("id").eq("auth_user_id", uid).maybeSingle();
        if (!dejaLa) {
          await admin.from("apprenants").insert({ nom: c.nom, prenom: c.prenom, email: c.email, auth_user_id: uid });
        }
      }
    }

    // 2) Version d'examen TEST publiée (immuable une fois publiée)
    const questions = construireQuestions();
    const content = { exam_id: EXAM_ID, exam_libelle: "Examen TEST — pilote du noyau", matieres: MATIERES, questions };
    const fingerprint = [...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(questions))),
    )].map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: version, error: errVersion } = await admin
      .from("exam_content_versions")
      .insert({
        filiere: "VTC", exam_numero: "TEST", exam_id: EXAM_ID, version_number: 1,
        statut: "brouillon", content, fingerprint, is_test: true,
        motif: "PILOTE TEST du noyau sécurisé — données fictives", created_email: "pilote@test",
      })
      .select("id").single();
    if (errVersion) return json({ error: errVersion.message, etape: "version" }, 500);

    const { error: errPub } = await admin.rpc("core_publish_exam_version", {
      p_operation_id: crypto.randomUUID(), p_version_id: version.id, p_published_email: "pilote@test",
    });
    if (errPub) return json({ error: errPub.message, etape: "publication" }, 500);

    // 3) Une tentative TEST en cours par apprenant, snapshot figé
    const tentatives: Record<string, string> = {};
    for (const c of comptes.filter((x) => !x.formateur)) {
      const uid = crees[c.email];
      const { data: app } = await admin.from("apprenants").select("id").eq("auth_user_id", uid).single();
      const { data: att, error: errAtt } = await admin
        .from("exam_attempts_v2")
        .insert({
          apprenant_id: app!.id, exam_id: EXAM_ID, exam_version_id: version.id,
          snapshot: { ...content, session: { date: "2026-09-22", heure: "16:00" } },
          snapshot_fingerprint: fingerprint, etat: "en_cours", is_test: true,
        })
        .select("attempt_id").single();
      if (errAtt) return json({ error: errAtt.message, etape: "tentative" }, 500);
      tentatives[c.email] = att!.attempt_id;
    }

    return json({ ok: true, exam_id: EXAM_ID, version_id: version.id, mot_de_passe: MDP, comptes: crees, tentatives });
  }

  if (action === "cleanup") {
    const { data: purge, error } = await admin.rpc("core_purge_donnees_test");
    if (error) return json({ error: error.message, etape: "purge" }, 500);

    const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let comptesSupprimes = 0;
    for (const u of liste?.users ?? []) {
      if (!u.email?.endsWith(DOMAINE)) continue;
      await admin.from("apprenants").delete().eq("auth_user_id", u.id);
      await admin.from("user_roles").delete().eq("user_id", u.id);
      await admin.auth.admin.deleteUser(u.id);
      comptesSupprimes++;
    }
    return json({ ok: true, purge, comptesSupprimes });
  }

  // état
  const { count: tentatives } = await admin
    .from("exam_attempts_v2").select("*", { count: "exact", head: true }).eq("is_test", true);
  return json({ ok: true, tentatives_test: tentatives ?? 0 });
});
