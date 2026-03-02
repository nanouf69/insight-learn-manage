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

const VTC_FORMATIONS: FormationId[] = ["vtc", "vtc-pour-taxi", "vtc-elearning", "vtc-cours-du-soir"];
const TAXI_FORMATIONS: FormationId[] = ["taxi", "taxi-pour-vtc", "taxi-elearning", "taxi-pour-vtc-elearning"];
const ALL_FORMATIONS: FormationId[] = ["vtc", "taxi", "taxi-pour-vtc", "vtc-pour-taxi", "vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning", "vtc-cours-du-soir"];

// IDs 2 + 25 + 14-19 = VTC matières (anciennement module 2 unique)
// IDs 10 + 20-24 = TAXI matières (anciennement module 10 unique)

// Mapping par défaut — l'admin pourra le modifier via des checkboxes
export const MODULES_DATA: ModuleInfo[] = [
  {
    id: 1,
    nom: "1.INTRODUCTION",
    description: "A lire absolument, cela vous explique l'organisation de l'examen, le programme, les coefficients, les éléments importants...",
    formations: ALL_FORMATIONS,
  },
  // === VTC Matières (anciennement module 2) ===
  {
    id: 2,
    nom: "A. Réglementation T3P — Partie 1/2",
    description: "Cours et exercices T3P — Partie 1",
    formations: VTC_FORMATIONS,
  },
  {
    id: 25,
    nom: "A. Réglementation T3P — Partie 2/2",
    description: "Cours et exercices T3P — Partie 2",
    formations: VTC_FORMATIONS,
  },
  {
    id: 14,
    nom: "B. Gestion",
    description: "Cours et exercices sur la gestion d'entreprise, comptabilité et fiscalité",
    formations: VTC_FORMATIONS,
  },
  {
    id: 15,
    nom: "C. Sécurité Routière",
    description: "Cours sur la sécurité routière et la prévention des risques",
    formations: VTC_FORMATIONS,
  },
  {
    id: 16,
    nom: "D. Français",
    description: "Cours et exercices d'expression et compréhension écrite",
    formations: VTC_FORMATIONS,
  },
  {
    id: 17,
    nom: "E. Anglais",
    description: "Cours et exercices d'expression et compréhension en anglais",
    formations: VTC_FORMATIONS,
  },
  {
    id: 18,
    nom: "F. Réglementation Spécifique",
    description: "Réglementation nationale, spécifique VTC et locale",
    formations: VTC_FORMATIONS,
  },
  {
    id: 19,
    nom: "G. Développement Commercial",
    description: "Marketing et développement commercial VTC",
    formations: VTC_FORMATIONS,
  },
  {
    id: 3,
    nom: "3.FORMULES",
    description: "Il s'agit de l'ensemble des calculs qui peuvent tomber à l'examen théorique",
    formations: ALL_FORMATIONS,
  },
  {
    id: 4,
    nom: "4.BILAN EXERCICES VTC",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire",
    formations: VTC_FORMATIONS,
  },
  {
    id: 5,
    nom: "6.BILAN EXAMEN VTC",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen",
    formations: VTC_FORMATIONS,
  },
  {
    id: 6,
    nom: "8.PRATIQUE TAXI",
    description: "Exercices pratiques pour la formation Taxi",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 7,
    nom: "7.CONNAISSANCES DE LA VILLE TAXI",
    description: "Connaissances géographiques et culturelles de la ville pour les Taxis",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 8,
    nom: "7.PRATIQUE VTC",
    description: "Exercices pratiques pour la formation VTC",
    formations: VTC_FORMATIONS,
  },
  {
    id: 9,
    nom: "4.BILAN EXERCICES TAXI",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire (Taxi)",
    formations: TAXI_FORMATIONS,
  },
  // === TAXI Matières (anciennement module 10) ===
  {
    id: 10,
    nom: "A. Réglementation T3P",
    description: "Cours et exercices sur la réglementation T3P (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 20,
    nom: "B. Gestion",
    description: "Cours et exercices sur la gestion d'entreprise (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 21,
    nom: "C. Sécurité Routière",
    description: "Cours sur la sécurité routière (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 22,
    nom: "D. Français",
    description: "Cours et exercices de français (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 23,
    nom: "E. Anglais",
    description: "Cours et exercices d'anglais (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 24,
    nom: "F. Réglementation",
    description: "Réglementation nationale et locale (TAXI)",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 11,
    nom: "6.BILAN EXAMEN TAXI",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen Taxi",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 12,
    nom: "9.CAS PRATIQUE TAXI",
    description: "Cas pratiques de facturation et de tarification Taxi",
    formations: TAXI_FORMATIONS,
  },
  {
    id: 13,
    nom: "CONTRÔLE DE CONNAISSANCES TAXI",
    description: "65 questions QCM et QRC pour vérifier vos connaissances taxi (réglementation, tarification, territoire)",
    formations: TAXI_FORMATIONS,
  },
];

// Expansion des modules_autorises :
// - si 2 est autorisé, on autorise aussi la Partie 2 (25) + matières B-G (14-19)
// - si 10 est autorisé, 20-24 aussi
export function expandModulesAutorises(ids: number[] | null | undefined): number[] | null {
  if (!ids || ids.length === 0) return null;
  const expanded = new Set(ids);
  if (expanded.has(2)) { [25, 14, 15, 16, 17, 18, 19].forEach(id => expanded.add(id)); }
  if (expanded.has(10)) { [20, 21, 22, 23, 24].forEach(id => expanded.add(id)); }
  return Array.from(expanded);
}
