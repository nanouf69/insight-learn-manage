/**
 * Quiz avant examen TAXI — inventaire en LECTURE SEULE (aperçu admin, non publié).
 * Projette les questions existantes avec leurs identités d'origine ; ne copie,
 * ne modifie et ne convertit rien. Les QRC sont listées mais exclues du quiz.
 */
export type Theme =
  | "national" | "local" | "adresses" | "stations"
  | "communes" | "cas_pratiques" | "jours_feries" | "arrondissements";

export const THEMES: Record<Theme, string> = {
  national: "Bilan examen — Réglementation nationale TAXI",
  local: "Bilan examen — Réglementation locale (Métropole de Lyon)",
  adresses: "Lyon — places, avenues, boulevards, rues, lieux",
  stations: "Stations de taxi",
  communes: "Communes Métropole de Lyon et ZUPC",
  cas_pratiques: "Cas pratiques tarification",
  jours_feries: "Jours fériés",
  arrondissements: "Arrondissements de Lyon",
};

/** Sources retenues : module → exercice → thème. Seules ces combinaisons sont lues. */
export const SOURCES: { module: number; exercice: number; theme: Theme }[] = [
  { module: 9, exercice: 203, theme: "national" }, { module: 11, exercice: 605, theme: "national" },
  { module: 27, exercice: 250, theme: "national" }, { module: 28, exercice: 700, theme: "national" },
  { module: 9, exercice: 204, theme: "local" }, { module: 11, exercice: 606, theme: "local" },
  { module: 27, exercice: 251, theme: "local" }, { module: 28, exercice: 701, theme: "local" },
  // Module 13 / exercice 13100 (Contrôle de connaissances TAXI) EXCLU entièrement (consigne 16/11).
  ...[7001, 7002, 7003, 7004, 7005, 7006, 7007, 7009, 7010, 7011, 7012, 7013, 7014, 7015]
    .map((exercice) => ({ module: 7, exercice, theme: "adresses" as Theme })),
  { module: 7, exercice: 7008, theme: "stations" },
  { module: 7, exercice: 7020, theme: "communes" }, { module: 7, exercice: 7021, theme: "communes" },
  ...[300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310]
    .map((exercice) => ({ module: 12, exercice, theme: "cas_pratiques" as Theme })),
];

export interface Choix { lettre: string; texte: string; correct: boolean }
export interface ItemInventaire {
  cle: string; // identité canonique stable (question_id/uid sinon module:exo:id)
  canonique: boolean;
  theme: Theme; module: number; exercice: number; exerciceTitre: string; questionId: string;
  type: "QCM" | "QRC"; enonce: string; choix: Choix[]; bonnes: string[];
  exerciceActif: boolean; sansCorrige: boolean; doublonDe: string | null;
  /** Empreinte de l'énoncé + propositions (sans corrigé) : détecte une question modifiée. */
  empreinteContenu: string;
  /** Même énoncé/propositions qu'une autre source mais bonnes réponses différentes : jamais exclu en silence. */
  conflitAvec: string[];
  /** Autres sources fusionnées dans cette question (doublons au corrigé identique). */
  sourcesFusionnees: string[];
  /** Mentionne un jour férié avec une année ou une date figée (2026…). */
  ferieFige: boolean;
  /** Identifiant d'origine utilisé deux fois dans le même exercice. */
  idCollision: boolean;
}

