import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Règle élève : jamais de lecture ni d'écran vide sans connexion confirmée.
 * "absente" seulement après une seconde vérification (évite les faux écrans
 * pendant un renouvellement de connexion).
 */
export function useConnexionEleveConfirmee(opts: {
  embedded: boolean;
  userId: string | null | undefined;
  authLoading: boolean;
}): "ok" | "verification" | "absente" {
  const { embedded, userId, authLoading } = opts;
  const [etat, setEtat] = useState<"ok" | "verification" | "absente">("ok");

  useEffect(() => {
    if (embedded || userId) { setEtat("ok"); return; }
    if (authLoading) { setEtat("verification"); return; }
    let annule = false;
    setEtat("verification");
    const t = window.setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data?.session;
        const valide = !!s && (!s.expires_at || s.expires_at * 1000 > Date.now());
        if (!annule) setEtat(valide ? "ok" : "absente");
      } catch {
        if (!annule) setEtat("absente");
      }
    }, 1500);
    return () => { annule = true; window.clearTimeout(t); };
  }, [embedded, userId, authLoading]);

  return etat;
}
