import type { CoreMatiereState } from "@/lib/coreExamPublication";
import { attacherSourceUnique, noteExamenAffichee } from "@/lib/noteExamenAffichee";
import { isQrcCorrectionValidated } from "@/components/cours-en-ligne/exam-helpers";
import { computeMoyenneExamen, computeMatiereScoreForAttempt } from "@/components/cours-en-ligne/examens-blancs-scoring";
import type { ExamenBlanc } from "@/components/cours-en-ligne/examens-blancs-data";

export const DELAI_CONFIRMATION_NOTE_MS = 5_000;
export type StatutMatiereGlobale = {
  id: string; nom: string; copieId: string; terminee: boolean;
  qrc: "validees" | "en_attente" | "inconnues";
  publication: "publiee" | "absente" | "a_verifier";
  cause: string | null;
};
export type ObservationNoteGlobale = {
  cle: string; apprenantId: string; nom: string; filiere: "TAXI" | "VTC";
  examen: string; tentative: number; matieres: StatutMatiereGlobale[];
  signature: string; prete: boolean; publiee: boolean; cause: string;
};
export type DefinitionSurveillee = { id: string; type: "TAXI" | "VTC"; matieres: { id: string; nom: string; coefficient?: number; noteEliminatoire?: number }[] };

const numero = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && Number.isInteger(n) && n > 0 ? n : null;
};
const dateValide = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));

