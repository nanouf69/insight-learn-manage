import { CHOIX, modificationOuverte } from "@/lib/modeles/entrainementPratiqueVtc";

export interface DocChoixRow {
  id: string; token: string | null; statut: string; choix: string | null; reinscription_examen: string | null;
  texte_fige: string | null; signed_at: string | null; signe_le_paris: string | null; envoye_le: string | null; created_at?: string | null;
}
export interface RevisionRow { document_id: string; choix: string; reinscription_examen: string | null; signe_le: string; signe_le_paris: string | null }

export const LIBELLE_CHOIX_COURT: Record<string, string> = { maintenant: "Maintenant", plus_tard: "Plus tard", renonce: "Renonce" };
export const libelleChoixLong = (c: string | null | undefined) => CHOIX.find((x) => x.code === c)?.label ?? null;

/** État affiché = signature d'origine, remplacée par la révision la plus récente (aucune n'est effacée). */
export function etatChoixPratique(doc: DocChoixRow | null, revisions: RevisionRow[], now = new Date()) {
  if (!doc) return null;
  const demande = (() => { try { return !!JSON.parse(doc.texte_fige || "null")?.reinscription; } catch { return false; } })();
  if (doc.statut !== "signe") return { signe: false as const, demandeReinscription: demande, envoyeLe: doc.envoye_le };
  const revs = revisions.filter((r) => r.document_id === doc.id).sort((a, b) => a.signe_le.localeCompare(b.signe_le));
  const der = revs.at(-1);
  return {
    signe: true as const,
    demandeReinscription: demande,
    choix: der?.choix ?? doc.choix,
    reinscription: demande ? (der ? der.reinscription_examen : doc.reinscription_examen) : null,
    signeLeParis: der?.signe_le_paris ?? doc.signe_le_paris,
    origine: { choix: doc.choix, reinscription: doc.reinscription_examen, signeLeParis: doc.signe_le_paris },
    revisions: revs,
    modificationOuverte: modificationOuverte(doc.signed_at, now),
  };
}
