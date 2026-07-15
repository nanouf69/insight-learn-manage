import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Consolidated portal data access via validated token.
// Actions: init, apprenants, documents, factures, shared_docs, emargements
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "init";

    if (!token || token.length < 10) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: f, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, actif, factures_only, formateur_id, comptable_only")
      .eq("token", token)
      .maybeSingle();

    if (fErr || !f) {
      return new Response(JSON.stringify({ error: "Lien invalide" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!f.actif) {
      return new Response(JSON.stringify({ error: "Compte fournisseur désactivé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fid = f.id;

    if (action === "apprenants") {
      const { data } = await supabase
        .from("fournisseur_apprenants")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "documents") {
      const { data } = await supabase
        .from("fournisseur_documents")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "factures") {
      const { data } = await supabase
        .from("fournisseur_factures")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "shared_docs") {
      const { data } = await supabase
        .from("fournisseur_shared_docs")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "emargements") {
      if (!f.formateur_id) return json({ data: [] });
      const { data } = await supabase
        .from("formateur_emargements")
        .select("*")
        .eq("formateur_id", f.formateur_id)
        .order("date_signature", { ascending: false });
      return json({ data: data || [] });
    }

    // init: return fournisseur + all base collections
    const [appRes, docRes, facRes, sharedRes] = await Promise.all([
      supabase.from("fournisseur_apprenants").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_documents").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_factures").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_shared_docs").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
    ]);

    return json({
      fournisseur: f,
      apprenants: appRes.data || [],
      documents: docRes.data || [],
      factures: facRes.data || [],
      shared_docs: sharedRes.data || [],
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
