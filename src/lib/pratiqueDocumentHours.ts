import type { PratiqueSlotDetail } from "@/lib/pratiqueSlots";

/** Display only: match the learner's practical date and exact half-day. */
export function pratiqueDocumentHours(date: string, demiJournee: string, details: PratiqueSlotDetail[]): string | undefined {
  if (demiJournee !== "matin" && demiJournee !== "apres_midi") return undefined;
  return details.find((item) => item.date === date)?.parts.find((part) => part.creneau === demiJournee)?.label || undefined;
}