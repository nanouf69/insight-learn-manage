/**
 * Orchestration serveur du mail unique « échec théorique + choix pratique » et de la signature.
 * Logique pure avec dépendances injectées (base, envoi, horloge) : testable sans réseau.
 * Aucune promesse « exactement une fois » côté fournisseur : un envoi dont l'issue est inconnue
 * passe en « indetermine » et n'est jamais réexpédié automatiquement.
 */
import {
  MODELE_CODE, MODELE_VERSION, MODELE_NOM, MODELE_FILE_PATH, CHOIX,
  texteFige, construireMailEchec, eligibiliteServeur,
} from "./modeleEchecChoixPratique.ts";
import { validerSignaturePng } from "./signaturePng.ts";

export interface ApprenantDb {
  id: string; nom: string | null; prenom: string | null; email: string | null;
  type_apprenant: string | null; resultat_examen: string | null; date_examen_theorique: string | null;
}
export interface DocDb {
  id: string; token: string; statut: string; apprenant_id: string | null; modele_code: string | null;
  modele_version: string | null; cle_envoi: string | null; texte_fige: string | null; texte_empreinte: string | null;
  identite_figee: { nom: string; prenom: string; email: string; filiere: string; type_apprenant: string | null; date_examen_theorique: string | null } | null;
  mail_objet_fige: string | null; mail_html_fige: string | null; envoi_etat: string | null;
  envoi_tente_le: string | null; envoye_le: string | null; envoi_erreur: string | null;
  destinataire_email: string | null; destinataire_nom: string | null;
  choix: string | null; signe_le_paris: string | null; signed_at: string | null; reponses: any;
}
export type ResultatEnvoiFournisseur =
  | { issue: "accepte" }
  | { issue: "refuse"; erreur: string }      // refus explicite du fournisseur : rien n'est parti
  | { issue: "inconnue"; erreur: string };   // timeout, réponse illisible, doublon signalé…

export interface Deps {
  now(): Date;
  sha256(t: string): Promise<string>;
  nouveauToken(): string;
  lienPublic(token: string): string;
  getApprenant(id: string): Promise<ApprenantDb | null>;
  findDoc(apprenantId: string, cle: string): Promise<DocDb | null>;
  getDocById(id: string): Promise<DocDb | null>;
  getDocByToken(token: string): Promise<DocDb | null>;
  /** INSERT … ON CONFLICT DO NOTHING ; renvoie null en cas de conflit. */
  insertDoc(row: Record<string, unknown>): Promise<DocDb | null>;
  /** UPDATE conditionnel atomique ; renvoie les lignes modifiées. */
  updateIf(id: string, patch: Record<string, unknown>, cond: { envoi_etat?: string; statutNot?: string }): Promise<{ rows: DocDb[]; error?: { code?: string; message: string } }>;
  envoyerMail(p: { to: string; subject: string; html: string; apprenantId: string }): Promise<ResultatEnvoiFournisseur>;
  log(msg: string, extra?: unknown): void;
}

const parisNow = (d: Date) =>
  d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "medium" }) + " (heure de Paris)";