/** Only recorded copies and immutable links, never timestamps or older-subject fill. */
export function observerNotesGlobales(p: {
  apprenant: { id: string; nom: string; prenom: string };
  rows: any[]; states: CoreMatiereState[]; nonFiables: Set<string>;
  examens: DefinitionSurveillee[];
}): ObservationNoteGlobale[] {
  const out: ObservationNoteGlobale[] = [];
  for (const exam of p.examens) {
    if (exam.matieres.length !== 7 || new Set(exam.matieres.map(m => m.id)).size !== 7) continue;
    const rows = p.rows.filter(r => r.apprenant_id === p.apprenant.id && r.quiz_id === exam.id && r.matiere_id && dateValide(r.completed_at));
    const states = p.states.filter(s => s.apprenantId === p.apprenant.id && s.examId === exam.id && !s.neutralise && !s.isTest);
    // A V2 copy may have its tentative only in its explicitly linked legacy row.
    const tentativeState = (s: CoreMatiereState) => numero(s.tentative) ?? numero(rows.find(r => r.id === s.resultId || s.provenResultIds?.includes(r.id))?.tentative);
    const tentatives = new Set<number>();
    rows.forEach(r => { const n = numero(r.tentative); if (n) tentatives.add(n); });
    states.forEach(s => { const n = tentativeState(s); if (n) tentatives.add(n); });
    for (const tentative of tentatives) {
      const matieres = exam.matieres.map((m): StatutMatiereGlobale => {
        const rs = rows.filter(r => numero(r.tentative) === tentative && r.matiere_id === m.id);
        const ss = states.filter(s => tentativeState(s) === tentative && s.matiereId === m.id);
        const row = rs.length === 1 ? rs[0] : null;
        const state = ss.length === 1 ? ss[0] : null;
        const base = { id: m.id, nom: m.nom, copieId: state?.attemptId ?? row?.id ?? "", terminee: !!(row || state) };
        if (rs.length > 1 || ss.length > 1 || (row && state && !(state.resultId === row.id || state.provenResultIds?.includes(row.id)))) {
          return { ...base, qrc: "inconnues", publication: "a_verifier", cause: "Liaison copie/passage ambiguë" };
        }
        if (state) {
          const questions = state.questions ?? state.historicalDetails?.snapshot?.questions ?? state.historicalDetails?.questions;
          if (!Array.isArray(questions) || questions.length === 0) return { ...base, qrc: "inconnues", publication: "a_verifier", cause: "Questions figées absentes" };
          const ids = questions.filter((q: any) => String(q.type).toUpperCase() === "QRC").map((q: any) => String(q.id ?? q.questionId));
          const proofs = state.qrcProofs ?? [];
          const normalize = (id: string) => id.startsWith(`${m.id}:`) ? id.slice(m.id.length + 1) : id;
          const complete = new Set(ids.map(normalize)).size === ids.length && ids.every((id: string) => proofs.filter(q => normalize(q.questionId) === normalize(id)).length === 1);
          const validated = complete && proofs.length === ids.length && proofs.every(q => q.etat === "corrigee" && q.note != null && Number.isFinite(q.note));
          const qrc = !complete ? "inconnues" : validated ? "validees" : "en_attente";
          const projected = row ? attacherSourceUnique(row, p.states, p.nonFiables) : null;
          const visible = projected && noteExamenAffichee(projected).etat === "note";
          const publication = visible && !state.pending && state.publishedAt !== null ? "publiee" : "absente";
          const cause = publication === "publiee" ? null : !row ? "Résultat matière absent du circuit d’affichage" : state.status == null ? "Résultat serveur absent" : state.qrcRestantes > 0 && validated ? "Compteur QRC serveur obsolète" : state.pending ? "Note matière non publiée définitivement" : "Liaison ou projection du résultat non vérifiable";
          return { ...base, qrc, publication, cause };
        }
        if (!row) return { ...base, qrc: "inconnues", publication: "absente", cause: "Matière non terminée" };
        const qs = row.details?.snapshot?.questions ?? row.details?.questions;
        if (!Array.isArray(qs) || qs.length === 0) return { ...base, qrc: "inconnues", publication: "a_verifier", cause: "Copie historique sans questions figées" };
        const qrcs = qs.filter((q: any) => String(q.type).toUpperCase() === "QRC");
        const corr = row.details?.correctionsIA ?? row.details?.snapshot?.correctionsIA ?? {};
        const validated = qrcs.every((q: any) => {
          const id = String(q.questionId ?? q.id);
          return isQrcCorrectionValidated(corr[id] ?? corr[`Q${id}`]);
        });
        const published = noteExamenAffichee(attacherSourceUnique(row, p.states, p.nonFiables)).etat === "note";
        return { ...base, qrc: validated ? "validees" : "en_attente", publication: published ? "publiee" : "absente", cause: published ? null : "Note historique absente ou non publiable" };
      });
      const cle = `${p.apprenant.id}:${exam.id}:T${tentative}`;
      const causes = Array.from(new Set(matieres.map(m => m.cause).filter(Boolean)));
      let publiee = matieres.every(m => m.publication === "publiee");
      if (publiee) {
        const bilan = computeMoyenneExamen(exam as ExamenBlanc, m => {
          const r = rows.find(r => numero(r.tentative) === tentative && r.matiere_id === m.id);
          return r ? computeMatiereScoreForAttempt(m, attacherSourceUnique(r, p.states, p.nonFiables)) : null;
        });
        publiee = bilan.verdict === "reussi" || bilan.verdict === "echoue";
        if (!publiee) causes.push("Verdict global non déterminé par le calcul d’affichage habituel");
      }
      out.push({ cle, apprenantId: p.apprenant.id, nom: `${p.apprenant.nom} ${p.apprenant.prenom}`.trim(), filiere: exam.type, examen: exam.id, tentative, matieres,
        signature: JSON.stringify([matieres.map(m => [m.copieId, m.qrc, m.publication, m.cause]), publiee]),
        prete: matieres.every(m => m.terminee && m.qrc === "validees"),
        publiee, cause: causes.join(" ; ") });
    }
  }
  return out;
}

export type AlerteNoteGlobale = ObservationNoteGlobale & { heure: string };
/** A fresh successful second server read is mandatory, irrespective of browser time. */
export function confirmerAlertesNotes(
  precedentes: Map<string, { signature: string; observee: number }>, observations: ObservationNoteGlobale[],
  maintenant: number,
): { alertes: AlerteNoteGlobale[]; prochaines: Map<string, { signature: string; observee: number }>; aConfirmer: boolean } {
  const prochaines = new Map<string, { signature: string; observee: number }>();
  const alertes: AlerteNoteGlobale[] = [];
  let aConfirmer = false;
  for (const o of observations) {
    if (!o.prete || o.publiee) continue;
    const prev = precedentes.get(o.cle);
    const first = prev?.signature === o.signature ? prev : { signature: o.signature, observee: maintenant };
    prochaines.set(o.cle, first);
    if (prev?.signature === o.signature && maintenant - first.observee >= DELAI_CONFIRMATION_NOTE_MS) alertes.push({ ...o, heure: new Date(first.observee).toISOString() });
    else aConfirmer = true;
  }
  return { alertes, prochaines, aConfirmer };
}