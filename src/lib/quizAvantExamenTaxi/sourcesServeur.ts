import { supabase } from "@/integrations/supabase/client";
import { selectBilanNationalDisplayRows } from "@/lib/bilanTaxiNationaleSelection";
import { construireInventaire, SOURCES, type ItemInventaire } from "./inventaire";

export interface ModuleSource { module_id: number; module_data: unknown }
export interface QuestionCanonique {
  question_id: string; quiz_id: string; section_id: number;
  legacy_question_id: number; position: number; enonce: string;
  choix: unknown; active: boolean; updated_at: string;
}
export interface RattachementCanonique {
  module_id: number; quiz_id: string; exercise_id: number; section_id: number;
}

const QUIZ = ["connaissance-ville", "bilan-exercices-taxi", "bilan-examen-taxi",
  "cas-pratique-taxi", "reglementation-nationale", "reglementation-locale"];
const MODULES = [...new Set(SOURCES.map(s => s.module))];
const PAGE = 500;

/** Same authoritative bound-section projection as the course reader. Unbound
 * geography remains the saved module source; a bound empty section never falls back. */
export function projeterSourcesCanoniques(
  modules: ModuleSource[], questions: QuestionCanonique[], bindings: RattachementCanonique[],
): ModuleSource[] {
  return modules.map(m => {
    const data = m.module_data as { exercices?: Record<string, unknown>[] } | null;
    const rows = selectBilanNationalDisplayRows(m.module_id, questions);
    return { ...m, module_data: { ...data, exercices: (data?.exercices ?? []).map(ex => {
      const bs = bindings.filter(b => b.module_id === m.module_id && b.exercise_id === Number(ex.id));
      if (!bs.length) return ex;
      const qs = bs.flatMap(b => rows.filter(q => q.quiz_id === b.quiz_id && q.section_id === b.section_id));
      return { ...ex, questions: qs.filter(q => q.active)
        .sort((a, b) => a.position - b.position || a.legacy_question_id - b.legacy_question_id)
        .map(q => ({ id: q.legacy_question_id, question_id: q.question_id,
          enonce: q.enonce, choix: q.choix, _canonicalUpdatedAt: q.updated_at })) };
    }) } };
  });
}

/** Pagination is mandatory: this bank exceeds the Data API's 1,000-row cap. */
export async function lirePages<T>(read: (de: number, a: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>): Promise<T[]> {
  const all: T[] = [];
  for (let de = 0; ; de += PAGE) {
    const { data, error } = await read(de, de + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Lecture des sources non confirmée");
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

export async function chargerInventaireServeur(): Promise<ItemInventaire[]> {
  const [modules, questions, bindings] = await Promise.all([
    lirePages<ModuleSource>((de, a) => supabase.from("module_editor_state")
      .select("module_id,module_data").in("module_id", MODULES).order("module_id").range(de, a)),
    lirePages<QuestionCanonique>((de, a) => supabase.from("quiz_questions")
      .select("question_id,quiz_id,section_id,legacy_question_id,position,enonce,choix,active,updated_at")
      .in("quiz_id", QUIZ).order("quiz_id").order("section_id").order("position").order("question_id").range(de, a)),
    lirePages<RattachementCanonique>((de, a) => supabase.from("quiz_question_bindings")
      .select("module_id,quiz_id,exercise_id,section_id").in("module_id", MODULES)
      .order("module_id").order("exercise_id").order("section_id").range(de, a)),
  ]);
  if (modules.length !== MODULES.length) throw new Error("Un module source est absent : inventaire incomplet");
  const ids = questions.map(q => q.question_id);
  if (new Set(ids).size !== ids.length) throw new Error("Sources modifiées pendant la pagination : relire l'inventaire");
  return construireInventaire(projeterSourcesCanoniques(modules, questions, bindings));
}