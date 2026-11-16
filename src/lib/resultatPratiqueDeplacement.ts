import { supabase } from '@/integrations/supabase/client';
import { PRATIQUE_TYPES } from '@/lib/sessionTypes';

/** Only the recorded result/membership status; never writes the currently open planning. */
export async function enregistrerDeplacementPratique(apprenantId: string) {
  const reservation = await supabase.from('reservations_pratique')
    .select('id').eq('apprenant_id', apprenantId);
  if (reservation.error) throw reservation.error;
  if (reservation.data?.length) {
    throw new Error('Une réservation pratique existe encore. Faites vérifier son report avant de déplacer le candidat ; elle a été conservée.');
  }
  const inscriptions = await supabase.from('session_apprenants')
    .select('id, presence_pratique, sessions!inner(type_session)')
    .eq('apprenant_id', apprenantId).in('sessions.type_session', PRATIQUE_TYPES);
  if (inscriptions.error) throw inscriptions.error;

  for (const inscription of inscriptions.data ?? []) {
    if (inscription.presence_pratique === 'deplace') continue;
    const saved = await supabase.from('session_apprenants')
      .update({ presence_pratique: 'deplace' }).eq('id', inscription.id)
      .eq('apprenant_id', apprenantId).select('id, presence_pratique').single();
    if (saved.error) throw saved.error;
    if (saved.data?.presence_pratique !== 'deplace') throw new Error('Le report de l’inscription n’a pas été confirmé.');
  }

  const result = await supabase.from('apprenants')
    .update({ resultat_examen_pratique: 'deplace' }).eq('id', apprenantId)
    .select('id, resultat_examen_pratique').single();
  if (result.error) throw result.error;
  if (result.data?.id !== apprenantId || result.data.resultat_examen_pratique !== 'deplace') {
    throw new Error('Le déplacement n’a pas été confirmé.');
  }
}