/** Convocations only. Pure simulation; server-owned evidence is mandatory before sending. */
export type SessionFcConvocation = { id: string; nom: string; date_debut: string | null; date_fin: string | null; lieu: string | null; heure_debut: string | null; heure_fin: string | null; statut?: string | null };
export type InscriptionFcConvocation = { id: string; apprenant_id: string; session_id: string; liste_attente: boolean | null; montant_total: number | null; date_debut?: string | null; date_fin?: string | null; date_fin_personnalisee?: string | null; heure_debut_personnalisee?: string | null; heure_fin_personnalisee?: string | null };
export type StagiaireFcConvocation = { id: string; nom: string; prenom: string; email: string | null; emails_bloques?: boolean | null; deleted_at?: string | null; abandonnee?: boolean | null; civilite?: string | null; adresse?: string | null; code_postal?: string | null; ville?: string | null };
export type VirementFcConvocation = { id: string; banque: string; reference: string | null; montant: number; date_operation: string; statut: string; categorie: string | null; libelle: string; created_at?: string };
export type PreuveRapprochementFc = { transaction_id: string; inscription_id: string; confirme_par: string; piece_reference: string };
export type ExigibleFc = { inscription_id: string; montant: number; reference_contrat: string; confirme_par: string };
export type SimulationFc = { statut: 'eligible' | 'a_revoir' | 'exclu'; motif: string; totalCentimes: number; exigibleCentimes: number | null; cle: string };
const cents = (n: number) => Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) : NaN;
const norm = (s: string) => s.trim().toLowerCase();
export function cleVirementFc(t: VirementFcConvocation): string | null {
  return t.banque.trim() && t.reference?.trim() ? `${norm(t.banque)}:${norm(t.reference)}` : null;
}
export function simulerConvocationFc(p: {
  session: SessionFcConvocation; inscription: InscriptionFcConvocation; stagiaire: StagiaireFcConvocation;
  virements: VirementFcConvocation[]; preuves: PreuveRapprochementFc[]; exigible?: ExigibleFc;
  depuis: string | null; aujourdHui: string; dejaEnvoyee?: boolean; historiquePossible?: boolean;
}): SimulationFc {
  const { session: s, inscription: i, stagiaire: a } = p;
  let totalCentimes = 0;
  const exigibleCentimes = p.exigible ? cents(p.exigible.montant) : null;
  const result = (statut: SimulationFc['statut'], motif: string): SimulationFc => ({ statut, motif, totalCentimes, exigibleCentimes, cle: `${a.id}:${s.id}` });
  if (i.apprenant_id !== a.id || i.session_id !== s.id) return result('a_revoir', 'Identité inscription incohérente');
  if (!/formation\s+continue.*\b(taxi|vtc)\b/i.test(s.nom)) return result('exclu', 'Session hors formation continue TAXI/VTC');
  if (i.liste_attente || a.deleted_at || a.abandonnee || s.statut === 'annulee') return result('exclu', 'Inscription en attente, annulée ou archivée');
  const debut = i.date_debut || s.date_debut;
  const fin = i.date_fin_personnalisee || i.date_fin || s.date_fin;
  const hd = i.heure_debut_personnalisee || s.heure_debut;
  const hf = i.heure_fin_personnalisee || s.heure_fin;
  if (!debut || !fin || fin < debut || !s.lieu?.trim() || !hd || !hf || hd >= hf) return result('a_revoir', 'Dates, lieu ou horaires incomplets');
  if (debut <= p.aujourdHui) return result('exclu', 'Session commencée ou passée');
  if (a.emails_bloques || !a.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return result('a_revoir', 'Destinataire indisponible ou bloqué');
  if (p.dejaEnvoyee) return result('exclu', 'Convocation déjà envoyée pour cette session');
  if (p.historiquePossible) return result('a_revoir', 'Ancienne convocation possible : vérifier l’historique');
  if (!p.depuis) return result('a_revoir', 'Activation non autorisée ; historique exclu');
  const preuves = p.preuves.filter(x => x.inscription_id === i.id && x.confirme_par && x.piece_reference.trim());
  const txs = p.virements.filter(t => preuves.some(x => x.transaction_id === t.id));
  if (!txs.length) return result('a_revoir', 'Aucun rapprochement paiement → stagiaire → session confirmé');
  const vus = new Set<string>();
  for (const t of txs) {
    if (p.preuves.some(x => x.transaction_id === t.id && x.inscription_id !== i.id)) return result('a_revoir', 'Paiement associé à plusieurs inscriptions');
    if (t.montant <= 0 || /rembours|refund|reversal/i.test(t.libelle)) return result('exclu', 'Remboursement : aucun envoi');
    // Bank dates have no reliable time: exclude the entire activation day, not only earlier imports.
    const activationJour = new Date(p.depuis).toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
    if (t.date_operation <= activationJour || (t.created_at && t.created_at < p.depuis)) continue;
    if (!Number.isFinite(cents(t.montant))) return result('a_revoir','Montant bancaire invalide');
    if (!['justifie','rapproche'].includes(t.statut) || t.categorie !== 'recette_formation') return result('a_revoir', 'Paiement bancaire non confirmé comme recette formation');
    const key = cleVirementFc(t);
    if (!key) return result('a_revoir', 'Référence bancaire stable manquante');
    const twins = p.virements.filter(x => cleVirementFc(x) === key);
    if (twins.some(x => cents(x.montant) !== cents(t.montant) || x.date_operation !== t.date_operation)) return result('a_revoir', 'Référence bancaire contradictoire');
    if (twins.some(x => p.preuves.some(z => z.transaction_id === x.id && z.inscription_id !== i.id))) return result('a_revoir', 'Même virement affecté à une autre session');
    if (!vus.has(key)) { totalCentimes += cents(t.montant); vus.add(key); }
  }
  if (!totalCentimes) return result('exclu', 'Paiements historiques : aucun envoi rétroactif');
  if (!p.exigible || p.exigible.inscription_id !== i.id || !p.exigible.confirme_par || !p.exigible.reference_contrat.trim() || exigibleCentimes === null || !Number.isFinite(exigibleCentimes) || exigibleCentimes <= 0 || !i.montant_total || exigibleCentimes > cents(i.montant_total)) return result('a_revoir', 'Montant exigible à justifier par le contrat ; aucun seuil inventé');
  if (totalCentimes < exigibleCentimes) return result('exclu', 'Acompte inférieur au montant contractuellement exigible');
  return result('eligible', 'Paiement confirmé, session identifiée et montant exigible atteint');
}

export type ModeleFc = { subject_template: string; body_template: string };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const dateFr = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'});
/** Keep the official instructions, replacing ONLY its existing date/time/address lines. */
export function rendreConvocationFc(m: ModeleFc, a: StagiaireFcConvocation, s: SessionFcConvocation, i: InscriptionFcConvocation, jour: string) {
  const debut = i.date_debut || s.date_debut, fin = i.date_fin_personnalisee || i.date_fin || s.date_fin;
  const hd = i.heure_debut_personnalisee || s.heure_debut, hf = i.heure_fin_personnalisee || s.heure_fin;
  if (!debut || !fin || fin < debut || !hd || !hf || hd >= hf || !s.lieu?.trim()) throw new Error('Session incomplète');
  const dates = `du ${dateFr(debut)} au ${dateFr(fin)}`;
  const vars: Record<string,string> = { civilite:a.civilite ?? '',prenom:a.prenom,nom:a.nom,adresse:a.adresse ?? '',code_postal:a.code_postal ?? '',ville:a.ville ?? '',date_jour:dateFr(jour),formation:s.nom,date_debut:dates,date_fin:dateFr(fin),horaires:`${hd}–${hf}`,lieu:s.lieu };
  const replace = (text: string, html: boolean) => text.replace(/{{\s*(\w+)\s*}}/g, (_,key: string) => {
    if (!(key in vars)) throw new Error(`Variable de modèle inconnue : ${key}`);
    return html ? esc(vars[key]) : vars[key];
  });
  if (!m.body_template || !m.subject_template) throw new Error('Modèle officiel absent');
  let html = replace(m.body_template,true);
  if (!/Horaires\s*:/i.test(html) || !/Adresse\s*:/i.test(html)) throw new Error('Modèle officiel modifié : horaires/lieu à vérifier');
  html = html.replace(/Horaires\s*:[\s\S]*?(?=<br\s*\/?\s*>)/i,`Horaires : ${esc(hd)}–${esc(hf)}`)
    .replace(/Adresse\s*:[\s\S]*?(?=<br\s*\/?\s*>)/i,`Adresse : ${esc(s.lieu)}`);
  return {subject:replace(m.subject_template,false),html};
}