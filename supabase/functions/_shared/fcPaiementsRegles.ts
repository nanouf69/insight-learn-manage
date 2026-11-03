// Règles pures : virements Formation continue TAXI/VTC → accès plateforme.
// Aucune I/O. Testées par src/test/fc-paiements-regles.test.ts.
// Principe : n'envoyer qu'en cas de correspondance CERTAINE, sinon revue manuelle.

export const MONTANT_MIN_FC = 50;

export type TxLite = { id: string; date_operation: string; montant: number; libelle: string | null; reference?: string | null };
export type DossierFc = { id: string; nom: string; prenom: string; email: string | null; type_apprenant: string | null; archive?: boolean };

export function normaliser(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Même virement importé par plusieurs sources (CSV/PDF/XLS/API) → même empreinte. */
export function empreinte(tx: TxLite): string {
  const lib = normaliser(tx.libelle).replace(/\s+/g, "").slice(0, 30);
  return `${tx.date_operation}|${Number(tx.montant).toFixed(2)}|${lib}`;
}

export function regrouperDoublons(txs: TxLite[]): Map<string, TxLite[]> {
  const m = new Map<string, TxLite[]>();
  for (const t of txs) {
    const k = empreinte(t);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(t);
  }
  return m;
}

const RE_FC = /\b(formation continue|form continue|continue (taxi|vtc)|fc (taxi|vtc)|(taxi|vtc) fc|recyclage)\b/;
export const mentionneFc = (libelle: string | null) => RE_FC.test(normaliser(libelle));

export const estDossierFc = (d: DossierFc) => (d.type_apprenant ?? "").toLowerCase().startsWith("continue") && !d.archive;

const mots = (s: string) => normaliser(s).split(" ").filter((w) => w.length >= 2);

/** Nom ET prénom présents comme mots entiers (tous leurs mots) dans le libellé. */
export function nomComplet(libelle: string | null, d: DossierFc): boolean {
  const lib = new Set(normaliser(libelle).split(" "));
  const n = mots(d.nom), p = mots(d.prenom);
  if (!n.length || !p.length) return false;
  return [...n, ...p].every((w) => lib.has(w));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Decision =
  | { statut: "hors_perimetre" }
  | { statut: "rembourse"; candidats: string[]; motif: string }
  | { statut: "rapproche"; apprenantId: string; candidats: string[]; motif: string }
  | { statut: "a_revoir"; candidats: string[]; motif: string };

export function classer(tx: TxLite, dossiers: DossierFc[]): Decision {
  const fc = dossiers.filter(estDossierFc);
  const candidats = fc.filter((d) => nomComplet(tx.libelle, d));
  const ids = candidats.map((d) => d.id);
  const mention = mentionneFc(tx.libelle);
  const m = Number(tx.montant);
  if (m < 0) {
    if (!mention && ids.length === 0) return { statut: "hors_perimetre" };
    return { statut: "rembourse", candidats: ids, motif: "Remboursement : aucun envoi" };
  }
  if (m < MONTANT_MIN_FC) return { statut: "hors_perimetre" };
  if (!mention && ids.length === 0) return { statut: "hors_perimetre" };
  if (ids.length === 0) return { statut: "a_revoir", candidats: [], motif: "Aucun stagiaire FC reconnu dans le libellé" };
  if (ids.length > 1) return { statut: "a_revoir", candidats: ids, motif: "Plusieurs stagiaires possibles (homonymes)" };
  const d = candidats[0];
  if (!d.email || !EMAIL_RE.test(d.email.trim())) return { statut: "a_revoir", candidats: ids, motif: "E-mail du stagiaire manquant ou invalide" };
  return { statut: "rapproche", apprenantId: d.id, candidats: ids, motif: "Nom et prénom complets, stagiaire FC unique" };
}

/** Envoi automatique seulement si : activé, paiement postérieur à l'activation, rapprochement certain, jamais déjà servi. */
export function peutEnvoyerAuto(p: { statut: string; historique: boolean }, actif: boolean, dejaServi: boolean): boolean {
  return actif && !p.historique && p.statut === "rapproche" && !dejaServi;
}
