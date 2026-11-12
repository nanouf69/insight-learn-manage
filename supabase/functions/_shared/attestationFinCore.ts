/**
 * Circuit serveur de l'attestation de fin de formation (dépendances injectées, testable sans réseau).
 * Stockage : documents_a_signer (modèle figé, déclencheur d'immuabilité existant) + audit_journal (append-only).
 * Éligibilité recontrôlée côté serveur (modules via etat_completion_modules, date de fin via apprenant_connexions).
 * Jamais de signature fabriquée : centre = image existante autorisée explicitement ; apprenant = tracé PNG validé.
 */
import {
  MODELE_CODE_ATTESTATION, VERSION_MODELE, CLE_ENVOI_ATTESTATION, FICHIER_MODELE_ATTESTATION, SIGNATURE_CENTRE_CHEMIN,
  CONSENTEMENT_APPRENANT, estElearning, eligibiliteAttestation, libelleMotif, dateFinDepuisConnexions,
  derniereValidationModules, champsManquants, texteAttestation, referenceAttestation, dateParis,
  type TexteFigeAttestation,
} from "./modeleAttestationFin.ts";
import { validerSignaturePng } from "./signaturePng.ts";

export interface ApprenantAtt {
  id: string; nom: string | null; prenom: string | null; email: string | null; type_apprenant: string | null;
  formation_choisie: string | null; modules_autorises: number[] | null; date_debut_formation: string | null;
  heures_totales: number | null; emails_bloques: boolean | null;
  date_debut_cours_en_ligne?: string | null; heures_elearning?: number | null;
  date_fin_cours_en_ligne?: string | null; date_fin_formation?: string | null;
}
export interface EtatModuleSrv { module_id: number; status_effectif: string | null; preuve_complete: boolean | null; completed_at: string | null }
export interface DocAtt {
  id: string; token: string; statut: string; apprenant_id: string | null; modele_code: string | null; modele_version: string | null;
  texte_fige: string | null; texte_empreinte: string | null; identite_figee: any; mail_objet_fige: string | null; mail_html_fige: string | null;
  envoi_etat: string | null; envoi_tente_le: string | null; envoye_le: string | null; envoi_erreur: string | null;
  signe_le_paris: string | null; signed_at: string | null; reponses: any; created_at?: string;
}
export type IssueEnvoi = { issue: "accepte" } | { issue: "refuse"; erreur: string } | { issue: "inconnue"; erreur: string };
export interface DepsAtt {
  now(): Date;
  sha256(t: string): Promise<string>;
  nouveauToken(): string;
  lienPublic(token: string): string;
  getApprenant(id: string): Promise<ApprenantAtt | null>;
  etatModules(id: string): Promise<EtatModuleSrv[]>;
  connexions(id: string): Promise<{ id: string; started_at: string | null }[]>;
  signatureCentreDisponible(): Promise<boolean>;
  findDocs(apprenantId: string): Promise<DocAtt[]>;
  getDocById(id: string): Promise<DocAtt | null>;
  getDocByToken(token: string): Promise<DocAtt | null>;
  insertDoc(row: Record<string, unknown>): Promise<DocAtt | null>;
  updateIf(id: string, patch: Record<string, unknown>, cond: { envoi_etat?: string; statutNot?: string }): Promise<{ rows: DocAtt[]; error?: { message: string } }>;
  envoyerMail(p: { to: string; subject: string; html: string; apprenantId: string }): Promise<IssueEnvoi>;
  journal(e: { operation: string; docId: string | null; apprenantId: string; auteur: string | null; apres: unknown }): Promise<boolean>;
  log(msg: string, extra?: unknown): void;
}
export interface EntreePreparer {
  apprenantId: string; adminId: string; representant: unknown; autoriseSignatureCentre: unknown;
  heures: { faites: unknown; minimum: unknown } | null; signaturesPresentiel: { signees: unknown; attendues: unknown } | null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const parisNow = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "medium" }) + " (heure de Paris)";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Champs du dossier uniquement : début de formation, sinon début d'accès e-learning ; durée totale, sinon durée e-learning. */
