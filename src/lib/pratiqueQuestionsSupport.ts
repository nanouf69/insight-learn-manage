/** Display-only attachment: never inserted into course pages or activity registries. */
export function pratiqueQuestionsSupport(moduleId: number, coursId: number) {
  if (coursId !== 2 || (moduleId !== 6 && moduleId !== 8)) return null;
  const formation = moduleId === 6 ? 'taxi' : 'vtc';
  return {
    formation,
    titre: `Questions examen pratique ${formation.toUpperCase()}`,
    bucket: 'cours-fichiers',
    pages: Array.from({ length: 20 }, (_, i) =>
      `cours-images/pratique-${formation}-20261104/page-${String(i + 1).padStart(2, '0')}.jpg`),
    consultationSeule: true,
  } as const;
}