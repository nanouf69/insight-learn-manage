import { supabase } from "@/integrations/supabase/client";

export type PratiqueFormationType = "vtc" | "taxi";
export type PratiqueReservationCreneau = "matin" | "apresmidi" | "journee";

export type PlanningDaySlot =
  | {
      matin?: string | null;
      apresmidi?: string | null;
      type?: PratiqueFormationType | "libre" | string | null;
      formateur?: string | null;
    }
  | string
  | null
  | undefined;

export interface PratiqueSlotPart {
  creneau: "matin" | "apres_midi";
  label: string;
  minutes: number;
  startMinute: number | null;
  endMinute: number | null;
}

export interface PratiqueSlotDetail {
  date: string;
  typeFormation: PratiqueFormationType;
  reservationCreneau: PratiqueReservationCreneau;
  parts: PratiqueSlotPart[];
  minutes: number;
  label: string;
}

const DEFAULT_SLOTS: Record<PratiqueFormationType, { matin: string; apresmidi: string }> = {
  vtc: { matin: "9h-12h", apresmidi: "13h-16h" },
  taxi: { matin: "9h-12h", apresmidi: "13h-16h" },
};

const normalizeDate = (value?: string | null) => String(value || "").slice(0, 10);

export const normalizePratiqueCreneau = (value?: string | null): PratiqueReservationCreneau => {
  const v = String(value || "").toLowerCase().replace(/[_\s-]+/g, "");
  if (v.includes("apres") || v.includes("aprem")) return "apresmidi";
  if (v.includes("matin")) return "matin";
  return "journee";
};

export const normalizePratiqueType = (value?: string | null): PratiqueFormationType =>
  String(value || "").toLowerCase().includes("taxi") ? "taxi" : "vtc";

