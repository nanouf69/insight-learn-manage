// ======================================================================
// SOURCE UNIQUE DE VÉRITÉ — Tous les modules et formations
// Utilisé par : Gestion des modules, Formations, Attribution CRM
// ======================================================================

export interface ModuleDefinition {
  id: number;
  nom: string;
  eleves?: number;
  progression?: string;
  statut?: string;
}

export interface FormationModuleRef {
  id: number;
  label: string;
}

export interface FormationDefinition {
  label: string;
  color: string;
  modules: FormationModuleRef[];
}

// ======================================================================
// 1. LISTE COMPLÈTE DES MODULES (Gestion des modules)
// ======================================================================
export const ALL_MODULES: ModuleDefinition[] = [
  // 1. INTRODUCTIONS
  { id: 1, nom: "1.INTRODUCTION PRÉSENTIEL" },
  { id: 26, nom: "1.INTRODUCTION E-LEARNING" },
  { id: 31, nom: "1.INTRODUCTION TA" },
  { id: 32, nom: "1.INTRODUCTION TA E-LEARNING" },
  { id: 33, nom: "1.INTRODUCTION VA" },
  { id: 34, nom: "1.INTRODUCTION VA E-LEARNING" },
  // 2. COURS ET EXERCICES
  { id: 2, nom: "2.COURS ET EXERCICES VTC" },
  { id: 10, nom: "2.COURS ET EXERCICES TAXI" },
  { id: 40, nom: "2.COURS ET EXERCICES TA" },
  { id: 41, nom: "2.COURS ET EXERCICES VA" },
  // 3. FORMULES
  { id: 3, nom: "3.FORMULES" },
  // 4. BILAN EXERCICES
  { id: 4, nom: "4.BILAN EXERCICES VTC" },
  { id: 9, nom: "4.BILAN EXERCICES TAXI" },
  { id: 27, nom: "4.BILAN EXERCICES TA" },
  { id: 29, nom: "4.BILAN EXERCICES VA" },
  { id: 81, nom: "1.BILAN EXERCICES FORMATION CONTINUE VTC" },
  { id: 82, nom: "1.BILAN EXERCICES FORMATION CONTINUE TAXI" },
  { id: 87, nom: "📋 BILAN FIN DE FORMATION CONTINUE VTC" },
  { id: 83, nom: "2.FEUILLES D'ÉMARGEMENT SIGNÉES VTC" },
  { id: 84, nom: "2.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI" },
  { id: 85, nom: "3.INFORMATIONS FINANCEUR VTC" },
  { id: 86, nom: "3.INFORMATIONS FINANCEUR TAXI" },
  // 5. EXAMENS BLANCS
  { id: 35, nom: "5.EXAMENS BLANCS VTC" },
  { id: 36, nom: "5.EXAMENS BLANCS TAXI" },
  { id: 37, nom: "5.EXAMENS BLANCS TA" },
  { id: 38, nom: "5.EXAMENS BLANCS VA" },
  // 6. BILAN EXAMEN
  { id: 5, nom: "6.BILAN EXAMEN VTC" },
  { id: 11, nom: "6.BILAN EXAMEN TAXI" },
  { id: 28, nom: "6.BILAN EXAMEN TA" },
  { id: 30, nom: "6.BILAN EXAMEN VA" },
  // 7. PRATIQUE / CONNAISSANCES / CAS PRATIQUE / CONTRÔLE
  { id: 7, nom: "7.CONNAISSANCES DE LA VILLE TAXI" },
  { id: 8, nom: "7.PRATIQUE VTC" },
  { id: 6, nom: "8.PRATIQUE TAXI" },
  { id: 12, nom: "9.CAS PRATIQUE TAXI" },
  { id: 13, nom: "CONTRÔLE DE CONNAISSANCES TAXI" },
  // ÉQUIPEMENTS TAXI
  { id: 64, nom: "🚕 ÉQUIPEMENTS TAXI" },
  // SOURCES JURIDIQUES
  { id: 60, nom: "📖 SOURCES JURIDIQUES VTC" },
  { id: 61, nom: "📖 SOURCES JURIDIQUES TAXI" },
  { id: 62, nom: "📖 SOURCES JURIDIQUES TA" },
  { id: 63, nom: "📖 SOURCES JURIDIQUES VA" },
  // FICHES RÉVISIONS
  { id: 70, nom: "📝 FICHES RÉVISIONS VTC" },
  { id: 71, nom: "📝 FICHES RÉVISIONS TAXI" },
  { id: 72, nom: "📝 FICHES RÉVISIONS TA" },
  { id: 73, nom: "📝 FICHES RÉVISIONS VA" },
  // FIN DE FORMATION
  { id: 50, nom: "📋 FIN DE FORMATION VTC" },
  { id: 51, nom: "📋 FIN DE FORMATION TAXI" },
  { id: 52, nom: "📋 FIN DE FORMATION TA" },
  { id: 53, nom: "📋 FIN DE FORMATION VA" },
];

