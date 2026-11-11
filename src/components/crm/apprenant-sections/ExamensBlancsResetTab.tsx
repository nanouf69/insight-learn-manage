import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Trophy, Calendar, Hash, Loader2, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  EXAMENS_BLANCS_VTC,
  EXAMENS_BLANCS_TAXI,
  EXAMENS_BLANCS_TA,
  EXAMENS_BLANCS_VA,
} from "@/components/cours-en-ligne/examens-blancs-data";
import {
  computeMoyenneExamen,
  computeMatiereScoreForAttempt,
} from "@/components/cours-en-ligne/examens-blancs-scoring";
import {
  buildMatiereLookupKeys,
  findScoreForMatiere,
  selectLatestAttemptRows,
  recoverCorruptedScoreRow,
  normalizeNoteSur20,
  toFiniteNumber,
} from "@/components/cours-en-ligne/examens-blancs-utils";
import { mergePassageSiblingRows, isExamAttemptPublicationPending } from "@/components/cours-en-ligne/exam-helpers";
import { useLiveExamens, fetchLiveExamens } from "@/components/cours-en-ligne/useLiveExamens";
import { archiverExamenBlancAdmin, idsResultatsLegacyArchives } from "@/lib/examResetAdmin";
import { isAfterExamReset, latestExamResetCutoffs } from "@/lib/examResetCutoff";
import { composeSubjectPanel } from '@/lib/examSubjectPanel';
import { ResetMatiereAdminButton } from "./ResetMatiereAdminButton";
import HistoriqueCopiesMatiere from "./HistoriqueCopiesMatiere";
import { fetchCoreMatiereStates } from "@/lib/coreExamPublication";
import { fetchPassagesV2NonFiables } from "@/lib/passagesV2NonFiables";
import { attacherSourceUnique } from "@/lib/noteExamenAffichee";
import { useCoreChangeTick } from "@/hooks/useCoreChangeTick";

// Repli statique uniquement (si le chargement de la version enregistrée échoue).
const STATIC_EXAMENS_BLANCS = [
  ...EXAMENS_BLANCS_VTC,
  ...EXAMENS_BLANCS_TAXI,
  ...EXAMENS_BLANCS_TA,
  ...EXAMENS_BLANCS_VA,
];

import { readSubjectResetContext } from '@/lib/adminSubjectReset';
function SubjectPanelStatus({account,exam,subject}:{account:string;exam:string;subject:string}) {
 const {data,error}=useQuery({queryKey:['subject-reset-context',account,exam,subject],queryFn:()=>readSubjectResetContext(account,exam,subject),retry:false});
 const labels={non_commencee:'Non commencée',en_cours:'En cours',en_attente:'En attente',notee:'Résultat conservé',ambigu:'À vérifier'};
 return <span className="text-xs text-muted-foreground" title={data?.reason ?? undefined}>{error?'Lecture indisponible':data?.authorization_id?'À refaire':data?labels[data.status]:'Vérification…'}</span>;
}
interface ExamensBlancsResetTabProps {
  apprenant: {
    id: string;
    nom: string;
    prenom: string;
  };
}

interface ExamenResult {
  result_id: string;
  quiz_id: string;
  matiere_id: string;
  matiere_nom: string;
  score_obtenu: number;
  score_max: number;
  completed_at: string;
  reponses?: Record<string, any> | null;
  correctionsIA?: any;
  /** Contenu brut `details` (contient le snapshot figé de la tentative). */
  details?: any;
  __core?: any;
}

interface ExamenGroup {
  examenNum: number;
  examenLabel: string;
  type: string;
  quizId: string;
  results: ExamenResult[];
  totalScore: number;
  totalMax: number;
  lastDate: string;
  /** True if this group was detected from in-progress reponses only (no quiz_results) */
  inProgressOnly?: boolean;
  /** exercice_ids found in reponses_apprenants for this exam (for cleanup) */
  inProgressExerciceIds?: string[];
}

function parseExamenInfo(quizId: string): { num: number; type: string } {
  const lower = quizId.toLowerCase();
  const match = lower.match(/eb(\d+)(?:-(vtc|taxi|ta|va))?/);
  if (!match) return { num: 0, type: "vtc" };
  return { num: parseInt(match[1]), type: match[2] || "vtc" };
}

function typeLabel(type: string): string {
  switch (type) {
    case "vtc": return "VTC";
    case "taxi": return "TAXI";
    case "ta": return "TA";
    case "va": return "VA";
    default: return type.toUpperCase();
  }
}

