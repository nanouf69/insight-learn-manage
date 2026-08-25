import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreneauKey = "matin" | "apres_midi" | "soir" | "soir_1" | "soir_2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
    const [d, m, y] = value.slice(0, 10).split("/");
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }
  return null;
};

const formatISO = (d: Date) => d.toISOString().slice(0, 10);
const isFormationContinue = (type?: string | null, formation?: string | null) => {
  const t = (type || "").toLowerCase();
  const f = (formation || "").toLowerCase();
  return /\bfc\b|fco|formation\s*continue|continue/.test(t) || /continue/.test(f);
};
const isPresentielType = (type?: string | null, formation?: string | null, creneau?: string | null) => {
  const t = (type || "").toLowerCase().trim();
  const f = (formation || "").toLowerCase().trim();
  const c = (creneau || "").toLowerCase().trim();
  const value = `${t} ${f}`;
  // Bloc dur : creneau "en-ligne" / "e-learning" => jamais présentiel (sauf si type explicitement -presentiel)
  if (/(en[-\s]?ligne|e[-\s]?learning|online)/.test(c) && !/pr[eé]sentiel/.test(value)) return false;
  if (/(^|\s)(vtc|taxi|ta|va)-e(\s|$)/.test(value) && !/-e-pr[eé]sentiel/.test(value)) return false;
  return /pr[eé]sentiel/.test(value) || /\b(vtc|taxi|ta|va)(-exam)?\b/.test(t) || /^(pa|rp|continue)[\s-]/.test(t);
};

