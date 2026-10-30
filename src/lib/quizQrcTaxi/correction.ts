import { ALIAS_COMMUNS, COMMUNES_HORS_METROPOLE, ElementReference, METROPOLE_LYON, ZUPC_LYON } from "./communesLyon";

// ---------- Réponses écrites (portage déterministe de check-answer du site Quiz QRC TAXI, sans IA) ----------
export const normaliser = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export interface CorrectionQrc { score: number; isCorrect: boolean; reconnue: boolean; feedback: string }

export function corrigerQrc(reponse: string, attendue: string | string[]): CorrectionQrc {
  const liste = Array.isArray(attendue) ? attendue : [attendue];
  const u = normaliser(reponse);
  const attenduTexte = liste.join(", ");
  if (!u) return { score: 0, isCorrect: false, reconnue: true, feedback: `Pas de réponse. Réponse attendue : ${attenduTexte}` };
  const motsU = new Set(u.split(" "));
  const exp = normaliser(attenduTexte);
  if ((exp.includes("coordonnees telephoniques") && motsU.has("tel")) ||
      (exp.includes("honorabilite professionnelle") && u.includes("honorabilite"))) {
    return { score: 1, isCorrect: true, reconnue: true, feedback: "Bonne réponse !" };
  }
  const trouve = (e: string) => {
    const n = normaliser(e);
    const mots = n.split(" ").filter((w) => w.length >= 3);
    return (mots.length > 0 && mots.every((w) => u.includes(w))) || (n.length > 0 && u.includes(n));
  };
  if (liste.length > 1) {
    const ok = liste.filter(trouve).length;
    const requis = Math.min(3, liste.length);
    const score = Math.round(Math.min(1, ok / requis) * 2) / 2;
    if (score > 0) {
      return { score, isCorrect: score === 1, reconnue: true,
        feedback: score === 1 ? "Bonne réponse !" : `Réponse partielle (${ok}/${requis}) : ${score} point(s). Réponses attendues : ${attenduTexte}` };
    }
  } else if (trouve(liste[0])) {
    return { score: 1, isCorrect: true, reconnue: true, feedback: "Bonne réponse !" };
  }
  // Le site d'origine appelait ici une IA ; elle n'est pas utilisée sur la plateforme.
  return { score: 0, isCorrect: false, reconnue: false,
    feedback: `Réponse non reconnue automatiquement. Comparez avec la réponse attendue : ${attenduTexte}` };
}

// ---------- Communes ----------
const cleCommune = (s: string) =>
  normaliser(s).replace(/\bste\b/g, "sainte").replace(/\bst\b/g, "saint")
    .replace(/\blez\b|\bles\b/g, "les").replace(/\s+/g, "");

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}

/** Tous les noms connus (zones + voisines) : une saisie égale à l'un d'eux n'est jamais « corrigée » vers un autre. */
const NOMS_CONNUS = new Map<string, string>();
for (const n of [...METROPOLE_LYON.map((e) => e.nom), ...ZUPC_LYON.map((e) => e.nom), ...COMMUNES_HORS_METROPOLE]) {
  NOMS_CONNUS.set(cleCommune(n), n);
}

export function decouperSaisie(texte: string): string[] {
  return texte.split(/[\n,;/•]+/).map((s) => s.replace(/^\s*[-*\d.)]+\s*/, "").trim()).filter(Boolean);
}

export interface BilanCommunes {
  trouvees: string[];
  oubliees: string[];
  erronees: string[];
  doublons: string[];
  /** Correspondances tolérées pour une faute de frappe : saisie → nom officiel. */
  orthographe: { saisie: string; officiel: string }[];
  totalCommunes: number;
  communesTrouvees: number;
}

export function corrigerCommunes(texte: string, reference: ElementReference[]): BilanCommunes {
  const index = new Map<string, string>();
  for (const e of reference) {
    index.set(cleCommune(e.nom), e.nom);
    for (const a of [...(e.alias ?? []), ...(ALIAS_COMMUNS[e.nom] ?? [])]) index.set(cleCommune(a), e.nom);
  }
  // Arrondissements de Lyon → Lyon
  const trouvees = new Set<string>(); const erronees: string[] = []; const doublons: string[] = [];
  const orthographe: { saisie: string; officiel: string }[] = [];
  for (const saisie of decouperSaisie(texte)) {
    let k = cleCommune(saisie);
    if (/^lyon\d/.test(k) || /^lyon(1er|\d+e(me)?)(arrondissement)?$/.test(k)) k = "lyon";
    let officiel = index.get(k);
    if (!officiel && !NOMS_CONNUS.has(k) && k.length >= 5) {
      const seuil = k.length >= 12 ? 2 : 1;
      const proches = [...index.entries()].filter(([c]) => levenshtein(c, k) <= seuil);
      const cibles = new Set(proches.map(([, n]) => n));
      const autres = [...NOMS_CONNUS.keys()].some((c) => !index.has(c) && levenshtein(c, k) <= seuil);
      if (cibles.size === 1 && !autres) { officiel = [...cibles][0]; orthographe.push({ saisie, officiel }); }
    }
    if (!officiel) { erronees.push(saisie); continue; }
    if (trouvees.has(officiel)) doublons.push(saisie); else trouvees.add(officiel);
  }
  const oubliees = reference.map((e) => e.nom).filter((n) => !trouvees.has(n));
  const communes = reference.filter((e) => e.estCommune);
  return {
    trouvees: reference.map((e) => e.nom).filter((n) => trouvees.has(n)),
    oubliees, erronees, doublons, orthographe,
    totalCommunes: communes.length,
    communesTrouvees: communes.filter((e) => trouvees.has(e.nom)).length,
  };
}

export interface BilanCases { justes: string[]; oubliees: string[]; erronees: string[] }
export function corrigerCases(cochees: string[], reference: ElementReference[]): BilanCases {
  const ref = new Set(reference.map((e) => e.nom)); const c = new Set(cochees);
  return {
    justes: reference.map((e) => e.nom).filter((n) => c.has(n)),
    oubliees: reference.map((e) => e.nom).filter((n) => !c.has(n)),
    erronees: cochees.filter((n) => !ref.has(n)),
  };
}
