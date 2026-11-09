import { supabase } from '@/integrations/supabase/client';
export async function chargerPreuvesPapier(apprenantId: string): Promise<any[]> {
  const { data, error } = await (supabase as any).rpc('fc_papier_creneaux', { p_apprenant: apprenantId });
  if (error) throw error;
  return data ?? [];
}
export function preuvePapierComplete(e: any): boolean {
  return e?.preuve_papier === true && e?.masque !== true && e?.absent !== true &&
    (e.demi_journee === 'matin' || e.demi_journee === 'apres_midi') &&
    Number(e.heures) === (e.demi_journee === 'matin' ? 3 : 4);
}
export async function completerEmargementsPapier(rows: any[], apprenantId: string): Promise<any[]> {
  const preuves = await chargerPreuvesPapier(apprenantId);
  // Transport de preuves séparées : jamais de fausse image ou signed_at fabriqué.
  return [...rows, ...preuves.map(p => ({ ...p, preuve_papier: true, apprenant_id: apprenantId }))];
}