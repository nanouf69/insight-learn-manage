import type { PratiqueSlotDetail } from "@/lib/pratiqueSlots";

export interface EmargementRowLike {
  date_emargement?: string | null;
  demi_journee?: string | null;
  absent?: boolean | null;
}

/**
 * Regle metier : le PRESENTIEL (theorie ET pratique) se base TOUJOURS sur les
 * feuilles d'emargement signees. Le planning ne sert qu'a connaitre la duree
 * exacte du creneau reellement signe (ex: 09h30-12h30 = 3h et non 6h).
 *
 * - Une journee pratique non emargee ne compte pas d'heures.
 * - Un creneau (matin / apres-midi) non signe ne compte pas.
 */
export function buildEmargementsSlotMap(rows: EmargementRowLike[] | null | undefined) {
  const byDate = new Map<string, Set<string>>();
  for (const r of rows || []) {
    if (r?.absent) continue;
    const date = String(r?.date_emargement || "").slice(0, 10);
    const slot = String(r?.demi_journee || "").trim().toLowerCase();
    if (!date || !slot) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)!.add(slot);
  }
  return byDate;
}

export function computePresentielHours(
  emargRows: EmargementRowLike[] | null | undefined,
  pratiqueDetails: PratiqueSlotDetail[] | null | undefined,
): { theorieHours: number; pratiqueMinutes: number } {
  const byDate = buildEmargementsSlotMap(emargRows);
  const details = pratiqueDetails || [];
  const pratiqueDates = new Set(details.map((d) => d.date));

  // --- Theorie : toutes les journees emargees qui ne sont pas des journees pratique
  let theorieHours = 0;
  for (const [date, slots] of byDate.entries()) {
    if (pratiqueDates.has(date)) continue;
    const evening = slots.has("soir") || slots.has("soir_1") || slots.has("soir_2");
    if (evening) {
      theorieHours += Math.min(
        (slots.has("soir") ? 4 : 0) + (slots.has("soir_1") ? 1.5 : 0) + (slots.has("soir_2") ? 2.5 : 0),
        4,
      );
    } else {
      theorieHours += Math.min((slots.has("matin") ? 3 : 0) + (slots.has("apres_midi") ? 3 : 0), 6);
    }
  }

  // --- Pratique : uniquement les creneaux reellement signes
  let pratiqueMinutes = 0;
  for (const detail of details) {
    const slots = byDate.get(detail.date);
    if (!slots || slots.size === 0) continue;
    for (const part of detail.parts) {
      const signed = part.creneau === "matin" ? slots.has("matin") : slots.has("apres_midi");
      if (!signed) continue;
      pratiqueMinutes += Math.max(0, part.minutes || 0);
    }
  }

  return { theorieHours, pratiqueMinutes };
}
