export type HistoryPeriod = "7" | "30" | "90" | "all" | "custom";

// Explicit display preferences keyed by permanent learner identity, never by name.
const HISTORY_STARTS: Readonly<Record<string, string>> = {
  "c048754d-9045-4ab6-b89f-a5ab26de314c": "2026-10-05",
};

export function getHistoryDefaults(apprenantId?: string): {
  period: HistoryPeriod;
  start: string;
  end: string;
} {
  const start = apprenantId ? HISTORY_STARTS[apprenantId] ?? "" : "";
  return { period: start ? "custom" : "all", start, end: "" };
}

export function historyStartTimestamp(date: string): string {
  // A date input is a local calendar day, not midnight UTC.
  return new Date(`${date}T00:00:00`).toISOString();
}