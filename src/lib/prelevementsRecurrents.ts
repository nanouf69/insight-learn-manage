export type TxPrelev = { date_operation: string; libelle: string; montant: number | string; fournisseur_client?: string | null };

export type GroupePrelev = {
  cle: string; societe: string; exempleLibelle: string; frequence: "Mensuel" | "Tous les 2 mois";
  montantHabituel: number; nombre: number; total: number; dernier: string; coutMensuel: number;
};

const BRUIT = /\b(prlv|prelevement|prel|sepa|sdd|cb|carte|vir|virement|de|du|la|le|les|ref|rum|ics|mandat|ech|echeance|facture|fact|sarl|sas|sa|eurl|europe|france|fr)\b/g;

/** Nom de société lisible tiré du libellé bancaire. */
export function societeDepuisLibelle(libelle: string): string {
  const s = (libelle || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z ]+/g, " ").replace(BRUIT, " ").replace(/\b[a-z]{1,2}\b/g, " ")
    .replace(/\s+/g, " ").trim();
  return s.split(" ").slice(0, 3).join(" ");
}

const mediane = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Regroupe les débits par société ; garde ceux dont l'écart typique entre deux paiements ≈ 1 mois ou ≈ 2 mois. */
export function detecterPrelevements(txs: TxPrelev[]): GroupePrelev[] {
  const groupes = new Map<string, TxPrelev[]>();
  for (const t of txs) {
    if (!(Number(t.montant) < 0)) continue;
    const cle = (t.fournisseur_client?.trim().toLowerCase()) || societeDepuisLibelle(t.libelle);
    if (!cle || cle.length < 3) continue;
    (groupes.get(cle) ?? groupes.set(cle, []).get(cle)!).push(t);
  }
  const res: GroupePrelev[] = [];
  for (const [cle, liste] of groupes) {
    // un seul paiement par mois (évite les achats multiples dans le mois)
    const parMois = new Map<string, TxPrelev[]>();
    for (const t of liste) { const m = t.date_operation.slice(0, 7); (parMois.get(m) ?? parMois.set(m, []).get(m)!).push(t); }
    const mois = [...parMois.keys()].sort();
    if (mois.length < 3) continue;
    const idx = mois.map((m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)));
    const ecarts = idx.slice(1).map((v, i) => v - idx[i]);
    const e = mediane(ecarts);
    const conformes = ecarts.filter((x) => x === Math.round(e)).length / ecarts.length;
    if (conformes < 0.6 || (e !== 1 && e !== 2)) continue;
    if (e === 1 && [...parMois.values()].some((v) => v.length > 2)) continue;
    const montants = liste.map((t) => Math.abs(Number(t.montant)));
    const total = montants.reduce((s, x) => s + x, 0);
    const habituel = mediane(montants);
    const tri = [...liste].sort((a, b) => a.date_operation.localeCompare(b.date_operation));
    res.push({
      cle,
      societe: (liste.find((t) => t.fournisseur_client)?.fournisseur_client) || cle.toUpperCase(),
      exempleLibelle: tri[tri.length - 1].libelle,
      frequence: e === 1 ? "Mensuel" : "Tous les 2 mois",
      montantHabituel: habituel, nombre: liste.length, total,
      dernier: tri[tri.length - 1].date_operation,
      coutMensuel: e === 1 ? habituel : habituel / 2,
    });
  }
  return res.sort((a, b) => b.total - a.total);
}
