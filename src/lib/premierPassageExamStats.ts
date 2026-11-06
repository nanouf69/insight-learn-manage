import { activeLearners, activeSessions, sessionMode, type QuestionRate, type QuestionStatsTarget, type SessionStats, type InscriptionStats, type SessionMode, type SessionFirstPassage, type AttemptStats, type FirstAnswerEvent } from './premierPassageStats';

/** Admin statistics only: TA reads its own exam, never changes the VTC/TAXI scope. */
export function firstPassageExamIds(examId: string): string[] {
  if (/^eb[1-6]-ta$/.test(examId)) return [examId];
  const match = examId.match(/^EB([1-6])(?:-TAXI)?$/);
  return match ? [`EB${match[1]}`, `EB${match[1]}-TAXI`] : [];
}

type FrozenQuestion = { id: string | number; matiere?: string; type?: string; enonce?: string; choix?: QuestionStatsTarget['choix'] | null };
export type ExamStatsAttempt = { attempt_id: string; apprenant_id: string; exam_id: string; started_at: string; is_test: boolean; snapshot: { matiere?: string; questions?: FrozenQuestion[]; source_historique?: unknown } };
export type ExamStatsEvent = { event_id: number; attempt_id: string; apprenant_id: string; question_id: string; valeur_nouvelle: unknown; valeur_precedente: unknown; revision_precedente: number | null; revision_nouvelle: number; auteur: string | null; created_at: string };
export type ExamStatsResult = { id: string; apprenant_id: string; quiz_id: string; matiere_id: string; tentative: number | null; completed_at: string; details: { snapshot?: { questions?: FrozenQuestion[] }; reponses?: Record<string, unknown> } | null };
export type ExamStatsRetake = { apprenant_id: string; exam_id: string; matiere_id: string; attempt_id: string | null; exercice_id: string; created_at: string };
export type ExamStatsState = {attempt_id:string;apprenant_id:string;question_id:string;valeur:unknown};
export type ExamStatsAccount = {id:string;auth_user_id:string|null};
export type ExamStatsEvidence = { attempts: ExamStatsAttempt[]; events: ExamStatsEvent[]; states?:ExamStatsState[]; legacy: AttemptStats[]; journal: FirstAnswerEvent[]; results: ExamStatsResult[]; retakes: ExamStatsRetake[]; accounts:ExamStatsAccount[] };
const values = (v: unknown): string[] | null => Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string' && x.trim()) ? [...v].sort() : null;
const hasAnswer = (v: unknown) => typeof v === 'string' ? !!v.trim() : Array.isArray(v) && v.length > 0;
const same = (a: unknown, b: unknown) => values(a) !== null && JSON.stringify(values(a)) === JSON.stringify(values(b));
const blankRate = (): QuestionRate => ({incorrect:0,total:0,unknown:0,jour:{incorrect:0,total:0},soir:{incorrect:0,total:0},mixte:0});
/** Matching text/choices only validates a stable exam+subject+ID identity; never joins by text. */
function grade(q: QuestionStatsTarget, frozen: FrozenQuestion | undefined, answer: unknown): boolean | null {
  if (q.type !== 'QCM' || frozen?.type !== 'QCM' || frozen.enonce !== q.enonce || !values(answer)) return null;
  const choices = frozen.choix;
  if (!choices?.length || JSON.stringify(choices.map(c=>[c.lettre,c.texte])) !== JSON.stringify(q.choix.map(c=>[c.lettre,c.texte]))) return null;
  const keys = choices.filter(c=>c.correct === true).map(c=>c.lettre);
  if (!keys.length || new Set(choices.map(c=>c.lettre)).size !== choices.length || values(answer)?.some(v=>!choices.some(c=>c.lettre===v))) return null;
  return same(answer, keys);
}

