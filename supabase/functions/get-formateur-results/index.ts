import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APPRENANT_ID_REGEX = /apprenant_id:([a-f0-9-]{36})/i;

const extractApprenantIdFromNotes = (notes?: string | null) => {
  if (!notes) return null;
  const match = notes.match(APPRENANT_ID_REGEX);
  return match?.[1] ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) throw new Error("Token manquant");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: fournisseur, error: fournisseurError } = await supabase
      .from("fournisseurs")
      .select("id, nom, formateur_id, actif")
      .eq("token", token)
      .maybeSingle();

    if (fournisseurError || !fournisseur || !fournisseur.actif) {
      throw new Error("Accès refusé");
    }

    const scopedApprenantIds = new Set<string>();

    const { data: fournisseurApprenants } = await supabase
      .from("fournisseur_apprenants")
      .select("notes")
      .eq("fournisseur_id", fournisseur.id);

    for (const row of fournisseurApprenants || []) {
      const parsedId = extractApprenantIdFromNotes(row.notes as string | null);
      if (parsedId) scopedApprenantIds.add(parsedId);
    }

    if (fournisseur.formateur_id) {
      const { data: formateurSessions } = await supabase
        .from("session_formateurs")
        .select("session_id")
        .eq("formateur_id", fournisseur.formateur_id);

      const sessionIds = (formateurSessions || []).map((row: any) => row.session_id).filter(Boolean);

      if (sessionIds.length > 0) {
        const { data: sessionApprenants } = await supabase
          .from("session_apprenants")
          .select("apprenant_id")
          .in("session_id", sessionIds)
          .limit(5000);

        for (const row of sessionApprenants || []) {
          if (row.apprenant_id) scopedApprenantIds.add(row.apprenant_id);
        }
      }
    }

    const scopeIds = Array.from(scopedApprenantIds);
    const useFallbackAll = scopeIds.length === 0;

    let completionsQuery = supabase
      .from("apprenant_module_completion")
      .select("apprenant_id, module_id, score_obtenu, score_max, completed_at, details")
      .order("completed_at", { ascending: false })
      .limit(5000);

    let quizResultsQuery = supabase
      .from("apprenant_quiz_results")
      .select("apprenant_id, quiz_id, quiz_titre, quiz_type, score_obtenu, score_max, note_sur_20, reussi, completed_at, matiere_nom, matiere_id, details")
      .order("completed_at", { ascending: false })
      .limit(5000);

    if (!useFallbackAll) {
      completionsQuery = completionsQuery.in("apprenant_id", scopeIds);
      quizResultsQuery = quizResultsQuery.in("apprenant_id", scopeIds);
    }

    const [{ data: completions }, { data: quizResults }] = await Promise.all([
      completionsQuery,
      quizResultsQuery,
    ]);

    const apprenantIds = new Set<string>();
    for (const row of completions || []) {
      if (row.apprenant_id) apprenantIds.add(row.apprenant_id);
    }
    for (const row of quizResults || []) {
      if (row.apprenant_id) apprenantIds.add(row.apprenant_id);
    }

    const finalApprenantIds = Array.from(apprenantIds);

    let apprenants: any[] = [];
    let sessionAssignments: any[] = [];

    if (finalApprenantIds.length > 0) {
      const [{ data: apprenantRows }, { data: sessionRows }] = await Promise.all([
        supabase
          .from("apprenants")
          .select("id, nom, prenom, type_apprenant, formation_choisie")
          .in("id", finalApprenantIds),
        supabase
          .from("session_apprenants")
          .select("apprenant_id, session_id, sessions(id, nom, date_debut, date_fin)")
          .in("apprenant_id", finalApprenantIds)
          .limit(5000),
      ]);

      apprenants = apprenantRows || [];
      sessionAssignments = (sessionRows || []).map((row: any) => ({
        apprenant_id: row.apprenant_id,
        session_id: row.session_id,
        session_nom: row.sessions?.nom || null,
        session_date_debut: row.sessions?.date_debut || null,
        session_date_fin: row.sessions?.date_fin || null,
      }));
    }

    return new Response(
      JSON.stringify({
        completions: completions || [],
        quizResults: quizResults || [],
        apprenants,
        sessionAssignments,
        scope: {
          useFallbackAll,
          scopedApprenantsCount: scopeIds.length,
          fournisseur_id: fournisseur.id,
          fournisseur_nom: fournisseur.nom,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Erreur inconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
