import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token manquant");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: fournisseur, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, formateur_id, actif")
      .eq("token", token)
      .single();

    if (fErr || !fournisseur || !fournisseur.actif || !fournisseur.formateur_id) {
      throw new Error("Accès refusé");
    }

    // Get ALL module completion results
    const { data: completions } = await supabase
      .from("apprenant_module_completion")
      .select("apprenant_id, module_id, score_obtenu, score_max, completed_at, details")
      .order("completed_at", { ascending: false })
      .limit(1000);

    // Get ALL quiz results (not just réglementation)
    const { data: quizResults } = await supabase
      .from("apprenant_quiz_results")
      .select("apprenant_id, quiz_id, quiz_titre, quiz_type, score_obtenu, score_max, note_sur_20, reussi, completed_at, matiere_nom, matiere_id, details")
      .order("completed_at", { ascending: false })
      .limit(2000);

    // Get apprenant names
    const apprenantIds = new Set<string>();
    (completions || []).forEach((c: any) => apprenantIds.add(c.apprenant_id));
    (quizResults || []).forEach((q: any) => apprenantIds.add(q.apprenant_id));

    let apprenants: any[] = [];
    if (apprenantIds.size > 0) {
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie")
        .in("id", Array.from(apprenantIds));
      apprenants = data || [];
    }

    return new Response(
      JSON.stringify({ completions: completions || [], quizResults: quizResults || [], apprenants }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
