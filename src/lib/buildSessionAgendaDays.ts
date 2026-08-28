import { supabase } from "@/integrations/supabase/client";
import { isPratiqueType } from "@/lib/sessionTypes";
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
  /**
   * Nombre d'heures de présentiel à réaliser par l'apprenant (hors pratique).
   * Si fourni et > total des heures des jours de la session, on ajoute des
   * feuilles d'émargement supplémentaires les samedis (priorité), puis les
   * lundis suivants la fin de session pour atteindre l'objectif.
   */
  heuresPresentielRequis?: number | null;
}

const hoursPerDay = (d: { isSoir?: boolean }) => (d.isSoir ? 4 : 6);


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

  const isPratique = isPratiqueType(ctx.type_session);
  const titleLower = (ctx.title || "").toLowerCase();
  const { isTaxi, isVTC } = getFlags(ctx.typeApprenant, ctx.title || "");

  // ---- Formation Continue : STRICTEMENT limité aux dates de session ----
  // FC VTC / FC TAXI / Mobilité TAXI = 14h sur 2 jours (7h/jour : 09-12 + 13-17).
  // On n'utilise NI les blocs agenda ni de padding samedi/lundi.
  const tLower = (ctx.typeApprenant || "").toLowerCase();
  const isFCStrict =
    tLower.startsWith("continue-") ||
    tLower.includes("mobilite") ||
    titleLower.includes("formation continue") ||
    titleLower.includes("mobilité") ||
    titleLower.includes("mobilite");
  if (isFCStrict) {
    const startD = new Date(dateDebut + "T00:00:00");
    const endD = new Date(dateFin + "T00:00:00");
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) return [];
    const fc: AgendaDaySlot[] = [];
    const cur = new Date(startD);
    while (cur <= endD) {
      fc.push({
        date: new Date(cur),
        matinDebut: "09:00",
        matinFin: "12:00",
        apremDebut: "13:00",
        apremFin: "17:00",
      });
      cur.setDate(cur.getDate() + 1);
    }
    return fc;
  }

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

  // Détermine les publics ciblés par l'apprenant (TAXI/TA/VTC/VA)
  const t = (ctx.typeApprenant || "").toLowerCase();
  const apprenantPublics: string[] = [];
  if (t === "taxi" || t === "taxi-e") apprenantPublics.push("TAXI");
  if (t === "ta" || t === "ta-e" || t.includes("passerelle-ta") || t.includes("passerelle-taxi")) apprenantPublics.push("TA");
  if (t === "vtc" || t === "vtc-e") apprenantPublics.push("VTC");
  if (t === "va" || t === "va-e" || t === "pa vtc" || t.includes("passerelle-va") || t.includes("passerelle-vtc")) apprenantPublics.push("VA");

  const matchFormation = (f: string) => {
    const fl = (f || "").toLowerCase();
    if (fl.includes("taxi et vtc") || fl.includes("taxi & vtc")) return true;
    if (isTaxi && fl.includes("taxi")) return true;
    if (isVTC && fl.includes("vtc")) return true;
    if (!isTaxi && !isVTC) return true; // fallback : prendre tout
    return false;
  };

  const filtered = (blocs || []).filter((b: any) => {
    const cibles: string[] = Array.isArray(b.publics_cibles) ? b.publics_cibles : [];
    // Si publics_cibles est renseigné -> on l'utilise en priorité
    if (cibles.length > 0) {
      if (apprenantPublics.length === 0) return true; // type inconnu : on garde
      return apprenantPublics.some((p) => cibles.includes(p));
    }
    // Sinon : fallback sur le texte de la formation (legacy)
    return matchFormation(b.formation);
  });
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
        // SOIR : 2 créneaux fixes 17:00-18:30 et 18:30-21:00
        result.matinDebut = "17:00";
        result.matinFin = "18:30";
        result.apremDebut = "18:30";
        result.apremFin = "21:00";
        result.isSoir = true;
      } else {
        // JOURNÉE : 2 créneaux fixes 09:00-12:00 et 13:00-16:00 (VTC / TAXI / TA)
        result.matinDebut = "09:00";
        result.matinFin = "12:00";
        result.apremDebut = "13:00";
        result.apremFin = "16:00";
      }
      return result;
    });

  if (days.length > 0) return padExtraDays(days, ctx);

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
      day.matinDebut = "17:00";
      day.matinFin = "18:30";
      day.apremDebut = "18:30";
      day.apremFin = "21:00";
      day.isSoir = true;
    } else {
      // JOURNÉE (théorie ou pratique) : 9h-12h / 13h-16h pour VTC, TAXI, TA
      day.matinDebut = "09:00";
      day.matinFin = "12:00";
      day.apremDebut = "13:00";
      day.apremFin = "16:00";
    }
    fallback.push(day);
    cur.setDate(cur.getDate() + 1);
  }
  return padExtraDays(fallback, ctx);
}

