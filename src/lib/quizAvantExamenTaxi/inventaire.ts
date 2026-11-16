/**
 * Quiz avant examen TAXI — inventaire en LECTURE SEULE (aperçu admin, non publié).
 * Projette les questions existantes avec leurs identités d'origine ; ne copie,
 * ne modifie et ne convertit rien. Les QRC sont listées mais exclues du quiz.
 */
export type Theme =
  | "national" | "local" | "controle" | "adresses" | "stations"
  | "communes" | "cas_pratiques" | "jours_feries" | "arrondissements";

export const THEMES: Record<Theme, string> = {
  national: "Bilan examen — Réglementation nationale TAXI",
  local: "Bilan examen — Réglementation locale (Métropole de Lyon)",
  controle: "Contrôle de connaissances TAXI (bilan complet)",
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
  { module: 13, exercice: 13100, theme: "controle" },
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
      items.push({
        cle: canon || `${src.module}:${src.exercice}:${questionId}`, canonique: !!canon,
        theme: src.theme, module: src.module, exercice: src.exercice, exerciceTitre: str(exo.titre),
        questionId, type, enonce: str(q.enonce), choix, bonnes,
        exerciceActif: exo.actif !== false, sansCorrige: type === "QCM" && bonnes.length === 0, doublonDe: null,
      });
    }
  }
  return marquerDoublons(items);
}

/** Doublon = même énoncé normalisé + mêmes propositions ; la 1re occurrence fait référence. */
export function marquerDoublons(items: ItemInventaire[]): ItemInventaire[] {
  const vus = new Map<string, string>();
  return items.map((it) => {
    const k = normaliser(it.enonce) + "|" + it.choix.map((c) => normaliser(c.texte)).sort().join("|");
    const ref = vus.get(k);
    if (!ref) { vus.set(k, it.cle + "@" + it.module + "/" + it.exercice); return it; }
    return { ...it, doublonDe: ref };
  });
}

/** Éligible au quiz : QCM avec au moins une bonne réponse, exercice actif, non doublon. */
export const eligible = (it: ItemInventaire) => it.type === "QCM" && !it.sansCorrige && it.exerciceActif && !it.doublonDe;

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
  const tete = ["theme", "module", "exercice", "exercice_titre", "question_id", "cle_canonique", "type", "enonce", "propositions", "bonnes_reponses", "exercice_actif", "sans_corrige", "doublon_de", "eligible_quiz"];
  const lignes = items.map((it) => [THEMES[it.theme], it.module, it.exercice, it.exerciceTitre, it.questionId, it.cle, it.type, it.enonce,
    it.choix.map((c) => `${c.lettre}) ${c.texte}`).join(" | "), it.bonnes.join("+"), it.exerciceActif ? "oui" : "non",
    it.sansCorrige ? "oui" : "non", it.doublonDe ?? "", eligible(it) ? "oui" : "non"].map((v) => esc(String(v))).join(";"));
  return "\uFEFF" + [tete.join(";"), ...lignes].join("\n");
}
