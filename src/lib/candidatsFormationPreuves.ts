import { aPreuveSignatureEmargement } from "@/lib/preuveSignatureEmargement";
import { isPratiqueType } from "@/lib/sessionTypes";

export interface InscriptionPratiquePresence {
  apprenant_id: string;
  presence_pratique?: string | null;
  sessions?: {
    type_session?: string | null;
    date_debut?: string | null;
    date_fin?: string | null;
  } | Array<{
    type_session?: string | null;
    date_debut?: string | null;
    date_fin?: string | null;
  }> | null;
}

export interface EmargementPratiquePreuve {
  apprenant_id: string;
  date_emargement?: string | null;
  signature_data_url?: unknown;
  absent?: boolean | null;
  masque?: boolean | null;
}

const dateISO = (value: unknown) => String(value ?? "").slice(0, 10);
const estDateISO = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Une présence administrative seule ne prouve jamais que la pratique est effectuée. */
export function inscriptionPratiqueSignee(
  inscription: InscriptionPratiquePresence,
  emargements: EmargementPratiquePreuve[],
): boolean {
  if (inscription.presence_pratique !== "present") return false;
  const session = Array.isArray(inscription.sessions) ? inscription.sessions[0] : inscription.sessions;
  if (!session || !isPratiqueType(session.type_session)) return false;

  const debut = dateISO(session.date_debut);
  const fin = dateISO(session.date_fin || session.date_debut);
  if (!estDateISO(debut) || !estDateISO(fin) || fin < debut) return false;

  return emargements.some((emargement) => {
    if (emargement.apprenant_id !== inscription.apprenant_id) return false;
    const date = dateISO(emargement.date_emargement);
    return estDateISO(date) && date >= debut && date <= fin && aPreuveSignatureEmargement(emargement);
  });
}

export function idsPratiquesEffectueesSignees(
  inscriptions: InscriptionPratiquePresence[],
  emargements: EmargementPratiquePreuve[],
): string[] {
  return [...new Set(
    inscriptions
      .filter((inscription) => inscriptionPratiqueSignee(inscription, emargements))
      .map((inscription) => inscription.apprenant_id),
  )];
}

/** L'enregistrement n'est confirmé que si la valeur relue est exactement celle choisie. */
export async function confirmerDateExamenTheorique(
  choix: string,
  enregistrerEtRelire: (date: string) => Promise<string | null | undefined>,
): Promise<string> {
  const date = choix.trim();
  if (!date) throw new Error("Choisissez une date d'examen théorique.");
  const dateRelue = await enregistrerEtRelire(date);
  if (dateRelue !== date) {
    throw new Error("La date n'a pas pu être confirmée après enregistrement. Rechargez puis réessayez.");
  }
  return dateRelue;
}
