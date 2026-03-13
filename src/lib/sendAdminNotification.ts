/**
 * Fire-and-forget notification email to admin via Resend.
 * Never throws — errors are logged silently.
 */
export async function sendAdminNotification(payload: {
  type_document: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  numero_dossier_cma?: string;
  mot_de_passe_cma?: string;
  type_examen?: string;
  date_examen?: string;
  lieu_examen?: string;
  b2_vierge?: boolean;
  donnees?: Record<string, unknown>;
}): Promise<void> {
  try {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(`${baseUrl}/functions/v1/send-notification-admin`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[sendAdminNotification] Error:", res.status, text);
    } else {
      console.log("[sendAdminNotification] Email sent for", payload.type_document);
    }
  } catch (err) {
    console.error("[sendAdminNotification] Failed silently:", err);
  }
}
