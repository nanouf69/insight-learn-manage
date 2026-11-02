/**
 * Le serveur fusionne les réponses question par question : une clé absente
 * n'efface rien. Quand l'élève recommence un exercice, chaque réponse retirée
 * doit donc être envoyée explicitement vide pour ne pas réapparaître.
 * Seuls les exercices ciblés sont concernés ; les autres restent intacts.
 */
export function reponsesVidesAEnvoyer(
  precedentes: Record<string, unknown>,
  actuelles: Record<string, unknown>,
  exerciceIds: number[],
): Record<number, Record<string, string | string[]>> {
  const cibles = new Set(exerciceIds.filter((id) => Number.isFinite(id)));
  const out: Record<number, Record<string, string | string[]>> = {};
  for (const [key, prev] of Object.entries(precedentes)) {
    const exoId = parseInt(key.split("-")[0], 10);
    if (!cibles.has(exoId) || key in actuelles) continue;
    (out[exoId] ??= {})[key] = Array.isArray(prev) ? [] : "";
  }
  return out;
}
