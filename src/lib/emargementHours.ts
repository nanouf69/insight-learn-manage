export type EmargementPresenceRow = {
  apprenant_id?: string | null;
  date_emargement?: string | null;
  demi_journee?: string | null;
  absent?: boolean | null;
};

const EVENING_MAX_HOURS = 40;
const DAY_MAX_HOURS = 60;

export const isEveningTrainingValue = (...values: Array<string | null | undefined>) => {
  const value = values
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /soir|soiree|vtc-s|cours-du-soir/.test(value) || /\b(17|18|19|20|21)\s*[h:]/.test(value);
};

export const formatPresenceHours = (hours: number) => {
  const safe = Number.isFinite(hours) ? hours : 0;
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h00`;
};

export const computePresenceHours = (
  rows: EmargementPresenceRow[],
  options: { isEvening?: boolean; maxHours?: number; dateStart?: string | null; dateEnd?: string | null } = {},
) => {
  const isEvening = options.isEvening ?? rows.some((row) => String(row.demi_journee || "").toLowerCase().startsWith("soir"));
  const maxHours = options.maxHours ?? (isEvening ? EVENING_MAX_HOURS : DAY_MAX_HOURS);
  const byDate = new Map<string, Set<string>>();

  for (const row of rows) {
    if (row.absent) continue;
    const date = String(row.date_emargement || "").slice(0, 10);
    const slot = String(row.demi_journee || "").trim().toLowerCase();
    if (!date || !slot) continue;
    if (options.dateStart && date < options.dateStart) continue;
    if (options.dateEnd && date > options.dateEnd) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)!.add(slot);
  }

  let total = 0;
  for (const slots of byDate.values()) {
    if (isEvening) {
      const hasEveningSlot = slots.has("soir") || slots.has("soir_1") || slots.has("soir_2");
      if (hasEveningSlot) {
        const dayTotal = Math.min(
          (slots.has("soir") ? 4 : 0) +
            (slots.has("soir_1") ? 1.5 : 0) +
            (slots.has("soir_2") ? 2.5 : 0),
          4,
        );
        total += dayTotal;
      } else if (slots.has("matin") || slots.has("apres_midi")) {
        // Anciennes signatures mal classées sur les cours du soir : compter 4h max par journée.
        total += 4;
      }
    } else {
      total += Math.min((slots.has("matin") ? 3 : 0) + (slots.has("apres_midi") ? 3 : 0), 6);
    }
  }

  return Math.min(total, maxHours);
};