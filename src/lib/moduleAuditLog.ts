import { supabase } from "@/integrations/supabase/client";

export type ModuleAuditAction = "admin_edit" | "resync_overwrite";

export interface ModuleAuditEntry {
  moduleId: number;
  moduleNom?: string | null;
  action: ModuleAuditAction;
  /**
   * Origine du changement :
   * - pour `admin_edit` : composant/fonction ayant déclenché la sauvegarde
   *   (ex: `ModuleDetailView.performDbSave`)
   * - pour `resync_overwrite` : mécanisme ayant écrasé une valeur admin
   *   (ex: `forceBilanExamGestionFromSource`, `syncSharedExercisesToSiblingModules`)
   */
  origin: string;
  exerciceId?: string | number | null;
  questionId?: string | number | null;
  field?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
}

const truncate = (value: unknown): unknown => {
  try {
    const json = JSON.stringify(value);
    if (!json) return value;
    if (json.length <= 4000) return value;
    return { __truncated: true, preview: json.slice(0, 4000) };
  } catch {
    return null;
  }
};

/**
 * Journalise une entrée d'audit module (best-effort, ne bloque jamais l'UI).
 */
export const logModuleAudit = async (entry: ModuleAuditEntry): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    await supabase.from("module_admin_audit_log").insert({
      module_id: entry.moduleId,
      module_nom: entry.moduleNom ?? null,
      action: entry.action,
      origin: entry.origin,
      exercice_id: entry.exerciceId != null ? String(entry.exerciceId) : null,
      question_id: entry.questionId != null ? String(entry.questionId) : null,
      field: entry.field ?? null,
      summary: entry.summary ?? null,
      before_value: entry.before !== undefined ? (truncate(entry.before) as any) : null,
      after_value: entry.after !== undefined ? (truncate(entry.after) as any) : null,
      author_user_id: user?.id ?? null,
      author_email: user?.email ?? null,
    });
  } catch (err) {
    // Ne jamais faire échouer la sauvegarde à cause du log
    console.warn("[ModuleAudit] log failed (non-bloquant):", err);
  }
};

/**
 * Compare deux versions d'un module et journalise chaque question modifiée/supprimée.
 */
export const logAdminEditsDiff = async (
  moduleId: number,
  moduleNom: string | undefined,
  before: any,
  after: any,
  origin = "ModuleDetailView.performDbSave",
): Promise<void> => {
  try {
    const beforeExos: any[] = before?.exercices ?? [];
    const afterExos: any[] = after?.exercices ?? [];

    const beforeQMap = new Map<string, { exo: any; q: any }>();
    for (const exo of beforeExos) {
      for (const q of exo?.questions ?? []) {
        beforeQMap.set(`${exo.id}#${q.id}`, { exo, q });
      }
    }
    const afterQMap = new Map<string, { exo: any; q: any }>();
    for (const exo of afterExos) {
      for (const q of exo?.questions ?? []) {
        afterQMap.set(`${exo.id}#${q.id}`, { exo, q });
      }
    }

    const entries: ModuleAuditEntry[] = [];

    // Suppressions
    for (const [key, prev] of beforeQMap) {
      if (!afterQMap.has(key)) {
        entries.push({
          moduleId,
          moduleNom,
          action: "admin_edit",
          origin,
          exerciceId: prev.exo?.id,
          questionId: prev.q?.id,
          field: "question_deleted",
          summary: `Question supprimée: ${String(prev.q?.enonce ?? "").slice(0, 120)}`,
          before: prev.q,
          after: null,
        });
      }
    }

    // Ajouts / modifications
    for (const [key, next] of afterQMap) {
      const prev = beforeQMap.get(key);
      if (!prev) {
        entries.push({
          moduleId,
          moduleNom,
          action: "admin_edit",
          origin,
          exerciceId: next.exo?.id,
          questionId: next.q?.id,
          field: "question_added",
          summary: `Question ajoutée: ${String(next.q?.enonce ?? "").slice(0, 120)}`,
          before: null,
          after: next.q,
        });
        continue;
      }

      const fields: Array<keyof any> = ["enonce", "choix", "image", "imageSize", "reponseCorrecte", "reponseQRC", "type", "explication"];
      for (const field of fields) {
        const a = (prev.q as any)?.[field];
        const b = (next.q as any)?.[field];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          entries.push({
            moduleId,
            moduleNom,
            action: "admin_edit",
            origin,
            exerciceId: next.exo?.id,
            questionId: next.q?.id,
            field: String(field),
            summary: `Champ « ${String(field)} » modifié`,
            before: a ?? null,
            after: b ?? null,
          });
        }
      }
    }

    // On limite à 50 entrées par sauvegarde pour éviter le spam
    const capped = entries.slice(0, 50);
    await Promise.all(capped.map((e) => logModuleAudit(e)));
  } catch (err) {
    console.warn("[ModuleAudit] diff log failed:", err);
  }
};
