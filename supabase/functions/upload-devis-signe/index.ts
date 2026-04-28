import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;

    if (!token || !file) {
      return new Response(
        JSON.stringify({ error: "Token et fichier requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const { data: devis, error: devisError } = await supabase
      .from("devis_envois")
      .select("id, apprenant_id, devis_signe_url, modele, formation, montant")
      .eq("token", token)
      .single();

    if (devisError || !devis) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (devis.devis_signe_url) {
      return new Response(
        JSON.stringify({ error: "Le devis signé a déjà été envoyé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload signed file
    const ext = file.name.split(".").pop() || "pdf";
    const filePath = `signes/${devis.id}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("devis")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'upload" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("devis")
      .getPublicUrl(filePath);

    // Update devis record
    const { error: updateError } = await supabase
      .from("devis_envois")
      .update({
        devis_signe_url: urlData.publicUrl,
        statut: "signe",
        signed_at: new Date().toISOString(),
      })
      .eq("id", devis.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get apprenant info for notification
    const { data: apprenant } = await supabase
      .from("apprenants")
      .select("nom, prenom, email, auth_user_id, formation_choisie, date_debut_formation, date_fin_formation")
      .eq("id", devis.apprenant_id)
      .single();

    // Make the signed quote visible in the learner CRM > Formulaires tab
    const signedDocumentData = {
      formation: devis.formation || apprenant?.formation_choisie || devis.modele || "Formation continue",
      modele: devis.modele,
      montant: devis.montant || null,
      date_debut_formation: apprenant?.date_debut_formation || null,
      date_fin_formation: apprenant?.date_fin_formation || null,
      devis_signe_url: urlData.publicUrl,
      fichier_url: urlData.publicUrl,
      statut: "signé",
      signed_at: new Date().toISOString(),
    };

    const { data: existingSignedDocument } = await supabase
      .from("apprenant_documents_completes")
      .select("id, donnees")
      .eq("apprenant_id", devis.apprenant_id)
      .eq("type_document", "devis-formation-continue")
      .maybeSingle();

    if (existingSignedDocument) {
      await supabase
        .from("apprenant_documents_completes")
        .update({
          titre: `Devis signé — ${signedDocumentData.formation}`,
          donnees: {
            ...(existingSignedDocument.donnees || {}),
            ...signedDocumentData,
          },
          completed_at: signedDocumentData.signed_at,
          updated_at: signedDocumentData.signed_at,
        })
        .eq("id", existingSignedDocument.id);
    } else {
      await supabase.from("apprenant_documents_completes").insert({
        apprenant_id: devis.apprenant_id,
        user_id: apprenant?.auth_user_id || "00000000-0000-0000-0000-000000000000",
        type_document: "devis-formation-continue",
        titre: `Devis signé — ${signedDocumentData.formation}`,
        donnees: signedDocumentData,
      });
    }

    // Create system alert for admin
    await supabase.from("alertes_systeme").insert({
      type: "devis_signe",
      titre: `📝 Devis signé reçu — ${apprenant?.prenom} ${apprenant?.nom}`,
      message: `${apprenant?.prenom} ${apprenant?.nom} a renvoyé son devis signé (${devis.modele}).`,
      details: JSON.stringify({
        apprenant_id: devis.apprenant_id,
        devis_id: devis.id,
        fichier: urlData.publicUrl,
      }),
    });

    // Send notification email to admin
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Ftransport <noreply@ftransport.fr>",
            to: "contact@ftransport.fr",
            subject: `📝 Devis signé reçu — ${apprenant?.prenom} ${apprenant?.nom}`,
            html: `<p>Bonjour,</p><p><strong>${apprenant?.prenom} ${apprenant?.nom}</strong> a renvoyé son devis signé pour <strong>${devis.modele}</strong>.</p><p><a href="${urlData.publicUrl}">📥 Télécharger le devis signé</a></p>`,
          }),
        });
      }
    } catch (e) {
      console.error("Notification email error:", e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
