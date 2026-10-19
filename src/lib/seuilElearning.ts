import { isElearningType } from '@/lib/dossierFormation';
import { formatLearningHours } from '@/lib/elearningRequiredHours';

export type SeuilElearning = { etat: 'indisponible' | 'hors_perimetre' | 'atteint' } |
  { etat: 'non_atteint'; fait: number; prevu: number; seuil: number; restant: number };

export function seuilElearning(row: { type_apprenant?: string | null; formation_choisie?: string | null }, fait?: number | null, prevu?: number | null, disponible = true): SeuilElearning {
  if (!isElearningType(row.type_apprenant ?? '') && !isElearningType(row.formation_choisie ?? '')) return { etat: 'hors_perimetre' };
  if (!disponible || typeof fait !== 'number' || typeof prevu !== 'number' || !Number.isFinite(fait) || !Number.isFinite(prevu) || fait < 0 || prevu <= 0) return { etat: 'indisponible' };
  const seuil = prevu * 0.5;
  return fait < seuil ? { etat: 'non_atteint', fait, prevu, seuil, restant: seuil - fait } : { etat: 'atteint' };
}

export function messageSeuilElearning(s: Extract<SeuilElearning, { etat: 'non_atteint' }>) {
  return `Pour valider votre formation, vous devez effectuer au moins 50 % du temps de formation en ligne prévu (${formatLearningHours(s.fait)} / ${formatLearningHours(s.prevu)}). Il vous reste ${formatLearningHours(s.restant)} à réaliser.`;
}

export function filtrerSeuilsElearning<T extends { id: string }>(rows: T[], seuils: Record<string, SeuilElearning>, actif: boolean): T[] {
  return actif ? rows.filter(r => seuils[r.id]?.etat === 'non_atteint') : rows;
}

export function dernierJalonConfirme(avant: { owner: string; total: number; termines: number } | null, apres: { owner: string; total: number; termines: number } | null) {
  return !!avant && !!apres && avant.owner === apres.owner && avant.total === apres.total && apres.total > 0 && avant.termines < avant.total && apres.termines === apres.total;
}