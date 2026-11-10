import { canonique, lireOriginal, lireReponsesExactes } from "@/lib/originauxExacts";

const objet = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
export type RevisionServeur = { id: string; apprenant_id: string; exercice_id: string; reponses: unknown; updated_at: string; completed?: boolean | null; originaux_exacts?: any; reponses_meta?: any };
export type SourceRevision = { id: string; apprenant_id: string; quiz_id: string; matiere_id: string; matiere_nom?: string; tentative?: number | null; details: any };
export type EvenementRevision = { id: string; apprenant_id: string; exercice_id: string; question_id: string; created_at: string; valeur: unknown; valeur_originale?: unknown };
export type LigneRevision = { cle: string; revisionId: string; examen: string; revision: string; matiere: string; question: string; tentative: number | null; sourceId: string | null; initiale: unknown; derniere: unknown; type: string; heureQuestion: string | null; heureEtat: string; terminee: boolean; cause: string | null };

/** La ligne persistée fait foi, jamais le dernier événement reçu ni une tentative devinée. */
export function projeterRevisionsAdmin(apprenant: string, revisions: RevisionServeur[], sources: SourceRevision[], events: EvenementRevision[]): LigneRevision[] {
  const out: LigneRevision[] = [];
  for (const r of revisions) {
    if (r.apprenant_id !== apprenant) continue;
    const match = /^revision_fausses_(EB\d+(?:-(?:TAXI|ta|va))?)(?:__r(\d+))?$/i.exec(r.exercice_id);
    if (!match) continue;
    const exact = lireReponsesExactes(objet(r.reponses), r.originaux_exacts, r.reponses_meta);
    const root = objet(exact.reponses), state = objet(root.revisionState ?? root);
    const examen = match[1];
    const answers = objet(state.answers);
    for (const [key, derniere] of Object.entries(answers)) {
      const candidates = key.includes(":") ? [key] : (Array.isArray(state.questionOrder) ? state.questionOrder.filter((k: unknown) => typeof k === "string" && k.slice(k.indexOf(":") + 1) === key) : []);
      const identity = candidates.length === 1 ? String(candidates[0]) : null;
      const sep = identity?.indexOf(":") ?? -1;
      const matiere = identity && sep > 0 ? identity.slice(0, sep) : null;
      const question = identity && sep > 0 ? identity.slice(sep + 1) : key;
      const sourceId = identity ? objet(state.sourceResultIds)[identity] : null;
      const matches = sources.filter(s => s.id === sourceId && s.apprenant_id === apprenant && s.quiz_id === examen && s.matiere_id === matiere);
      const source = matches.length === 1 ? matches[0] : null;
      const snapshot = objet(source?.details?.snapshot);
      const qs = Array.isArray(snapshot.questions) ? snapshot.questions.filter((q: any) => String(q.id) === question || String(q.id) === identity) : [];
      const q = qs.length === 1 ? qs[0] : null;
      const rep = objet(source?.details?.reponses);
      const initialKeys = [question, identity].filter((k): k is string => !!k && Object.hasOwn(rep, k));
      const initiale = initialKeys.length === 1 ? rep[initialKeys[0]] : undefined;
      let cause = !identity || !matiere ? "Matière non prouvée (ancienne clé ambiguë)" : state.examenId && state.examenId !== examen ? "Examen contradictoire" : !source ? "Copie d’origine non liée" : !q ? "Question absente ou ambiguë dans le snapshot" : !source.tentative ? "Tentative non prouvée" : initialKeys.length !== 1 ? "Réponse initiale non prouvée" : null;
      if (Object.keys(exact.anomalies).length) cause = "Original exact non vérifiable";
      const evs = events.filter(e => e.apprenant_id === apprenant && e.exercice_id === r.exercice_id && e.question_id === key && Date.parse(e.created_at) <= Date.parse(r.updated_at));
      evs.sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
      const latest = evs[0];
      const atSameTime = latest ? evs.filter(e => e.created_at === latest.created_at) : [];
      const provenTime = latest && atSameTime.every(e => {
        const original = lireOriginal(e.valeur, e.valeur_originale);
        return ["exact", "sans_marqueur"].includes(original.statut) && canonique(original.valeur) === canonique(derniere);
      }) ? latest.created_at : null;
      out.push({ cle: `${r.id}:${key}`, revisionId:r.id, examen, revision: match[2] ?? "1", matiere: source?.matiere_nom ?? matiere ?? "À VÉRIFIER", question, tentative: cause ? null : source?.tentative ?? null, sourceId: cause ? null : source?.id ?? null, initiale: cause ? undefined : initiale, derniere, type: q?.type ?? (Array.isArray(derniere) ? "QCM" : "QRC"), heureQuestion: provenTime, heureEtat:r.updated_at, terminee:r.completed === true, cause });
    }
  }
  return out.sort((a,b) => Date.parse(b.heureEtat) - Date.parse(a.heureEtat) || a.cle.localeCompare(b.cle));
}