export type Funding = '' | 'personnel' | 'cpf' | 'opco' | 'entreprise' | 'autre';
export type ContractFields = Record<string, string>;
export interface ContractActivity {
  id: string; title: string; activities: string; modality: string; hours: string;
  evaluation: string; value: string;
}
export interface ContractPayment { amount: string; date: string; milestone: string }
export interface TrainingContract {
  reference: string; learnerId: string; sessionId: string; pathway: string;
  funding: Funding; fields: ContractFields; activities: ContractActivity[];
  payments: ContractPayment[]; verified: boolean;
  // Only a verified signing service may establish these, never the generator.
  concludedAt: string | null; signedAt: string | null;
}
export interface FieldGroup { title: string; fields: [string, string, string?][] }
export const CONTRACT_FIELD_GROUPS: FieldGroup[] = [
  { title: '1 · Organisme — informations à confirmer', fields: [
    ['centre', 'Dénomination exacte et nom commercial'], ['legalForm', 'Forme juridique et capital'],
    ['centreAddress', 'Siège et adresse de correspondance'], ['registration', 'SIREN / SIRET et RCS'],
    ['nda', 'Déclaration d’activité et autorité d’enregistrement'], ['approval', 'Agrément applicable : numéro, autorité, validité'],
    ['representative', 'Représentant : nom, prénom, qualité'], ['centrePhone', 'Téléphone'], ['centreEmail', 'Courriel'],
  ] },
  { title: 'Stagiaire', fields: [ ['learnerName', 'Nom et tous les prénoms'], ['learnerAddress', 'Adresse complète'],
    ['learnerPhone', 'Téléphone'], ['learnerEmail', 'Courriel'] ] },
  { title: '2–3 · Parcours et organisation', fields: [
    ['title', 'Intitulé exact'], ['objective', 'Objectif professionnel et compétences opérationnelles'],
    ['certification', 'Examen / certification, référence et certificateur ou sans objet'],
    ['start', 'Début de formation', 'date'], ['end', 'Fin de formation', 'date'],
    ['totalHours', 'Durée totale (h)', 'number'], ['presenceHours', 'Présentiel hors pratique (h)', 'number'],
    ['distanceHours', 'Distance (h)', 'number'], ['practiceHours', 'Pratique (h)', 'number'],
    ['modality', 'Modalité : présentiel, à distance ou mixte'], ['locations', 'Lieux des cours et de la pratique'],
    ['headcount', 'Effectif prévu', 'number'], ['planning', 'Planning daté : référence, dates, horaires et lieux'],
    ['practice', 'Pratique incluse/non incluse : durée, contenu, véhicule, réservations et dates'],
    ['articulation', 'Articulation avec la théorie et l’examen'],
  ] },
  { title: '4–7 · Programme, encadrement et suivi', fields: [
    ['prerequisites', 'Prérequis pédagogiques détaillés'], ['accessConditions', 'Conditions d’accès et pièces à fournir'],
    ['professionalConditions', 'Conditions distinctes pour l’examen et la profession'],
    ['positioning', 'Positionnement : modalité, date, résultat ou adaptation'],
    ['methods', 'Méthodes pédagogiques réellement prévues'], ['equipment', 'Moyens techniques'],
    ['trainers', 'Formateurs : noms, modules et diplômes/titres/références'], ['learnerContact', 'Contact stagiaire : nom, téléphone, courriel'],
    ['disability', 'Référent handicap et procédure d’aménagement'],
    ['platform', 'Plateforme, URL et dates d’accès ou sans objet'], ['digitalRequirements', 'Matériel, connexion et compétences ou sans objet'],
    ['accessRecovery', 'Ouverture et récupération des accès ou sans objet'], ['distanceActivities', 'Activités, durées moyennes, classes virtuelles, échéances ou sans objet'],
    ['pedagogicSupport', 'Assistance pédagogique : contact, horaires, délai'], ['technicalSupport', 'Assistance technique : contact, horaires, délai'],
    ['tracking', 'Suivi prévu'], ['evaluations', 'Évaluations, critères et seuils'], ['completionDocument', 'Document remis à l’issue'],
    ['programReference', 'Programme joint : titre, version, date et nombre de pages'],
  ] },
  { title: '8 · Prix et échéancier', fields: [
    ['priceHT', 'Prix HT (€)', 'number'], ['vat', 'TVA : taux et montant, ou fondement exact de l’exonération'],
    ['vatRate', 'Taux de TVA (%) — 0 si exonération justifiée', 'number'], ['vatAmount', 'Montant de TVA (€)', 'number'],
    ['price', 'Total à payer TTC ou net (€)', 'number'], ['taxLabel', 'TTC ou net de taxe'],
    ['examFees', 'Frais d’examen : inclus/non inclus, montant, bénéficiaire'], ['otherFees', 'Autres frais éventuels ou aucun'],
    ['examRegistration', 'Inscription examen : responsable, procédure et échéance'], ['paymentMode', 'Mode de paiement'],
  ] },
  { title: '11–12 · Réclamations et pièces contractuelles', fields: [
    ['complaints', 'Réclamations : service, adresse et courriel'], ['mediator', 'Médiateur réel : nom, adresse, site et adhésion'],
    ['privacy', 'Notice confidentialité : responsable, finalités, destinataires, durées, droits, contact, CNIL'],
    ['internalRules', 'Règlement intérieur : référence, version, date'], ['documents', 'Pièces remises : références et dates'],
    ['withdrawalOnline', 'Rétractation en ligne : lien si applicable, sinon sans objet justifié'],
    ['place', 'Lieu d’établissement'], ['conclusionMode', 'Mode de conclusion prévu : sur place, à distance, hors établissement'],
  ] },
];

