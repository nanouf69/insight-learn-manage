export const TYPES_PEDAGOGIQUES = new Set(['analyse-besoin', 'projet-professionnel', 'test-competences', 'evaluation-acquis']);
export interface ContextePedagogique {
  inscription_id: string | null;
  session_id: string | null;
  formation: string;
  session_libelle: string | null;
  rempli_le: string | null;
  valide_le: string | null;
  decision: 'admis' | 'refuse' | 'en_attente' | 'non_evalue' | null;
  decision_le: string | null;
}
export interface InscriptionPedagogique {
  id: string;
  session_id: string;
  session: { nom: string; date_debut: string; date_fin: string; types_apprenant?: string[] | null };
}
const texte = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
export function datePedagogique(v: unknown): string | null {
  const s = texte(v);
  // No locale-dependent parsing or invented time for a recorded calendar date.
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(s)) return null;
  const parsed = new Date(s);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== s.slice(0, 10) && s.length === 10) return null;
  return s;
}
export function decisionPedagogique(v: unknown): ContextePedagogique['decision'] {
  const s = texte(v).toLowerCase();
  if (s === 'admis') return 'admis';
  if (s === 'refusé' || s === 'refuse') return 'refuse';
  if (s === 'en attente' || s === 'en_attente') return 'en_attente';
  if (s === 'non évalué' || s === 'non_evalue') return 'non_evalue';
  return null;
}
export function libelleDecision(v: ContextePedagogique['decision']): string {
  return v === 'admis' ? 'Admis' : v === 'refuse' ? 'Refusé' : v === 'en_attente' ? 'En attente' : v === 'non_evalue' ? 'Non évalué' : 'À valider humainement';
}
export function contexteDocument(donnees: Record<string, unknown>, revision?: ContextePedagogique | null): ContextePedagogique {
  if (revision) return { ...revision };
  const formation = texte(donnees.formationLabel) || texte(donnees.formation) || texte(donnees.formType) || texte(donnees.formationType)
    || (donnees.formationVTC === true && donnees.formationTAXI !== true ? 'VTC' : donnees.formationTAXI === true && donnees.formationVTC !== true ? 'TAXI' : '');
  return {
    formation: formation || 'Formation à rattacher', inscription_id: null, session_id: null, session_libelle: null,
    rempli_le: datePedagogique(donnees.rempli_le) || datePedagogique(donnees.date_remplissage),
    valide_le: datePedagogique(donnees.valide_le) || datePedagogique(donnees._validated_at),
    decision: decisionPedagogique(donnees.decision_pedagogique),
    decision_le: datePedagogique(donnees.decision_le) || datePedagogique(donnees.date_decision),
  };
}
export function verifierContexte(c: ContextePedagogique, inscriptions: InscriptionPedagogique[], now: string): void {
  if (!c.formation.trim() || c.formation === 'Formation à rattacher') throw new Error('Choisissez la formation réellement concernée.');
  if (c.inscription_id) {
    const inscription = inscriptions.find(i => i.id === c.inscription_id);
    if (!inscription || inscription.session_id !== c.session_id) throw new Error('Inscription et session ne correspondent pas.');
  } else if (c.session_id) throw new Error('Une session exige son inscription exacte.');
  for (const d of [c.rempli_le, c.valide_le, c.decision_le]) {
    if (d && (!datePedagogique(d) || new Date(d).getTime() > new Date(now).getTime())) throw new Error('Date invalide ou future.');
  }
  if (c.rempli_le && c.valide_le && new Date(c.valide_le) < new Date(c.rempli_le)) throw new Error('La validation précède le remplissage.');
  if (c.decision && !c.decision_le) throw new Error('La décision exige sa date réelle.');
  if (!c.decision && c.decision_le) throw new Error('La date de décision exige une décision explicite.');
}
export function lignesContexte(c: ContextePedagogique): [string, string][] {
  const afficherDate = (v: string | null) => v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(v))) : 'Non renseignée';
  return [['Formation', c.formation], ['Inscription', c.inscription_id || 'À rattacher'], ['Session', c.session_libelle || 'À rattacher'], ['Date de remplissage', afficherDate(c.rempli_le)], ['Date réelle de validation', afficherDate(c.valide_le)], ['Décision pédagogique', libelleDecision(c.decision)], ['Date de décision', afficherDate(c.decision_le)]];
}