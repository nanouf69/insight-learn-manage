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
];

export const PRATIQUE_TYPES = SESSION_TYPES.filter(t => t.isPratique).map(t => t.value);
export const THEORIQUE_TYPES = SESSION_TYPES.filter(t => !t.isPratique).map(t => t.value);

export function isPratiqueType(type?: string | null): boolean {
  return /pratique/i.test(type || "");
}

export function isTheoriqueType(type?: string | null): boolean {
  return !isPratiqueType(type);
}

export function getSessionTypeLabel(type?: string | null): string {
  return SESSION_TYPES.find(t => t.value === type)?.label || type || "Session";
}
