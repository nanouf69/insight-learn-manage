import { supabase } from "@/integrations/supabase/client";
import { fetchCoreMatiereStatesBulk } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables } from "@/lib/passagesV2NonFiables";
import { modeExamenBlancStrict } from "@/lib/confirmationPresentielEB";
import { isAfterExamReset, latestExamResetCutoffs } from "@/lib/examResetCutoff";
import { fetchLiveExamens } from "@/components/cours-en-ligne/useLiveExamens";
import { lireParLotsEtPages, lireToutesLesPages } from "./lectureComplete";
import { observerNotesGlobales, type ObservationNoteGlobale, type DefinitionSurveillee } from "./noteGlobale";

/** Paginated administrative SELECTs only. No result creation, grading, RPC mutation or migration. */
export async function lireObservationsNotesGlobales(): Promise<ObservationNoteGlobale[]> {
  const [inscriptions, examens] = await Promise.all([
    lireToutesLesPages<any>((d, f) => supabase.from("session_apprenants").select("id, apprenant_id").order("id").range(d, f) as any),
    fetchLiveExamens(),
  ]);
  const ids = Array.from(new Set<string>(inscriptions.map(i => i.apprenant_id)));
  const profils = await lireParLotsEtPages<any>(ids, (lot, d, f) => supabase.from("apprenants")
    .select("id, nom, prenom, type_apprenant, formation_choisie, creneau_horaire")
    .in("id", lot).is("deleted_at", null).order("id").range(d, f) as any);
  const tests = await lireToutesLesPages<any>((d, f) => supabase.from("comptes_test_techniques").select("apprenant_id").order("apprenant_id").range(d, f) as any);
  const testIds = new Set(tests.map(t => t.apprenant_id));
  const eligibles = profils.filter(a => !testIds.has(a.id) && modeExamenBlancStrict(a) === "presentiel");
  const appIds = eligibles.map(a => a.id);
  if (!appIds.length) return [];
  const [rows, coreMap, resets] = await Promise.all([
    lireParLotsEtPages<any>(appIds, (lot, d, f) => supabase.from("apprenant_quiz_results").select("*")
      .in("apprenant_id", lot).in("quiz_type", ["examen_blanc", "examen_blanc_taxi"]).order("id").range(d, f) as any),
    fetchCoreMatiereStatesBulk(appIds),
    lireParLotsEtPages<any>(appIds, (lot, d, f) => supabase.from("core_exam_resets")
      .select("reset_id, apprenant_id, exam_id, cutoff_at, archived_legacy_result_ids").in("apprenant_id", lot).order("reset_id").range(d, f) as any),
  ]);
  if (coreMap === null) throw new Error("Lecture des passages serveur impossible");
  const nonFiables = await fetchPassagesV2NonFiables(coreMap);
  if (nonFiables === null) throw new Error("Lecture des preuves serveur impossible");
  const definitions = examens.filter(e => /^EB[1-6](-TAXI)?$/.test(e.id) && (e.type === "VTC" || e.type === "TAXI")) as DefinitionSurveillee[];
  return eligibles.flatMap(a => {
    const rs = resets.filter(r => r.apprenant_id === a.id);
    const cutoffs = latestExamResetCutoffs(rs);
    const archives = new Set(rs.flatMap(r => r.archived_legacy_result_ids ?? []));
    return observerNotesGlobales({ apprenant: a,
      rows: rows.filter(r => r.apprenant_id === a.id && !archives.has(r.id) && isAfterExamReset(r.completed_at, cutoffs[r.quiz_id])),
      states: (coreMap.get(a.id) ?? []).filter(s => isAfterExamReset(s.finishedAt, cutoffs[s.examId])),
      nonFiables, examens: definitions });
  });
}