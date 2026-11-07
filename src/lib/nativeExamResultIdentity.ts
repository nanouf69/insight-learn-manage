/** Read-only identity proof; never uses dates or current authoring content. */
export function nativeResultMatchesAnswers(core: { matiereId: string; answers?: Record<string, unknown>; questions?: any[]; qrcProofs?: any[] }, details: any): boolean {
  const answers = details?.reponses;
  const frozen = core.questions;
  if (!answers || !core.answers || !Array.isArray(frozen) || !frozen.length) return false;
  const norm = (v: unknown): string => Array.isArray(v) ? JSON.stringify(v.map(String).sort()) : String(v ?? '').trim();
  const prefix = `${core.matiereId}:`;
  const ids = frozen.map(q => String(q.id ?? ''));
  if (new Set(ids).size !== ids.length || ids.some(id => !id.startsWith(prefix))) return false;
  if (Object.keys(answers).some(id => !ids.includes(`${prefix}${id}`))) return false;
  if (!Object.values(answers).some(v => norm(v) !== '')) return false;
  if (!ids.every(id => norm(answers[id.slice(prefix.length)]) === norm(core.answers?.[id]))) return false;
  const qrc = frozen.filter(q => q.type === 'QRC');
  const proofs = core.qrcProofs ?? [];
  return proofs.length === qrc.length && qrc.every(q => {
    const p = proofs.filter(p => p.questionId === q.id);
    return p.length === 1 && norm(p[0].reponse) === norm(core.answers?.[q.id]);
  });
}

export function nativeSnapshotSupportsResult(questions: any[] | undefined): boolean {
  return !!questions?.length && questions.every(q => typeof q.enonce === 'string' && q.enonce.trim()
    && Number.isFinite(q.points) && q.points > 0
    && (q.type === 'QRC' || (q.type === 'QCM' && Array.isArray(q.choix) && q.choix.some((c: any) => c.correct === true))));
}