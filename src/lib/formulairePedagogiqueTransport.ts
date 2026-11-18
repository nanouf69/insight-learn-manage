import { supabase } from '@/integrations/supabase/client';
import type { ContextePedagogique, InscriptionPedagogique } from './formulairePedagogique';
export async function lireInscriptionsPedagogiques(apprenantId: string): Promise<InscriptionPedagogique[]> {
  const rows: InscriptionPedagogique[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('session_apprenants').select('id,session_id,session:sessions(nom,date_debut,date_fin,types_apprenant)').eq('apprenant_id', apprenantId).order('id').range(offset, offset + 499);
    if (error) throw error;
    for (const row of data ?? []) if (row.session) rows.push(row as unknown as InscriptionPedagogique);
    if ((data?.length ?? 0) < 500) break;
  }
  return rows;
}
export async function lireContextesPedagogiques(apprenantId: string): Promise<{ disponible: boolean; revisions: Record<string, ContextePedagogique> }> {
  const { data, error } = await (supabase as any).rpc('formulaires_pedagogiques_lire', { p_apprenant: apprenantId });
  if (error?.code === 'PGRST202') return { disponible: false, revisions: {} };
  if (error) throw error;
  return { disponible: true, revisions: data ?? {} };
}