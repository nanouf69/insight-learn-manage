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

    return json({ error: "Action inconnue" }, 400);
  } catch (err) {
    console.error("onboarding-invitation", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
