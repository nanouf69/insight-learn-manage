export const isElearningType = (type?: string | null) => {
  const t = (type || "").toLowerCase().trim();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /(^|[\s-])[a-z]{2,4}-e($|-)/.test(t) || t.endsWith("-e");
};

export const STATUT_SUIVI_LABELS: Record<string, string> = {
  manque_document: "Manque un document",
  manque_piece_identite: "Manque pièce d'identité",
  manque_justificatif_domicile: "Manque justificatif domicile",
  manque_permis: "Manque permis",
  manque_signature: "Manque signature",
  manque_photo: "Manque photo",
  document_complet: "Dossier complet",
  mdp_change: "MDP changé",
  email_non_valide: "Email non validé",
  injoignable: "Injoignable",
  a_rappeler: "À rappeler",
  a_payer: "À payer",
  paye: "Payé",
  inscription_validee: "Inscription validée",
};

export type InscriptionExamenEtat =
  | { niveau: "rouge"; libelle: string; bloque: true }
  | { niveau: "vert" | "orange"; libelle: string; bloque: false };

/** Règle : dossier de bienvenue complété ET signé = prérequis ; sinon statut CRM exact (lecture seule). */
export function etatInscriptionExamen(bienvenueSigne: boolean, statutSuivi: string | null | undefined): InscriptionExamenEtat {
  if (!bienvenueSigne) return { niveau: "rouge", libelle: "Dossier de bienvenue requis", bloque: true };
  const s = (statutSuivi || "").trim();
  if (s === "inscription_validee") return { niveau: "vert", libelle: "Inscription validée", bloque: false };
  if (!s) return { niveau: "orange", libelle: "En attente d'inscription", bloque: false };
  return { niveau: "orange", libelle: STATUT_SUIVI_LABELS[s] ?? s, bloque: false };
}

/** Jours (calendrier Europe/Paris) entre aujourd'hui et la date limite ISO. */
export function joursAvantDateLimite(dateLimiteIso: string, now: Date = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const [a, b, c] = today.split("-").map(Number);
  const [x, y, z] = dateLimiteIso.split("-").map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000);
}

/** Alerte « date limite proche » : uniquement de J-3 à J, jamais si l'inscription est validée. */
export function alerteDateLimiteDisponible(
  dateLimiteIso: string | null | undefined,
  statutSuivi: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dateLimiteIso) return false;
  if ((statutSuivi || "").trim() === "inscription_validee") return false;
  const j = joursAvantDateLimite(dateLimiteIso, now);
  return j >= 0 && j <= 3;
}
