import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const enc = new TextEncoder();
const SESSION_TTL_SECONDS = 12 * 60 * 60; // jeton de session du parcours (12 h)
const RESEND_WINDOW_MINUTES = 60;
const RESEND_MAX_PER_WINDOW = 5;
const DEFAULT_BASE_URL = "https://gestion.ftransport.fr";

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "fallback";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function issueSessionToken(apprenantId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(`onboarding:${apprenantId}:${exp}`)}`;
}

async function verifySessionToken(apprenantId: string, token: string) {
  const [expRaw, sig] = String(token || "").split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  return (await hmac(`onboarding:${apprenantId}:${exp}`)) === sig;
}

function newInviteToken() {
  const bytes = new Uint8Array(32); // 256 bits — impossible à deviner
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-']/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

type Supa = ReturnType<typeof createClient>;

async function createInvitation(supabase: Supa, apprenantId: string, createdBy: string | null) {
  // Un nouveau lien invalide systématiquement les précédents.
  await supabase
    .from("onboarding_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("apprenant_id", apprenantId)
    .is("revoked_at", null);

  const token = newInviteToken();
  const tokenHash = await sha256Hex(token);
  const { error } = await supabase.from("onboarding_invitations").insert({
    apprenant_id: apprenantId,
    token_hash: tokenHash,
    created_by: createdBy,
  });
  if (error) throw new Error(error.message);
  return token;
}

async function sendInvitationEmail(
  supabase: Supa,
  apprenant: { id: string; prenom?: string | null; email?: string | null },
  link: string,
) {
  if (!apprenant.email) return false;
  const body = `
    <p>Bonjour ${apprenant.prenom || ""},</p>
    <p>Voici votre lien personnel pour compléter (ou reprendre) votre inscription chez <strong>FTRANSPORT</strong> :</p>
    <p><a href="${link}">${link}</a></p>
    <p>Ce lien est strictement personnel : ne le transmettez à personne. Il donne accès uniquement à votre dossier.</p>
    <p>Si vous avez déjà commencé votre inscription, vous retrouverez toutes vos réponses déjà enregistrées.</p>
    <p>FTRANSPORT — 04 28 29 60 91</p>
  `;

  const { error } = await supabase.functions.invoke("sync-outlook-emails", {
    body: {
      action: "send",
      apprenantId: apprenant.id,
      userEmail: "contact@ftransport.fr",
      to: apprenant.email,
      subject: "Votre lien personnel d'inscription — FTRANSPORT",
      body,
    },
  });
  if (error) throw new Error(error.message || "Envoi impossible");

  await supabase
    .from("onboarding_invitations")
    .update({ sent_count: 1, last_sent_at: new Date().toISOString() })
    .eq("apprenant_id", apprenant.id)
    .is("revoked_at", null);

  return true;
}

// ── Calendrier examens théoriques (copie serveur de src/lib/examDatesConfig.ts, contrôlée par test de parité) ──
const CALENDRIER_EXAMENS: { date: string; iso: string; dateLimite: string | null; dateLimiteLibelle: string | null }[] = [
  { date: "27 janvier 2026", iso: "2026-01-27", dateLimite: null, dateLimiteLibelle: null },
  { date: "31 mars 2026", iso: "2026-03-31", dateLimite: null, dateLimiteLibelle: null },
  { date: "26 mai 2026", iso: "2026-05-26", dateLimite: "2026-05-06", dateLimiteLibelle: "6 mai 2026" },
  { date: "21 juillet 2026", iso: "2026-07-21", dateLimite: "2026-07-03", dateLimiteLibelle: "3 juillet 2026" },
  { date: "29 septembre 2026", iso: "2026-09-29", dateLimite: "2026-09-11", dateLimiteLibelle: "11 septembre 2026" },
  { date: "17 novembre 2026", iso: "2026-11-17", dateLimite: "2026-10-30", dateLimiteLibelle: "30 octobre 2026" },
  { date: "26 janvier 2027", iso: "2027-01-26", dateLimite: "2027-01-08", dateLimiteLibelle: "8 janvier 2027 à 12h" },
  { date: "30 mars 2027", iso: "2027-03-30", dateLimite: "2027-03-12", dateLimiteLibelle: "12 mars 2027 à 12h" },
  { date: "25 mai 2027", iso: "2027-05-25", dateLimite: "2027-05-07", dateLimiteLibelle: "7 mai 2027 à 12h" },
  { date: "20 juillet 2027", iso: "2027-07-20", dateLimite: "2027-07-02", dateLimiteLibelle: "2 juillet 2027 à 12h" },
  { date: "28 septembre 2027", iso: "2027-09-28", dateLimite: "2027-09-10", dateLimiteLibelle: "10 septembre 2027 à 12h" },
  { date: "7 décembre 2027", iso: "2027-12-07", dateLimite: "2027-11-19", dateLimiteLibelle: "19 novembre 2027 à 12h" },
];
const deaccentCal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
function trouverExamen(valeur: string | null | undefined) {
  const v = deaccentCal(String(valeur || ""));
  if (!v) return null;
  const m = CALENDRIER_EXAMENS.filter((e) => {
    const [y, mo, d] = e.iso.split("-");
    return new RegExp(`(^|\\D)${deaccentCal(e.date)}($|\\D)`).test(v) || v.includes(e.iso) || new RegExp(`(^|\\D)${d}/${mo}/${y}`).test(v);
  });
  return m.length === 1 ? m[0] : null;
}
function joursAvantLimite(limiteIso: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const [a, b, c] = today.split("-").map(Number);
  const [x, y, z] = limiteIso.split("-").map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000);
}
const frDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const escHtml = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

async function lireStatutSuivi(supabase: Supa, apprenantId: string, fallback: string | null) {
  const { data: links } = await supabase
    .from("session_apprenants")
    .select("statut_suivi, created_at, sessions:session_id(date_debut)")
    .eq("apprenant_id", apprenantId);
  const withStatut = (links || [])
    .filter((l: any) => l.statut_suivi)
    .sort((a: any, b: any) =>
      String(b.sessions?.date_debut || b.created_at || "").localeCompare(String(a.sessions?.date_debut || a.created_at || "")));
  return (withStatut[0] as any)?.statut_suivi ?? fallback ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const baseUrl = typeof body?.base_url === "string" && body.base_url.startsWith("http")
      ? body.base_url.replace(/\/$/, "")
      : DEFAULT_BASE_URL;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const ipHash = await sha256Hex(ip);

    // ---------- ADMIN : création / envoi d'un lien personnel ----------
    if (action === "create") {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) return json({ error: "Non autorisé" }, 401);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) return json({ error: "Non autorisé" }, 403);

      const apprenantId = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      if (!apprenantId) return json({ error: "Dossier requis" }, 400);

      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email")
        .eq("id", apprenantId)
        .maybeSingle();
      if (!apprenant) return json({ error: "Dossier introuvable" }, 404);

      const token = await createInvitation(supabase, apprenantId, userId);
      const link = `${baseUrl}/bienvenue/invitation?token=${token}`;

      let sent = false;
      if (body?.send !== false) {
        try {
          sent = await sendInvitationEmail(supabase, apprenant as any, link);
        } catch (err) {
          console.error("invitation email failed", err);
          return json({ link, sent: false, error: "Lien créé mais e-mail non envoyé" }, 200);
        }
      }
      return json({ link, sent });
    }

    // ---------- PUBLIC : ouverture du lien personnel ----------
    if (action === "verify") {
      const token = typeof body?.token === "string" ? body.token.trim() : "";
      if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "Lien invalide" }, 403);

      const tokenHash = await sha256Hex(token);
      const { data: invitation } = await supabase
        .from("onboarding_invitations")
        .select("id, apprenant_id, expires_at, revoked_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (!invitation || invitation.revoked_at || new Date(invitation.expires_at as string) < new Date()) {
        return json({ error: "Ce lien n'est plus valide. Demandez un nouveau lien." }, 403);
      }

      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, adresse, code_postal, ville, type_apprenant, formation_choisie")
        .eq("id", invitation.apprenant_id as string)
        .maybeSingle();
      if (!apprenant) return json({ error: "Dossier introuvable" }, 404);

      await supabase
        .from("onboarding_invitations")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", invitation.id as string);

      const blob = `${apprenant.type_apprenant || ""} ${apprenant.formation_choisie || ""}`.toLowerCase();
      const isFC = /continu|\bfc\b|formation\s*continue/.test(blob);

      return json({
        dossier: {
          id: apprenant.id,
          nom: apprenant.nom,
          prenom: apprenant.prenom,
          email: apprenant.email,
          telephone: apprenant.telephone,
          adresse: apprenant.adresse,
          code_postal: apprenant.code_postal,
          ville: apprenant.ville,
        },
        is_fc: isFC,
        session_token: await issueSessionToken(String(apprenant.id)),
      });
    }

    // ---------- PUBLIC : « Je n'ai pas reçu mon lien » ----------
    if (action === "resend") {
      const nom = typeof body?.nom === "string" ? normalize(body.nom.slice(0, 100)) : "";
      const prenom = typeof body?.prenom === "string" ? normalize(body.prenom.slice(0, 100)) : "";
      if (nom.length < 2 || prenom.length < 2) return json({ error: "Nom et prénom requis" }, 400);

      const windowStart = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("onboarding_invite_rate_limit")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", windowStart);
      if ((count ?? 0) >= RESEND_MAX_PER_WINDOW) {
        return json({ error: "Trop de demandes. Merci de patienter ou d'appeler le centre au 04 28 29 60 91." }, 429);
      }
      await supabase.from("onboarding_invite_rate_limit").insert({ ip_hash: ipHash, kind: "resend" });

      // Réponse volontairement identique quel que soit le résultat : aucune information révélée.
      const genericOk = json({
        ok: true,
        message: "Si un dossier correspond, un lien personnel vient d'être envoyé à l'adresse e-mail enregistrée.",
      });

      // Traitement en arrière-plan : le temps de réponse est identique qu'un dossier existe ou non
      // (pas d'énumération possible par mesure de durée).
      const work = (async () => {
        const { data: matches } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, email")
          .ilike("nom", `%${String(body.nom).trim()}%`)
          .limit(20);

        const exact = (matches || []).filter(
          (a: any) => normalize(a.nom || "") === nom && normalize(a.prenom || "") === prenom && a.email,
        );

        for (const apprenant of exact.slice(0, 3)) {
          try {
            const token = await createInvitation(supabase, apprenant.id, null);
            await sendInvitationEmail(supabase, apprenant, `${baseUrl}/bienvenue/invitation?token=${token}`);
          } catch (err) {
            console.error("resend failed", err);
          }
        }
      })();

      try {
        // @ts-ignore EdgeRuntime est fourni par le runtime Supabase
        EdgeRuntime.waitUntil(work);
      } catch {
        await work;
      }

      return genericOk;
    }

    // ---------- PUBLIC : reprise du dossier déjà enregistré (lecture seule) ----------
    if (action === "load_state") {
      const apprenantId = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const sessionToken = typeof body?.session_token === "string" ? body.session_token : "";
      if (!apprenantId || !(await verifySessionToken(apprenantId, sessionToken))) {
        return json({ error: "Session d'inscription expirée." }, 403);
      }

      const { data, error } = await supabase
        .from("apprenant_documents_completes")
        .select("donnees, updated_at")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", "onboarding_state")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("load_state error", error);
        return json({ error: "Lecture indisponible" }, 500);
      }

      return json({ donnees: data?.donnees ?? null, updated_at: data?.updated_at ?? null });
    }

    // ---------- APPRENANT CONNECTÉ : « Mon dossier de formation » (lecture seule) ----------
    // Aucune écriture. Seul le dossier lié au compte connecté est lu ; un admin peut
    // consulter un dossier précis (aperçu) mais ne reçoit jamais de jeton de parcours.
    if (action === "dossier_formation_self") {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) return json({ error: "Non autorisé" }, 401);

      let apprenantId: string | null = null;
      let isSelf = false;
      const requested = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const { data: own } = await supabase
        .from("apprenants").select("id").eq("auth_user_id", userId).is("deleted_at", null).limit(1).maybeSingle();
      if (own?.id && (!requested || requested === own.id)) {
        apprenantId = String(own.id);
        isSelf = true;
      } else if (requested) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return json({ error: "Non autorisé" }, 403);
        apprenantId = requested;
      }
      if (!apprenantId) return json({ error: "Dossier introuvable" }, 404);

      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, adresse, code_postal, ville, type_apprenant, formation_choisie, statut_suivi, date_examen_theorique")
        .eq("id", apprenantId).maybeSingle();
      if (!apprenant) return json({ error: "Dossier introuvable" }, 404);

      const { data: docs } = await supabase
        .from("apprenant_documents_completes")
        .select("type_document, donnees")
        .eq("apprenant_id", apprenantId)
        .in("type_document", ["dossier-bienvenue", "projet-professionnel", "analyse-besoin", "test-competences"]);

      const isImg = (v: unknown) => typeof v === "string" && v.trim().startsWith("data:image/");
      const sigKeys = ["signature", "_signature_image", "signature_apprenant", "signatureDataUrl", "signature_data_url", "onboarding_signature"];
      const list = docs || [];
      const bienvenueSigne = list.some((d: any) =>
        d.type_document === "dossier-bienvenue" && d.donnees && sigKeys.some((k) => isImg(d.donnees[k])));
      const has = (t: string) => list.some((d: any) => d.type_document === t);

      // Statut CRM : même source que la page Examens (session de l'apprenant, sinon fiche)
      const statutSuivi = await lireStatutSuivi(supabase, String(apprenantId), (apprenant as any).statut_suivi ?? null);
      const exam = trouverExamen((apprenant as any).date_examen_theorique);
      let demandeActive: any = null;
      if (exam) {
        const { data: dem } = await supabase.from("demandes_inscription_urgentes")
          .select("id, created_at").eq("apprenant_id", apprenantId).eq("date_examen", exam.iso)
          .eq("statut", "a_traiter").maybeSingle();
        demandeActive = dem ?? null;
      }

      const blob = `${apprenant.type_apprenant || ""} ${apprenant.formation_choisie || ""}`.toLowerCase();
      const isFC = /continu|\bfc\b|formation\s*continue/.test(blob);

      return json({
        dossier: {
          id: apprenant.id,
          nom: apprenant.nom,
          prenom: apprenant.prenom,
          email: apprenant.email,
          telephone: apprenant.telephone,
          adresse: apprenant.adresse,
          code_postal: apprenant.code_postal,
          ville: apprenant.ville,
        },
        is_fc: isFC,
        session_token: await issueSessionToken(String(apprenant.id)),
      });
    }

    // ---------- PUBLIC : « Je n'ai pas reçu mon lien » ----------
    if (action === "resend") {
      const nom = typeof body?.nom === "string" ? normalize(body.nom.slice(0, 100)) : "";
      const prenom = typeof body?.prenom === "string" ? normalize(body.prenom.slice(0, 100)) : "";
      if (nom.length < 2 || prenom.length < 2) return json({ error: "Nom et prénom requis" }, 400);

      const windowStart = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("onboarding_invite_rate_limit")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", windowStart);
      if ((count ?? 0) >= RESEND_MAX_PER_WINDOW) {
        return json({ error: "Trop de demandes. Merci de patienter ou d'appeler le centre au 04 28 29 60 91." }, 429);
      }
      await supabase.from("onboarding_invite_rate_limit").insert({ ip_hash: ipHash, kind: "resend" });

      // Réponse volontairement identique quel que soit le résultat : aucune information révélée.
      const genericOk = json({
        ok: true,
        message: "Si un dossier correspond, un lien personnel vient d'être envoyé à l'adresse e-mail enregistrée.",
      });

      // Traitement en arrière-plan : le temps de réponse est identique qu'un dossier existe ou non
      // (pas d'énumération possible par mesure de durée).
      const work = (async () => {
        const { data: matches } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, email")
          .ilike("nom", `%${String(body.nom).trim()}%`)
          .limit(20);

        const exact = (matches || []).filter(
          (a: any) => normalize(a.nom || "") === nom && normalize(a.prenom || "") === prenom && a.email,
        );

        for (const apprenant of exact.slice(0, 3)) {
          try {
            const token = await createInvitation(supabase, apprenant.id, null);
            await sendInvitationEmail(supabase, apprenant, `${baseUrl}/bienvenue/invitation?token=${token}`);
          } catch (err) {
            console.error("resend failed", err);
          }
        }
      })();

      try {
        // @ts-ignore EdgeRuntime est fourni par le runtime Supabase
        EdgeRuntime.waitUntil(work);
      } catch {
        await work;
      }

      return genericOk;
    }

    // ---------- PUBLIC : reprise du dossier déjà enregistré (lecture seule) ----------
    if (action === "load_state") {
      const apprenantId = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const sessionToken = typeof body?.session_token === "string" ? body.session_token : "";
      if (!apprenantId || !(await verifySessionToken(apprenantId, sessionToken))) {
        return json({ error: "Session d'inscription expirée." }, 403);
      }

      const { data, error } = await supabase
        .from("apprenant_documents_completes")
        .select("donnees, updated_at")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", "onboarding_state")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("load_state error", error);
        return json({ error: "Lecture indisponible" }, 500);
      }

      return json({ donnees: data?.donnees ?? null, updated_at: data?.updated_at ?? null });
    }

    // ---------- APPRENANT CONNECTÉ : « Mon dossier de formation » (lecture seule) ----------
    // Aucune écriture. Seul le dossier lié au compte connecté est lu ; un admin peut
    // consulter un dossier précis (aperçu) mais ne reçoit jamais de jeton de parcours.
    if (action === "dossier_formation_self") {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) return json({ error: "Non autorisé" }, 401);

      let apprenantId: string | null = null;
      let isSelf = false;
      const requested = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const { data: own } = await supabase
        .from("apprenants").select("id").eq("auth_user_id", userId).is("deleted_at", null).limit(1).maybeSingle();
      if (own?.id && (!requested || requested === own.id)) {
        apprenantId = String(own.id);
        isSelf = true;
      } else if (requested) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return json({ error: "Non autorisé" }, 403);
        apprenantId = requested;
      }
      if (!apprenantId) return json({ error: "Dossier introuvable" }, 404);

      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, adresse, code_postal, ville, type_apprenant, formation_choisie, statut_suivi")
        .eq("id", apprenantId).maybeSingle();
      if (!apprenant) return json({ error: "Dossier introuvable" }, 404);

      const { data: docs } = await supabase
        .from("apprenant_documents_completes")
        .select("type_document, donnees")
        .eq("apprenant_id", apprenantId)
        .in("type_document", ["dossier-bienvenue", "projet-professionnel", "analyse-besoin", "test-competences"]);

      const isImg = (v: unknown) => typeof v === "string" && v.trim().startsWith("data:image/");
      const sigKeys = ["signature", "_signature_image", "signature_apprenant", "signatureDataUrl", "signature_data_url", "onboarding_signature"];
      const list = docs || [];
      const bienvenueSigne = list.some((d: any) =>
        d.type_document === "dossier-bienvenue" && d.donnees && sigKeys.some((k) => isImg(d.donnees[k])));
      const has = (t: string) => list.some((d: any) => d.type_document === t);

      // Statut CRM : même source que la page Examens (session de l'apprenant, sinon fiche)
      const { data: links } = await supabase
        .from("session_apprenants")
        .select("statut_suivi, created_at, sessions:session_id(date_debut)")
        .eq("apprenant_id", apprenantId);
      const withStatut = (links || [])
        .filter((l: any) => l.statut_suivi)
        .sort((a: any, b: any) =>
          String(b.sessions?.date_debut || b.created_at || "").localeCompare(String(a.sessions?.date_debut || a.created_at || "")));
      const statutSuivi = (withStatut[0] as any)?.statut_suivi ?? (apprenant as any).statut_suivi ?? null;

      const blob = `${apprenant.type_apprenant || ""} ${apprenant.formation_choisie || ""}`.toLowerCase();
      return json({
        bienvenue_existe: has("dossier-bienvenue"),
        bienvenue_signe: bienvenueSigne,
        projet_professionnel: has("projet-professionnel"),
        analyse_besoin: has("analyse-besoin"),
        test_competences: has("test-competences"),
        statut_suivi: statutSuivi,
        date_examen_theorique: (apprenant as any).date_examen_theorique ?? null,
        demande_urgente_active: demandeActive,
        parcours: isSelf ? {
          dossier: {
            id: apprenant.id, nom: apprenant.nom, prenom: apprenant.prenom, email: apprenant.email,
            telephone: apprenant.telephone, adresse: apprenant.adresse, code_postal: apprenant.code_postal, ville: apprenant.ville,
          },
          is_fc: /continu|\bfc\b|formation\s*continue/.test(blob),
          session_token: await issueSessionToken(String(apprenant.id)),
        } : null,
      });
    }

    // ---------- APPRENANT CONNECTÉ : demande urgente « date limite d'inscription proche » ----------
    // Ne modifie JAMAIS la fiche, le statut CRM ni la date d'examen. Une seule demande
    // active par élève + examen (index unique) ; un seul e-mail par demande créée.
    if (action === "demande_urgente_inscription") {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) return json({ error: "Non autorisé" }, 401);
      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, statut_suivi, date_examen_theorique")
        .eq("auth_user_id", userId).is("deleted_at", null).limit(1).maybeSingle();
      if (!apprenant) return json({ error: "Dossier introuvable" }, 404);
      if (typeof body?.apprenant_id === "string" && body.apprenant_id !== apprenant.id) return json({ error: "Non autorisé" }, 403);

      const exam = trouverExamen((apprenant as any).date_examen_theorique);
      if (!exam || !exam.dateLimite) return json({ error: "Date d'examen non déterminée" }, 409);
      const statut = await lireStatutSuivi(supabase, String(apprenant.id), (apprenant as any).statut_suivi ?? null);
      if (statut === "inscription_validee") return json({ error: "Inscription déjà validée" }, 409);
      const jours = joursAvantLimite(exam.dateLimite);
      if (jours < 0 || jours > 3) return json({ error: "Demande disponible uniquement à partir de 3 jours avant la date limite" }, 409);

      const formation = [apprenant.type_apprenant, apprenant.formation_choisie].filter(Boolean).join(" / ") || null;
      const { data: created, error: insErr } = await supabase.from("demandes_inscription_urgentes").insert({
        apprenant_id: apprenant.id, apprenant_nom: apprenant.nom, apprenant_prenom: apprenant.prenom,
        formation, examen_libelle: `Examen théorique du ${exam.date}`, date_examen: exam.iso,
        date_limite: exam.dateLimite, statut_inscription: statut, jours_restants: jours,
      }).select("*").single();

      if (insErr) {
        if ((insErr as any).code === "23505") {
          const { data: existing } = await supabase.from("demandes_inscription_urgentes")
            .select("id, created_at").eq("apprenant_id", apprenant.id).eq("date_examen", exam.iso)
            .eq("statut", "a_traiter").maybeSingle();
          return json({ ok: true, deja_envoyee: true, demande: existing });
        }
        console.error("demande urgente insert", insErr);
        return json({ error: "Demande impossible pour le moment" }, 500);
      }

      const nomComplet = `${apprenant.prenom || ""} ${String(apprenant.nom || "").toUpperCase()}`.trim();
      const lien = `${DEFAULT_BASE_URL}/?apprenant=${apprenant.id}`;
      const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(created.created_at));
      const statutLib = statut || "En attente d'inscription";
      const html = `<p><strong>⚠️ DEMANDE URGENTE — DATE LIMITE D'INSCRIPTION PROCHE</strong></p>
