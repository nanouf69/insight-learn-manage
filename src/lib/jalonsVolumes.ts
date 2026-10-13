import { BASE_PAGES_AUDIT } from "@/lib/jalonsPagesBaseline";
import { EXAMENS_BLANCS_FILIERE, INTRO, INTRO_IDS, INTRO_PAR_DEFAUT, MODULES_FILIERE, POINTS_PRATIQUE_PHYSIQUE, PRATIQUE_PHYSIQUE, type Filiere, type VolumeModule } from "@/lib/jalonsPonderes";
import { compterQuestionsActives, compterQuestionsExamensBlancs, contenuEffectif, empreinteSupports, type EditorRowLite, type ModuleContentLite } from "@/lib/volumeModules";

export interface VolumesFiliere { volumes: Record<number, VolumeModule & { moduleId: number }>; limites: string[]; /** modules dont les pages ne sont plus prouvées (supports modifiés depuis l'audit) */ pagesNonRecomptees: number[] }

/**
 * Volumes ACTUELS de la filière. Lève une erreur si une source manque :
 * jamais de pourcentage de repli silencieux.
 */
export function construireVolumes(
  filiere: Filiere,
  modulesParcours: number[],
  rows: EditorRowLite[],
  initialDe: (moduleId: number) => ModuleContentLite | null,
  examens: Array<{ id?: string; type: string; numero: number; matieres?: any[] }>,
): VolumesFiliere {
  const parId = new Map<number, EditorRowLite>();
  for (const r of rows) parId.set(Number(r.module_id), r);
  const introId = modulesParcours.find((id) => INTRO_IDS.has(id)) ?? INTRO_PAR_DEFAUT[filiere];
  const eb = EXAMENS_BLANCS_FILIERE[filiere];
  const volumes: VolumesFiliere["volumes"] = {};
  const limites: string[] = [];
  const pagesNonRecomptees: number[] = [];
  // Tout module du parcours réel non pondéré est signalé (jamais oublié silencieusement).
  const refs = new Set(MODULES_FILIERE[filiere].map((r) => (r === INTRO ? introId : r)));
  for (const id of modulesParcours) {
    if (!refs.has(id) && !INTRO_IDS.has(id) && !(id >= 50 && id <= 53) && id !== PRATIQUE_PHYSIQUE) limites.push(`Module ${id} ajouté au parcours : non pondéré (grille de durées à compléter) — taux provisoire.`);
  }
  for (const ref of MODULES_FILIERE[filiere]) {
    const id = ref === INTRO ? introId : ref;
    const base = BASE_PAGES_AUDIT[id];
    if (!base) throw new Error(`Pages inconnues pour le module ${id}`);
    if (base.alias) limites.push(`Module ${id} : pages non auditées, base du module ${base.alias} utilisée.`);
    const row = parId.get(id);
    if (base.empreinte !== empreinteSupports(row)) {
      pagesNonRecomptees.push(id);
      limites.push(`Module ${id} : supports (cours/pages) modifiés depuis l'audit — nombre de pages NON RECOMPTÉ (${base.pages} de l'audit utilisées) : poids provisoire.`);
    }
    let questions: number;
    if (id === eb.moduleId) {
      const r = compterQuestionsExamensBlancs(examens, eb.type);
      if (r.examens === 0) throw new Error("Examens blancs indisponibles");
      if (r.doublons > 0) limites.push(`Examens blancs ${eb.type} : ${r.doublons} doublon(s) de numéro ignoré(s).`);
      if (r.examens < 6) limites.push(`Examens blancs ${eb.type} : ${r.examens} examen(s) seulement.`);
      questions = r.questions;
    } else {
      questions = compterQuestionsActives(contenuEffectif(initialDe(id), row)).total;
    }
    volumes[ref] = { moduleId: id, pages: base.pages, questions };
  }
  volumes[PRATIQUE_PHYSIQUE] = { moduleId: PRATIQUE_PHYSIQUE, pages: 0, questions: 0, points: POINTS_PRATIQUE_PHYSIQUE };
  return { volumes, limites, pagesNonRecomptees };
}
