import quiz from '@/components/cours-en-ligne/exercices/pratique-vtc-lyon-qcm2.json';
import pdf from '@/assets/pratique-vtc-lyon/examen-pratique-connaissance-lyon.pdf.asset.json';

export const QCM2_LYON = quiz;
export const COURS_LYON_VTC_ID = 1785334184827;
export const PDF_LYON_VTC = { nom: 'Examen pratique – Connaissance de Lyon.pdf', url: pdf.url };

export function estQcm2Lyon(moduleId: number, exerciseId: number) {
  return moduleId === 8 && exerciseId === quiz.id;
}

export function estPdfLyonVtc(url: string) {
  return url === pdf.url;
}

type Course = { id: number; fichiers?: { nom: string; url: string }[] };
type Exercise = { id: number };

/** Explicit additive intent; never reconstruct existing course/question JSON. */
export function ajouterLyonVtc<T extends { id: number; cours: Course[]; exercices: Exercise[] }>(module: T): T {
  if (module.id !== 8) throw new Error('Ajout réservé à la pratique VTC.');
  const course = module.cours.find(c => c.id === COURS_LYON_VTC_ID);
  if (!course) throw new Error('Cours Lyon absent : aucun rattachement implicite.');
  return {
    ...module,
    cours: module.cours.map(c => c !== course || c.fichiers?.some(f => f.url === pdf.url)
      ? c : { ...c, fichiers: [...(c.fichiers ?? []), PDF_LYON_VTC] }),
    // QCM 2 is rendered separately, never a required exercise or completion page.
    exercices: module.exercices,
  };
}

export function noteEntrainementLyon(reponses: Record<number, string>) {
  return quiz.questions.filter(q => q.choix.some(c => 'correct' in c && c.correct && reponses[q.id] === c.lettre)).length;
}