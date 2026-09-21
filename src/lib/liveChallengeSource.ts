import { supabase } from "@/integrations/supabase/client";
import type { LiveQuestion } from "@/lib/liveChallenge";

/**
 * LECTURE SEULE des questions existantes pour construire un snapshot de challenge.
 * Ce fichier n'ecrit JAMAIS : ni module_editor_state, ni examens blancs, ni QRC, ni e-learning.
 * Le snapshot produit est une copie independante : modifier la question d'origine ensuite
 * ne change rien a un challenge deja lance.
 */

/** Pilote : une seule matiere VTC branchee pour l'instant. */
export const PILOTE_MATIERE = "Réglementation Spécifique VTC";

/** Module "2. COURS ET EXERCICES VTC" (filiere VTC). */
const VTC_MODULE_ID = 2;

export type SourceQuiz = {
  exerciceId: number;
  titre: string;
  matiere: string;
  nbQuestions: number;
};

export type SourceFilters = {
  nombre: number;
  typeFiltre: "tous" | "qcm" | "qrc";
  ordre: "origine" | "aleatoire";
};

function matiereFromTitre(titre: string): string {
  const raw = String(titre || "").split("—")[0].trim();
  return raw || titre;
}

/** Liste des quiz sources VTC (lecture seule). */
export async function fetchVtcSourceQuizzes(): Promise<SourceQuiz[]> {
  const { data, error } = await supabase
    .from("module_editor_state")
    .select("module_data")
    .eq("module_id", VTC_MODULE_ID)
    .maybeSingle();
  if (error) throw error;
  const exercices = ((data?.module_data as any)?.exercices ?? []) as any[];
  return exercices
    .filter((e) => e?.actif !== false)
    .map((e) => ({
      exerciceId: Number(e.id),
      titre: String(e.titre || `Exercice ${e.id}`),
      matiere: matiereFromTitre(String(e.titre || "")),
      nbQuestions: Array.isArray(e.questions) ? e.questions.length : 0,
    }));
}

function toLiveQuestion(exerciceId: number, q: any): LiveQuestion | null {
  const enonce = String(q?.enonce || "").trim();
  if (!enonce) return null;
  const reponseQrc = q?.reponseQRC ?? q?.reponse_qrc ?? null;
  const isQrc = String(q?.type || "").toLowerCase() === "qrc" || (!!reponseQrc && !Array.isArray(q?.choix));
  const id = `src-${exerciceId}-${q?.id ?? enonce.slice(0, 12)}`;

  if (isQrc) {
    return {
      id,
      enonce,
      type: "qrc",
      points: Number(q?.points) || 2,
      bonneReponse: reponseQrc ? String(reponseQrc) : null,
      explication: q?.explication ? String(q.explication) : null,
      image: q?.image ? String(q.image) : null,
    };
  }

  const choix = Array.isArray(q?.choix) ? q.choix : [];
  if (choix.length === 0) return null;
  const propositions = choix.map((c: any) => String(c?.texte ?? ""));
  const bonnes = choix.filter((c: any) => c?.correct === true).map((c: any) => String(c?.texte ?? ""));
  return {
    id,
    enonce,
    type: "qcm",
    propositions,
    bonneReponse: bonnes[0] ?? null,
    bonnesReponses: bonnes,
    points: Number(q?.points) || 1,
    explication: q?.explication ? String(q.explication) : null,
    image: q?.image ? String(q.image) : null,
  };
}

/** Construit le snapshot fige (copie independante) a partir d'un quiz source. */
export async function buildSnapshotFromSource(
  exerciceId: number,
  filters: SourceFilters,
): Promise<LiveQuestion[]> {
  const { data, error } = await supabase
    .from("module_editor_state")
    .select("module_data")
    .eq("module_id", VTC_MODULE_ID)
    .maybeSingle();
  if (error) throw error;
  const exercices = ((data?.module_data as any)?.exercices ?? []) as any[];
  const exercice = exercices.find((e) => Number(e?.id) === Number(exerciceId));
  if (!exercice) throw new Error("Quiz source introuvable");

  let questions = (Array.isArray(exercice.questions) ? exercice.questions : [])
    .map((q: any) => toLiveQuestion(exerciceId, q))
    .filter((q): q is LiveQuestion => q !== null);

  if (filters.typeFiltre !== "tous") {
    questions = questions.filter((q) => q.type === filters.typeFiltre);
  }
  if (filters.ordre === "aleatoire") {
    questions = [...questions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }
  const nombre = Math.max(1, Math.min(filters.nombre || questions.length, questions.length));
  return questions.slice(0, nombre);
}