export default function ExamensBlancsResetTab({ apprenant }: ExamensBlancsResetTabProps) {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<{ group: ExamenGroup; matiere?: ExamenResult } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  // Définitions ACTUELLES enregistrées (identiques à l'espace apprenant).
  const { examens: examensActuels } = useLiveExamens();
  const coreTick = useCoreChangeTick(apprenant.id);

  const { data: examGroups = [], isLoading } = useQuery({
    queryKey: ["examen-blanc-results-admin", apprenant.id, coreTick],
    queryFn: async () => {
      const examensDefs = await fetchLiveExamens().catch(() => STATIC_EXAMENS_BLANCS);
      // 1. Load completed quiz results
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("*")
        .eq("apprenant_id", apprenant.id)
        .eq("quiz_type", "examen_blanc");

      if (error) throw error;

      const { data: resetRows, error: resetError } = await supabase
        .from("core_exam_resets")
        .select("exam_id, cutoff_at, archived_legacy_result_ids")
        .eq("apprenant_id", apprenant.id);
      if (resetError) throw resetError;
      const archivedLegacyIds = idsResultatsLegacyArchives(resetRows);
      const resetCutoffs = latestExamResetCutoffs(resetRows);
      const coreStates = await fetchCoreMatiereStates(apprenant.id);
      const nonFiables = coreStates === null ? null
        : await fetchPassagesV2NonFiables(new Map([[apprenant.id, coreStates]]));

      // Group rows by quiz_id, then dedupe per matière via selectLatestAttemptRows
      // (same logic as ExamenBlancsListe.tsx côté élève) so admin & student agree.
      const rowsByQuiz = new Map<string, any[]>();
      for (const row of (data || [])) {
        if (!row?.quiz_id || archivedLegacyIds.has(String(row.id))) continue;
        if (!rowsByQuiz.has(row.quiz_id)) rowsByQuiz.set(row.quiz_id, []);
        rowsByQuiz.get(row.quiz_id)!.push(row);
      }

      const grouped = new Map<string, ExamenGroup>();
      for (const [quizId, quizRows] of rowsByQuiz) {
        const latestRows = selectLatestAttemptRows(mergePassageSiblingRows(quizRows));
        const { num, type } = parseExamenInfo(quizId);
        const key = `${num}-${type}`;
        for (const row of latestRows) {
          // Auto-recover corrupted score rows using details.reponses (same as student side)
          const recovered = recoverCorruptedScoreRow(row, examensDefs as any);
          const scoreSource = recovered && recovered.score_obtenu > toFiniteNumber(row.score_obtenu, 0)
            ? { ...row, ...recovered }
            : row;

          const result: ExamenResult = {
            result_id: row.id,
            quiz_id: row.quiz_id,
            matiere_id: scoreSource.matiere_id ?? "unknown",
            matiere_nom: scoreSource.matiere_nom ?? "Matière inconnue",
            score_obtenu: toFiniteNumber(scoreSource.score_obtenu, 0),
            score_max: toFiniteNumber(scoreSource.score_max, 0),
            completed_at: scoreSource.completed_at,
            reponses: (row as any).details?.reponses ?? null,
            correctionsIA: (row as any).details?.correctionsIA ?? null,
            details: (row as any).details ?? null,
            __core: attacherSourceUnique(row, coreStates, nonFiables).__core,
          };

          const existing = grouped.get(key);
          if (existing) {
            existing.results.push(result);
            existing.totalScore += result.score_obtenu;
            existing.totalMax += result.score_max;
            if (result.completed_at && result.completed_at > existing.lastDate) {
              existing.lastDate = result.completed_at;
            }
          } else {
            grouped.set(key, {
              examenNum: num,
              examenLabel: `Examen Blanc ${num} — ${typeLabel(type)}`,
              type,
              quizId: row.quiz_id,
              results: [result],
              totalScore: result.score_obtenu,
              totalMax: result.score_max,
              lastDate: result.completed_at ?? "",
            });
          }
        }
      }

      // 2. Also detect in-progress exams from reponses_apprenants (no quiz_results yet)
      const { data: inProgressData } = await supabase
        .from("reponses_apprenants")
        .select("exercice_id, updated_at, completed")
        .eq("apprenant_id", apprenant.id)
        .like("exercice_id", "EB%");

      if (inProgressData && inProgressData.length > 0) {
        // Group by exam ID (e.g. "EB6" from "EB6_t3p")
        const inProgressByExam = new Map<string, { exerciceIds: string[]; lastDate: string }>();
        for (const row of inProgressData) {
          const parts = (row.exercice_id ?? "").split("_");
          const examPart = parts[0] ?? ""; // e.g. "EB6"
          if (!isAfterExamReset(row.updated_at, resetCutoffs[examPart])) continue;
          const existing = inProgressByExam.get(examPart);
          const date = row.updated_at ?? "";
          if (existing) {
            existing.exerciceIds.push(row.exercice_id);
            if (date > existing.lastDate) existing.lastDate = date;
          } else {
            inProgressByExam.set(examPart, { exerciceIds: [row.exercice_id], lastDate: date });
          }
        }

        for (const [examPart, info] of inProgressByExam) {
          const { num, type } = parseExamenInfo(examPart);
          const key = `${num}-${type}`;
          // Only add if not already present from quiz_results
          if (!grouped.has(key)) {
            const matiereNames = info.exerciceIds.map(eid => {
              const matId = eid.split("_").slice(1).join("_");
              return matId || "inconnue";
            });
            grouped.set(key, {
              examenNum: num,
              examenLabel: `Examen Blanc ${num} — ${typeLabel(type)}`,
              type,
              quizId: examPart,
              results: [],
              totalScore: 0,
              totalMax: 0,
              lastDate: info.lastDate,
              inProgressOnly: true,
              inProgressExerciceIds: info.exerciceIds,
            });
          } else {
            // Merge exercice IDs for cleanup
            const existing = grouped.get(key)!;
            existing.inProgressExerciceIds = [
              ...(existing.inProgressExerciceIds || []),
              ...info.exerciceIds.filter(eid => {
                // Don't duplicate exercice_ids already covered by results
                const matId = eid.split("_").slice(1).join("_");
                return !existing.results.some(r => r.matiere_id === matId);
              }),
            ];
          }
        }
      }

      return Array.from(grouped.values()).sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.examenNum - b.examenNum;
      });
    },
    enabled: !!apprenant.id,
  });

  const toggleExpand = (key: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleReset = async (group: ExamenGroup, matiere?: ExamenResult) => {
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Session expirée"); return; }

      if (matiere) {
        // Aucun circuit serveur d'archivage administratif par matière n'existe
        // encore. On conserve donc tout plutôt que de supprimer une copie.
        toast.info("Le reset destructif par matière est désactivé. Utilisez le repassage sécurisé depuis l’espace élève : les anciennes réponses et notes sont conservées.");
        return;
      }

      const quizIds = [...new Set([
        ...group.results.map((r) => r.quiz_id),
        group.quizId,
      ].filter(Boolean))];
      await archiverExamenBlancAdmin({
        apprenantId: apprenant.id,
        examIds: quizIds,
        motif: `Remise à zéro admin ${group.examenLabel} pour ${apprenant.prenom} ${apprenant.nom}`,
        adminEmail: user.email,
      });

      toast.success(`${group.examenLabel} archivé pour ${apprenant.prenom} ${apprenant.nom} : les anciennes copies et notes sont conservées.`);
      queryClient.invalidateQueries({ queryKey: ["examen-blanc-results-admin", apprenant.id] });
    } catch (err: any) {
      console.error("Erreur archivage examen blanc:", err);
      toast.error(err?.message || "Erreur lors de la remise à zéro");
    } finally {
      setResetting(false);
      setConfirmTarget(null);
    }
  };

  const confirmLabel = confirmTarget?.matiere
    ? confirmTarget.matiere.matiere_nom
    : confirmTarget?.group.examenLabel;

  const confirmDescription = confirmTarget?.matiere
    ? `la matière "${confirmTarget.matiere.matiere_nom}" de l'${confirmTarget.group.examenLabel}`
    : confirmTarget?.group.inProgressOnly
      ? `les réponses en cours de l'${confirmTarget?.group.examenLabel}`
      : `toutes les ${confirmTarget?.group.results.length} matière(s) de l'${confirmTarget?.group.examenLabel}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Examens blancs — Remise à zéro
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Archivez un examen blanc de <strong>{apprenant.prenom} {apprenant.nom}</strong> pour autoriser un nouveau passage.
          Les copies, réponses et notes anciennes sont conservées ; l'action est tracée pour la conformité Qualiopi.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : examGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Aucun résultat d'examen blanc trouvé pour cet apprenant.
          </p>
        ) : (
          <div className="space-y-3">
            {examGroups.map((group) => {
              const key = `${group.examenNum}-${group.type}`;
              const expanded = expandedExams.has(key);

              // Recalcul EN DIRECT à partir de details.reponses + définition actuelle
              // des questions — même mécanisme que ExamenBlancsListe.tsx. Ne jamais
              // se fier à note_sur_20 / (score_obtenu / score_max) figés en base.
              const examenDef = examensActuels.find((e) => e.id === group.quizId);
              const panelRows = composeSubjectPanel(examenDef?.matieres ?? [],group.results);
              const scoresWithLookup = group.results.map((r) => ({
                matiere_id: r.matiere_id,
                matiere_nom: r.matiere_nom,
                note_sur_20: r.score_max > 0 ? (r.score_obtenu / r.score_max) * 20 : 0,
                score_obtenu: r.score_obtenu,
                score_max: r.score_max,
                completed_at: r.completed_at,
                lookupKeys: buildMatiereLookupKeys(r.matiere_id, r.matiere_nom),
                reponses: r.reponses ?? null,
                correctionsIA: r.correctionsIA ?? null,
                details: (r as any).details ?? null,
                __core: r.__core,
              }));
              const bilanExamen = examenDef
                ? computeMoyenneExamen(examenDef, (m) => {
                    const row = findScoreForMatiere(scoresWithLookup as any, m);
                    if (!row) return null;
                    return computeMatiereScoreForAttempt(m, {
                      details: (row as any).details ?? { reponses: (row as any).reponses, correctionsIA: (row as any).correctionsIA },
                      score_obtenu: row.score_obtenu,
                      score_max: row.score_max,
                      note_sur_20: (row as any).note_sur_20,
                      __core: row.__core,
                    });
                  })
                : null;
              const noteGlobale = bilanExamen?.hasScores
                ? bilanExamen.moyenne.toFixed(1)
                : group.totalMax > 0
                  ? ((group.totalScore / group.totalMax) * 20).toFixed(1)
                  : "0";
              const publicationPending = isExamAttemptPublicationPending(group.results, examenDef);

              return (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div
                      className="flex-1 cursor-pointer flex items-center gap-2"
                      onClick={() => toggleExpand(key)}
                    >
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          {group.examenLabel}
                          {group.inProgressOnly && (
                            <span className="inline-flex items-center gap-1 text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              En cours
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {!group.inProgressOnly && (
                            <>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {publicationPending ? "Note en attente de correction ou de vérification" : `Note : ${noteGlobale}/20`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {panelRows.length} matières · {group.results.length} avec résultat
                              </span>
                            </>
                          )}
                          {group.inProgressOnly && (
                            <span className="flex items-center gap-1">
                              {group.inProgressExerciceIds?.length ?? 0} matière(s) en cours
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {group.lastDate ? format(new Date(group.lastDate), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmTarget({ group })}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Remettre à zéro
                    </Button>
                  </div>

                  {expanded && (
                    <div className="border-t divide-y">
                      {!examenDef && <p role="alert" className="p-4 text-sm text-destructive">Composition officielle indisponible. Relisez avant toute action.</p>}
                      {panelRows.map(({subject: matiereDef,result:r})=>{
                        const recomputed=r ? computeMatiereScoreForAttempt(matiereDef,{
                          details:r.details ?? {reponses:r.reponses ?? null,correctionsIA:r.correctionsIA ?? null},
                          score_obtenu:r.score_obtenu,score_max:r.score_max,
                        }):null;
                        const note=r ? (recomputed ? recomputed.noteSur20.toFixed(1) : r.score_max>0 ? ((r.score_obtenu/r.score_max)*20).toFixed(1):"0"):null;
                        return <div key={matiereDef.id} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">{matiereDef.nom}</span>
                          <div className="flex flex-wrap items-center gap-3">
                            {note!==null && <span className="font-mono text-xs">{note}/20</span>}
                            <SubjectPanelStatus account={apprenant.id} exam={group.quizId} subject={matiereDef.id} />
                            <HistoriqueCopiesMatiere key={`${apprenant.id}-${group.quizId}-${matiereDef.id}`} account={apprenant.id} exam={group.quizId} subject={matiereDef.id} nom={matiereDef.nom} />
                            <ResetMatiereAdminButton target={{apprenantId:apprenant.id,prenom:apprenant.prenom,nom:apprenant.nom,
                              examId:group.quizId,examLabel:group.examenLabel,filiere:group.type,matiereId:matiereDef.id,matiereNom:matiereDef.nom,resultId:r?.result_id}}
                              onAuthorized={()=>void queryClient.invalidateQueries({queryKey:['subject-reset-context',apprenant.id,group.quizId,matiereDef.id]})} />
                          </div>
                        </div>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la remise à zéro</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment réinitialiser <strong>{confirmDescription}</strong> pour{" "}
              <strong>{apprenant.prenom} {apprenant.nom}</strong> ?
              <br /><br />
              Les anciennes copies, réponses et notes seront <strong>archivées et conservées</strong>.
              L'examen repartira sans l'ancienne progression, avec une nouvelle autorisation de passage.
              <br /><br />
              <em className="text-xs">L'archivage sera enregistré dans le journal d'audit (traçabilité Qualiopi/MCF).</em>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && handleReset(confirmTarget.group, confirmTarget.matiere)}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Confirmer la remise à zéro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
