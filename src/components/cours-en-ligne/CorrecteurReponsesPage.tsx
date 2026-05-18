import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES_DATA } from "./formations-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Lock, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Choix {
  lettre: string;
  texte: string;
  correct?: boolean;
  explication?: string;
  admin_locked?: boolean;
}

interface Question {
  id: number;
  enonce: string;
  choix: Choix[];
  image?: string | null;
  _editedAt?: string;
  admin_locked?: boolean;
  [k: string]: any;
}

interface Exercice {
  id: number;
  titre: string;
  sousTitre?: string;
  actif?: boolean;
  questions?: Question[];
  [k: string]: any;
}

interface ModuleData {
  id: number;
  nom: string;
  description?: string;
  cours?: any[];
  exercices?: Exercice[];
  [k: string]: any;
}

interface EditorRow {
  module_id?: number;
  module_data: ModuleData;
  deleted_cours: any[] | null;
  deleted_exercices: any[] | null;
  updated_at: string;
}

interface SaveConfirmation {
  moduleId: number;
  exerciceId: number | string;
  questionId: number;
  enonce: string;
  choix: Choix[];
  questionAdminLocked: boolean;
}

const sortedModules = [...MODULES_DATA].sort((a, b) => a.id - b.id);

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const sameExercise = (a: Exercice, b: Exercice) => {
  if (a?.id != null && b?.id != null && Number(a.id) === Number(b.id)) return true;
  return normalizeText(a?.titre) === normalizeText(b?.titre) && normalizeText(a?.sousTitre) === normalizeText(b?.sousTitre);
};

const sameQuestion = (a: Question, b: Question) => {
  if (a?.id != null && b?.id != null && Number(a.id) === Number(b.id)) return true;
  return normalizeText(a?.enonce) === normalizeText(b?.enonce);
};

const lockQuestionFromEditor = (dbQuestion: Question, editedQuestion: Question, editedAt: string): Question => {
  const editedChoixByLetter = new Map(
    (editedQuestion.choix ?? []).map((choice) => [String(choice.lettre ?? ""), choice]),
  );
  const sourceChoix = (dbQuestion.choix?.length ? dbQuestion.choix : editedQuestion.choix) ?? [];

  return {
    ...dbQuestion,
    ...editedQuestion,
    id: dbQuestion.id ?? editedQuestion.id,
    enonce: editedQuestion.enonce ?? dbQuestion.enonce,
    admin_locked: true,
    _editedAt: editedAt,
    choix: sourceChoix.map((dbChoice, index) => {
      const editedChoice =
        editedChoixByLetter.get(String(dbChoice.lettre ?? "")) ?? editedQuestion.choix?.[index] ?? dbChoice;
      return {
        ...dbChoice,
        ...editedChoice,
        correct: editedChoice.correct === true,
        admin_locked: true,
      };
    }),
  };
};