// ======================================================================
// 2. MODULES PAR FORMATION (source unique pour Formations tab + CRM)
// ======================================================================
export const FORMATION_MODULES: Record<string, FormationDefinition> = {
  "vtc": { label: "VTC", color: "bg-emerald-100 text-emerald-800 border-emerald-300", modules: [
    { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
    { id: 2, label: "2.COURS ET EXERCICES VTC" },
    { id: 3, label: "3.FORMULES" },
    { id: 4, label: "4.BILAN EXERCICES VTC" },
    { id: 35, label: "5.EXAMENS BLANCS VTC" },
    { id: 5, label: "6.BILAN EXAMEN VTC" },
    { id: 60, label: "7.SOURCES JURIDIQUES VTC" },
    { id: 70, label: "8.FICHES RÉVISIONS VTC" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 83, label: "10.FEUILLES D'ÉMARGEMENT SIGNÉES VTC" },
    { id: 50, label: "11.FIN DE FORMATION VTC" },
  ]},
  "vtc-e-presentiel": { label: "VTC E-Présentiel", color: "bg-emerald-100 text-emerald-800 border-emerald-300", modules: [
    { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
    { id: 2, label: "2.COURS ET EXERCICES VTC" },
    { id: 3, label: "3.FORMULES" },
    { id: 4, label: "4.BILAN EXERCICES VTC" },
    { id: 35, label: "5.EXAMENS BLANCS VTC" },
    { id: 5, label: "6.BILAN EXAMEN VTC" },
    { id: 60, label: "7.SOURCES JURIDIQUES VTC" },
    { id: 70, label: "8.FICHES RÉVISIONS VTC" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 83, label: "10.FEUILLES D'ÉMARGEMENT SIGNÉES VTC" },
    { id: 50, label: "11.FIN DE FORMATION VTC" },
  ]},
  "vtc-e": { label: "VTC E-learning", color: "bg-emerald-50 text-emerald-700 border-emerald-200", modules: [
    { id: 26, label: "1.INTRODUCTION E-LEARNING" },
    { id: 2, label: "2.COURS ET EXERCICES VTC" },
    { id: 3, label: "3.FORMULES" },
    { id: 4, label: "4.BILAN EXERCICES VTC" },
    { id: 35, label: "5.EXAMENS BLANCS VTC" },
    { id: 5, label: "6.BILAN EXAMEN VTC" },
    { id: 60, label: "7.SOURCES JURIDIQUES VTC" },
    { id: 70, label: "8.FICHES RÉVISIONS VTC" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 50, label: "10.FIN DE FORMATION VTC" },
  ]},
  "taxi": { label: "TAXI", color: "bg-orange-100 text-orange-800 border-orange-300", modules: [
    { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
    { id: 10, label: "2.COURS ET EXERCICES TAXI" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "🔓 FORMULES (libre accès)" },
    { id: 9, label: "6.BILAN EXERCICES TAXI" },
    { id: 13, label: "7.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 11, label: "8.BILAN EXAMEN TAXI" },
    { id: 36, label: "9.EXAMENS BLANCS TAXI" },
    { id: 61, label: "10.SOURCES JURIDIQUES TAXI" },
    { id: 71, label: "11.FICHES RÉVISIONS TAXI" },
    { id: 6, label: "12.PRATIQUE TAXI" },
    { id: 84, label: "13.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI" },
    { id: 51, label: "14.FIN DE FORMATION TAXI" },
  ]},
  "taxi-e-presentiel": { label: "TAXI E-Présentiel", color: "bg-orange-100 text-orange-800 border-orange-300", modules: [
    { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
    { id: 10, label: "2.COURS ET EXERCICES TAXI" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "🔓 FORMULES (libre accès)" },
    { id: 9, label: "6.BILAN EXERCICES TAXI" },
    { id: 13, label: "7.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 11, label: "8.BILAN EXAMEN TAXI" },
    { id: 36, label: "9.EXAMENS BLANCS TAXI" },
    { id: 61, label: "10.SOURCES JURIDIQUES TAXI" },
    { id: 71, label: "11.FICHES RÉVISIONS TAXI" },
    { id: 6, label: "12.PRATIQUE TAXI" },
    { id: 84, label: "13.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI" },
    { id: 51, label: "14.FIN DE FORMATION TAXI" },
  ]},
  "taxi-e": { label: "TAXI E-learning", color: "bg-orange-50 text-orange-700 border-orange-200", modules: [
    { id: 26, label: "1.INTRODUCTION E-LEARNING" },
    { id: 10, label: "2.COURS ET EXERCICES TAXI" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "6.FORMULES" },
    { id: 9, label: "7.BILAN EXERCICES TAXI" },
    { id: 13, label: "8.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 11, label: "9.BILAN EXAMEN TAXI" },
    { id: 36, label: "10.EXAMENS BLANCS TAXI" },
    { id: 61, label: "11.SOURCES JURIDIQUES TAXI" },
    { id: 71, label: "12.FICHES RÉVISIONS TAXI" },
    { id: 6, label: "13.PRATIQUE TAXI" },
    { id: 51, label: "14.FIN DE FORMATION TAXI" },
  ]},
  "ta": { label: "TA (Présentiel)", color: "bg-amber-100 text-amber-800 border-amber-300", modules: [
    { id: 31, label: "1.INTRODUCTION TA" },
    { id: 40, label: "2.COURS ET EXERCICES TA" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "🔓 FORMULES (libre accès)" },
    { id: 27, label: "6.BILAN EXERCICES TA" },
    { id: 13, label: "7.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 28, label: "8.BILAN EXAMEN TA" },
    { id: 37, label: "9.EXAMENS BLANCS TA" },
    { id: 62, label: "10.SOURCES JURIDIQUES TA" },
    { id: 72, label: "11.FICHES RÉVISIONS TA" },
    { id: 6, label: "12.PRATIQUE TAXI" },
    { id: 84, label: "13.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI" },
    { id: 52, label: "14.FIN DE FORMATION TA" },
  ]},
  "ta-e-presentiel": { label: "TA E-Présentiel", color: "bg-amber-100 text-amber-800 border-amber-300", modules: [
    { id: 31, label: "1.INTRODUCTION TA" },
    { id: 40, label: "2.COURS ET EXERCICES TA" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "🔓 FORMULES (libre accès)" },
    { id: 27, label: "6.BILAN EXERCICES TA" },
    { id: 13, label: "7.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 28, label: "8.BILAN EXAMEN TA" },
    { id: 37, label: "9.EXAMENS BLANCS TA" },
    { id: 62, label: "10.SOURCES JURIDIQUES TA" },
    { id: 72, label: "11.FICHES RÉVISIONS TA" },
    { id: 6, label: "12.PRATIQUE TAXI" },
    { id: 52, label: "13.FIN DE FORMATION TA" },
  ]},
  "ta-e": { label: "TA E-learning", color: "bg-amber-50 text-amber-700 border-amber-200", modules: [
    { id: 32, label: "1.INTRODUCTION TA E-LEARNING" },
    { id: 40, label: "2.COURS ET EXERCICES TA" },
    { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
    { id: 64, label: "4.ÉQUIPEMENTS TAXI" },
    { id: 12, label: "5.CAS PRATIQUE TAXI" },
    { id: 3, label: "6.FORMULES" },
    { id: 27, label: "7.BILAN EXERCICES TA" },
    { id: 13, label: "8.CONTRÔLE DE CONNAISSANCES TAXI" },
    { id: 28, label: "9.BILAN EXAMEN TA" },
    { id: 37, label: "10.EXAMENS BLANCS TA" },
    { id: 62, label: "11.SOURCES JURIDIQUES TA" },
    { id: 72, label: "12.FICHES RÉVISIONS TA" },
    { id: 6, label: "13.PRATIQUE TAXI" },
    { id: 52, label: "14.FIN DE FORMATION TA" },
  ]},
  "va": { label: "VA (Présentiel)", color: "bg-teal-100 text-teal-800 border-teal-300", modules: [
    { id: 33, label: "1.INTRODUCTION VA" },
    { id: 41, label: "2.COURS ET EXERCICES VA" },
    { id: 3, label: "3.FORMULES" },
    { id: 29, label: "4.BILAN EXERCICES VA" },
    { id: 30, label: "5.BILAN EXAMEN VA" },
    { id: 38, label: "6.EXAMENS BLANCS VA" },
    { id: 63, label: "7.SOURCES JURIDIQUES VA" },
    { id: 73, label: "8.FICHES RÉVISIONS VA" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 53, label: "10.FIN DE FORMATION VA" },
  ]},
  "va-e-presentiel": { label: "VA E-Présentiel", color: "bg-teal-100 text-teal-800 border-teal-300", modules: [
    { id: 34, label: "1.INTRODUCTION VA" },
    { id: 41, label: "2.COURS ET EXERCICES VA" },
    { id: 3, label: "3.FORMULES" },
    { id: 29, label: "4.BILAN EXERCICES VA" },
    { id: 30, label: "5.BILAN EXAMEN VA" },
    { id: 38, label: "6.EXAMENS BLANCS VA" },
    { id: 63, label: "7.SOURCES JURIDIQUES VA" },
    { id: 73, label: "8.FICHES RÉVISIONS VA" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 53, label: "10.FIN DE FORMATION VA" },
  ]},
  "va-e": { label: "VA E-learning", color: "bg-teal-50 text-teal-700 border-teal-200", modules: [
    { id: 34, label: "1.INTRODUCTION VA E-LEARNING" },
    { id: 41, label: "2.COURS ET EXERCICES VA" },
    { id: 3, label: "3.FORMULES" },
    { id: 29, label: "4.BILAN EXERCICES VA" },
    { id: 30, label: "5.BILAN EXAMEN VA" },
    { id: 38, label: "6.EXAMENS BLANCS VA" },
    { id: 63, label: "7.SOURCES JURIDIQUES VA" },
    { id: 73, label: "8.FICHES RÉVISIONS VA" },
    { id: 8, label: "9.PRATIQUE VTC" },
    { id: 53, label: "10.FIN DE FORMATION VA" },
  ]},
  "continue-vtc": { label: "Formation Continue VTC", color: "bg-blue-100 text-blue-800 border-blue-300", modules: [
    { id: 81, label: "1.BILAN EXERCICES FORMATION CONTINUE VTC" },
    { id: 87, label: "2.📋 BILAN FIN DE FORMATION CONTINUE VTC" },
    { id: 83, label: "3.FEUILLES D'ÉMARGEMENT SIGNÉES VTC" },
    { id: 85, label: "4.INFORMATIONS FINANCEUR VTC" },
  ]},
  "continue-taxi": { label: "Formation Continue TAXI", color: "bg-amber-100 text-amber-800 border-amber-300", modules: [
    { id: 82, label: "1.BILAN EXERCICES FORMATION CONTINUE TAXI" },
    { id: 84, label: "2.FEUILLES D'ÉMARGEMENT SIGNÉES TAXI" },
    { id: 86, label: "3.INFORMATIONS FINANCEUR TAXI" },
  ]},
};

// ======================================================================
// 3. HELPERS dérivés automatiquement
// ======================================================================

/** Set de tous les IDs de modules gérés */
export const MANAGED_MODULE_IDS = new Set(ALL_MODULES.map(m => m.id));

/** IDs de modules par défaut pour chaque type de formation */
export const DEFAULT_MODULES_BY_TYPE: Record<string, number[]> = Object.fromEntries(
  Object.entries(FORMATION_MODULES).map(([k, v]) => [k, v.modules.map(m => m.id)])
);

/** Lookup rapide : id → nom du module */
export const MODULE_NAME_BY_ID: Record<number, string> = Object.fromEntries(
  ALL_MODULES.map(m => [m.id, m.nom])
);