export function parisDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(day: string, amount: number): string {
  if (!validDay(day)) return '';
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10);
}
export function money(value: string): number { return value.trim() ? Number(value.replace(',', '.')) : NaN; }
export function contractAccess(serverRole: boolean, expectedLearner: string, actualLearner: string): boolean {
  return serverRole && !!expectedLearner && expectedLearner === actualLearner;
}
export function validateContract(contract: TrainingContract, expectedLearner: string, now = new Date()) {
  const today = parisDay(now); const f = contract.fields; const issues: string[] = [];
  const earliestStart = addDays(today, 15);
  if (contract.learnerId !== expectedLearner || !expectedLearner) issues.push('Le contrat ne correspond pas au dossier apprenant ouvert.');
  if (contract.funding !== 'personnel') issues.push('Modèle réservé au financement personnel ; ne remplace pas les documents CPF, OPCO ou entreprise.');
  if (!contract.pathway) issues.push('Choisir le parcours effectivement vendu.');
  if (!validDay(f.start ?? '') || !validDay(f.end ?? '')) issues.push('Dates de début et de fin absentes ou invalides.');
  else {
    if (f.end < f.start) issues.push('La fin précède le début de formation.');
    if (f.start <= today) issues.push('Formation commencée ou passée : régularisation datée du jour uniquement, sans signature antérieure.');
    else if (f.start < earliestStart) issues.push(`Délai de 14 jours non respecté : report possible à partir du ${earliestStart}, à valider par l’administrateur.`);
  }
  // An unsigned generated document is never evidence of conclusion or signature.
  if (contract.concludedAt || contract.signedAt) issues.push('Un horodatage de signature/conclusion ne peut pas être établi par ce générateur.');
  for (const group of CONTRACT_FIELD_GROUPS) for (const [key, label] of group.fields) {
    if (!f[key]?.trim() || /à compléter|\?|à vérifier|à confirmer/i.test(f[key])) issues.push(`${label} : à compléter / vérifier.`);
  }
  const duration = ['presenceHours', 'distanceHours', 'practiceHours'].map(k => money(f[k] ?? ''));
  const total = money(f.totalHours ?? ''); const price = money(f.price ?? '');
  if (!Number.isFinite(total) || total <= 0 || duration.some(x => !Number.isFinite(x) || x < 0) || Math.abs(duration.reduce((a,b) => a+b,0) - total) > 0.001) issues.push('Répartition des heures incohérente ou double comptage.');
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(money(f.priceHT ?? '')) || money(f.priceHT ?? '') < 0) issues.push('Prix invalide.');
  const ht = money(f.priceHT ?? ''); const rate = money(f.vatRate ?? ''); const vat = money(f.vatAmount ?? '');
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(vat) || vat < 0 || Math.abs(ht * rate / 100 - vat) > 0.01 || Math.abs(ht + vat - price) > 0.01) issues.push('TVA, HT et total incohérents.');
  if (rate === 0 && !/article|art\.|293|261|exonération|exoneration/i.test(f.vat ?? '')) issues.push('TVA nulle : préciser le fondement exact de l’exonération.');
  if (!Number.isInteger(money(f.headcount ?? '')) || money(f.headcount ?? '') < 1) issues.push('Effectif prévu : entier positif requis.');
  if (!contract.activities.length || contract.activities.some(a => !a.title.trim() || !a.activities.trim() || !a.modality.trim() || !a.evaluation.trim() || !Number.isFinite(money(a.hours)) || money(a.hours) <= 0 || !Number.isFinite(money(a.value)) || money(a.value) < 0)) issues.push('Annexe 1 : activités, modalités, durées, suivi et valeurs à compléter.');
  if (Math.abs(contract.activities.reduce((s,a) => s + money(a.hours),0) - total) > 0.001) issues.push('Total des durées de l’annexe différent de la durée vendue.');
  if (Math.abs(contract.activities.reduce((s,a) => s + money(a.value),0) - price) > 0.01) issues.push('Total des valeurs de l’annexe différent du prix.');
  const payments = contract.payments;
  if (payments.length !== 4 || payments.some(p => !Number.isFinite(money(p.amount)) || money(p.amount) < 0 || !validDay(p.date) || !p.milestone.trim())) issues.push('Échéancier : quatre étapes, montants et dates vérifiés requis (0 € possible).');
  if (money(payments[0]?.amount ?? '') > price * 0.3 + 0.001) issues.push('Premier versement supérieur à 30 %.');
  if (payments.some(p => validDay(p.date) && p.date < earliestStart)) issues.push('Aucun versement pendant le délai de rétractation de 14 jours.');
  if (validDay(payments[0]?.date ?? '') && payments[0].date > f.end) issues.push('Premier versement postérieur à la fin de formation.');
  if (payments.some((p,i) => i > 0 && validDay(p.date) && (p.date < f.start || p.date > f.end || p.date < payments[i-1].date))) issues.push('Solde à échelonner pendant le déroulement et dans l’ordre des étapes.');
  if (payments[3]?.date !== f.end) issues.push('Le solde doit correspondre à l’achèvement de la formation.');
  if (Math.abs(payments.reduce((s,p) => s+money(p.amount),0) - price) > 0.01) issues.push('Total de l’échéancier différent du prix.');
  if (!contract.verified) issues.push('Confirmer les informations du centre, du parcours, les annexes et les pièces effectivement remises.');
  return { today, earliestStart, issues, ready: issues.length === 0, status: f.start && validDay(f.start) && f.start <= today ? 'BROUILLON — RÉGULARISATION' : 'BROUILLON' };
}
export function deliveredValue(value: number, actualHours: number, plannedHours: number): number {
  if (![value,actualHours,plannedHours].every(Number.isFinite) || value < 0 || actualHours < 0 || plannedHours <= 0 || actualHours > plannedHours) throw new Error('Prestations non justifiées');
  return value * actualHours / plannedHours;
}