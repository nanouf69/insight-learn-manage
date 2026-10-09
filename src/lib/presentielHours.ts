import type { PratiqueSlotDetail } from "@/lib/pratiqueSlots";

export interface EmargementRowLike {
  date_emargement?: string | null;
  demi_journee?: string | null;
  absent?: boolean | null;
  signature_data_url?: string | null;
  masque?: boolean | null;
}

export function isSignedPresentielRow(row: EmargementRowLike): boolean {
  return row.absent !== true && row.masque !== true && Boolean(row.signature_data_url?.trim());
}

/** Missing contractual hours never erase proven presence. Planning supplies only a display target. */
export function presentielProgress(signedHours: number, contractualHours: number, details: PratiqueSlotDetail[]) {
  const planned = new Map<string, number>();
  for (const detail of details) {
    for (const part of detail.parts) {
      const key = `${detail.date}:${part.creneau}`;
      planned.set(key, Math.max(planned.get(key) ?? 0, Math.max(0, part.minutes)));
    }
  }
  const plannedHours = [...planned.values()].reduce((sum, minutes) => sum + minutes, 0) / 60;
  const required = contractualHours > 0 ? contractualHours : Math.max(plannedHours, signedHours);
  const done = Math.max(0, signedHours);
  return { done, required, pct: required > 0 ? Math.min(100, Math.round(done / required * 100)) : 0 };
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
    if (!isSignedPresentielRow(r)) continue;
    const date = String(r?.date_emargement || "").slice(0, 10);
    const slot = String(r?.demi_journee || "").trim().toLowerCase();
    if (!date || !slot) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)?.add(slot);
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
    // Evening attendance remains theory even when practice happens on the same date.
    const daytime = pratiqueDates.has(date) ? new Set([...slots].filter((s) => s.startsWith("soir"))) : slots;
    const evening = daytime.has("soir") || daytime.has("soir_1") || daytime.has("soir_2");
    if (evening) {
      theorieHours += Math.min(
        (daytime.has("soir") ? 4 : 0) + (daytime.has("soir_1") ? 1.5 : 0) + (daytime.has("soir_2") ? 2.5 : 0),
        4,
      );
    } else {
      theorieHours += Math.min((daytime.has("matin") ? 3 : 0) + (daytime.has("apres_midi") ? 3 : 0), 6);
    }
  }

  // --- Pratique : uniquement les creneaux reellement signes
  let pratiqueMinutes = 0;
  const counted = new Set<string>();
  for (const detail of details) {
    const slots = byDate.get(detail.date);
    if (!slots || slots.size === 0) continue;
    for (const part of detail.parts) {
      const signed = part.creneau === "matin" ? slots.has("matin") : slots.has("apres_midi");
      const key = `${detail.date}:${part.creneau}`;
      if (!signed || counted.has(key)) continue;
      counted.add(key);
      pratiqueMinutes += Math.max(0, part.minutes || 0);
    }
  }

  return { theorieHours, pratiqueMinutes };
}
