// TEST ONLY: not imported by application.
import { blockLearnerWrite } from "@/lib/learnerPreviewGuard";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  enqueueAnswerSave,
  flushAnswerSavesAndWait,
  flushAnswerSavesOnUnload,
  mergeSavedAndPendingAnswers,
  primeKnownWriteSeq,
} from "@/lib/answerPersistence";
import { AnswerSaveIndicator } from "@/components/cours-en-ligne/AnswerSaveIndicator";
import {
  creerRevisionProgressState,
  restaurerRevisionProgressState,
  revisionQuestionKey,
  revisionQuestionOrder,
} from "@/lib/revisionFaussesProgression";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  Trophy, RotateCcw, ChevronRight, BookOpen, Loader2, Bot, Clock, Pencil
} from "lucide-react";
import { RefaireExamenDialog } from "@/components/cours-en-ligne/RefaireExamenDialog";
import { getPointsParQuestion, isCalculQuestion, type ExamenBlanc, type Matiere, type Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExamQuestionImage } from "@/components/cours-en-ligne/ExamQuestionImage";
import type { ResultatMatiere, Reponses, CorrectionQRC, CorrectionCache, ReponseQCM, ReponseQRC as ReponseQRCType } from "@/components/cours-en-ligne/examens-blancs-types";
import {
  safeStr, safeArray, toFiniteNumber, clamp,
  normalizeNoteSur20, clampToQuestionMax, computeAdmisForMatiere,
  evaluateQrcDeterministic, ENABLE_AI_QRC_CORRECTION, AI_ONLY_UPGRADES,
  getQuestionImageValue,
} from "@/components/cours-en-ligne/examens-blancs-utils";
import { computeMoyenneExamen, computeResultatMatiereScore, getSeuilEliminatoireAffiche } from "@/components/cours-en-ligne/examens-blancs-scoring";
import { isExamAttemptPublicationPending, legacyEnginePendingForRows } from "@/components/cours-en-ligne/exam-helpers";
import { choisirTentativeRevision, nouvelleTentativeRevision, revisionBaseId, type RevisionRowLike } from "@/lib/revisionFaussesTentative";
import { REVISION_FINALISATION_SERVEUR_ACTIVE } from "@/lib/revisionFinalisationServeur";
import { estCorrectionIaEnregistree } from "@/components/cours-en-ligne/CorrectionQRCTab";
import { fetchCoreMatiereStates, type CoreMatiereState } from "@/lib/coreExamPublication";
import { coreFiablePourLigne } from "@/lib/noteExamenAffichee";
import { correctionOfficielleQrc } from "@/lib/correctionOfficielleQrc";
import CorrectionsIaEleve from "@/components/cours-en-ligne/CorrectionsIaEleve";
import { fetchPassagesV2NonFiables } from "@/lib/passagesV2NonFiables";
import { useCoreChangeTick } from "@/hooks/useCoreChangeTick";
import { useQrcEnginePending } from "@/hooks/useQrcEnginePending";
import { RefaireMatiereButton } from './RefaireMatiereButton';
import { buildExamMatiereExerciceId } from '@/lib/quizAttempts';
import type { SubjectRetakeReceipt } from '@/lib/examSubjectRetake';
import { questionsRevisionDuPassage, reponseCorrecteDansRevision } from "@/lib/revisionQuestionsFigees";


