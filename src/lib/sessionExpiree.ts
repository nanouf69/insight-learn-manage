import { supabase } from "@/integrations/supabase/client";

export const SESSION_EXPIREE_MESSAGE =
  "Session expirée, reconnectez-vous. Vos réponses restent affichées et conservées : ne fermez pas la page, reconnectez-vous puis continuez.";

/** Vrai si l'échec vient d'une session expirée (droit refusé ou plus de session). */
export async function isLearnerSessionExpired(error: any): Promise<boolean> {
  const t = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (t.includes("42501") || t.includes("permission denied") || t.includes("jwt")) return true;
  try {
    const { data } = await supabase.auth.getSession();
    const s = data?.session;
    if (!s) return true;
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return true;
  } catch {
    /* ignore */
  }
  return false;
}
