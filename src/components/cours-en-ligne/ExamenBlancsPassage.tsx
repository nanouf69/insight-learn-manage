import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  FileText, Timer, RotateCcw, Loader2, Calculator, X, Ban, BookOpen
} from "lucide-react";
import { tousLesExamens, getPointsParQuestion, isCalculQuestion, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TimerBadge } from "./ExamenBlancsTimer";
import { ExamQuestionImage } from "./ExamQuestionImage";
import type { Reponses, ReponseQCM, ReponseQRC } from "./examens-blancs-types";
import { safeStr, safeArray, getQuestionImageValue, normalizeReponses as normalizeReponsesUtil, computeIsMultiple, applyQCMChange } from "./examens-blancs-utils";

function CalculatriceExamen({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const calculate = (a: number, op: string, b: number): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      case "%": return (a * b) / 100;
      default: return b;
    }
  };

  const performOperation = (nextOp: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, operator, current);
      const rounded = parseFloat(result.toFixed(10));
      setDisplay(String(rounded));
      setPrevValue(rounded);
    } else {
      setPrevValue(current);
    }
    setOperator(nextOp);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    const current = parseFloat(display);
    if (prevValue !== null && operator) {
      const result = calculate(prevValue, operator, current);
      const rounded = parseFloat(result.toFixed(10));
      setDisplay(String(rounded));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    if (val !== 0) setDisplay(String(-val));
  };

  const btnBase = "flex items-center justify-center rounded-lg text-base font-semibold h-12 transition-colors active:scale-95";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80 text-foreground`;
  const btnOp = `${btnBase} text-white`;
  const btnOpStyle = { backgroundColor: '#00B4D8' };
  const btnEq = `${btnBase} text-white`;
  const btnEqStyle = { backgroundColor: '#0D2540' };
  const btnFunc = `${btnBase} bg-muted/50 hover:bg-muted/70 text-muted-foreground`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl shadow-2xl border bg-card overflow-hidden" style={{ borderColor: '#00B4D8' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#0D2540' }}>
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" style={{ color: '#00B4D8' }} />
          <span className="text-sm font-semibold text-white">Calculatrice</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3 text-right border-b border-border bg-background">
        <div className="text-xs text-muted-foreground h-4">
          {prevValue !== null && operator ? `${prevValue} ${operator}` : ""}
        </div>
        <div className="text-2xl font-mono font-bold text-foreground truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2">
        <button className={btnFunc} onClick={clear}>C</button>
        <button className={btnFunc} onClick={toggleSign}>±</button>
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("%")}>%</button>
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("÷")}>÷</button>

        {["7","8","9"].map(d => <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>)}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("×")}>×</button>

        {["4","5","6"].map(d => <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>)}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("-")}>−</button>

        {["1","2","3"].map(d => <button key={d} className={btnNum} onClick={() => inputDigit(d)}>{d}</button>)}
        <button className={btnOp} style={btnOpStyle} onClick={() => performOperation("+")}>+</button>

        <button className={`${btnNum} col-span-2`} onClick={() => inputDigit("0")}>0</button>
        <button className={btnNum} onClick={inputDot}>.</button>
        <button className={btnEq} style={btnEqStyle} onClick={handleEquals}>=</button>
      </div>
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showCalculator, setShowCalculator] = useState(false);
  const [showInterruptConfirm, setShowInterruptConfirm] = useState(false);
  const isGestion = matiere.id === "gestion" || matiere.id === "bilan_gestion";
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Freeze questions at mount to prevent re-render from changing order/content mid-exam
  // BUG #9 FIX: allow refresh when matiere prop changes (between matières)
  const [questionsSafe, setQuestionsSafe] = useState<Question[]>(() =>
    (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined)
  );
  useEffect(() => {
    const fresh = (matiere.questions || []).filter((q): q is Question => !!q && q?.type !== undefined);
    if (fresh.length > 0) setQuestionsSafe(fresh);
  }, [matiere.id]);
  const question = questionsSafe[questionIndex] || null;
  const currentQuestionImage = getQuestionImageValue(question);
  const dureeSecondes = (matiere.duree ?? 30) * 60;

  useEffect(() => {
    const isSecurite = matiere.id === "securite";
    if (!isSecurite) return;

    const q2 = questionsSafe.find((q) => Number((q as any)?.id) === 2) as any;
    const q8 = questionsSafe.find((q) => Number((q as any)?.id) === 8) as any;

    console.log(`[ExamImages][load][${examenId || "unknown"}/${matiere.id}]`, {
      q2_image: q2?.image ?? null,
      q2_image_url: q2?.image_url ?? null,
      q8_image: q8?.image ?? null,
      q8_image_url: q8?.image_url ?? null,
    });
  }, [examenId, matiere.id, questionsSafe]);

  // Extracted to examens-blancs-utils.ts for testability (BUG #10 FIX)
  const normalizeReponses = (raw: any): Reponses => {
    return normalizeReponsesUtil(raw);
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
  // FIX: use double underscore `__` to match handleTerminerMatiere in ExamensBlancsPage.tsx
  const exerciceKey = `${examenId || "exam"}__${matiere.id}`;
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
              toast.info(`Vous reprenez votre examen à la question Q${questionsSafe[resumeIndex]?.id ?? (resumeIndex + 1)} (${resumeIndex + 1}/${questionsSafe.length})`, {
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

  // BUG #7 FIX: generation counter to cancel stale retry loops when a new save starts
  const saveGenerationRef = useRef(0);

  const persistReponses = (updated: Reponses) => {
    // BUG #7 FIX: don't silently return when userId is null — wait for session inside debounce
    if (!apprenantId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // BUG #7 FIX: increment generation to cancel any in-flight retry loop
    saveGenerationRef.current++;
    const myGeneration = saveGenerationRef.current;
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 2000;
      let lastError: any = null;

      // BUG #7 FIX: wait for session if not yet available instead of silent return
      if (!userIdRef.current) {
        const sessionRes = await supabase.auth.getSession();
        if (sessionRes.data?.session?.user?.id) {
          userIdRef.current = sessionRes.data.session.user.id;
          jwtTokenRef.current = sessionRes.data.session.access_token;
        }
      }
      if (!userIdRef.current) {
        console.error("[AutoSave] No user session available after wait, cannot save");
        setSaveStatus("error");
        return;
      }

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // BUG #7 FIX: abort if a newer save superseded this one
        if (saveGenerationRef.current !== myGeneration) return;

        try {
          // Refresh token ref in case it was renewed by keep-alive
          const sessionRes = await supabase.auth.getSession();
          if (sessionRes.data?.session?.access_token) {
            jwtTokenRef.current = sessionRes.data.session.access_token;
          }

          const { error } = await supabase.from("reponses_apprenants" as any).upsert({
            apprenant_id: apprenantId,
            user_id: userIdRef.current,
            exercice_id: exerciceKey,
            exercice_type: isBilan ? "bilan" : "examen_blanc",
            reponses: updated,
            completed: false,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "apprenant_id,exercice_id" });

          if (error) {
            lastError = error;
            console.warn(`[AutoSave] Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
              continue;
            }
          } else {
            setSaveStatus("saved");
            if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
            saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
            return; // success
          }
        } catch (e) {
          lastError = e;
          console.warn(`[AutoSave] Attempt ${attempt}/${MAX_RETRIES} exception:`, e);
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
        }
      }

      // All retries exhausted
      console.error("[AutoSave] All retries failed:", lastError);
      setSaveStatus("error");
      // BUG #7 FIX: save to localStorage as fallback
      try {
        const backupKey = `exam_backup_${exerciceKey}_${apprenantId}`;
        localStorage.setItem(backupKey, JSON.stringify(updated));
        console.warn("[AutoSave] Saved to localStorage fallback:", backupKey);
      } catch (_) {}
      toast.error(
        "⚠️ Sauvegarde impossible après 3 tentatives. Vos réponses sont conservées localement. Ne fermez pas la page et contactez l'administration.",
        { duration: Infinity, id: "autosave-error" }
      );
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
      // BUG #8 FIX: flush instead of cancel — don't lose pending saves on unmount
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        flushSave(); // flush pending data instead of discarding
      }
    };
  }, [apprenantId, exerciceKey, isBilan]);

  // Core logic extracted to applyQCMChange in examens-blancs-utils.ts (BUG #10 FIX)
  const handleQCMChange = (qId: number, lettre: string, checked: boolean, isMultipleQ: boolean) => {
    setReponses(prev => {
      const next = applyQCMChange(prev, qId, lettre, checked, isMultipleQ);
      if (next === prev) return prev; // dedup guard returned same ref
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

  // Extracted to examens-blancs-utils.ts for testability (BUG #10 FIX)
  const isMultiple = computeIsMultiple;

  const safeQuestionsCount = questionsSafe.length || 1;
  const safeQuestionIndex = Math.min(questionIndex, safeQuestionsCount - 1);
  const progress = ((safeQuestionIndex + 1) / safeQuestionsCount) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_88px] gap-4">
      <div className="space-y-4 min-w-0">
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
            <button
              onClick={() => setShowCalculator(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: showCalculator ? '#00B4D8' : 'rgba(0,180,216,0.15)', color: showCalculator ? '#0D2540' : '#00B4D8' }}
            >
              <Calculator className="w-4 h-4" />
              <span>Calculatrice</span>
            </button>
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
          <span>Question Q{question?.id ?? (safeQuestionIndex + 1)} ({safeQuestionIndex + 1} / {questionsSafe.length})</span>
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-amber-600 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Sauvegarde...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Sauvegardé ✓
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-3 h-3" />
                Erreur de sauvegarde
              </span>
            )}
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Texte support (français) - toujours visible */}
      {(() => {
        // Always resolve texteSupport from source data to handle saved sessions missing it
        const sourceExam = examenId
          ? tousLesExamens.find((ex) => ex.id === examenId)
          : undefined;
        const fallbackMatiere = sourceExam
          ? sourceExam.matieres.find((m) => m.id === matiere.id) ||
            sourceExam.matieres.find((m) => m.nom === matiere.nom)
          : undefined;
        const texteSupport = matiere.texteSupport || fallbackMatiere?.texteSupport || "";
        const texteSource = matiere.texteSource || fallbackMatiere?.texteSource || "";

        if (!texteSupport) return null;

        return (
          <Card className="border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 px-4 py-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-primary">📄 Texte support — Lisez attentivement avant de répondre</span>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-background rounded-lg border border-border p-4 max-h-[300px] overflow-y-auto">
                {texteSupport.split("\n\n").map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">{p}</p>
                ))}
              </div>
              {texteSource && (
                <p className="text-xs text-muted-foreground italic mt-2">Source : {texteSource}</p>
              )}
            </div>
          </Card>
        );
      })()}

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
                {currentQuestionImage && (
                  <ExamQuestionImage
                    image={currentQuestionImage}
                    alt={`Illustration de la question ${question.id}`}
                    className="mt-3 max-h-40 rounded-lg border"
                    fallbackClassName="mt-3 text-xs text-muted-foreground italic"
                  />
                )}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
              {getPointsParQuestion(matiere.id, question?.type || "QCM", matiere)} pt{getPointsParQuestion(matiere.id, question?.type || "QCM", matiere) > 1 ? "s" : ""}
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
                    onClick={(e) => { e.preventDefault(); handleQCMChange(question.id, choix.lettre, !checked, isMultiple(question)); }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => handleQCMChange(question.id, choix.lettre, Boolean(value), isMultiple(question))}
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

        <div className="text-xs text-muted-foreground hidden lg:block">
          {questionsSafe.filter(q => isQuestionAnswered(q)).length} / {questionsSafe.length} répondues
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

      {/* Bouton interrompre l'épreuve */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInterruptConfirm(true)}
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <Ban className="w-4 h-4" />
          Interrompre l'épreuve
        </Button>
      </div>

      {/* Modal confirmation interruption */}
      {showInterruptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Interrompre l'épreuve
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Êtes-vous sûr de vouloir interrompre cette épreuve ? Les questions non répondues seront comptées comme <strong>fausses (0 point)</strong>. L'apprenant passera directement à la matière suivante.
              </p>
              <div className="text-sm font-medium bg-destructive/10 text-destructive rounded-lg px-3 py-2">
                ⚠️ {questionsSafe.filter(q => !isQuestionAnswered(q)).length} question(s) non répondue(s) sur {questionsSafe.length}
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowInterruptConfirm(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowInterruptConfirm(false);
                    onTerminer(reponses);
                  }}
                  className="gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Confirmer l'interruption
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calculatrice flottante */}
      {showCalculator && (
        <CalculatriceExamen onClose={() => setShowCalculator(false)} />
      )}
      </div>

      {/* Sidebar verticale des questions */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-lg border bg-card p-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="text-[10px] font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wide">
            Questions
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {questionsSafe.map((q, i) => {
              if (!q) return null;
              const isAnswered = isQuestionAnswered(q);
              const isCurrent = i === safeQuestionIndex;
              return (
                <button
                  key={q.id ?? i}
                  onClick={() => setQuestionIndex(i)}
                  className={`w-9 h-9 rounded text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : isAnswered
                        ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                        : "bg-red-50 text-red-500 border border-red-300 hover:bg-red-100"
                  }`}
                  title={isAnswered ? `Q${i + 1} — répondue ✓` : `Q${i + 1} — non répondue ✗`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[10px] text-muted-foreground border-t pt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              <span>Répondu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-300" />
              <span>À faire</span>
            </div>
          </div>
        </div>
      </aside>
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




export { PassageMatiere, TransitionMatiere };
