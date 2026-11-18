import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const txt = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const vide = (v: unknown) => !(typeof v === 'string' && v.trim());

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const p = await req.json().catch(() => ({}));
    const token = txt(p?.token, 128);
    if (token.length < 24) return json({ error: 'Lien invalide' }, 400);
    const { data: d, error } = await sb.from('demandes_coordonnees').select('*').eq('token', token).maybeSingle();
    if (error) throw error;
    if (!d || new Date(d.expires_at) < new Date()) return json({ error: 'Lien invalide ou expiré' }, 404);
    const { data: a } = await sb.from('apprenants').select('id, prenom, nom, auth_user_id, adresse, code_postal, ville, telephone').eq('id', d.apprenant_id).maybeSingle();
    if (!a) return json({ error: 'Lien invalide' }, 404);
    const { data: f } = await sb.from('financeurs_fc').select('*').eq('apprenant_id', a.id).maybeSingle();

    if (p?.action === 'get') {
      return json({ prenom: a.prenom, deja_repondu: !!d.repondu_at, champs: d.champs,
        financeur_societe: !!f && f.type_financeur !== 'particulier', raison_sociale: f?.raison_sociale ?? null });
    }
    if (p?.action !== 'submit') return json({ error: 'Action inconnue' }, 400);
    if (d.repondu_at) return json({ error: 'Vous avez déjà répondu. Merci !' }, 409);

    const e = { adresse: txt(p.adresse), code_postal: txt(p.code_postal, 10), ville: txt(p.ville, 100), telephone: txt(p.telephone, 30) };
    if (e.code_postal && !/^[0-9A-Za-z \-]{4,10}$/.test(e.code_postal)) return json({ error: 'Code postal invalide' }, 400);
    if (e.telephone && !/^[0-9+ .()\-]{6,30}$/.test(e.telephone)) return json({ error: 'Téléphone invalide' }, 400);
    const societe = p.financeur === 'societe';
    const s = { raison_sociale: txt(p.raison_sociale), siret: txt(p.siret, 20).replace(/\s/g, ''), adresse: txt(p.soc_adresse),
      code_postal: txt(p.soc_code_postal, 10), ville: txt(p.soc_ville, 100), contact_telephone: txt(p.soc_telephone, 30), contact_email: txt(p.soc_email, 255) };
    if (societe && (!s.raison_sociale || !s.adresse || !s.code_postal || !s.ville)) return json({ error: 'Merci de compléter le nom et l’adresse de la société' }, 400);
    if (societe && s.siret && !/^\d{9}(\d{5})?$/.test(s.siret)) return json({ error: 'SIRET invalide (9 ou 14 chiffres)' }, 400);
    if (!societe && (!e.adresse || !e.code_postal || !e.ville)) return json({ error: 'Merci de compléter votre adresse' }, 400);

    // Seuls les champs vides sont remplis : rien d'existant n'est écrasé.
    const majA: Record<string, string> = {};
    for (const k of Object.keys(e) as (keyof typeof e)[]) if (e[k] && vide((a as any)[k])) majA[k] = e[k];
    if (Object.keys(majA).length) { const { error: x } = await sb.from('apprenants').update(majA).eq('id', a.id); if (x) throw x; }

    const majF: Record<string, string> = {};
    if (societe) {
      if (!f) {
        const ins: Record<string, unknown> = { apprenant_id: a.id, user_id: a.auth_user_id || '00000000-0000-0000-0000-000000000000', type_financeur: 'professionnel' };
        for (const [k, v] of Object.entries(s)) if (v) { ins[k] = v; majF[k] = v; }
        if (s.siret) ins.siren = s.siret.slice(0, 9);
        const { error: x } = await sb.from('financeurs_fc').insert(ins); if (x) throw x;
      } else {
        for (const [k, v] of Object.entries(s)) if (v && vide((f as any)[k])) majF[k] = v;
        if (Object.keys(majF).length) { const { error: x } = await sb.from('financeurs_fc').update(majF).eq('id', f.id); if (x) throw x; }
      }
    }
    const reponse = { apprenant: e, financeur: societe ? 'societe' : 'personnel', societe: societe ? s : null, ecrit_apprenant: majA, ecrit_financeur: majF };
    const { error: x } = await sb.from('demandes_coordonnees').update({ repondu_at: new Date().toISOString(), reponse }).eq('id', d.id).is('repondu_at', null);
    if (x) throw x;
    await sb.from('alertes_systeme').insert({ type: 'document_upload', titre: `📇 Coordonnées reçues — ${a.prenom ?? ''} ${a.nom ?? ''}`.trim(),
      message: `Réponse à la demande de coordonnées${societe ? ' (financeur : société ' + s.raison_sociale + ')' : ''}`, details: `Apprenant ID: ${a.id}` });
    return json({ success: true });
  } catch (err) {
    console.error('[coordonnees-public]', err);
    return json({ error: 'Erreur serveur' }, 500);
  }
});
