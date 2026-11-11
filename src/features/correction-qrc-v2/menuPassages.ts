import type { GroupeSessionCrm, SessionListee, TentativeReelle } from "./noyauReel";

export const TOUS_GROUPES = "tous-passages";
/** Cross-enrollment repeats a display, never a passage identity. */
export function groupeTousPassages(groupes: GroupeSessionCrm[]): GroupeSessionCrm {
  const examens = new Map<string, SessionListee>();
  const candidats = new Set<string>();
  for (const g of groupes) for (const e of g.examens) {
    const key = `${TOUS_GROUPES}::${e.exam_id}`;
    let dest = examens.get(key);
    if (!dest) {
      dest = { ...e, circuit:'v2', cle: key, attemptIds: [], dates: [], legacyResultIds: [], apprenantParAttempt: {}, inscriptionCroiseeParAttempt: {} };
      examens.set(key, dest);
    }
    for (const id of e.attemptIds) if (!dest.attemptIds.includes(id)) dest.attemptIds.push(id);
    for (const id of e.legacyResultIds ?? []) if (!dest.legacyResultIds?.includes(id)) dest.legacyResultIds?.push(id);
    Object.assign(dest.apprenantParAttempt ?? {}, e.apprenantParAttempt);
    Object.assign(dest.aVerifierParAttempt??={},e.aVerifierParAttempt);
    Object.assign(dest.inscriptionCroiseeParAttempt ?? {}, e.inscriptionCroiseeParAttempt);
    for (const owner of Object.values(e.apprenantParAttempt ?? {})) candidats.add(owner);
    for (const d of e.dates) {
      let date = dest.dates.find(x => x.jour === d.jour);
      if (!date) { date = { ...d, attemptIds: [] }; dest.dates.push(date); }
      for (const id of d.attemptIds) if (!date.attemptIds.includes(id)) date.attemptIds.push(id);
    }
  }
  const list = [...examens.values()].sort((a,b) => Number(/^EB(\d+)/i.exec(a.exam_id)?.[1] ?? 99) - Number(/^EB(\d+)/i.exec(b.exam_id)?.[1] ?? 99) || a.exam_id.localeCompare(b.exam_id) || (a.circuit ?? "").localeCompare(b.circuit ?? ""));
  for (const e of list) e.dates.sort((a,b) => a.jour.localeCompare(b.jour));
  return { cle: TOUS_GROUPES, type: "indetermine", libelle: "Toutes les sessions — tous les passages remis", periode: null, debut: null, fin: null, tri: "", nbCandidats: candidats.size, examens: list };
}
export function numeroTentative(t: Pick<TentativeReelle,"snapshot">): string {
  const s = t.snapshot as unknown as { tentative?: unknown; source_historique?: { tentative?: unknown } };
  const v = s.source_historique?.tentative ?? s.tentative;
  return Number.isInteger(Number(v)) && Number(v) > 0 ? String(v) : "non enregistrée";
}
export function libellePassage(t: TentativeReelle): string {
  const date = t.finished_at ?? t.started_at;
  const instant = date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "date non enregistrée";
  return `${t.candidat} · ${instant} · tentative ${numeroTentative(t)} · ${t.attempt_id}`;
}
/** Only the same immutable imported source can complete a truncated QRC text. */
export function texteSourceExact(snapshot: unknown, questionId: string): string | null {
  const source = snapshot as { source_historique?: { result_id?: string; details?: { reponses?: Record<string, unknown> } } };
  if (!source?.source_historique?.result_id) return null;
  const rep = source.source_historique.details?.reponses?.[questionId];
  return typeof rep === "string" && rep.trim() ? rep : null;
}