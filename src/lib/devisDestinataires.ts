// Plan et envoi idempotent d'un devis émis vers le stagiaire et, si financement tiers, le financeur.
export type RoleDestinataire = "stagiaire" | "financeur" | "stagiaire_financeur";
export interface Destinataire { role: RoleDestinataire; email: string }
export interface PlanDestinataires { destinataires: Destinataire[]; alertes: string[] }

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;
export const normaliserEmail = (e?: string | null) => (e ?? "").trim().toLowerCase();
export const emailValide = (e?: string | null) => EMAIL_RE.test(normaliserEmail(e));

export function planDestinatairesDevis(p: { financementTiers: boolean; emailStagiaire?: string | null; emailFinanceur?: string | null }): PlanDestinataires {
  const alertes: string[] = [];
  const out: Destinataire[] = [];
  const s = normaliserEmail(p.emailStagiaire);
  if (emailValide(s)) out.push({ role: "stagiaire", email: s });
  else alertes.push(s ? `Email stagiaire invalide (${s}) : devis non envoyé au stagiaire.` : "Email stagiaire absent : devis non envoyé au stagiaire.");
  if (p.financementTiers) {
    const f = normaliserEmail(p.emailFinanceur);
    if (!emailValide(f)) alertes.push(f ? `Email financeur invalide (${f}) : devis non envoyé au financeur.` : "Email financeur absent : devis non envoyé au financeur.");
    else if (out.some(d => d.email === f)) out[0] = { role: "stagiaire_financeur", email: f };
    else out.push({ role: "financeur", email: f });
  }
  return { destinataires: out, alertes };
}

export type StatutEnvoi = "envoye" | "echec" | "deja_envoye" | "en_cours_ailleurs";
export interface ResultatDestinataire extends Destinataire { statut: StatutEnvoi; erreur?: string }

export interface JournalDevis {
  /** Réserve l'envoi ; renvoie false si déjà envoyé ou en cours (statut existant). */
  reserver(d: Destinataire): Promise<{ ok: true } | { ok: false; statut: "envoye" | "en_cours" }>;
  marquer(d: Destinataire, statut: "envoye" | "echec", erreur?: string): Promise<void>;
}

export async function envoyerDevisAuxDestinataires(
  destinataires: Destinataire[],
  journal: JournalDevis,
  envoyer: (d: Destinataire) => Promise<void>,
): Promise<ResultatDestinataire[]> {
  const res: ResultatDestinataire[] = [];
  for (const d of destinataires) {
    let r;
    try { r = await journal.reserver(d); }
    catch (e: any) { res.push({ ...d, statut: "echec", erreur: `Journal indisponible, aucun envoi : ${e?.message ?? e}` }); continue; }
    if (!r.ok) { res.push({ ...d, statut: r.statut === "envoye" ? "deja_envoye" : "en_cours_ailleurs" }); continue; }
    try {
      await envoyer(d);
    } catch (e: any) {
      const erreur = String(e?.message ?? e ?? "Erreur inconnue");
      await journal.marquer(d, "echec", erreur).catch(() => {});
      res.push({ ...d, statut: "echec", erreur });
      continue;
    }
    try { await journal.marquer(d, "envoye"); }
    catch (e: any) { res.push({ ...d, statut: "envoye", erreur: `Envoyé, mais journal non mis à jour : ${e?.message ?? e}` }); continue; }
    res.push({ ...d, statut: "envoye" });
  }
  return res;
}
