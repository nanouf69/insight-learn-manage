/** Date de fin = dernière connexion e-learning réelle (historique apprenant_connexions), jamais inventée. */
export interface ConnexionLite { id: string; started_at: string | null; last_seen_at?: string | null }
export type DateFin =
  | { etat: "ok"; date: string; connexionId: string; startedAt: string; source: string }
  | { etat: "bloquee"; raison: string };

export function dateFinDepuisConnexions(args: {
  connexions: ConnexionLite[] | null; dateDebut: string | null; derniereValidation: string | null;
}): DateFin {
  const { connexions, dateDebut, derniereValidation } = args;
  if (!connexions) return { etat: "bloquee", raison: "Historique des connexions illisible" };
  const valides = connexions.filter(c => c.started_at && Number.isFinite(Date.parse(c.started_at)));
  if (!valides.length) return { etat: "bloquee", raison: "Aucune connexion enregistrée : date de fin indisponible" };
  const der = valides.reduce((a, b) => (Date.parse(b.started_at!) > Date.parse(a.started_at!) ? b : a));
  const startedAt = der.started_at!;
  const ms = Date.parse(startedAt);
  const date = new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  if (dateDebut && date < dateDebut.slice(0, 10)) return { etat: "bloquee", raison: `Dernière connexion (${date}) antérieure au début de formation : contrôle humain requis` };
  if (!derniereValidation || !Number.isFinite(Date.parse(derniereValidation))) return { etat: "bloquee", raison: "Date de validation finale des modules indisponible : contrôle humain requis" };
  if (ms < Date.parse(derniereValidation)) return { etat: "bloquee", raison: "Dernière connexion antérieure à la validation finale des modules : contrôle humain requis" };
  return { etat: "ok", date, connexionId: der.id, startedAt, source: "Dernière connexion e-learning enregistrée" };
}