function RevisionFausses({
  wrongQuestions,
  onTerminer,
  apprenantId,
  userId,
  examenId,
}: {
  wrongQuestions: { matiere: Matiere; question: Question; matiereNom: string; sourceResultId?: string | null }[];
  onTerminer: () => void;
  apprenantId?: string | null;
  userId?: string | null;
  examenId?: string | null;
}) {
  const [reponses, setReponses] = useState<Reponses>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedCount, setCorrectedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [finEnCours, setFinEnCours] = useState(false);
  const finEnCoursRef = useRef(false);
  const derniereValidationRef = useRef(0);
  const revisionRowsRef = useRef<RevisionRowLike[]>([]);
  const correctedQuestionsRef = useRef<string[]>([]);
  const sourceResultIdsRef = useRef<Record<string, string>>({});

  const baseExerciceId = revisionBaseId(examenId);
  const questionOrder = useMemo(() => revisionQuestionOrder(wrongQuestions), [wrongQuestions]);
  // Identifiant de la tentative en cours : jamais celui d'une révision déjà terminée.
  const [exerciceId, setExerciceId] = useState<string>(baseExerciceId);
  // Tant que la tentative n'est pas identifiée (ou après la fin), aucune écriture.
  const tentativePreteRef = useRef(false);
  const termineeRef = useRef(false);


  // ---- Charge le brouillon serveur puis les valeurs locales encore non confirmées. ----
  useEffect(() => {
    if (!apprenantId || !userId || !examenId || wrongQuestions.length === 0) {
      setLoaded(true);
      return;
    }
    let annule = false;
    (async () => {
      try {
        const { data: tentatives, error: errTentatives } = await supabase
          .from("reponses_apprenants")
          .select("exercice_id, completed")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_type", "revision_fausses")
          .like("exercice_id", `${baseExerciceId}%`);
        if (errTentatives) {
          console.error("Erreur chargement révision (tentatives):", errTentatives.message);
          return;
        }
        const rows = (tentatives as RevisionRowLike[]) || [];
        revisionRowsRef.current = rows;
        let idTentative: string;
        if (REVISION_FINALISATION_SERVEUR_ACTIVE) {
          // A completed draft without a result is an interrupted finalization, not a new revision.
          const { data: finalises, error: erreurFinalises } = await supabase.from("apprenant_quiz_results")
            .select("details").eq("apprenant_id", apprenantId).eq("quiz_id", examenId).eq("quiz_type", "revision_fausses");
          if (erreurFinalises) throw erreurFinalises;
          const ids = new Set((finalises ?? []).map(r => (r.details as any)?.revision_exercice_id));
          const interrupted = rows.filter(r => r.completed === true && !ids.has(r.exercice_id))
            .sort((a, b) => a.exercice_id.localeCompare(b.exercice_id, undefined, { numeric: true })).at(-1);
          idTentative = interrupted?.exercice_id ?? choisirTentativeRevision(baseExerciceId, rows);
        } else {
          idTentative = choisirTentativeRevision(baseExerciceId, rows);
        }
        if (annule) return;
        setExerciceId(idTentative);

        let lecture = supabase
          .from("reponses_apprenants")
          .select("reponses, score, completed, write_seq")
          .eq("apprenant_id", apprenantId)
          .eq("exercice_id", idTentative)
          .eq("exercice_type", "revision_fausses");
        // Published path: only an open draft is resumed (a completed one starts a new revision).
        if (!REVISION_FINALISATION_SERVEUR_ACTIVE) lecture = lecture.eq("completed", false);
        const { data, error } = await lecture
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error("Erreur chargement révision:", error.message);
          return;
        }
        if (annule) return;
        primeKnownWriteSeq(apprenantId, idTentative, Number(data?.write_seq ?? 0));
        tentativePreteRef.current = true;
        const saved = (data?.reponses && typeof data.reponses === "object" ? data.reponses : {}) as any;
        const merged = mergeSavedAndPendingAnswers(saved, apprenantId, idTentative);
        const restored = restaurerRevisionProgressState(merged, examenId, questionOrder);
        if (annule) return;
        sourceResultIdsRef.current = restored.sourceResultIds ?? Object.fromEntries(wrongQuestions
          .filter(item => typeof item.sourceResultId === "string")
          .map(item => [revisionQuestionKey(item), item.sourceResultId as string]));
        setReponses(restored.answers as Reponses);
        setCorrectedCount(restored.correctedCount);
        correctedQuestionsRef.current = restored.correctedQuestions;
        setCurrentIndex(restored.currentIndex);
        setShowCorrection(restored.showCorrection);
        if (restored.contexteChange) {
          toast.info("La liste des questions a changé. Vos réponses identifiables sont conservées ; la première question non validée est affichée.");
        }
      } catch (err) {
        console.error("Erreur chargement révision:", err);
      } finally {
        if (!annule) setLoaded(true);
      }
    })();
    return () => { annule = true; };
  }, [apprenantId, userId, examenId, baseExerciceId, wrongQuestions.length]);

  // ---- File durable : chaque saisie est localement récupérable, puis confirmée par le serveur. ----
  const persistProgress = useCallback((
    newReponses: Reponses,
    newIndex: number,
    newCorrectedCount: number,
    correctedQuestions: string[],
    correctionVisible: boolean,
    evenement?: { question_id: string; valeur: unknown },
    completed = false,
  ) => {
    if (!apprenantId || !userId || !examenId) return;
    if (!tentativePreteRef.current || (termineeRef.current && !completed)) return;
    if (blockLearnerWrite("revision_progress(reponses_apprenants)")) return;
    const revisionState = creerRevisionProgressState({
      examenId,
      answers: newReponses,
      currentIndex: newIndex,
      correctedCount: newCorrectedCount,
      correctedQuestions,
      showCorrection: correctionVisible,
      questionOrder,
      sourceResultIds: sourceResultIdsRef.current,
    });
    enqueueAnswerSave({
      apprenant_id: apprenantId,
      user_id: userId,
      exercice_id: exerciceId,
      exercice_type: "revision_fausses",
      reponses: { revisionState },
      score: newCorrectedCount,
      completed,
      events: evenement ? [{ ...evenement, tentative: 1 }] : [],
    });
  }, [apprenantId, userId, examenId, exerciceId, questionOrder]);

  // Dernier essai best-effort : seule une confirmation serveur retire la file locale.
  useEffect(() => {
    const flush = () => flushAnswerSavesOnUnload();
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, []);


  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de votre progression…</p>
        </CardContent>
      </Card>
    );
  }

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
  const { question: q, matiereNom, matiere: currentMatiere } = current;
  const qNumero = (currentMatiere?.questions || []).indexOf(q) + 1;
  const currentKey = revisionQuestionKey(current);
  const rep = reponses[currentKey] ?? reponses[q.id];

  const checkAnswer = () => {
    // Double clic / double tap : une question n'est comptée et validée qu'une fois.
    if (correctedQuestionsRef.current.includes(currentKey)) return;
    derniereValidationRef.current = Date.now();
    let isCorrect = false;
    if (q?.type === "QCM" && q.choix) {
       const correctes = safeArray<string>(q.choix?.filter(c => c.correct).map(c => c.lettre)).sort();
       const donnees = safeArray<string>(rep).sort();
       isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
     } else if (q?.type === "QRC") {
      const normalize = (v: string) => v.toLowerCase().replace(/[àâäáã]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9 ]/g, "").trim();
      const keys = Array.isArray(q.reponses_possibles) ? q.reponses_possibles : [];
      if (!keys.length || keys.some(k => typeof k !== "string" || !normalize(k))) {
        toast.info("Correction automatique indisponible : réponse conservée, vérification du corrigé requise.");
        return;
      }
      const answer = normalize(safeStr(rep));
      isCorrect = keys.every(k => answer.includes(normalize(k)));
    }
    const newCorrected = isCorrect ? correctedCount + 1 : correctedCount;
    if (isCorrect) setCorrectedCount(newCorrected);
    setShowCorrection(true);

    // Track corrected questions
    correctedQuestionsRef.current = [...new Set([...correctedQuestionsRef.current, currentKey])];
    persistProgress(reponses, currentIndex, newCorrected, correctedQuestionsRef.current, true);
  };

  const goNext = async () => {
    if (finEnCoursRef.current) return;
    // Le second geste d'un double tap ne doit pas valider PUIS avancer.
    if (Date.now() - derniereValidationRef.current < 400) return;
    setShowCorrection(false);
    if (currentIndex < wrongQuestions.length - 1) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      persistProgress(reponses, newIdx, correctedCount, correctedQuestionsRef.current, false);
      return;
    }

    const ecritureBloquee = blockLearnerWrite("revision_fausses(fin)");
    if (ecritureBloquee) { onTerminer(); return; }
    if (!apprenantId || !userId || !examenId) return;
    finEnCoursRef.current = true;
    setFinEnCours(true);
    let finEnregistree = false;
    try {
      // La clôture passe par la même file ordonnée : aucune écriture directe
      // ne peut dépasser une réponse encore en attente ou un autre appareil.
      persistProgress(reponses, currentIndex, correctedCount, correctedQuestionsRef.current, true, undefined, !REVISION_FINALISATION_SERVEUR_ACTIVE);
      const confirmations = await flushAnswerSavesAndWait(apprenantId, exerciceId);
      if (!confirmations) throw new Error("Dernières réponses non confirmées");
      const { data: relu, error: erreurRelecture } = await supabase
        .from("reponses_apprenants")
        .select("reponses, score, completed, write_seq")
        .eq("apprenant_id", apprenantId)
        .eq("exercice_id", exerciceId)
        .eq("exercice_type", "revision_fausses")
        .maybeSingle();
      if (erreurRelecture || !relu || (!REVISION_FINALISATION_SERVEUR_ACTIVE && relu.completed !== true)) {
        throw new Error(erreurRelecture?.message || "Clôture non confirmée");
      }
      if (!REVISION_FINALISATION_SERVEUR_ACTIVE) termineeRef.current = true;
      const confirme = restaurerRevisionProgressState(relu.reponses, examenId, questionOrder);
      const finalCorrected = Number.isFinite(relu.score) ? Number(relu.score) : confirme.correctedCount;
      if (!REVISION_FINALISATION_SERVEUR_ACTIVE) {
        // Published path, unchanged until the server finalization is installed.
        const { error: erreurInsertion } = await supabase
          .from("apprenant_quiz_results")
          .insert({
            apprenant_id: apprenantId,
            user_id: userId,
            quiz_type: "revision_fausses",
            quiz_id: examenId,
            quiz_titre: `Révision questions fausses — ${examenId}`,
            score_obtenu: finalCorrected,
            score_max: wrongQuestions.length,
            note_sur_20: Math.round((finalCorrected / wrongQuestions.length) * 20 * 2) / 2,
            reussi: finalCorrected === wrongQuestions.length,
            details: {
              reponses: confirme.answers,
              revision_exercice_id: exerciceId,
              questionOrder,
              questions: wrongQuestions.map(wq => ({
                questionKey: revisionQuestionKey(wq),
                questionId: wq.question.id,
                matiereId: wq.matiere.id,
                matiereNom: wq.matiereNom,
                enonce: wq.question.enonce,
              })),
            } as any,
          });
        if (erreurInsertion) {
          console.error("Erreur sauvegarde révision:", erreurInsertion.message, erreurInsertion.details);
        } else {
          finEnregistree = true;
          toast.success(`Révision terminée ! ${finalCorrected}/${wrongQuestions.length} questions corrigées.`);
          onTerminer();
        }
        return;
      }
      const { data: receipt, error } = await supabase.rpc("finaliser_revision_fausses" as any, {
        p_apprenant_id: apprenantId, p_examen_id: examenId, p_revision_exercice_id: exerciceId,
        p_expected_write_seq: relu.write_seq, p_expected_state: relu.reponses,
      });
      if (error) {
        console.error("Erreur sauvegarde révision:", error.message, error.details);
      } else {
        const result = receipt as any;
        if (!result?.id || result.apprenant_id !== apprenantId || result.quiz_id !== examenId
          || result.details?.revision_exercice_id !== exerciceId || Number(result.score_obtenu) !== finalCorrected
          || JSON.stringify(result.details?.questionOrder) !== JSON.stringify(questionOrder)) {
          throw new Error("Reçu de finalisation non conforme");
        }
        termineeRef.current = true;
        finEnregistree = true;
        toast.success(`Révision terminée ! ${finalCorrected}/${wrongQuestions.length} questions corrigées.`);
        onTerminer();
      }
    } catch (err) {
      console.error("Erreur sauvegarde révision:", err);
    } finally {
      finEnCoursRef.current = false;
      setFinEnCours(false);
      if (!finEnregistree) {
        setShowCorrection(true);
        toast.error("Révision non enregistrée par le serveur. Vérifiez votre connexion puis réessayez ; vos réponses restent conservées.");
      }
    }
  };

  const handleRecommencer = () => {
    if (!apprenantId || !userId || !examenId) return;
    if (!window.confirm("Commencer une nouvelle révision ? Le brouillon actuel sera conservé.")) return;
    const nouvelId = nouvelleTentativeRevision(baseExerciceId, revisionRowsRef.current);
    revisionRowsRef.current = [...revisionRowsRef.current, { exercice_id: nouvelId, completed: false }];
    setExerciceId(nouvelId);
    setReponses({});
    setCurrentIndex(0);
    setShowCorrection(false);
    setCorrectedCount(0);
    correctedQuestionsRef.current = [];
    tentativePreteRef.current = true;
    termineeRef.current = false;
    const vide = creerRevisionProgressState({
      examenId, answers: {}, currentIndex: 0, correctedCount: 0,
      correctedQuestions: [], showCorrection: false, questionOrder,
    });
    enqueueAnswerSave({
      apprenant_id: apprenantId, user_id: userId, exercice_id: nouvelId,
      exercice_type: "revision_fausses", reponses: { revisionState: vide },
      score: 0, completed: false, events: [],
    });
    toast.info("Nouvelle révision commencée ; le brouillon précédent est conservé.");
  };

  // Update reponses with persistence
  const updateReponse = (questionId: number | string, value: any) => {
    const newReponses = { ...reponses, [questionId]: value };
    setReponses(newReponses);
    persistProgress(newReponses, currentIndex, correctedCount, correctedQuestionsRef.current, false,
      { question_id: String(questionId), valeur: value });
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <Badge style={{ backgroundColor: '#0D2540', color: '#00B4D8' }}>
          Question Q{qNumero > 0 ? qNumero : (q?.id ?? "?")} ({currentIndex + 1} / {wrongQuestions.length})
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{matiereNom}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={handleRecommencer}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Recommencer
          </Button>
        </div>
      </div>
      <Progress value={((currentIndex + 1) / wrongQuestions.length) * 100} className="h-2" />
      <AnswerSaveIndicator />
      <p className="text-xs text-muted-foreground">
        Les réponses déjà confirmées sont récupérables sur un autre appareil. Hors connexion, elles restent sur cet appareil jusqu’à leur confirmation serveur.
      </p>

      <Card className="border-4 border-destructive bg-destructive/5">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-base flex-1" style={{ color: '#0D2540' }}>
              {q.enonce}
            </p>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
              {getPointsParQuestion(current.matiere.id, q?.type || "QCM", current.matiere)} pt{getPointsParQuestion(current.matiere.id, q?.type || "QCM", current.matiere) > 1 ? "s" : ""}
            </Badge>
          </div>
          {q?.image && (
            <ExamQuestionImage
              image={q.image}
              alt={`Illustration de la question ${q.id}`}
              className="mt-2 max-h-40 rounded-lg border"
              fallbackClassName="mt-2 text-xs text-muted-foreground italic"
            />
          )}

          {q?.type === "QCM" && q.choix && (
            <div className="space-y-2">
              {q.choix.map(c => {
                const selected = safeArray<string>(rep).includes(c.lettre);
                const isCorrectChoice = c.correct;
                let borderColor = selected ? '#0D2540' : '#e5e7eb';
                let bgColor = 'transparent';
                if (showCorrection) {
                  if (isCorrectChoice) { borderColor = '#22c55e'; bgColor = '#f0fdf4'; }
                  else if (selected && !isCorrectChoice) { borderColor = '#ef4444'; bgColor = '#fef2f2'; }
                }
                return (
                    <div key={c.lettre}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${showCorrection ? 'pointer-events-none' : ''}`}
                        style={{ borderColor, backgroundColor: bgColor }}
                        onClick={() => {
                          if (showCorrection) return;
                          const prev = safeArray<string>(rep);
                          const correctCount = (q.choix ?? []).filter(ch => ch.correct).length;
                          if (correctCount <= 1) {
                            updateReponse(currentKey, [c.lettre]);
                          } else {
                            updateReponse(currentKey, prev.includes(c.lettre) ? prev.filter(l => l !== c.lettre) : [...prev, c.lettre]);
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
                      {showCorrection && c.explication && (selected || isCorrectChoice) && (
                        <p className="text-xs text-muted-foreground italic ml-10 mt-1">💡 {c.explication}</p>
                      )}
                    </div>
                  );
              })}
            </div>
          )}

          {q?.type === "QRC" && (
            <div className="space-y-2">
              <Textarea
                value={(rep as string) || ""}
                onChange={e => updateReponse(currentKey, e.target.value)}
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
              disabled={finEnCours}
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

export { RevisionFausses };
