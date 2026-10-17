/** Append-only registry: indices of active legacy exports must never move. */
export const EXPORT_TABLES: [string, string][] = [
  ['apprenants', 'id'], ['session_apprenants', 'id'], ['reponses_apprenants', 'id'],
  ['reponses_apprenants_historique', 'id'], ['reponses_apprenants_journal', 'id'],
  ['apprenant_quiz_results', 'id'], ['apprenant_module_completion', 'id'],
  ['apprenant_module_activites', 'id'], ['apprenant_connexions', 'id'],
  ['apprenant_question_temps', 'id'], ['apprenant_documents_completes', 'id'],
  ['documents_inscription', 'id'], ['emargements_fc', 'id'], ['answer_state', 'response_id'],
  ['answer_state_historique', 'id'], ['answer_events', 'event_id'], ['exam_attempts_v2', 'attempt_id'],
  ['qrc_instances_v2', 'qrc_instance_id'], ['qrc_correction_events', 'correction_event_id'],
  ['core_exam_results', 'result_id'], ['bilan_passage_snapshots', 'id'], ['bilan_passages_figes', 'id'],
  ['donnees_eleves_suppressions', 'id'],
  ['cma_planning_lignes', 'id'], ['cma_planning_attente', 'id'], ['cma_planning_attente_rattachements', 'id'],
];
export const EXPORT_VERSION = 2;
export function exportManifest(comptes: Record<string, number>, erreurs: string[], tables = EXPORT_TABLES.map(([name]) => name)) {
  const missing = tables.filter(name => !Object.prototype.hasOwnProperty.call(comptes, name));
  return { version: EXPORT_VERSION, tables: tables.length, table_names: tables, comptes, erreurs: [...erreurs, ...missing.map(name => `${name}: compte absent`)] };
}