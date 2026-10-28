/** Display routing only: existing exercise identities and completion rules stay unchanged. */
export function module7CommunePanel(moduleId: number, exerciseId: number | null): 7020 | 7021 | null {
  if (moduleId !== 7) return null;
  return exerciseId === 7020 || exerciseId === 7021 ? exerciseId : null;
}