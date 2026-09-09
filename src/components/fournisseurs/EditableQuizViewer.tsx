import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, CheckCircle2, Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toggleCorrect as toggleCorrectUtil, validateQuestionEdit, type QuizChoice as UtilQuizChoice } from "./quiz-editor-utils";
import { applyCanonicalRowsToSections } from "./canonical-quiz-sections";

interface QuizChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface QuizQuestion {
  id: number;
  question_id?: string;
  enonce: string;
  choix: QuizChoice[];
  _editedAt?: string;
  manually_edited?: boolean;
}

interface QuizSection {
  id: number;
  titre: string;
  sousTitre?: string;
  questions?: QuizQuestion[];
}

interface Props {
  sections: QuizSection[];
  title: string;
  icon?: string;
  quizId: string;
  fournisseurId: string;
  fournisseurToken: string;
  editable?: boolean;
}

export function EditableQuizViewer({ sections: sourceSections, title, icon = "📝", quizId, fournisseurId, fournisseurToken, editable = true }: Props) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEnonce, setEditEnonce] = useState("");
  const [editChoix, setEditChoix] = useState<QuizChoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [canonicalQuestions, setCanonicalQuestions] = useState<any[]>([]);
  const [canonicalLoaded, setCanonicalLoaded] = useState(false);

  // Guard: ne pas charger ni permettre d'écrire si fournisseurId est vide
  const canOperate = !!fournisseurId;

  // Une seule lecture : toutes les vues consomment exactement les mêmes lignes
  // canoniques, identifiées par question_id UUID et alias numérique historique.
  const fetchCanonicalRows = useCallback(async (): Promise<any[]> => {
    const { data, error } = await supabase.functions.invoke("fournisseur-portal-data", {
      body: { action: "quiz_questions", token: fournisseurToken, quiz_id: quizId },
    });
    if (error) throw error;
    return (data?.data ?? []) as any[];
  }, [fournisseurToken, quizId]);

  useEffect(() => {
    if (!fournisseurToken) return;
    let cancelled = false;
    async function loadCanonical() {
      try {
        const rows = await fetchCanonicalRows();
        if (!cancelled) {
          setCanonicalQuestions(rows);
          setCanonicalLoaded(true);
        }
      } catch {
        /* lecture réessayée au prochain événement */
      }
    }
    void loadCanonical();
    const channel = supabase.channel(`canonical-quiz-${quizId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_questions", filter: `quiz_id=eq.${quizId}` }, () => void loadCanonical())
      .subscribe();
    const onFocus = () => void loadCanonical();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); supabase.removeChannel(channel); };
  }, [quizId, fournisseurToken, fetchCanonicalRows]);


  const sections = useMemo(
    () => applyCanonicalRowsToSections(
      sourceSections,
      canonicalQuestions,
      canonicalLoaded
        ? new Set(sourceSections.map((section) => Number(section.id)))
        : new Set<number>(),
    ),
    [sourceSections, canonicalQuestions, canonicalLoaded],
  );


  const toggle = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isDeleted = (_sectionId: number, _questionId: number): boolean => false;

  const getQuestion = (_sectionId: number, q: QuizQuestion): QuizQuestion => q;

  const applyCanonicalRow = (row: any) => {
    if (!row?.question_id) return;
    setCanonicalQuestions(prev => (
      prev.some(r => r.question_id === row.question_id)
        ? prev.map(r => (r.question_id === row.question_id ? row : r))
        : [...prev, row]
    ));
  };

  /**
   * Écrit la version canonique. En cas de conflit P0409, on ne contourne pas la
   * protection : on relit la dernière version en base, on met l'éditeur à jour,
   * puis on rejoue uniquement l'action que l'utilisateur vient d'effectuer.
   * Une question désactivée en base n'est jamais réactivée automatiquement.
   */
  const saveCanonicalQuestion = async (payload: {
    section_id: number; legacy_question_id: number; position: number;
    enonce: string; choix: any[]; active: boolean;
  }): Promise<any> => {
    const send = async (expected: string | null) => {
      const { data, error } = await supabase.functions.invoke("fournisseur-portal-data", {
        body: { action: "save_quiz_question", token: fournisseurToken, quiz_id: quizId, ...payload, expected_updated_at: expected },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data;
    };
    const matches = (row: any) =>
      Number(row.section_id) === payload.section_id && Number(row.legacy_question_id) === payload.legacy_question_id;

    try {
      return await send(canonicalQuestions.find(matches)?.updated_at ?? null);
    } catch (conflictError) {
      if (!isStaleCanonicalQuestionError(conflictError)) throw conflictError;

      const fresh = await fetchCanonicalRows();
      setCanonicalQuestions(fresh);
      setCanonicalLoaded(true);
      const freshRow = fresh.find(matches);

      if (!freshRow) return await send(null);
      if (!freshRow.active) {
        if (!payload.active) return freshRow; // suppression déjà acquise en base
        throw new Error("canonical_question_deleted");
      }
      return await send(freshRow.updated_at);
    }
  };

  const deleteQuestion = async (sectionId: number, questionId: number) => {
    if (!canOperate) return;
    setSaving(true);
    try {
      const current = sections.find(s => s.id === sectionId)?.questions?.find(q => q.id === questionId);
      const saved = await saveCanonicalQuestion({
        section_id: sectionId, legacy_question_id: questionId, position: questionId,
        enonce: current?.enonce ?? "", choix: current?.choix ?? [], active: false,
      });
      applyCanonicalRow(saved);
      toast.success("Question supprimée");
    } catch (error) {
      console.error(error);
      toast.error("Suppression impossible : la question a été modifiée en base. Dernière version affichée.");
    } finally {
      setSaving(false);
    }
  };


  const startEdit = (sectionId: number, q: QuizQuestion) => {
    const actual = getQuestion(sectionId, q);
    const key = `${sectionId}-${q.id}`;
    setEditingKey(key);
    setEditEnonce(actual.enonce);
    setEditChoix(actual.choix.map(c => ({ ...c })));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditEnonce("");
    setEditChoix([]);
  };

  const saveEdit = async (sectionId: number, questionId: number) => {
    if (!canOperate) return;
    const validationError = validateQuestionEdit(editEnonce, editChoix as UtilQuizChoice[]);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const currentIndex = sections.find(s => s.id === sectionId)?.questions?.findIndex(q => q.id === questionId) ?? -1;
      const saved = await saveCanonicalQuestion({
        section_id: sectionId, legacy_question_id: questionId, position: currentIndex + 1,
        enonce: editEnonce, choix: editChoix, active: true,
      });
      applyCanonicalRow(saved);

      setEditingKey(null);
      toast.success("Question modifiée avec succès");
    } catch (err) {
      console.error(err);
      const message = String((err as Error)?.message ?? "");
      toast.error(
        message.includes("canonical_question_deleted")
          ? "Cette question a été supprimée en base : elle ne peut plus être modifiée."
          : "Modification impossible. La dernière version enregistrée est affichée.",
      );
    } finally {
      setSaving(false);
    }

  };

  const toggleCorrect = (index: number) => {
    setEditChoix(prev => toggleCorrectUtil(prev as UtilQuizChoice[], index));
  };

  const updateChoixTexte = (index: number, texte: string) => {
    setEditChoix(prev => prev.map((c, i) => i === index ? { ...c, texte } : c));
  };

  const addChoix = () => {
    const letters = "ABCDEFGH";
    const nextLetter = letters[editChoix.length] || String(editChoix.length + 1);
    setEditChoix(prev => [...prev, { lettre: nextLetter, texte: "", correct: false }]);
  };

  const removeChoix = (index: number) => {
    if (editChoix.length <= 2) return;
    setEditChoix(prev => prev.filter((_, i) => i !== index));
  };

  const totalQ = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  const overrideCount = canonicalQuestions.filter(q => q.source === "fournisseur").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{icon}</span> {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {totalQ} questions
            {overrideCount > 0 && (
              <span className="ml-2 text-amber-600">• {overrideCount} modifiée{overrideCount > 1 ? "s" : ""}</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map(section => {
          const isOpen = openSections.has(section.id);
          const qCount = section.questions?.length || 0;
          return (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{section.titre}</p>
                  {section.sousTitre && <p className="text-xs text-muted-foreground mt-0.5">{section.sousTitre}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{qCount} Q</span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {isOpen && section.questions && (
                <div className="border-t px-4 py-3 space-y-4 bg-muted/10">
                  {section.questions.map((q, qi) => {
                    const key = `${section.id}-${q.id}`;
                    const deleted = isDeleted(section.id, q.id);

                    if (deleted) {
                      return (
                        <div key={q.id} className="flex items-center justify-between px-3 py-2 rounded bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-muted-foreground line-through">
                            <span className="mr-1">Q{q.id}.</span>{q.enonce}
                          </p>
                        </div>
                      );
                    }

                    const isEditing = editingKey === key;
                    const actual = getQuestion(section.id, q);
                    const isOverridden = canonicalQuestions.some(row => Number(row.section_id) === section.id && Number(row.legacy_question_id) === q.id && row.source === "fournisseur");

                    if (isEditing) {
                      return (
                        <div key={q.id} className="space-y-3 p-4 border-2 border-primary/30 rounded-lg bg-background">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Question Q{q.id}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                <X className="w-4 h-4" />
                              </Button>
                              <Button size="sm" onClick={() => saveEdit(section.id, q.id)} disabled={saving}>
                                <Save className="w-4 h-4 mr-1" />
                                {saving ? "..." : "Enregistrer"}
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={editEnonce}
                            onChange={e => setEditEnonce(e.target.value)}
                            placeholder="Énoncé de la question"
                            className="text-sm"
                            rows={2}
                          />
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Choix (cliquez ✓ pour marquer la bonne réponse) :</p>
                            {editChoix.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleCorrect(ci)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                                    c.correct ? "border-green-500 bg-green-50 text-green-700" : "border-muted-foreground/30 text-muted-foreground/50 hover:border-green-300"
                                  }`}
                                >
                                  {c.correct ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{c.lettre}</span>}
                                </button>
                                <Input
                                  value={c.texte}
                                  onChange={e => updateChoixTexte(ci, e.target.value)}
                                  placeholder={`Choix ${c.lettre}`}
                                  className="text-sm flex-1"
                                />
                                {editChoix.length > 2 && (
                                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => removeChoix(ci)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {editChoix.length < 6 && (
                              <Button size="sm" variant="outline" onClick={addChoix} className="text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Ajouter un choix
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const deleteKey = `${section.id}-${q.id}`;
                    const isConfirmingDelete = confirmDeleteKey === deleteKey;

                    return (
                      <div key={q.id} className={`space-y-1.5 group ${isOverridden ? "pl-3 border-l-2 border-amber-400" : ""}`}>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium flex-1">
                            <span className="text-muted-foreground mr-1">Q{q.id}.</span>
                            {actual.enonce}
                            {isOverridden && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">modifiée</span>}
                          </p>
                          {editable && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(section.id, q)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              {isConfirmingDelete ? (
                                <>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => { deleteQuestion(section.id, q.id); setConfirmDeleteKey(null); }} disabled={saving}>
                                    Confirmer
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setConfirmDeleteKey(null)}>
                                    Annuler
                                  </Button>
                                </>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteKey(deleteKey)} title="Supprimer la question">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid gap-1 pl-4">
                          {actual.choix.map(c => (
                            <div
                              key={c.lettre}
                              className={`flex items-start gap-2 text-sm px-2 py-1 rounded ${
                                c.correct
                                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {c.correct && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                              <span>
                                <strong>{c.lettre}.</strong> {c.texte}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
