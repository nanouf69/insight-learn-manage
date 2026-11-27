/**
 * Navigation after a subject closed without any answer (no result created).
 * The "transition" screen needs a subject result to render, so it must never be
 * used here: without a result it rendered a blank page (27/11/2026 report).
 * We go straight to the next subject still without a result, or back to the
 * exam list. No answer, attempt or result is written.
 */
export type EtapeApresSansResultat =
  | { phase: "examen"; matiereIndex: number }
  | { phase: "selection" };

export function etapeApresMatiereSansResultat(
  matiereIndex: number,
  nbMatieres: number,
  resultats: ReadonlyArray<unknown>,
): EtapeApresSansResultat {
  for (let i = matiereIndex + 1; i < nbMatieres; i++) {
    if (!resultats[i]) return { phase: "examen", matiereIndex: i };
  }
  return { phase: "selection" };
}
