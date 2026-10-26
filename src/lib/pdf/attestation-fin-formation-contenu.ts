import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { modeFormationAffichage } from '@/lib/modeFormationAffichage';
import { estJalonPratique } from '@/lib/jalonsPedagogiques';
import { LABEL_PRESENTIEL } from '@/lib/jalonsPonderes';
import { MODULE_NAME_BY_ID } from '@/components/cours-en-ligne/modules-config';
import type { tableauAffichageJalons } from '@/lib/affichageJalons';

/** Date longue française (« 14 septembre 2026 ») ; valeur d'origine conservée si illisible. */
export function formatDateLongueFrancaise(valeur?: string | null): string {
  if (!valeur) return '-';
  try {
    const date = parseISO(String(valeur));
    if (Number.isNaN(date.getTime())) return String(valeur);
    return format(date, 'd MMMM yyyy', { locale: fr });
  } catch {
    return String(valeur);
  }
}

/** L'attestation e-learning n'écrit que le taux de jalons ; le présentiel écrit dates et heures. */
export function attestationEstElearning(apprenant: { type_apprenant?: string | null; formation_choisie?: string | null } | null | undefined): boolean {
  return modeFormationAffichage(apprenant).jalonsEnRouge;
}

export type LigneJalonAttestation = {
  libelle: string;
  progression: number;
  poidsAffiche: number;
};

/** Détail par jalon pour l'attestation e-learning : libellé, progression, poids. */
export function lignesJalonsAttestation(tableau: ReturnType<typeof tableauAffichageJalons>): LigneJalonAttestation[] {
  return tableau.lignes.map((l) => ({
    libelle: estJalonPratique(l.moduleId)
      ? LABEL_PRESENTIEL
      : l.moduleId
        ? `${l.moduleId} · ${MODULE_NAME_BY_ID[l.moduleId] ?? ''}`.trim()
        : 'Introduction (non attribuée)',
    progression: l.progression,
    poidsAffiche: l.poidsAffiche,
  }));
}

export const formatPctAttestation = (n: number) =>
  `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** Recorded course dates plus practical training dates, never the exam/access deadline. */
export function datesAttestationPresentiel(
  sessions: Array<{ date_debut?: string | null; date_fin?: string | null }>,
  pratique: Array<{ date?: string | null }>,
) {
  const valide = (v?: string | null) => v && /^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10)) ? v.slice(0, 10) : null;
  const debuts = sessions.map((s) => valide(s.date_debut)).filter((v): v is string => !!v);
  const fins = sessions.map((s) => valide(s.date_fin ?? s.date_debut)).filter((v): v is string => !!v);
  const datesPratique = pratique.map((s) => valide(s.date)).filter((v): v is string => !!v);
  return { debut: [...debuts, ...datesPratique].sort()[0] ?? null, fin: [...fins, ...datesPratique].sort().at(-1) ?? null };
}