const CorrecteurReponsesPage = () => {
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<EditorRow | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [confirmations, setConfirmations] = useState<SaveConfirmation[]>([]);

  const selectedModule = useMemo(
    () => sortedModules.find((m) => m.id === moduleId) ?? null,
    [moduleId],
  );

  const loadModule = async (id: number, clearConfirmations = true) => {
    setLoading(true);
    setRow(null);
    setExercices([]);
    try {
      const { data, error } = await supabase
        .from("module_editor_state")
        .select("module_id, module_data, deleted_cours, deleted_exercices, updated_at")
        .eq("module_id", id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.module_data) {
        toast.warning(
          "Aucune donnée sauvegardée en base pour ce module. Ouvrez-le d'abord via Cours en ligne pour initialiser, puis revenez ici.",
        );
        return;
      }
      const md = data.module_data as unknown as ModuleData;
      setRow(data as EditorRow);
      setExercices(Array.isArray(md.exercices) ? md.exercices : []);
      if (clearConfirmations) setConfirmations([]);
    } catch (err: any) {
      console.error("[CorrecteurReponses] load error", err);
      toast.error(err?.message || "Impossible de charger le module");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleId != null) loadModule(moduleId);
  }, [moduleId]);

  const updateChoix = (
    exoId: number,
    qId: number,
    cIdx: number,
    patch: Partial<Choix>,
  ) => {
    setExercices((prev) =>
      prev.map((exo) => {
        if (Number(exo.id) !== Number(exoId)) return exo;
        return {
          ...exo,
          questions: (exo.questions ?? []).map((q) => {
            if (Number(q.id) !== Number(qId)) return q;
            return {
              ...q,
              choix: q.choix.map((c, i) =>
                i === cIdx ? { ...c, ...patch } : c,
              ),
            };
          }),
        };
      }),
    );
  };

  const updateQuestionEnonce = (exoId: number, qId: number, enonce: string) => {
    setExercices((prev) =>
      prev.map((exo) => {
        if (Number(exo.id) !== Number(exoId)) return exo;
        return {
          ...exo,
          questions: (exo.questions ?? []).map((q) =>
            Number(q.id) === Number(qId) ? { ...q, enonce } : q,
          ),
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!moduleId || !row) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { data: rows, error: rowsError } = await supabase
        .from("module_editor_state")
        .select("module_id, module_data, deleted_cours, deleted_exercices, updated_at")
        .order("module_id", { ascending: true });
      if (rowsError) throw rowsError;

      const editorQuestions = exercices.flatMap((exo) =>
        (exo.questions ?? []).map((question) => ({ exo, question })),
      );

      const affectedRows = ((rows as EditorRow[]) ?? [])
        .map((dbRow) => {
          const moduleData = dbRow.module_data as ModuleData;
          const dbExercices = Array.isArray(moduleData?.exercices) ? moduleData.exercices : [];
          let changed = false;

          const nextExercices = dbExercices.map((dbExo) => {
            const matchingEditorExo = exercices.find((editedExo) => sameExercise(editedExo, dbExo));
            if (!matchingEditorExo) return dbExo;

            const nextQuestions = (dbExo.questions ?? []).map((dbQuestion) => {
              const editedQuestion = (matchingEditorExo.questions ?? []).find((q) => sameQuestion(q, dbQuestion));
              if (!editedQuestion) return dbQuestion;
              changed = true;
              return lockQuestionFromEditor(dbQuestion, editedQuestion, now);
            });

            return { ...dbExo, questions: nextQuestions };
          });

          return changed
            ? {
                dbRow,
                nextModuleData: {
                  ...(moduleData || {}),
                  id: Number(dbRow.module_id),
                  nom: moduleData?.nom || sortedModules.find((m) => m.id === Number(dbRow.module_id))?.nom || `Module ${dbRow.module_id}`,
                  exercices: nextExercices,
                } as ModuleData,
              }
            : null;
        })
        .filter(Boolean) as Array<{ dbRow: EditorRow; nextModuleData: ModuleData }>;

      if (affectedRows.length === 0 && editorQuestions.length > 0) {
        throw new Error("Aucun module partagé trouvé pour ces exercices/questions.");
      }

      const upserts = affectedRows.map(({ dbRow, nextModuleData }) => ({
        module_id: Number(dbRow.module_id),
        module_data: nextModuleData as any,
        deleted_cours: dbRow.deleted_cours ?? [],
        deleted_exercices: dbRow.deleted_exercices ?? [],
        source_fingerprint: `correcteur:${now}`,
      }));

      const { error } = await supabase
        .from("module_editor_state")
        .upsert(upserts, { onConflict: "module_id" });
      if (error) throw error;

      const affectedModuleIds = affectedRows.map(({ dbRow }) => Number(dbRow.module_id));
      const { data: readBackRows, error: readBackError } = await supabase
        .from("module_editor_state")
        .select("module_id, module_data")
        .in("module_id", affectedModuleIds)
        .order("module_id", { ascending: true });
      if (readBackError) throw readBackError;

      const readBackConfirmations = ((readBackRows as EditorRow[]) ?? []).flatMap((dbRow) => {
        const moduleData = dbRow.module_data as ModuleData;
        const dbExercices = Array.isArray(moduleData?.exercices) ? moduleData.exercices : [];
        return dbExercices.flatMap((dbExo) => {
          const matchingEditorExo = exercices.find((editedExo) => sameExercise(editedExo, dbExo));
          if (!matchingEditorExo) return [];
          return (dbExo.questions ?? [])
            .filter((dbQuestion) => (matchingEditorExo.questions ?? []).some((q) => sameQuestion(q, dbQuestion)))
            .map((dbQuestion) => ({
              moduleId: Number(dbRow.module_id),
              exerciceId: dbExo.id,
              questionId: Number(dbQuestion.id),
              enonce: dbQuestion.enonce,
              choix: dbQuestion.choix ?? [],
              questionAdminLocked: dbQuestion.admin_locked === true,
            }));
        });
      });

      const missingLock = readBackConfirmations.find(
        (item) => !item.questionAdminLocked || item.choix.some((choice) => choice.admin_locked !== true),
      );
      if (missingLock) {
        throw new Error(`Écriture non confirmée pour module ${missingLock.moduleId}, Q${missingLock.questionId}`);
      }

      toast.success(`Réponses verrouillées sur ${affectedRows.length} module(s) ✅`);
      await loadModule(moduleId, false);
      setConfirmations(readBackConfirmations);
    } catch (err: any) {
      console.error("[CorrecteurReponses] save error", err);
      toast.error(err?.message || "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const totalQuestions = exercices.reduce(
    (acc, e) => acc + (e.questions?.length || 0),
    0,
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Correcteur de réponses — verrouillage permanent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette page lit directement la base de données et écrit chaque
            réponse avec le flag <code>admin_locked: true</code>. Toutes les
            fonctions de merge / rehydration ignorent ces questions et
            n'écraseront plus jamais leurs <code>choix.correct</code>.
          </p>

          <div className="space-y-2">
            <Label>Module</Label>
            <Select
              value={moduleId != null ? String(moduleId) : ""}
              onValueChange={(v) => setModuleId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un module…" />
              </SelectTrigger>
              <SelectContent>
                {sortedModules.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    [{m.id}] {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {moduleId != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {loading
                  ? "Chargement…"
                  : `${exercices.length} exercice(s) — ${totalQuestions} question(s)`}
              </span>
              <Button
                onClick={handleSave}
                disabled={saving || loading || exercices.length === 0}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Verrouiller & enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement du module…
        </div>
      )}

      {!loading &&
        exercices.map((exo) => (
          <Card key={exo.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span>
                  Exercice [{exo.id}] — {exo.titre}
                </span>
                {exo.sousTitre && (
                  <Badge variant="secondary">{exo.sousTitre}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(exo.questions ?? []).map((q) => {
                const locked = q.admin_locked === true;
                return (
                  <div
                    key={q.id}
                    className="border border-border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Q#{q.id}
                      </span>
                      {locked && (
                        <Badge className="gap-1 bg-green-600 hover:bg-green-600">
                          <Lock className="w-3 h-3" /> Verrouillé
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Énoncé</Label>
                      <Textarea
                        value={q.enonce ?? ""}
                        onChange={(e) =>
                          updateQuestionEnonce(exo.id, q.id, e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Choix (cocher = correct)</Label>
                      {(q.choix ?? []).map((c, idx) => (
                        <div
                          key={`${q.id}-${idx}`}
                          className="flex items-start gap-3 p-2 rounded-md bg-muted/40"
                        >
                          <Checkbox
                            checked={c.correct === true}
                            onCheckedChange={(v) =>
                              updateChoix(exo.id, q.id, idx, {
                                correct: v === true,
                              })
                            }
                            className="mt-2"
                          />
                          <div className="w-8 pt-1 font-mono text-sm text-muted-foreground">
                            {c.lettre}
                          </div>
                          <Input
                            value={c.texte ?? ""}
                            onChange={(e) =>
                              updateChoix(exo.id, q.id, idx, {
                                texte: e.target.value,
                              })
                            }
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(exo.questions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Aucune question dans cet exercice.
                </p>
              )}
            </CardContent>
          </Card>
        ))}

      {!loading && confirmations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Confirmation DB
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {confirmations.map((item) => (
              <div key={`${item.moduleId}-${item.exerciceId}-${item.questionId}`} className="border border-border rounded-lg p-3 text-sm">
                <div className="font-medium">
                  Module {item.moduleId} — Exercice {item.exerciceId} — Q{item.questionId}
                </div>
                <div className="text-muted-foreground mb-2">admin_locked question : {String(item.questionAdminLocked)}</div>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(item.choix, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && moduleId != null && exercices.length === 0 && row && (
        <p className="text-sm text-muted-foreground">
          Aucun exercice trouvé dans la sauvegarde DB de ce module.
        </p>
      )}
    </div>
  );
};

export default CorrecteurReponsesPage;