interface RowModule { module_id: number; module_data: unknown }
type Q = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\[s=\d+\][\s\S]*?\[\/s\]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function construireInventaire(rows: RowModule[]): ItemInventaire[] {
  const items: ItemInventaire[] = [];
  for (const src of SOURCES) {
    const row = rows.find((r) => Number(r.module_id) === src.module);
    const exos = ((row?.module_data as Q | undefined)?.exercices ?? []) as Q[];
    const exo = exos.find((e) => Number(e.id) === src.exercice);
    if (!exo) continue;
    for (const q of (exo.questions ?? []) as Q[]) {
      const choix: Choix[] = ((q.choix ?? []) as Q[]).map((c, i) => ({
        lettre: str(c.lettre) || String.fromCharCode(65 + i), texte: str(c.texte), correct: c.correct === true,
      }));
      const typeBrut = str(q.type).toUpperCase();
      const type: "QCM" | "QRC" = typeBrut === "QRC" || choix.length === 0 ? "QRC" : "QCM";
      const canon = str(q.question_id) || str(q.uid);
      const questionId = str(q.id);
      const bonnes = choix.filter((c) => c.correct).map((c) => c.lettre);
      const enonce = str(q.enonce);
      const empreinteContenu = empreinte(normaliser(enonce) + "|" + choix.map((c) => c.lettre + ":" + normaliser(c.texte)).join("|"));
      const texteComplet = enonce + " " + choix.map((c) => c.texte).join(" ");
      items.push({
        cle: canon || (questionId ? `${src.module}:${src.exercice}:${questionId}` : `${src.module}:${src.exercice}:h${empreinteContenu}`), canonique: !!canon,
        empreinteContenu, conflitAvec: [], sourcesFusionnees: [], idCollision: false,
        ferieFige: /f[ée]ri[ée]/i.test(texteComplet) && /\b20\d\d\b|\b\d{1,2}\s*(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\b|\d{1,2}\/\d{1,2}/i.test(texteComplet),
        theme: src.theme, module: src.module, exercice: src.exercice, exerciceTitre: str(exo.titre),
        questionId, type, enonce, choix, bonnes,
        exerciceActif: exo.actif !== false, sansCorrige: type === "QCM" && bonnes.length === 0, doublonDe: null,
      });
    }
  }
  return marquerDoublons(items);
}

/** Hash FNV-1a 32 bits (hex) — stable, sans dépendance. */
export function empreinte(t: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const ref = (it: ItemInventaire) => it.cle + "@" + it.module + "/" + it.exercice;
const bonnesTextes = (it: ItemInventaire) => it.choix.filter((c) => c.correct).map((c) => normaliser(c.texte)).sort().join("|");

/**
 * Doublon = même énoncé normalisé + mêmes propositions ET mêmes bonnes réponses : fusionné
 * dans la 1re occurrence (sources listées). Mêmes propositions mais corrigés différents =
 * conflit : toutes les versions restent visibles, aucune n'est notée avant arbitrage.
 * Les clés en double reçoivent un suffixe d'empreinte de contenu (stable si l'ordre change) et sont signalées.
 */
export function marquerDoublons(items: ItemInventaire[]): ItemInventaire[] {
  const cles = new Map<string, number>();
  const out = items.map((it) => {
    cles.set(it.cle, (cles.get(it.cle) ?? 0) + 1); return { ...it };
  });
  const vusSuffixe = new Map<string, number>();
  for (const it of out) {
    if ((cles.get(it.cle) ?? 0) < 2) continue;
    let k = `${it.cle}#h${it.empreinteContenu}`;
    const n = (vusSuffixe.get(k) ?? 0) + 1; vusSuffixe.set(k, n);
    if (n > 1) k += `~${n}`; // contenu strictement identique sous le même ID : départage par ordre
    it.cle = k; it.idCollision = true;
  }
  const groupes = new Map<string, ItemInventaire[]>();
  for (const it of out) {
    if (it.type !== "QCM") continue;
    const k = normaliser(it.enonce) + "|" + it.choix.map((c) => normaliser(c.texte)).sort().join("|");
    groupes.set(k, [...(groupes.get(k) ?? []), it]);
  }
  for (const g of groupes.values()) {
    if (g.length < 2) continue;
    const corriges = new Set(g.filter((x) => !x.sansCorrige).map(bonnesTextes));
    if (corriges.size > 1) {
      for (const it of g) it.conflitAvec = g.filter((x) => x !== it).map(ref);
      continue;
    }
    const tete = g.find((x) => !x.sansCorrige && x.exerciceActif) ?? g[0];
    for (const it of g) if (it !== tete) { it.doublonDe = ref(tete); tete.sourcesFusionnees.push(ref(it)); }
  }
  return out;
}

/** Éligible au quiz : QCM avec au moins une bonne réponse, exercice actif, non doublon, sans conflit. */
export const eligible = (it: ItemInventaire) => it.type === "QCM" && !it.sansCorrige && it.exerciceActif && !it.doublonDe && it.conflitAvec.length === 0;

/** Score /20 tout-ou-rien (ensemble exact, ordre indifférent). */
export function score20(questions: Pick<ItemInventaire, "cle" | "bonnes">[], reponses: Record<string, string[]>): number {
  if (!questions.length) return 0;
  const ok = questions.filter((q) => {
    const r = [...new Set(reponses[q.cle] ?? [])].sort();
    const b = [...q.bonnes].sort();
    return r.length === b.length && r.every((x, i) => x === b[i]);
  }).length;
  return Math.round((ok / questions.length) * 20 * 100) / 100;
}

/** Jours fériés France métropolitaine pour une année (Pâques par algorithme de Meeus). */
export function joursFeries(annee: number): { nom: string; date: string }[] {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = Date.UTC(annee, mois - 1, jour);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const plus = (n: number) => iso(paques + n * 86400000);
  const fixe = (mm: number, dd: number) => iso(Date.UTC(annee, mm - 1, dd));
  return [
    { nom: "Jour de l'an", date: fixe(1, 1) }, { nom: "Lundi de Pâques", date: plus(1) },
    { nom: "Fête du Travail", date: fixe(5, 1) }, { nom: "Victoire 1945", date: fixe(5, 8) },
    { nom: "Ascension", date: plus(39) }, { nom: "Lundi de Pentecôte", date: plus(50) },
    { nom: "Fête nationale", date: fixe(7, 14) }, { nom: "Assomption", date: fixe(8, 15) },
    { nom: "Toussaint", date: fixe(11, 1) }, { nom: "Armistice 1918", date: fixe(11, 11) },
    { nom: "Noël", date: fixe(12, 25) },
  ];
}

export function versCsv(items: ItemInventaire[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const tete = ["theme", "module", "exercice", "exercice_titre", "question_id", "cle_canonique", "type", "enonce", "propositions", "bonnes_reponses", "exercice_actif", "sans_corrige", "doublon_de", "sources_fusionnees", "conflit_avec", "ferie_date_figee", "id_collision", "eligible_quiz"];
  const lignes = items.map((it) => [THEMES[it.theme], it.module, it.exercice, it.exerciceTitre, it.questionId, it.cle, it.type, it.enonce,
    it.choix.map((c) => `${c.lettre}) ${c.texte}`).join(" | "), it.bonnes.join("+"), it.exerciceActif ? "oui" : "non",
    it.sansCorrige ? "oui" : "non", it.doublonDe ?? "", it.sourcesFusionnees.join(" "), it.conflitAvec.join(" "), it.ferieFige ? "oui" : "non", it.idCollision ? "oui" : "non", eligible(it) ? "oui" : "non"].map((v) => esc(String(v))).join(";"));
  return "\uFEFF" + [tete.join(";"), ...lignes].join("\n");
}
