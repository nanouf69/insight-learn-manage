import { proveNativeMirrors } from '@/features/correction-qrc-v2/preuveMiroir';
import { activeLearners, activeSessions, sessionMode, type FirstPassageDetail, type QuestionRate, type QuestionStatsTarget, type SessionStats, type InscriptionStats, type SessionMode, type SessionFirstPassage, type AttemptStats, type FirstAnswerEvent } from './premierPassageStats';

/** Admin statistics only: TA reads its own exam, never changes the VTC/TAXI scope. */
export function firstPassageExamIds(examId: string): string[] {
  if (/^eb[1-6]-ta$/.test(examId)) return [examId];
  const match = examId.match(/^EB([1-6])(?:-TAXI)?$/);
  return match ? [`EB${match[1]}`, `EB${match[1]}-TAXI`] : [];
}

type FrozenQuestion = { reponseQRC?: string | null; id: string | number; matiere?: string; type?: string; enonce?: string; points?: number | string; choix?: QuestionStatsTarget['choix'] | null };
export type ExamStatsAttempt = { attempt_id: string; apprenant_id: string; exam_id: string; exam_version_id?: string; started_at: string; finished_at?: string | null; etat?: string; is_test: boolean; snapshot: { matiere?: string; questions?: FrozenQuestion[]; source_historique?: unknown; tentative?: number } };
export type ExamStatsEvent = { event_id: number; attempt_id: string; apprenant_id: string; question_id: string; valeur_nouvelle: unknown; valeur_precedente: unknown; revision_precedente: number | null; revision_nouvelle: number; auteur: string | null; created_at: string };
export type ExamStatsResult = { id: string; apprenant_id: string; quiz_id: string; matiere_id: string; tentative: number | null; completed_at: string; details: { snapshot?: { questions?: FrozenQuestion[] }; reponses?: Record<string, unknown> } | null };
export type ExamStatsRetake = { apprenant_id: string; exam_id: string; matiere_id: string; attempt_id: string | null; exercice_id: string; created_at: string };
export type ExamStatsState = {attempt_id:string;apprenant_id:string;question_id:string;valeur:unknown};
export type ExamStatsAccount = {id:string;auth_user_id:string|null;nom?:string;prenom?:string};
export type ExamStatsQrc = { qrc_instance_id:string; attempt_id:string; apprenant_id:string; question_id:string; reponse:unknown; etat:string; note:number|string|null; corrige_email:string|null };
export type ExamStatsQrcIa = { qrc_instance_id:string; statut:string; note:number|string|null; bareme:number|string|null };
export type ExamStatsEvidence = { attempts: ExamStatsAttempt[]; events: ExamStatsEvent[]; states?:ExamStatsState[]; legacy: AttemptStats[]; journal: FirstAnswerEvent[]; results: ExamStatsResult[]; retakes: ExamStatsRetake[]; accounts:ExamStatsAccount[]; qrc?:ExamStatsQrc[]; qrcIa?:ExamStatsQrcIa[] };
const values = (v: unknown): string[] | null => Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'string' && x.trim()) ? [...v].sort() : null;
const hasAnswer = (v: unknown) => typeof v === 'string' ? !!v.trim() : Array.isArray(v) && v.length > 0;
const same = (a: unknown, b: unknown) => typeof a==='string' || typeof b==='string' ? a===b : values(a) !== null && JSON.stringify(values(a)) === JSON.stringify(values(b));
const blankRate = (): QuestionRate => ({incorrect:0,total:0,unknown:0,jour:{incorrect:0,total:0},soir:{incorrect:0,total:0},mixte:0,details:[]});
/** Matching text/choices only validates a stable exam+subject+ID identity; never joins by text. */
function grade(q: QuestionStatsTarget, frozen: FrozenQuestion | undefined, answer: unknown): boolean | null {
  if (q.type !== 'QCM' || frozen?.type !== 'QCM' || frozen.enonce !== q.enonce || !values(answer)) return null;
  const choices = frozen.choix;
  if (!choices?.length || JSON.stringify(choices.map(c=>[c.lettre,c.texte])) !== JSON.stringify(q.choix.map(c=>[c.lettre,c.texte]))) return null;
  const keys = choices.filter(c=>c.correct === true).map(c=>c.lettre);
  if (!keys.length || new Set(choices.map(c=>c.lettre)).size !== choices.length || values(answer)?.some(v=>!choices.some(c=>c.lettre===v))) return null;
  return same(answer, keys);
}

