import { resolveFormationId } from '@/lib/parcoursModulesDashboard';

interface Dossier {
  formation_choisie: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
}
export interface InscriptionFC {
  date_debut?: string | null;
  date_fin?: string | null;
  date_fin_personnalisee?: string | null;
  liste_attente?: boolean | null;
  emargements_exclus?: boolean | null;
  statut_suivi?: string | null;
  sessions: {
    nom?: string | null;
    types_apprenant?: string[] | null;
    type_session?: string | null;
    statut?: string | null;
    date_debut?: string | null;
    date_fin?: string | null;
  } | null;
}

/** Read-only course classification from an exact enrollment, never attendance proof. */
export function projeterParcoursSessionFC<T extends Dossier>(dossier: T, inscriptions: InscriptionFC[]): T {
  const formations = new Set<string>();
  for (const i of inscriptions) {
    const s = i.sessions;
    if (!s || i.liste_attente || i.emargements_exclus || /annul|abandon|exclu|attente/i.test(`${i.statut_suivi ?? ''} ${s.statut ?? ''}`)) continue;
    if (/pratique|e-?learning|en ligne/i.test(`${s.type_session ?? ''} ${s.nom ?? ''}`)) continue;
    const debut = i.date_debut ?? s.date_debut;
    const fin = i.date_fin_personnalisee ?? i.date_fin ?? s.date_fin;
    if (!debut || !fin || !dossier.date_debut_formation || !dossier.date_fin_formation) continue;
    if (debut > dossier.date_fin_formation || fin < dossier.date_debut_formation) continue;
    for (const type of s.types_apprenant ?? []) {
      const formation = resolveFormationId(type, null, null);
      if (formation === 'continue-vtc' || formation === 'continue-taxi') formations.add(formation);
    }
  }
  if (formations.size !== 1) return dossier;
  const formation = Array.from(formations)[0];
  return { ...dossier, formation_choisie: formation };
}