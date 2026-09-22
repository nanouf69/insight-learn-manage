/**
 * ÉTAPE 4 — MESSAGE DE CONNEXION HONNÊTE (préparation, TEST uniquement).
 *
 * Un délai dépassé, une base injoignable ou une erreur serveur ne doivent
 * JAMAIS être présentés comme un mauvais mot de passe.
 */

export const MESSAGE_IDENTIFIANTS_INCORRECTS = "Email ou mot de passe incorrect";
export const MESSAGE_SERVICE_INDISPONIBLE =
  "Service temporairement indisponible. Vos identifiants ne sont pas en cause. Merci de réessayer.";

export type EchecConnexion = {
  status?: number;
  code?: string;
  message?: string;
  timeout?: boolean;
  reseau?: boolean;
};

export type VerdictConnexion = {
  cause: "identifiants" | "service";
  message: string;
};

const CODES_IDENTIFIANTS = new Set([
  "invalid_credentials",
  "invalid_grant",
  "invalid_login_credentials",
  "email_not_confirmed",
  "user_not_found",
]);

export function classifierEchecConnexion(e: EchecConnexion): VerdictConnexion {
  const code = (e.code ?? "").toLowerCase();
  const texte = (e.message ?? "").toLowerCase();

  if (e.timeout || e.reseau) return { cause: "service", message: MESSAGE_SERVICE_INDISPONIBLE };
  if (typeof e.status === "number" && (e.status >= 500 || e.status === 0 || e.status === 408 || e.status === 429)) {
    return { cause: "service", message: MESSAGE_SERVICE_INDISPONIBLE };
  }
  if (CODES_IDENTIFIANTS.has(code)) return { cause: "identifiants", message: MESSAGE_IDENTIFIANTS_INCORRECTS };
  if (/invalid login credentials|invalid email or password/.test(texte)) {
    return { cause: "identifiants", message: MESSAGE_IDENTIFIANTS_INCORRECTS };
  }
  if (/fetch failed|network|timeout|unavailable|upstream|database|connection/.test(texte)) {
    return { cause: "service", message: MESSAGE_SERVICE_INDISPONIBLE };
  }
  if (e.status === 400 || e.status === 401) {
    return { cause: "identifiants", message: MESSAGE_IDENTIFIANTS_INCORRECTS };
  }
  // Cause non prouvée : on n'accuse jamais l'élève.
  return { cause: "service", message: MESSAGE_SERVICE_INDISPONIBLE };
}
