/**
 * Correction IA des QRC e-learning — accès client (lecture + actions explicites).
 * Aucune note n'est calculée ici : le serveur décide et écrit.
 */
import { supabase } from "@/integrations/supabase/client";

export type ConfigIa = { actif: boolean; actif_depuis: string | null; pause_motif: string | null; pause_depuis: string | null };
export type CorrectionIa = { qrc_instance_id: string; statut: string; motif: string | null; note: number | null; bareme: number | null; justification: string | null; modele: string | null; created_at: string };
export type DemandeVerification = { id: string; qrc_instance_id: string; statut: "a_traiter" | "traitee"; note_ia: number | null; note_finale: number | null; traitee_email: string | null; traitee_at: string | null; created_at: string };

export const LIBELLES_MOTIF_IA: Record<string, string> = {
  matiere_exclue_gt: "Matière G(T) exclue de la correction IA",
  reponse_vide: "Copie vide — aucune analyse IA",
  corrige_absent: "Corrigé officiel absent",
  bareme_absent: "Barème absent ou incohérent",
  question_absente: "Question absente",
  question_hors_snapshot: "Question absente de la copie figée",
  donnees_corrompues: "Question ou réponse techniquement corrompue",
  resultat_invalide: "Résultat IA invalide",
  hors_bareme: "Note IA hors barème — refusée",
  appel_ia_en_erreur: "Service IA indisponible",
  cle_ia_absente: "Service IA non configuré",
};

const lots = <T,>(ids: T[], n = 200) => Array.from({ length: Math.ceil(ids.length / n) }, (_, i) => ids.slice(i * n, i * n + n));

export async function lireConfigIa(): Promise<ConfigIa | null> {
  const { data } = await supabase.from("qrc_ia_config" as any).select("actif, actif_depuis, pause_motif, pause_depuis").eq("id", true).maybeSingle();
  return (data as unknown as ConfigIa) ?? null;
}

export async function definirIaActif(actif: boolean, email?: string | null) {
  const { data, error } = await supabase.rpc("qrc_ia_definir_actif" as any, { p_actif: actif, p_email: email ?? null });
  if (error) throw error;
  return data as { actif: boolean };
}

export async function lireCorrectionsIa(qrcIds: string[]): Promise<CorrectionIa[]> {
  const out: CorrectionIa[] = [];
  for (const lot of lots(qrcIds)) {
    const { data } = await supabase.from("qrc_ia_corrections" as any)
      .select("qrc_instance_id, statut, motif, note, bareme, justification, modele, created_at").in("qrc_instance_id", lot);
    out.push(...((data ?? []) as unknown as CorrectionIa[]));
  }
  return out;
}

export async function lireDemandesVerification(qrcIds: string[]): Promise<DemandeVerification[]> {
  const out: DemandeVerification[] = [];
  for (const lot of lots(qrcIds)) {
    const { data } = await supabase.from("qrc_verification_demandes" as any)
      .select("id, qrc_instance_id, statut, note_ia, note_finale, traitee_email, traitee_at, created_at").in("qrc_instance_id", lot);
    out.push(...((data ?? []) as unknown as DemandeVerification[]));
  }
  return out;
}

export async function demanderVerification(qrcInstanceId: string) {
  const { data, error } = await supabase.rpc("qrc_demander_verification" as any, { p_qrc_instance_id: qrcInstanceId });
  if (error) throw error;
  return data as { ok: boolean; deja_demandee: boolean };
}
