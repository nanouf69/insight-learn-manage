import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./examens-blancs-data";
import { normalizeText, SEARCHABLE_MODULES } from "./module-content-search";
import {
  exercicesAffichesPourRecherche,
  SEARCH_CANONICAL_QUIZ_IDS,
  type SearchCanonicalBinding,
  type SearchCanonicalRow,
} from "./module-search-display";

export type SourceBilanQcm = "exercices" | "examen";

export const MODULES_BILAN_QCM: Record<SourceBilanQcm, number[]> = {
  exercices: [4, 9, 27, 29, 81, 82],
  examen: [5, 11, 28, 30],
};

export type QcmBilan = {
  key: string;
  moduleId: number;
  moduleNom: string;
  exerciceTitre: string;
  question: Question;
};

/** Copie volontaire dans la matière cible : l'identifiant et l'objet source restent intacts. */
export function copierQcmPourImport(source: Question, newId: number): Question {
  const copie = JSON.parse(JSON.stringify(source)) as Question & Record<string, unknown>;
  delete copie.manually_edited;
  delete copie._editedAt;
  return { ...copie, id: newId, type: "QCM" };
}

export function filtrerQcmBilans(rows: QcmBilan[], query: string, limit = 60): QcmBilan[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  return rows
    .filter((row) => {
      if (!terms.length) return true;
      const haystack = normalizeText([
        row.moduleNom,
        row.exerciceTitre,
        row.question.enonce,
        ...(row.question.choix ?? []).map((choix) => choix.texte),
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit);
}

async function chargerQuestionsCanoniques(moduleIds: number[]) {
  const quizIds = [...new Set(moduleIds.flatMap((moduleId) => SEARCH_CANONICAL_QUIZ_IDS[moduleId] ?? []))];
  if (!quizIds.length) return { rows: [] as SearchCanonicalRow[], bindings: [] as SearchCanonicalBinding[] };

  const rows: SearchCanonicalRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("question_id,quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,explication,active")
      .in("quiz_id", quizIds)
      .order("question_id")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as SearchCanonicalRow[]));
    if (!data || data.length < 1000) break;
  }

  const { data: bindings, error } = await supabase
    .from("quiz_question_bindings")
    .select("module_id,quiz_id,exercise_id,section_id")
    .in("module_id", moduleIds);
  if (error) throw error;
  return { rows, bindings: (bindings ?? []) as SearchCanonicalBinding[] };
}

/** Lecture seule des questions actuellement affichées dans les bilans demandés. */
export async function chargerQcmBilans(source: SourceBilanQcm): Promise<QcmBilan[]> {
  const moduleIds = MODULES_BILAN_QCM[source];
  const modules = SEARCHABLE_MODULES.filter((module) => moduleIds.includes(module.id));
  const [{ data: savedRows, error }, canonical] = await Promise.all([
    supabase.from("module_editor_state").select("module_id,module_data").in("module_id", moduleIds),
    chargerQuestionsCanoniques(moduleIds),
  ]);
  if (error) throw error;

  const savedByModule = new Map<number, any>();
  for (const row of savedRows ?? []) {
    if (row?.module_data && typeof row.module_data === "object") savedByModule.set(Number(row.module_id), row.module_data);
  }

  const result: QcmBilan[] = [];
  for (const module of modules) {
    const saved = savedByModule.get(module.id);
    const base = Array.isArray(saved?.exercices) ? saved.exercices : module.exercices;
    const exercices = exercicesAffichesPourRecherche(module.id, base, canonical.rows, canonical.bindings, { strict: true });
    for (const exercice of exercices) {
      const questions = Array.isArray(exercice?.questions) ? exercice.questions : [];
      questions.forEach((question: any, index: number) => {
        const type = String(question?.type ?? "QCM").toUpperCase();
        if (type !== "QCM" || !Array.isArray(question?.choix)) return;
        const numericId = Number(question?.id);
        result.push({
          key: `${module.id}:${String(exercice?.id)}:${String(question?.id ?? index)}:${index}`,
          moduleId: module.id,
          moduleNom: module.nom,
          exerciceTitre: String(exercice?.titre ?? "Exercice"),
          question: {
            ...question,
            id: Number.isFinite(numericId) ? numericId : index + 1,
            type: "QCM",
            enonce: String(question?.enonce ?? ""),
            choix: question.choix,
          } as Question,
        });
      });
    }
  }
  return result;
}
