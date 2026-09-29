import { useEffect, useRef, useState } from "react";
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
  const enCours = useRef(false);

  useEffect(() => {
    if (embedded) { setEtat("ok"); return; }
    let annule = false;
    let timer: number | undefined;

    const sessionValide = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data?.session;
        return !!s?.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now());
      } catch {
        return false;
      }
    };

    const verifier = async () => {
      if (enCours.current || annule) return;
      enCours.current = true;
      try {
        if (await sessionValide()) { if (!annule) setEtat("ok"); return; }
        if (!annule) setEtat((e) => (e === "absente" ? e : "verification"));
        await new Promise((r) => { timer = window.setTimeout(r, 2500); });
        if (annule) return;
        const ok = await sessionValide();
        if (!annule) setEtat(ok ? "ok" : "absente");
      } finally {
        enCours.current = false;
      }
    };

    if (!authLoading) void verifier();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void verifier(); });
    const onVis = () => { if (document.visibilityState === "visible") void verifier(); };
    document.addEventListener("visibilitychange", onVis);
    const interval = window.setInterval(() => { void verifier(); }, 60000);

    return () => {
      annule = true;
      if (timer) window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      sub.subscription.unsubscribe();
    };
  }, [embedded, userId, authLoading]);

  return etat;
}
