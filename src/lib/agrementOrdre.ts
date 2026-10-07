/** Presentation-only ordering: stored piece identities and order stay untouched. */
export function estLettrePresentation(label: string): boolean {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\blettre\s+(?:de\s+)?presentation\b/.test(normalized);
}

export function separerLettresPresentation<T extends { label: string }>(pieces: T[]) {
  return {
    lettres: pieces.filter((piece) => estLettrePresentation(piece.label)),
    autres: pieces.filter((piece) => !estLettrePresentation(piece.label)),
  };
}