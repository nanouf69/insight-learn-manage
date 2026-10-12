import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { avecJalonPratique, LABEL_PRESENTIEL, PRATIQUE_PHYSIQUE } from "@/lib/jalonsPonderes";

export const TITRE_OBJECTIFS_JALONS = "Objectifs pédagogiques des jalons";
export interface ObjectifJalon { moduleId: number; intitule: string; objectif: string }
// Identifiants permanents : aucun appariement par position ou texte.
const OBJECTIFS: ReadonlyArray<{ ids: readonly number[]; intitule: string; objectif: string }> = [
  { ids: [1, 26, 31, 32, 33, 34], intitule: "Introduction", objectif: "Comprendre le déroulement de la formation, les épreuves de l'examen et les modalités de travail." },
  { ids: [2, 10, 40, 41], intitule: "Cours et exercices", objectif: "" },
  { ids: [4, 9, 27, 29], intitule: "Bilan exercices", objectif: "Consolider les connaissances et identifier les points à revoir." },
  { ids: [5, 11, 28, 30], intitule: "Bilan examen", objectif: "S'entraîner sur des questions types des épreuves d'examen." },
  { ids: [35, 36, 37, 38], intitule: "Examens blancs", objectif: "S'entraîner dans des conditions proches de celles de l'examen et évaluer sa préparation." },
  { ids: [3], intitule: "Formules", objectif: "Comprendre les formules et maîtriser les calculs utiles aux épreuves." },
  { ids: [13], intitule: "Contrôle de connaissances", objectif: "Revoir et vérifier l'ensemble des connaissances nécessaires à l'activité de conducteur de taxi." },
  { ids: [64], intitule: "Équipements Taxi", objectif: "Reconnaître visuellement les équipements obligatoires d'un taxi et comprendre leur utilisation." },
  { ids: [7], intitule: "Connaissances de la ville", objectif: "Apprendre les lieux, repères et éléments utiles de la ville de Lyon pour la préparation à l'épreuve pratique." },
  { ids: [6, 8], intitule: "Pratique en ligne", objectif: "Préparer l'épreuve pratique, ses étapes et les situations professionnelles." },
  { ids: [60, 61, 62, 63], intitule: "Sources juridiques", objectif: "Identifier les textes à l'origine des règles étudiées, notamment les lois et les décrets." },
  { ids: [70, 71, 72, 73], intitule: "Fiches révisions / livre", objectif: "Revoir l'essentiel des connaissances utiles à l'examen." },
  { ids: [12], intitule: "Cas pratique Taxi", objectif: "Appliquer les connaissances à des situations professionnelles de taxi." },
  { ids: [PRATIQUE_PHYSIQUE], intitule: LABEL_PRESENTIEL, objectif: "Mettre en pratique et consolider les compétences travaillées pendant la formation, dans le cadre de la séance prévue de 6 h." },
];
const PARCOURS = new Set(["vtc-e", "taxi-e", "ta-e", "va-e"]);

export function objectifsJalons(key: string, modulesExistants?: readonly number[]): ObjectifJalon[] {
  if (!PARCOURS.has(key)) return [];
  const parcours = avecJalonPratique(FORMATION_MODULES[key].modules.map(({ id }) => id));
  const autorises = new Set(parcours);
  const vus = new Set<number>();
  return (modulesExistants ?? parcours).flatMap((moduleId) => {
    if (!autorises.has(moduleId) || vus.has(moduleId)) return [];
    vus.add(moduleId);
    const definition = OBJECTIFS.find(({ ids }) => ids.includes(moduleId));
    if (!definition) return []; // Les jalons administratifs gardent leurs exigences existantes.
    const matiere = key === "taxi-e" || key === "ta-e" ? "taxi" : "VTC";
    return [{ moduleId, intitule: definition.intitule, objectif: definition.intitule === "Cours et exercices"
      ? `Étudier les matières du référentiel de la formation ${matiere} et appliquer les connaissances dans les exercices.`
      : definition.objectif }];
  });
}