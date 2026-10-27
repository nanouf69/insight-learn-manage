import { supabase } from "@/integrations/supabase/client";

/**
 * Verrou des attestations de formation continue (VTC/TAXI) : le serveur vérifie que
 * chaque demi-journée (matin + après-midi) de chaque jour de la session est réellement
 * signée et enregistrée. Erreur de lecture = refus (jamais « autorisé par défaut »).
 */
export interface CreneauManquant { date: string; creneau: string }
export interface ControleAttestationFC { autorise: boolean; requis?: number; signes?: number; manquants: CreneauManquant[]; motif?: string | null }

const LIBELLE: Record<string, string> = { matin: "matin", apres_midi: "après-midi" };
const dateFr = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

export function messageRefusAttestationFC(c: ControleAttestationFC): string {
  if (c.manquants?.length) {
    const liste = c.manquants.map((x) => `${dateFr(x.date)} ${LIBELLE[x.creneau] ?? x.creneau}`).join(", ");
    return `Attestation bloquée : ${c.signes ?? 0}/${c.requis ?? "?"} émargements signés. Manquant : ${liste}.`;
  }
  return `Attestation bloquée : ${c.motif || "émargements non vérifiés"}.`;
}

export async function controlerAttestationFC(apprenantId: string | null | undefined): Promise<ControleAttestationFC> {
  if (!apprenantId) return { autorise: false, manquants: [], motif: "apprenant non identifié" };
  try {
    const { data, error } = await (supabase as any).rpc("attestation_fc_autorisee", { p_apprenant: apprenantId });
    if (error || !data) return { autorise: false, manquants: [], motif: "vérification des émargements impossible, réessayez" };
    return { autorise: data.autorise === true, requis: data.requis, signes: data.signes, manquants: data.manquants ?? [], motif: data.motif };
  } catch {
    return { autorise: false, manquants: [], motif: "vérification des émargements impossible, réessayez" };
  }
}
