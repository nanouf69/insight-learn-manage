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

/** Modules de référence de chaque filière (structure, pas de pourcentage). */
export const MODULES_FILIERE: Record<Filiere, number[]> = {
  vtc: [INTRO, 2, 3, 4, 35, 5, 60, 70, 8],
  taxi: [INTRO, 10, 7, 64, 12, 3, 9, 13, 11, 36, 61, 71, 6],
  ta: [INTRO, 40, 7, 64, 12, 3, 27, 13, 28, 37, 62, 72, 6],
  va: [INTRO, 41, 3, 29, 30, 38, 63, 73, 8],
};
export const INTRO_PAR_DEFAUT: Record<Filiere, number> = { vtc: 26, taxi: 26, ta: 32, va: 34 };
export const EXAMENS_BLANCS_FILIERE: Record<Filiere, { moduleId: number; type: string }> = {
  vtc: { moduleId: 35, type: "VTC" }, taxi: { moduleId: 36, type: "TAXI" }, ta: { moduleId: 37, type: "TA" }, va: { moduleId: 38, type: "VA" },
};

export const INTRO_IDS = new Set([1, 26, 31, 32, 33, 34]);

export interface VolumeModule { pages: number; questions: number }
export const unites = (v: VolumeModule | undefined) => (v ? 4 * Math.max(0, v.pages) + Math.max(0, v.questions) : 0);

/** Poids (somme 100) calculés depuis les volumes ; clé INTRO pour l'introduction. */
export function calculerPoids(filiere: Filiere, volumes: Record<number, VolumeModule>): Record<number, number> {
  const ids = MODULES_FILIERE[filiere];
  const total = ids.reduce((s, id) => s + unites(volumes[id]), 0);
  if (total <= 0) throw new Error("Volumes indisponibles");
  return Object.fromEntries(ids.map((id) => [id, (unites(volumes[id]) / total) * 100]));
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
    const row = parId.get(id);
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
