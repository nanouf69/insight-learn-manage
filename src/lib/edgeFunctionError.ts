/**
 * Extrait le message d'erreur réel renvoyé par une Edge Function.
 * supabase.functions.invoke renvoie un message générique
 * ("Edge Function returned a non-2xx status code") : on lit le corps
 * de la réponse pour afficher la vraie cause à l'administrateur.
 */
export async function readEdgeFunctionError(
  err: unknown,
  fallback = "Erreur lors de l'opération",
): Promise<string> {
  const anyErr = err as { context?: unknown; message?: string } | null;
  const ctx = anyErr?.context as Response | undefined;

  if (ctx && typeof (ctx as Response).text === "function") {
    try {
      const raw = await (ctx as Response).clone().text();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { error?: string; details?: string };
          if (parsed?.error) return parsed.error;
        } catch {
          return raw;
        }
      }
    } catch {
      // ignore : on retombe sur le message générique
    }
  }

  return anyErr?.message || fallback;
}
