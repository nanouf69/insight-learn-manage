/**
 * Attestation de fin de formation VALIDÉE — règles pures partagées navigateur / serveur.
 * Aucun champ manquant n'est inventé ; aucun pourcentage affiché n'est utilisé comme preuve.
 */
export const ORGANISME = { raisonSociale: "Ftransport", adresse: "86 Route de Genas 69003 Lyon", nda: "11770762377", ville: "Lyon" } as const;
export const VERSION_MODELE = "attestation-fin-validee-v1";
export const MODELE_CODE_ATTESTATION = "attestation_fin_formation";
export const CLE_ENVOI_ATTESTATION = "fin-formation";
export const FICHIER_MODELE_ATTESTATION = "modeles/attestation_fin_formation";
/** Image de signature du centre déjà enregistrée (stockage privé admin) ; jamais générée. */
export const SIGNATURE_CENTRE_CHEMIN = "admin-elements/2026-10-26-naoufal-signature.png";
export const CONSENTEMENT_APPRENANT =
  "Je confirme avoir lu cette attestation et la signer électroniquement. Ma signature, la date et l'heure sont enregistrées.";

export const estElearning = (type?: string | null) => {
  const t = (type || "").toLowerCase().trim();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /(^|[\s-])[a-z]{2,4}-e($|-)/.test(t) || t.endsWith("-e");
};

// ---------------------------------------------------------------- éligibilité
export interface ModulePreuve { id: number; nom: string; statutEffectif: string | null; preuveComplete: boolean | null }
export interface HeuresPreuve { faites: number | null; minimum: number | null }
export interface EntreeEligibilite {
  modulesAttribues: number[] | null;
  modules: ModulePreuve[] | null;
  elearning: HeuresPreuve | null;
  presentiel: { signees: number | null; attendues: number | null } | null;
  lectureErreur?: string | null;
}
export type MotifBlocage =
  | { code: "lecture"; detail: string }
  | { code: "modules_absents" }
  | { code: "module_non_valide"; id: number; nom: string }
  | { code: "module_sans_verdict"; id: number }
  | { code: "heures_indisponibles"; volet: "elearning" | "presentiel" }
  | { code: "heures_insuffisantes"; faites: number; minimum: number }
  | { code: "signatures_manquantes"; signees: number; attendues: number };
export interface Eligibilite { eligible: boolean; motifs: MotifBlocage[] }
const fini = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function eligibiliteAttestation(e: EntreeEligibilite): Eligibilite {
  const motifs: MotifBlocage[] = [];
  if (e.lectureErreur) return { eligible: false, motifs: [{ code: "lecture", detail: e.lectureErreur }] };
  const ids = [...new Set((e.modulesAttribues ?? []).map(Number).filter(Number.isFinite))];
  if (!ids.length || !e.modules) motifs.push({ code: "modules_absents" });
  else for (const id of ids) {
    const m = e.modules.find(x => Number(x.id) === id);
    if (!m || m.statutEffectif == null || m.preuveComplete == null) motifs.push({ code: "module_sans_verdict", id });
    else if (m.statutEffectif !== "completed" || m.preuveComplete !== true) motifs.push({ code: "module_non_valide", id, nom: m.nom });
  }
  if (e.elearning) {
    const { faites, minimum } = e.elearning;
    if (!fini(faites) || !fini(minimum) || minimum <= 0) motifs.push({ code: "heures_indisponibles", volet: "elearning" });
    else if (faites < minimum) motifs.push({ code: "heures_insuffisantes", faites, minimum });
  }
  if (e.presentiel) {
    const { signees, attendues } = e.presentiel;
    if (!fini(signees) || !fini(attendues) || attendues <= 0) motifs.push({ code: "heures_indisponibles", volet: "presentiel" });
    else if (signees < attendues) motifs.push({ code: "signatures_manquantes", signees, attendues });
  }
  return { eligible: motifs.length === 0, motifs };
}

export const heuresTexte = (n: number) => {
  const tot = Math.round(n * 60);
  return `${Math.floor(tot / 60)}h${String(tot % 60).padStart(2, "0")}`;
};
export function libelleMotif(m: MotifBlocage): string {
  switch (m.code) {
    case "lecture": return `Lecture impossible : ${m.detail}`;
    case "modules_absents": return "Aucun module attribué lisible";
    case "module_non_valide": return `Module ${m.id}${m.nom ? ` ${m.nom}` : ""} non validé`;
    case "module_sans_verdict": return `Module ${m.id} : aucune preuve de validation enregistrée`;
    case "heures_indisponibles": return `Heures ${m.volet === "elearning" ? "e-learning" : "présentiel"} indisponibles`;
    case "heures_insuffisantes": return `Heures e-learning insuffisantes : ${heuresTexte(m.faites)} / ${heuresTexte(m.minimum)}`;
    case "signatures_manquantes": return `Signatures manquantes : ${m.signees} / ${m.attendues}`;
  }
}

// ---------------------------------------------------------------- date de fin
export interface ConnexionLite { id: string; started_at: string | null; last_seen_at?: string | null }
export type DateFin =
  | { etat: "ok"; date: string; connexionId: string; startedAt: string; source: string }
  | { etat: "bloquee"; raison: string };
export const dateParis = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

