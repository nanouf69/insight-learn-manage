// Sources de preuves déjà présentes dans le CRM.
// LECTURE SEULE : ces requêtes ne modifient jamais les données existantes.
// Le rattachement crée uniquement une preuve Qualiopi qui RÉFÉRENCE l'élément.

import { supabase } from "@/integrations/supabase/client";

export interface CrmSourceItem {
  id: string;
  label: string;
  date?: string | null;
  url?: string | null;
}

export interface CrmSource {
  key: string;
  table: string;
  label: string;
  description: string;
  indicateurs: number[];
  load: () => Promise<CrmSourceItem[]>;
}

const LIMIT = 25;

async function simple(
  table: string,
  select: string,
  labelFn: (r: any) => string,
  dateField?: string,
  urlField?: string,
): Promise<CrmSourceItem[]> {
  let q = supabase.from(table as any).select(select).limit(LIMIT);
  if (dateField) q = q.order(dateField, { ascending: false });
  const { data, error } = await q;
  if (error) {
    console.warn("[qualiopi][crm-source]", table, error.message);
    return [];
  }
  return ((data as any[]) || []).map((r) => ({
    id: String(r.id),
    label: labelFn(r),
    date: dateField ? r[dateField] : null,
    url: urlField ? r[urlField] : null,
  }));
}

export const CRM_SOURCES: CrmSource[] = [
  {
    key: "formations",
    table: "formations",
    label: "Programmes de formation",
    description: "Catalogue et programmes détaillés (objectifs, durée, contenus).",
    indicateurs: [1, 5, 6, 7, 19],
    load: () => simple("formations", "id, nom, created_at", (r) => r.nom || "Formation", "created_at"),
  },
  {
    key: "documents",
    table: "documents",
    label: "Documents administratifs et pédagogiques",
    description: "Documents enregistrés dans l'onglet Documents du CRM.",
    indicateurs: [1, 5, 9, 15, 17, 19, 23, 26, 31, 32],
    load: () => simple("documents", "id, nom, type, created_at, url", (r) => `${r.nom || "Document"}${r.type ? ` (${r.type})` : ""}`, "created_at", "url"),
  },
  {
    key: "documents_inscription",
    table: "documents_inscription",
    label: "Documents d'inscription apprenants",
    description: "Règlements intérieurs, livrets d'accueil, contrats, pièces signées.",
    indicateurs: [4, 5, 9, 12],
    load: () => simple("documents_inscription", "id, titre, type_document, created_at, url", (r) => `${r.titre || r.type_document || "Document"}`, "created_at", "url"),
  },
  {
    key: "devis_envois",
    table: "devis_envois",
    label: "Devis et conventions envoyés",
    description: "Devis, conventions et contrats transmis aux bénéficiaires et financeurs.",
    indicateurs: [1, 4, 5],
    load: () => simple("devis_envois", "id, created_at", (r) => `Devis du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
  {
    key: "quiz_results",
    table: "apprenant_quiz_results",
    label: "Positionnement, quiz et examens blancs",
    description: "Résultats de QCM, exercices et examens blancs réellement enregistrés.",
    indicateurs: [2, 8, 11],
    load: () => simple("apprenant_quiz_results", "id, quiz_id, matiere_id, score, completed_at", (r) => `${r.quiz_id ?? "Quiz"} — ${r.matiere_id ?? ""} (${r.score ?? "?"})`, "completed_at"),
  },
  {
    key: "module_completion",
    table: "apprenant_module_completion",
    label: "Progression e-learning",
    description: "Avancement des modules par apprenant.",
    indicateurs: [10, 11, 12, 19],
    load: () => simple("apprenant_module_completion", "id, module_id, progress, updated_at", (r) => `Module ${r.module_id} — ${r.progress ?? 0} %`, "updated_at"),
  },
  {
    key: "connexions",
    table: "apprenant_connexions",
    label: "Relevés de connexion",
    description: "Temps de connexion et assiduité e-learning (preuve d'assiduité).",
    indicateurs: [10, 12],
    load: () => simple("apprenant_connexions", "id, started_at, source", (r) => `Connexion ${r.started_at?.slice(0, 16)?.replace("T", " ") ?? ""} (${r.source ?? "web"})`, "started_at"),
  },
  {
    key: "emargements",
    table: "emargements_fc",
    label: "Feuilles d'émargement",
    description: "Émargements présentiel et formation continue.",
    indicateurs: [10, 12, 16],
    load: () => simple("emargements_fc", "id, created_at", (r) => `Émargement du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
  {
    key: "formateurs",
    table: "formateurs",
    label: "Formateurs (CV, qualifications)",
    description: "Intervenants, compétences et qualifications.",
    indicateurs: [15, 17, 18, 21, 22],
    load: () => simple("formateurs", "id, nom, prenom, specialite, created_at", (r) => `${r.nom ?? ""} ${r.prenom ?? ""}${r.specialite ? ` — ${r.specialite}` : ""}`.trim(), "created_at"),
  },
  {
    key: "contrats_fournisseurs",
    table: "contrats_fournisseurs",
    label: "Contrats de sous-traitance",
    description: "Contrats et engagements avec les prestataires externes.",
    indicateurs: [15, 17, 28],
    load: () => simple("contrats_fournisseurs", "id, created_at", (r) => `Contrat du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
  {
    key: "fournisseur_documents",
    table: "fournisseur_documents",
    label: "Documents fournisseurs",
    description: "Pièces transmises par les partenaires et sous-traitants.",
    indicateurs: [17, 28],
    load: () => simple("fournisseur_documents", "id, created_at", (r) => `Document fournisseur du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
  {
    key: "emails",
    table: "emails",
    label: "Échanges avec les apprenants et financeurs",
    description: "Convocations, relances, suivi et réponses tracées.",
    indicateurs: [4, 9, 10, 12, 30, 31],
    load: () => simple("emails", "id, sujet, created_at", (r) => r.sujet || "Email", "created_at"),
  },
  {
    key: "apprenant_questions",
    table: "apprenant_questions",
    label: "Questions et réclamations des apprenants",
    description: "Difficultés remontées par les bénéficiaires et réponses apportées.",
    indicateurs: [30, 31, 32],
    load: () => simple("apprenant_questions", "id, created_at", (r) => `Question du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
  {
    key: "sessions",
    table: "sessions",
    label: "Sessions de formation",
    description: "Organisation, planification et coordination des intervenants.",
    indicateurs: [6, 15, 17],
    load: () => simple("sessions", "id, nom, date_debut", (r) => `${r.nom ?? "Session"} — ${r.date_debut ?? ""}`, "date_debut"),
  },
  {
    key: "renouvellements",
    table: "renouvellements",
    label: "Agréments et échéances",
    description: "Agréments, habilitations et échéances réglementaires.",
    indicateurs: [16, 17, 23],
    load: () => simple("renouvellements", "id, created_at", (r) => `Échéance du ${r.created_at?.slice(0, 10) ?? "?"}`, "created_at"),
  },
];

export function sourcesForIndicateur(n: number): CrmSource[] {
  return CRM_SOURCES.filter((s) => s.indicateurs.includes(n));
}
