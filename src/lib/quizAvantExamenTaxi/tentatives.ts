/**
 * Tentatives du quiz avant examen TAXI — APERÇU ADMIN uniquement.
 * Stockage local au navigateur, cloisonné par compte admin ; aucune écriture serveur.
 * Une tentative fige la LISTE des clés de questions et les réponses choisies ;
 * la note est toujours recalculée avec le corrigé actuel (synchronisation des corrections).
 */
import { THEMES, type ItemInventaire, type Theme } from "./inventaire";

export interface Reponse { lettres: string[]; empreinte: string; le: string }
export interface Tentative {
  id: string; creeLe: string; termineeLe: string | null;
  mode: "toutes" | "erreurs"; parent: string | null; numero: number;
  cles: string[]; reponses: Record<string, Reponse>;
  revision?: number;
}

const PREFIXE = "qaet-apercu-admin:v1:";
export const cleStockage = (compte: string) => PREFIXE + compte;

export interface Stockage { getItem(k: string): string | null; setItem(k: string, v: string): void }

export function lire(st: Stockage, compte: string): Tentative[] {
  try {
    const v = JSON.parse(st.getItem(cleStockage(compte)) ?? "[]");
    return Array.isArray(v) ? v.filter((t) => t && typeof t.id === "string" && Array.isArray(t.cles)) : [];
  } catch { return []; }
}

/** Écrit UNE tentative en relisant l'état stocké (un autre onglet ne perd pas les siennes). */
export function ecrire(st: Stockage, compte: string, t: Tentative): Tentative[] {
  const existantes = lire(st, compte);
  const precedente = existantes.find(x => x.id === t.id);
  if (precedente && (precedente.revision ?? 0) !== (t.revision ?? 0)) {
    throw new Error("Tentative modifiée dans un autre onglet : reprendre sa version enregistrée");
  }
  if (precedente?.termineeLe && JSON.stringify(precedente) !== JSON.stringify(t)) {
    throw new Error("Tentative terminée : aucune réponse ne peut être remplacée");
  }
  const enregistree = { ...t, revision: (t.revision ?? 0) + 1 };
  const autres = existantes.filter((x) => x.id !== t.id);
  const tout = [...autres, enregistree].sort((a, b) => a.numero - b.numero);
  st.setItem(cleStockage(compte), JSON.stringify(tout));
  const relu = lire(st, compte).find((x) => x.id === t.id);
  if (!relu || JSON.stringify(relu) !== JSON.stringify(enregistree)) throw new Error("Sauvegarde non confirmée à la relecture");
  return tout;
}

const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `t${Date.now()}${Math.random().toString(16).slice(2)}`);

/** Ordre fixe : par thème (ordre de THEMES), puis ordre d'origine. Aucun tirage aléatoire. */
export function ordonner(items: ItemInventaire[]): ItemInventaire[] {
  const rang = Object.keys(THEMES);
  return items.map((it, i) => ({ it, i })).sort((a, b) => rang.indexOf(a.it.theme) - rang.indexOf(b.it.theme) || a.i - b.i).map((x) => x.it);
}

export function creer(existantes: Tentative[], cles: string[], mode: Tentative["mode"], parent: string | null): Tentative {
  return { id: nouvelId(), creeLe: new Date().toISOString(), termineeLe: null, mode, parent,
    numero: existantes.reduce((m, t) => Math.max(m, t.numero), 0) + 1, cles: [...cles], reponses: {} };
}

export function repondre(t: Tentative, it: ItemInventaire, lettres: string[]): Tentative {
  if (t.termineeLe) throw new Error("Tentative terminée : réponses figées");
  if (!t.cles.includes(it.cle)) throw new Error("Question hors de cette tentative");
  return { ...t, reponses: { ...t.reponses, [it.cle]: { lettres: [...new Set(lettres)].sort(), empreinte: it.empreinteContenu, le: new Date().toISOString() } } };
}

export const juste = (it: Pick<ItemInventaire, "bonnes">, r?: Reponse) => {
  if (!r) return false;
  const b = [...it.bonnes].sort();
  return r.lettres.length === b.length && r.lettres.every((x, i) => x === b[i]);
};

export interface Bilan {
  note20: number; justes: number; notees: number; repondues: number; total: number;
  introuvables: string[]; modifiees: string[]; nonNotees: string[]; fausses: string[];
  parTheme: { theme: Theme; total: number; repondues: number; justes: number }[];
}

/** Recalcule avec le contenu ACTUEL. Questions disparues, modifiées après réponse ou devenues
 * non éligibles (conflit, sans corrigé) sont listées et exclues du dénominateur — jamais comptées fausses. */
export function bilan(t: Tentative, inventaire: Map<string, ItemInventaire>, estEligible: (i: ItemInventaire) => boolean): Bilan {
  const introuvables: string[] = [], modifiees: string[] = [], nonNotees: string[] = [], fausses: string[] = [];
  let justes = 0, notees = 0, repondues = 0;
  const pt = new Map<Theme, { total: number; repondues: number; justes: number }>();
  for (const cle of t.cles) {
    const it = inventaire.get(cle);
    if (!it) { introuvables.push(cle); continue; }
    const e = pt.get(it.theme) ?? { total: 0, repondues: 0, justes: 0 }; e.total++; pt.set(it.theme, e);
    const r = t.reponses[cle];
    if (r) { repondues++; e.repondues++; }
    if (!estEligible(it)) { nonNotees.push(cle); continue; }
    if (r && r.empreinte !== it.empreinteContenu) { modifiees.push(cle); continue; }
    notees++;
    if (juste(it, r)) { justes++; e.justes++; } else fausses.push(cle);
  }
  const rang = Object.keys(THEMES) as Theme[];
  return { note20: notees ? Math.round((justes / notees) * 2000) / 100 : 0, justes, notees, repondues, total: t.cles.length,
    introuvables, modifiees, nonNotees, fausses,
    parTheme: rang.flatMap((th) => { const p = pt.get(th); return p ? [{ theme: th, ...p }] : []; }) };
}
