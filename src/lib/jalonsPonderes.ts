/**
 * Jalons pondérés — indicateur INTERNE ADMIN, purement indicatif.
 * Grille pédagogique fixe validée (somme 100 par filière). Aucune écriture,
 * aucune conversion en heures, aucune déclaration EDOF.
 * Fin de formation (50–53) et modules administratifs (83, 84) = jalons
 * obligatoires de poids 0 : tant qu'ils ne sont pas validés, le total reste < 100.
 */
export type Filiere = "vtc" | "taxi" | "ta" | "va";

const INTRO = -1; // poids de l'introduction, quel que soit l'id attribué (1/26/31/32/33/34)

export const GRILLE_JALONS: Record<Filiere, Record<number, number>> = {
  vtc: { [INTRO]: 1, 2: 42, 3: 1.9, 4: 15.6, 35: 11.4, 5: 16.5, 60: 0.7, 70: 6.3, 8: 4.6 },
  taxi: { [INTRO]: 0.8, 10: 36.4, 7: 10.4, 64: 0.8, 12: 1, 3: 1.6, 9: 13.9, 13: 3.3, 11: 13.8, 36: 9.3, 61: 0.7, 71: 6.2, 6: 1.8 },
  ta: { [INTRO]: 3.4, 40: 19.1, 7: 27.6, 64: 2.1, 12: 2.6, 3: 4.1, 27: 9.7, 13: 8.9, 28: 4.1, 37: 5.6, 62: 1.3, 72: 6.7, 6: 4.8 },
  va: { [INTRO]: 2.6, 41: 22.1, 3: 6.9, 29: 8.5, 30: 24.6, 38: 9.3, 63: 2, 73: 7.5, 8: 16.5 },
};

const INTRO_IDS = new Set([1, 26, 31, 32, 33, 34]);

/** Filière d'une clé de parcours (alias présentiel/e-présentiel/e-learning) ; null pour FC/mobilité. */
export function filiereDuParcours(key: string | null | undefined): Filiere | null {
  const k = String(key ?? "").toLowerCase().trim();
  const m = /^(vtc|taxi|ta|va)(-e|-e-presentiel)?$/.exec(k);
  return m ? (m[1] as Filiere) : null;
}

export interface CompletionLite { module_id: number; status?: string | null; progress?: number | null }

export interface LigneJalon { moduleId: number; poids: number; progression: number; contribution: number; obligatoireSansPoids: boolean }

export interface ResultatJalons {
  filiere: Filiere;
  taux: number; // 0..100, 1 décimale, jamais 100 si un jalon obligatoire manque
  lignes: LigneJalon[];
  jalonsObligatoiresManquants: number[];
}

/** completed confirmé = 100 ; sinon progress borné 0..100 ; absent = 0. Une ligne par module (pas de cumul de tentatives). */
export function progressionModule(row: CompletionLite | undefined): number {
  if (!row) return 0;
  if (row.status === "completed") return 100;
  const p = Number(row.progress);
  return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
}

export function calculerJalonsPonderes(
  filiere: Filiere,
  modulesParcours: number[],
  completions: CompletionLite[],
): ResultatJalons {
  const grille = GRILLE_JALONS[filiere];
  const parId = new Map<number, CompletionLite>();
  for (const c of completions) {
    const id = Number(c.module_id);
    const prev = parId.get(id);
    // Plusieurs lignes du même module : on garde la meilleure, sans additionner.
    if (!prev || progressionModule(c) > progressionModule(prev)) parId.set(id, c);
  }
  const lignes: LigneJalon[] = [];
  const vus = new Set<number>();
  for (const id of modulesParcours) {
    if (vus.has(id)) continue;
    vus.add(id);
    const poids = INTRO_IDS.has(id) ? grille[INTRO] : grille[id] ?? 0;
    const progression = progressionModule(parId.get(id));
    lignes.push({ moduleId: id, poids, progression, contribution: (poids * progression) / 100, obligatoireSansPoids: poids === 0 });
  }
  // Modules de la grille absents du parcours attribué : comptés à 0, jamais renormalisés.
  for (const [k, poids] of Object.entries(grille)) {
    const id = Number(k);
    if (id === INTRO) {
      if (!lignes.some((l) => INTRO_IDS.has(l.moduleId))) lignes.push({ moduleId: 0, poids, progression: 0, contribution: 0, obligatoireSansPoids: false });
    } else if (!vus.has(id)) {
      lignes.push({ moduleId: id, poids, progression: 0, contribution: 0, obligatoireSansPoids: false });
    }
  }
  const brut = lignes.reduce((s, l) => s + l.contribution, 0);
  const manquants = lignes.filter((l) => l.obligatoireSansPoids && l.progression < 100).map((l) => l.moduleId);
  let taux = Math.round(brut * 10) / 10;
  if (taux > 100) taux = 100;
  if (taux >= 100 && manquants.length > 0) taux = 99.9;
  return { filiere, taux, lignes, jalonsObligatoiresManquants: manquants };
}
