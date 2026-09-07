import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, CheckCircle2, Edit2, Save, X, Plus, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toggleCorrect as toggleCorrectUtil, validateQuestionEdit, type QuizChoice as UtilQuizChoice } from "./quiz-editor-utils";

interface QuizChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface QuizQuestion {
  id: number;
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

interface Override {
  quiz_id: string;
  section_id: number;
  question_id: number;
  enonce: string;
  choix: QuizChoice[];
  updated_at?: string;
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
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEnonce, setEditEnonce] = useState("");
  const [editChoix, setEditChoix] = useState<QuizChoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [canonicalQuestions, setCanonicalQuestions] = useState<any[]>([]);

  // Guard: ne pas charger ni permettre d'écrire si fournisseurId est vide
  const canOperate = !!fournisseurId;

  // Une seule lecture : toutes les vues consomment exactement les mêmes lignes
  // canoniques, identifiées par question_id UUID et alias numérique historique.
  useEffect(() => {
    if (!fournisseurToken) return;
    let cancelled = false;
    async function loadCanonical() {
      const { data, error } = await supabase.rpc("get_canonical_quiz_questions", {
        p_quiz_id: quizId,
        p_fournisseur_token: fournisseurToken,
      });
      if (!cancelled && !error) setCanonicalQuestions((data ?? []) as any[]);
    }
    void loadCanonical();
    const channel = supabase.channel(`canonical-quiz-${quizId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_questions", filter: `quiz_id=eq.${quizId}` }, () => void loadCanonical())
      .subscribe();
    const onFocus = () => void loadCanonical();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(loadCanonical, 15000);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); window.clearInterval(interval); supabase.removeChannel(channel); };
  }, [quizId, fournisseurToken]);

  const sections = useMemo(() => sourceSections.map(section => {
    const rows = canonicalQuestions
      .filter(row => Number(row.section_id) === Number(section.id) && row.active)
      .sort((a, b) => Number(a.position) - Number(b.position));
    return rows.length ? { ...section, questions: rows.map(row => ({
      id: Number(row.legacy_question_id),
      question_id: row.question_id,
      enonce: row.enonce,
      choix: row.choix as QuizChoice[],
      _editedAt: row.updated_at,
      manually_edited: true,
    })) } : section;
  }), [sourceSections, canonicalQuestions]);


  const toggle = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isDeleted = (_sectionId: number, _questionId: number): boolean => false;

  const getQuestion = (_sectionId: number, q: QuizQuestion): QuizQuestion => q;

  const deleteQuestion = async (sectionId: number, questionId: number) => {
    if (!canOperate) return;
    setSaving(true);
    try {
      const current = sections.find(s => s.id === sectionId)?.questions?.find(q => q.id === questionId);
      const { error } = await supabase.rpc("save_canonical_quiz_question", {
        p_fournisseur_token: fournisseurToken, p_quiz_id: quizId, p_section_id: sectionId,
        p_legacy_question_id: questionId, p_position: questionId, p_enonce: current?.enonce ?? "",
        p_choix: (current?.choix ?? []) as any, p_active: false,
      });
      if (error) throw error;
      toast.success("Question supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
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
      const { error } = await supabase.rpc("save_canonical_quiz_question", {
        p_fournisseur_token: fournisseurToken, p_quiz_id: quizId, p_section_id: sectionId,
        p_legacy_question_id: questionId, p_position: currentIndex + 1, p_enonce: editEnonce,
        p_choix: editChoix as any, p_active: true,
      });

      if (error) throw error;

      setEditingKey(null);
      toast.success("Question modifiée avec succès");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
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

  const resetToOriginal = async (sectionId: number, questionId: number) => {
    const question = sourceSections.find(s => s.id === sectionId)?.questions?.find(q => q.id === questionId);
    if (!question) return;
    const { error } = await supabase.rpc("save_canonical_quiz_question", {
      p_fournisseur_token: fournisseurToken, p_quiz_id: quizId, p_section_id: sectionId,
      p_legacy_question_id: questionId, p_position: questionId, p_enonce: question.enonce,
      p_choix: question.choix as any, p_active: true,
    });
    if (!error) toast.success("Question restaurée");
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
                          {editable && (
                            <Button size="sm" variant="ghost" className="text-xs shrink-0 ml-2" onClick={() => resetToOriginal(section.id, q.id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Restaurer
                            </Button>
                          )}
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
                              {isOverridden && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600" onClick={() => resetToOriginal(section.id, q.id)} title="Restaurer l'original">
                                  <X className="w-3.5 h-3.5" />
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
