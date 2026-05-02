import { supabase } from "@/integrations/supabase/client";
import type { AgendaDaySlot } from "@/components/sessions/EmargementIndividuelGenerator";

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface SessionAgendaContext {
  dateDebut: string;       // ISO yyyy-mm-dd
  dateFin: string;         // ISO yyyy-mm-dd
  title?: string | null;   // ex: "Session du soir"
  type_session?: string | null;
  typeApprenant?: string | null;
}

const getFlags = (typeApprenant: string | null | undefined, title: string) => {
  const t = (typeApprenant || "").toLowerCase();
  const titleLower = title.toLowerCase();
  const isTaxi = t.includes("taxi") || t === "ta" || t === "ta-e" || titleLower.includes("taxi");
  const isVTC =
    !isTaxi && (t === "vtc" || t === "vtc-e" || t === "pa vtc" || t === "va" || t === "va-e" || titleLower.includes("vtc"));
  return { isTaxi, isVTC };
};

/**
 * Construit la liste des jours d'émargement pour une session présentielle.
 * - Lit les blocs réels depuis agenda_blocs (filtrés par formation TAXI/VTC)
 * - Détecte automatiquement journée vs soir à partir des heures
 *   - heure_debut >= 17:00 => SOIR : plage unique 17:00 - 21:00
 *   - sinon JOURNÉE : matin + après-midi avec horaires réels de l'agenda
 * - Fallback sur dates de la session si aucun bloc n'est trouvé
 */
export async function buildSessionAgendaDays(
  ctx: SessionAgendaContext,
): Promise<AgendaDaySlot[]> {
  const { dateDebut, dateFin } = ctx;
  if (!dateDebut || !dateFin) return [];

  const isPratique = (ctx.type_session || "") === "pratique";
  const titleLower = (ctx.title || "").toLowerCase();
  const { isTaxi, isVTC } = getFlags(ctx.typeApprenant, ctx.title || "");

  // Charger les blocs agenda potentiels (semaines couvrant la session)
  const start = new Date(dateDebut + "T00:00:00");
  const semaineMin = new Date(start);
  semaineMin.setDate(semaineMin.getDate() - 6);
  const semaineMinStr = semaineMin.toISOString().slice(0, 10);

  const { data: blocs } = await supabase
    .from("agenda_blocs")
    .select("*")
    .gte("semaine_debut", semaineMinStr)
    .lte("semaine_debut", dateFin);

  const matchFormation = (f: string) => {
    const fl = (f || "").toLowerCase();
    if (fl.includes("taxi et vtc") || fl.includes("taxi & vtc")) return true;
    if (isTaxi && fl.includes("taxi")) return true;
    if (isVTC && fl.includes("vtc")) return true;
    if (!isTaxi && !isVTC) return true; // fallback : prendre tout
    return false;
  };

  const filtered = (blocs || []).filter((b: any) => matchFormation(b.formation));
  const dayMap = new Map<string, { date: Date; slots: { debut: string; fin: string }[] }>();

  for (const bloc of filtered) {
    const weekStart = new Date(bloc.semaine_debut + "T00:00:00");
    const actualDate = new Date(weekStart);
    actualDate.setDate(actualDate.getDate() + bloc.jour);
    const key = formatLocalDateKey(actualDate);
    if (key < dateDebut || key > dateFin) continue;
    if (!dayMap.has(key)) dayMap.set(key, { date: actualDate, slots: [] });
    dayMap.get(key)!.slots.push({ debut: bloc.heure_debut, fin: bloc.heure_fin });
  }

  // Construction des AgendaDaySlot avec détection journée/soir
  const days: AgendaDaySlot[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => {
      const slots = val.slots.slice().sort((a, b) => a.debut.localeCompare(b.debut));
      const minDebut = slots[0]?.debut || "";
      const isSoir = minDebut >= "17:00";

      const result: AgendaDaySlot = { date: val.date };

      if (isSoir) {
        // SOIR : plage unique 17:00 - 21:00 (affichée en après-midi)
        result.matinDebut = undefined;
        result.matinFin = undefined;
        result.apremDebut = "17:00";
        result.apremFin = "21:00";
      } else {
        const morning = slots.filter((s) => s.debut < "12:30");
        const afternoon = slots.filter((s) => s.debut >= "12:30");
        if (morning.length > 0) {
          result.matinDebut = morning.reduce((min, s) => (s.debut < min ? s.debut : min), morning[0].debut);
          result.matinFin = morning.reduce((max, s) => (s.fin > max ? s.fin : max), morning[0].fin);
        }
        if (afternoon.length > 0) {
          result.apremDebut = afternoon.reduce((min, s) => (s.debut < min ? s.debut : min), afternoon[0].debut);
          result.apremFin = afternoon.reduce((max, s) => (s.fin > max ? s.fin : max), afternoon[0].fin);
        }
      }
      return result;
    });

  if (days.length > 0) return days;

  // ---- Fallback : aucun bloc agenda trouvé ----
  const isCoursDuSoir = titleLower.includes("soir");
  const startD = new Date(dateDebut + "T00:00:00");
  const endD = new Date(dateFin + "T00:00:00");
  if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) return [];

  const fallback: AgendaDaySlot[] = [];
  const cur = new Date(startD);
  while (cur <= endD) {
    const day: AgendaDaySlot = { date: new Date(cur) };
    if (isCoursDuSoir) {
      day.apremDebut = "17:00";
      day.apremFin = "21:00";
    } else if (isPratique) {
      day.matinDebut = "09:00";
      day.matinFin = "12:00";
      day.apremDebut = "13:00";
      day.apremFin = isTaxi ? "17:30" : "16:00";
    } else {
      day.matinDebut = "09:00";
      day.matinFin = "12:00";
      day.apremDebut = "13:00";
      day.apremFin = isVTC ? "16:00" : "17:00";
    }
    fallback.push(day);
    cur.setDate(cur.getDate() + 1);
  }
  return fallback;
}
