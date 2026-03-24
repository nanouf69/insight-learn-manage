import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ChevronDown, ChevronRight, Pencil, Trash2, Plus,
  Save, CheckCircle2, X, Clock, Layers, Loader2
} from "lucide-react";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere, type Question, type Choix } from "./examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Virtual module_id range for examens blancs: 90000+
// Each exam gets a unique module_id based on its index
export const EXAMEN_BLANC_MODULE_BASE = 90000;

const cloneExamens = (examens: ExamenBlanc[]): ExamenBlanc[] =>
  JSON.parse(JSON.stringify(examens)) as ExamenBlanc[];

let lastSuccessfulExamensSnapshot: ExamenBlanc[] | null = null;
const EXAMENS_SNAPSHOT_STORAGE_KEY = "examens_blancs_snapshot_v1";

function readExamensSnapshotFromStorage(): ExamenBlanc[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXAMENS_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamenBlanc[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeExamensSnapshotToStorage(examens: ExamenBlanc[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXAMENS_SNAPSHOT_STORAGE_KEY, JSON.stringify(examens));
  } catch {
    // Ignore quota / storage errors silently
  }
}

export function getExamenModuleId(examIndex: number): number {
  return EXAMEN_BLANC_MODULE_BASE + examIndex;
}

// VTC exams are at indices 0-5, TAXI exams at 6-11 in tousLesExamens
// TAXI exams share their first 5 matières with VTC exams
const VTC_COUNT = 6;
const TAXI_OFFSET = 6;

/**
 * Repair missing `correct` flags on QCM choices by falling back to the
 * original source data when the saved data has lost them.
 */
function repairCorrectFlags(examens: ExamenBlanc[]): void {
  const source = tousLesExamens;
  for (let i = 0; i < examens.length && i < source.length; i++) {
    const ex = examens[i];
    const srcEx = source[i];
    for (let mi = 0; mi < ex.matieres.length && mi < srcEx.matieres.length; mi++) {
      const mat = ex.matieres[mi];
      const srcMat = srcEx.matieres[mi];
      if (mat.id !== srcMat.id) continue;
      const savedCorrectCount = mat.questions.filter(
        q => q?.type === "QCM" && Array.isArray(q.choix) && q.choix.some(c => c.correct === true)
      ).length;
      const srcCorrectCount = srcMat.questions.filter(
        q => q?.type === "QCM" && Array.isArray(q.choix) && q.choix.some(c => c.correct === true)
      ).length;
      // If saved data has significantly fewer correct answers, restore from source
      if (srcCorrectCount > 0 && savedCorrectCount < srcCorrectCount * 0.5) {
        console.log(`[ExamRepair] Restoring correct flags for exam ${ex.id}, matière ${mat.id}: ${savedCorrectCount} → ${srcCorrectCount}`);
        for (const q of mat.questions) {
          if (q?.type !== "QCM" || !Array.isArray(q.choix)) continue;
          const srcQ = srcMat.questions.find(sq => sq.id === q.id);
          if (!srcQ || srcQ?.type !== "QCM" || !Array.isArray(srcQ.choix)) continue;
          for (const c of q.choix) {
            const srcC = srcQ.choix?.find(sc => sc.lettre === c.lettre);
            if (srcC) {
              c.correct = srcC.correct === true ? true : undefined;
            }
          }
        }
      }
    }
  }
}

/**
 * Sync the 5 common matières from VTC exams to TAXI exams.
 * VTC is the source of truth for the common subjects.
 */
function syncVtcTaxiMatieres(examens: ExamenBlanc[]): void {
  for (let n = 0; n < VTC_COUNT; n++) {
    const vtcIdx = n;
    const taxiIdx = TAXI_OFFSET + n;
    if (vtcIdx >= examens.length || taxiIdx >= examens.length) continue;
    const vtcEx = examens[vtcIdx];
    const taxiEx = examens[taxiIdx];
    const vtcCommon = JSON.parse(JSON.stringify(vtcEx.matieres.slice(0, 5))) as Matiere[];
    taxiEx.matieres = [...vtcCommon, ...taxiEx.matieres.slice(5)];
  }
}

// Load saved exam overrides from DB
export async function loadSavedExamens(): Promise<ExamenBlanc[]> {
  if (!lastSuccessfulExamensSnapshot) {
    const cached = readExamensSnapshotFromStorage();
    if (cached) {
      lastSuccessfulExamensSnapshot = cloneExamens(cached);
    }
  }

  const examens = cloneExamens(tousLesExamens);
  
  try {
    const moduleIds = examens.map((_, i) => EXAMEN_BLANC_MODULE_BASE + i);
    const { data, error } = await supabase
      .from("module_editor_state")
      .select("module_id, module_data, updated_at")
      .order("updated_at", { ascending: true })
      .in("module_id", moduleIds);
    
    if (error) {
      console.error("[ExamensEditor] Error loading saved exams:", error);
      if (lastSuccessfulExamensSnapshot) {
        return cloneExamens(lastSuccessfulExamensSnapshot);
      }
      repairCorrectFlags(examens);
      syncVtcTaxiMatieres(examens);
      lastSuccessfulExamensSnapshot = cloneExamens(examens);
      writeExamensSnapshotToStorage(lastSuccessfulExamensSnapshot);
      return examens;
    }

    if (data && data.length > 0) {
      for (const row of data) {
        const idx = row.module_id - EXAMEN_BLANC_MODULE_BASE;
        if (idx >= 0 && idx < examens.length && row.module_data) {
          const saved = row.module_data as unknown as ExamenBlanc;
          if (saved.matieres && Array.isArray(saved.matieres)) {
            // Always preserve texteSupport/texteSource + repair missing QRC keywords from source code (authoritative)
            const sourceMatieres = examens[idx].matieres;
            const mergedMatieres = saved.matieres.map((savedMat) => {
              const sourceMat = sourceMatieres.find(sm => sm.id === savedMat.id);
              if (sourceMat) {
                const sourceQuestions = Array.isArray(sourceMat.questions) ? sourceMat.questions : [];
                const savedQuestions = Array.isArray(savedMat.questions) ? savedMat.questions : [];

                const mergedQuestions = savedQuestions.map((savedQ) => {
                  const sourceQ = sourceQuestions.find((sq) => sq.id === savedQ.id && sq.type === savedQ.type);
                  if (!sourceQ || savedQ.type !== "QRC") return savedQ;

                  const hasSavedKeywords = Array.isArray(savedQ.reponses_possibles) && savedQ.reponses_possibles.length > 0;
                  const sourceKeywords = Array.isArray(sourceQ.reponses_possibles) ? sourceQ.reponses_possibles : [];

                  if (!hasSavedKeywords && sourceKeywords.length > 0) {
                    return { ...savedQ, reponses_possibles: [...sourceKeywords] };
                  }

                  return savedQ;
                });

                const merged = { ...savedMat, questions: mergedQuestions };
                if (sourceMat.texteSupport) merged.texteSupport = sourceMat.texteSupport;
                if (sourceMat.texteSource) merged.texteSource = sourceMat.texteSource;
                return merged;
              }
              return savedMat;
            });
            examens[idx] = { ...examens[idx], matieres: mergedMatieres };
          }
        }
      }
    }
  } catch (err) {
    console.error("[ExamensEditor] Error loading saved exams:", err);
    if (lastSuccessfulExamensSnapshot) {
      return cloneExamens(lastSuccessfulExamensSnapshot);
    }
  }
  
  // Repair any missing correct flags, then sync VTC → TAXI
  repairCorrectFlags(examens);
  syncVtcTaxiMatieres(examens);
  lastSuccessfulExamensSnapshot = cloneExamens(examens);
  writeExamensSnapshotToStorage(lastSuccessfulExamensSnapshot);
  
  return examens;
}

// ===== ÉDITEUR D'UNE QUESTION =====
function QuestionEditor({
  question,
  onSave,
  onDraftChange,
  onDelete,
  onCancel,
}: {
  question: Question;
  onSave: (q: Question) => void;
  onDraftChange: (q: Question) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [enonce, setEnonce] = useState(question.enonce);
  const [reponseQRC, setReponseQRC] = useState(question.reponseQRC || "");
  const [motsCles, setMotsCles] = useState((question.reponses_possibles || []).join(", "));
  const [choix, setChoix] = useState<Choix[]>(question.choix ? [...question.choix] : []);

  const buildUpdatedQuestion = (): Question => {
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

    return updated;
  };

  useEffect(() => {
    onDraftChange(buildUpdatedQuestion());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enonce, reponseQRC, motsCles, choix]);

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
    onSave(buildUpdatedQuestion());
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

  const updateQuestion = (updated: Question, closeEditor: boolean) => {
    const newQuestions = questionsSafe.map(q => q.id === updated.id ? updated : q);
    onChange({ ...matiere, questions: newQuestions });
    if (closeEditor) setEditingQId(null);
  };

  const saveQuestionDraft = (updated: Question) => {
    updateQuestion(updated, false);
  };

  const saveQuestion = (updated: Question) => {
    updateQuestion(updated, true);
  };

  const deleteQuestion = (qId: number) => {
    setConfirmDeleteQId(qId);
  };

  const confirmDelete = () => {
    if (confirmDeleteQId === null) return;
    const newQuestions = questionsSafe
      .filter(q => q.id !== confirmDeleteQId)
      .map((q, i) => ({ ...q, id: i + 1 }));
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
    <>
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
                  onDraftChange={saveQuestionDraft}
                  onDelete={() => deleteQuestion(q.id)}
                  onCancel={() => setEditingQId(null)}
                />
              ) : (
                <div className="border rounded-lg hover:bg-muted/20 group transition-colors p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Badge variant={q?.type === "QCM" ? "default" : "secondary"} className="text-sm shrink-0 mt-0.5 px-2 py-0.5">
                        {q?.type} — Q{q.id}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-base font-medium text-foreground leading-relaxed">{q.enonce}</p>
                        {q.image && (
                          <img src={q.image} alt={`Question ${q.id}`} className="mt-2 max-h-32 rounded border" />
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
                        {getPointsParQuestion(matiere.id, q?.type || "QCM")} pt{getPointsParQuestion(matiere.id, q?.type || "QCM") > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                      onClick={() => setEditingQId(q.id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Réponses affichées sous la question */}
                  {q?.type === "QCM" && q.choix && (
                    <div className="ml-10 space-y-1.5">
                      {q.choix.map((c, ci) => (
                        <div
                          key={ci}
                          className={`flex items-start gap-2 text-base px-3 py-1.5 rounded ${c.correct ? "bg-green-100 text-green-800 font-semibold border border-green-300" : "text-muted-foreground"}`}
                        >
                          <span className="font-bold shrink-0">{c.lettre}.</span>
                          <span>{c.texte}</span>
                          {c.correct && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {q?.type === "QRC" && q.reponseQRC && (
                    <div className="ml-10 px-3 py-2 rounded bg-blue-50 border border-blue-200 text-base text-blue-800">
                      <span className="font-semibold">Réponse : </span>{q.reponseQRC}
                    </div>
                  )}
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

    <AlertDialog open={confirmDeleteQId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteQId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
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
  const [autoSaving, setAutoSaving] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const lastSavedFingerprintRef = useRef("");
  const lastSavedModuleFingerprintsRef = useRef<Record<number, string>>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistChainRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const examensFiltres = examens.filter(e => typeFiltre === "tous" || e?.type === typeFiltre);
  const examenSel = examens.find(e => e.id === examenSelId) || null;

  const persistExamens = async (sourceExamens: ExamenBlanc[], showSuccessToast = false): Promise<boolean> => {
    const snapshot = JSON.parse(JSON.stringify(sourceExamens)) as ExamenBlanc[];

    persistChainRef.current = persistChainRef.current.then(async () => {
    try {
      const synced = JSON.parse(JSON.stringify(snapshot)) as ExamenBlanc[];
      syncVtcTaxiMatieres(synced);

      const now = new Date().toISOString();
      const changedModuleFingerprints: Record<number, string> = {};
      const rows = synced
        .map((ex, i) => {
          const moduleId = EXAMEN_BLANC_MODULE_BASE + i;
          const moduleFingerprint = JSON.stringify(ex.matieres ?? []);
          const hasChanged = lastSavedModuleFingerprintsRef.current[moduleId] !== moduleFingerprint;

          if (!hasChanged) return null;

          changedModuleFingerprints[moduleId] = moduleFingerprint;
          return {
            module_id: moduleId,
            module_data: {
              id: ex.id,
              matieres: ex.matieres,
            } as any,
            deleted_cours: [] as any,
            deleted_exercices: [] as any,
            updated_at: now,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length === 0) {
        lastSavedFingerprintRef.current = JSON.stringify(synced);
        if (showSuccessToast) {
          setSaved(true);
          toast.success("Aucune modification à sauvegarder.");
          setTimeout(() => setSaved(false), 2500);
        }
        return true;
      }

      // Save only changed exams in one batch request
      const { error } = await supabase
        .from("module_editor_state")
        .upsert(rows, { onConflict: "module_id" });

      if (error) {
        console.error("[ExamensEditor] Save error:", error);
        toast.error(`Sauvegarde impossible: ${error.message}`);
        return false;
      }

      lastSavedFingerprintRef.current = JSON.stringify(synced);
      lastSavedModuleFingerprintsRef.current = {
        ...lastSavedModuleFingerprintsRef.current,
        ...changedModuleFingerprints,
      };

      if (showSuccessToast) {
        setSaved(true);
        toast.success("Examens blancs sauvegardés ! Les élèves verront les modifications.");
        setTimeout(() => setSaved(false), 2500);
      }

      return true;
    } catch (err) {
      console.error("[ExamensEditor] Save failed:", err);
      toast.error("Erreur lors de la sauvegarde");
      return false;
    }
    });

    return persistChainRef.current;
  };

  const handleMatiereChange = (matiereId: string, updated: Matiere) => {
    setExamens(prev => {
      const next = prev.map(ex => {
        if (ex.id !== examenSelId) return ex;
        return {
          ...ex,
          matieres: ex.matieres.map(m => m.id === matiereId ? updated : m),
        };
      });
      // After any edit, sync VTC → TAXI common matières
      syncVtcTaxiMatieres(next);
      return next;
    });
  };

  // Load saved data from DB on mount
  useEffect(() => {
    loadSavedExamens().then(loadedExamens => {
      setExamens(loadedExamens);
      lastSavedFingerprintRef.current = JSON.stringify(loadedExamens);
      lastSavedModuleFingerprintsRef.current = loadedExamens.reduce<Record<number, string>>((acc, ex, i) => {
        acc[EXAMEN_BLANC_MODULE_BASE + i] = JSON.stringify(ex.matieres ?? []);
        return acc;
      }, {});
      initialLoadDoneRef.current = true;
    });
  }, []);

  // Auto-save to backend when admin edits answers/questions
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;

    const currentFingerprint = JSON.stringify(examens);
    if (currentFingerprint === lastSavedFingerprintRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      await persistExamens(examens, false);
      setAutoSaving(false);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [examens]);

  const handleSaveAll = async () => {
    setSaving(true);
    await persistExamens(examens, true);
    setSaving(false);
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

      const resetExamens = JSON.parse(JSON.stringify(tousLesExamens)) as ExamenBlanc[];
      setExamens(resetExamens);
      lastSavedFingerprintRef.current = JSON.stringify(resetExamens);
      lastSavedModuleFingerprintsRef.current = resetExamens.reduce<Record<number, string>>((acc, ex, i) => {
        acc[EXAMEN_BLANC_MODULE_BASE + i] = JSON.stringify(ex.matieres ?? []);
        return acc;
      }, {});
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
        <div className="flex items-center gap-2">
          {autoSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sauvegarde auto...
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSaveAll} className="gap-2" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé !" : "Sauvegarder tout"}
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
