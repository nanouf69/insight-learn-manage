export type SessionStats = { id: string; date_debut: string; date_fin: string; statut?: string | null; heure_debut?: string | null; creneaux?: string[] | null; nom?: string | null };
export type InscriptionStats = { apprenant_id: string; session_id: string; date_debut?: string | null; date_fin?: string | null; date_fin_personnalisee?: string | null; liste_attente?: boolean | null };
export type QuestionStatsTarget = { id: number; enonce: string; type?: string; choix: { lettre: string; texte: string; correct?: boolean }[] };
export type SourceStats = { module: number; exercise: number };
export type AttemptStats = { apprenant_id: string; exercice_id: string; tentative: number | null; status: string | null; submitted_at: string | null; reponses: Record<string, unknown> | null };
export type CompletionStats = { apprenant_id: string; module_id: number; status: string; completed_at: string | null; details: unknown };
export type QuestionRate = { incorrect: number; total: number; unknown: number; jour: { incorrect: number; total: number }; soir: { incorrect: number; total: number }; mixte: number };
const answered = (value: unknown): boolean => Array.isArray(value) ? value.length > 0 && value.every(v => typeof v === 'string' && v.trim().length > 0) : typeof value === 'string' && value.trim().length > 0;
const letters = (value: unknown): string[] => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []).filter((v): v is string => typeof v === 'string').sort();
const equal = (a: unknown,b: unknown) => JSON.stringify(letters(a)) === JSON.stringify(letters(b));
export function activeLearners(sessions: SessionStats[], enrollments: InscriptionStats[], today: string, excluded: Set<string> = new Set()) {
  const result = new Map<string,Set<'jour'|'soir'>>();
  for (const e of enrollments) {
    const s = sessions.find(s => s.id === e.session_id);
    if (!s || e.liste_attente || excluded.has(e.apprenant_id) || /annul|termin/i.test(s.statut ?? '') || s.date_debut > today || s.date_fin < today) continue;
    const start = e.date_debut ?? s.date_debut;
    const end = e.date_fin_personnalisee ?? e.date_fin ?? s.date_fin;
    if(start > today || end < today) continue;
    const labels=(s.creneaux ?? []).join(' ');
    const soir = /soir/i.test(labels) || Number((s.heure_debut ?? '').split(':')[0]) >= 17 || /soir/i.test(s.nom ?? '');
    const group=result.get(e.apprenant_id) ?? new Set<'jour'|'soir'>();group.add(soir ? 'soir' : 'jour');result.set(e.apprenant_id,group);
  }
  return result;
}
/** Only explicit attempt 1 + submitted answers + matching frozen module evidence.
 * Current answer keys and scores are NEVER used for historical grading. */
export function computeFirstPassage(targets: QuestionStatsTarget[], sources: SourceStats[], learners: Map<string,Set<'jour'|'soir'>>, attempts: AttemptStats[], completions: CompletionStats[]) {
  return Object.fromEntries(targets.map(q => {
    const rate: QuestionRate = { incorrect:0,total:0,unknown:0,jour:{incorrect:0,total:0},soir:{incorrect:0,total:0},mixte:0 };
    for (const [learner,modes] of learners) {
      const observations: { at: string; correct: boolean | null; value: unknown }[]=[];
      let uncertain=false;
      for(const source of sources) {
        const id=`module_${source.module}_exo_${source.exercise}`;
        const rows=attempts.filter(a=>a.apprenant_id===learner && a.exercice_id===id);
        for(const row of rows) {
          const answer=row.reponses?.[`${source.exercise}-${q.id}`] ?? row.reponses?.[String(q.id)];
          if(!answered(answer))continue;
          if(row.tentative!==1){if(!rows.some(r=>r.tentative===1))uncertain=true;continue;}
          if(row.status!=='submitted' || !row.submitted_at){uncertain=true;continue;}
          const proofs=completions.filter(c=>c.apprenant_id===learner && c.module_id===source.module && c.status==='completed' && c.completed_at && c.completed_at>=row.submitted_at);
          const details=proofs.flatMap(c=>Array.isArray(c.details)?c.details:[]).filter(d=>String(d?.exerciceId)===String(source.exercise) && String(d?.questionId)===String(q.id) && d?.enonce===q.enonce && equal(d?.reponseEleve,answer));
          const keys=details.filter(d=>answered(d?.reponseCorrecte) && typeof d?.correct==='boolean');
          // A module frozen after a retake cannot prove the first attempt's key.
          const retaken=rows.some(r=>(r.tentative ?? 0)>1 && r.submitted_at && proofs.some(c=>c.completed_at && r.submitted_at && r.submitted_at<=c.completed_at));
          const results=keys.map(d=>equal(answer,d.reponseCorrecte));
          const correct=!retaken && results.length>0 && results.every(r=>r===results[0]) ? results[0] : null;
          observations.push({at:row.submitted_at,correct,value:answer});
        }
      }
      observations.sort((a,b)=>a.at.localeCompare(b.at));
      const first=observations[0];
      if(!first){if(uncertain)rate.unknown++;continue;}
      const ties=observations.filter(o=>o.at===first.at);
      if(first.correct===null || uncertain || ties.some(o=>o.correct!==first.correct || !equal(o.value,first.value))){rate.unknown++;continue;}
      rate.total++;if(!first.correct)rate.incorrect++;
      if(modes.size>1)rate.mixte++;
      else {const group=modes.has('soir')?rate.soir:rate.jour;group.total++;if(!first.correct)group.incorrect++;}
    }
    return [String(q.id),rate];
  }));
}