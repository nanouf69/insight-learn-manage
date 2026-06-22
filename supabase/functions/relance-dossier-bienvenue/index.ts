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

    let body: { preview?: boolean; save_only?: boolean; apprenant_ids?: string[]; excluded_ids?: string[] } = {};
    try {
      if (req.headers.get('content-length') && req.headers.get('content-length') !== '0') {
        body = await req.json();
      }
    } catch { /* no body */ }
    const previewOnly = body.preview === true;
    const saveOnly = body.save_only === true;
    const selectedIds = Array.isArray(body.apprenant_ids) ? body.apprenant_ids : null;
    const excludedIds = Array.isArray(body.excluded_ids) ? body.excluded_ids : [];

    // Persist exclusion choices (apprenants the user unchecked) so future sends skip them
    if (!previewOnly && excludedIds.length > 0) {
      await supabase
        .from('apprenants')
        .update({ relance_dossier_bienvenue_exclu: true })
        .in('id', excludedIds);
    }
    // Re-include apprenants the user re-checked (in case they were previously excluded)
    if (!previewOnly && selectedIds && selectedIds.length > 0) {
      await supabase
        .from('apprenants')
        .update({ relance_dossier_bienvenue_exclu: false })
        .in('id', selectedIds);
    }

    // Save-only mode: just persist choices, do not send anything
    if (saveOnly) {
      return new Response(JSON.stringify({
        success: true,
        save_only: true,
        excluded: excludedIds.length,
        included: selectedIds?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // 1. Get all apprenants with email
    const { data: apprenants, error: appError } = await supabase
      .from('apprenants')
      .select('id, nom, prenom, email, formation_choisie, type_apprenant, resultat_examen, resultat_examen_pratique, relance_dossier_bienvenue_exclu')
      .not('email', 'is', null)
      .not('email', 'eq', '')
      .or('relance_dossier_bienvenue_exclu.is.null,relance_dossier_bienvenue_exclu.eq.false');

    if (appError) throw appError;

    // UNIQUEMENT formations VTC ou TAXI (présentiel ou e-learning).
    // Exclure: PA, TA, RP, anglais, marketing, formation continue, etc.
    const normalize = (value: string) =>
      (value || '').toLowerCase().trim().replace(/\s+/g, '-');

    const isVtcOuTaxi = (rawType: string, rawFormation: string) => {
      const candidates = [normalize(rawType), normalize(rawFormation)];
      for (const v of candidates) {
        if (!v) continue;
        // Exclure explicitement les variantes non VTC/TAXI initiales
        if (v.startsWith('pa-') || v.startsWith('pa ') || v === 'pa') return false;
        if (v.startsWith('ta-') || v === 'ta') return false;
        if (v.startsWith('rp-')) return false;
        if (v.startsWith('va-') || v === 'va') return false;
        if (v.startsWith('continue-')) return false;
        if (v.includes('formation-continue')) return false;
        if (v.includes('anglais')) return false;
        if (v.includes('langue')) return false;
        if (v.includes('marketing')) return false;
        if (v.includes('fle')) return false;
      }
      // Doit contenir vtc ou taxi (et pas en tant que sous-type PA/RP)
      for (const v of candidates) {
        if (!v) continue;
        const isVtc = v === 'vtc' || v.startsWith('vtc-') || v.startsWith('vtc ');
        const isTaxi = v === 'taxi' || v.startsWith('taxi-') || v.startsWith('taxi ');
        if (isVtc || isTaxi) return true;
      }
      return false;
    };

    const elearningApprenants = (apprenants || []).filter((a: any) => {
      if (!isVtcOuTaxi(a.type_apprenant || '', a.formation_choisie || '')) return false;
      // Exclure les apprenants ayant déjà réussi la théorie
      if (a.resultat_examen === 'oui') return false;
      // Exclure les apprenants ayant échoué à l'examen pratique
      if (a.resultat_examen_pratique === 'non') return false;
      return true;
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
    let apprenantsSansPdf = elearningApprenants.filter(a => !apprenantIdsWithDoc.has(a.id));

    // Preview mode: return list of eligible apprenants without sending
    if (previewOnly) {
      return new Response(JSON.stringify({
        success: true,
        preview: true,
        apprenants: apprenantsSansPdf.map(a => ({
          id: a.id,
          nom: a.nom,
          prenom: a.prenom,
          email: a.email,
          formation_choisie: a.formation_choisie,
          type_apprenant: a.type_apprenant,
        })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Apply user-selected filtering
    if (selectedIds && selectedIds.length > 0) {
      const allowed = new Set(selectedIds);
      apprenantsSansPdf = apprenantsSansPdf.filter(a => allowed.has(a.id));
    } else if (selectedIds && selectedIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Aucun apprenant sélectionné', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

      // Limite : ne pas envoyer plus de 10 relances "URGENT - dossier incomplet" par apprenant
      const { count: relanceCount } = await supabase
        .from('emails')
        .select('id', { count: 'exact', head: true })
        .eq('apprenant_id', apprenant.id)
        .eq('type', 'sent')
        .ilike('subject', '%URGENT%dossier%');

      if ((relanceCount || 0) >= 10) {
        results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: apprenant.email, status: `skipped - limite 10 atteinte (${relanceCount})` });
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
