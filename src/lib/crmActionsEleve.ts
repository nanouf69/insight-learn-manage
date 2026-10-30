import { supabase } from '@/integrations/supabase/client';
import { parseDateExamen } from '@/lib/dateInscription';

export function dateExamenIso(value?: string | null) {
  const date = parseDateExamen(value);
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
export async function lireChoixAdmin(apprenant: string, examen: string | null) {
  if (!examen) return [];
  const { data, error } = await supabase.from('crm_reinscription_choix').select('*')
    .eq('apprenant_id', apprenant).eq('date_examen', examen).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export interface ExtensionAcces { autorise: boolean; debut?: string | null; fin?: string | null }
export async function lireExtensionAcces(apprenant: string): Promise<ExtensionAcces> {
  const { data, error } = await supabase.rpc('crm_lire_extension_acces', { p_apprenant: apprenant });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.autorise !== 'boolean') throw new Error('Lecture de l’accès impossible');
  return data as unknown as ExtensionAcces;
}