/**
 * Ajoute des jours d'émargement supplémentaires (samedi en priorité, sinon
 * lundi) après la date de fin de session pour atteindre le nombre d'heures
 * de présentiel requis (hors heures de pratique).
 */
function padExtraDays(days: AgendaDaySlot[], ctx: SessionAgendaContext): AgendaDaySlot[] {
  // Formation Continue = 14h maxi (2 jours). On NE complète JAMAIS avec des
  // samedis/lundis supplémentaires pour les FC VTC / FC TAXI / Mobilité TAXI.
  const t = (ctx.typeApprenant || "").toLowerCase();
  const titleLower = (ctx.title || "").toLowerCase();
  const isFC =
    t.startsWith("continue-") ||
    t === "pa vtc" ||
    t === "pa" ||
    t.includes("mobilite") ||
    titleLower.includes("formation continue") ||
    titleLower.includes("mobilité") ||
    titleLower.includes("mobilite");
  if (isFC) return days;

  const target = Number(ctx.heuresPresentielRequis || 0);
  if (!target || days.length === 0) return days;

  const currentTotal = days.reduce((sum, d) => sum + hoursPerDay(d), 0);
  if (currentTotal >= target) return days;


  const lastDay = days[days.length - 1].date;
  const isSoir = days.every((d) => d.isSoir);
  const perDay = isSoir ? 4 : 6;

  const makeDay = (date: Date): AgendaDaySlot => (isSoir
    ? { date, matinDebut: "17:00", matinFin: "18:30", apremDebut: "18:30", apremFin: "21:00", isSoir: true }
    : { date, matinDebut: "09:00", matinFin: "12:00", apremDebut: "13:00", apremFin: "16:00" });

  const MAX_WEEKS = 16;
  const extras: AgendaDaySlot[] = [];
  let remaining = target - currentTotal;

  // 1) Priorité : samedis suivant la fin de session
  const cursor = new Date(lastDay);
  cursor.setDate(cursor.getDate() + 1);
  let weeksScanned = 0;
  while (remaining > 0 && weeksScanned < MAX_WEEKS) {
    if (cursor.getDay() === 6) { // samedi
      extras.push(makeDay(new Date(cursor)));
      remaining -= perDay;
      weeksScanned++;
    }
    cursor.setDate(cursor.getDate() + 1);
    // sécurité : borne dure
    if (extras.length > 32) break;
  }

  // 2) Fallback : lundis suivants si samedis insuffisants
  if (remaining > 0) {
    const cursor2 = new Date(lastDay);
    cursor2.setDate(cursor2.getDate() + 1);
    let mondaysScanned = 0;
    while (remaining > 0 && mondaysScanned < MAX_WEEKS) {
      if (cursor2.getDay() === 1) { // lundi
        // éviter doublon si un samedi précédent est déjà à cette date (impossible ici)
        extras.push(makeDay(new Date(cursor2)));
        remaining -= perDay;
        mondaysScanned++;
      }
      cursor2.setDate(cursor2.getDate() + 1);
      if (extras.length > 64) break;
    }
  }

  // Trier chronologiquement pour un rendu propre dans le PDF
  return [...days, ...extras].sort((a, b) => a.date.getTime() - b.date.getTime());
}

