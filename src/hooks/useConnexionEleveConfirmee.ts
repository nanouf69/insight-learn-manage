import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Règle élève : jamais de lecture ni d'écran vide sans connexion confirmée.
 *
 * On lit l'état RÉEL de la connexion (pas seulement l'utilisateur affiché :
 * l'espace élève garde volontairement l'utilisateur visible pendant les
 * reconnexions, alors que le serveur répond déjà « vide » sans connexion).
 * "absente" seulement après deux vérifications espacées (évite les faux
 * écrans pendant un simple renouvellement de connexion).
 */
export function useConnexionEleveConfirmee(opts: {
  embedded: boolean;
  userId: string | null | undefined;
  authLoading: boolean;
}): "ok" | "verification" | "absente" {
  const { embedded, userId, authLoading } = opts;
  const [etat, setEtat] = useState<"ok" | "verification" | "absente">("ok");

  useEffect(() => {
    if (embedded) { setEtat("ok"); return; }
    let annule = false;
    let enCours = false;
    let timer: number | undefined;
    let scheduled: number | undefined;

    const avecDelai = async <T,>(p: Promise<T>, ms: number, repli: T) => {
      let timeout: number | undefined;
      try {
        return await Promise.race([p, new Promise<T>((r) => { timeout = window.setTimeout(() => r(repli), ms); })]);
      } finally { if (timeout !== undefined) window.clearTimeout(timeout); }
    };

    const sessionValide = async () => {
      try {
        // Le client peut rester bloqué pendant un renouvellement raté : délai max.
        const res = await avecDelai(supabase.auth.getSession(), 6000, null);
        const s = res?.data?.session;
        if (!s?.access_token || s.user?.id !== userId || (s.expires_at && s.expires_at * 1000 <= Date.now())) return false;
        // Vérification auprès du serveur : une session révoquée/expirée côté
        // serveur paraît valide localement. Coupure réseau = on ne conclut pas.
        const u = await avecDelai(supabase.auth.getUser(), 6000, null);
        if (!u) return true; // délai réseau : ne pas démonter la saisie
        if (!u.error) return u.data.user?.id === userId;
        const st = (u.error as { status?: number }).status;
        return !(st === 401 || st === 403);
      } catch {
        return true;
      }
    };

    const verifier = async () => {
      if (enCours || annule) return;
      enCours = true;
      try {
        const v1 = await sessionValide();
        if (v1) { if (!annule) setEtat("ok"); return; }
        if (!annule) setEtat((e) => (e === "absente" ? e : "verification"));
        await new Promise((r) => { timer = window.setTimeout(r, 2500); });
        if (annule) return;
        const ok = await sessionValide();
        if (!annule) setEtat(ok ? "ok" : "absente");
      } finally {
        enCours = false;
      }
    };

    // Safari emits several resume/auth events together. Defer auth calls outside
    // the SDK callback (its session lock is still held), and coalesce the burst.
    const programmer = () => {
      if (annule || authLoading || enCours || scheduled !== undefined) return;
      scheduled = window.setTimeout(() => { scheduled = undefined; void verifier(); }, 150);
    };
    if (!authLoading) programmer();
    const { data: sub } = supabase.auth.onAuthStateChange(programmer);
    const onVis = () => { if (document.visibilityState === "visible") programmer(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    window.addEventListener("online", onVis);
    const interval = window.setInterval(programmer, 60000);

    return () => {
      annule = true;
      if (timer) window.clearTimeout(timer);
      if (scheduled !== undefined) window.clearTimeout(scheduled);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
      window.removeEventListener("online", onVis);
      sub.subscription.unsubscribe();
    };
  }, [embedded, userId, authLoading]);

  return etat;
}
