// Rapprochement (affichage seul) entre l'export CSV des dossiers CPF (Caisse des Dépôts)
// et les factures de vente émises en 2026. Aucune écriture : résultat en mémoire uniquement.

export interface LigneExportCpf {
  numeroDossier: string;
  nom: string;
  prenom: string;
  statut: string;
  montantFacturable: number | null; // null = absent → non vérifiable
  montantFormation: number | null; // jamais utilisé comme substitut
  dateDebut: string;
  dateFin: string;
  intitule: string;
}

export interface FactureRapprochable {
  id: string;
  numero: string;
  date_emission: string | null;
  type_financement: string;
  montant_ttc: number;
  statut?: string | null;
  client_nom: string;
  beneficiaire: string; // nom/prénom élève lié, sinon tiré de la référence
}

export type CouleurRapprochement = "vert" | "rouge";
export interface ResultatRapprochement {
  couleur: CouleurRapprochement;
  motif: string;
  dossiers: LigneExportCpf[]; // dossier retenu (vert) ou candidats examinés (rouge)
}

export const STATUT_VALIDE = "Service fait validé";

const parseMontant = (v: string | undefined): number | null => {
  const s = (v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Parse le CSV (séparateur « ; », guillemets gérés). */
export function parseExportCpf(text: string): LigneExportCpf[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let q = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ";") { cur.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      cur.push(field); field = "";
      if (cur.some((x) => x !== "")) rows.push(cur);
      cur = [];
    } else field += c;
  }
  cur.push(field);
  if (cur.some((x) => x !== "")) rows.push(cur);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toUpperCase());
  const idx = (k: string) => head.indexOf(k);
  const req = ["NUMERO_DOSSIER", "NOM", "PRENOM", "STATUT_DOSSIER", "MONTANT_FACTURABLE"];
  const manquantes = req.filter((k) => idx(k) < 0);
  if (manquantes.length) throw new Error(`Colonnes manquantes : ${manquantes.join(", ")}`);
  const g = (r: string[], k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? "").trim() : "");
  return rows.slice(1).map((r) => ({
    numeroDossier: g(r, "NUMERO_DOSSIER"),
    nom: g(r, "NOM"),
    prenom: g(r, "PRENOM"),
    statut: g(r, "STATUT_DOSSIER"),
    montantFacturable: parseMontant(g(r, "MONTANT_FACTURABLE")),
    montantFormation: parseMontant(g(r, "MONTANT_FORMATION")),
    dateDebut: g(r, "DATE_DEBUT_SESSION"),
    dateFin: g(r, "DATE_FIN_SESSION"),
    intitule: g(r, "INTITULE_FORMATION"),
  }));
}

export const cleNom = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");

/** Facture de vente émise en 2026 (date d'émission réelle), hors achats et avoirs. */
export function estVente2026(f: { date_emission: string | null; type_financement: string; montant_ttc: number; id: string }): boolean {
  if (!f.date_emission || String(f.id).startsWith("draft-")) return false;
  if (f.type_financement === "fournisseur") return false;
  if (!(Number(f.montant_ttc) > 0)) return false;
  const d = f.date_emission.slice(0, 10);
  return d >= "2026-01-01" && d < "2027-01-01";
}

/** Nom du bénéficiaire tiré de la référence « 3077 - NOM Prénom - … » si aucun élève lié. */
export function beneficiaireDepuisReference(ref: string | null | undefined): string {
  const parts = (ref ?? "").split(" - ");
  return parts.length >= 2 ? parts[1].trim() : "";
}

const memeMontant = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function rapprocher(
  factures: FactureRapprochable[],
  lignes: LigneExportCpf[],
): Map<string, ResultatRapprochement> {
  const res = new Map<string, ResultatRapprochement>();
  const parNom = new Map<string, LigneExportCpf[]>();
  for (const l of lignes) {
    const k = cleNom(`${l.nom} ${l.prenom}`);
    if (!k) continue;
    parNom.set(k, [...(parNom.get(k) ?? []), l]);
  }
  // Regroupement des factures CPF par (bénéficiaire, montant) pour un rapprochement un à un.
  const groupes = new Map<string, FactureRapprochable[]>();
  const ventes = factures.filter(estVente2026).sort((a, b) =>
    (a.date_emission ?? "").localeCompare(b.date_emission ?? "") || a.numero.localeCompare(b.numero),
  );
  for (const f of ventes) {
    if (f.statut === "annulee") {
      res.set(f.id, { couleur: "rouge", motif: "Facture annulée : non rapprochée", dossiers: [] });
      continue;
    }
    if (f.type_financement !== "cpf") {
      res.set(f.id, { couleur: "rouge", motif: "Hors périmètre de l'export CPF : à vérifier (autre financement)", dossiers: [] });
      continue;
    }
    const k = cleNom(f.beneficiaire);
    if (!k) {
      res.set(f.id, { couleur: "rouge", motif: "Bénéficiaire inconnu sur la facture : non vérifiable", dossiers: [] });
      continue;
    }
    const gk = `${k}|${Number(f.montant_ttc).toFixed(2)}`;
    groupes.set(gk, [...(groupes.get(gk) ?? []), f]);
  }
  groupes.forEach((fs, gk) => {
    const [k] = gk.split("|");
    const montant = Number(fs[0].montant_ttc);
    const candidats = parNom.get(k) ?? [];
    const valides = candidats.filter((l) => l.statut === STATUT_VALIDE);
    const eligibles = valides.filter((l) => l.montantFacturable !== null && memeMontant(l.montantFacturable, montant));
    if (!candidats.length) {
      fs.forEach((f) => res.set(f.id, { couleur: "rouge", motif: "Bénéficiaire non retrouvé dans l'export", dossiers: [] }));
      return;
    }
    if (!eligibles.length) {
      const sansMontant = valides.filter((l) => l.montantFacturable === null);
      const statuts = Array.from(new Set(candidats.filter((l) => l.statut !== STATUT_VALIDE).map((l) => l.statut)));
      const motif = valides.length
        ? sansMontant.length === valides.length
          ? "Montant facturable absent de l'export : non vérifiable"
          : `Écart de montant : facture ${montant.toFixed(2)} € ≠ facturable ${valides.map((l) => l.montantFacturable?.toFixed(2) ?? "—").join(" / ")} €`
        : `Aucun dossier « ${STATUT_VALIDE} » (statuts : ${statuts.join(", ") || "—"})`;
      fs.forEach((f) => res.set(f.id, { couleur: "rouge", motif, dossiers: candidats }));
      return;
    }
    if (eligibles.length > fs.length) {
      fs.forEach((f) => res.set(f.id, {
        couleur: "rouge",
        motif: `Ambigu : ${eligibles.length} dossiers distincts au même nom et montant pour ${fs.length} facture(s)`,
        dossiers: eligibles,
      }));
      return;
    }
    fs.forEach((f, i) => {
      if (i < eligibles.length) {
        res.set(f.id, { couleur: "vert", motif: `Concorde avec le dossier ${eligibles[i].numeroDossier} (nom + montant facturable)`, dossiers: [eligibles[i]] });
      } else {
        res.set(f.id, {
          couleur: "rouge",
          motif: `Doublon potentiel : ${fs.length} factures pour ${eligibles.length} dossier(s) validé(s)`,
          dossiers: eligibles,
        });
      }
    });
  });
  return res;
}