const isEveningText = (value?: string | null): boolean => {
  const v = (value || "").toLowerCase();
  if (/soir/.test(v) || /vtc-s|cours-du-soir/.test(v)) return true;
  const m = v.match(/(\d{1,2})\s*[h:]/);
  if (m) {
    const h = parseInt(m[1], 10);
    if (!isNaN(h) && h >= 17) return true;
  }
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Session apprenant requise" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Session apprenant invalide" }, 401);

    const body = await req.json();
    const apprenantId = String(body?.apprenant_id || "");
    const demi = String(body?.demi_journee || "") as CreneauKey;
    const dateEmargement = String(body?.date_emargement || "");
    const absent = Boolean(body?.absent);
    const replaceExisting = Boolean(body?.replace_existing);
    const signature = typeof body?.signature_data_url === "string" ? body.signature_data_url : null;
    const justificatifUrl = typeof body?.justificatif_url === "string" ? body.justificatif_url : null;

    if (!apprenantId || !["matin", "apres_midi", "soir", "soir_1", "soir_2"].includes(demi) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEmargement)) {
      return json({ error: "Données d'émargement invalides" }, 400);
    }
    if (!absent && !signature) return json({ error: "Signature requise" }, 400);
    if (absent && !justificatifUrl) return json({ error: "Justificatif d'absence requis" }, 400);

    const { data: apprenant, error: apprenantError } = await supabase
      .from("apprenants")
      .select("id, auth_user_id, formation_choisie, type_apprenant, creneau_horaire, date_debut_formation, date_fin_formation, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
      .eq("id", apprenantId)
      .maybeSingle();

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (apprenantError || !apprenant || (apprenant.auth_user_id !== user.id && isAdmin !== true)) {
      return json({ error: "Accès apprenant refusé" }, 403);
    }
    const ownerUserId = String(apprenant.auth_user_id || user.id);

    const signedDate = parseDate(dateEmargement);
    const today = parseDate(formatISO(new Date()));
    const start = parseDate(apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne);
    const end = parseDate(apprenant.date_fin_formation || apprenant.date_fin_cours_en_ligne);
    if (!signedDate || !today || signedDate.getTime() > today.getTime()) return json({ error: "Date d'émargement non autorisée" }, 403);
    
    const isFC = isFormationContinue(apprenant.type_apprenant, apprenant.formation_choisie);
    const isPres = isPresentielType(apprenant.type_apprenant, apprenant.formation_choisie, apprenant.creneau_horaire);

    // Journée de formation PRATIQUE (planning) : émargement toujours autorisé,
    // même pour un apprenant e-learning.
    const { data: reservationRows } = await supabase
      .from("reservations_pratique")
      .select("date_choisie")
      .eq("apprenant_id", apprenantId);
    let isPratiqueDay = ((reservationRows as any[]) || []).some(
      (r) => String(r?.date_choisie || "").slice(0, 10) === dateEmargement,
    );

    if (!isFC && !isPres && !isPratiqueDay) return json({ error: "Émargement non prévu pour cette formation" }, 403);
    if (isFC && !isPratiqueDay && ["soir", "soir_1", "soir_2"].includes(demi)) return json({ error: "Créneau du soir non prévu pour cette formation" }, 403);

    const { data: sessionRows } = await supabase
      .from("session_apprenants")
      .select("sessions:session_id(nom, creneaux, date_debut, date_fin, type_session)")
      .eq("apprenant_id", apprenantId);
    if (!isPratiqueDay) {
      isPratiqueDay = ((sessionRows as any[]) || []).some((row) => {
        const s = row?.sessions;
        if (!s || String(s.type_session || "") !== "pratique") return false;
        const debut = String(s.date_debut || "").slice(0, 10);
        const fin = String(s.date_fin || debut).slice(0, 10);
        return debut <= dateEmargement && fin >= dateEmargement;
      });
    }
    const matchingSession = ((sessionRows as any[]) || []).map((row) => row?.sessions).find((s) => {
      if (!s) return false;
      const debut = String(s.date_debut || "").slice(0, 10);
      const fin = String(s.date_fin || debut).slice(0, 10);
      return debut <= dateEmargement && fin >= dateEmargement;
    });
    if (isPratiqueDay) {
      // Formation pratique : uniquement matin / après-midi, pas de contrôle soir.
      if (["soir", "soir_1", "soir_2"].includes(demi)) {
        return json({ error: "Émargement pratique : choisir matin ou après-midi" }, 403);
      }
    } else if (isPres && matchingSession) {
      const creneaux = Array.isArray(matchingSession.creneaux) ? matchingSession.creneaux : [];
      const isEveningSession = isEveningText(apprenant.creneau_horaire) || isEveningText(matchingSession.nom) || creneaux.some((c: string) => isEveningText(c));
      const isEveningSignature = ["soir", "soir_1", "soir_2"].includes(demi);
      if (isEveningSession && !isEveningSignature) return json({ error: "Signature de journée non autorisée pour un cours du soir" }, 403);
      if (!isEveningSession && isEveningSignature) return json({ error: "Signature du soir non autorisée pour une session de journée" }, 403);
      // Cours du soir : forcer soir_1 (17h-18h30) ou soir_2 (18h30-21h), refuser le "soir" unique legacy
      if (isEveningSession && demi === "soir") return json({ error: "Émargement du soir : choisir soir_1 (17h-18h30) ou soir_2 (18h30-21h)" }, 403);
    } else if (isPres && isEveningText(apprenant.creneau_horaire)) {
      if (!["soir_1", "soir_2"].includes(demi)) return json({ error: "Émargement du soir : choisir soir_1 (17h-18h30) ou soir_2 (18h30-21h)" }, 403);
    }

    const row = {
      apprenant_id: apprenantId,
      user_id: ownerUserId,
      date_emargement: dateEmargement,
      demi_journee: demi,
      signature_data_url: absent ? null : signature,
      absent,
      justificatif_url: absent ? justificatifUrl : null,
      motif_absence: absent ? (String(body?.motif_absence || "").trim() || null) : null,
      user_agent: String(body?.user_agent || "").slice(0, 500) || null,
      confirme_presence_lieu: !absent && Boolean(body?.confirme_presence_lieu),
      confirme_identite: Boolean(body?.confirme_identite),
    };

    const { data: existingRows, error: existingError } = await supabase
      .from("emargements_fc")
      .select("id, signature_data_url, absent, signed_at")
      .eq("apprenant_id", apprenantId)
      .eq("date_emargement", dateEmargement)
      .eq("demi_journee", demi)
      .limit(1);

    if (existingError) return json({ error: existingError.message, code: existingError.code }, 400);

    const existing = existingRows?.[0];
    const hasFilledSignature = Boolean(String(existing?.signature_data_url || "").trim()) || existing?.absent === true;
    if (existing && hasFilledSignature && !replaceExisting) return json({ success: true, duplicate: true });

    const rowToSave = existing
      ? { ...row, signed_at: new Date().toISOString() }
      : row;

    const { error } = existing
      ? await supabase.from("emargements_fc").update(rowToSave).eq("id", existing.id)
      : await supabase.from("emargements_fc").insert(rowToSave);

    if (error && error.code === "23505") return json({ success: true, duplicate: true });
    if (error) return json({ error: error.message, code: error.code }, 400);

    return json({ success: true });
  } catch (e) {
    console.error("save-emargement-apprenant error", e);
    return json({ error: "Erreur serveur pendant l'enregistrement" }, 500);
  }
});