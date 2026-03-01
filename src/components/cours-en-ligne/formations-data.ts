// Formations disponibles et mapping modules-formations

export const FORMATIONS = [
  { id: "vtc", label: "Formation VTC" },
  { id: "taxi", label: "Formation TAXI" },
  { id: "taxi-pour-vtc", label: "Formation TAXI pour chauffeurs VTC" },
  { id: "vtc-pour-taxi", label: "Formation VTC pour TAXI" },
  { id: "vtc-elearning", label: "Formation VTC E-learning" },
  { id: "taxi-elearning", label: "Formation TAXI E-learning" },
  { id: "taxi-pour-vtc-elearning", label: "Formation TAXI pour VTC E-learning" },
  { id: "vtc-cours-du-soir", label: "Formation VTC cours du soir" },
] as const;

export type FormationId = (typeof FORMATIONS)[number]["id"];

export interface ModuleInfo {
  id: number;
  nom: string;
  description: string;
  formations: FormationId[]; // formations auxquelles ce module est rattaché
}

// Mapping par défaut — l'admin pourra le modifier via des checkboxes
export const MODULES_DATA: ModuleInfo[] = [
  {
    id: 1,
    nom: "1.INTRODUCTION",
    description: "A lire absolument, cela vous explique l'organisation de l'examen, le programme, les coefficients, les éléments importants...",
    formations: ["vtc", "taxi", "taxi-pour-vtc", "vtc-pour-taxi", "vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 2,
    nom: "2.COURS ET EXERCICES VTC",
    description: "Il s'agit des cours et d'exercices à effectuer",
    formations: ["vtc", "vtc-pour-taxi", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 3,
    nom: "3.FORMULES",
    description: "Il s'agit de l'ensemble des calculs qui peuvent tomber à l'examen théorique",
    formations: ["vtc", "taxi", "taxi-pour-vtc", "vtc-pour-taxi", "vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 4,
    nom: "4.BILAN EXERCICES VTC",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire",
    formations: ["vtc", "vtc-pour-taxi", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 5,
    nom: "6.BILAN EXAMEN VTC",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen",
    formations: ["vtc", "vtc-pour-taxi", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 6,
    nom: "8.PRATIQUE TAXI",
    description: "Exercices pratiques pour la formation Taxi",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
  {
    id: 7,
    nom: "7.CONNAISSANCES DE LA VILLE TAXI",
    description: "Connaissances géographiques et culturelles de la ville pour les Taxis",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
  {
    id: 8,
    nom: "7.PRATIQUE VTC",
    description: "Exercices pratiques pour la formation VTC",
    formations: ["vtc", "vtc-pour-taxi", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 9,
    nom: "4.BILAN EXERCICES TAXI",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire (Taxi)",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
  {
    id: 10,
    nom: "2.COURS ET EXERCICES TAXI",
    description: "Il s'agit des cours et d'exercices à effectuer pour la formation Taxi",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
  {
    id: 11,
    nom: "6.BILAN EXAMEN TAXI",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen Taxi",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
  {
    id: 12,
    nom: "9.CAS PRATIQUE TAXI",
    description: "Cas pratiques de facturation et de tarification Taxi",
    formations: ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"],
  },
];
