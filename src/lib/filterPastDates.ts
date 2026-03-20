import { parse } from "date-fns";
import { fr } from "date-fns/locale";

const MONTH_MAP: Record<string, string> = {
  janvier: "01", février: "02", mars: "03", avril: "04",
  mai: "05", juin: "06", juillet: "07", août: "08",
  septembre: "09", octobre: "10", novembre: "11", décembre: "12",
};

/**
 * Parse a French date string like "27 janvier 2026" into a Date object.
 */
function parseFrenchDate(str: string): Date | null {
  const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (!month) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Extract the LAST date from a range string like "Du 23 février au 6 mars 2026"
 * or a multi-date like "27 et 28 janvier 2026".
 * Falls back to the first date found.
 */
function parseLastFrenchDate(str: string): Date | null {
  // Try to find all "DD month YYYY" patterns
  const datePattern = /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi;
  const matches = [...str.matchAll(datePattern)];
  
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    return parseFrenchDate(last[0]);
  }

  // Handle "Du 23 février au 6 mars 2026" where first date has no year
  const rangeMatch = str.match(/(\d{1,2})\s+(\w+)\s+au\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (rangeMatch) {
    const [, , , day2, month2, year] = rangeMatch;
    const m = MONTH_MAP[month2.toLowerCase()];
    if (m) return new Date(Number(year), Number(m) - 1, Number(day2));
  }

  // Handle "27 et 28 janvier 2026" where only last has month+year
  const etMatch = str.match(/\d{1,2}\s+et\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (etMatch) {
    const [, day, monthName, year] = etMatch;
    const m = MONTH_MAP[monthName.toLowerCase()];
    if (m) return new Date(Number(year), Number(m) - 1, Number(day));
  }

  // Handle strings like "Début janvier 2027"
  const debutMatch = str.match(/(?:début|fin)\s+(\w+)\s+(\d{4})/i);
  if (debutMatch) {
    const m = MONTH_MAP[debutMatch[1].toLowerCase()];
    if (m) return new Date(Number(debutMatch[2]), Number(m) - 1, 1);
  }

  return null;
}

/**
 * Filter exam date objects (with a `date` field) to keep only future dates.
 */
export function filterFutureExamDates<T extends { date: string }>(dates: T[]): T[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dates.filter(item => {
    const d = parseFrenchDate(item.date);
    return d ? d >= today : true; // keep if unparseable
  });
}

/**
 * Filter date range strings to keep only those whose end date is in the future.
 */
export function filterFutureDateStrings(dates: string[]): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dates.filter(str => {
    const d = parseLastFrenchDate(str);
    return d ? d >= today : true;
  });
}
