import { supabase } from "@/integrations/supabase/client";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { assemblerCalculJalons, type CalculJalons, type CompletionCalc } from "@/lib/jalonsCalculCore";
import { idsActivites } from "@/lib/jeuxPedagogiques";
import { activitesDispenseesPourParcours } from "@/lib/exceptionsModulesEleve";
import { modulesAttribuesDashboard, resolveFormationId } from "@/lib/parcoursModulesDashboard";
import type { GelFinAcces } from "@/lib/releveJalonsGel";
import {
  INTRO_IDS,
  MODULES_FILIERE,
  PRATIQUE_PHYSIQUE,
  avecJalonPratique,
  filiereDuParcours,
  type Filiere,
} from "@/lib/jalonsPonderes";

export const FORMATIONS_JALONS_ELEARNING = new Set(["vtc-e", "taxi-e", "ta-e", "va-e"]);

export function formationJalonsElearning(typeApprenant?: string | null, formationChoisie?: string | null) {
  const type = String(typeApprenant ?? "").toLowerCase().trim();
  const formation = String(formationChoisie ?? "").toLowerCase().trim();
  if (FORMATIONS_JALONS_ELEARNING.has(type)) return type;
  if (FORMATIONS_JALONS_ELEARNING.has(formation)) return formation;
  return null;
}

export type JalonCompletion = CompletionCalc;

/** Modules à lire pour un parcours (même liste pour le calcul actuel et le calcul figé). */
export function modulesDuCalcul(key: string) {
  const filiere = filiereDuParcours(key) as Filiere;
  const parcoursInitial = FORMATION_MODULES[key].modules.map((module) => module.id);
  const parcours = avecJalonPratique(parcoursInitial);
  const ids = [...new Set([...MODULES_FILIERE[filiere].filter((id) => id > 0), ...parcoursInitial.filter((id) => INTRO_IDS.has(id)), 26, 32, 34])];
  return { filiere, parcoursInitial, parcours, ids };
}

/**
 * Relevé figé : le calcul COMPLET (volumes, poids, durées, résultat) est
 * calculé et enregistré côté serveur au moment du gel. Ici on le LIT seulement :
 * aucune lecture ne recalcule ni ne crée de version. Absent = indisponible.
 */
export async function lireCalculFige(gel: GelFinAcces): Promise<CalculJalons & { calculFige: { methode: string; code: string; calcule_le: string } }> {
  const { data, error } = await supabase.from("releve_jalons_calcul_fige" as any)
    .select("calcul, methode, code_ref, created_at").eq("gel_id", gel.id).maybeSingle();
  if (error) throw error;
  const row = data as any;
  if (!row?.calcul) throw new Error("Calcul figé pas encore enregistré par le serveur pour ce relevé : indisponible (aucun recalcul).");
  return { ...(row.calcul as CalculJalons), gelId: gel.id, calculFige: { methode: row.methode, code: row.code_ref, calcule_le: row.created_at } };
}

export async function chargerCalculJalons(params: {
  apprenantId: string;
  typeApprenant?: string | null;
  formationChoisie?: string | null;
  completions?: JalonCompletion[];
  /** Relevé figé à la fin des accès : lecture du calcul figé serveur uniquement. */
  gel?: GelFinAcces | null;
}) {
  if (params.gel) return lireCalculFige(params.gel);
  const key = formationJalonsElearning(params.typeApprenant, params.formationChoisie);
  if (!key) throw new Error("Formation e-learning non concernée");
  const { filiere, parcoursInitial, parcours, ids } = modulesDuCalcul(key);
  const [{ data: editorRows, error: editorError }, examensModule, moduleDetail, pratiqueDetails, emargementsResult, completionsResult, heuresValideesResult, jeuxResult, affectation] = await Promise.all([
    supabase.from("module_editor_state").select("module_id, module_data, deleted_exercices, deleted_cours").in("module_id", ids),
    import("@/components/cours-en-ligne/useLiveExamens"),
    import("@/components/cours-en-ligne/ModuleDetailView"),
    fetchPratiqueSlotDetails(params.apprenantId),
    supabase.from("emargements_fc" as any).select("date_emargement, demi_journee, absent, signature_data_url, masque, signed_at").eq("apprenant_id", params.apprenantId),
    params.completions
      ? Promise.resolve({ data: params.completions, error: null })
      : supabase.from("apprenant_module_completion").select("module_id, status, progress, completed_at").eq("apprenant_id", params.apprenantId),
    supabase.from("presentiel_heures_validees" as any).select("id, heures, created_at, date_presence, categorie").eq("apprenant_id", params.apprenantId),
    // Jeux du module 8 : seule une ligne serveur completed = true compte (jamais le score local).
    supabase.from("reponses_apprenants").select("exercice_id, completed").eq("apprenant_id", params.apprenantId).in("exercice_id", idsActivites(parcoursInitial).length ? idsActivites(parcoursInitial) : ["__aucune__"]),
    supabase.from("apprenants").select("modules_autorises, type_apprenant, formation_choisie").eq("id", params.apprenantId).single(),
  ]);
  if (affectation.error) throw affectation.error;
  const formation = resolveFormationId(affectation.data.type_apprenant, affectation.data.formation_choisie, affectation.data.modules_autorises);
  if (!formation) throw new Error("Parcours indisponible");
  if (jeuxResult.error) throw jeuxResult.error;
  if (editorError) throw editorError;
  if (emargementsResult.error) throw emargementsResult.error;
  if (completionsResult.error) throw completionsResult.error;
  if (heuresValideesResult.error) throw heuresValideesResult.error;
  const examens = await examensModule.fetchLiveExamens();
  return assemblerCalculJalons({
    key, filiere, parcours, parcoursInitial, editorRows: (editorRows ?? []) as any, examens: examens as any,
    initialDe: (id) => moduleDetail.getInitialModuleContentForVolume(id, params.typeApprenant),
    pratiqueDetails, emargements: (emargementsResult.data as any[]) ?? [], completions: (completionsResult.data as JalonCompletion[]) ?? [],
    heuresValidees: (heuresValideesResult.data as any[]) ?? [],
    jeuxTermines: ((jeuxResult.data as any[]) ?? []).filter((r) => r.completed === true).map((r) => String(r.exercice_id)),
    activitesDispensees: [...activitesDispenseesPourParcours(modulesAttribuesDashboard(formation, affectation.data.modules_autorises), (completionsResult.data as JalonCompletion[]) ?? [], params.apprenantId)],
  });
}

export const estJalonPratique = (moduleId: number) => moduleId === PRATIQUE_PHYSIQUE;
export { dureeLigne } from "@/lib/jalonsPonderes";
