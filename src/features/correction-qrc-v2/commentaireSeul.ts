import type { EvenementCorrection } from "./noyauReel";

/** Version relue du journal : dernier événement V2 et dernier numéro de révision de l'ancien circuit. */
export function versionCommentaire(historique: EvenementCorrection[]): { dernierEvenement: number | null; revision: number } {
  const dernier = historique.at(-1);
  return {
    dernierEvenement: dernier?.correction_event_id == null ? null : Number(dernier.correction_event_id),
    revision: dernier?.revision == null ? 0 : Number(dernier.revision),
  };
}

/** Empreinte courte et stable d'un texte (identité d'opération, jamais une preuve). */
function empreinte(texte: string): string {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

/** Même copie + même version + même texte + même intention = même opération (double clic = un seul envoi). */
export function cleOperationCommentaire(cible: string, version: { dernierEvenement: number | null; revision: number }, texte: string, jeton: string): string {
  return `qrccom:${cible}:${version.dernierEvenement ?? "x"}:${version.revision}:${empreinte(texte)}:${texte.length}:${jeton}`;
}

/** Le commentaire n'est confirmé que si le dernier événement relu porte exactement ce texte et la même note. */
export function commentaireConfirme(journal: EvenementCorrection[], texte: string, note: number): boolean {
  const dernier = journal.at(-1);
  if (!dernier || dernier.note_nouvelle == null) return false;
  return (dernier.commentaire ?? "") === texte && Number(dernier.note_nouvelle) === Number(note);
}
