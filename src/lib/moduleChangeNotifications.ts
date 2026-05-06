// ======================================================================
// Système de notifications de modifications de modules
// Détecte les changements (questions, réponses, exercices) entre l'ancien
// et le nouveau module_data, et crée une entrée dans module_change_notifications
// pour avertir les apprenants ayant déjà accédé au module.
// ======================================================================

import { supabase } from "@/integrations/supabase/client";

interface QuestionLite {
  id?: number | string;
  enonce?: string;
  choix?: { lettre?: string; texte?: string; correct?: boolean }[];
}

interface ExerciceLite {
  id?: number | string;
  titre?: string;
  questions?: QuestionLite[];
}

interface ModuleDataLite {
  exercices?: ExerciceLite[];
}

function normalize(s?: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function questionsEqual(a: QuestionLite, b: QuestionLite): boolean {
  if (normalize(a.enonce) !== normalize(b.enonce)) return false;
  const ac = a.choix ?? [];
  const bc = b.choix ?? [];
  if (ac.length !== bc.length) return false;
  for (let i = 0; i < ac.length; i++) {
    if (
      normalize(ac[i].texte) !== normalize(bc[i].texte) ||
      Boolean(ac[i].correct) !== Boolean(bc[i].correct)
    )
      return false;
  }
  return true;
}

/**
 * Compute a human-readable summary of changes between two module_data snapshots.
 * Returns null if no meaningful change was detected.
 */
export function diffModuleData(
  oldData: ModuleDataLite | null | undefined,
  newData: ModuleDataLite | null | undefined,
): string | null {
  const oldExos = oldData?.exercices ?? [];
  const newExos = newData?.exercices ?? [];

  const oldMap = new Map<string, ExerciceLite>();
  for (const e of oldExos) oldMap.set(String(e.id), e);
  const newMap = new Map<string, ExerciceLite>();
  for (const e of newExos) newMap.set(String(e.id), e);

  const lines: string[] = [];

  // Added exercises
  for (const [id, exo] of newMap) {
    if (!oldMap.has(id)) {
      lines.push(`Nouvel exercice ajouté : « ${exo.titre ?? `#${id}`} »`);
    }
  }

  // Removed exercises
  for (const [id, exo] of oldMap) {
    if (!newMap.has(id)) {
      lines.push(`Exercice supprimé : « ${exo.titre ?? `#${id}`} »`);
    }
  }

  // Modified exercises
  for (const [id, oldExo] of oldMap) {
    const newExo = newMap.get(id);
    if (!newExo) continue;

    const oldQs = oldExo.questions ?? [];
    const newQs = newExo.questions ?? [];
    const oldQMap = new Map<string, QuestionLite>();
    oldQs.forEach((q, i) => oldQMap.set(String(q.id ?? `idx-${i}`), q));
    const newQMap = new Map<string, QuestionLite>();
    newQs.forEach((q, i) => newQMap.set(String(q.id ?? `idx-${i}`), q));

    let added = 0;
    let removed = 0;
    let modified = 0;

    for (const [qid] of newQMap) {
      if (!oldQMap.has(qid)) added++;
    }
    for (const [qid] of oldQMap) {
      if (!newQMap.has(qid)) removed++;
    }
    for (const [qid, oldQ] of oldQMap) {
      const newQ = newQMap.get(qid);
      if (newQ && !questionsEqual(oldQ, newQ)) modified++;
    }

    const titreChanged = normalize(oldExo.titre) !== normalize(newExo.titre);

    if (added || removed || modified || titreChanged) {
      const parts: string[] = [];
      if (titreChanged) parts.push("titre modifié");
      if (added) parts.push(`${added} question(s) ajoutée(s)`);
      if (removed) parts.push(`${removed} question(s) supprimée(s)`);
      if (modified) parts.push(`${modified} question(s)/réponse(s) modifiée(s)`);
      lines.push(`Exercice « ${newExo.titre ?? `#${id}`} » : ${parts.join(", ")}`);
    }
  }

  if (lines.length === 0) return null;
  return lines.slice(0, 8).join("\n");
}

/** Insert a change notification row. Best-effort, non-blocking. */
export async function publishModuleChangeNotification(params: {
  moduleId: number;
  moduleNom: string;
  summary: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("module_change_notifications").insert({
      module_id: params.moduleId,
      module_nom: params.moduleNom,
      change_summary: params.summary,
    });
    if (error) console.error("[module-notif] insert error:", error);
  } catch (err) {
    console.error("[module-notif] failed:", err);
  }
}
