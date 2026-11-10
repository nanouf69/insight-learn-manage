export const COMMENTAIRES_QRC = [
  "Précisez !!!",
  "Mal dit !!!",
  "Précisez permis de conduire hors période probatoire",
  "Attention aux fautes !!!",
] as const;

/** Ajout local seulement : la correction sécurisée existante assure la persistance. */
export function ajouterCommentaireQrc(commentaire: string, texte: string): string {
  if (commentaire.includes(texte)) return commentaire;
  return commentaire ? `${commentaire}${commentaire.endsWith("\n") ? "" : "\n"}${texte}` : texte;
}