// Route de PILOTE (données TEST uniquement) : même écran de correction QRC V2,
// avec un contrôle d'accès autonome (session réelle + rôle admin vérifié en base).
// Utilisée parce que ProtectedRoute ne peut pas être exercé dans l'environnement de test.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCorrectionQrcV2Reel from "./AdminCorrectionQrcV2Reel";

export default function PiloteCorrectionTest() {
  const [etat, setEtat] = useState<"verification" | "autorise" | "non_connecte" | "refuse">("verification");

  useEffect(() => {
    let actif = true;
    const verifier = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!actif) return;
      if (!user) {
        setEtat("non_connecte");
        return;
      }
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!actif) return;
      setEtat(!error && data === true ? "autorise" : "refuse");
    };
    void verifier();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void verifier());
    return () => {
      actif = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (etat === "verification") {
    return <div className="p-8 text-sm text-muted-foreground" data-testid="acces-verification">Vérification des droits…</div>;
  }
  if (etat === "non_connecte") {
    return <div className="p-8 text-sm" data-testid="acces-refuse">🔴 Accès refusé — vous n'êtes pas connecté.</div>;
  }
  if (etat === "refuse") {
    return <div className="p-8 text-sm" data-testid="acces-refuse">🔴 Accès refusé — réservé aux formateurs / administrateurs.</div>;
  }
  return <AdminCorrectionQrcV2Reel />;
}
