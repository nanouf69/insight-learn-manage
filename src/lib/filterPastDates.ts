const MONTH_MAP: Record<string, number> = {
  janvier: 0, février: 1, mars: 2, avril: 3,
  mai: 4, juin: 5, juillet: 6, août: 7,
  septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  fevrier: 1, decembre: 11,
};

/**
 * Parse a French date string like "27 janvier 2026" into a Date object.
 */
function parseFrenchDate(str: string): Date | null {
  const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (month === undefined) return null;
  return new Date(Number(year), month, Number(day));
}

/**
 * Extract the LAST date from a range string like "Du 23 février au 6 mars 2026"
 * or a multi-date like "27 et 28 janvier 2026".
 */
function parseLastFrenchDate(str: string): Date | null {
  // Try to find all "DD month YYYY" patterns
  const datePattern = /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/gi;
  const matches = [...str.matchAll(datePattern)];
  
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    return parseFrenchDate(last[0]);
  }

  // Handle "Du X au DD month YYYY" where end date has month+year
  const auMatch = str.match(/au\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (auMatch) {
    const m = MONTH_MAP[auMatch[2].toLowerCase()];
    if (m !== undefined) return new Date(Number(auMatch[3]), m, Number(auMatch[1]));
  }

  // Handle "Début janvier 2027"
  const debutMatch = str.match(/(?:début|fin|debut)\s+(\w+)\s+(\d{4})/i);
  if (debutMatch) {
    const m = MONTH_MAP[debutMatch[1].toLowerCase()];
    if (m !== undefined) return new Date(Number(debutMatch[2]), m, 1);
  }

  // Try ISO date format "2026-03-09"
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));

  return null;
}

function isDateInFuture(d: Date | null): boolean {
  if (!d) return true; // keep unparseable
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/**
 * Filter objects with a `date` field (e.g. "27 janvier 2026").
 */
export function filterFutureExamDates<T extends { date: string }>(dates: T[]): T[] {
  return dates.filter(item => isDateInFuture(parseFrenchDate(item.date)));
}

/**
 * Filter objects with a `value` field containing a French date or ISO date.
 */
export function filterFutureExamValues<T extends { value: string }>(dates: T[]): T[] {
  return dates.filter(item => {
    const d = parseFrenchDate(item.value) || parseLastFrenchDate(item.value);
    return isDateInFuture(d);
  });
}

/**
 * Filter objects with a `fin` ISO date field.
 */
export function filterFutureByFin<T extends { fin?: string; value?: string }>(dates: T[]): T[] {
  return dates.filter(item => {
    const dateStr = item.fin || item.value || "";
    return isDateInFuture(parseLastFrenchDate(dateStr));
  });
}

/**
 * Filter plain date range strings to keep only those whose end date is in the future.
 */
export function filterFutureDateStrings(dates: string[]): string[] {
  return dates.filter(str => isDateInFuture(parseLastFrenchDate(str)));
}
