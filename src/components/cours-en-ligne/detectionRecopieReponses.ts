/**
 * Détecte une recopie en masse des propositions/correction d'une question
 * sur d'autres questions ayant une image différente (incident Bilan Sécurité routière, 24/09/2026).
 * Fonction pure, ne corrige rien.
 */
type Choix = { lettre?: string; texte?: string; correct?: boolean };
type Q = { id: number | string; image?: string; choix?: Choix[] };

const signature = (choix: Choix[] = []) =>
  JSON.stringify(choix.map((c) => [String(c.texte ?? "").trim().toLowerCase(), !!c.correct]));

/** Renvoie les groupes de questions (images différentes) partageant exactement les mêmes propositions + correction. */
export function detecterRecopieEnMasse(questions: Q[], seuil = 2): Array<{ ids: (number | string)[]; images: number }> {
  const groupes = new Map<string, { ids: (number | string)[]; images: Set<string> }>();
  for (const q of questions) {
    if (!Array.isArray(q.choix) || q.choix.length === 0 || !q.image) continue;
    const sig = signature(q.choix);
    const g = groupes.get(sig) ?? { ids: [], images: new Set<string>() };
    g.ids.push(q.id);
    g.images.add(q.image);
    groupes.set(sig, g);
  }
  return [...groupes.values()]
    .filter((g) => g.images.size >= seuil)
    .map((g) => ({ ids: g.ids, images: g.images.size }));
}
