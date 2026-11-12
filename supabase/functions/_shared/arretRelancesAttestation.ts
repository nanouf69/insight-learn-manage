/** Lecture seule, juste avant transport. Aucun blocage général des mails ou de l'authentification. */
export interface PreuveEnvoiAttestation {
  modele_code: string | null;
  envoye_le: string | null;
  sent_at: string | null;
  envoi_etat: string | null;
  statut: string | null;
}

export function attestationSuspendRelances(d: PreuveEnvoiAttestation): boolean {
  if (d.modele_code !== "attestation_fin_formation") return false;
  // Issue inconnue/en cours : prudence jusqu'à vérification, jamais reprise automatique.
  return Boolean(d.envoye_le || d.sent_at || d.statut === "signe" || d.statut === "envoye"
    || ["envoye", "envoi_en_cours", "indetermine"].includes(d.envoi_etat ?? ""));
}

export async function relanceAutoriseeApresAttestation(
  db: any, apprenantId: string | null, email?: string | null,
): Promise<boolean> {
  try {
    // Les vieux envois nominatifs ne fournissent parfois que l'adresse : pas de rapprochement par nom.
    let ids: string[] = apprenantId ? [apprenantId] : [];
    if (!apprenantId) {
      const adresse = (email ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return false;
      const { data, error } = await db.from("apprenants").select("id")
        .ilike("email", adresse.replace(/[%_\\]/g, "\\$&")).limit(2);
      if (error || !data || data.length !== 1) return false;
      ids = [data[0].id];
    }
    for (const id of ids) {
      // Pas de cache : un envoi d'attestation peut avoir eu lieu depuis la sélection des candidats.
      for (let from = 0; ; from += 100) {
        const { data, error } = await db.from("documents_a_signer")
          .select("modele_code,envoye_le,sent_at,envoi_etat,statut")
          .eq("apprenant_id", id).eq("modele_code", "attestation_fin_formation")
          .order("id").range(from, from + 99);
        if (error || !data) return false;
        if (data.some(attestationSuspendRelances)) return false;
        if (data.length < 100) break;
      }
    }
    return true;
  } catch {
    return false; // Lecture impossible : jamais de relance par défaut.
  }
}