/** Prépare (ou relit) le document et l'instantané exact du mail. Idempotent par élève + examen + version. */
export async function preparer(deps: Deps, apprenantId: string, adminId: string | null) {
  const a = await deps.getApprenant(apprenantId);
  if (!a) return { etat: "bloque" as const, raison: "Dossier introuvable." };
  const el = eligibiliteServeur(a);
  if (!el.ok) return { etat: "bloque" as const, raison: (el as { raison: string }).raison };
  const existant = await deps.findDoc(a.id, el.cle);
  if (existant) return { etat: "existant" as const, doc: existant };

  const token = deps.nouveauToken();
  const tf = JSON.stringify(texteFige(el.filiere));
  const email = a.email!.trim();
  const prenom = (a.prenom || "").trim(), nom = (a.nom || "").trim();
  const mail = construireMailEchec({ filiere: el.filiere, prenom, lien: deps.lienPublic(token) });
  const inserted = await deps.insertDoc({
    nom: `${MODELE_NOM} – ${nom} ${prenom}`.trim(),
    file_path: MODELE_FILE_PATH, champs: [],
    destinataire_nom: `${prenom} ${nom}`.trim(), destinataire_email: email,
    statut: "prepare", envoi_etat: "prepare",
    modele_code: MODELE_CODE, modele_version: MODELE_VERSION, cle_envoi: el.cle,
    texte_fige: tf, texte_empreinte: await deps.sha256(tf),
    identite_figee: { nom, prenom, email, filiere: el.filiere, type_apprenant: a.type_apprenant, date_examen_theorique: a.date_examen_theorique },
    mail_objet_fige: mail.subject, mail_html_fige: mail.html,
    apprenant_id: a.id, token, created_by: adminId,
  });
  if (inserted) return { etat: "prepare" as const, doc: inserted };
  // Conflit (2 onglets) : relire la réservation gagnante.
  const gagnant = await deps.findDoc(a.id, el.cle);
  if (gagnant) return { etat: "existant" as const, doc: gagnant };
  return { etat: "erreur" as const, raison: "Préparation impossible." };
}

/** Envoie l'instantané figé. Réservation atomique prepare → envoi_en_cours ; jamais de réexpédition automatique. */
export async function envoyer(deps: Deps, docId: string) {
  const doc = await deps.getDocById(docId);
  if (!doc || doc.modele_code !== MODELE_CODE) return { etat: "bloque" as const, raison: "Document introuvable." };
  if (doc.statut === "signe" || doc.envoye_le) return { etat: "deja_envoye" as const };
  if (doc.envoi_etat !== "prepare") return { etat: "non_disponible" as const, raison: `État d'envoi : ${doc.envoi_etat}` };
  if (!doc.mail_html_fige || !doc.mail_objet_fige || !doc.identite_figee) return { etat: "bloque" as const, raison: "Instantané du mail absent." };

  // Éligibilité revalidée en base au moment de l'envoi (pas depuis le navigateur).
  const a = doc.apprenant_id ? await deps.getApprenant(doc.apprenant_id) : null;
  const el = a ? eligibiliteServeur(a) : { ok: false as const, raison: "Dossier introuvable." };
  if (!el.ok) return { etat: "bloque" as const, raison: (el as { raison: string }).raison };
  if (el.cle !== doc.cle_envoi) return { etat: "bloque" as const, raison: "L'examen du dossier a changé depuis la préparation." };
  if ((a!.email || "").trim().toLowerCase() !== doc.identite_figee.email.toLowerCase())
    return { etat: "bloque" as const, raison: "L'adresse mail du dossier a changé depuis la préparation." };

  const tente = deps.now().toISOString();
  const claim = await deps.updateIf(doc.id, { envoi_etat: "envoi_en_cours", envoi_tente_le: tente, envoi_erreur: null }, { envoi_etat: "prepare" });
  if (claim.error || claim.rows.length !== 1) return { etat: "non_disponible" as const, raison: "Envoi déjà en cours ailleurs." };

  let r: ResultatEnvoiFournisseur;
  try {
    r = await deps.envoyerMail({ to: doc.identite_figee.email, subject: doc.mail_objet_fige, html: doc.mail_html_fige, apprenantId: doc.apprenant_id! });
  } catch (e) {
    r = { issue: "inconnue", erreur: e instanceof Error ? e.message : String(e) };
  }

  if (r.issue === "refuse") {
    const back = await deps.updateIf(doc.id, { envoi_etat: "prepare", envoi_erreur: r.erreur.slice(0, 500) }, { envoi_etat: "envoi_en_cours" });
    if (back.error) deps.log("[echec-choix] retour à prepare impossible", { id: doc.id, err: back.error.message });
    return { etat: "refuse" as const, raison: r.erreur };
  }
  if (r.issue === "inconnue") {
    const ind = await deps.updateIf(doc.id, { envoi_etat: "indetermine", envoi_erreur: r.erreur.slice(0, 500) }, { envoi_etat: "envoi_en_cours" });
    if (ind.error) deps.log("[echec-choix] marquage indéterminé impossible", { id: doc.id, err: ind.error.message });
    return { etat: "indetermine" as const, raison: r.erreur };
  }
  const envoye = deps.now().toISOString(); // date serveur de l'acceptation fournisseur (pas une preuve de réception)
  const fin = await deps.updateIf(doc.id, { envoi_etat: "envoye", statut: "envoye", envoye_le: envoye, sent_at: envoye }, { envoi_etat: "envoi_en_cours" });
  if (fin.error || fin.rows.length !== 1) {
    deps.log("[echec-choix] mail accepté mais enregistrement impossible : état indéterminé, aucune réexpédition", { id: doc.id, err: fin.error?.message });
    return { etat: "indetermine" as const, raison: "Mail accepté par le fournisseur mais date d'envoi non enregistrée." };
  }
  return { etat: "envoye" as const, envoye_le: envoye };
}

