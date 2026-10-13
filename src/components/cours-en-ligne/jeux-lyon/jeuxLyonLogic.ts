// Logique pure des jeux cartographiques de Lyon (module PRATIQUE VTC).
// Entraînement complémentaire : aucune écriture serveur, aucun impact sur
// quiz, notes, progression, heures, jalons ou relevés figés.
import { LYON_GEO, type LieuLyon, type ZoneQuartier } from "./lyon-geo-data";

/** 1 unité de carte ≈ mètres (largeur 1000 = 0,14° de longitude à 45,76° N). */
export const METRES_PAR_UNITE =
  ((LYON_GEO.bbox[2] - LYON_GEO.bbox[0]) * 111_320 * Math.cos((45.76 * Math.PI) / 180)) / LYON_GEO.W;

/** Tolérance de placement d'un lieu : juste ≤ 400 m, proche ≤ 800 m (jamais au pixel près). */
export const TOLERANCE_LIEU_M = 400;
export const TOLERANCE_PROCHE_M = 800;

export function melanger<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function libelleArrondissement(n: number): string {
  return n === 1 ? "1er arrondissement" : `${n}e arrondissement`;
}

export function libelleArrondissements(ns: number[]): string {
  if (ns.length === 0) return "hors des arrondissements de Lyon";
  const l = ns.map((n) => (n === 1 ? "1er" : `${n}e`));
  return l.length === 1 ? libelleArrondissement(ns[0]) : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]} arrondissements`;
}

/** Arrondissement : juste uniquement si la zone touchée est exactement l'arrondissement demandé. */
export function evaluerArrondissement(attendu: number, touche: number | null): boolean {
  return touche !== null && touche === attendu;
}

/**
 * Quartier : juste si la zone souple demandée a été touchée (le composant fournit
 * la liste des zones touchées, bordure tolérante incluse). Un quartier à cheval sur
 * plusieurs arrondissements (Croix-Rousse 1er/4e, Presqu'île 1er/2e) est juste partout
 * dans son périmètre : jamais refusé parce que l'arrondissement diffère.
 */
export function evaluerQuartier(zone: ZoneQuartier, zonesTouchees: string[]): boolean {
  return zonesTouchees.includes(zone.id);
}

export type ResultatLieu = { juste: boolean; proche: boolean; distanceM: number };

export function evaluerLieu(lieu: Pick<LieuLyon, "x" | "y">, x: number, y: number): ResultatLieu {
  const distanceM = Math.round(Math.hypot(lieu.x - x, lieu.y - y) * METRES_PAR_UNITE);
  return { juste: distanceM <= TOLERANCE_LIEU_M, proche: distanceM <= TOLERANCE_PROCHE_M, distanceM };
}

/** Fiche « lieu — quartier — arrondissement » ; une commune limitrophe n'est jamais un arrondissement. */
export function ficheLieu(lieu: LieuLyon): string {
  const loc = lieu.arrondissement
    ? `Lyon ${libelleArrondissement(lieu.arrondissement)}`
    : `${lieu.commune} — commune limitrophe, ce n'est pas un arrondissement de Lyon`;
  return `${lieu.nom} — ${lieu.quartier} — ${loc}`;
}

/** Points : 1 au premier essai, 0,5 au second, 0 ensuite. */
export function pointsEssai(essai: number, juste: boolean): number {
  if (!juste) return 0;
  return essai === 1 ? 1 : essai === 2 ? 0.5 : 0;
}

export const MAX_ESSAIS = 2;

// ---- Meilleur score local (par compte, jamais effacé, jamais envoyé au serveur) ----
export function cleMeilleurScore(compteId: string, jeu: string): string {
  return `jeux-lyon:v1:${compteId}:${jeu}`;
}
export type MeilleurScore = { score: number; total: number; date: string };
export function lireMeilleurScore(storage: Pick<Storage, "getItem">, compteId: string | null | undefined, jeu: string): MeilleurScore | null {
  if (!compteId) return null;
  try {
    const raw = storage.getItem(cleMeilleurScore(compteId, jeu));
    return raw ? (JSON.parse(raw) as MeilleurScore) : null;
  } catch { return null; }
}
export function enregistrerMeilleurScore(storage: Pick<Storage, "getItem" | "setItem">, compteId: string | null | undefined, jeu: string, s: MeilleurScore): boolean {
  if (!compteId) return false;
  const prev = lireMeilleurScore(storage, compteId, jeu);
  if (prev && prev.score / prev.total >= s.score / s.total) return false;
  try { storage.setItem(cleMeilleurScore(compteId, jeu), JSON.stringify(s)); return true; } catch { return false; }
}
