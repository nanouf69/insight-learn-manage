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
const PRESENTIEL_FORMATIONS: FormationId[] = ["vtc", "taxi", "taxi-pour-vtc", "vtc-pour-taxi", "vtc-cours-du-soir"];
const ELEARNING_FORMATIONS: FormationId[] = ["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"];

// IDs 2 + 25 + 14-19 = VTC matières (anciennement module 2 unique)
// IDs 10 + 20-24 = TAXI matières (anciennement module 10 unique)

// Mapping par défaut — l'admin pourra le modifier via des checkboxes
export const MODULES_DATA: ModuleInfo[] = [
  {
    id: 1,
    nom: "1.INTRODUCTION PRÉSENTIEL",
    description: "Introduction pour les formations en présentiel : test de compétences, analyse du besoin, organisation de l'examen, programme, coefficients, règlement intérieur.",
    formations: PRESENTIEL_FORMATIONS,
  },
  {
    id: 26,
    nom: "1.INTRODUCTION E-LEARNING",
    description: "Introduction pour les formations en e-learning : test de compétences, analyse du besoin, organisation de l'examen, programme, coefficients.",
    formations: ELEARNING_FORMATIONS,
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
  // === Modules spécifiques TA (passerelle taxi pour VTC) ===
  {
    id: 27,
    nom: "4.BILAN EXERCICES TA",
    description: "Exercices de réglementation nationale et locale — spécifique passerelle TA",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 28,
    nom: "6.BILAN EXAMEN TA",
    description: "Questions d'examen réglementation nationale et locale — spécifique passerelle TA",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  // === Modules spécifiques VA (passerelle VTC pour TAXI) ===
  {
    id: 29,
    nom: "4.BILAN EXERCICES VA",
    description: "Exercices développement commercial et réglementation spécifique — spécifique passerelle VA",
    formations: ["vtc-pour-taxi"],
  },
  {
    id: 30,
    nom: "6.BILAN EXAMEN VA",
    description: "Questions d'examen développement commercial et réglementation spécifique — spécifique passerelle VA",
    formations: ["vtc-pour-taxi"],
  },
  // === Introductions TA (passerelle taxi pour VTC) ===
  {
    id: 31,
    nom: "1.INTRODUCTION TA",
    description: "Livret d'accueil passerelle TA (présentiel) : programme, planning, règlement intérieur.",
    formations: ["taxi-pour-vtc"],
  },
  {
    id: 32,
    nom: "1.INTRODUCTION TA E-LEARNING",
    description: "Livret d'accueil passerelle TA (e-learning) : programme des 2 matières.",
    formations: ["taxi-pour-vtc-elearning"],
  },
  // === Introductions VA (passerelle VTC pour TAXI) ===
  {
    id: 33,
    nom: "1.INTRODUCTION VA",
    description: "Livret d'accueil passerelle VA (présentiel) : programme, planning, règlement intérieur.",
    formations: ["vtc-pour-taxi"],
  },
  {
    id: 34,
    nom: "1.INTRODUCTION VA E-LEARNING",
    description: "Livret d'accueil passerelle VA (e-learning) : programme des 2 matières.",
    formations: ["vtc-pour-taxi"],
  },
  // === Examens Blancs ===
  {
    id: 35,
    nom: "5.EXAMENS BLANCS VTC",
    description: "6 examens blancs VTC chronométrés avec toutes les matières",
    formations: ["vtc", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 36,
    nom: "5.EXAMENS BLANCS TAXI",
    description: "6 examens blancs TAXI chronométrés avec toutes les matières",
    formations: ["taxi", "taxi-elearning"],
  },
  {
    id: 37,
    nom: "5.EXAMENS BLANCS TA",
    description: "6 examens blancs Passerelle TA chronométrés (Réglementation Nationale et Locale)",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 38,
    nom: "5.EXAMENS BLANCS VA",
    description: "6 examens blancs Passerelle VA chronométrés (Développement Commercial et Réglementation Spécifique VTC)",
    formations: ["vtc-pour-taxi"],
  },
  // === Modules cours groupés TA et VA ===
  {
    id: 40,
    nom: "F. Réglementation Nationale",
    description: "Cours et exercices Réglementation Nationale — passerelle TA",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 42,
    nom: "F. Réglementation Locale",
    description: "Cours et exercices Réglementation Locale — passerelle TA",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 41,
    nom: "F. Développement Commercial",
    description: "Cours et exercices Développement Commercial — passerelle VA",
    formations: ["vtc-pour-taxi"],
  },
  {
    id: 43,
    nom: "G. Réglementation Spécifique VTC",
    description: "Cours et exercices Réglementation Spécifique VTC — passerelle VA",
    formations: ["vtc-pour-taxi"],
  },
  // === Sources Juridiques ===
  {
    id: 60,
    nom: "📖 SOURCES JURIDIQUES VTC",
    description: "Sources légales et textes réglementaires de la formation VTC (arrêtés, décrets, ordonnances)",
    formations: ["vtc", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 61,
    nom: "📖 SOURCES JURIDIQUES TAXI",
    description: "Sources légales et textes réglementaires de la formation TAXI (arrêtés, décrets, ordonnances)",
    formations: ["taxi", "taxi-elearning"],
  },
  {
    id: 62,
    nom: "📖 SOURCES JURIDIQUES TA",
    description: "Sources légales et textes réglementaires de la passerelle TA (arrêtés, décrets, ordonnances)",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 63,
    nom: "📖 SOURCES JURIDIQUES VA",
    description: "Sources légales et textes réglementaires de la passerelle VA (arrêtés, décrets, ordonnances)",
    formations: ["vtc-pour-taxi"],
  },
  // === Modules Fin de Formation (Évaluation + Satisfaction) ===
  {
    id: 50,
    nom: "📋 FIN DE FORMATION VTC",
    description: "Évaluation des acquis et enquête de satisfaction — Formation VTC",
    formations: ["vtc", "vtc-elearning", "vtc-cours-du-soir"],
  },
  {
    id: 51,
    nom: "📋 FIN DE FORMATION TAXI",
    description: "Évaluation des acquis et enquête de satisfaction — Formation TAXI",
    formations: ["taxi", "taxi-elearning"],
  },
  {
    id: 52,
    nom: "📋 FIN DE FORMATION TA",
    description: "Évaluation des acquis et enquête de satisfaction — Passerelle TA",
    formations: ["taxi-pour-vtc", "taxi-pour-vtc-elearning"],
  },
  {
    id: 53,
    nom: "📋 FIN DE FORMATION VA",
    description: "Évaluation des acquis et enquête de satisfaction — Passerelle VA",
    formations: ["vtc-pour-taxi"],
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
  // Reverse: if any child is present, add parent too
  if ([20, 21, 22, 23, 24].some(id => expanded.has(id))) { expanded.add(10); }
  if (expanded.has(40)) { [42].forEach(id => expanded.add(id)); }
  if (expanded.has(41)) { [43].forEach(id => expanded.add(id)); }
  // Reverse for TA/VA
  if (expanded.has(42)) { expanded.add(40); }
  if (expanded.has(43)) { expanded.add(41); }
  return Array.from(expanded);
}
