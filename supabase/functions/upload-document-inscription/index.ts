import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const apprenantId = formData.get("apprenant_id") as string | null;
    const titre = (formData.get("titre") as string) || "Devis formation";
    const typeDocument =
      (formData.get("type_document") as string) || "devis";

    if (!file || !apprenantId) {
      return new Response(
        JSON.stringify({ error: "file et apprenant_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Fichier trop volumineux (max 4 Mo)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify apprenant exists
    const { data: apprenant, error: appError } = await supabase
      .from("apprenants")
      .select("id, nom, prenom")
      .eq("id", apprenantId)
      .single();

    if (appError || !apprenant) {
      return new Response(
        JSON.stringify({ error: "Apprenant non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload file to storage
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `${apprenantId}/${typeDocument}-${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("documents-inscription")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Erreur upload: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the URL
    const { data: urlData } = supabase.storage
      .from("documents-inscription")
      .getPublicUrl(storagePath);

    // Insert record in documents_inscription
    const { error: dbError } = await supabase
      .from("documents_inscription")
      .insert({
        apprenant_id: apprenantId,
        titre,
        type_document: typeDocument,
        nom_fichier: file.name,
        url: storagePath,
        statut: "valid",
      });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(
        JSON.stringify({ error: "Erreur base de données: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Document "${titre}" ajouté au dossier de ${apprenant.prenom} ${apprenant.nom}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
