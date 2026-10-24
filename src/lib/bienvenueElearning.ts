import { isElearningType } from './dossierFormation';
import { formatDateFROrRaw } from './safeDateParse';

export const CONSIGNE_ACCES = 'Si vous n’avez pas reçu vos accès par mail à la date de début indiquée, merci de nous recontacter. Je confirme avoir pris connaissance de cette consigne.';
export const ENGAGEMENT_PRATIQUE = 'Je m’engage à être présent à une journée d’entraînement pratique après avoir passé l’examen théorique. Cette journée aura lieu dans les trois semaines à compter du lendemain de l’examen théorique.';
export const CLE_ENGAGEMENTS = 'onboarding_engagements_elearning';

export interface AccesBienvenue {
  id: string;
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  date_debut_cours_en_ligne?: string | null;
  date_fin_cours_en_ligne?: string | null;
  date_debut_formation?: string | null;
}
export interface EngagementsBienvenue {
  version: 1;
  apprenant_id: string;
  date_debut_acces: string;
  date_fin_acces: string;
  consigne_acces: string;
  consigne_acces_confirmee: boolean;
  engagement_pratique: string;
  engagement_pratique_confirme: boolean;
}
export function estBienvenueElearning(a: AccesBienvenue) {
  const type = a.type_apprenant || a.formation_choisie || '';
  return !/continu|\bfc\b/i.test(type) && isElearningType(type);
}
function dateValide(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export function datesAccesBienvenue(a: AccesBienvenue) {
  const debut = a.date_debut_cours_en_ligne || '';
  const fin = a.date_fin_cours_en_ligne || '';
  return { debut, fin, valides: dateValide(debut) && dateValide(fin) && fin >= debut };
}
export function engagementsBienvenue(a: AccesBienvenue, acces: boolean, pratique: boolean): EngagementsBienvenue {
  const dates = datesAccesBienvenue(a);
  return { version: 1, apprenant_id: a.id, date_debut_acces: dates.debut, date_fin_acces: dates.fin,
    consigne_acces: CONSIGNE_ACCES, consigne_acces_confirmee: acces,
    engagement_pratique: ENGAGEMENT_PRATIQUE, engagement_pratique_confirme: pratique };
}
export function peutConfirmerBienvenue(a: AccesBienvenue | null, acces: boolean, pratique: boolean) {
  return !!a && (!estBienvenueElearning(a) || (datesAccesBienvenue(a).valides && acces && pratique));
}
export function restaurerEngagements(a: AccesBienvenue, raw: string | null): [boolean, boolean] {
  try {
    const p = JSON.parse(raw || 'null');
    const dates = datesAccesBienvenue(a);
    if (p?.version !== 1 || p.apprenant_id !== a.id || p.date_debut_acces !== dates.debut || p.date_fin_acces !== dates.fin) return [false, false];
    return [p.consigne_acces_confirmee === true, p.engagement_pratique_confirme === true];
  } catch { return [false, false]; }
}
export function lignesEngagementsBienvenue(p: EngagementsBienvenue): string[] {
  return [
    `Début d’accès : ${formatDateFROrRaw(p.date_debut_acces) || 'Non renseigné'}`,
    `Fin d’accès : ${formatDateFROrRaw(p.date_fin_acces) || 'Non renseignée'}`,
    `[${p.consigne_acces_confirmee ? 'X' : ' '}] ${p.consigne_acces}`,
    `[${p.engagement_pratique_confirme ? 'X' : ' '}] ${p.engagement_pratique}`,
  ];
}