import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // GET: fetch apprenant basic info
    if (req.method === "GET") {
      const apprenantId = url.searchParams.get("id");
      if (!apprenantId) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, adresse, code_postal, ville, type_apprenant, date_naissance, formation_choisie")
        .eq("id", apprenantId)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Apprenant non trouvé" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: save form document
    if (req.method === "POST") {
      const body = await req.json();
      const { apprenantId, typeDocument, titre, donnees } = body;

      if (!apprenantId || !typeDocument || !titre || !donnees) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate apprenant exists
      const { data: apprenant } = await supabase
        .from("apprenants")
        .select("id, auth_user_id")
        .eq("id", apprenantId)
        .maybeSingle();

      if (!apprenant) {
        return new Response(JSON.stringify({ error: "Apprenant non trouvé" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use auth_user_id if available, otherwise use a placeholder
      const userId = apprenant.auth_user_id || "00000000-0000-0000-0000-000000000000";

      // Check if document already exists (upsert logic)
      const { data: existing } = await supabase
        .from("apprenant_documents_completes")
        .select("id")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", typeDocument)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("apprenant_documents_completes")
          .update({
            donnees,
            titre,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) {
          console.error("Update error:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { error } = await supabase
          .from("apprenant_documents_completes")
          .insert({
            apprenant_id: apprenantId,
            user_id: userId,
            type_document: typeDocument,
            titre,
            donnees,
          });

        if (error) {
          console.error("Insert error:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Also create an alerte for the admin
      await supabase.from("alertes_systeme").insert({
        type: "document_upload",
        titre: `📋 Pré-information complétée`,
        message: `${titre} rempli par l'apprenant`,
        details: `Apprenant ID: ${apprenantId}, Document: ${typeDocument}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
