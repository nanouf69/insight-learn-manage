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

// ── Renouvellement de session (sortie de veille, retour sur l'onglet, avant envoi) ──
let renouvellementEnCours: Promise<string | null> | null = null;

/**
 * Renvoie un jeton valide, en le renouvelant silencieusement s'il expire dans
 * moins d'une minute. Un seul renouvellement à la fois (évite que deux onglets
 * ou deux envois consomment le même jeton de renouvellement).
 * null = pas de connexion valide (l'élève doit se reconnecter).
 */
export function assurerSessionFraiche(margeSecondes = 60): Promise<string | null> {
  if (renouvellementEnCours) return renouvellementEnCours;
  renouvellementEnCours = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (!s?.refresh_token) return null;
      const expireDans = s.expires_at ? s.expires_at * 1000 - Date.now() : Infinity;
      if (expireDans > margeSecondes * 1000) return s.access_token;
      const { data: r, error } = await supabase.auth.refreshSession();
      if (error || !r?.session) {
        // Un autre onglet a pu renouveler juste avant : relire la session partagée.
        const { data: d2 } = await supabase.auth.getSession();
        const s2 = d2?.session;
        if (s2?.expires_at && s2.expires_at * 1000 > Date.now()) return s2.access_token;
        return null;
      }
      return r.session.access_token;
    } catch {
      return null;
    } finally {
      setTimeout(() => { renouvellementEnCours = null; }, 0);
    }
  })();
  return renouvellementEnCours;
}

let ecouteInstallee = false;
/** Renouvelle la session au retour sur la page (veille, onglet, réseau). */
export function installerRenouvellementAuRetour(): void {
  if (ecouteInstallee || typeof window === "undefined") return;
  ecouteInstallee = true;
  const relancer = () => {
    if (document.visibilityState === "visible") void assurerSessionFraiche(120);
  };
  document.addEventListener("visibilitychange", relancer);
  window.addEventListener("focus", relancer);
  window.addEventListener("online", relancer);
  window.addEventListener("pageshow", relancer);
}
