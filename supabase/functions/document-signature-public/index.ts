import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, token, reponses } = await req.json();
    if (!token || typeof token !== "string" || token.length < 10) {
      return json({ error: "Lien invalide" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error } = await supabase
      .from("documents_a_signer")
      .select("id, nom, champs, statut, file_path, destinataire_nom, destinataire_email, reponses, signed_at")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!doc) return json({ error: "Document introuvable ou lien expiré" }, 404);

    if (action === "get") {
      const { data: signed } = await supabase.storage
        .from("documents-a-signer")
        .createSignedUrl(doc.file_path, 3600);

      return json({
        document: {
          nom: doc.nom,
          champs: doc.champs,
          statut: doc.statut,
          destinataire_nom: doc.destinataire_nom,
          reponses: doc.reponses,
          signed_at: doc.signed_at,
          fileUrl: signed?.signedUrl || null,
        },
      });
    }

    if (action === "submit") {
      if (doc.statut === "signe") return json({ error: "Ce document a déjà été signé" }, 409);
      if (!reponses || typeof reponses !== "object") return json({ error: "Réponses manquantes" }, 400);

      const { error: upErr } = await supabase
        .from("documents_a_signer")
        .update({ reponses, statut: "signe", signed_at: new Date().toISOString() })
        .eq("id", doc.id);
      if (upErr) throw upErr;

      return json({ success: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("[document-signature-public]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
