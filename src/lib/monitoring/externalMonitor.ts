/**
 * ÉTAPE 4 — SURVEILLANCE EXTERNE (préparation, TEST uniquement).
 *
 * Principe issu de la panne : détecter une panne de base ne doit JAMAIS
 * dépendre de cette base. Ce module ne lit ni n'écrit aucune table : il ne
 * fait que juger des mesures collectées de l'extérieur.
 */
import type { VerdictSante } from "./healthChecks";

export type Mesures = {
  /** Verdicts des contrôles de santé (application, base, auth, sauvegarde). */
  verdicts: VerdictSante[];
  /** Part de réponses 5xx sur la fenêtre observée (0 à 1). */
  taux5xx?: number;
  /** Latence médiane observée en millisecondes. */
  latenceMs?: number;
  /** Connexions base utilisées / maximum. */
  connexionsUtilisees?: number;
  connexionsMax?: number;
  /** Échecs consécutifs de la chaîne de sauvegarde TEST. */
  echecsSauvegardeTestConsecutifs?: number;
};

export type Incident = {
  code: string;
  gravite: "critique" | "avertissement";
  message: string;
};

export const SEUILS = {
  taux5xx: 0.05,
  latenceMs: 3000,
  saturationConnexions: 0.85,
  echecsSauvegardeTest: 3,
};

const CIBLE_CODES: Record<string, { code: string; message: string }> = {
  "application.frontend": { code: "SITE_INDISPONIBLE", message: "Le site n'est plus accessible." },
  "application.backend": { code: "BACKEND_INDISPONIBLE", message: "Le service applicatif ne répond plus." },
  "base.connexion": { code: "DB_INDISPONIBLE", message: "La base de données ne répond plus." },
  "base.lecture": { code: "DB_LECTURE_IMPOSSIBLE", message: "La base ne peut plus être lue." },
  "base.ecriture_test": { code: "DB_ECRITURE_IMPOSSIBLE", message: "La base n'accepte plus d'écriture (test)." },
  "auth.service": { code: "AUTH_INDISPONIBLE", message: "Le service de connexion ne répond plus." },
  "sauvegarde.chaine_test": {
    code: "SAUVEGARDE_INDISPONIBLE",
    message: "CRITIQUE — sauvegarde apprenant indisponible",
  },
};

/** Évalue les mesures et renvoie la liste des incidents détectés. */
export function evaluerMesures(m: Mesures): Incident[] {
  const incidents: Incident[] = [];

  for (const v of m.verdicts) {
    const def = CIBLE_CODES[v.cible];
    if (!def) continue;
    if (v.etat === "indisponible") {
      incidents.push({ code: def.code, gravite: "critique", message: def.message });
    } else if (v.etat === "degrade") {
      incidents.push({ code: `${def.code}_DEGRADE`, gravite: "avertissement", message: `${def.message} (dégradé)` });
    }
  }

  if ((m.taux5xx ?? 0) > SEUILS.taux5xx) {
    incidents.push({
      code: "ERREURS_5XX",
      gravite: "critique",
      message: `Taux d'erreurs serveur anormal (${Math.round((m.taux5xx ?? 0) * 100)} %).`,
    });
  }
  if ((m.latenceMs ?? 0) > SEUILS.latenceMs) {
    incidents.push({ code: "LATENCE", gravite: "avertissement", message: `Latence anormale (${m.latenceMs} ms).` });
  }
  if (m.connexionsMax && m.connexionsUtilisees != null) {
    const taux = m.connexionsUtilisees / m.connexionsMax;
    if (taux >= SEUILS.saturationConnexions) {
      incidents.push({
        code: "SATURATION_CONNEXIONS",
        gravite: "critique",
        message: `Connexions base proches de la saturation (${Math.round(taux * 100)} %).`,
      });
    }
  }
  if ((m.echecsSauvegardeTestConsecutifs ?? 0) >= SEUILS.echecsSauvegardeTest) {
    if (!incidents.some((i) => i.code === "SAUVEGARDE_INDISPONIBLE")) {
      incidents.push({
        code: "SAUVEGARDE_INDISPONIBLE",
        gravite: "critique",
        message: "CRITIQUE — sauvegarde apprenant indisponible",
      });
    }
  }
  return incidents;
}