/** Lien exploitable dès qu'un envoi a été tenté (le mail a pu partir) ou après signature. */
export const lienActif = (d: DocDb) => d.statut === "signe" || !!d.envoye_le || !!d.envoi_tente_le;

export function vuePublique(d: DocDb) {
  let texte: unknown = null;
  try { texte = JSON.parse(d.texte_fige || "null"); } catch { texte = null; }
  const id = d.identite_figee;
  return {
    modele_code: d.modele_code, modele_version: d.modele_version, texte, statut: d.statut,
    nom_eleve: id?.nom ?? "", prenom_eleve: id?.prenom ?? "",
    choix: d.statut === "signe" ? d.choix : null,
    signature: d.statut === "signe" ? d.reponses?.signature ?? null : null,
    signe_le_paris: d.signe_le_paris, signed_at: d.signed_at, envoye_le: d.envoye_le,
    texte_empreinte: d.texte_empreinte,
  };
}

export async function soumettre(deps: Deps, token: string, choix: unknown, signature: unknown, userAgent: string) {
  const d = await deps.getDocByToken(token);
  if (!d || !d.modele_code || !lienActif(d)) return { status: 404, body: { error: "Document introuvable ou lien expiré" } };
  if (d.statut === "signe") return { status: 200, body: { success: true, deja_signe: true, signe_le_paris: d.signe_le_paris } };
  if (typeof choix !== "string" || !CHOIX.some((c) => c.code === choix)) return { status: 400, body: { error: "Merci de cocher une seule case." } };
  const sig = await validerSignaturePng(signature);
  if (!sig.ok) return { status: 400, body: { error: "Merci de signer dans le cadre prévu." } };
  if (!d.texte_fige || (await deps.sha256(d.texte_fige)) !== d.texte_empreinte || !d.identite_figee)
    return { status: 409, body: { error: "Document non conforme, contactez FTRANSPORT." } };
  const now = deps.now();
  const res = await deps.updateIf(d.id, {
    choix,
    reponses: { choix, signature, nom: d.identite_figee.nom, prenom: d.identite_figee.prenom, email: d.identite_figee.email, user_agent: userAgent.slice(0, 300) },
    statut: "signe", signed_at: now.toISOString(), signe_le_paris: parisNow(now),
  }, { statutNot: "signe" });
  if (res.error || res.rows.length === 0) {
    // Jamais conclure « déjà signé » sur une erreur : relire l'état réel.
    const relu = await deps.getDocByToken(token);
    if (relu?.statut === "signe") return { status: 200, body: { success: true, deja_signe: true, signe_le_paris: relu.signe_le_paris } };
    deps.log("[echec-choix] signature non enregistrée", { id: d.id, err: res.error?.message });
    return { status: 500, body: { error: "Signature non enregistrée, merci de réessayer." } };
  }
  return { status: 200, body: { success: true, signe_le_paris: res.rows[0].signe_le_paris } };
}
