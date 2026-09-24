import { supabase } from "@/integrations/supabase/client";
import { ALL_DATES_EXAMEN_THEORIQUE, trouverExamenTheorique, type ExamenTheoriqueDate } from "@/lib/examDatesConfig";

/**
 * Décalage d'un candidat vers la prochaine session d'examen théorique.
 * Source des dates : calendrier officiel centralisé (examDatesConfig) — jamais de liste en dur ici.
 * Donnée centrale modifiée côté serveur, en une seule opération : apprenants.date_examen_theorique
 * (lue par tous les écrans), rattachement à la session « examen », journal append-only.
 */
export function prochaineSessionApres(
  dateActuelle: string | null | undefined,
  calendrier: ExamenTheoriqueDate[] = ALL_DATES_EXAMEN_THEORIQUE,
): ExamenTheoriqueDate | null {
  const actuelle = trouverExamenTheorique(dateActuelle);
  if (!actuelle) return null;
  const suivantes = calendrier.filter((e) => e.iso > actuelle.iso).sort((a, b) => a.iso.localeCompare(b.iso));
  return suivantes[0] ?? null;
}

export type DecalageResultat = {
  id: string;
  ancienne_date: string;
  nouvelle_date: string;
  created_at: string;
};

/** Identifiant d'opération stable pour une même demande (double clic → même opération). */
export function nouvelleOperationDecalage(): string {
  return crypto.randomUUID();
}

export async function decalerExamenTheorique(params: {
  operationId: string;
  apprenantId: string;
  ancienneDate: string;
  nouvelle: ExamenTheoriqueDate;
  email?: string | null;
}): Promise<DecalageResultat> {
  const { data, error } = await (supabase.rpc as any)("decaler_examen_theorique", {
    p_operation_id: params.operationId,
    p_apprenant_id: params.apprenantId,
    p_ancienne_date: params.ancienneDate,
    p_nouvelle_date: params.nouvelle.date,
    p_nouvelle_iso: params.nouvelle.iso,
    p_nouveau_lieu: params.nouvelle.lieu,
    p_email: params.email ?? null,
  });
  if (error) throw new Error(error.message.replace(/^DECALAGE_REFUSE:\s*/, ""));
  return data as DecalageResultat;
}