<ul>
<li>Élève : ${escHtml(nomComplet)}</li>
<li>Formation/filière : ${escHtml(formation || "Non renseignée")}</li>
<li>Examen concerné : ${escHtml(created.examen_libelle)}</li>
<li>Date de l'examen : ${escHtml(exam.date)}</li>
<li>Date limite d'inscription : ${escHtml(exam.dateLimiteLibelle || frDate(exam.dateLimite))}</li>
<li>Nombre de jours restant : ${jours}</li>
<li>Statut d'inscription actuel : ${escHtml(statutLib)}</li>
<li>Date et heure de la demande : ${escHtml(quand)}</li>
<li>Fiche CRM : <a href="${lien}">${lien}</a></li>
</ul>`;
      let emailStatut = "echec";
      let emailErreur: string | null = null;
      try {
        const { data: sent, error: sendErr } = await supabase.functions.invoke("sync-outlook-emails", {
          body: {
            action: "send", apprenantId: apprenant.id, userEmail: "contact@ftransport.fr", to: "contact@ftransport.fr",
            subject: `URGENT – Date limite d'inscription examen – ${nomComplet}`, body: html, forceSend: true,
          },
        });
        if (sendErr) emailErreur = sendErr.message || "Envoi impossible";
        else if (!(sent as any)?.success) emailErreur = (sent as any)?.error || "Envoi refusé";
        else emailStatut = "envoye";
      } catch (e) {
        emailErreur = e instanceof Error ? e.message : String(e);
      }
      await supabase.from("demandes_inscription_urgentes").update({
        email_statut: emailStatut, email_erreur: emailErreur,
        email_envoye_at: emailStatut === "envoye" ? new Date().toISOString() : null,
      }).eq("id", created.id);

      return json({ ok: true, deja_envoyee: false, demande: { id: created.id, created_at: created.created_at } });
    }

    // ---------- APPRENANT CONNECTÉ : lien temporaire vers SON PDF signé (lecture seule) ----------
    // Aucune écriture. Le serveur vérifie l'identité : l'apprenant ne reçoit que son
    // propre document ; un admin peut obtenir l'aperçu d'un dossier précis.
    // Jamais de PDF d'un autre apprenant : en cas de doute, erreur.
    if (action === "dossier_bienvenue_pdf") {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) return json({ error: "Non autorisé" }, 401);

      let apprenantId: string | null = null;
      const requested = typeof body?.apprenant_id === "string" ? body.apprenant_id : "";
      const { data: own } = await supabase
        .from("apprenants").select("id").eq("auth_user_id", userId).is("deleted_at", null).limit(1).maybeSingle();
      if (own?.id && (!requested || requested === own.id)) {
        apprenantId = String(own.id);
      } else if (requested) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return json({ error: "Non autorisé" }, 403);
        apprenantId = requested;
      }
      if (!apprenantId) return json({ error: "Document introuvable" }, 404);

      // Dernier récapitulatif d'inscription (PDF signé) de CET apprenant uniquement
      const { data: docRow, error: docErr } = await supabase
        .from("documents_inscription")
        .select("url")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", "recapitulatif_inscription")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (docErr) {
        console.error("dossier_bienvenue_pdf lookup", docErr);
        return json({ error: "Document indisponible" }, 500);
      }
      const path = docRow?.url;
      if (!path || typeof path !== "string" || !path.startsWith(`${apprenantId}/`)) {
        return json({ error: "Document introuvable" }, 404);
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from("documents-inscription")
        .createSignedUrl(path, 120); // lien valable 2 minutes, jamais public
      if (signErr || !signed?.signedUrl) {
        console.error("dossier_bienvenue_pdf sign", signErr);
        return json({ error: "Document indisponible" }, 404);
      }
      return json({ url: signed.signedUrl });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (err) {
    console.error("onboarding-invitation", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
