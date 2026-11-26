import quiz from '@/components/cours-en-ligne/exercices/pratique-vtc-lyon-qcm2.json';

export const QCM2_LYON = quiz;

export function noteEntrainementLyon(reponses: Record<number, string>) {
  return quiz.questions.filter(q => q.choix.some(c => 'correct' in c && c.correct && reponses[q.id] === c.lettre)).length;
}