/**
 * Jalons pondérés — indicateur INTERNE ADMIN, purement indicatif.
 * Poids CALCULÉS à partir du volume actuel des modules de la filière :
 *   unités = 4 × pages + questions actives ; poids = unités / unités filière × 100.
 * Aucun pourcentage figé, aucune écriture, aucune conversion en heures, aucune
 * déclaration EDOF. Fin de formation (50–53) et modules administratifs
 * (83, 84) = jalons obligatoires de poids 0. Le statut enregistré de l'élève
 * n'est jamais modifié : un ancien « completed » reste 100 % du module, même
 * si des questions ont été ajoutées depuis (portée signalée sur la carte).
 */
export type Filiere = "vtc" | "taxi" | "ta" | "va";

export const INTRO = -1; // introduction, quel que soit l'id attribué (1/26/31/32/33/34)
export const PRATIQUE_PHYSIQUE = -2; // jalon virtuel, jamais enregistré comme module élève
export const POINTS_PRATIQUE_PHYSIQUE = 360;

/** Modules de référence de chaque filière (structure, pas de pourcentage). */
export const MODULES_FILIERE: Record<Filiere, number[]> = {
  vtc: [INTRO, 2, 3, 4, 35, 5, 60, 70, 8],
  taxi: [INTRO, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6],
  ta: [INTRO, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6],
  va: [INTRO, 41, 3, 29, 30, 38, 63, 73, 8],
};
export const MODULES_PONDERES: Record<Filiere, number[]> = Object.fromEntries(
  Object.entries(MODULES_FILIERE).map(([filiere, ids]) => [filiere, [...ids, PRATIQUE_PHYSIQUE]]),
) as Record<Filiere, number[]>;
export const INTRO_PAR_DEFAUT: Record<Filiere, number> = { vtc: 26, taxi: 26, ta: 32, va: 34 };
export const EXAMENS_BLANCS_FILIERE: Record<Filiere, { moduleId: number; type: string }> = {
  vtc: { moduleId: 35, type: "VTC" }, taxi: { moduleId: 36, type: "TAXI" }, ta: { moduleId: 37, type: "TA" }, va: { moduleId: 38, type: "VA" },
};

export const INTRO_IDS = new Set([1, 26, 31, 32, 33, 34]);

export interface VolumeModule { pages: number; questions: number; points?: number; /** placements des jeux cartographiques (1 unité chacun) */ jeux?: number }
/** Ancien volume brut (conservé pour compatibilité). */
export const unites = (v: VolumeModule | undefined) => (v ? Math.max(0, v.points ?? (4 * Math.max(0, v.pages) + Math.max(0, v.questions) + Math.max(0, v.jeux ?? 0))) : 0);
/** Volume de répartition du budget restant : 2 × pages d'audit + questions actives. */
export const volumeRepartition = (v: VolumeModule | undefined) => (v ? 2 * Math.max(0, v.pages) + Math.max(0, v.questions) + Math.max(0, v.jeux ?? 0) : 0);

export const LABEL_PRESENTIEL = "Entraînement pratique ou formation présentielle";

/**
 * Répartition prévisionnelle CPF (minutes) — tableau approuvé le 12/10/2026.
 * Durées FIXES : total, examens blancs (6 épreuves) et présentiel 6 h.
 * Les autres modules se partagent le budget restant ; chaque durée de base
 * est ajustée par (volume actuel / volume de référence mesuré le 12/10/2026)
 * puis renormalisée au budget restant. Volumes identiques = tableau exact.
 */
export const BUDGET_CPF: Record<Filiere, { total: number; examensBlancs: number; presentiel: number }> = {
  vtc: { total: 3960, examensBlancs: 1380, presentiel: 360 },
  taxi: { total: 5760, examensBlancs: 1380, presentiel: 360 },
  ta: { total: 2160, examensBlancs: 300, presentiel: 360 },
  va: { total: 2160, examensBlancs: 300, presentiel: 360 },
};
/** [module de référence, minutes de base, volume de référence (2×pages+questions) au 12/10/2026]. */
export const GRILLE_DUREES: Record<Filiere, Array<[number, number, number]>> = {
  vtc: [[INTRO, 19, 34], [2, 914, 1607], [3, 44, 77], [4, 497, 875], [5, 528, 1002], [60, 16, 28], [70, 101, 178], [8, 101, 177]],
  taxi: [[INTRO, 28, 34], [10, 1419, 1729], [3, 63, 77], [9, 784, 955], [11, 782, 1054], [7, 392, 477], [64, 26, 32], [12, 53, 64], [13, 186, 227], [61, 26, 32], [71, 176, 214], [6, 85, 104]],
  ta: [[INTRO, 57, 71], [40, 279, 348], [3, 62, 77], [27, 200, 244], [28, 86, 107], [7, 383, 477], [64, 26, 32], [12, 51, 64], [13, 182, 227], [62, 21, 26], [72, 69, 86], [6, 84, 104]],
  va: [[INTRO, 30, 22], [41, 303, 220], [3, 106, 77], [29, 181, 131], [30, 523, 380], [63, 33, 24], [73, 80, 58], [8, 244, 177]],
};