/** Statistique seule : QCM réussi = toutes les bonnes cases et aucune mauvaise.
 * Une QRC est évaluée sur sa copie soumise, jamais sur la première lettre tapée.
 * Réussie uniquement avec tous les points ; une note partielle compte comme
 * un échec statistique sans modifier sa note pédagogique. Attente = exclue.
 * Humain prioritaire ; IA seulement avec sa preuve appliquée au même barème et à la même note. */
function gradeQrc(q:QuestionStatsTarget,frozen:FrozenQuestion|undefined,qrc:ExamStatsQrc|undefined,corrections:ExamStatsQrcIa[]):boolean|null {
  if(q.type!=='QRC' || frozen?.type!=='QRC' || frozen.enonce!==q.enonce || !qrc || qrc.etat!=='corrigee' || qrc.note==null)return null;
  const max=Number(frozen.points);const note=Number(qrc.note);
  if(!Number.isFinite(max) || max<=0 || !Number.isFinite(note) || note<0 || note>max)return null;
  const email=(qrc.corrige_email??'').trim().toLowerCase();
  if(!email || email.startsWith('auto:') || email.startsWith('correction historique importée'))return null;
  if(email.startsWith('ia:')) {
    const applied=corrections.some(c=>c.qrc_instance_id===qrc.qrc_instance_id && c.statut==='appliquee' && Number(c.bareme)===max && Number(c.note)===note);
    if(!applied)return null;
  }
  return note===max;
}

