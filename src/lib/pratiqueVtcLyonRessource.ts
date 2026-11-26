import pdf from '@/assets/pratique-vtc-lyon/examen-pratique-connaissance-lyon.pdf.asset.json';

export const COURS_LYON_VTC_ID = 1785334184827;
export const PDF_LYON_VTC = { nom: 'Examen pratique – Connaissance de Lyon.pdf', url: pdf.url };

export function estPdfLyonVtc(url: string) {
  return url === pdf.url;
}

type Course = { id: number; fichiers?: { nom: string; url: string }[] };

/** Explicit additive intent; never reconstruct existing course/question JSON. */
export function ajouterLyonVtc<T extends { id: number; cours: Course[] }>(module: T): T {
  if (module.id !== 8) throw new Error('Ajout réservé à la pratique VTC.');
  const course = module.cours.find(c => c.id === COURS_LYON_VTC_ID);
  if (!course) throw new Error('Cours Lyon absent : aucun rattachement implicite.');
  return {
    ...module,
    cours: module.cours.map(c => c !== course || c.fichiers?.some(f => f.url === pdf.url)
      ? c : { ...c, fichiers: [...(c.fichiers ?? []), PDF_LYON_VTC] }),
  };
}

