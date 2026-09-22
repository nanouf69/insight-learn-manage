/**
 * ÉTAPE 4 — CONTRÔLES DE SANTÉ SÉPARÉS (préparation, TEST uniquement).
 *
 * Quatre familles indépendantes : application, base, authentification,
 * chaîne de sauvegarde. Chaque contrôle est une fonction PURE de décision :
 * elle reçoit le résultat brut d'une sonde et renvoie un verdict.
 *
 * Règle absolue : AUCUN contrôle n'écrit dans les données pédagogiques
 * réelles. La chaîne de sauvegarde n'est vérifiable que sur compte TEST.
 */

export type EtatSante = "ok" | "degrade" | "indisponible" | "non_execute";

export type ResultatSonde = {
  ok: boolean;
  /** Code HTTP éventuel (0 = pas de réponse). */
  status?: number;
  /** Durée observée en millisecondes. */
  latenceMs?: number;
  /** Erreur brute remontée par la sonde. */
  erreur?: string | null;
  timeout?: boolean;
};

export type VerdictSante = {
  cible: string;
  etat: EtatSante;
  detail: string;
  latenceMs?: number;
};

/** Seuil au-delà duquel un service répondant est jugé « dégradé ». */
export const SEUIL_LATENCE_DEGRADEE_MS = 2000;

function verdict(cible: string, sonde: ResultatSonde, seuilMs = SEUIL_LATENCE_DEGRADEE_MS): VerdictSante {
  if (sonde.timeout) return { cible, etat: "indisponible", detail: "délai dépassé", latenceMs: sonde.latenceMs };
  if (!sonde.ok) {
    const s = sonde.status ?? 0;
    return {
      cible,
      etat: "indisponible",
      detail: sonde.erreur || (s ? `réponse ${s}` : "aucune réponse"),
      latenceMs: sonde.latenceMs,
    };
  }
  if ((sonde.latenceMs ?? 0) > seuilMs) {
    return { cible, etat: "degrade", detail: `lenteur anormale (${sonde.latenceMs} ms)`, latenceMs: sonde.latenceMs };
  }
  return { cible, etat: "ok", detail: "réponse normale", latenceMs: sonde.latenceMs };
}

// --- 1. APPLICATION -------------------------------------------------------
export const checkFrontend = (s: ResultatSonde) => verdict("application.frontend", s);
export const checkBackend = (s: ResultatSonde) => verdict("application.backend", s);

// --- 2. BASE --------------------------------------------------------------
export const checkDbConnexion = (s: ResultatSonde) => verdict("base.connexion", s);
export const checkDbLectureLegere = (s: ResultatSonde) => verdict("base.lecture", s);
/** Écriture contrôlée : uniquement sur une ligne technique de test. */
export function checkDbEcritureTest(s: ResultatSonde, cibleTest: boolean): VerdictSante {
  if (!cibleTest) {
    return { cible: "base.ecriture_test", etat: "non_execute", detail: "refusé : cible non TEST, aucune écriture" };
  }
  return verdict("base.ecriture_test", s);
}

// --- 3. AUTHENTIFICATION --------------------------------------------------
export type ResultatAuth = ResultatSonde & { codeAuth?: string };

/**
 * Distingue un service d'authentification en panne d'identifiants réellement
 * incorrects. Un refus d'identifiants prouve au contraire que le service
 * fonctionne.
 */
export function checkAuth(s: ResultatAuth): VerdictSante {
  const code = (s.codeAuth ?? "").toLowerCase();
  if (code === "invalid_credentials" || code === "invalid_grant") {
    return { cible: "auth.service", etat: "ok", detail: "service joignable (identifiants refusés)", latenceMs: s.latenceMs };
  }
  return verdict("auth.service", s);
}

// --- 4. CHAÎNE DE SAUVEGARDE (compte TEST uniquement) ---------------------
export type EtapesChaineSauvegarde = {
  compteTest: boolean;
  ecriture: ResultatSonde;
  ack: ResultatSonde;
  relecture: ResultatSonde & { valeurIdentique?: boolean };
};

export function checkChaineSauvegarde(e: EtapesChaineSauvegarde): VerdictSante {
  const cible = "sauvegarde.chaine_test";
  if (!e.compteTest) {
    return { cible, etat: "non_execute", detail: "refusé : compte non TEST, aucune écriture" };
  }
  if (!e.ecriture.ok) return { cible, etat: "indisponible", detail: "écriture impossible" };
  if (!e.ack.ok) return { cible, etat: "indisponible", detail: "aucune confirmation du serveur" };
  if (!e.relecture.ok) return { cible, etat: "indisponible", detail: "relecture impossible" };
  if (e.relecture.valeurIdentique === false) {
    return { cible, etat: "degrade", detail: "relecture différente de l'écriture" };
  }
  return { cible, etat: "ok", detail: "écriture, confirmation et relecture conformes" };
}

/** Synthèse : l'état le plus grave l'emporte ; « non exécuté » n'alarme pas. */
export function synthetiser(verdicts: VerdictSante[]): EtatSante {
  if (verdicts.some((v) => v.etat === "indisponible")) return "indisponible";
  if (verdicts.some((v) => v.etat === "degrade")) return "degrade";
  if (verdicts.some((v) => v.etat === "ok")) return "ok";
  return "non_execute";
}
