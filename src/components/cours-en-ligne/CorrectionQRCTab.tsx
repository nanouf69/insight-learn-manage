import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Pencil, Search, User, FileText, Filter, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { tousLesExamens, getPointsParQuestion, type ExamenBlanc, type Matiere } from "./examens-blancs-data";
import { loadSavedExamens } from "./ExamensBlancsEditor";

interface QrcItem {
  resultId: string;
  apprenantId: string;
  apprenantNom: string;
  apprenantPrenom: string;
  quizTitre: string;
  quizId: string;
  quizType: string;
  matiereId: string;
  matiereNom: string;
  questionId: number;
  enonce: string;
  reponseEleve: string;
  reponseCorrecte: string;
  pointsMax: number;
  pointsObtenus: number | null; // null = pas encore corrigé manuellement
  corrigeManuel: boolean;
  completedAt: string;
  autoScore: number;
  autoExplication: string | null;
  noteSur20: number | null;
  scoreMatiereObtenu: number;
  scoreMatiereMax: number;
  commentaire: string;
}

function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  try { return JSON.stringify(v); } catch { return ""; }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àâäáã]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îïí]/g, "i")
    .replace(/[ôöó]/g, "o")
    .replace(/[ùûüú]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyContainsLocal(text: string, keyword: string): boolean {
  if (text.includes(keyword)) return true;
  if (keyword.length <= 3) return false;
  for (let i = 0; i < keyword.length; i++) {
    const partial = keyword.slice(0, i) + keyword.slice(i + 1);
    if (partial.length >= 3 && text.includes(partial)) return true;
  }
  const words = text.split(" ");
  for (const word of words) {
    if (word.length < 3 || keyword.length < 4) continue;
    if (Math.abs(word.length - keyword.length) <= 2) {
      let ki = 0;
      for (let wi = 0; wi < word.length && ki < keyword.length; wi++) {
        if (word[wi] === keyword[ki]) ki++;
      }
      if (ki >= keyword.length - 1) return true;
    }
  }
  return false;
}

const STOPWORDS = new Set([
  "avec", "dans", "pour", "sans", "dont", "plus", "moins", "etre", "avoir", "faire", "cette", "votre", "vous", "leur", "leurs", "entre", "sous", "aux", "des", "les", "une", "du", "de", "la", "le", "et", "ou", "au", "il", "elle", "ils", "elles", "son", "ses", "sur", "par", "qui",
]);

/** Recompute QRC auto-score from question definition + student response */
function recomputeQrcAutoScore(questionDef: any, reponseEleve: string, pointsMax: number): { autoScore: number; explication: string } {
  if (!questionDef || !reponseEleve.trim()) return { autoScore: 0, explication: "Aucune réponse." };

  const normalizedResponse = normalizeText(reponseEleve);

  // Build expected elements from question definition
  const explicitEntries: string[] = Array.isArray(questionDef.reponses_possibles) ? questionDef.reponses_possibles : [];
  let elements: string[][] = [];

  if (explicitEntries.length > 0) {
    elements = explicitEntries
      .map((entry: string) =>
        Array.from(new Set(safeStr(entry).split("|").map((alt: string) => normalizeText(alt)).filter(Boolean)))
      )
      .filter((alts: string[]) => alts.length > 0);
  }

  if (elements.length === 0) {
    const normalizedExpected = normalizeText(safeStr(questionDef.reponseQRC || ""));
    if (!normalizedExpected) return { autoScore: 0, explication: "Réponse attendue indisponible." };
    const fallbackKeywords = Array.from(new Set(
      normalizedExpected.split(" ").map(w => w.trim()).filter(w => w.length >= 3 && !STOPWORDS.has(w))
    )).slice(0, 12);
    elements = fallbackKeywords.map(kw => [kw]);
  }

  if (elements.length === 0) return { autoScore: 0, explication: "Aucun mot-clé défini." };

  const matched = elements.filter(alternatives =>
    alternatives.some(alt => fuzzyContainsLocal(normalizedResponse, alt))
  ).length;
  const total = elements.length;
  const requiredForFullPoints = total > 3 ? 3 : total <= 2 ? total : Math.ceil(total * 0.8);
  const gotFullPoints = matched >= requiredForFullPoints;
  const points = gotFullPoints
    ? pointsMax
    : Math.floor((matched / requiredForFullPoints) * pointsMax * 2) / 2;

  return {
    autoScore: Math.min(points, pointsMax),
    explication: `Recalcul : ${matched}/${total} élément(s) trouvés.`,
  };
}

const CorrectionQRCTab = () => {
  const [items, setItems] = useState<QrcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [examenMap, setExamenMap] = useState<Record<string, ExamenBlanc>>({});
  const [editingComments, setEditingComments] = useState<Record<string, string>>({});

  const QUICK_COMMENTS = [
    "Précisez !!!",
    "Dire plutôt permis de conduire hors période probatoire",
    "Précisez casier B2 vierge",
    "Mal dit",
    "Attention aux fautes",
    "Réponse incomplète",
    "Hors sujet",
  ];

  // Load examens (source + saved)
  useEffect(() => {
    const load = async () => {
      const saved = await loadSavedExamens();
      const map: Record<string, ExamenBlanc> = {};
      for (const e of tousLesExamens) {
        const s = saved[e.id];
        map[e.id] = s ? { ...e, matieres: e.matieres.map((m, mi) => s.matieres?.[mi] ? { ...m, ...s.matieres[mi], questions: s.matieres[mi].questions || m.questions } : m) } : e;
      }
      setExamenMap(map);
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    if (Object.keys(examenMap).length === 0) return;
    setLoading(true);

    // Fetch all exam_blanc results that have QRC questions
    const { data: results, error } = await supabase
      .from("apprenant_quiz_results")
      .select("id, apprenant_id, quiz_id, quiz_type, quiz_titre, matiere_id, matiere_nom, details, completed_at, score_obtenu, score_max, note_sur_20")
      .in("quiz_type", ["examen_blanc", "bilan"])
      .order("completed_at", { ascending: false });

    if (error || !results) {
      console.error("Erreur chargement résultats:", error);
      setLoading(false);
      return;
    }

    // Fetch apprenant names
    const apprenantIds = [...new Set(results.map((r: any) => r.apprenant_id))];
    const { data: apprenants } = await supabase
      .from("apprenants")
      .select("id, nom, prenom")
      .in("id", apprenantIds);

    const apprenantMap: Record<string, { nom: string; prenom: string }> = {};
    (apprenants || []).forEach((a: any) => { apprenantMap[a.id] = { nom: a.nom, prenom: a.prenom }; });

    const qrcItems: QrcItem[] = [];

    // Deduplicate: keep only the latest result per apprenant + quiz + matière
    const seenApprenantQuizMatiere = new Set<string>();
    for (const r of results as any[]) {
      const dedupeKey = `${r.apprenant_id}__${r.quiz_id}__${r.matiere_id || ""}`;
      if (seenApprenantQuizMatiere.has(dedupeKey)) continue;
      seenApprenantQuizMatiere.add(dedupeKey);
      const details = r.details as any;
      if (!details?.questions) continue;

      const examen = examenMap[r.quiz_id];
      const matiere = examen?.matieres?.find((m: Matiere) => m.id === r.matiere_id);

      const correctionsIA = details.correctionsIA || {};

      for (const q of details.questions) {
        if (q.type !== "QRC") continue;

        const pts = getPointsParQuestion(r.matiere_id || "", "QRC", matiere || undefined);

        const correction = correctionsIA[q.questionId];
        const hasManualCorrection = correction && typeof correction === "object" && correction.explication?.includes("manuelle");

        const app = apprenantMap[r.apprenant_id] || { nom: "Inconnu", prenom: "" };

        // Auto score: use saved correction, or recompute from question definition
        let autoScore = 0;
        let autoExplication: string | null = null;
        if (correction && typeof correction === "object") {
          autoScore = correction.pointsObtenus ?? 0;
          autoExplication = correction.explication || null;
        } else {
          // No frozen correction — recompute from question definition
          const questionDef = matiere?.questions?.find((mq: any) => mq && mq.id === q.questionId);
          if (questionDef) {
            const recomputed = recomputeQrcAutoScore(questionDef, safeStr(q.reponseEleve), pts);
            autoScore = recomputed.autoScore;
            autoExplication = recomputed.explication;
          }
        }

        qrcItems.push({
          resultId: r.id,
          apprenantId: r.apprenant_id,
          apprenantNom: app.nom,
          apprenantPrenom: app.prenom,
          quizTitre: r.quiz_titre,
          quizId: r.quiz_id,
          quizType: r.quiz_type,
          matiereId: r.matiere_id || "",
          matiereNom: r.matiere_nom || "",
          questionId: q.questionId,
          enonce: safeStr(q.enonce),
          reponseEleve: safeStr(q.reponseEleve),
          reponseCorrecte: safeStr(q.reponseCorrecte),
          pointsMax: pts,
          pointsObtenus: correction && typeof correction === "object" ? correction.pointsObtenus : null,
          corrigeManuel: !!hasManualCorrection,
          completedAt: r.completed_at,
          autoScore,
          autoExplication,
          noteSur20: r.note_sur_20 ?? null,
          scoreMatiereObtenu: r.score_obtenu ?? 0,
          scoreMatiereMax: r.score_max ?? 20,
          commentaire: correction && typeof correction === "object" ? (correction.commentaire || "") : "",
        });
      }
    }

    setItems(qrcItems);
    setLoading(false);
  }, [examenMap]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveCorrection = async (item: QrcItem, newPoints: number) => {
    const uniqueKey = `${item.resultId}-${item.questionId}`;
    setSavingId(uniqueKey);

    const clamped = Math.min(Math.max(newPoints, 0), item.pointsMax);

    // Fetch current details
    const { data: row, error: fetchErr } = await supabase
      .from("apprenant_quiz_results")
      .select("details, score_obtenu, score_max")
      .eq("id", item.resultId)
      .single();

    if (fetchErr || !row) {
      toast.error("Erreur lors de la récupération des données");
      setSavingId(null);
      return;
    }

    const details = (row as any).details as any;
    const correctionsIA = details.correctionsIA || {};

    const commentaire = editingComments[uniqueKey] ?? item.commentaire;

    // Update this specific question's correction
    correctionsIA[item.questionId] = {
      estCorrect: clamped >= item.pointsMax,
      pointsObtenus: clamped,
      nombrefautes: 0,
      explication: `Correction manuelle par l'administrateur : ${clamped}/${item.pointsMax} pts`,
      commentaire: commentaire || "",
    };

    // Recalculate total score for this matiere
    const examen = examenMap[item.quizId];
    const matiere = examen?.matieres?.find((m: Matiere) => m.id === item.matiereId);
    const questions = details.questions || [];
    const reponses = details.reponses || {};

    let newScore = 0;
    for (const q of questions) {
      if (!q) continue;
      const pts = getPointsParQuestion(matiere?.id || "", q.type || "QCM", matiere || undefined);

      if (q.type === "QCM" && q.reponseCorrecte) {
        const correctes = Array.isArray(q.reponseCorrecte) ? [...q.reponseCorrecte].sort() : [q.reponseCorrecte];
        const donnees = Array.isArray(reponses[q.questionId]) ? [...reponses[q.questionId]].sort() : (reponses[q.questionId] ? [reponses[q.questionId]] : []);
        if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
          newScore += pts;
        }
      } else if (q.type === "QRC") {
        const corr = correctionsIA[q.questionId];
        if (corr && typeof corr === "object") {
          newScore += Math.min(corr.pointsObtenus || 0, pts);
        }
      }
    }

    const scoreMax = (row as any).score_max || 20;
    const safeClamped = Math.min(Math.max(newScore, 0), scoreMax);
    const noteSur20 = scoreMax > 0 ? Number(((safeClamped / scoreMax) * 20).toFixed(1)) : 0;

    const { error: updateErr } = await supabase
      .from("apprenant_quiz_results")
      .update({
        score_obtenu: safeClamped,
        note_sur_20: noteSur20,
        details: {
          ...details,
          correctionsIA,
        },
      } as any)
      .eq("id", item.resultId);

    if (updateErr) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(`QRC corrigée : ${clamped}/${item.pointsMax} pts — Note matière : ${noteSur20}/20`);
      // Update local state for ALL QRC items sharing the same resultId
      setItems(prev => prev.map(i => {
        if (i.resultId === item.resultId) {
          const updated: Partial<QrcItem> = { noteSur20, scoreMatiereObtenu: safeClamped };
          if (i.questionId === item.questionId) {
            return { ...i, ...updated, pointsObtenus: clamped, corrigeManuel: true, commentaire: commentaire || "" };
          }
          return { ...i, ...updated };
        }
        return i;
      }));
    }

    setSavingId(null);
    setEditingId(null);
  };

  const filtered = items.filter(item => {
    if (filter === "pending" && item.pointsObtenus !== null) return false;
    if (filter === "done" && item.pointsObtenus === null) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.apprenantNom.toLowerCase().includes(q) ||
        item.apprenantPrenom.toLowerCase().includes(q) ||
        item.quizTitre.toLowerCase().includes(q) ||
        item.matiereNom.toLowerCase().includes(q) ||
        item.enonce.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = items.filter(i => i.pointsObtenus === null).length;
  const doneCount = items.filter(i => i.pointsObtenus !== null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Correction QRC</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Corrigez manuellement les réponses QRC des examens blancs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {pendingCount} en attente
          </Badge>
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            {doneCount} corrigées
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, examen, matière..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">⏳ En attente</SelectItem>
            <SelectItem value="done">✅ Déjà corrigées</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {filter === "pending" ? "Aucune QRC en attente de correction" : "Aucune QRC trouvée"}
            </p>
            <p className="text-sm mt-1">Les réponses QRC apparaîtront ici au fur et à mesure des examens</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const uniqueKey = `${item.resultId}-${item.questionId}`;
            const isEditing = editingId === uniqueKey;
            const isSaving = savingId === uniqueKey;

            return (
              <Card key={uniqueKey} className={`transition-colors ${item.pointsObtenus !== null ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/20"}`}>
                <CardContent className="py-4 px-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <User className="w-3 h-3" />
                          {item.apprenantPrenom} {item.apprenantNom}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{item.quizTitre}</Badge>
                        <Badge variant="outline" className="text-xs">{item.matiereNom}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.pointsObtenus !== null ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          ✅ {item.pointsObtenus}/{item.pointsMax} pts
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          ⏳ À corriger
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-bold text-sm">
                        📊 {item.noteSur20 != null ? `${item.noteSur20}/20` : `${item.scoreMatiereObtenu}/${item.scoreMatiereMax}`}
                      </Badge>
                    </div>
                  </div>

                  {/* Question */}
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.enonce}</p>
                  </div>

                  {/* Réponse élève */}
                  <div className="bg-background border rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">📝 Réponse de l'élève :</p>
                    <p className="text-sm whitespace-pre-wrap">{item.reponseEleve || <span className="italic text-muted-foreground">Pas de réponse</span>}</p>
                  </div>

                  {/* Réponse correcte */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Réponse attendue :</p>
                    <p className="text-sm whitespace-pre-wrap text-green-900">{item.reponseCorrecte}</p>
                  </div>

                  {/* Correction directe */}
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex-wrap">
                    <span className="text-xs text-blue-700 font-medium">🤖 Mots clés : {item.autoScore}/{item.pointsMax}</span>
                    <span className="text-amber-300">|</span>
                    <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-800">Points :</span>
                    <input
                      type="number"
                      min={0}
                      max={item.pointsMax}
                      step={0.5}
                      value={isEditing ? editingPoints : (item.pointsObtenus ?? item.autoScore)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditingPoints(val);
                        if (!isEditing) setEditingId(uniqueKey);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCorrection(item, editingPoints);
                      }}
                      className="w-16 px-2 py-1 text-xs border rounded text-center font-bold"
                    />
                    <span className="text-xs text-amber-700">/ {item.pointsMax}</span>
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (!isEditing) {
                          setEditingId(uniqueKey);
                          setEditingPoints(item.pointsObtenus ?? item.autoScore);
                        }
                        handleSaveCorrection(item, isEditing ? editingPoints : (item.pointsObtenus ?? item.autoScore));
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? "..." : "✓ Valider"}
                    </Button>
                    {item.pointsObtenus !== null && !isSaving && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs ml-1">✅ Corrigé</Badge>
                    )}
                  </div>

                  {/* Commentaire pour l'apprenant */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Commentaire pour l'apprenant :</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Ajouter un commentaire..."
                      value={editingComments[uniqueKey] ?? item.commentaire}
                      onChange={(e) => setEditingComments(prev => ({ ...prev, [uniqueKey]: e.target.value }))}
                      className="w-full text-xs border rounded-md p-2 resize-none bg-background"
                    />
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COMMENTS.map((qc) => (
                        <button
                          key={qc}
                          type="button"
                          onClick={() => {
                            const current = editingComments[uniqueKey] ?? item.commentaire;
                            const sep = current.trim() ? (current.trim().endsWith(".") ? " " : ". ") : "";
                            setEditingComments(prev => ({ ...prev, [uniqueKey]: current.trim() + sep + qc }));
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full border bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        >
                          + {qc}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CorrectionQRCTab;
