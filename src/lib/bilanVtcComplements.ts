/** Display identities only: never filter persistence inputs or renumber pages. */
export const BILAN_VTC_COMPLEMENTS = [505, 506, 507] as const;
export const BILAN_VTC_QRC_COURS = 1794399472264;
export function estComplementBilanVtc(moduleId: number, page: { type: string; exercice?: { id: number }; cours?: { id: number } }): boolean {
  if (moduleId !== 5) return false;
  return page.type === "exercice-single" ? BILAN_VTC_COMPLEMENTS.some(id => id === Number(page.exercice?.id))
    : page.type === "cours" && Number(page.cours?.id) === BILAN_VTC_QRC_COURS;
}