export const debutFormation = (a: ApprenantAtt, elearning: boolean) => a.date_debut_formation || (elearning ? a.date_debut_cours_en_ligne ?? null : null);
export const finFormationCrm = (a: ApprenantAtt, elearning: boolean) =>
  elearning ? a.date_fin_cours_en_ligne || a.date_fin_formation || null : a.date_fin_formation || null;
export const dureeFormation = (a: ApprenantAtt, elearning: boolean) => {
  const t = Number(a.heures_totales); if (a.heures_totales != null && Number.isFinite(t) && t > 0) return t;
  const e = Number(a.heures_elearning); return elearning && a.heures_elearning != null && Number.isFinite(e) && e > 0 ? e : null;
};

/** Document actif = non révoqué ; un document existant n'est jamais remplacé (pas de doublon, pas de fusion). */
const actif = (d: DocAtt) => d.statut !== "revoque";

export async function preparer(deps: DepsAtt, e: EntreePreparer) {
  const bloque = (raisons: string[]) => ({ etat: "bloque" as const, raisons });
  const a = await deps.getApprenant(e.apprenantId);
  if (!a) return bloque(["Dossier introuvable."]);
  const existants = (await deps.findDocs(a.id)).filter(actif);
  if (existants.length) return { etat: "existant" as const, doc: existants[0] };

  const representant = typeof e.representant === "string" ? e.representant.trim() : "";
  if (representant.length < 3 || representant.length > 120) return bloque(["Nom du représentant du centre (signataire) obligatoire."]);
  if (e.autoriseSignatureCentre !== true) return bloque(["Autorisation explicite d'apposer la signature du centre requise."]);
  if (!(await deps.signatureCentreDisponible())) return bloque(["Signature du centre introuvable dans les documents privés : aucune signature n'est fabriquée."]);

  const elearning = estElearning(a.type_apprenant) || estElearning(a.formation_choisie);
  const ids = [...new Set((a.modules_autorises ?? []).map(Number).filter(Number.isFinite))];
  let etats: EtatModuleSrv[];
  let cnx: { id: string; started_at: string | null }[] | null;
  // Modules lus pour la piste d'audit uniquement (non bloquants depuis le 12/11/2026).
  try { etats = await deps.etatModules(a.id); } catch { etats = []; }
  try { cnx = await deps.connexions(a.id); } catch { cnx = null; }
  const parId = new Map(etats.map((x) => [Number(x.module_id), x]));
  const heures = elearning ? { faites: num(e.heures?.faites), minimum: num(e.heures?.minimum) } : null;
  const pres = !elearning ? { signees: num(e.signaturesPresentiel?.signees), attendues: num(e.signaturesPresentiel?.attendues) } : null;
  const elig = eligibiliteAttestation({ elearning: heures, presentiel: pres });
  const derniereValidation = derniereValidationModules(ids, (id) => parId.get(id)?.completed_at);
  const dateDebut = debutFormation(a, elearning);
  const fin = dateFinDepuisConnexions({ connexions: cnx, dateDebut, dateLimiteCrm: finFormationCrm(a, elearning), derniereValidation });
  const raisons = elig.motifs.map(libelleMotif);
  if (fin.etat !== "ok") raisons.push(fin.raison);
  if (raisons.length) return bloque(raisons);
  if (fin.etat !== "ok") return bloque(["Date de fin indisponible."]);

  const now = deps.now();
  const dateEmission = dateParis(now.getTime());
  const champs = {
    representant, nom: a.nom, prenom: a.prenom, formation: a.formation_choisie ?? a.type_apprenant,
    modalite: elearning ? "e-learning" : "présentiel", dateDebut, dateFin: fin.date,
    dureeHeures: dureeFormation(a, elearning), dateEmission,
  };
  const manquants = champsManquants(champs);
  if (manquants.length) return bloque([`Champs du dossier à compléter : ${manquants.join(", ")}`]);
  const email = (a.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bloque(["Adresse e-mail de l'apprenant absente ou invalide."]);

  const contenu: TexteFigeAttestation = {
    version: VERSION_MODELE, lignes: texteAttestation(champs)!,
    modules: ids.map((id) => { const m = parId.get(id); return { id, statut: m?.status_effectif ?? null, preuve_complete: m?.preuve_complete ?? null, completed_at: m?.completed_at ?? null }; }),
    sources: {
      date_fin: { connexion_id: fin.connexionId, started_at: fin.startedAt, source: fin.source, date_limite_crm: fin.dateLimiteCrm },
      derniere_validation: derniereValidation,
      heures: heures && heures.faites !== null && heures.minimum !== null
        ? { faites: heures.faites, minimum: heures.minimum, source: "Heures e-learning enregistrées (calcul CRM), non bloquantes" } : null,
      signatures_presentiel: pres ? { signees: pres.signees!, attendues: pres.attendues!, source: "Émargements comptés au moment de la préparation" } : null,
    },
    signature_centre: { representant, autorise_par: e.adminId, autorise_le: now.toISOString(), image: SIGNATURE_CENTRE_CHEMIN },
    date_emission: dateEmission,
  };
  const texte = JSON.stringify(contenu);
  const empreinte = await deps.sha256(texte);
  const reference = referenceAttestation(empreinte, dateEmission);
  const token = deps.nouveauToken();
  const prenom = (a.prenom || "").trim(), nom = (a.nom || "").trim();
  const lien = deps.lienPublic(token);
  const objet = "Votre attestation de fin de formation à signer — FTRANSPORT";
  const html = `<p>Bonjour ${esc(prenom)},</p><p>Votre attestation de fin de formation (référence ${esc(reference)}) est prête. Merci de la lire puis de la signer électroniquement en cliquant sur le lien ci-dessous :</p><p><a href="${lien}">Lire et signer mon attestation</a></p><p>Le document signé sera ensuite téléchargeable depuis ce même lien.</p>`;
  const inserted = await deps.insertDoc({
    nom: `Attestation de fin de formation – ${nom} ${prenom}`.trim(), file_path: FICHIER_MODELE_ATTESTATION, champs: [],
    destinataire_nom: `${prenom} ${nom}`.trim(), destinataire_email: email, statut: "prepare", envoi_etat: "prepare",
    modele_code: MODELE_CODE_ATTESTATION, modele_version: VERSION_MODELE, cle_envoi: CLE_ENVOI_ATTESTATION,
    texte_fige: texte, texte_empreinte: empreinte,
    identite_figee: { nom, prenom, email, formation: champs.formation, reference, representant },
    mail_objet_fige: objet, mail_html_fige: html, apprenant_id: a.id, token, created_by: e.adminId,
  });
  if (!inserted) {
    const gagnant = (await deps.findDocs(a.id)).filter(actif)[0];
    return gagnant ? { etat: "existant" as const, doc: gagnant } : { etat: "erreur" as const, raisons: ["Enregistrement impossible."] };
  }
  await deps.journal({ operation: "attestation_fin_formation.preparee", docId: inserted.id, apprenantId: a.id, auteur: e.adminId,
    apres: { reference, empreinte, version: VERSION_MODELE, signature_centre: contenu.signature_centre, sources: contenu.sources } });
  return { etat: "prepare" as const, doc: inserted };
}

/** Envoi du lien de signature : validation admin explicite, réservation atomique, jamais de réexpédition automatique. */
export async function envoyer(deps: DepsAtt, docId: string, adminId: string) {
  const d = await deps.getDocById(docId);
  if (!d || d.modele_code !== MODELE_CODE_ATTESTATION || !d.apprenant_id) return { etat: "bloque" as const, raison: "Attestation introuvable." };
  if (d.statut === "signe" || d.envoye_le) return { etat: "deja_envoye" as const };
  if (d.envoi_etat !== "prepare") return { etat: "non_disponible" as const, raison: d.envoi_etat === "indetermine" ? "Envoi précédent à l'issue inconnue : vérifier la boîte d'envoi avant toute nouvelle action." : "Envoi déjà en cours." };
  if (!d.texte_fige || (await deps.sha256(d.texte_fige)) !== d.texte_empreinte || !d.mail_html_fige || !d.mail_objet_fige || !d.identite_figee?.email)
    return { etat: "bloque" as const, raison: "Attestation non conforme à son empreinte : envoi refusé." };
  const a = await deps.getApprenant(d.apprenant_id);
  if (!a) return { etat: "bloque" as const, raison: "Dossier introuvable." };
  if (a.emails_bloques) return { etat: "bloque" as const, raison: "Les e-mails sont bloqués pour ce dossier." };
  const limite = finFormationCrm(a, estElearning(a.type_apprenant) || estElearning(a.formation_choisie));
  let contenu: TexteFigeAttestation | null = null;
  try { contenu = JSON.parse(d.texte_fige); } catch { /* Refus ci-dessous. */ }
  const dateSource = contenu?.sources?.date_fin;
  const dateDocument = dateSource?.started_at ? dateParis(Date.parse(dateSource.started_at)) : null;
  const dateFigee = dateDocument && dateSource?.date_limite_crm && dateSource.date_limite_crm < dateDocument ? dateSource.date_limite_crm : dateDocument;
  if (!limite || !/^\d{4}-\d{2}-\d{2}$/.test(limite.slice(0, 10)) || !dateFigee || dateFigee > limite.slice(0, 10))
    return { etat: "bloque" as const, raison: "La date figée de l'attestation dépasse la fin CRM ou ne peut pas être vérifiée : envoi refusé, document conservé." };
  if ((a.email || "").trim().toLowerCase() !== String(d.identite_figee.email).toLowerCase()) return { etat: "bloque" as const, raison: "L'adresse e-mail du dossier a changé depuis la préparation." };
  const claim = await deps.updateIf(d.id, { envoi_etat: "envoi_en_cours", envoi_tente_le: deps.now().toISOString(), envoi_erreur: null }, { envoi_etat: "prepare" });
  if (claim.error || claim.rows.length !== 1) return { etat: "non_disponible" as const, raison: "Envoi déjà en cours ailleurs." };
  let r: IssueEnvoi;
  try { r = await deps.envoyerMail({ to: d.identite_figee.email, subject: d.mail_objet_fige, html: d.mail_html_fige, apprenantId: a.id }); }
  catch (err) { r = { issue: "inconnue", erreur: err instanceof Error ? err.message : String(err) }; }
  if (r.issue === "refuse") {
    await deps.updateIf(d.id, { envoi_etat: "prepare", envoi_erreur: r.erreur.slice(0, 500) }, { envoi_etat: "envoi_en_cours" });
    await deps.journal({ operation: "attestation_fin_formation.envoi_refuse", docId: d.id, apprenantId: a.id, auteur: adminId, apres: { erreur: r.erreur.slice(0, 500) } });
    return { etat: "refuse" as const, raison: r.erreur };
  }
  if (r.issue === "inconnue") {
    await deps.updateIf(d.id, { envoi_etat: "indetermine", envoi_erreur: r.erreur.slice(0, 500) }, { envoi_etat: "envoi_en_cours" });
    await deps.journal({ operation: "attestation_fin_formation.envoi_indetermine", docId: d.id, apprenantId: a.id, auteur: adminId, apres: { erreur: r.erreur.slice(0, 500) } });
    return { etat: "indetermine" as const, raison: r.erreur };
  }
  const envoye = deps.now().toISOString();
  const fin = await deps.updateIf(d.id, { envoi_etat: "envoye", statut: "envoye", envoye_le: envoye, sent_at: envoye }, { envoi_etat: "envoi_en_cours" });
  await deps.journal({ operation: "attestation_fin_formation.envoyee", docId: d.id, apprenantId: a.id, auteur: adminId, apres: { envoye_le: envoye, enregistre: !fin.error && fin.rows.length === 1 } });
  if (fin.error || fin.rows.length !== 1) return { etat: "indetermine" as const, raison: "Mail accepté mais date d'envoi non enregistrée." };
  return { etat: "envoye" as const, envoye_le: envoye };
}

export const lienActifAttestation = (d: DocAtt) => d.statut === "signe" || !!d.envoye_le || !!d.envoi_tente_le;

export function vuePubliqueAttestation(d: DocAtt, signatureCentreImage: string | null) {
  let contenu: TexteFigeAttestation | null = null;
  try { contenu = JSON.parse(d.texte_fige || "null"); } catch { contenu = null; }
  const signe = d.statut === "signe";
  return {
    modele_code: d.modele_code, modele_version: d.modele_version, statut: d.statut,
    lignes: contenu?.lignes ?? [], modules: contenu?.modules ?? [], reference: d.identite_figee?.reference ?? null,
    representant: contenu?.signature_centre?.representant ?? null, signature_centre_le: contenu?.signature_centre?.autorise_le ?? null,
    signature_centre_image: signe ? signatureCentreImage : null,
    texte_empreinte: d.texte_empreinte, nom_eleve: d.identite_figee?.nom ?? "", prenom_eleve: d.identite_figee?.prenom ?? "",
    signature: signe ? d.reponses?.signature ?? null : null, signe_le_paris: d.signe_le_paris, signed_at: d.signed_at,
    consentement: CONSENTEMENT_APPRENANT,
  };
}

export async function signerApprenant(deps: DepsAtt, token: string, p: { signature: unknown; consentement: unknown; empreinteVue: unknown; userAgent: string }) {
  const d = await deps.getDocByToken(token);
  if (!d || d.modele_code !== MODELE_CODE_ATTESTATION || !lienActifAttestation(d)) return { status: 404, body: { error: "Document introuvable ou lien expiré" } };
  if (d.statut === "signe") return { status: 200, body: { success: true, deja_signe: true, signe_le_paris: d.signe_le_paris } };
  if (p.consentement !== true) return { status: 400, body: { error: "Merci de cocher la case de confirmation." } };
  if (!d.texte_fige || (await deps.sha256(d.texte_fige)) !== d.texte_empreinte || !d.identite_figee) return { status: 409, body: { error: "Document non conforme, contactez FTRANSPORT." } };
  if (p.empreinteVue !== d.texte_empreinte) return { status: 409, body: { error: "Le document a changé depuis son affichage : rechargez la page avant de signer." } };
  const sig = await validerSignaturePng(p.signature);
  if (!sig.ok) return { status: 400, body: { error: "Merci de signer dans le cadre prévu." } };
  const now = deps.now();
  const res = await deps.updateIf(d.id, {
    reponses: { signature: p.signature, consentement: CONSENTEMENT_APPRENANT, empreinte_signee: d.texte_empreinte, nom: d.identite_figee.nom, prenom: d.identite_figee.prenom, email: d.identite_figee.email, user_agent: p.userAgent.slice(0, 300) },
    statut: "signe", signed_at: now.toISOString(), signe_le_paris: parisNow(now),
  }, { statutNot: "signe" });
  if (res.error || res.rows.length === 0) {
    const relu = await deps.getDocByToken(token);
    if (relu?.statut === "signe") return { status: 200, body: { success: true, deja_signe: true, signe_le_paris: relu.signe_le_paris } };
    deps.log("[attestation-fin] signature non enregistrée", { id: d.id, err: res.error?.message });
    return { status: 500, body: { error: "Signature non enregistrée, merci de réessayer." } };
  }
  await deps.journal({ operation: "attestation_fin_formation.signee_apprenant", docId: d.id, apprenantId: d.apprenant_id!, auteur: null,
    apres: { signed_at: now.toISOString(), empreinte_signee: d.texte_empreinte, user_agent: p.userAgent.slice(0, 300) } });
  return { status: 200, body: { success: true, signe_le_paris: res.rows[0].signe_le_paris } };
}
