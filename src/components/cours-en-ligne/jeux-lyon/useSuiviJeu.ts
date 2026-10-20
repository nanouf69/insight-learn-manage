// Suivi serveur des jeux du module 8 : file durable existante (propriété du compte,
// reprises bornées), jamais de note, jamais de score local comme preuve.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueAnswerSave, flushAnswerSavesAndWait } from "@/lib/answerPersistence";
import { EXERCICE_TYPE_JEU } from "@/lib/jeuxPedagogiques";
import { freshSessionCall } from "@/lib/sessionRpc";

export type EtatSuivi = "inconnu" | "a_faire" | "envoi" | "attente_locale" | "confirme" | "lecture_impossible";

export function useSuiviJeu(compteId: string | null | undefined, exerciceId: string) {
  const [etat, setEtat] = useState<EtatSuivi>("inconnu");
  const [reponses, setReponses] = useState<Record<string, unknown>>({});

  const relire = useCallback(async () => {
    if (!compteId) { setEtat("inconnu"); return null; }
    try {
    const { data, error } = await freshSessionCall(() => supabase.from("reponses_apprenants")
      .select("completed, reponses").eq("apprenant_id", compteId).eq("exercice_id", exerciceId).maybeSingle());
    if (error) { setEtat("lecture_impossible"); return null; }
    setReponses(((data as any)?.reponses as Record<string, unknown>) ?? {});
    setEtat((data as any)?.completed === true ? "confirme" : "a_faire");
    if ((data as any)?.completed === true) window.dispatchEvent(new Event("activite-registre-confirmee"));
    return data as any;
    } catch {
      setEtat("lecture_impossible");
      return null;
    }
  }, [compteId, exerciceId]);

  // Changement de compte : état réinitialisé puis relu pour le nouveau compte uniquement.
  useEffect(() => { setEtat("inconnu"); setReponses({}); void relire(); }, [relire]);

  const enregistrer = useCallback(async (etape: Record<string, unknown>, termine: boolean) => {
    if (!compteId) return;
    setEtat("envoi");
    enqueueAnswerSave({ apprenant_id: compteId, module_id: null, exercice_id: exerciceId, exercice_type: EXERCICE_TYPE_JEU, reponses: etape, completed: termine, score: null });
    const ok = await flushAnswerSavesAndWait(compteId, exerciceId).catch(() => false);
    const row = await relire();
    if (!ok || (termine && row?.completed !== true)) setEtat((e) => (e === "lecture_impossible" ? e : termine ? "attente_locale" : e));
  }, [compteId, exerciceId, relire]);

  return { etat, reponses, enregistrer };
}

export const LIBELLE_SUIVI: Record<EtatSuivi, string> = {
  inconnu: "Suivi : état non disponible (aperçu ou compte non identifié)",
  a_faire: "À terminer : placez toutes les étiquettes",
  envoi: "Envoi au serveur…",
  attente_locale: "Enregistré sur cet appareil — en attente de confirmation du serveur",
  confirme: "Jeu terminé — confirmé par le serveur",
  lecture_impossible: "Lecture du suivi impossible — réessayez plus tard (rien n'est perdu)",
};
