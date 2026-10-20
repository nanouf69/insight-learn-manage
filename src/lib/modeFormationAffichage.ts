import { isElearningType } from '@/lib/dossierFormation';

/** Display only: independent of dated attendance/calculation policies. */
export function modeFormationAffichage(row: { type_apprenant?: string | null; formation_choisie?: string | null } | null | undefined) {
  const type = String(row?.type_apprenant || row?.formation_choisie || '').trim().toLowerCase();
  const enLigne = isElearningType(type);
  if (enLigne) return { libelle: /pr[eé]sentiel/.test(type) ? 'E-learning + Présentiel' : 'E-learning', jalonsEnRouge: true };
  const presentiel = /^(vtc|taxi|ta|va|vtc-cours-du-soir|taxi-pour-vtc|passerelle-taxi|vtc-pratique|taxi-pratique|pratique-vtc|pratique-taxi|fc-vtc|fc-taxi|vtc-fc|taxi-fc)$/.test(type);
  return { libelle: presentiel ? 'Présentiel' : 'Mode de formation à vérifier', jalonsEnRouge: false };
}