import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Save, RotateCcw, CheckSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";
import { normalizeNoteSur20, computeAdmisForMatiere } from "./examens-blancs-utils";

// ---------- Types ----------

interface ApprenantInfo {
  id: string;
  nom: string;
  prenom: string;
}

interface QcmRow {
  resultId: string;
  reponseId: string | null;
  apprenant: ApprenantInfo;
  quizId: string;
  quizTitre: string;
  matiereId: string;
  matiereNom: string;
  // Map questionId → selected letters
  reponses: Record<number, string[]>;
  scoreObtenu: number;
  scoreMax: number;
  noteSur20: number;
  completedAt: string;
}

// ---------- Helpers ----------

function safeRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function safeStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x ?? ""));
  return [];
}

function parseReponses(raw: unknown): Record<number, string[]> {
  const obj = safeRecord(raw);
  const result: Record<number, string[]> = {};
  for (const [k, v] of Object.entries(obj)) {
    const numKey = Number(k);
    if (!Number.isFinite(numKey)) continue;
    result[numKey] = safeStringArray(v);
  }
  return result;
}

// ---------- Component ----------

const CorrectionQCMTab = () => {
  const [examens, setExamens] = useState<ExamenBlanc[]>([]);
  const [selectedExamenId, setSelectedExamenId] = useState<string>("all");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<QcmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<QcmRow | null>(null);
  const [editedReponses, setEditedReponses] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);

  // Load examens
  useEffect(() => {
    (async () => {
      const saved = await loadSavedExamens();
      setExamens(saved);
    })();
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load quiz results
      let query = supabase
        .from("apprenant_quiz_results")
        .select("*")
        .eq("quiz_type", "examen_blanc")
        .order("completed_at", { ascending: false });

      if (selectedExamenId !== "all") {
        query = query.eq("quiz_id", selectedExamenId);
      }
      if (selectedMatiereId !== "all") {
        query = query.eq("matiere_id", selectedMatiereId);
      }

      const { data: results, error: resultsError } = await query;
      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Get unique apprenant IDs
      const apprenantIds = [...new Set(results.map(r => r.apprenant_id))];

      // Load apprenant names
      const { data: apprenants } = await supabase
        .from("apprenants")
        .select("id, nom, prenom")
        .in("id", apprenantIds);

      const appMap = new Map<string, ApprenantInfo>();
      (apprenants ?? []).forEach(a => appMap.set(a.id, { id: a.id, nom: a.nom, prenom: a.prenom }));

      // Load reponses_apprenants for these results
      const exerciceIds = [...new Set(results.map(r => {
        const mId = r.matiere_id ?? "";
        return `eb_${r.quiz_id}_${mId}`;
      }))];

      const { data: repData } = await supabase
        .from("reponses_apprenants")
        .select("*")
        .in("apprenant_id", apprenantIds)
        .eq("exercice_type", "examen_blanc");

      // Build lookup: apprenant_id + exercice_id → reponses row
      const repMap = new Map<string, { id: string; reponses: unknown }>();
      (repData ?? []).forEach(r => {
        repMap.set(`${r.apprenant_id}__${r.exercice_id}`, { id: r.id, reponses: r.reponses });
      });

      // Build rows - only QCM questions
      const qcmRows: QcmRow[] = [];

      for (const result of results) {
        const app = appMap.get(result.apprenant_id) ?? { id: result.apprenant_id, nom: "Inconnu", prenom: "" };
        const matiereId = result.matiere_id ?? "";
        const exerciceId = `eb_${result.quiz_id}_${matiereId}`;
        const repEntry = repMap.get(`${result.apprenant_id}__${exerciceId}`);

        // Find exam definition to check if matiere has QCM questions
        const examen = examens.find(e => e.id === result.quiz_id);
        const matiere = examen?.matieres.find(m => m.id === matiereId);
        if (!matiere) continue;

        const hasQCM = matiere.questions.some(q => q.type === "QCM");
        if (!hasQCM) continue;

        const reponses = repEntry ? parseReponses(safeRecord(repEntry.reponses)) : {};

        qcmRows.push({
          resultId: result.id,
          reponseId: repEntry?.id ?? null,
          apprenant: app,
          quizId: result.quiz_id,
          quizTitre: result.quiz_titre,
          matiereId,
          matiereNom: result.matiere_nom ?? matiereId,
          reponses,
          scoreObtenu: Number(result.score_obtenu) || 0,
          scoreMax: Number(result.score_max) || 0,
          noteSur20: Number(result.note_sur_20) || 0,
          completedAt: result.completed_at,
        });
      }

      setRows(qcmRows);
    } catch (err: any) {
      console.error("Erreur chargement correction QCM:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [selectedExamenId, selectedMatiereId, examens]);

  useEffect(() => {
    if (examens.length > 0) loadData();
  }, [loadData, examens]);

  // Get available matieres for selected exam
  const availableMatieres = (() => {
    if (selectedExamenId === "all") {
      const all = new Map<string, string>();
      examens.forEach(e => e.matieres.forEach(m => {
        if (m.questions.some(q => q.type === "QCM")) {
          all.set(m.id, m.nom);
        }
      }));
      return Array.from(all.entries()).map(([id, nom]) => ({ id, nom }));
    }
    const ex = examens.find(e => e.id === selectedExamenId);
    return (ex?.matieres ?? [])
      .filter(m => m.questions.some(q => q.type === "QCM"))
      .map(m => ({ id: m.id, nom: m.nom }));
  })();

  // Filter rows by search
  const filteredRows = rows.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.apprenant.nom.toLowerCase().includes(q) ||
           r.apprenant.prenom.toLowerCase().includes(q);
  });

  // ---------- Edit mode ----------

  const startEditing = (row: QcmRow) => {
    setEditingRow(row);
    // Deep copy reponses
    const copy: Record<number, string[]> = {};
    for (const [k, v] of Object.entries(row.reponses)) {
      copy[Number(k)] = [...v];
    }
    setEditedReponses(copy);
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditedReponses({});
  };

  const toggleChoice = (questionId: number, lettre: string) => {
    setEditedReponses(prev => {
      const current = prev[questionId] ?? [];
      const next = current.includes(lettre)
        ? current.filter(l => l !== lettre)
        : [...current, lettre];
      return { ...prev, [questionId]: next };
    });
  };

  const saveEdits = async () => {
    if (!editingRow) return;
    setSaving(true);

    try {
      const examen = examens.find(e => e.id === editingRow.quizId);
      const matiere = examen?.matieres.find(m => m.id === editingRow.matiereId);
      if (!matiere) throw new Error("Matière introuvable");

      // Recalculate score for QCM questions
      let totalScore = 0;
      let totalMax = 0;

      for (const q of matiere.questions) {
        const pts = getPointsParQuestion(matiere.id, q.type, matiere);

        if (q.type === "QCM") {
          totalMax += pts;
          const selected = editedReponses[q.id] ?? [];
          const correctLetters = (q.choix ?? []).filter(c => c.correct).map(c => c.lettre);
          const isCorrect = selected.length === correctLetters.length &&
            correctLetters.every(l => selected.includes(l));
          if (isCorrect) totalScore += pts;
        } else {
          // QRC: keep existing score from details
          totalMax += pts;
          const details = safeRecord(
            (await supabase
              .from("apprenant_quiz_results")
              .select("details")
              .eq("id", editingRow.resultId)
              .maybeSingle()
            ).data?.details
          );
          const corrections = safeRecord(details?.correctionsIA);
          const corr = corrections[String(q.id)];
          if (corr && typeof corr === "object" && "pointsObtenus" in (corr as any)) {
            totalScore += Number((corr as any).pointsObtenus) || 0;
          }
        }
      }

      const noteSur20 = totalMax > 0 ? Number(((totalScore / totalMax) * 20).toFixed(1)) : 0;
      const admis = computeAdmisForMatiere(totalScore, totalMax, matiere.noteEliminatoire, matiere.noteSur);

      // Update reponses_apprenants
      if (editingRow.reponseId) {
        // Merge edited QCM responses with existing data
        const { data: existingRep } = await supabase
          .from("reponses_apprenants")
          .select("reponses")
          .eq("id", editingRow.reponseId)
          .maybeSingle();

        const existing = safeRecord(existingRep?.reponses);
        const merged = { ...existing };
        // Only update QCM question IDs
        for (const q of matiere.questions) {
          if (q.type === "QCM") {
            merged[String(q.id)] = editedReponses[q.id] ?? [];
          }
        }

        await supabase
          .from("reponses_apprenants")
          .update({ reponses: merged as any, updated_at: new Date().toISOString() })
          .eq("id", editingRow.reponseId);
      }

      // Update apprenant_quiz_results
      await supabase
        .from("apprenant_quiz_results")
        .update({
          score_obtenu: totalScore,
          score_max: totalMax,
          note_sur_20: noteSur20,
          reussi: admis,
        })
        .eq("id", editingRow.resultId);

      toast.success(`Score recalculé : ${noteSur20}/20 (${totalScore}/${totalMax})`);
      cancelEditing();
      loadData();
    } catch (err: any) {
      console.error("Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Render ----------

  const getQuestionsForRow = (row: QcmRow): Question[] => {
    const examen = examens.find(e => e.id === row.quizId);
    const matiere = examen?.matieres.find(m => m.id === row.matiereId);
    return (matiere?.questions ?? []).filter(q => q.type === "QCM");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Correction QCM — Examens Blancs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-56">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Examen blanc</label>
              <Select value={selectedExamenId} onValueChange={v => { setSelectedExamenId(v); setSelectedMatiereId("all"); }}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les examens</SelectItem>
                  {examens.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Matière</label>
              <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {availableMatieres.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Apprenant</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground py-4">Chargement...</p>}

          {!loading && filteredRows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Aucun résultat QCM trouvé.</p>
          )}

          {/* Results list */}
          {!loading && filteredRows.map(row => {
            const isEditing = editingRow?.resultId === row.resultId;
            const questions = getQuestionsForRow(row);

            return (
              <Card key={row.resultId} className={`border ${isEditing ? "border-primary ring-1 ring-primary" : ""}`}>
                <CardContent className="pt-4 space-y-3">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{row.apprenant.prenom} {row.apprenant.nom}</span>
                      <Badge variant="outline" className="text-xs">{row.quizTitre}</Badge>
                      <Badge variant="secondary" className="text-xs">{row.matiereNom}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {row.scoreObtenu}/{row.scoreMax} — {row.noteSur20}/20
                      </span>
                      {!isEditing ? (
                        <Button size="sm" variant="outline" onClick={() => startEditing(row)}>
                          Modifier
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={saveEdits} disabled={saving}>
                            <Save className="w-3 h-3 mr-1" />
                            {saving ? "..." : "Sauvegarder"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Questions grid */}
                  <div className="space-y-2">
                    {questions.map(q => {
                      const currentReponses = isEditing
                        ? (editedReponses[q.id] ?? [])
                        : (row.reponses[q.id] ?? []);
                      const correctLetters = (q.choix ?? []).filter(c => c.correct).map(c => c.lettre);
                      const isCorrect = currentReponses.length === correctLetters.length &&
                        correctLetters.every(l => currentReponses.includes(l));

                      return (
                        <div key={q.id} className={`border rounded p-3 text-sm ${isCorrect ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"}`}>
                          <p className="font-medium mb-2 text-foreground">Q{q.id} — {q.enonce.substring(0, 120)}{q.enonce.length > 120 ? "..." : ""}</p>
                          <div className="flex flex-wrap gap-3">
                            {(q.choix ?? []).map(choix => {
                              const isSelected = currentReponses.includes(choix.lettre);
                              const isCorrectChoice = choix.correct === true;

                              return (
                                <label
                                  key={choix.lettre}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-default ${
                                    isSelected && isCorrectChoice
                                      ? "bg-green-100 border-green-400 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                      : isSelected && !isCorrectChoice
                                      ? "bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                      : !isSelected && isCorrectChoice
                                      ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-background border-border text-muted-foreground"
                                  } ${isEditing ? "cursor-pointer hover:opacity-80" : ""}`}
                                >
                                  {isEditing ? (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleChoice(q.id, choix.lettre)}
                                      className="h-3.5 w-3.5"
                                    />
                                  ) : (
                                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${isSelected ? "bg-current" : ""}`}>
                                      {isSelected ? "✓" : ""}
                                    </span>
                                  )}
                                  <span className="font-bold">{choix.lettre})</span>
                                  <span>{choix.texte.substring(0, 60)}{choix.texte.length > 60 ? "..." : ""}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrectionQCMTab;
