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

    // Get all reservations with apprenant info
    const { data: reservations, error } = await supabase
      .from('reservations_pratique')
      .select('apprenant_id, date_choisie, type_formation')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: apprenants } = await supabase
      .from('apprenants')
      .select('id, nom, prenom, email');

    if (!apprenants) throw new Error('No apprenants found');

    const results: { name: string; email: string; status: string }[] = [];

    for (const res of reservations || []) {
      const apprenant = apprenants.find(a => a.id === res.apprenant_id);
      if (!apprenant?.email) {
        results.push({ name: `${apprenant?.prenom} ${apprenant?.nom}`, email: 'N/A', status: 'skipped - no email' });
        continue;
      }

      // Safe date parsing with manual French formatting (Deno locale unreliable)
      const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const [y, m, d] = res.date_choisie.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      const dateFormatted = `${JOURS[dateObj.getDay()]} ${d} ${MOIS[m - 1]} ${y}`;

      const typeUpper = res.type_formation.toUpperCase();
      const exerciceLink = res.type_formation === 'vtc'
        ? 'https://app.formative.com/join/DNFDZS'
        : 'https://app.formative.com/join/ZT924H';
      const exerciceCode = res.type_formation === 'vtc' ? 'DNFDZS' : 'ZT924H';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a365d; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">FTRANSPORT</h1>
          </div>
          <div style="padding: 30px; background-color: #f8fafc;">
            <p>Bonjour <strong>${apprenant.prenom} ${apprenant.nom}</strong>,</p>
            <p>Nous vous confirmons votre date de formation pratique <strong>${typeUpper}</strong> :</p>
            <div style="background-color: #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="font-size: 22px; font-weight: bold; color: #1a365d; margin: 0;">📅 ${dateFormatted}</p>
              <p style="color: #64748b; margin: 5px 0 0 0;">de 9h à 17h (pause 12h-13h)</p>
            </div>
            <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1a365d;">📍 Lieu de formation</h3>
              <p style="margin: 5px 0;"><strong>Auto-école Confluences</strong></p>
              <p style="margin: 5px 0;">86 Route de Genas, 69003 Lyon</p>
            </div>
            <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1a365d;">📝 Exercices à préparer</h3>
              <p>Avant votre formation, préparez vos exercices sur <strong>Formative</strong> :</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="${exerciceLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accéder aux exercices ${typeUpper}</a>
              </div>
              <p style="text-align: center; color: #64748b; font-size: 14px;">Code d'accès : <strong>${exerciceCode}</strong></p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">⚠️ Merci de vous présenter <strong>à l'heure</strong> avec une pièce d'identité valide.</p>
          </div>
        </div>`;

      try {
        // Send via sync-outlook-emails
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
            subject: `✅ Confirmation formation pratique ${typeUpper} - ${dateFormatted}`,
            body: htmlBody,
          }),
        });

        const sendData = await sendRes.json();
        if (sendData.success) {
          results.push({ name: `${apprenant.prenom} ${apprenant.nom}`, email: apprenant.email, status: 'sent' });
          
          // Track in emails table
          await supabase.from('emails').insert({
            apprenant_id: apprenant.id,
            type: 'sent',
            subject: `✅ Confirmation formation pratique ${typeUpper} - ${dateFormatted}`,
            body_html: htmlBody,
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
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      errors: results.filter(r => r.status.startsWith('error')).length,
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Bulk resend error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
