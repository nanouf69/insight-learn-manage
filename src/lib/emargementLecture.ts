import { supabase } from '@/integrations/supabase/client';
import type { CreneauKey } from '@/lib/agendaSlots';

export interface LigneEmargement {
  id: string;
  date_emargement: string;
  demi_journee: string;
  signature_data_url: string | null;
  signed_at: string;
  absent?: boolean | null;
}
export const cleCreneauEmargement = (date: string, creneau: CreneauKey) => `${date}|${creneau}`;
export function normaliserCreneauEmargement(value: string): CreneauKey | null {
  const v = value.toLowerCase().replace(/_/g, '-').trim();
  if (v === 'apres-midi' || v === 'après-midi') return 'apres_midi';
  if (v === 'soir-1') return 'soir_1';
  if (v === 'soir-2') return 'soir_2';
  return v === 'matin' || v === 'soir' ? v : null;
}
export const emargementRenseigne = (r?: LigneEmargement) => Boolean(r?.signature_data_url?.trim()) || r?.absent === true;

/** Stable read projection only: never infer a dossier from a name or a signature timestamp. */
export function indexerEmargements(rows: LigneEmargement[]) {
  const index = new Map<string, LigneEmargement>();
  for (const row of [...rows].sort((a, b) => a.signed_at.localeCompare(b.signed_at) || a.id.localeCompare(b.id))) {
    const c = normaliserCreneauEmargement(row.demi_journee);
    if (!c) continue;
    const key = cleCreneauEmargement(row.date_emargement, c);
    const old = index.get(key);
    if (!old || emargementRenseigne(row) || !emargementRenseigne(old)) index.set(key, row);
  }
  return index;
}

export function creneauxManquants(rows: LigneEmargement[], expected: Array<{ date: string; creneau: CreneauKey }>) {
  const index = indexerEmargements(rows);
  return expected.filter(s => !emargementRenseigne(index.get(cleCreneauEmargement(s.date, s.creneau))));
}

export async function lireSignaturesDossier(apprenantId: string): Promise<LigneEmargement[]> {
  const rows: LigneEmargement[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await supabase.from('emargements_fc')
      .select('id, date_emargement, demi_journee, signature_data_url, signed_at, absent')
      .eq('apprenant_id', apprenantId).eq('masque', false).order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Lecture des signatures impossible');
    rows.push(...data as LigneEmargement[]);
    if (data.length < 1000) return rows;
  }
  throw new Error('Lecture incomplète des signatures');
}