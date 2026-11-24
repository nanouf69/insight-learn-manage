import { COMPETENCES_MODELE, COMPETENCES_VERSION, DECLARATION_COMPETENCES } from './competencesIntervenant.ts';

export type ActiviteFormateur = 'actif' | 'inactif' | 'inconnu';
export type EtatEnvoiCompetences = 'prepare' | 'reserve' | 'envoye' | 'indetermine' | 'refuse';
export interface FormateurAnnuel { id: string; nom: string; email: string | null; activite: ActiviteFormateur }
export interface ValidationAnnuel { id: string; formateurId: string; valideLe: string; preuveVerifiee: boolean }
export interface DemandeAnnuel {
  id: string; formateurId: string; cycle: string; expiresAt: string;
  etat: EtatEnvoiCompetences; remiseLe: string | null; revoquee: boolean;
}

/** Twelve calendar months in Paris, including leap-day clamping; not 365 days. */
export function echeanceCompetences(valideLe: string): string {
  const input = new Date(valideLe);
  if (!Number.isFinite(input.getTime())) throw new Error('Date de validation non prouvée');
  const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  const p = parts(input), year = p.year + 1;
  const day = Math.min(p.day, new Date(Date.UTC(year, p.month, 0)).getUTCDate());
  const wall = Date.UTC(year, p.month - 1, day, p.hour, p.minute, p.second, input.getUTCMilliseconds());
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const actual = parts(new Date(instant));
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, input.getUTCMilliseconds());
    instant += wall - represented;
  }
  return new Date(instant).toISOString();
}

export function planifierCompetences(formateur: FormateurAnnuel, validations: ValidationAnnuel[], demandes: DemandeAnnuel[], now: string) {
  const clock = Date.parse(now);
  if (!Number.isFinite(clock)) throw new Error('Horloge serveur indisponible');
  const preuves = validations.filter(v => v.formateurId === formateur.id && v.preuveVerifiee &&
    Number.isFinite(Date.parse(v.valideLe)) && Date.parse(v.valideLe) <= clock)
    .sort((a, b) => Date.parse(b.valideLe) - Date.parse(a.valideLe) || a.id.localeCompare(b.id));
  const derniere = preuves[0];
  const echeance = derniere ? echeanceCompetences(derniere.valideLe) : null;
  const cycle = `${formateur.id}:${derniere?.id ?? 'premiere-demande'}`;
  const existantes = demandes.filter(d => d.formateurId === formateur.id && d.cycle === cycle);
  let statut: 'inactif' | 'activite_a_confirmer' | 'adresse_a_corriger' | 'a_jour' | 'a_demander' | 'en_attente' | 'a_examiner' | 'a_verifier' = 'a_demander';
  if (formateur.activite === 'inactif') statut = 'inactif';
  else if (formateur.activite !== 'actif') statut = 'activite_a_confirmer';
  else if (!formateur.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formateur.email)) statut = 'adresse_a_corriger';
  else if (echeance && Date.parse(echeance) > clock) statut = 'a_jour';
  else if (existantes.length > 1 || existantes.some(d => d.etat === 'indetermine' || d.etat === 'reserve' || d.etat === 'refuse' || d.revoquee || !Number.isFinite(Date.parse(d.expiresAt)) || Date.parse(d.expiresAt) <= clock)) statut = 'a_verifier';
  else if (existantes.some(d => d.remiseLe)) statut = 'a_examiner';
  else if (existantes.length) statut = 'en_attente';
  return { formateurId: formateur.id, derniereValidation: derniere?.valideLe ?? null, echeance, cycle, statut };
}

export function modeleDemandeAnnuelle(nom: string, lien: string) {
  const url = new URL(lien);
  if (url.protocol !== 'https:' || url.hostname !== 'gestion.ftransport.fr' || !/^\/competences-intervenant\/[a-f0-9]{64}$/.test(url.pathname) || url.search || url.hash) throw new Error('Lien individuel refusé');
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
  return {
    subject: 'SERVICES PRO — Actualisation annuelle de vos compétences',
    html: `<p>Bonjour ${escape(nom)},</p><p>Dans le cadre du suivi de vos missions de formation pour SERVICES PRO, merci de compléter votre justification ou actualisation annuelle des compétences.</p><p>Précisez vos missions, votre expérience et vos qualifications actuelles, et joignez votre CV et les justificatifs utiles. Distinguez les diplômes obtenus des formations suivies sans certification.</p><p><a href="${escape(lien)}">Compléter mon formulaire individuel sécurisé</a></p><p>Ce lien est personnel et valable 30 jours. Votre déclaration sera examinée séparément par le responsable ; son dépôt ne vaut pas validation des compétences.</p><p>Pour toute question : contact@ftransport.fr.</p>`,
  };
}

export function invitationAnnuelle(formateur: FormateurAnnuel, cycle: string, token: string, now: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Jeton individuel invalide');
  const expiresAt = new Date(Date.parse(now) + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    nom: `Justification annuelle des compétences — ${formateur.nom}`, file_path: '', champs: [],
    modele_code: COMPETENCES_MODELE, modele_version: COMPETENCES_VERSION, token,
    destinataire_nom: formateur.nom, destinataire_email: formateur.email,
    identite_figee: { formateur_id: formateur.id, nom: formateur.nom, email: formateur.email },
    texte_fige: JSON.stringify({ version: COMPETENCES_VERSION, declaration: DECLARATION_COMPETENCES, expires_at: expiresAt, cycle }),
    cle_envoi: cycle, statut: 'brouillon', reponses: {}, expiresAt,
  };
}

/** Adapter contract: claim atomically rechecks persisted activation, active status,
 * latest proven validation and cycle uniqueness, and creates the immutable invitation.
 * No production adapter is installed until activation is approved. */
export interface DepotAnnuel {
  lireActivation(): Promise<boolean>;
  reserver(formateurId: string, cycle: string): Promise<{ id: string; nom: string; email: string; lien: string } | null>;
  journaliser(id: string, etat: 'envoye' | 'indetermine', preuveTransport: string | null): Promise<void>;
}
export async function traiterDemandeAnnuelle(plan: ReturnType<typeof planifierCompetences>, depot: DepotAnnuel,
  send: (message: { to: string; subject: string; html: string; idempotencyKey: string }) => Promise<string | null>) {
  if (plan.statut !== 'a_demander' || !await depot.lireActivation()) return 'desactive_ou_exclu';
  const reservation = await depot.reserver(plan.formateurId, plan.cycle);
  if (!reservation) return 'deja_reserve_ou_ineligible';
  // Disabled between preview and claim/send: quarantine, never replay uncertain delivery.
  if (!await depot.lireActivation()) {
    await depot.journaliser(reservation.id, 'indetermine', null);
    return 'activation_retiree';
  }
  try {
    const mail = modeleDemandeAnnuelle(reservation.nom, reservation.lien);
    const proof = await send({ to: reservation.email, ...mail, idempotencyKey: `competences-annuelles:${reservation.id}` });
    await depot.journaliser(reservation.id, proof ? 'envoye' : 'indetermine', proof);
    return proof ? 'envoye' : 'a_verifier';
  } catch {
    await depot.journaliser(reservation.id, 'indetermine', null);
    return 'a_verifier';
  }
}