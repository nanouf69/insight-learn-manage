import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const token = formData.get("token") as string | null;
    const fournisseurId = formData.get("fournisseur_id") as string | null;
    const type = formData.get("type") as string | null; // "document" or "facture"

    // Document-specific fields
    const fournisseurApprenantId = formData.get("fournisseur_apprenant_id") as string | null;
    const mainApprenantId = formData.get("main_apprenant_id") as string | null;

    // Facture-specific fields
    const destinataire = formData.get("destinataire") as string | null;
    const montant = formData.get("montant") as string | null;
    const description = formData.get("description") as string | null;
    const moisAnnee = formData.get("mois_annee") as string | null;

    if (!file || !token || !fournisseurId) {
      return new Response(
        JSON.stringify({ error: "file, token et fournisseur_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Fichier trop volumineux (max 10 Mo)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify fournisseur token
    const { data: fournisseur, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, actif")
      .eq("token", token)
      .eq("id", fournisseurId)
      .single();

    if (fErr || !fournisseur || !fournisseur.actif) {
      return new Response(
        JSON.stringify({ error: "Fournisseur non trouvé ou inactif" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = Date.now();
    const bucketName = "fournisseur-documents";

    // Ensure bucket exists and is public
    const { data: buckets } = await supabase.storage.listBuckets();
    const existingBucket = buckets?.find((b: any) => b.name === bucketName);
    if (!existingBucket) {
      await supabase.storage.createBucket(bucketName, { public: true });
    } else if (!existingBucket.public) {
      await supabase.storage.updateBucket(bucketName, { public: true });
    }

    if (type === "facture") {
      const filePath = `factures/${fournisseurId}/${timestamp}_${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });
      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Erreur upload: " + uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from("fournisseur_factures").insert({
        fournisseur_id: fournisseurId,
        nom_fichier: file.name,
        url: urlData.publicUrl,
        destinataire: destinataire || fournisseur.nom,
        montant: montant ? parseFloat(montant) : null,
        description: description || null,
        mois_annee: moisAnnee || null,
      });

      if (dbErr) {
        return new Response(
          JSON.stringify({ error: "Erreur DB: " + dbErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Document upload
      if (!fournisseurApprenantId) {
        return new Response(
          JSON.stringify({ error: "fournisseur_apprenant_id requis pour un document" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = `${fournisseurId}/${fournisseurApprenantId}/${timestamp}_${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });
      if (uploadErr) {
        return new Response(
          JSON.stringify({ error: "Erreur upload: " + uploadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from("fournisseur_documents").insert({
        fournisseur_id: fournisseurId,
        fournisseur_apprenant_id: fournisseurApprenantId,
        titre: file.name,
        nom_fichier: file.name,
        url: urlData.publicUrl,
      });

      if (dbErr) {
        return new Response(
          JSON.stringify({ error: "Erreur DB: " + dbErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also insert into documents_inscription for CRM visibility
      if (mainApprenantId) {
        await supabase.from("documents_inscription").insert({
          apprenant_id: mainApprenantId,
          type_document: "custom",
          titre: file.name,
          description: `Document fournisseur: ${fournisseur.nom}`,
          url: urlData.publicUrl,
          nom_fichier: file.name,
          statut: "valid",
        });
      }

      return new Response(
        JSON.stringify({ success: true, url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
