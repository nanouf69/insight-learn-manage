import { supabase } from '@/integrations/supabase/client';
import { freshSessionRead } from '@/lib/sessionRpc';
import type { CreneauKey } from '@/lib/agendaSlots';

export interface FenetreEmargement {
  date_cours: string;
  creneau: CreneauKey;
  debut: string;
  fin: string;
  pratique: boolean;
  ouvre_le: string;
  serveur_le: string;
  ouverte: boolean;
}

/** Server clock and real inscription determine eligibility; device timezone never grants access. */
export async function lireFenetresEmargement(apprenantId: string): Promise<FenetreEmargement[]> {
  const { data, error } = await freshSessionRead(() => (supabase.rpc as any)('emargement_fenetres_eleve', { p_apprenant_id: apprenantId }));
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Horaires des feuilles indisponibles');
  return data;
}

export function delaiProchaineFenetre(fenetres: FenetreEmargement[]): number | null {
  const delais = fenetres.filter(f => !f.ouverte).map(f => Date.parse(f.ouvre_le) - Date.parse(f.serveur_le)).filter(d => Number.isFinite(d) && d > 0);
  return delais.length ? Math.min(...delais) : null;
}

export function fenetresDues(fenetres: FenetreEmargement[], pratique?: boolean) {
  return fenetres.filter(f => f.ouverte && (pratique === undefined || f.pratique === pratique)).map(f => ({ date: f.date_cours, creneau: f.creneau }));
}

export function horaireFenetre(f: FenetreEmargement): string {
  return `${f.debut.slice(0, 5)} — ${f.fin.slice(0, 5)}`;
}