/** Date de fin = dernière connexion e-learning réelle, jamais inventée ; incohérence = contrôle humain. */
export function dateFinDepuisConnexions(args: { connexions: ConnexionLite[] | null; dateDebut: string | null; derniereValidation: string | null }): DateFin {
  const { connexions, dateDebut, derniereValidation } = args;
  if (!connexions) return { etat: "bloquee", raison: "Historique des connexions illisible" };
  const valides = connexions.filter(c => c.started_at && Number.isFinite(Date.parse(c.started_at)));
  if (!valides.length) return { etat: "bloquee", raison: "Aucune connexion enregistrée : date de fin indisponible" };
  const der = valides.reduce((a, b) => (Date.parse(b.started_at!) > Date.parse(a.started_at!) ? b : a));
  const startedAt = der.started_at!;
  const ms = Date.parse(startedAt);
  const date = dateParis(ms);
  if (dateDebut && date < dateDebut.slice(0, 10)) return { etat: "bloquee", raison: `Dernière connexion (${date}) antérieure au début de formation : contrôle humain requis` };
  if (!derniereValidation || !Number.isFinite(Date.parse(derniereValidation))) return { etat: "bloquee", raison: "Date de validation finale des modules indisponible : contrôle humain requis" };
  if (ms < Date.parse(derniereValidation)) return { etat: "bloquee", raison: "Dernière connexion antérieure à la validation finale des modules : contrôle humain requis" };
  return { etat: "ok", date, connexionId: der.id, startedAt, source: "Dernière connexion e-learning enregistrée" };
}

/** Plus tardive date de validation des modules attribués ; null si une seule manque. */
export function derniereValidationModules(ids: number[], completedAt: (id: number) => string | null | undefined): string | null {
  let max: string | null = null;
  for (const id of ids) {
    const c = completedAt(id);
    if (!c || !Number.isFinite(Date.parse(c))) return null;
    if (!max || Date.parse(c) > Date.parse(max)) max = c;
  }
  return max;
}

// ---------------------------------------------------------------- texte
export interface ChampsAttestation {
  representant: string | null; nom: string | null; prenom: string | null; formation: string | null;
  modalite: string | null; dateDebut: string | null; dateFin: string | null; dureeHeures: number | null; dateEmission: string;
}
export const dateFr = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
export function champsManquants(c: ChampsAttestation): string[] {
  const m: string[] = [];
  if (!c.representant?.trim()) m.push("représentant du centre");
  if (!c.nom?.trim() || !c.prenom?.trim()) m.push("nom et prénom");
  if (!c.formation?.trim()) m.push("intitulé de formation");
  if (!c.modalite?.trim()) m.push("modalité");
  if (!c.dateDebut || !c.dateFin) m.push("dates de formation");
  else if (c.dateDebut.slice(0, 10) > c.dateFin.slice(0, 10)) m.push("dates incohérentes");
  if (typeof c.dureeHeures !== "number" || !(c.dureeHeures > 0)) m.push("durée");
  return m;
}
/** Texte attestant l'achèvement : à n'utiliser QUE pour un parcours éligible. */
export function texteAttestation(c: ChampsAttestation): string[] | null {
  if (champsManquants(c).length) return null;
  return [
    "ATTESTATION DE FIN DE FORMATION",
    `Organisme : ${ORGANISME.raisonSociale} — ${ORGANISME.adresse} — N° de déclaration d'activité : ${ORGANISME.nda}`,
    `Je soussigné(e) ${c.representant!.trim()}, atteste que ${c.prenom!.trim()} ${String(c.nom).trim().toUpperCase()}, inscrit(e) à la formation ${c.formation!.trim()}, en modalité ${c.modalite}, du ${dateFr(c.dateDebut!)} au ${dateFr(c.dateFin!)}, d'une durée de ${c.dureeHeures} heures, a suivi et achevé l'ensemble des modules obligatoires prévus dans son parcours.`,
    "Après vérification des éléments de suivi pédagogique : réalisation de tous les modules obligatoires, validation de tous les jalons requis, enregistrement des activités et évaluations obligatoires, achèvement conforme aux règles.",
    "Statut : FORMATION TERMINÉE ET VALIDÉE.",
    "Cette attestation ne vaut pas réussite à l'examen professionnel.",
    `Fait à ${ORGANISME.ville}, le ${dateFr(c.dateEmission)}.`,
  ];
}
export const referenceAttestation = (empreinte: string, dateEmission: string) =>
  `AFF-${dateEmission.slice(0, 10).replace(/-/g, "")}-${empreinte.slice(0, 10).toUpperCase()}`;

export interface ModuleFige { id: number; statut: string | null; preuve_complete: boolean | null; completed_at: string | null }
/** Contenu figé signé : texte exact + preuves + sources (piste d'audit). */
export interface TexteFigeAttestation {
  version: string; lignes: string[]; modules: ModuleFige[];
  sources: {
    date_fin: { connexion_id: string; started_at: string; source: string };
    derniere_validation: string;
    heures: { faites: number; minimum: number; source: string } | null;
    signatures_presentiel: { signees: number; attendues: number; source: string } | null;
  };
  signature_centre: { representant: string; autorise_par: string; autorise_le: string; image: string };
  date_emission: string;
}
