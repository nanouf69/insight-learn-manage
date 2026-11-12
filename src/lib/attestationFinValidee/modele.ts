/** Texte du modèle ; tout champ manquant est signalé, jamais inventé. Règles partagées avec le serveur. */
export {
  ORGANISME, VERSION_MODELE, MODELE_CODE_ATTESTATION, champsManquants, texteAttestation, referenceAttestation, CONSENTEMENT_APPRENANT,
} from "../../../supabase/functions/_shared/modeleAttestationFin";
export type { ChampsAttestation, TexteFigeAttestation } from "../../../supabase/functions/_shared/modeleAttestationFin";
import { VERSION_MODELE } from "../../../supabase/functions/_shared/modeleAttestationFin";
/** Empreinte d'aperçu (non signée) — l'empreinte officielle est calculée par le serveur sur le texte figé. */
export async function empreinteAttestation(lignes: string[], apprenantId: string): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify({ v: VERSION_MODELE, apprenantId, lignes }));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
