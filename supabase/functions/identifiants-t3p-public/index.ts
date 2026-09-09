import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload = await req.json().catch(() => ({}));
    const action = typeof payload?.action === 'string' ? payload.action : '';
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';

    if (!token || token.length < 16 || token.length > 128) {
      return json({ error: 'Lien invalide' }, 400);
    }

    const { data: row, error } = await supabase
      .from('apprenant_identifiants_t3p')
      .select('id, apprenant_id, recu_at, nouvel_email')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!row) return json({ error: 'Lien invalide ou expiré' }, 404);

    const { data: apprenant } = await supabase
      .from('apprenants')
      .select('prenom')
      .eq('id', row.apprenant_id)
      .maybeSingle();

    if (action === 'get') {
      return json({
        prenom: apprenant?.prenom ?? null,
        deja_recu: !!row.recu_at,
        nouvel_email: row.nouvel_email ?? null,
      });
    }

    if (action === 'submit') {
      const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
      const motDePasse = typeof payload?.motDePasse === 'string' ? payload.motDePasse : '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        return json({ error: 'Adresse e-mail invalide' }, 400);
      }
      if (motDePasse.length < 4 || motDePasse.length > 128) {
        return json({ error: 'Mot de passe invalide' }, 400);
      }

      const { error: updateError } = await supabase
        .from('apprenant_identifiants_t3p')
        .update({
          nouvel_email: email,
          nouveau_mot_de_passe: motDePasse,
          recu_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateError) throw updateError;

      return json({ success: true });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('[identifiants-t3p-public]', e);
    return json({ error: 'Erreur serveur' }, 500);
  }
});
