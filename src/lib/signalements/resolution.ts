/** Reçu et En cours = Non résolu ; Traité = Résolu (affichage apprenant et admin). */
export function etatResolution(statut: string): "Résolu" | "Non résolu" {
  return statut === "traite" ? "Résolu" : "Non résolu";
}
