/** Résumé affiché sur la fiche : Reste = Total dû − somme des paiements enregistrés (même source que la fenêtre Paiement). */
const eur = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

export function resumePaiement(totalDu: number, paiements: { montant?: number | string | null }[]) {
  const du = Number(totalDu || 0);
  const paye = (paiements ?? []).reduce((s, p) => s + Number(p?.montant || 0), 0);
  const reste = du - paye;
  const integral = du > 0 && reste <= 0.001;
  const libelle = integral
    ? `✅ Payé intégralement : ${eur(paye)} / ${eur(du)}`
    : `💳 Payé : ${eur(paye)} / ${eur(du)} — Reste : ${eur(reste)}`;
  return { du, paye, reste, integral, libelle };
}
