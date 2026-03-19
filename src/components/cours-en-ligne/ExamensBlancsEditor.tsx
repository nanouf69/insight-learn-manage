import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ChevronDown, ChevronRight, Pencil, Trash2, Plus,
  Save, CheckCircle2, X, Clock, Layers
} from "lucide-react";
import { tousLesExamens, type ExamenBlanc, type Matiere, type Question, type Choix } from "./examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Virtual module_id range for examens blancs: 90000+
// Each exam gets a unique module_id based on its index
export const EXAMEN_BLANC_MODULE_BASE = 90000;

export function getExamenModuleId(examIndex: number): number {
  return EXAMEN_BLANC_MODULE_BASE + examIndex;
}

// Load saved exam overrides from DB
export async function loadSavedExamens(): Promise<ExamenBlanc[]> {
  const examens = JSON.parse(JSON.stringify(tousLesExamens)) as ExamenBlanc[];
  
  try {
    const moduleIds = examens.map((_, i) => EXAMEN_BLANC_MODULE_BASE + i);
    const { data, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data")
      .in("module_id", moduleIds);
    
    if (error || !data || data.length === 0) return examens;
    
    for (const row of data) {
      const idx = row.module_id - EXAMEN_BLANC_MODULE_BASE;
      if (idx >= 0 && idx < examens.length && row.module_data) {
        const saved = row.module_data as unknown as ExamenBlanc;
        if (saved.matieres && Array.isArray(saved.matieres)) {
          examens[idx] = { ...examens[idx], matieres: saved.matieres };
        }
      }
    }
  } catch (err) {
    console.error("[ExamensEditor] Error loading saved exams:", err);
  }
  
  return examens;
}

// ===== ÉDITEUR D'UNE QUESTION =====
function QuestionEditor({
  question,
  onSave,
  onDelete,
  onCancel,
}: {
  question: Question;
  onSave: (q: Question) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [enonce, setEnonce] = useState(question.enonce);
  const [reponseQRC, setReponseQRC] = useState(question.reponseQRC || "");
  const [motsCles, setMotsCles] = useState((question.reponses_possibles || []).join(", "));
  const [choix, setChoix] = useState<Choix[]>(question.choix ? [...question.choix] : []);

  const handleChoixTexte = (i: number, val: string) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, texte: val } : c));
  };
  const handleChoixCorrect = (i: number, val: boolean) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, correct: val } : c));
  };
  const addChoix = () => {
    const lettres = ["A", "B", "C", "D", "E"];
    setChoix(prev => [...prev, { lettre: lettres[prev.length] || String(prev.length + 1), texte: "", correct: false }]);
  };
  const removeChoix = (i: number) => {
    setChoix(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    const updated: Question = {
      ...question,
      enonce,
    };
    if (question?.type === "QRC") {
      updated.reponseQRC = reponseQRC;
      updated.reponses_possibles = motsCles.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      updated.choix = choix;
    }
    onSave(updated);
  };

  return (
    <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={question?.type === "QCM" ? "default" : "secondary"}>
          {question?.type} — Q{question.id}
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="w-3 h-3" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Énoncé */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Énoncé de la question</Label>
        <Textarea
          value={enonce}
          onChange={e => setEnonce(e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>

      {/* QRC */}
      {question?.type === "QRC" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Réponse correcte (affichée en correction)</Label>
            <Textarea
              value={reponseQRC}
              onChange={e => setReponseQRC(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Mots-clés de correction (séparés par des virgules)</Label>
            <Input
              value={motsCles}
              onChange={e => setMotsCles(e.target.value)}
              placeholder="ex: permis de conduire, carte professionnelle"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              La réponse de l'apprenant devra contenir au moins l'un de ces mots-clés pour être validée.
            </p>
          </div>
        </>
      )}

      {/* QCM */}
      {question?.type === "QCM" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Choix de réponses</Label>
          {choix.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-xs font-bold text-muted-foreground">{c.lettre}</span>
              <Input
                value={c.texte}
                onChange={e => handleChoixTexte(i, e.target.value)}
                className="text-sm flex-1"
                placeholder={`Choix ${c.lettre}`}
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="checkbox"
                  checked={!!c.correct}
                  onChange={e => handleChoixCorrect(i, e.target.checked)}
                  className="w-4 h-4"
                  title="Bonne réponse"
                />
                <span className="text-xs text-foreground">✓</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeChoix(i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addChoix} className="gap-1">
            <Plus className="w-3 h-3" />
            Ajouter un choix
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== ÉDITEUR D'UNE MATIÈRE =====
function MatiereEditor({
  matiere,
  onChange,
}: {
  matiere: Matiere;
  onChange: (m: Matiere) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [duree, setDuree] = useState(matiere.duree);
  const [coefficient, setCoefficient] = useState(matiere.coefficient);
  const [noteElim, setNoteElim] = useState(matiere.noteEliminatoire);
  const [noteSur, setNoteSur] = useState(matiere.noteSur);
  const [editingMeta, setEditingMeta] = useState(false);
  const [confirmDeleteQId, setConfirmDeleteQId] = useState<number | null>(null);

  const saveMeta = () => {
    onChange({ ...matiere, duree, coefficient, noteEliminatoire: noteElim, noteSur });
    setEditingMeta(false);
  };

  const questionsSafe = (matiere.questions ?? []).filter(
    (q): q is Question => q != null && q?.type != null,
  );

  const saveQuestion = (updated: Question) => {
    const newQuestions = questionsSafe.map(q => q.id === updated.id ? updated : q);
    onChange({ ...matiere, questions: newQuestions });
    setEditingQId(null);
  };

  const deleteQuestion = (qId: number) => {
    setConfirmDeleteQId(qId);
  };

  const confirmDelete = () => {
    if (confirmDeleteQId === null) return;
    const newQuestions = questionsSafe.filter(q => q.id !== confirmDeleteQId);
    onChange({ ...matiere, questions: newQuestions });
    setEditingQId(null);
    setConfirmDeleteQId(null);
    toast.success("Question supprimée avec succès");
  };

  const addQuestion = (type: "QCM" | "QRC") => {
    const newId = Math.max(0, ...questionsSafe.map(q => q.id)) + 1;
    const newQ: Question = type === "QCM"
      ? { id: newId, type: "QCM", enonce: "Nouvelle question", choix: [
          { lettre: "A", texte: "Choix A", correct: true },
          { lettre: "B", texte: "Choix B" },
        ]}
      : { id: newId, type: "QRC", enonce: "Nouvelle question QRC", reponseQRC: "", reponses_possibles: [] };
    onChange({ ...matiere, questions: [...questionsSafe, newQ] });
    setEditingQId(newId);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* En-tête matière */}
      <div
        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-medium text-sm">{matiere.nom}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {matiere.duree} min
          </span>
          <span>Coeff. {matiere.coefficient}</span>
          <span className="text-destructive">Élim. {matiere.noteEliminatoire}/{matiere.noteSur}</span>
          <span>{questionsSafe.length} questions</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={e => { e.stopPropagation(); setEditingMeta(!editingMeta); setExpanded(true); }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Édition méta */}
      {expanded && editingMeta && (
        <div className="p-4 bg-muted/30 border-b grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Durée (min)</Label>
            <Input type="number" value={duree} onChange={e => setDuree(Number(e.target.value))} className="text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Coefficient</Label>
            <Input type="number" value={coefficient} onChange={e => setCoefficient(Number(e.target.value))} className="text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note éliminatoire</Label>
            <Input type="number" value={noteElim} onChange={e => setNoteElim(Number(e.target.value))} className="text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note sur</Label>
            <Input type="number" value={noteSur} onChange={e => setNoteSur(Number(e.target.value))} className="text-sm h-8" />
          </div>
          <div className="col-span-2 md:col-span-4 flex gap-2">
            <Button size="sm" onClick={saveMeta} className="gap-1">
              <Save className="w-3 h-3" />
              Sauvegarder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingMeta(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Questions */}
      {expanded && (
        <div className="p-4 space-y-3">
          {questionsSafe.map(q => (
            <div key={q.id}>
              {editingQId === q.id ? (
                <QuestionEditor
                  question={q}
                  onSave={saveQuestion}
                  onDelete={() => deleteQuestion(q.id)}
                  onCancel={() => setEditingQId(null)}
                />
              ) : (
                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/20 group transition-colors">
                  <Badge variant={q?.type === "QCM" ? "default" : "secondary"} className="text-xs shrink-0 mt-0.5">
                    {q?.type}
                  </Badge>
                  <p className="text-sm flex-1 text-muted-foreground line-clamp-2">{q.enonce}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                    onClick={() => setEditingQId(q.id)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Ajouter question */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => addQuestion("QCM")} className="gap-1">
              <Plus className="w-3 h-3" />
              Ajouter QCM
            </Button>
            <Button size="sm" variant="outline" onClick={() => addQuestion("QRC")} className="gap-1">
              <Plus className="w-3 h-3" />
              Ajouter QRC
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== COMPOSANT PRINCIPAL =====
export default function ExamensBlancsEditor({ onBack, defaultExamenId }: { onBack: () => void; defaultExamenId?: string | null }) {
  const [examens, setExamens] = useState<ExamenBlanc[]>(
    () => JSON.parse(JSON.stringify(tousLesExamens))
  );
  const [examenSelId, setExamenSelId] = useState<string | null>(defaultExamenId || null);
  const [typeFiltre, setTypeFiltre] = useState<"tous" | "TAXI" | "VTC">("tous");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const examensFiltres = examens.filter(e => typeFiltre === "tous" || e?.type === typeFiltre);
  const examenSel = examens.find(e => e.id === examenSelId) || null;

  const handleMatiereChange = (matiereId: string, updated: Matiere) => {
    setExamens(prev => prev.map(ex => {
      if (ex.id !== examenSelId) return ex;
      return {
        ...ex,
        matieres: ex.matieres.map(m => m.id === matiereId ? updated : m),
      };
    }));
  };

  // Load saved data from DB on mount
  useEffect(() => {
    loadSavedExamens().then(saved => {
      setExamens(saved);
    });
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save each modified exam to module_editor_state
      const promises = examens.map((ex, i) => {
        const moduleId = EXAMEN_BLANC_MODULE_BASE + i;
        return supabase.from("module_editor_state").upsert(
          [{
            module_id: moduleId,
            module_data: ex as any,
            deleted_cours: [] as any,
            deleted_exercices: [] as any,
            updated_at: new Date().toISOString(),
          }],
          { onConflict: "module_id" }
        );
      });
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error("[ExamensEditor] Save errors:", errors.map(e => e.error));
        toast.error("Erreur lors de la sauvegarde de certains examens");
      } else {
        setSaved(true);
        toast.success("Examens blancs sauvegardés ! Les élèves verront les modifications.");
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error("[ExamensEditor] Save failed:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "⚠️ Réinitialiser tous les examens blancs ?\n\nCela supprimera toutes vos modifications sauvegardées en base et restaurera les questions d'origine.\n\nCette action est irréversible."
    );
    if (!confirmed) return;

    try {
      const moduleIds = tousLesExamens.map((_, i) => EXAMEN_BLANC_MODULE_BASE + i);
      const { error } = await supabase
        .from("module_editor_state")
        .delete()
        .in("module_id", moduleIds);

      if (error) {
        console.error("[ExamensEditor] Reset DB error:", error);
        toast.error("Erreur lors de la réinitialisation en base");
        return;
      }

      setExamens(JSON.parse(JSON.stringify(tousLesExamens)));
      toast.success("Examens blancs réinitialisés aux valeurs d'origine");
    } catch (err) {
      console.error("[ExamensEditor] Reset failed:", err);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Éditeur d'examens blancs
            </h2>
            <p className="text-xs text-muted-foreground">Modifiez les questions, réponses, points et durées</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSaveAll} className="gap-2">
            {saved ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Save className="w-4 h-4" />}
            {saved ? "Sauvegardé !" : "Sauvegarder tout"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - liste des examens */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex gap-1">
            {(["tous", "TAXI", "VTC"] as const).map(t => (
              <Button
                key={t}
                size="sm"
                variant={typeFiltre === t ? "default" : "outline"}
                onClick={() => setTypeFiltre(t)}
                className="text-xs flex-1"
              >
                {t === "tous" ? "Tous" : t}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            {examensFiltres.map(ex => {
              const isBilan = ex.id.startsWith("bilan-");
              return (
                <button
                  key={ex.id}
                  onClick={() => setExamenSelId(ex.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    examenSelId === ex.id
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={ex?.type === "TAXI" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ex?.type}
                      </Badge>
                      {isBilan && (
                        <Badge className="text-xs bg-primary text-primary-foreground">BILAN</Badge>
                      )}
                    </div>
                    {!isBilan && <span className="text-xs text-muted-foreground">N°{ex.numero}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{ex.titre}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ex.matieres.reduce((acc, m) => acc + m.questions.length, 0)} questions · {isBilan ? "sans chrono" : `${ex.matieres.reduce((acc, m) => acc + m.duree, 0)}min`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Éditeur de l'examen sélectionné */}
        <div className="lg:col-span-3">
          {!examenSel ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez un examen dans la liste pour l'éditer</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">{examenSel.titre}</h3>
                <Badge variant={examenSel?.type === "TAXI" ? "default" : "secondary"}>
                  {examenSel?.type} — N°{examenSel.numero}
                </Badge>
              </div>

              {examenSel.matieres.map(m => (
                <MatiereEditor
                  key={m.id}
                  matiere={m}
                  onChange={updated => handleMatiereChange(m.id, updated)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
