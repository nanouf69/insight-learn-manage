/**
 * États distincts du suivi d'un e-mail. Règle : l'ouverture (pixel) n'est
 * JAMAIS une confirmation de réception ; « Réception confirmée » exige
 * l'action explicite du destinataire (confirmed_at serveur).
 */
export type EtapeSuivi =
  | { code: "accepte"; date: string | null }
  | { code: "remis"; date: string }
  | { code: "remis_inconnu" }
  | { code: "echec"; date: string | null; erreur: string | null }
  | { code: "ouvert_indice"; date: string; nombre: number }
  | { code: "confirme"; date: string }
  | { code: "non_confirme" };

export interface SuiviSource {
  statut: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  open_count: number | null;
  failed_at: string | null;
  erreur: string | null;
  confirmed_at?: string | null;
}

export function etapesSuiviEmail(a: SuiviSource): EtapeSuivi[] {
  const etapes: EtapeSuivi[] = [{ code: "accepte", date: a.sent_at }];
  const echec = a.statut === "echec" || !!a.failed_at;
  if (echec) {
    etapes.push({ code: "echec", date: a.failed_at, erreur: a.erreur });
    return etapes; // un e-mail rejeté n'est ni remis ni confirmé
  }
  etapes.push(a.delivered_at ? { code: "remis", date: a.delivered_at } : { code: "remis_inconnu" });
  if (a.opened_at) etapes.push({ code: "ouvert_indice", date: a.opened_at, nombre: Math.max(1, a.open_count ?? 1) });
  etapes.push(a.confirmed_at ? { code: "confirme", date: a.confirmed_at } : { code: "non_confirme" });
  return etapes;
}

/** Alerte admin : rejet, ou aucune remise vérifiée 24 h après l'envoi. */
export function alerteNonRemis(a: SuiviSource, maintenant = Date.now()): boolean {
  if (a.statut === "echec" || a.failed_at) return true;
  if (a.delivered_at || !a.sent_at) return false;
  return maintenant - new Date(a.sent_at).getTime() > 24 * 3600 * 1000;
}
