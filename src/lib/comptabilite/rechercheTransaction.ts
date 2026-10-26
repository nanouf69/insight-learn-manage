// Recherche des transactions bancaires : libellé/fournisseur/catégorie + texte
// du SEUL justificatif rattaché (justificatif_id). Lecture seule, aucune écriture.
export interface TxRecherche {
  libelle: string;
  fournisseur_client?: string | null;
  categorie?: string | null;
  justificatif_id?: string | null;
}
export interface JustifRecherche {
  id: string;
  nom_fichier?: string | null;
  fournisseur?: string | null;
  description?: string | null;
  notes?: string | null;
  texte_extrait?: string | null;
}
export type ResultatRecherche =
  | { trouve: false }
  | { trouve: true; source: "transaction" }
  | { trouve: true; source: "justificatif"; champ: string; extrait: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const CHAMPS: [keyof JustifRecherche, string][] = [
  ["fournisseur", "fournisseur"],
  ["nom_fichier", "nom du fichier"],
  ["description", "description"],
  ["notes", "notes"],
  ["texte_extrait", "texte du ticket"],
];

export function extraitAutour(texte: string, q: string, rayon = 40): string {
  const i = norm(texte).indexOf(norm(q));
  if (i < 0) return texte.slice(0, rayon * 2);
  const debut = Math.max(0, i - rayon);
  const fin = Math.min(texte.length, i + q.length + rayon);
  return `${debut > 0 ? "…" : ""}${texte.slice(debut, fin).replace(/\s+/g, " ").trim()}${fin < texte.length ? "…" : ""}`;
}

export function rechercherTransaction(
  tx: TxRecherche,
  justifParId: Map<string, JustifRecherche>,
  recherche: string,
): ResultatRecherche {
  const q = recherche.trim();
  if (!q) return { trouve: true, source: "transaction" };
  const nq = norm(q);
  if ([tx.libelle, tx.fournisseur_client, tx.categorie].some(v => v && norm(v).includes(nq))) {
    return { trouve: true, source: "transaction" };
  }
  const j = tx.justificatif_id ? justifParId.get(tx.justificatif_id) : undefined;
  if (!j) return { trouve: false };
  for (const [cle, label] of CHAMPS) {
    const v = j[cle];
    if (typeof v === "string" && v && norm(v).includes(nq)) {
      return { trouve: true, source: "justificatif", champ: label, extrait: extraitAutour(v, q) };
    }
  }
  return { trouve: false };
}
