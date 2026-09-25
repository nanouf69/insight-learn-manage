/**
 * Suivi du paiement (financement personnel).
 * Total payé = paiements enregistrés + virements reçus correspondants NON déjà enregistrés comme paiement.
 * Reste = Total dû − Total payé.
 */
const eur = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

export type PaiementLike = { montant?: number | string | null; date_paiement?: string | null };
export type VirementLike = { id?: string; montant?: number | string | null; date_operation?: string | null; libelle?: string | null };

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const occurrences = (texte: string, mot: string) => {
  if (!mot) return 0;
  const re = new RegExp(`(^| )${mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`, "g");
  return (` ${texte} `.replace(/ /g, "  ").match(re) || []).length;
};

/** Virement correspondant : montant > 0, libellé contenant le NOM et le PRÉNOM entiers de l'élève, pas avant `depuis`. */
export function virementsCorrespondants(txs: VirementLike[], nom?: string | null, prenom?: string | null, depuis?: string | null) {
  const n = norm(nom || ""), p = norm(prenom || "");
  if (n.length < 2 || p.length < 2) return [];
  return (txs ?? []).filter((t) => {
    if (!(Number(t?.montant) > 0)) return false;
    if (depuis && t?.date_operation && t.date_operation < depuis) return false;
    const l = norm(t?.libelle || "");
    if (n === p) return occurrences(l, n) >= 2;
    return occurrences(l, n) >= 1 && occurrences(l, p) >= 1;
  });
}

export function resumePaiement(totalDu: number, paiements: PaiementLike[], virements: VirementLike[] = []) {
  const du = Number(totalDu || 0);
  const liste = paiements ?? [];
  const payeEnregistre = liste.reduce((s, p) => s + Number(p?.montant || 0), 0);
  // Anti double comptage : un virement déjà saisi comme paiement (même montant, même date) n'est pas recompté.
  const utilises = new Set<number>();
  const virementsAjoutes = (virements ?? []).filter((v) => {
    const idx = liste.findIndex(
      (p, i) => !utilises.has(i) && Math.abs(Number(p?.montant || 0) - Number(v?.montant || 0)) < 0.01 &&
        (p?.date_paiement || "").slice(0, 10) === (v?.date_operation || "").slice(0, 10),
    );
    if (idx >= 0) { utilises.add(idx); return false; }
    return true;
  });
  const payeVirements = virementsAjoutes.reduce((s, v) => s + Number(v?.montant || 0), 0);
  const paye = payeEnregistre + payeVirements;
  const reste = du - paye;
  const integral = du > 0 && reste <= 0.001;
  const libelle = integral
    ? `✅ Payé intégralement : ${eur(paye)} / ${eur(du)}`
    : `💳 Payé : ${eur(paye)} / ${eur(du)} — Reste : ${eur(reste)}`;
  return { du, paye, payeEnregistre, payeVirements, virementsAjoutes, reste, integral, libelle };
}
