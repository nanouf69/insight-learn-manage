export async function appelIntervenantSignature(token: string, body: Record<string, unknown>) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intervenant-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ ...body, token }),
  });
  const json = await response.json().catch(() => ({ error: "Réponse illisible du service de signature" }));
  return { ok: response.ok, status: response.status, json };
}
