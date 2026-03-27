import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, CheckCircle2, Edit2, Save, X, Plus, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuizChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface QuizQuestion {
  id: number;
  enonce: string;
  choix: QuizChoice[];
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
}

interface Props {
  sections: QuizSection[];
  title: string;
  icon?: string;
  quizId: string;
  fournisseurId: string;
  editable?: boolean;
}

export function EditableQuizViewer({ sections, title, icon = "📝", quizId, fournisseurId, editable = true }: Props) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEnonce, setEditEnonce] = useState("");
  const [editChoix, setEditChoix] = useState<QuizChoice[]>([]);
  const [saving, setSaving] = useState(false);

  // Load overrides from DB
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("quiz_questions_overrides")
        .select("*")
        .eq("fournisseur_id", fournisseurId)
        .eq("quiz_id", quizId);
      if (data) {
        const map = new Map<string, Override>();
        data.forEach((row: any) => {
          const key = `${row.section_id}-${row.question_id}`;
          map.set(key, {
            quiz_id: row.quiz_id,
            section_id: row.section_id,
            question_id: row.question_id,
            enonce: row.enonce,
            choix: row.choix as QuizChoice[],
          });
        });
        setOverrides(map);
      }
    }
    load();
  }, [fournisseurId, quizId]);

  const toggle = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isDeleted = (sectionId: number, questionId: number): boolean => {
    const key = `${sectionId}-${questionId}`;
    const override = overrides.get(key);
    return override?.enonce === "__DELETED__";
  };

  const getQuestion = (sectionId: number, q: QuizQuestion): QuizQuestion => {
    const key = `${sectionId}-${q.id}`;
    const override = overrides.get(key);
    if (override && override.enonce !== "__DELETED__") {
      return { id: q.id, enonce: override.enonce, choix: override.choix };
    }
    return q;
  };

  const deleteQuestion = async (sectionId: number, questionId: number) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("quiz_questions_overrides")
        .upsert({
          fournisseur_id: fournisseurId,
          quiz_id: quizId,
          section_id: sectionId,
          question_id: questionId,
          enonce: "__DELETED__",
          choix: [] as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: "fournisseur_id,quiz_id,section_id,question_id" });
      if (error) throw error;
      const key = `${sectionId}-${questionId}`;
      setOverrides(prev => {
        const next = new Map(prev);
        next.set(key, { quiz_id: quizId, section_id: sectionId, question_id: questionId, enonce: "__DELETED__", choix: [] });
        return next;
      });
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
    setSaving(true);
    try {
      const { error } = await supabase
        .from("quiz_questions_overrides")
        .upsert({
          fournisseur_id: fournisseurId,
          quiz_id: quizId,
          section_id: sectionId,
          question_id: questionId,
          enonce: editEnonce,
          choix: editChoix as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: "fournisseur_id,quiz_id,section_id,question_id" });

      if (error) throw error;

      const key = `${sectionId}-${questionId}`;
      setOverrides(prev => {
        const next = new Map(prev);
        next.set(key, { quiz_id: quizId, section_id: sectionId, question_id: questionId, enonce: editEnonce, choix: editChoix });
        return next;
      });
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
    setEditChoix(prev => prev.map((c, i) => ({ ...c, correct: i === index ? !c.correct : c.correct })));
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
    const key = `${sectionId}-${questionId}`;
    const { error } = await supabase
      .from("quiz_questions_overrides")
      .delete()
      .eq("fournisseur_id", fournisseurId)
      .eq("quiz_id", quizId)
      .eq("section_id", sectionId)
      .eq("question_id", questionId);

    if (!error) {
      setOverrides(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      toast.success("Question restaurée à l'original");
    }
  };

  const totalQ = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  const overrideCount = overrides.size;

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
                    const isOverridden = overrides.has(key);

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

                    return (
                      <div key={q.id} className={`space-y-1.5 group ${isOverridden ? "pl-3 border-l-2 border-amber-400" : ""}`}>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium flex-1">
                            <span className="text-muted-foreground mr-1">{qi + 1}.</span>
                            {actual.enonce}
                            {isOverridden && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">modifiée</span>}
                          </p>
                          {editable && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(section.id, q)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteQuestion(section.id, q.id)} title="Supprimer la question">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
