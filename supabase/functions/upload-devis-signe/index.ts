import { createClient } from "npm:@supabase/supabase-js@2";
import { apposerSignatureTampon } from "../_shared/tamponFtransport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Texte exact identique à src/lib/contratFormation/consentements.ts (contrôlé par test).
const CONSENTEMENTS_VERSION = 'consentements-2026-10-17-v1';
const CONSENTEMENTS_SIGNATURE = {
  demarrageAnticipe: 'Je demande expressément que la prestation commence avant l’expiration du délai de rétractation applicable, sans renoncer aux droits qui subsistent.',
  perteApresExecution: 'Je reconnais que, dans les cas prévus par la loi, je perdrai mon droit de rétractation lorsque la prestation aura été entièrement exécutée avec mon accord préalable et exprès.',
} as const;
function parisDay(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function addDays(day: string, n: number): string { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

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
      .select("id, apprenant_id, devis_signe_url, signed_at, modele, formation, montant, client_nom, client_email, contrat_conditions")
      .eq("token", token)
      .single();

    if (devisError || !devis) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (devis.devis_signe_url || devis.signed_at) {
      return new Response(
        JSON.stringify({ error: "Le devis signé a déjà été envoyé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Devis valant contrat : contrôles serveur au moment réel de la signature.
    const signedAt = new Date();
    let consentements: Record<string, unknown> | null = null;
    let reportRequis = false;
    const snap = devis.contrat_conditions as any;
    if (snap) {
      const c = snap.contract ?? {};
      const start = String(c.fields?.start ?? '');
      const today = parisDay(signedAt);
      if (snap.validation?.ready !== true || c.funding !== 'personnel' || c.concludedAt || c.signedAt) {
        return new Response(JSON.stringify({ error: "Contrat incomplet : signature impossible, contactez l'organisme." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // L6353-5 : 10 jours de rétractation avant tout commencement ; jamais de date antérieure inscrite.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start <= addDays(today, 10)) {
        return new Response(JSON.stringify({ error: "La date de début prévue ne respecte plus le délai de rétractation à la date d'aujourd'hui : l'organisme doit proposer un report avant signature." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      reportRequis = start <= addDays(today, 14);
      const demarrage = formData.get("consentement_demarrage_anticipe") === "true";
      const perte = formData.get("consentement_perte_apres_execution") === "true";
      consentements = {
        version: CONSENTEMENTS_VERSION,
        horodatage_serveur: signedAt.toISOString(),
        user_agent: req.headers.get("user-agent") ?? null,
        demarrage_anticipe: { coche: demarrage, texte: CONSENTEMENTS_SIGNATURE.demarrageAnticipe },
        perte_apres_execution: { coche: perte, texte: CONSENTEMENTS_SIGNATURE.perteApresExecution },
        reserve: "Droits impératifs L6353-5 (10 jours) et L6353-6 (aucun paiement avant expiration) réservés ; ces cases n'avancent pas la date de début.",
        report_a_examiner: reportRequis,
      };
    }

    // Upload signed file (nouveau chemin unique, jamais d'écrasement)
    const ext = file.name.split(".").pop() || "pdf";
    const filePath = `signes/${devis.id}_${crypto.randomUUID()}.${ext}`;
    let arrayBuffer: ArrayBuffer | Uint8Array = await file.arrayBuffer();
    if (ext.toLowerCase() === "pdf") {
      try {
        const tamponne = await apposerSignatureTampon(supabase, arrayBuffer as ArrayBuffer);
        if (tamponne) {
          // Original client conservé à part, jamais écrasé.
          await supabase.storage.from("devis").upload(filePath.replace(/\.pdf$/i, "_original_client.pdf"), arrayBuffer, { contentType: "application/pdf", upsert: false });
          arrayBuffer = tamponne;
        }
      } catch (e) {
        console.error("Signature/tampon FTRANSPORT non apposés :", e);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("devis")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
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
        signed_at: signedAt.toISOString(),
        ...(consentements ? { consentements } : {}),
      })
      .eq("id", devis.id)
      .is("signed_at", null);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get apprenant info for notification (only for learner quotes)
    let apprenant: any = null;
    if (devis.apprenant_id) {
      const { data } = await supabase
        .from("apprenants")
        .select("nom, prenom, email, auth_user_id, formation_choisie, date_debut_formation, date_fin_formation")
        .eq("id", devis.apprenant_id)
        .maybeSingle();
      apprenant = data;
    }

    const clientLabel = devis.apprenant_id
      ? `${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim()
      : (devis.client_nom || "Client");

    if (devis.apprenant_id) {
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
        signed_at: signedAt.toISOString(),
        ...(snap ? { devis_id: devis.id, contrat_reference: snap.contract?.reference ?? null, contrat_version: snap.version ?? null, consentements } : {}),
      };

      const { data: existingSignedDocument } = await supabase
        .from("apprenant_documents_completes")
        .select("id, donnees")
        .eq("apprenant_id", devis.apprenant_id)
        .eq("type_document", "devis-formation-continue")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSignedDocument && !snap) {
        const { error: formUpdateError } = await supabase
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
        if (formUpdateError) console.error("CRM form update error:", formUpdateError);
      } else {
        const { error: formInsertError } = await supabase.from("apprenant_documents_completes").insert({
          apprenant_id: devis.apprenant_id,
          user_id: apprenant?.auth_user_id || "00000000-0000-0000-0000-000000000000",
          type_document: "devis-formation-continue",
          titre: `Devis signé — ${signedDocumentData.formation}`,
          donnees: signedDocumentData,
        });
        if (formInsertError) console.error("CRM form insert error:", formInsertError);
      }
    }

    // Create system alert for admin
    await supabase.from("alertes_systeme").insert({
      type: "devis_signe",
      titre: `📝 Devis signé reçu — ${clientLabel}`,
      message: `${clientLabel} a renvoyé son devis signé (${devis.modele}).`,
      details: JSON.stringify({
        apprenant_id: devis.apprenant_id,
        devis_id: devis.id,
        fichier: urlData.publicUrl,
        report_a_examiner: reportRequis,
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
            from: "FTRANSPORT <noreply@ftransport.fr>",
            to: "contact@ftransport.fr",
            subject: `📝 Devis signé reçu — ${clientLabel}`,
            html: `<p>Bonjour,</p><p><strong>${clientLabel}</strong> a renvoyé son devis signé pour <strong>${devis.modele}</strong>.</p><p><a href="${urlData.publicUrl}">📥 Télécharger le devis signé</a></p>`,
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
