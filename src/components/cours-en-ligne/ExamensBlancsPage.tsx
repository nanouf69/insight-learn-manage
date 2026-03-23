import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle,
  FileText, Timer, Trophy, RotateCcw, ChevronRight, BookOpen, Pencil, Loader2, Bot
} from "lucide-react";
import { tousLesExamens, getPointsParQuestion, isCalculQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { loadSavedExamens, EXAMEN_BLANC_MODULE_BASE } from "./ExamensBlancsEditor";
import ExamensBlancsEditor from "./ExamensBlancsEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ===== COMPOSANT TIMER =====
function TimerBadge({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const percent = (remaining / seconds) * 100;
  const isUrgent = remaining < 60;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${isUrgent ? "border-red-500 bg-red-50 text-red-700 animate-pulse" : "border-primary/30 bg-primary/5 text-primary"}`}>
      <Timer className="w-4 h-4" />
      <span className="font-mono font-bold text-lg">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

// ===== TYPES =====
type ReponseQCM = string[];
type ReponseQRC = string;
type Reponses = { [questionId: number]: ReponseQCM | ReponseQRC };

interface CorrectionQRC {
  estCorrect: boolean;
  pointsObtenus: number;
  nombrefautes: number;
  explication: string;
}

// Cache des corrections IA : { [questionId]: CorrectionQRC }
type CorrectionCache = { [questionId: number]: CorrectionQRC | "loading" | "error" };

interface ResultatMatiere {
  matiereId: string;
  nomMatiere: string;
  noteObtenue: number;     // points réels obtenus
  maxPoints: number;       // total points possible pour la matière
  noteSur: number;         // pour affichage référence (noteSur du barème)
  noteEliminatoire: number;
  coefficient: number;
  admis: boolean;
  reponses: Reponses;
  correctionsIA?: CorrectionCache; // corrections IA pour les QRC
}

// ===== ÉCRAN DE SÉLECTION =====
function EcranSelection({ onStart, onEdit, onViewResults, defaultBilanId, apprenantType, examensData, apprenantId }: { onStart: (examen: ExamenBlanc) => void; onEdit: () => void; onViewResults: (examen: ExamenBlanc) => void; defaultBilanId?: string | null; apprenantType?: string | null; examensData: ExamenBlanc[]; apprenantId?: string | null }) {
  // Determine the forced exam type from the student's formation type
  const forcedType = (() => {
    if (!apprenantType) return null;
    const t = apprenantType.replace(/-e$/i, "").toUpperCase();
    if (["TAXI", "VTC", "TA", "VA"].includes(t)) return t as "TAXI" | "VTC" | "TA" | "VA";
    return null;
  })();

  const [typeFiltre, setTypeFiltre] = useState<"tous" | "TAXI" | "VTC" | "TA" | "VA">(forcedType || "tous");
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const [examScores, setExamScores] = useState<Record<string, { matiere_id: string; matiere_nom: string; note_sur_20: number }[]>>({});

  // Fetch completed exams with scores from DB
  useEffect(() => {
    if (!apprenantId) return;
    supabase
      .from("apprenant_quiz_results" as any)
      .select("quiz_id, matiere_id, matiere_nom, note_sur_20")
      .eq("apprenant_id", apprenantId)
      .eq("quiz_type", "examen_blanc")
      .then(({ data }) => {
        if (data) {
          const ids = new Set<string>((data as any[]).map((r: any) => r.quiz_id));
          setCompletedExamIds(ids);
          // Group scores by quiz_id
          const scores: Record<string, { matiere_id: string; matiere_nom: string; note_sur_20: number }[]> = {};
          (data as any[]).forEach((r: any) => {
            if (!scores[r.quiz_id]) scores[r.quiz_id] = [];
            scores[r.quiz_id].push({
              matiere_id: r.matiere_id,
              matiere_nom: r.matiere_nom,
              note_sur_20: r.note_sur_20 ?? 0,
            });
          });
          setExamScores(scores);
        }
      });
  }, [apprenantId]);

  const examens = examensData.filter(e => {
    const typeOk = typeFiltre === "tous" || e?.type === typeFiltre;
    const isBilan = e.id.startsWith("bilan-");
    return typeOk && !isBilan;
  });

  const examensBlancs = examensData.filter(e => !e.id.startsWith("bilan-") && (typeFiltre === "tous" || e?.type === typeFiltre));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Examens Blancs</h2>
          <p className="text-muted-foreground text-sm">
            {forcedType
              ? `${examensBlancs.length} examens blancs ${forcedType}. Chaque test comporte les matières correspondantes chronométrées.`
              : "24 examens blancs (6 TAXI, 6 VTC, 6 Passerelle TA, 6 Passerelle VA). Chaque test comporte les matières correspondantes chronométrées."
            }
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 shrink-0">
          <Pencil className="w-4 h-4" />
          Modifier les examens
        </Button>
      </div>

      {/* Filtres — masqués si l'apprenant a un type forcé */}
      {!forcedType && (
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 border rounded-lg p-1">
            {(["tous", "TAXI", "VTC", "TA", "VA"] as const).map(t => (
              <Button
                key={t}
                variant={typeFiltre === t ? "default" : "ghost"}
                size="sm"
                onClick={() => setTypeFiltre(t)}
                className="h-7 px-3"
              >
                {t === "tous" ? "Tous" : t === "TA" ? "Passerelle TA" : t === "VA" ? "Passerelle VA" : t}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Section Examens blancs */}
      {examensBlancs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Examens Blancs</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examensBlancs.map(examen => {
              const totalQuestions = examen.matieres.reduce((acc, m) => acc + m.questions.length, 0);
              const dureeTotal = examen.matieres.reduce((acc, m) => acc + m.duree, 0);
              const isCompleted = completedExamIds.has(examen.id);
              const scores = examScores[examen.id] || [];
              return (
                <Card
                  key={examen.id}
                  className={`hover:shadow-md transition-shadow border-2 ${isCompleted ? "border-green-500/60 bg-green-50/30 cursor-pointer" : "hover:border-primary/40"}`}
                  onClick={isCompleted ? () => onViewResults(examen) : undefined}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={examen?.type === "TAXI" ? "default" : "secondary"} className="text-xs">
                        {examen?.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">N°{examen.numero}</span>
                    </div>
                    <CardTitle className="text-base mt-2">{examen.titre}</CardTitle>
                    {isCompleted && (
                      <div className="flex items-center gap-2 mt-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="text-green-700 font-bold text-lg uppercase tracking-wide">Examen réalisé</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span>{totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{dureeTotal} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>{examen.matieres.length} matière{examen.matieres.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {examen.matieres.map(m => {
                        const scoreData = scores.find(s => s.matiere_id === m.id);
                        return (
                          <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate pr-2">{m.nom.split(" - ")[0]}</span>
                            {isCompleted && scoreData ? (
                              <span className={`shrink-0 font-bold ${scoreData.note_sur_20 >= (m.noteEliminatoire || 6) ? "text-green-600" : "text-red-500"}`}>
                                {scoreData.note_sur_20.toFixed(1)}/20
                              </span>
                            ) : (
                              <span className="shrink-0">{m.duree}min</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {isCompleted && (
                      <Button className="w-full mt-2 gap-2" variant="secondary" onClick={(e) => { e.stopPropagation(); onViewResults(examen); }}>
                        <Trophy className="w-4 h-4" />
                        Voir mes résultats
                      </Button>
                    )}
                    <Button className="w-full mt-2 gap-2" variant={isCompleted ? "outline" : "default"} onClick={(e) => { e.stopPropagation(); onStart(examen); }}>
                      {isCompleted ? "Recommencer l'examen" : "Commencer l'examen"}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PASSAGE D'UNE MATIÈRE =====
function PassageMatiere({
  matiere,
  numero,
  total,
  onTerminer,
  isBilan = false,
  apprenantId,
  examenId,
}: {
  matiere: Matiere;
  numero: number;
  total: number;
  onTerminer: (reponses: Reponses) => void;
  isBilan?: boolean;
  apprenantId?: string | null;
  examenId?: string;
}) {
  const [reponses, setReponses] = useState<Reponses>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [expire, setExpire] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const questionsSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
  const question = questionsSafe[questionIndex] || null;
  const dureeSecondes = (matiere.duree ?? 30) * 60;

  // Helper: normalize reponses keys to number (DB JSON keys are strings)
  const normalizeReponses = (raw: any): Reponses => {
    if (!raw || typeof raw !== "object") return {};
    const normalized: Reponses = {};
    for (const [key, value] of Object.entries(raw)) {
      const numKey = Number(key);
      if (!isNaN(numKey) && value !== undefined && value !== null) {
        normalized[numKey] = value as ReponseQCM | ReponseQRC;
      }
    }
    return normalized;
  };

  // Auto-save: get userId once
  const userIdRef = useRef<string | null>(null);
  const jwtTokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data?.session?.user?.id ?? null;
      jwtTokenRef.current = data?.session?.access_token ?? null;
    });
  }, []);

  // Load saved responses on mount
  const exerciceKey = `${examenId || "exam"}_${matiere.id}`;
  useEffect(() => {
    if (!apprenantId || initialLoaded) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("reponses_apprenants" as any)
          .select("reponses, completed")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", exerciceKey)
          .maybeSingle();
        if (error) {
          console.warn("[AutoSave] Load query error:", error.message);
        } else if (data) {
          const completed = (data as any)?.completed ?? false;
          const rawReponses = (data as any)?.reponses;
          if (!completed && rawReponses) {
            const parsed = normalizeReponses(rawReponses);
            const answeredCount = Object.keys(parsed).length;
            console.log(`[AutoSave] Loaded ${answeredCount} saved responses for ${exerciceKey}`);
            setReponses(parsed);

            // Resume at the last answered question (or the next unanswered one)
            if (answeredCount > 0 && questionsSafe.length > 0) {
              // Find the first unanswered question index
              let resumeIndex = 0;
              for (let i = 0; i < questionsSafe.length; i++) {
                const q = questionsSafe[i];
                if (!q) continue;
                const rep = parsed[q.id] ?? parsed[String(q.id)];
                const hasAnswer = q?.type === "QCM"
                  ? Array.isArray(rep) && rep.length > 0
                  : typeof rep === "string" && rep.trim().length > 0;
                if (!hasAnswer) {
                  resumeIndex = i;
                  break;
                }
                resumeIndex = i; // if all answered, stay on last
              }
              setQuestionIndex(resumeIndex);
              toast.info(`Vous reprenez votre examen à la question ${resumeIndex + 1}/${questionsSafe.length}`, {
                duration: 4000,
                icon: "📝",
              });
            }
          }
        }
      } catch (e) { console.error("[AutoSave] Load error:", e); }
      setInitialLoaded(true);
    })();
  }, [apprenantId, exerciceKey, initialLoaded]);

  // Silent auto-save on every change
  const latestReponsesRef = useRef<Reponses>({});
  useEffect(() => { latestReponsesRef.current = reponses; }, [reponses]);

  const persistReponses = (updated: Reponses) => {
    if (!apprenantId || !userIdRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await supabase.from("reponses_apprenants" as any).upsert({
          apprenant_id: apprenantId,
          user_id: userIdRef.current,
          exercice_id: exerciceKey,
          exercice_type: isBilan ? "bilan" : "examen_blanc",
          reponses: updated,
          completed: false,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "apprenant_id,exercice_id" });
      } catch (e) { console.error("[AutoSave] Save error:", e); }
    }, 300);
  };

  // beforeunload: flush pending save immediately
  useEffect(() => {
    const flushSave = () => {
      if (!apprenantId || !userIdRef.current) return;
      const current = latestReponsesRef.current;
      if (Object.keys(current).length === 0) return;
      const row = {
        apprenant_id: apprenantId,
        user_id: userIdRef.current,
        exercice_id: exerciceKey,
        exercice_type: isBilan ? "bilan" : "examen_blanc",
        reponses: current,
        completed: false,
        updated_at: new Date().toISOString(),
      };
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reponses_apprenants?on_conflict=apprenant_id,exercice_id`;
        const token = jwtTokenRef.current || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Prefer", "resolution=merge-duplicates");
        xhr.send(JSON.stringify([row]));
      } catch (_) {}
    };
    window.addEventListener("beforeunload", flushSave);
    return () => {
      window.removeEventListener("beforeunload", flushSave);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [apprenantId, exerciceKey, isBilan]);

  const handleQCMChange = (qId: number, lettre: string, checked: boolean, isMultiple: boolean) => {
    setReponses(prev => {
      const current = (prev[qId] as string[]) || [];
      let next: Reponses;
      if (!isMultiple) {
        next = { ...prev, [qId]: [lettre] };
      } else if (checked) {
        next = { ...prev, [qId]: [...current, lettre] };
      } else {
        next = { ...prev, [qId]: current.filter(l => l !== lettre) };
      }
      persistReponses(next);
      return next;
    });
  };

  const handleQRCChange = (qId: number, val: string) => {
    setReponses(prev => {
      const next = { ...prev, [qId]: val };
      persistReponses(next);
      return next;
    });
  };

  // Robust check: question answered? Works with both number and string keys from DB
  const isQuestionAnswered = (q: Question | null | undefined): boolean => {
    if (!q || !q.id) return false;
    const rep = reponses[q.id] ?? reponses[String(q.id)];
    if (q?.type === "QCM") return Array.isArray(rep) && rep.length > 0;
    if (q?.type === "QRC") return typeof rep === "string" && rep.trim().length > 0;
    // Default: check if any value exists
    return rep !== undefined && rep !== null && rep !== "";
  };

  const allAnswered = questionsSafe.every(q => isQuestionAnswered(q));

  const handleTerminer = () => {
    if (!allAnswered) {
      toast.error("Veuillez répondre à toutes les questions avant de terminer la matière.");
      return;
    }
    onTerminer(reponses);
  };
  const handleExpire = () => { setExpire(true); onTerminer(reponses); };

  const isMultiple = (q: Question) =>
    q?.type === "QCM" && (q.choix?.filter(c => c.correct).length || 0) > 1;

  const safeQuestionsCount = questionsSafe.length || 1;
  const safeQuestionIndex = Math.min(questionIndex, safeQuestionsCount - 1);
  const progress = ((safeQuestionIndex + 1) / safeQuestionsCount) * 100;

  return (
    <div className="space-y-4">
      {/* Bandeau matière FTRANSPORT */}
      <div className="rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ backgroundColor: '#0D2540' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold" style={{ backgroundColor: '#00B4D8', color: '#0D2540' }}>
            {numero}
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: '#00B4D8' }}>Matière {numero}/{total}</p>
            <h3 className="font-semibold text-base text-white">{matiere.nom}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,180,216,0.15)', color: '#00B4D8' }}>
            Questions 1 à {questionsSafe.length}
          </span>
          {isBilan ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(0,180,216,0.15)', color: '#00B4D8' }}>
              <BookOpen className="w-4 h-4" />
              <span>Sans chronomètre</span>
            </div>
          ) : (
            <TimerBadge seconds={dureeSecondes} onExpire={handleExpire} />
          )}
        </div>
      </div>

      {/* Progression questions */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {safeQuestionIndex + 1} / {questionsSafe.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Texte support (français) */}
      {matiere.texteSupport && (
        <Card className="border border-blue-200 bg-blue-50/50">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
            onClick={() => {
              const el = document.getElementById(`texte-support-${matiere.id}`);
              if (el) el.classList.toggle("hidden");
              const chevron = document.getElementById(`texte-chevron-${matiere.id}`);
              if (chevron) chevron.classList.toggle("rotate-90");
            }}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm text-blue-800">📄 Texte support — Lisez attentivement avant de répondre</span>
            </div>
            <ChevronRight id={`texte-chevron-${matiere.id}`} className="w-4 h-4 text-blue-600 transition-transform rotate-90" />
          </div>
          <div id={`texte-support-${matiere.id}`} className="px-4 pb-4">
            <div className="bg-white rounded-lg border border-blue-100 p-4 max-h-[300px] overflow-y-auto">
              {matiere.texteSupport.split("\n\n").map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">{p}</p>
              ))}
            </div>
            {matiere.texteSource && (
              <p className="text-xs text-muted-foreground italic mt-2">Source : {matiere.texteSource}</p>
            )}
          </div>
        </Card>
      )}

      {/* Question */}
      <Card className="border-2 border-primary/10">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Badge variant={question?.type === "QRC" ? "secondary" : "outline"} className="shrink-0 mt-0.5">
                {question?.type || "QCM"}
              </Badge>
              <div>
                <p className="font-medium leading-relaxed">{question?.enonce || "Question indisponible"}</p>
                {question?.image && (
                  <img src={question.image} alt="Illustration de la question" className="mt-3 max-h-40 rounded-lg border" />
                )}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
              {getPointsParQuestion(matiere.id, question?.type || "QCM")} pt{getPointsParQuestion(matiere.id, question?.type || "QCM") > 1 ? "s" : ""}
            </Badge>
          </div>

          {question?.type === "QCM" && question.choix && (
            <div className="space-y-2 ml-2">
              <p className="text-xs text-muted-foreground italic">Vous pouvez sélectionner une ou plusieurs réponses</p>
              {question.choix.map((choix) => {
                if (!choix || choix === undefined) return null;
                const rawRep = reponses[question.id] ?? reponses[String(question.id)];
                const checked = (Array.isArray(rawRep) ? rawRep : []).includes(choix.lettre);
                return (
                  <div
                    key={choix.lettre}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}
                    onClick={(e) => { e.preventDefault(); handleQCMChange(question.id, choix.lettre, !checked, true); }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => handleQCMChange(question.id, choix.lettre, Boolean(value), true)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-mono text-sm font-bold w-6 shrink-0">{choix.lettre})</span>
                    <span className="text-sm">{choix.texte}</span>
                  </div>
                );
              })}
            </div>
          )}

          {question?.type === "QRC" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Rédigez votre réponse ci-dessous :</p>
              {isCalculQuestion(question) && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">
                    ⚠️ Pour obtenir tous les points, détaillez votre calcul et précisez l'unité dans votre réponse (ex: 21 000 / 3 = 7 000 € HT)
                  </p>
                </div>
              )}
              <Textarea
                placeholder={isCalculQuestion(question) ? "Détaillez votre calcul et indiquez le résultat avec l'unité..." : "Votre réponse..."}
                rows={4}
                value={String((reponses[question.id] ?? reponses[String(question.id)]) || "")}
                onChange={e => handleQRCChange(question.id, e.target.value)}
                className="resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setQuestionIndex(i => Math.max(0, i - 1))}
          disabled={safeQuestionIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Précédente
        </Button>

        <div className="flex gap-1 flex-wrap justify-center">
          {questionsSafe.map((q, i) => {
            if (!q || q === undefined) return null;
            const isAnswered = isQuestionAnswered(q);
            const isCurrent = i === safeQuestionIndex;
            return (
              <button
                key={q.id ?? i}
                onClick={() => setQuestionIndex(i)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : isAnswered
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-red-50 text-red-500 border border-red-300 animate-pulse"
                }`}
                title={isAnswered ? `Question ${i + 1} — répondue ✓` : `Question ${i + 1} — NON répondue ✗`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {safeQuestionIndex < questionsSafe.length - 1 ? (
          <Button onClick={() => setQuestionIndex(i => i + 1)} className="gap-2">
            Suivante
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleTerminer} disabled={!allAnswered} className="gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50">
            <CheckCircle2 className="w-4 h-4" />
            Terminer la matière
            {!allAnswered && <span className="text-xs">({questionsSafe.filter(q => isQuestionAnswered(q)).length}/{questionsSafe.length})</span>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== ÉCRAN DE TRANSITION ENTRE MATIÈRES =====
function TransitionMatiere({
  matiereTerminee,
  scoreObtenu,
  maxPoints,
  noteSur,
  matiereSuivante,
  numeroSuivant,
  total,
  onContinuer,
}: {
  matiereTerminee: string;
  scoreObtenu: number;
  maxPoints: number;
  noteSur: number;
  matiereSuivante: string;
  numeroSuivant: number;
  total: number;
  onContinuer: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      {/* Matière terminée — sans afficher le score */}
      <Card className="border-2 overflow-hidden" style={{ borderColor: '#00B4D8' }}>
        <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: '#0D2540' }}>
          <CheckCircle2 className="w-5 h-5" style={{ color: '#00B4D8' }} />
          <h3 className="font-semibold text-white text-sm">Matière terminée</h3>
        </div>
        <CardContent className="pt-4 pb-4 space-y-3">
          <p className="font-semibold text-lg">{matiereTerminee}</p>
          <p className="text-sm text-muted-foreground">Épreuve complétée avec succès. Vos résultats seront affichés à la fin de toutes les épreuves.</p>
        </CardContent>
      </Card>

      {/* Flèche de transition */}
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0D2540' }}>
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Matière suivante */}
      <Card className="border-2 border-dashed" style={{ borderColor: '#F4A227' }}>
        <CardContent className="pt-5 pb-5 text-center space-y-3">
          <Badge className="text-xs font-semibold" style={{ backgroundColor: '#0D2540', color: '#00B4D8' }}>
            Matière {numeroSuivant}/{total}
          </Badge>
          <h3 className="text-xl font-bold" style={{ color: '#0D2540' }}>{matiereSuivante}</h3>
          <div className="rounded-lg px-4 py-3 mb-1" style={{ backgroundColor: '#FFF3E0', border: '2px solid #F4A227' }}>
            <p className="text-base font-bold" style={{ color: '#D84315' }}>
              ⚠️ VOUS DEVEZ RÉPONDRE À TOUTES LES QUESTIONS AVANT DE VALIDER
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Préparez-vous, le chronomètre démarrera dès que vous cliquerez.</p>
          <Button
            className="gap-2 text-base px-8 py-5 font-semibold text-white"
            style={{ backgroundColor: '#F4A227', borderColor: '#F4A227' }}
            onClick={onContinuer}
          >
            <ArrowRight className="w-5 h-5" />
            Commencer {matiereSuivante.split(" - ")[0]}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


function EcranResultats({
  examen,
  resultats,
  onRecommencer,
  onRetour,
  onRefaireFausses,
  apprenantId,
  userId,
}: {
  examen: ExamenBlanc;
  resultats: ResultatMatiere[];
  onRecommencer: () => void;
  onRetour: () => void;
  onRefaireFausses: () => void;
  apprenantId?: string | null;
  userId?: string | null;
}) {
  // Check if corrections are already cached in the resultats (from DB)
  const hasPreloadedCorrections = resultats.some(r => r.correctionsIA && Object.keys(r.correctionsIA).length > 0);

  const [correctionsIA, setCorrectionsIA] = useState<{ [matiereIdx: number]: CorrectionCache }>(() => {
    if (!hasPreloadedCorrections) return {};
    // Initialize from preloaded data
    const initial: { [matiereIdx: number]: CorrectionCache } = {};
    resultats.forEach((r, mi) => {
      if (r.correctionsIA && Object.keys(r.correctionsIA).length > 0) {
        initial[mi] = r.correctionsIA;
      }
    });
    return initial;
  });
  const [correctionEnCours, setCorrectionEnCours] = useState(false);
  const [expandedMatieres, setExpandedMatieres] = useState<{ [mi: number]: boolean }>({});

  const toggleMatiere = (mi: number) => {
    setExpandedMatieres(prev => ({ ...prev, [mi]: !prev[mi] }));
  };

  // Save AI corrections to DB once complete
  const saveCorrectionsToDb = async (finalCorrections: { [matiereIdx: number]: CorrectionCache }) => {
    if (!apprenantId || !userId) return;
    const quizType = examen.id.startsWith("bilan-") ? "bilan" : "examen_blanc";
    
    for (let mi = 0; mi < examen.matieres.length; mi++) {
      const matiere = examen.matieres[mi];
      if (!matiere) continue;
      const cache = finalCorrections[mi];
      if (!cache) continue;
      
      // Only save if all QRC corrections are done (no "loading")
      const hasLoading = Object.values(cache).some(v => v === "loading");
      if (hasLoading) continue;

      // Serialize corrections (convert "error" to a proper object)
      const serializedCache: Record<string, any> = {};
      for (const [qId, val] of Object.entries(cache)) {
        if (val === "error") {
          serializedCache[qId] = { estCorrect: false, pointsObtenus: 0, nombrefautes: 0, explication: "Erreur de correction" };
        } else if (val !== "loading") {
          serializedCache[qId] = val;
        }
      }

      // Recalculate score with IA corrections
      const resultat = resultats[mi];
      if (!resultat) continue;
      const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
      let noteRecalculee = 0;
      questionsSafe.forEach(q => {
        if (!q) return;
        if (q?.type === "QCM" && q.choix) {
          const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
          const donnees = ((resultat.reponses?.[q.id] as string[]) || []).sort();
          if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
            noteRecalculee += getPointsParQuestion(matiere.id, q?.type || "QCM");
          }
        } else if (q?.type === "QRC") {
          const correction = cache[q.id];
          if (correction && correction !== "loading" && correction !== "error") {
            noteRecalculee += correction.pointsObtenus;
          }
        }
      });

      const safeMax = resultat.maxPoints || 1;
      const noteSur20 = Number(((noteRecalculee / safeMax) * (resultat.noteSur || 20)).toFixed(1));

      // Update the existing row with corrections
      await supabase
        .from("apprenant_quiz_results" as any)
        .update({
          score_obtenu: noteRecalculee,
          note_sur_20: noteSur20,
          reussi: noteRecalculee >= ((resultat.noteEliminatoire || 0) / (resultat.noteSur || 20)) * safeMax,
          details: {
            questions: (resultat as any).details?.questions || [],
            reponses: resultat.reponses,
            correctionsIA: serializedCache,
          },
        } as any)
        .eq("apprenant_id", apprenantId)
        .eq("quiz_id", examen.id)
        .eq("quiz_type", quizType)
        .eq("matiere_id", matiere.id);
    }
  };

  // Lance la correction IA de tous les QRC à l'affichage des résultats — ONLY if not already cached
  useEffect(() => {
    // Skip if corrections already loaded from DB
    if (hasPreloadedCorrections) return;

    let cancelled = false;
    const corrigerTout = async () => {
      // Check if there are any QRC questions to correct
      let hasQRC = false;
      examen.matieres.forEach((matiere) => {
        if (!matiere) return;
        const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
        if (questionsSafe.some(q => q?.type === "QRC")) hasQRC = true;
      });
      if (!hasQRC) return;

      setCorrectionEnCours(true);

      // Initialiser tous les QRC en "loading"
      const initialCache: { [matiereIdx: number]: CorrectionCache } = {};
      examen.matieres.forEach((matiere, mi) => {
        if (!matiere || matiere === undefined) return;
        const resultat = resultats[mi];
        if (!resultat) return;
        const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
        questionsSafe.forEach(q => {
          if (!q || q === undefined) return;
          if (q?.type === "QRC") {
            if (!initialCache[mi]) initialCache[mi] = {};
            initialCache[mi][q.id] = "loading";
          }
        });
      });
      if (!cancelled) setCorrectionsIA({ ...initialCache });

      const finalCorrections = { ...initialCache };

      // Corriger chaque QRC via l'IA
      for (let mi = 0; mi < examen.matieres.length; mi++) {
        const matiere = examen.matieres[mi];
        if (!matiere || matiere === undefined) continue;
        const resultat = resultats[mi];
        if (!resultat) continue;

        const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);
        for (const q of questionsSafe) {
          if (!q || q === undefined || q?.type !== "QRC") continue;
          const reponseEtudiant = (resultat.reponses?.[q.id] as string) || "";
          const pointsQuestion = getPointsParQuestion(matiere.id, q?.type || "QRC");

          try {
            const isCalc = isCalculQuestion(q);
            const { data, error } = await supabase.functions.invoke("corriger-qrc", {
              body: {
                question: q.enonce,
                reponseEtudiant,
                reponsesAttendues: q.reponses_possibles || [q.reponseQRC || ""],
                matiereId: matiere.id,
                pointsQuestion,
                isCalcul: isCalc,
                reponseQRC: q.reponseQRC || "",
              },
            });

            if (cancelled) return;

            if (error || !data || data.error) {
              finalCorrections[mi] = { ...(finalCorrections[mi] || {}), [q.id]: "error" };
              setCorrectionsIA(prev => ({
                ...prev,
                [mi]: { ...(prev[mi] || {}), [q.id]: "error" },
              }));
            } else {
              finalCorrections[mi] = { ...(finalCorrections[mi] || {}), [q.id]: data as CorrectionQRC };
              setCorrectionsIA(prev => ({
                ...prev,
                [mi]: { ...(prev[mi] || {}), [q.id]: data as CorrectionQRC },
              }));
            }
          } catch {
            if (!cancelled) {
              finalCorrections[mi] = { ...(finalCorrections[mi] || {}), [q.id]: "error" };
              setCorrectionsIA(prev => ({
                ...prev,
                [mi]: { ...(prev[mi] || {}), [q.id]: "error" },
              }));
            }
          }

          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (!cancelled) {
        setCorrectionEnCours(false);
        // Save corrections to DB
        saveCorrectionsToDb(finalCorrections);
      }
    };

    corrigerTout();
    return () => { cancelled = true; };
  }, [examen, resultats, hasPreloadedCorrections]);

  // Recalculer les notes avec les corrections IA
  const resultatsAvecIA = resultats.map((r, mi) => {
    if (!r || r === undefined) return r;
    const cache = correctionsIA[mi];
    if (!cache) return r;

    const matiere = examen.matieres[mi];
    if (!matiere) return r;
    const questionsSafe = (matiere.questions || []).filter(q => q && q?.type !== undefined);

    let noteRecalculee = 0;
    questionsSafe.forEach(q => {
      if (!q || q === undefined) return;
      if (q?.type === "QCM" && q.choix) {
        const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
        const donnees = ((r.reponses?.[q.id] as string[]) || []).sort();
        if (JSON.stringify(correctes) === JSON.stringify(donnees)) {
          noteRecalculee += getPointsParQuestion(matiere.id, q?.type || "QCM");
        }
      } else if (q?.type === "QRC") {
        const correction = cache[q.id];
        if (correction && correction !== "loading" && correction !== "error") {
          noteRecalculee += correction.pointsObtenus;
        }
      }
    });

    const toutTermine = questionsSafe
      .filter(q => q?.type === "QRC")
      .every(q => cache[q.id] && cache[q.id] !== "loading");

    const safeMaxPoints = r.maxPoints || 1;
    const safeNoteSur = r.noteSur || 20;

    return {
      ...r,
      noteObtenue: toutTermine ? noteRecalculee : r.noteObtenue,
      admis: toutTermine ? noteRecalculee >= (r.noteEliminatoire / safeNoteSur) * safeMaxPoints : r.admis,
    };
  });

  const totalCoef = resultatsAvecIA.reduce((acc, r) => acc + (r.coefficient || 1), 0) || 1;
  const noteGlobale = resultatsAvecIA.reduce((acc, r) => {
    const safeMax = r.maxPoints || 1;
    return acc + (r.noteObtenue / safeMax * 20) * (r.coefficient || 1);
  }, 0) / totalCoef;
  const hasNoteEliminatoire = resultatsAvecIA.some(r => !r.admis);
  const moyenneSuffisante = noteGlobale >= 10;
  const admisGlobal = moyenneSuffisante && !hasNoteEliminatoire;

  // Matières avec note éliminatoire
  const matieresEliminatoires = resultatsAvecIA
    .filter(r => !r.admis)
    .map(r => r.nomMatiere.split(" - ")[0]);

  return (
    <div className="space-y-6">
      {/* Bandeau correction IA en cours */}
      {correctionEnCours && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Bot className="w-4 h-4 shrink-0" />
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>L'IA corrige vos réponses ouvertes (QRC)... Les notes se mettent à jour automatiquement.</span>
        </div>
      )}

      {/* Header résultats FTRANSPORT */}
      <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: admisGlobal ? '#00B4D8' : '#ef4444' }}>
        <div className="p-6 text-center text-white" style={{ backgroundColor: '#0D2540' }}>
          {admisGlobal ? (
            <Trophy className="w-12 h-12 mx-auto mb-2" style={{ color: '#F4A227' }} />
          ) : (
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          )}
          <h3 className="text-2xl font-bold mb-1">
            {correctionEnCours
              ? "Correction en cours..."
              : admisGlobal
                ? "Examen blanc réussi ✅"
                : "Examen blanc échoué ❌"
            }
          </h3>
          {correctionEnCours ? (
            <div className="flex justify-center mt-2"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
          ) : (
            <>
              <p className="text-4xl font-black mt-2" style={{ color: '#00B4D8' }}>
                {isFinite(noteGlobale) ? noteGlobale.toFixed(1) : "0.0"} / 20
              </p>
              <p className="text-sm text-gray-300 mt-1">
                Moyenne pondérée par coefficients sur {resultatsAvecIA.length} matières
              </p>
            </>
          )}
          {!admisGlobal && !correctionEnCours && (
            <div className="mt-3 space-y-1">
              {!moyenneSuffisante && (
                <p className="text-sm text-red-300 font-medium">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Moyenne inférieure à 10/20
                </p>
              )}
              {hasNoteEliminatoire && (
                <p className="text-sm text-red-300 font-medium">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Note éliminatoire en : {matieresEliminatoires.join(", ")}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-gray-400 mt-1">{examen.titre}</p>
        </div>
      </div>

      {/* Détail par matière — sous-totaux groupés */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#00B4D8' }} />
          <h4 className="font-semibold text-lg" style={{ color: '#0D2540' }}>Résultats par matière</h4>
        </div>
        {resultatsAvecIA.map((r, mi) => {
          const safeMaxPoints = r.maxPoints || 1;
          const noteSur20 = (r.noteObtenue / safeMaxPoints * (r.noteSur || 20));
          const matiereEnCours = Object.values(correctionsIA[mi] || {}).some(v => v === "loading");
          const pctScore = safeMaxPoints > 0 ? Math.min((r.noteObtenue / safeMaxPoints) * 100, 100) : 0;
          const matiere = examen.matieres[mi];
          const cacheMatiere = correctionsIA[mi] || {};
          const questionsSafe = matiere ? (matiere.questions || []).filter(q => q && q?.type !== undefined) : [];
          const isExpanded = !!expandedMatieres[mi];
          return (
            <Card key={r.matiereId} className="border-l-4 overflow-hidden" style={{ borderLeftColor: r.admis ? '#00B4D8' : '#ef4444' }}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#0D2540' }}>
                <span className="text-xs font-semibold text-white">Matière {mi + 1}/{resultatsAvecIA.length}</span>
                <span className="text-xs font-medium" style={{ color: '#00B4D8' }}>— Coeff. {r.coefficient || 1}</span>
                {!r.admis && <span className="text-xs font-semibold text-red-400 ml-auto">⚠ Note éliminatoire</span>}
                {matiereEnCours && <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: '#00B4D8' }}><Loader2 className="w-3 h-3 animate-spin" />IA en cours</span>}
              </div>
              <div className="cursor-pointer" onClick={() => toggleMatiere(mi)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#0D2540' }}>{r.nomMatiere}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Barème : {r.maxPoints} pts</span>
                        <span className="text-xs text-muted-foreground">Éliminatoire sous {r.noteEliminatoire}/{r.noteSur || 20}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: r.admis ? '#00B4D8' : '#ef4444' }}>
                          {r.noteObtenue} / {r.maxPoints} pts
                        </span>
                        <p className="text-xs text-muted-foreground">= {isFinite(noteSur20) ? noteSur20.toFixed(1) : "0.0"} / {r.noteSur || 20}</p>
                      </div>
                      {r.admis ? (
                        <CheckCircle2 className="w-5 h-5" style={{ color: '#00B4D8' }} />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  <Progress
                    value={pctScore}
                    className={`h-2 mt-2 ${r.admis ? "[&>*]:bg-[#00B4D8]" : "[&>*]:bg-red-500"}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {isExpanded ? "Cliquer pour masquer la correction" : "Cliquer pour voir la correction détaillée"}
                  </p>
                </CardContent>
              </div>

              {/* Correction détaillée inline */}
              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3 border-t">
                  {questionsSafe.map(q => {
                    if (!q || !q?.type) return null;
                    const rep = r.reponses?.[q.id];
                    const pts = getPointsParQuestion(matiere?.id ?? "", q?.type);
                    let isCorrect = false;
                    let pointsObtenus = 0;
                    let correctionDetail: string | null = null;
                    let isLoadingIA = false;

                    if (q?.type === "QCM" && q.choix) {
                      const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
                      const donnees = ((rep as string[]) || []).sort();
                      isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
                      pointsObtenus = isCorrect ? pts : 0;
                    } else if (q?.type === "QRC") {
                      const corrIA = cacheMatiere[q.id];
                      const isCalc = isCalculQuestion(q);
                      if (!corrIA || corrIA === "loading") {
                        isLoadingIA = true;
                      } else if (corrIA === "error") {
                        if (isCalc) {
                          const repStr = ((rep as string) || "").replace(/\s/g, "").toLowerCase();
                          const hasResult = (q.reponses_possibles || []).some(rr => repStr.includes(rr.replace(/\s/g, "").toLowerCase()));
                          const hasCalcDetail = /\d+\s*[\/×x\*\-\+]\s*\d+/.test((rep as string) || "") || /=\s*\d/.test((rep as string) || "");
                          if (hasResult && hasCalcDetail) { isCorrect = true; pointsObtenus = pts; }
                          else if (hasResult) { pointsObtenus = Math.round(pts * 5) / 10; correctionDetail = `⚠️ Résultat correct mais détail du calcul manquant → ${pointsObtenus}/${pts} pts`; }
                          else { correctionDetail = "❌ Résultat incorrect."; }
                        } else {
                          const repStr = ((rep as string) || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
                          const motsCles = q.reponses_possibles || [];
                          let nbTrouvees = 0;
                          motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
                          const ratio = motsCles.length > 0 ? nbTrouvees / motsCles.length : 0;
                          isCorrect = nbTrouvees >= motsCles.length;
                          pointsObtenus = Math.round(ratio * pts * 10) / 10;
                          correctionDetail = "⚠️ Correction IA indisponible – correction par mots-clés";
                        }
                      } else {
                        isCorrect = corrIA.estCorrect;
                        pointsObtenus = corrIA.pointsObtenus;
                        correctionDetail = corrIA.explication;
                      }
                    }

                    return (
                      <div key={q.id} className={`p-3 rounded-lg border ${isLoadingIA ? "bg-blue-50 border-blue-200" : isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        <div className="flex items-start gap-2">
                          {isLoadingIA ? (
                            <Loader2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                          ) : isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-1">
                                <Badge variant={q?.type === "QRC" ? "secondary" : "outline"} className="text-xs shrink-0">{q?.type}</Badge>
                                <p className="text-sm font-bold">{q.id}. {q.enonce}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {q?.type === "QRC" && <Bot className="w-3 h-3 text-blue-500" aria-label="Corrigé par IA" />}
                                {isLoadingIA ? (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">? / {pts} pt{pts > 1 ? "s" : ""}</span>
                                ) : (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCorrect ? "bg-green-200 text-green-800" : pointsObtenus > 0 ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"}`}>+{pointsObtenus} / {pts} pt{pts > 1 ? "s" : ""}</span>
                                )}
                              </div>
                            </div>

                            {q?.type === "QCM" && (
                              <div className="mt-1 space-y-0.5">
                                {(q.choix || []).map(c => (
                                  <div key={c.lettre} className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${c.correct ? "bg-yellow-100 border border-yellow-400 text-yellow-900 font-semibold" : "text-muted-foreground"}`}>
                                    <span>{c.lettre})</span><span>{c.texte}</span>{c.correct && <span className="text-yellow-700 font-bold">✓ Bonne réponse</span>}
                                  </div>
                                ))}
                                {rep != null && <p className="text-xs mt-1 italic text-muted-foreground">Votre réponse : {Array.isArray(rep) ? rep.join(", ") || "Aucune" : String(rep) || "Aucune"}</p>}
                              </div>
                            )}

                            {q?.type === "QRC" && (
                              <div className="mt-1 space-y-1">
                                {rep != null && <p className="text-xs italic text-muted-foreground">Votre réponse : {String(rep) || "Aucune"}</p>}
                                {isCalculQuestion(q) && !isLoadingIA && pointsObtenus > 0 && !isCorrect && (
                                  <div className="flex items-start gap-1 text-xs text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>Vous avez trouvé le bon résultat mais le détail du calcul est manquant → {pointsObtenus}/{pts} pts</span>
                                  </div>
                                )}
                                {correctionDetail && (
                                  <div className="flex items-start gap-1 text-xs text-blue-700 bg-blue-50 rounded p-1.5">
                                    <Bot className="w-3 h-3 shrink-0 mt-0.5" /><span>{correctionDetail}</span>
                                  </div>
                                )}
                                <p className="text-xs text-green-700 font-medium">Réponse attendue : {q.reponseQRC || (q.reponses_possibles || []).join(" / ") || "—"}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Score global résumé */}
        <Card className="border-2" style={{ borderColor: '#F4A227' }}>
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0D2540' }}>Score global pondéré</p>
                <p className="text-xs text-muted-foreground">{resultatsAvecIA.length} matières • Coefficients appliqués</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: admisGlobal ? '#00B4D8' : '#ef4444' }}>
                  {isFinite(noteGlobale) ? noteGlobale.toFixed(1) : "0.0"} / 20
                </p>
                <p className="text-xs font-semibold" style={{ color: admisGlobal ? '#00B4D8' : '#ef4444' }}>
                  {admisGlobal ? "ADMIS" : "NON ADMIS"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bouton refaire les fausses — EN HAUT bien visible */}
      {(() => {
        let nbFaussesTop = 0;
        resultatsAvecIA.forEach((r, mi) => {
          if (r.matiereId === "francais" || r.matiereId === "bilan_francais") return;
          const matiere = examen.matieres[mi];
          if (!matiere) return;
          const qSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
          qSafe.forEach(q => {
            const rep = r.reponses?.[q.id];
            if (q?.type === "QCM" && q.choix) {
              const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
              const donnees = ((rep as string[]) || []).sort();
              if (JSON.stringify(correctes) !== JSON.stringify(donnees)) nbFaussesTop++;
            } else if (q?.type === "QRC") {
              const corrIA = correctionsIA[mi]?.[q.id];
              if (corrIA && corrIA !== "loading" && corrIA !== "error") {
                if (!corrIA.estCorrect) nbFaussesTop++;
              } else {
                const repStr = ((rep as string) || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
                const motsCles = q.reponses_possibles || [];
                let nbTrouvees = 0;
                motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
                if (nbTrouvees < motsCles.length) nbFaussesTop++;
              }
            }
          });
        });
        if (nbFaussesTop === 0) return null;
        return (
          <Button
            onClick={onRefaireFausses}
            className="w-full gap-2 text-lg py-6 font-bold shadow-lg"
            style={{ backgroundColor: '#F4A227', borderColor: '#F4A227', color: 'white', fontSize: '18px' }}
          >
            🎯 Refaire uniquement les questions fausses ({nbFaussesTop} questions)
          </Button>
        );
      })()}




      {/* Boutons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetour} className="flex-1 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour aux examens
        </Button>
        <Button onClick={onRecommencer} className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />
          Recommencer
        </Button>
      </div>
    </div>
  );
}

// ===== RÉVISION DES QUESTIONS FAUSSES =====
function RevisionFausses({
  wrongQuestions,
  onTerminer,
}: {
  wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string }[];
  onTerminer: () => void;
}) {
  const [reponses, setReponses] = useState<Reponses>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedCount, setCorrectedCount] = useState(0);

  if (wrongQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-lg">Aucune question fausse à réviser !</p>
          <Button className="mt-4" onClick={onTerminer}>Retour aux résultats</Button>
        </CardContent>
      </Card>
    );
  }

  const current = wrongQuestions[currentIndex];
  if (!current) return null;
  const { question: q, matiereNom } = current;
  const rep = reponses[q.id];

  const checkAnswer = () => {
    let isCorrect = false;
    if (q?.type === "QCM" && q.choix) {
      const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
      const donnees = ((rep as string[]) || []).sort();
      isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
    } else if (q?.type === "QRC") {
      const repStr = ((rep as string) || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
      const motsCles = q.reponses_possibles || [];
      let nbTrouvees = 0;
      motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
      isCorrect = nbTrouvees >= motsCles.length;
    }
    if (isCorrect) setCorrectedCount(prev => prev + 1);
    setShowCorrection(true);
  };

  const goNext = () => {
    setShowCorrection(false);
    if (currentIndex < wrongQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all wrong questions
      toast.success(`Révision terminée ! ${correctedCount}/${wrongQuestions.length} questions corrigées.`);
      onTerminer();
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <Badge style={{ backgroundColor: '#0D2540', color: '#00B4D8' }}>
          Question {currentIndex + 1} / {wrongQuestions.length}
        </Badge>
        <span className="text-xs text-muted-foreground">{matiereNom}</span>
      </div>
      <Progress value={((currentIndex + 1) / wrongQuestions.length) * 100} className="h-2" />

      <Card className="border-2" style={{ borderColor: '#0D2540' }}>
        <CardContent className="pt-5 pb-5 space-y-4">
          <p className="font-semibold text-base" style={{ color: '#0D2540' }}>
            {q.enonce}
          </p>
          {q?.image && (
            <img src={q.image} alt="Illustration" className="mt-2 max-h-40 rounded-lg border" />
          )}

          {q?.type === "QCM" && q.choix && (
            <div className="space-y-2">
              {q.choix.map(c => {
                const selected = ((rep as string[]) || []).includes(c.lettre);
                const isCorrectChoice = c.correct;
                let borderColor = selected ? '#0D2540' : '#e5e7eb';
                let bgColor = 'transparent';
                if (showCorrection) {
                  if (isCorrectChoice) { borderColor = '#22c55e'; bgColor = '#f0fdf4'; }
                  else if (selected && !isCorrectChoice) { borderColor = '#ef4444'; bgColor = '#fef2f2'; }
                }
                return (
                  <div
                    key={c.lettre}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${showCorrection ? 'pointer-events-none' : ''}`}
                    style={{ borderColor, backgroundColor: bgColor }}
                    onClick={() => {
                      if (showCorrection) return;
                      const prev = (rep as string[]) || [];
                      const correctCount = q.choix!.filter(ch => ch.correct).length;
                      if (correctCount <= 1) {
                        setReponses({ ...reponses, [q.id]: [c.lettre] });
                      } else {
                        setReponses({
                          ...reponses,
                          [q.id]: prev.includes(c.lettre) ? prev.filter(l => l !== c.lettre) : [...prev, c.lettre],
                        });
                      }
                    }}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      selected ? 'text-white' : ''
                    }`} style={{
                      borderColor: showCorrection && isCorrectChoice ? '#22c55e' : selected ? '#0D2540' : '#d1d5db',
                      backgroundColor: selected ? '#0D2540' : 'transparent',
                    }}>
                      {showCorrection && isCorrectChoice ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                       showCorrection && selected && !isCorrectChoice ? <XCircle className="w-4 h-4 text-red-500" /> :
                       c.lettre}
                    </div>
                    <span className="text-sm">{c.texte}</span>
                  </div>
                );
              })}
            </div>
          )}

          {q?.type === "QRC" && (
            <div className="space-y-2">
              <Textarea
                value={(rep as string) || ""}
                onChange={e => setReponses({ ...reponses, [q.id]: e.target.value })}
                placeholder="Saisissez votre réponse..."
                disabled={showCorrection}
                rows={3}
              />
              {showCorrection && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    Réponse attendue : {q.reponseQRC || (q.reponses_possibles || []).join(" / ") || "—"}
                  </p>
                </div>
              )}
            </div>
          )}

          {!showCorrection ? (
            <Button
              onClick={checkAnswer}
              disabled={!rep || (Array.isArray(rep) && rep.length === 0)}
              className="w-full gap-2"
              style={{ backgroundColor: '#0D2540' }}
            >
              Valider ma réponse
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="w-full gap-2"
              style={{ backgroundColor: '#F4A227' }}
            >
              {currentIndex < wrongQuestions.length - 1 ? (
                <>Question suivante <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Terminer la révision <CheckCircle2 className="w-4 h-4" /></>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== COMPOSANT PRINCIPAL =====
export default function ExamensBlancsPage({
  defaultBilanId,
  onBilanConsumed,
  apprenantId,
  userId,
  apprenantType,
}: {
  defaultBilanId?: string | null;
  onBilanConsumed?: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  apprenantType?: string | null;
} = {}) {
  // Restore exam session from sessionStorage
  const EXAM_SESSION_KEY = `exam_session_${apprenantId || "anon"}`;

  const restoreSession = () => {
    try {
      const saved = sessionStorage.getItem(EXAM_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  };

  const savedSession = restoreSession();

  const [phase, setPhase] = useState<"selection" | "intro" | "examen" | "transition" | "resultats" | "edition" | "revision">(
    savedSession?.phase === "examen" ? "examen" : "selection"
  );
  const [examenChoisi, setExamenChoisi] = useState<ExamenBlanc | null>(null);
  const [matiereIndex, setMatiereIndex] = useState(savedSession?.matiereIndex || 0);
  const [tousResultats, setTousResultats] = useState<ResultatMatiere[]>(savedSession?.resultats || []);
  const [lastMatiereResult, setLastMatiereResult] = useState<ResultatMatiere | null>(null);
  const [bilanPrefiltre, setBilanPrefiltre] = useState<string | null>(null);
  const [liveExamens, setLiveExamens] = useState<ExamenBlanc[]>(tousLesExamens);
  const examStartTimeRef = useRef<number>(savedSession?.examStartTime || Date.now());

  // Persist exam session state to sessionStorage
  const persistExamSession = (p: string, exId: string | null, mi: number, resultats?: ResultatMatiere[]) => {
    try {
      if (p === "examen" && exId) {
        sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify({
          phase: p,
          examenId: exId,
          matiereIndex: mi,
          examStartTime: examStartTimeRef.current,
          resultats: resultats || [],
        }));
      } else {
        sessionStorage.removeItem(EXAM_SESSION_KEY);
      }
    } catch { }
  };

  // Restore the chosen exam once liveExamens are loaded
  const [sessionRestored, setSessionRestored] = useState(false);
  useEffect(() => {
    if (sessionRestored || liveExamens.length === 0) return;
    if (savedSession?.examenId) {
      const found = liveExamens.find(e => e.id === savedSession.examenId);
      if (found) {
        setExamenChoisi(found);
        setPhase("examen");
        setMatiereIndex(savedSession.matiereIndex || 0);
        if (savedSession.resultats?.length) {
          setTousResultats(savedSession.resultats);
        }
      }
    }
    setSessionRestored(true);
  }, [liveExamens, sessionRestored]);

  // Load saved exam overrides from DB on mount
  useEffect(() => {
    loadSavedExamens().then(saved => setLiveExamens(saved));
  }, []);

  // Realtime: reload when admin saves exam changes
  useEffect(() => {
    const channel = supabase
      .channel('examens-blancs-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_editor_state',
          filter: `module_id=gte.${EXAMEN_BLANC_MODULE_BASE}`,
        },
        () => {
          console.log("[Realtime] Exam blanc updated, reloading...");
          loadSavedExamens().then(saved => setLiveExamens(saved));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Quand un bilan est demandé depuis les modules, on le met en avant
  useEffect(() => {
    if (defaultBilanId) {
      setBilanPrefiltre(defaultBilanId);
      onBilanConsumed?.();
    }
  }, [defaultBilanId]);

  const handleStart = (examen: ExamenBlanc) => {
    setBilanPrefiltre(null);
    setExamenChoisi(examen);
    setMatiereIndex(0);
    setTousResultats([]);
    setPhase("intro");
  };

  const handleViewResults = async (examen: ExamenBlanc) => {
    if (!apprenantId) return;
    const { data } = await supabase
      .from("apprenant_quiz_results" as any)
      .select("*")
      .eq("apprenant_id", apprenantId)
      .eq("quiz_id", examen.id)
      .eq("quiz_type", examen.id.startsWith("bilan-") ? "bilan" : "examen_blanc");
    if (!data || (data as any[]).length === 0) {
      toast.error("Aucun résultat trouvé pour cet examen.");
      return;
    }
    // Reconstruct ResultatMatiere[] from saved DB rows
    const results: ResultatMatiere[] = (data as any[]).map((row: any, idx: number) => {
      const matiere = examen.matieres.find(m => m.id === row.matiere_id);
      // Extract saved IA corrections from details if available
      const savedCorrections = row.details?.correctionsIA || null;
      return {
        matiereId: row.matiere_id,
        nomMatiere: row.matiere_nom,
        noteObtenue: row.score_obtenu,
        maxPoints: row.score_max,
        noteSur: matiere?.noteSur || 20,
        noteEliminatoire: matiere?.noteEliminatoire || 0,
        coefficient: matiere?.coefficient || 1,
        admis: row.reussi ?? true,
        reponses: row.details?.reponses || {},
        correctionsIA: savedCorrections,
      };
    });
    setExamenChoisi(examen);
    setTousResultats(results);
    setPhase("resultats");
  };


  const handleDebuterExamen = () => {
    examStartTimeRef.current = Date.now();
    setPhase("examen");
    if (examenChoisi) persistExamSession("examen", examenChoisi.id, 0);
  };

  const calculerMaxPoints = (matiere: Matiere): number => {
    const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
    return questionsSafe.reduce((acc, q) => acc + getPointsParQuestion(matiere.id, q?.type || "QCM"), 0);
  };

  const calculerNote = (matiere: Matiere, reponses: Reponses): number => {
    const questionsSafe = (matiere.questions ?? []).filter((q): q is Question => q != null && q?.type != null);
    let totalPoints = 0;
    questionsSafe.forEach(q => {
      if (!q || !q?.type) return;
      const rep = reponses?.[q.id] ?? reponses?.[String(q.id)];
      const pts = getPointsParQuestion(matiere.id, q?.type);
      let correct = false;
      if (q?.type === "QCM" && q.choix) {
        const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
        const donnees = ((rep as string[]) || []).sort();
        correct = JSON.stringify(correctes) === JSON.stringify(donnees);
      } else if (q?.type === "QRC") {
        if (isCalculQuestion(q)) {
          // Calcul question: check result + detail
          const repStr = ((rep as string) || "").replace(/\s/g, "").toLowerCase();
          const hasResult = (q.reponses_possibles || []).some(r => repStr.includes(r.replace(/\s/g, "").toLowerCase()));
          const hasCalcDetail = /\d+\s*[\/×x\*\-\+]\s*\d+/.test((rep as string) || "") || /=\s*\d/.test((rep as string) || "");
          if (hasResult && hasCalcDetail) totalPoints += pts;
          else if (hasResult) totalPoints += Math.round(pts * 5) / 10;
          // else 0
        } else {
          const repStr = ((rep as string) || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
          const motsCles = q.reponses_possibles || [];
          let nbTrouvees = 0;
          motsCles.forEach(mc => {
            const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
            if (repStr.includes(mcN)) nbTrouvees++;
          });
          const ratio = motsCles.length > 0 ? nbTrouvees / motsCles.length : 0;
          totalPoints += Math.round(ratio * pts * 10) / 10;
        }
        return; // prorata already added, skip the correct check below
      }
      if (correct) totalPoints += pts;
    });
    return totalPoints;
  };

  const handleTerminerMatiere = (reponses: Reponses) => {
    try {
    if (!examenChoisi) return;
    const matiere = examenChoisi.matieres[matiereIndex];
    if (!matiere) {
      toast.error("Matière introuvable. Veuillez relancer l'examen.");
      return;
    }
    const note = calculerNote(matiere, reponses);
    const maxPoints = calculerMaxPoints(matiere);
    const resultat: ResultatMatiere = {
      matiereId: matiere.id,
      nomMatiere: matiere.nom,
      noteObtenue: note,
      maxPoints,
      noteSur: matiere.noteSur,
      noteEliminatoire: matiere.noteEliminatoire,
      coefficient: matiere.coefficient,
      admis: maxPoints > 0 ? note >= (matiere.noteEliminatoire / (matiere.noteSur || 20)) * maxPoints : false,
      reponses,
    };

    const newResultats = [...tousResultats, resultat];
    setTousResultats(newResultats);

    if (matiereIndex < examenChoisi.matieres.length - 1) {
      const nextIndex = matiereIndex + 1;
      setLastMatiereResult(resultat);
      setMatiereIndex(nextIndex);
      setPhase("transition");
      persistExamSession("examen", examenChoisi.id, nextIndex, newResultats);
    } else {
      setPhase("resultats");
      persistExamSession("resultats", null, 0); // Clear session
      // Save results to database
      if (apprenantId && userId) {
        const duree = Math.round((Date.now() - examStartTimeRef.current) / 1000);
        const allResults = [...newResultats];
        // Save each matière result with full question details
        const rows = allResults.map(r => {
          if (!r || r === undefined) return null;
          const matiere = examenChoisi.matieres.find(m => m.id === r.matiereId);
          const questionsSafe = (matiere?.questions || []).filter(q => q && q?.type !== undefined);
          const questionDetails = matiere ? questionsSafe.map(q => {
            if (!q || q === undefined) return null;
            const rep = r.reponses?.[q.id];
            return {
              questionId: q.id,
              enonce: q.enonce || "",
              type: q?.type || "QCM",
              reponseEleve: rep ?? null,
              reponseCorrecte: q?.type === "QCM" && q.choix
                ? q.choix.filter(c => c.correct).map(c => c.lettre)
                : (q.reponseQRC || (q.reponses_possibles || []).join(" / ")),
            };
          }).filter(Boolean) : [];
          return {
            apprenant_id: apprenantId,
            user_id: userId,
            quiz_type: examenChoisi.id.startsWith("bilan-") ? "bilan" : "examen_blanc",
            quiz_id: examenChoisi.id,
            quiz_titre: examenChoisi.titre,
            matiere_id: r.matiereId,
            matiere_nom: r.nomMatiere,
            score_obtenu: r.noteObtenue,
            score_max: r.maxPoints,
            note_sur_20: Number(((r.noteObtenue / (r.maxPoints || 1)) * (r.noteSur || 20)).toFixed(1)),
            reussi: r.admis,
            duree_secondes: Math.round(duree / allResults.length),
            details: { questions: questionDetails, reponses: r.reponses },
          };
        });
        const rowsToInsert = rows.filter(Boolean);
        supabase
          .from("apprenant_quiz_results" as any)
          .insert(rowsToInsert as any)
          .then(({ error }) => {
            if (error) console.error("Failed to save quiz results:", error);
          });
      }
    }
    } catch (err) {
      console.error("[ExamenBlanc] Erreur dans handleTerminerMatiere:", err);
      toast.error("Une erreur est survenue lors du calcul des résultats. Veuillez réessayer.");
    }
  };

  if (phase === "edition") {
    return <ExamensBlancsEditor onBack={() => setPhase("selection")} />;
  }

  if (phase === "selection") {
    return <EcranSelection onStart={handleStart} onEdit={() => setPhase("edition")} onViewResults={handleViewResults} defaultBilanId={bilanPrefiltre} apprenantType={apprenantType} examensData={liveExamens} apprenantId={apprenantId} />;
  }

  if (phase === "intro" && examenChoisi) {
    const dureeTotal = examenChoisi.matieres.reduce((acc, m) => acc + m.duree, 0);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setPhase("selection")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <Badge className="mx-auto mb-2 w-fit" variant={examenChoisi?.type === "TAXI" ? "default" : "secondary"}>
              {examenChoisi?.type}
            </Badge>
            <CardTitle className="text-xl">{examenChoisi.titre}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Consignes */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                Consignes importantes
              </div>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Chaque matière est <strong>chronométrée individuellement</strong></li>
                <li>Le temps s'écoule dès que vous démarrez la matière</li>
                <li>Les questions QRC sont corrigées par mots-clés</li>
                <li>Une note éliminatoire inférieure au seuil entraîne l'échec</li>
                <li>Vous ne pouvez pas revenir à une matière terminée</li>
                <li className="text-base font-bold text-red-700">⚠️ VOUS DEVEZ RÉPONDRE À TOUTES LES QUESTIONS AVANT DE VALIDER</li>
              </ul>
            </div>

            {/* Tableau des matières */}
            <div>
              <h4 className="font-semibold mb-3">Matières et durées</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Matière</th>
                      <th className="text-center p-2 font-medium">Durée</th>
                      <th className="text-center p-2 font-medium">Barème</th>
                      <th className="text-center p-2 font-medium">QCM</th>
                      <th className="text-center p-2 font-medium">QRC</th>
                      <th className="text-center p-2 font-medium">Coeff.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examenChoisi.matieres.map((m, i) => {
                      if (!m || m === undefined) return null;
                      const questionsSafe = (m.questions || []).filter(q => q && q?.type !== undefined);
                      const maxPts = questionsSafe.reduce((acc, q) => {
                        if (!q || q === undefined) return acc;
                        return acc + getPointsParQuestion(m.id, q?.type || "QCM");
                      }, 0);
                      const ptsQCM = getPointsParQuestion(m.id, "QCM");
                      const ptsQRC = getPointsParQuestion(m.id, "QRC");
                      return (
                        <tr key={m.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="p-2 text-xs">{m.nom}</td>
                          <td className="p-2 text-center">{m.duree} min</td>
                          <td className="p-2 text-center font-semibold">{maxPts} pts</td>
                          <td className="p-2 text-center text-blue-600">{ptsQCM} pt</td>
                          <td className="p-2 text-center text-purple-600">{ptsQRC} pts</td>
                          <td className="p-2 text-center">{m.coefficient}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 font-semibold bg-primary/5">
                      <td className="p-2">TOTAL</td>
                      <td className="p-2 text-center">{dureeTotal} min</td>
                      <td className="p-2 text-center">{examenChoisi.matieres.reduce((acc, m) => {
                        if (!m || m === undefined) return acc;
                        const questionsSafe = (m.questions || []).filter(q => q && q?.type !== undefined);
                        const totalMatiere = questionsSafe.reduce((a, q) => {
                          if (!q || q === undefined) return a;
                          return a + getPointsParQuestion(m.id, q?.type || "QCM");
                        }, 0);
                        return acc + totalMatiere;
                      }, 0)} pts</td>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                      <td className="p-2 text-center">Note finale /20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            <Button className="w-full gap-2 text-base py-5 text-white font-semibold" style={{ backgroundColor: '#F4A227' }} onClick={handleDebuterExamen}>
              <Timer className="w-5 h-5" />
              Démarrer l'examen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "transition" && examenChoisi && lastMatiereResult) {
    const matiereSuivante = examenChoisi.matieres[matiereIndex];
    return (
      <TransitionMatiere
        matiereTerminee={lastMatiereResult.nomMatiere}
        scoreObtenu={lastMatiereResult.noteObtenue}
        maxPoints={lastMatiereResult.maxPoints}
        noteSur={lastMatiereResult.noteSur}
        matiereSuivante={matiereSuivante?.nom || "Matière suivante"}
        numeroSuivant={matiereIndex + 1}
        total={examenChoisi.matieres.length}
        onContinuer={() => { setLastMatiereResult(null); setPhase("examen"); }}
      />
    );
  }

  if (phase === "examen" && examenChoisi) {
    const matiere = examenChoisi.matieres[matiereIndex];
    if (!matiere) return null;
    return (
      <div className="flex gap-6 max-w-[1200px] mx-auto">
        {/* Contenu principal */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Barre de progression globale */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {examenChoisi.matieres.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${i < matiereIndex ? "w-8 bg-green-500" : i === matiereIndex ? "w-8 bg-primary" : "w-4 bg-muted"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Matière {matiereIndex + 1}/{examenChoisi.matieres.length}
            </span>
          </div>

          <PassageMatiere
            matiere={matiere}
            numero={matiereIndex + 1}
            total={examenChoisi.matieres.length}
            onTerminer={handleTerminerMatiere}
            isBilan={examenChoisi.id.startsWith("bilan-")}
            apprenantId={apprenantId}
            examenId={examenChoisi.id}
          />
        </div>

        {/* Barre de progression latérale droite */}
        <div className="hidden min-[520px]:block w-36 sm:w-40 md:w-48 lg:w-56 shrink-0">
          <div className="sticky top-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progression</p>
            <div className="relative">
              {/* Ligne verticale de fond */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted rounded-full" />
              {/* Ligne verticale de progression */}
              <div
                className="absolute left-4 top-4 w-0.5 bg-primary rounded-full transition-all duration-500"
                style={{ height: `${examenChoisi.matieres.length > 1 ? (matiereIndex / (examenChoisi.matieres.length - 1)) * 100 : 100}%`, maxHeight: 'calc(100% - 2rem)' }}
              />
              <div className="space-y-1">
                {examenChoisi.matieres.map((m, i) => {
                  if (!m) return null;
                  const isDone = i < matiereIndex;
                  const isCurrent = i === matiereIndex;
                  const isLocked = i > matiereIndex;
                  return (
                    <div
                      key={m.id}
                      className={`relative flex items-start gap-3 p-2 rounded-lg transition-all ${
                        isCurrent
                          ? "bg-primary/10 border border-primary/30"
                          : isDone
                            ? "bg-green-50 border border-green-200 cursor-default"
                            : "opacity-50"
                      }`}
                    >
                      {/* Indicateur circulaire */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 transition-all ${
                        isDone
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                            ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-background border-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      {/* Texte */}
                      <div className="min-w-0 pt-1">
                        <p className={`text-xs font-medium leading-tight truncate ${
                          isCurrent ? "text-primary" : isDone ? "text-green-700" : "text-muted-foreground"
                        }`}>
                          {m.nom.split(" - ")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isDone ? "✓ Terminée" : isCurrent ? `En cours • ${m.duree}min` : `${m.duree}min`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "revision" && examenChoisi) {
    // Build wrong questions excluding français
    const wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string }[] = [];
    examenChoisi.matieres.forEach((matiere, mi) => {
      if (!matiere) return;
      if (matiere.id === "francais" || matiere.id === "bilan_francais") return;
      const r = tousResultats[mi];
      if (!r) return;
      const qSafe = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
      qSafe.forEach(q => {
        const rep = r.reponses?.[q.id];
        let isCorrect = false;
        if (q?.type === "QCM" && q.choix) {
          const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
          const donnees = ((rep as string[]) || []).sort();
          isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
        } else if (q?.type === "QRC") {
          const repStr = ((rep as string) || "").toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "");
          const motsCles = q.reponses_possibles || [];
          let nbTrouvees = 0;
          motsCles.forEach(mc => { const mcN = mc.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, ""); if (repStr.includes(mcN)) nbTrouvees++; });
          isCorrect = nbTrouvees >= motsCles.length;
        }
        if (!isCorrect) {
          wrongQuestions.push({ matiere, question: q, matiereNom: matiere.nom });
        }
      });
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPhase("resultats")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour aux résultats
          </Button>
          <h2 className="text-xl font-bold" style={{ color: '#0D2540' }}>
            🎯 Révision des questions fausses
          </h2>
        </div>

        <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FFF3E0', border: '2px solid #F4A227' }}>
          <p className="text-sm font-semibold" style={{ color: '#D84315' }}>
            {wrongQuestions.length} question{wrongQuestions.length > 1 ? "s" : ""} à réviser (hors épreuve de Français)
          </p>
        </div>

        <RevisionFausses
          wrongQuestions={wrongQuestions}
          onTerminer={() => setPhase("resultats")}
        />
      </div>
    );
  }

  if (phase === "resultats" && examenChoisi) {
    return (
      <div className="max-w-3xl mx-auto">
        <EcranResultats
          examen={examenChoisi}
          resultats={tousResultats}
          onRecommencer={() => handleStart(examenChoisi)}
          onRetour={() => setPhase("selection")}
          onRefaireFausses={() => setPhase("revision")}
          apprenantId={apprenantId}
          userId={userId}
        />
      </div>
    );
  }

  return null;
}
