import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { MODELE_CODE_ATTESTATION } from "./modele";
import type { StatutAttestation } from "./cycle";

export interface AttestationEnregistree {
  id: string; token: string; statut: string; envoi_etat: string | null; envoye_le: string | null; envoi_tente_le: string | null;
  envoi_erreur: string | null; signed_at: string | null; signe_le_paris: string | null; created_at: string;
  texte_fige: string | null; texte_empreinte: string | null; identite_figee: any; reponses: any;
}
/** Statut affiché : « À envoyer » uniquement pour un document enregistré, recontrôlé par le serveur et jamais envoyé. */
export function statutAffiche(d: AttestationEnregistree): { cle: StatutAttestation | "envoi_incertain"; libelle: string } {
  if (d.statut === "signe") return { cle: "signee", libelle: "Signée" };
  if (d.statut === "revoque") return { cle: "revoquee", libelle: "Révoquée" };
  if (d.envoi_etat === "indetermine" || d.envoi_etat === "envoi_en_cours") return { cle: "envoi_incertain", libelle: "Envoi à vérifier" };
  if (d.envoye_le) return { cle: "a_signer", libelle: "En attente de signature" };
  return { cle: "a_verifier", libelle: "À envoyer" };
}
export async function chargerAttestations(apprenantId: string): Promise<AttestationEnregistree[]> {
  const { data, error } = await supabase.from("documents_a_signer")
    .select("id, token, statut, envoi_etat, envoye_le, envoi_tente_le, envoi_erreur, signed_at, signe_le_paris, created_at, texte_fige, texte_empreinte, identite_figee, reponses")
    .eq("modele_code", MODELE_CODE_ATTESTATION).eq("apprenant_id", apprenantId).order("created_at", { ascending: false });
  if (error) throw new Error("Lecture des attestations impossible");
  return (data ?? []) as any;
}
export async function appelAttestation(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("attestation-fin-formation", { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) { try { detail = (await error.context.json())?.error ?? detail; } catch { /* corps illisible */ } }
    throw new Error(detail || "Service indisponible");
  }
  return data;
}
export const lienSignature = (token: string) => `${window.location.origin}/document-a-signer/${token}`;