export function computeExamFirstPassage(questions: QuestionStatsTarget[], examIds: string[], subject: string, population: Map<string,Set<SessionMode>>, evidence: ExamStatsEvidence): Record<string,QuestionRate> {
  return Object.fromEntries(questions.map(q=> {
    const rate=blankRate();
    for (const [learner,modes] of population) {
      const observations: {at:string; correct:boolean|null; answer:unknown}[]=[];
      let uncertain=false;
      const attempts=evidence.attempts.filter(a=>a.apprenant_id===learner && examIds.includes(a.exam_id) && !a.is_test && !a.snapshot.source_historique);
      for (const a of attempts) {
        const qid=`${subject}:${q.id}`;
        const frozen=a.snapshot.questions?.filter(f=>f.matiere===subject && String(f.id)===qid);
        if (!frozen?.length) continue;
        const events=evidence.events.filter(e=>e.apprenant_id===learner && e.attempt_id===a.attempt_id && e.question_id===qid && hasAnswer(e.valeur_nouvelle)).sort((x,y)=>x.created_at.localeCompare(y.created_at) || x.event_id-y.event_id);
        const first=events[0];
        if (!first) {if(evidence.states?.some(s=>s.attempt_id===a.attempt_id && s.apprenant_id===learner && s.question_id===qid && hasAnswer(s.valeur)))uncertain=true;continue;}
        const retake=evidence.retakes.some(r=>r.apprenant_id===learner && r.attempt_id===a.attempt_id);
        const proven=!retake && frozen.length===1 && first.auteur===learner && first.revision_precedente===0 && first.revision_nouvelle===1 && !hasAnswer(first.valeur_precedente) && first.created_at>=a.started_at && Number.isFinite(Date.parse(first.created_at));
        observations.push({at:first.created_at,correct:proven?grade(q,frozen[0],first.valeur_nouvelle):null,answer:first.valeur_nouvelle});
      }
      for (const exam of examIds) {
        const base=`${exam}__${subject}`;
        const rows=evidence.legacy.filter(a=>a.apprenant_id===learner && (a.exercice_id===base || a.exercice_id.startsWith(`${base}__t`)));
        for (const row of rows) {
          const answer=row.reponses?.[String(q.id)];
          if (!hasAnswer(answer)) continue;
          const history=evidence.journal.filter(e=>e.apprenant_id===learner && e.exercice_id===row.exercice_id && e.question_id===String(q.id) && e.tentative===1 && hasAnswer(e.valeur)).sort((a,b)=>a.created_at.localeCompare(b.created_at));
          const first=history[0];
          if (!first || row.tentative!==1 || row.exercice_id!==base) {uncertain=true;continue;}
          const results=evidence.results.filter(r=>r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && r.tentative===1 && row.submitted_at===r.completed_at && same(r.details?.reponses?.[String(q.id)],answer));
          const frozen=results.length===1 ? results[0].details?.snapshot?.questions?.filter(f=>String(f.id)===String(q.id)) : undefined;
          const retake=evidence.retakes.some(r=>r.apprenant_id===learner && r.exercice_id===row.exercice_id);
          const proven=!retake && row.status==='submitted' && !!row.submitted_at && first.created_at<=row.submitted_at && Number.isFinite(Date.parse(first.created_at)) && same(first.valeur,answer) && history.filter(e=>e.created_at===first.created_at).every(e=>same(e.valeur,answer)) && frozen?.length===1;
          observations.push({at:first.created_at,correct:proven?grade(q,frozen?.[0],first.valeur):null,answer:first.valeur});
        }
        // An imported/result-only copy proves a prior answer exists, not its first choice.
        const resultOnly=evidence.results.some(r=>r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && hasAnswer(r.details?.reponses?.[String(q.id)]) && !rows.some(row=>hasAnswer(row.reponses?.[String(q.id)])));
        if(resultOnly)uncertain=true;
        const imported=evidence.attempts.some(a=>a.apprenant_id===learner && a.exam_id===exam && !a.is_test && a.snapshot.source_historique && a.snapshot.questions?.some(f=>f.matiere===subject && String(f.id)===String(q.id)) && evidence.states?.some(s=>s.attempt_id===a.attempt_id && s.apprenant_id===learner && s.question_id===String(q.id) && hasAnswer(s.valeur)) && !rows.some(row=>hasAnswer(row.reponses?.[String(q.id)])));
        if(imported)uncertain=true;
      }
      observations.sort((a,b)=>a.at.localeCompare(b.at));
      const first=observations[0];
      if (!first) {if(uncertain)rate.unknown++;continue;}
      const ties=observations.filter(o=>o.at===first.at);
      if(uncertain || first.correct===null || ties.some(o=>o.correct!==first.correct || !same(o.answer,first.answer))) {rate.unknown++;continue;}
      rate.total++;if(!first.correct)rate.incorrect++;
      if(modes.size>1)rate.mixte++;
      for(const mode of modes){rate[mode].total++;if(!first.correct)rate[mode].incorrect++;}
    }
    return [String(q.id),rate];
  }));
}

export function computeExamSessionFirstPassage(questions:QuestionStatsTarget[], examIds:string[], subject:string, sessions:SessionStats[], enrollments:InscriptionStats[], today:string, excluded:Set<string>, evidence:ExamStatsEvidence):SessionFirstPassage {
  const retained=activeSessions(sessions,today);
  const population=activeLearners(retained,enrollments,today,excluded);
  const compute=(p:Map<string,Set<SessionMode>>)=>computeExamFirstPassage(questions,examIds,subject,p,evidence);
  return {today,rates:compute(population),modeRates:{jour:compute(new Map([...population].filter(([,m])=>m.has('jour')))),soir:compute(new Map([...population].filter(([,m])=>m.has('soir'))))},sessions:retained.map(s=>({...s,mode:sessionMode(s),eligible:activeLearners([s],enrollments,today,excluded).size})),sessionRates:Object.fromEntries(retained.map(s=>[s.id,compute(activeLearners([s],enrollments,today,excluded))]))};
}