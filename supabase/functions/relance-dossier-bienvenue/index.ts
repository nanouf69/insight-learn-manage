import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get all apprenants with email
    const { data: apprenants, error: appError } = await supabase
      .from('apprenants')
      .select('id, nom, prenom, email, formation_choisie, type_apprenant, resultat_examen')
      .not('email', 'is', null)
      .not('email', 'eq', '');

    if (appError) throw appError;

    // Exclude présentiel formations from relances
    const EXCLUDED_TYPES = ["vtc", "vtc-exam", "taxi", "taxi-exam", "vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel", "formation-continue-vtc", "formation-continue-taxi", "pa-vtc"];
    const elearningApprenants = (apprenants || []).filter((a: any) => {
      const type = (a.type_apprenant || a.formation_choisie || "").toLowerCase();
      return !EXCLUDED_TYPES.includes(type);
    });

    if (elearningApprenants.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Aucun apprenant trouvé', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get all completed "Document de bienvenue" records
    const { data: docsCompletes } = await supabase
      .from('apprenant_documents_completes')
      .select('apprenant_id')
      .ilike('titre', '%bienvenue%');

    const apprenantIdsWithDoc = new Set((docsCompletes || []).map(d => d.apprenant_id));

    // 3. Filter apprenants who DON'T have the welcome document
    const apprenantsSansPdf = elearningApprenants.filter(a => !apprenantIdsWithDoc.has(a.id));

    if (apprenantsSansPdf.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Tous les apprenants ont leur document de bienvenue', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Get the email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('id', 'relance-dossier-bienvenue')
      .single();

    if (!template) throw new Error('Template relance-dossier-bienvenue introuvable');

    const results: { name: string; email: string; status: string }[] = [];

    // 5. Send email to each apprenant without the PDF
    for (const apprenant of apprenantsSansPdf) {
      if (!apprenant.email) {
        results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: 'N/A', status: 'skipped - no email' });
        continue;
      }

      // Replace template variables
      const subject = template.subject_template
        .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
        .replace(/\{\{nom\}\}/g, apprenant.nom || '')
        .replace(/\{\{email\}\}/g, apprenant.email || '')
        .replace(/\{\{formation\}\}/g, apprenant.formation_choisie || '');

      const body = template.body_template
        .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
        .replace(/\{\{nom\}\}/g, apprenant.nom || '')
        .replace(/\{\{email\}\}/g, apprenant.email || '')
        .replace(/\{\{apprenant_id\}\}/g, apprenant.id || '')
        .replace(/\{\{formation\}\}/g, apprenant.formation_choisie || '');

      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/sync-outlook-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            action: 'send',
            userEmail: 'contact@ftransport.fr',
            to: apprenant.email,
            subject,
            body,
          }),
        });

        const sendData = await sendRes.json();
        if (sendData.success) {
          results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: apprenant.email, status: 'sent' });

          // Track in emails table
          await supabase.from('emails').insert({
            apprenant_id: apprenant.id,
            type: 'sent',
            subject,
            body_html: body,
            sender_email: 'contact@ftransport.fr',
            recipients: [apprenant.email],
            sent_at: new Date().toISOString(),
          });
        } else {
          results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: apprenant.email, status: `error: ${sendData.error || 'unknown'}` });
        }
      } catch (sendErr: unknown) {
        results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: apprenant.email, status: `error: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}` });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_apprenants: apprenants.length,
      sans_document: apprenantsSansPdf.length,
      sent: results.filter(r => r.status === 'sent').length,
      errors: results.filter(r => r.status.startsWith('error')).length,
      skipped: results.filter(r => r.status.startsWith('skipped')).length,
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Relance dossier bienvenue error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
