// Types techniques historiques (conservés pour compatibilité des données existantes)
export const SESSION_TYPES = [
  { value: "theorique", label: "📚 Formation théorique", isPratique: false },
  { value: "vtc", label: "🚗 Formation VTC", isPratique: false },
  { value: "vtc_soir", label: "🌙 Formation VTC cours du soir", isPratique: false },
  { value: "taxi", label: "🚕 Formation TAXI", isPratique: false },
  { value: "continue_vtc", label: "🔄 Formation continue VTC", isPratique: false },
  { value: "continue_taxi", label: "🔄 Formation continue TAXI", isPratique: false },
  { value: "pratique", label: "🚗 Formation pratique", isPratique: true },
  { value: "pratique_vtc", label: "🚗 Formation pratique VTC", isPratique: true },
  { value: "pratique_taxi", label: "🚕 Formation pratique TAXI", isPratique: true },
  { value: "mobilite_taxi", label: "🚕 Formation mobilité TAXI", isPratique: false },
  { value: "theorique_pratique", label: "📚🚗 Théorique et présentiel", isPratique: true },
];

// Options proposées dans le formulaire pour le champ "Type de session"
export const SESSION_TYPE_OPTIONS = [
  { value: "theorique", label: "📚 Théorique" },
  { value: "pratique", label: "🚗 Présentiel" },
  { value: "theorique_pratique", label: "📚🚗 Théorique et présentiel" },
];

// Noms de session proposés (liste déroulante) + possibilité d'en saisir un autre
export const SESSION_NOM_OPTIONS = [
  "Formation VTC",
  "Formation VTC cours du soir",
  "Formation TAXI",
  "Formation continue VTC",
  "Formation continue TAXI",
  "Formation pratique VTC",
  "Formation pratique TAXI",
  "Formation mobilité TAXI",
];

export const PRATIQUE_TYPES = SESSION_TYPES.filter(t => t.isPratique).map(t => t.value);
export const THEORIQUE_TYPES = SESSION_TYPES.filter(t => !t.isPratique).map(t => t.value);

export function isMixteType(type?: string | null): boolean {
  return String(type || "") === "theorique_pratique";
}

export function isPratiqueType(type?: string | null): boolean {
  return /pratique/i.test(type || "");
}

export function isTheoriqueType(type?: string | null): boolean {
  if (isMixteType(type)) return true;
  return !isPratiqueType(type);
}

export function getSessionTypeLabel(type?: string | null): string {
  return SESSION_TYPES.find(t => t.value === type)?.label || type || "Session";
}