/** Arrondi entier à somme exacte (plus grand reste). */
function arrondirSomme(valeurs: number[], cible: number): number[] {
  const total = valeurs.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error("Volumes indisponibles");
  const brut = valeurs.map((v) => (v / total) * cible);
  const base = brut.map(Math.floor);
  let reste = cible - base.reduce((a, b) => a + b, 0);
  const ordre = brut.map((b, i) => [b - Math.floor(b), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordre) { if (reste <= 0) break; base[i]++; reste--; }
  return base;
}

/** Durées prévisionnelles (minutes entières) par jalon ; somme = total CPF exact. */
/**
 * `attribues` (optionnel) : modules réellement attribués à l'élève (même règle que
 * l'écran élève). Les modules pondérés non attribués sont retirés et le budget
 * restant (total CPF − examens blancs − présentiel, inchangés) est renormalisé
 * sur le parcours réel. Absent/null = grille complète (calculs figés inchangés).
 */
export function grilleAttribuee(filiere: Filiere, attribues?: ReadonlySet<number> | null) {
  const grille = GRILLE_DUREES[filiere];
  if (!attribues) return grille;
  const f = grille.filter(([id]) => id === INTRO || attribues.has(id));
  return f.length ? f : grille;
}

export function calculerDureesPrevisionnelles(filiere: Filiere, volumes: Record<number, VolumeModule>, attribues?: ReadonlySet<number> | null): Record<number, number> {
  const b = BUDGET_CPF[filiere];
  const grille = grilleAttribuee(filiere, attribues);
  const brut = grille.map(([id, minutes, ref]) => {
    const v = volumes[id];
    if (!v) throw new Error(`Volume indisponible pour le module ${id}`);
    return ref > 0 ? (minutes * volumeRepartition(v)) / ref : minutes;
  });
  const reparties = arrondirSomme(brut, b.total - b.examensBlancs - b.presentiel);
  const out: Record<number, number> = Object.fromEntries(grille.map(([id], i) => [id, reparties[i]]));
  out[EXAMENS_BLANCS_FILIERE[filiere].moduleId] = b.examensBlancs;
  out[PRATIQUE_PHYSIQUE] = b.presentiel;
  return out;
}

/** Poids (somme 100) = durée prévisionnelle / durée CPF totale ; clé INTRO pour l'introduction. */
export function calculerPoids(filiere: Filiere, volumes: Record<number, VolumeModule>, attribues?: ReadonlySet<number> | null): Record<number, number> {
  const durees = calculerDureesPrevisionnelles(filiere, volumes, attribues);
  const total = BUDGET_CPF[filiere].total;
  const garde = new Set(grilleAttribuee(filiere, attribues).map(([id]) => id));
  const ids = MODULES_PONDERES[filiere].filter((id) => !attribues || garde.has(id) || id === PRATIQUE_PHYSIQUE || id === EXAMENS_BLANCS_FILIERE[filiere].moduleId);
  return Object.fromEntries(ids.map((id) => [id, ((durees[id] ?? 0) / total) * 100]));
}

export function avecJalonPratique(modulesParcours: number[]): number[] {
  if (modulesParcours.includes(PRATIQUE_PHYSIQUE)) return modulesParcours;
  const indexFin = modulesParcours.findIndex((id) => id >= 50 && id <= 53);
  if (indexFin < 0) return [...modulesParcours, PRATIQUE_PHYSIQUE];
  return [...modulesParcours.slice(0, indexFin), PRATIQUE_PHYSIQUE, ...modulesParcours.slice(indexFin)];
}

export function completionPratique(minutes: number): CompletionLite {
  const progression = Math.max(0, Math.min(100, (minutes / POINTS_PRATIQUE_PHYSIQUE) * 100));
  return { module_id: PRATIQUE_PHYSIQUE, status: progression >= 100 ? "completed" : "in_progress", progress: progression };
}

/** Filière d'une clé de parcours (alias présentiel/e-présentiel/e-learning) ; null pour FC/mobilité. */
export function filiereDuParcours(key: string | null | undefined): Filiere | null {
  const k = String(key ?? "").toLowerCase().trim();
  const m = /^(vtc|taxi|ta|va)(-e|-e-presentiel)?$/.exec(k);
  return m ? (m[1] as Filiere) : null;
}

export interface CompletionLite { module_id: number; status?: string | null; progress?: number | null }
export interface LigneJalon { moduleId: number; poids: number; progression: number; contribution: number; obligatoireSansPoids: boolean; valide: boolean }
export interface ResultatJalons { filiere: Filiere; taux: number; lignes: LigneJalon[]; jalonsObligatoiresManquants: number[] }

/** completed confirmé = 100 ; sinon progress borné 0..100 ; absent = 0. */
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
  poidsFiliere: Record<number, number>,
): ResultatJalons {
  const grille = poidsFiliere;
  const parId = new Map<number, CompletionLite>();
  for (const c of completions) {
    const id = Number(c.module_id);
    const prev = parId.get(id);
    if (!prev || (prev.status !== "completed" && (c.status === "completed" || progressionModule(c) > progressionModule(prev)))) parId.set(id, c);
  }
  const lignes: LigneJalon[] = [];
  const vus = new Set<number>();
  let introAttribuee = false;
  for (const id of modulesParcours) {
    if (vus.has(id)) continue;
    vus.add(id);
    let poids = grille[id] ?? 0;
    if (INTRO_IDS.has(id)) {
      poids = introAttribuee ? 0 : grille[INTRO] ?? 0;
      introAttribuee = true;
    }
    let row = parId.get(id);
    // Introduction : l'élève a pu valider une autre variante (ex. 33 « INTRODUCTION VA »
    // au lieu de 34) — c'est la même introduction, la validation serveur compte.
    if (INTRO_IDS.has(id) && row?.status !== "completed") {
      for (const alt of INTRO_IDS) {
        const r = parId.get(alt);
        if (r?.status === "completed") { row = r; break; }
      }
    }
    const progression = progressionModule(row);
    lignes.push({ moduleId: id, poids, progression, contribution: (poids * progression) / 100, obligatoireSansPoids: poids === 0, valide: row?.status === "completed" });
  }
  for (const [k, poids] of Object.entries(grille)) {
    const id = Number(k);
    if (id === INTRO) {
      if (!introAttribuee) lignes.push({ moduleId: 0, poids, progression: 0, contribution: 0, obligatoireSansPoids: false, valide: false });
    } else if (!vus.has(id)) {
      lignes.push({ moduleId: id, poids, progression: 0, contribution: 0, obligatoireSansPoids: false, valide: false });
    }
  }
  const brut = lignes.reduce((s, l) => s + l.contribution, 0);
  const manquants = lignes.filter((l) => l.obligatoireSansPoids && !l.valide).map((l) => l.moduleId);
  let taux = Math.round(brut * 10) / 10;
  if (taux > 100) taux = 100;
  if (taux >= 100 && lignes.some((l) => !l.valide)) taux = 99.9;
  return { filiere, taux, lignes, jalonsObligatoiresManquants: manquants };
}

/** Arrondi d'AFFICHAGE à 0,1 dont la somme vaut exactement 100 (méthode du plus grand reste). */
export function arrondirPoidsAffichage(poids: number[]): number[] {
  const total = poids.reduce((a, b) => a + b, 0);
  if (total <= 0) return poids.map(() => 0);
  const dixiemes = poids.map((p) => (p / total) * 1000);
  const base = dixiemes.map(Math.floor);
  let reste = 1000 - base.reduce((a, b) => a + b, 0);
  const ordre = dixiemes.map((d, i) => [d - Math.floor(d), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ordre) { if (reste <= 0) break; base[i]++; reste--; }
  return base.map((b) => b / 10);
}

/** Durée prévisionnelle d'une ligne de résultat (intro attribuée ou non = clé INTRO). */
export function dureeLigne(durees: Record<number, number>, moduleId: number, poids: number) {
  if (poids <= 0) return 0;
  return durees[INTRO_IDS.has(moduleId) || moduleId === 0 ? INTRO : moduleId] ?? 0;
}