export const parseClockMinutes = (value?: string | null): number | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  const match = raw.match(/(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const parseRange = (value?: string | null): { start: number | null; end: number | null; minutes: number } => {
  const raw = String(value || "").trim();
  if (!raw) return { start: null, end: null, minutes: 0 };
  const parts = raw.replace(/[–—]/g, "-").split("-");
  if (parts.length < 2) return { start: null, end: null, minutes: 0 };
  const start = parseClockMinutes(parts[0]);
  const end = parseClockMinutes(parts[1]);
  if (start == null || end == null || end <= start) return { start, end, minutes: 0 };
  let minutes = end - start;
  if (start < 12 * 60 && end > 13 * 60) minutes -= 60;
  return { start, end, minutes: Math.max(0, minutes) };
};

export const minutesFromSessionTimes = (heureDebut?: string | null, heureFin?: string | null, fallbackMinutes = 180) => {
  const start = parseClockMinutes(heureDebut);
  const end = parseClockMinutes(heureFin);
  if (start == null || end == null || end <= start) return fallbackMinutes;
  let minutes = end - start;
  if (start < 12 * 60 && end > 13 * 60) minutes -= 60;
  return Math.max(0, minutes);
};

const cleanLabel = (value: string) => value.trim().replace(/[–—]/g, "-").replace(/\s*-\s*/g, " - ");

export const resolvePratiqueSlotParts = (
  slot: PlanningDaySlot,
  type: PratiqueFormationType,
  reservationCreneau: PratiqueReservationCreneau = "journee",
): PratiqueSlotPart[] => {
  const defaults = DEFAULT_SLOTS[type];
  const hasObjectSlot = typeof slot === "object" && slot !== null;
  const rawMatin = typeof slot === "string" ? slot.trim() : hasObjectSlot ? String(slot.matin || "").trim() : "";
  const rawApresmidi = hasObjectSlot ? String(slot.apresmidi || "").trim() : "";
  const hasExplicitSlot = Boolean(rawMatin || rawApresmidi);

  const selected: Array<{ creneau: "matin" | "apres_midi"; label: string }> = [];
  if (hasExplicitSlot) {
    if ((reservationCreneau === "matin" || reservationCreneau === "journee") && rawMatin) {
      selected.push({ creneau: "matin", label: rawMatin });
    }
    if ((reservationCreneau === "apresmidi" || reservationCreneau === "journee") && rawApresmidi) {
      selected.push({ creneau: "apres_midi", label: rawApresmidi });
    }
    if (selected.length > 0) {
      return selected.map(({ creneau, label }) => {
        const parsed = parseRange(label);
        return { creneau, label: cleanLabel(label), minutes: parsed.minutes, startMinute: parsed.start, endMinute: parsed.end };
      });
    }
  }

  if (reservationCreneau === "matin") selected.push({ creneau: "matin", label: defaults.matin });
  else if (reservationCreneau === "apresmidi") selected.push({ creneau: "apres_midi", label: defaults.apresmidi });
  else {
    selected.push({ creneau: "matin", label: defaults.matin });
    selected.push({ creneau: "apres_midi", label: defaults.apresmidi });
  }

  return selected.map(({ creneau, label }) => {
    const parsed = parseRange(label);
    return { creneau, label: cleanLabel(label), minutes: parsed.minutes, startMinute: parsed.start, endMinute: parsed.end };
  });
};

export const fetchPlanningDaySlotsForDates = async (dates: string[]) => {
  const normalizedDates = Array.from(new Set(dates.map(normalizeDate).filter(Boolean))).sort();
  const map = new Map<string, PlanningDaySlot>();
  if (normalizedDates.length === 0) return map;

  const minDate = normalizedDates[0];
  const maxDate = normalizedDates[normalizedDates.length - 1];
  const { data } = await supabase
    .from("planning_pratique_config" as any)
    .select("planning_start_date, planning_end_date, day_time_slots, updated_at")
    .lte("planning_start_date", maxDate)
    .gte("planning_end_date", minDate)
    .order("updated_at", { ascending: false });

  const configs = ((data as any[]) || []).filter(Boolean);
  for (const date of normalizedDates) {
    const explicit = configs.find((cfg) => {
      const slots = cfg?.day_time_slots;
      return slots && typeof slots === "object" && Object.prototype.hasOwnProperty.call(slots, date);
    });
    if (explicit?.day_time_slots) map.set(date, explicit.day_time_slots[date] as PlanningDaySlot);
  }
  return map;
};

export const fetchPratiqueSlotDetails = async (apprenantId: string): Promise<PratiqueSlotDetail[]> => {
  if (!apprenantId) return [];
  const [reservationsRes, sessionsRes] = await Promise.all([
    supabase
      .from("reservations_pratique" as any)
      .select("date_choisie, type_formation, creneau")
      .eq("apprenant_id", apprenantId)
      .order("date_choisie", { ascending: true }),
    supabase
      .from("session_apprenants")
      .select("heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, nom, date_debut, date_fin, heure_debut, heure_fin)")
      .eq("apprenant_id", apprenantId),
  ]);

  const reservations = ((reservationsRes.data as any[]) || [])
    .map((row) => ({
      date: normalizeDate(row?.date_choisie),
      typeFormation: normalizePratiqueType(row?.type_formation),
      reservationCreneau: normalizePratiqueCreneau(row?.creneau),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));

  const daySlots = await fetchPlanningDaySlotsForDates(reservations.map((row) => row.date));
  const out: PratiqueSlotDetail[] = reservations.map((row) => {
    const parts = resolvePratiqueSlotParts(daySlots.get(row.date), row.typeFormation, row.reservationCreneau);
    const minutes = parts.reduce((sum, part) => sum + part.minutes, 0);
    return {
      ...row,
      parts,
      minutes,
      label: parts.map((part) => part.label).join(" + ") || "Pratique",
    };
  });

  const seenDates = new Set(out.map((row) => row.date));
  for (const row of ((sessionsRes.data as any[]) || [])) {
    const sess = row?.sessions;
    if (!sess || !String(sess.type_session || "").toLowerCase().includes("pratique")) continue;
    const date = normalizeDate(sess.date_debut);
    if (!date || seenDates.has(date)) continue;
    const minutes = minutesFromSessionTimes(row.heure_debut_personnalisee || sess.heure_debut, row.heure_fin_personnalisee || sess.heure_fin, 180);
    out.push({
      date,
      typeFormation: normalizePratiqueType(sess.nom),
      reservationCreneau: "journee",
      parts: [{
        creneau: "matin",
        label: `${String(row.heure_debut_personnalisee || sess.heure_debut || "").slice(0, 5)} - ${String(row.heure_fin_personnalisee || sess.heure_fin || "").slice(0, 5)}`,
        minutes,
        startMinute: parseClockMinutes(row.heure_debut_personnalisee || sess.heure_debut),
        endMinute: parseClockMinutes(row.heure_fin_personnalisee || sess.heure_fin),
      }],
      minutes,
      label: "Pratique",
    });
    seenDates.add(date);
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
};

export const pratiqueSlotDetailsToMinutes = (details: PratiqueSlotDetail[]) =>
  details.reduce((sum, detail) => sum + Math.max(0, detail.minutes || 0), 0);