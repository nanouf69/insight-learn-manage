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

/** Share references, not copies: historical IDs and separate letters are preserved. */
export function piecesPourDossier<T extends { label: string; societe: string; dossier: string }>(pieces: T[], societe: string, dossier: string): T[] {
  return pieces.filter((piece) => piece.societe === societe && (piece.dossier === dossier || estLettrePresentation(piece.label)));
}

export function fichiersPourExtra<T extends { piece_code: string; dossier: string; remplace_par: string | null; aussi_autre_dossier?: boolean }>(
  fichiers: T[], piece: { id: string; label: string }, dossier: string, remplace: boolean,
): T[] {
  return fichiers.filter((f) => f.piece_code === `extra:${piece.id}` && !!f.remplace_par === remplace
    && (estLettrePresentation(piece.label) || f.dossier === dossier || (!!f.aussi_autre_dossier && f.dossier !== "commun")));
}