export function computeExamFirstPassage(questions: QuestionStatsTarget[], examIds: string[], subject: string, population: Map<string,Set<SessionMode>>, evidence: ExamStatsEvidence): Record<string,QuestionRate> {
  const mirrorProof=proveNativeMirrors(evidence.results,evidence.attempts.map(a=>({...a,matiere:a.snapshot.matiere})),evidence.states??[]);
  const resultsWithoutMirrors=evidence.results.filter(r=>!mirrorProof.mirrors.has(r.id));
  return Object.fromEntries(questions.map(q=> {
    const rate=blankRate();
    for (const [learner,modes] of population) {
      const observations: {at:string; correct:boolean|null; answer:unknown; detail:Partial<FirstPassageDetail>}[]=[];
      let uncertain=false;
      const account=evidence.accounts.find(a=>a.id===learner);
      const candidate=[account?.prenom,account?.nom].filter(Boolean).join(" ") || learner;
      const addDetail=(first:typeof observations[number]|undefined,verdict:FirstPassageDetail["verdict"],reason?:string)=>rate.details?.push({learnerId:learner,candidate,answer:first?.answer??null,at:first?.at,...first?.detail,verdict,reason});
      const attempts=evidence.attempts.filter(a=>a.apprenant_id===learner && examIds.includes(a.exam_id) && !a.is_test && !a.snapshot.source_historique);
      for (const a of attempts) {
        const qid=`${subject}:${q.id}`;
        const frozen=a.snapshot.questions?.filter(f=>f.matiere===subject && String(f.id)===qid);
        if (!frozen?.length) continue;
        if(q.type==='QRC') {
          const copies=evidence.qrc?.filter(c=>c.apprenant_id===learner && c.attempt_id===a.attempt_id && c.question_id===qid)??[];
          const copy=copies[0];
          if(!copy || !hasAnswer(copy.reponse))continue;
          // A later retake must never remove the independently proven first copy.
          if(evidence.retakes.some(r=>r.apprenant_id===learner && r.attempt_id===a.attempt_id)) continue;
          const submitted=a.etat==='terminee' && !!a.finished_at && Number.isFinite(Date.parse(a.finished_at));
          const correct=submitted && copies.length===1 ? gradeQrc(q,frozen.length===1?frozen[0]:undefined,copy,evidence.qrcIa??[]) : null;
          observations.push({at:a.started_at,correct,answer:copy.reponse,detail:{passage:a.attempt_id,exam:a.exam_id,subject,version:a.exam_version_id, tentative:a.snapshot.tentative??null,expected:frozen[0]?.reponseQRC,points:frozen[0]?.points,reason:correct===null?(submitted?"QRC non notée ou correction / barème non prouvé":"Passage non remis"):undefined}});
          continue;
        }
        const events=evidence.events.filter(e=>e.apprenant_id===learner && e.attempt_id===a.attempt_id && e.question_id===qid && hasAnswer(e.valeur_nouvelle)).sort((x,y)=>x.created_at.localeCompare(y.created_at) || x.event_id-y.event_id);
        const first=events[0];
        if (!first) {if(evidence.states?.some(s=>s.attempt_id===a.attempt_id && s.apprenant_id===learner && s.question_id===qid && hasAnswer(s.valeur)))uncertain=true;continue;}
        const retake=evidence.retakes.some(r=>r.apprenant_id===learner && r.attempt_id===a.attempt_id);
        const authUserId=evidence.accounts.find(account=>account.id===learner)?.auth_user_id;
        // Le trigger enregistre INSERT avec revision_precedente NULL et l'auteur avec auth.uid().
        const proven=a.etat==='terminee' && !!a.finished_at && first.created_at<=a.finished_at && !retake && frozen.length===1 && !!authUserId && first.auteur===authUserId && first.revision_precedente==null && first.revision_nouvelle===1 && !hasAnswer(first.valeur_precedente) && first.created_at>=a.started_at && Number.isFinite(Date.parse(first.created_at));
        observations.push({at:first.created_at,correct:proven?grade(q,frozen[0],first.valeur_nouvelle):null,answer:first.valeur_nouvelle,detail:{passage:a.attempt_id,exam:a.exam_id,subject,version:a.exam_version_id,tentative:a.snapshot.tentative??null,expected:frozen[0]?.choix?.filter(c=>c.correct===true).map(c=>c.lettre),points:frozen[0]?.points,reason:a.etat!=="terminee"?"Passage non remis":"Première révision, identité ou contenu figé non prouvé"}});
      }
      for (const exam of examIds) {
        const base=`${exam}__${subject}`;
        const rows=evidence.legacy.filter(a=>a.apprenant_id===learner && (a.exercice_id===base || a.exercice_id.startsWith(`${base}__t`)));
        for (const row of rows) {
          // A proven full-copy mirror is not an independent first answer.
          if(evidence.results.some(r=>mirrorProof.mirrors.has(r.id) && r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && r.tentative===row.tentative && r.completed_at===row.submitted_at && JSON.stringify(r.details?.reponses)===JSON.stringify(row.reponses)))continue;
          const answer=row.reponses?.[String(q.id)];
          if (!hasAnswer(answer)) continue;
          if(q.type==='QRC') {
            // Typing/drafts are not submitted QRC observations. The native copy
            // owns its correction; its legacy mirror cannot invalidate that proof.
            if(row.status!=='submitted' || !row.submitted_at) continue;
            const mirrored=attempts.some(a=>a.exam_id===exam && a.etat==='terminee' && a.finished_at===row.submitted_at && evidence.qrc?.some(c=>c.attempt_id===a.attempt_id && c.apprenant_id===learner && c.question_id===`${subject}:${q.id}` && same(c.reponse,answer)));
            if(!mirrored) observations.push({at:row.submitted_at,correct:null,answer,detail:{passage:row.exercice_id,exam,subject,tentative:row.tentative,reason:"QRC historique sans correction native prouvée"}});
            continue;
          }
          const history=evidence.journal.filter(e=>e.apprenant_id===learner && e.exercice_id===row.exercice_id && e.question_id===String(q.id) && e.tentative===1 && hasAnswer(e.valeur)).sort((a,b)=>a.created_at.localeCompare(b.created_at));
          const first=history[0];
          if (!first || row.tentative!==1 || row.exercice_id!==base) {uncertain=true;continue;}
          const results=evidence.results.filter(r=>r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && r.tentative===1 && row.submitted_at===r.completed_at && same(r.details?.reponses?.[String(q.id)],answer));
          const frozen=results.length===1 ? results[0].details?.snapshot?.questions?.filter(f=>String(f.id)===String(q.id)) : undefined;
          const retake=evidence.retakes.some(r=>r.apprenant_id===learner && r.exercice_id===row.exercice_id);
          const proven=!retake && row.status==='submitted' && !!row.submitted_at && first.created_at<=row.submitted_at && Number.isFinite(Date.parse(first.created_at)) && same(first.valeur,answer) && history.filter(e=>e.created_at===first.created_at).every(e=>same(e.valeur,answer)) && frozen?.length===1;
          observations.push({at:first.created_at,correct:proven?grade(q,frozen?.[0],first.valeur):null,answer:first.valeur,detail:{passage:results[0]?.id??row.exercice_id,exam,subject,tentative:row.tentative,version:results[0]?.id,expected:frozen?.[0]?.choix?.filter(c=>c.correct===true).map(c=>c.lettre),points:frozen?.[0]?.points}});
        }
        // An imported/result-only copy proves a prior answer exists, not its first choice.
        const resultOnly=resultsWithoutMirrors.some(r=>r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && hasAnswer(r.details?.reponses?.[String(q.id)]) && !rows.some(row=>hasAnswer(row.reponses?.[String(q.id)])));
        if(resultOnly && q.type!=='QRC')uncertain=true;
        if(q.type==='QRC') for(const r of resultsWithoutMirrors.filter(r=>r.apprenant_id===learner && r.quiz_id===exam && r.matiere_id===subject && hasAnswer(r.details?.reponses?.[String(q.id)]))) {
          const answer=r.details?.reponses?.[String(q.id)];
          const mirrored=attempts.some(a=>a.exam_id===exam && a.etat==='terminee' && a.finished_at===r.completed_at && evidence.qrc?.some(c=>c.attempt_id===a.attempt_id && c.apprenant_id===learner && c.question_id===`${subject}:${q.id}` && same(c.reponse,answer)));
          if(!mirrored) observations.push({at:r.completed_at,correct:null,answer,detail:{passage:r.id,exam,subject,tentative:r.tentative,version:r.id,reason:"Correction historique non prouvée"}});
        }
        const imported=evidence.attempts.some(a=>a.apprenant_id===learner && a.exam_id===exam && !a.is_test && a.snapshot.source_historique && a.snapshot.questions?.some(f=>f.matiere===subject && String(f.id)===String(q.id)) && evidence.states?.some(s=>s.attempt_id===a.attempt_id && s.apprenant_id===learner && s.question_id===String(q.id) && hasAnswer(s.valeur)) && !rows.some(row=>hasAnswer(row.reponses?.[String(q.id)])));
        if(imported)uncertain=true;
      }
      observations.sort((a,b)=>a.at.localeCompare(b.at));
      const first=observations[0];
      if (!first) {if(uncertain){rate.unknown++;addDetail(undefined,"unknown","Réponse présente, mais première réponse / remise / identité non prouvée");}continue;}
      const ties=observations.filter(o=>o.at===first.at);
      if(uncertain || first.correct===null || ties.some(o=>o.correct!==first.correct || !same(o.answer,first.answer))) {rate.unknown++;addDetail(first,"unknown",first.detail.reason??"Première réponse non prouvée ou preuves contradictoires");continue;}
      addDetail(first,first.correct?"correct":"incorrect");
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