import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Info, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tousLesExamens, type ExamenBlanc, type Matiere } from "@/components/cours-en-ligne/examens-blancs-data";
import { buildMatiereLookupKeys, getMatiereCanonicalKey, toFiniteNumber, normalizeNoteSur20 } from "@/components/cours-en-ligne/examens-blancs-utils";
import { computeMatiereScore, computeMatiereScoreFromReponses } from "@/components/cours-en-ligne/examens-blancs-scoring";
import { runExamensBlancsConsistencyCheck, type ExamConsistencyReport, type ConsistencyIssue } from "@/components/cours-en-ligne/examens-blancs-consistency";
import { toast } from "sonner";

interface ScanRow {
  apprenantNom: string;
  matiereNom: string;
  matiereId: string;
  scoreEnBase: number;
  noteSur20EnBase: number;
  coverage: number;
  answeredCount: number;
  currentQuestionCount: number;
  affected: boolean;
}

type Statut =
  | "ok"
  | "quiz_result_missing_but_response_completed"
  | "response_incomplete"
  | "response_missing"
  | "zero_score_corrupted"
  | "score_mismatch";

interface DiagRow {
  matiereId: string;
  matiereNom: string;
  quizResult: any | null;
  responseRow: any | null;
  responseAnsweredCount: number;
  responseTotal: number;
  statut: Statut;
  explication: string;
}

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type_apprenant: string | null;
  auth_user_id: string | null;
}

const STATUT_LABELS: Record<Statut, { label: string; color: string; icon: React.ReactNode }> = {
  ok: { label: "OK", color: "bg-emerald-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  quiz_result_missing_but_response_completed: {
    label: "Score jamais enregistré",
    color: "bg-red-500",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  response_incomplete: {
    label: "Réponses incomplètes",
    color: "bg-amber-500",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  response_missing: {
    label: "Matière non commencée",
    color: "bg-slate-400",
    icon: <Info className="w-3.5 h-3.5" />,
  },
  zero_score_corrupted: {
    label: "Score corrompu (0)",
    color: "bg-orange-500",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  score_mismatch: {
    label: "Score incohérent",
    color: "bg-orange-500",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const EXPLICATIONS: Record<Statut, string> = {
  ok: "Score correctement enregistré dans apprenant_quiz_results.",
  quiz_result_missing_but_response_completed:
    "L'apprenant a terminé la matière (réponses présentes et completed=true dans reponses_apprenants), mais AUCUNE ligne n'a été créée dans apprenant_quiz_results. Cause probable : coupure réseau au moment du submit, erreur RLS/permission sur le upsert, ou tablette qui a crashé avant que le fetch ne parte. Le fallback client compte bien la matière comme terminée, mais la note affichée sera 0. À recalculer depuis les réponses brutes.",
  response_incomplete:
    "L'apprenant a commencé la matière mais reponses_apprenants.completed = false. La sauvegarde du score n'est PAS déclenchée tant que « Terminer la matière » n'est pas cliqué.",
  response_missing:
    "Aucune ligne dans reponses_apprenants pour cette matière. L'apprenant ne l'a jamais ouverte, ou toutes ses sauvegardes ont échoué (session déconnectée, JWT expiré, edge function down).",
  zero_score_corrupted:
    "Ligne présente dans apprenant_quiz_results mais score_obtenu = 0 alors que des réponses non vides existent. Écriture partielle ou trigger protect_nonzero_quiz_score_on_update en cause. Auto-heal disponible.",
  score_mismatch:
    "score_obtenu > score_max ou note_sur_20 hors bornes. Barème modifié après enregistrement ou bug historique de scaling.",
};

export default function DiagnosticExamensBlancs() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [selectedApprenant, setSelectedApprenant] = useState<Apprenant | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState<DiagRow[] | null>(null);
  const [rawQuizRows, setRawQuizRows] = useState<any[]>([]);
  const [rawRepRows, setRawRepRows] = useState<any[]>([]);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [scanRows, setScanRows] = useState<ScanRow[] | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user?.id]);

  const exam: ExamenBlanc | undefined = useMemo(
    () => tousLesExamens.find((e) => e.id === selectedExamId),
    [selectedExamId],
  );

  const filteredExams = useMemo(() => {
    if (!selectedApprenant?.type_apprenant) return tousLesExamens;
    const t = selectedApprenant.type_apprenant.replace(/-e$/i, "").toUpperCase();
    return tousLesExamens.filter((e) => !e.id.startsWith("bilan-") && (t ? e.type === t : true));
  }, [selectedApprenant]);

  const handleSearchApprenants = async () => {
    const q = search.trim();
    if (q.length < 2) return;
    const { data } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, email, type_apprenant, auth_user_id")
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%`)
      .order("nom")
      .limit(15);
    setApprenants((data as any[]) || []);
  };

  const runDiagnostic = async () => {
    if (!selectedApprenant || !exam) return;
    setLoading(true);
    setDiag(null);
    try {
      const [{ data: qData }, { data: rData }] = await Promise.all([
        supabase
          .from("apprenant_quiz_results" as any)
          .select("id, matiere_id, matiere_nom, score_obtenu, score_max, note_sur_20, tentative, completed_at, created_at, details")
          .eq("apprenant_id", selectedApprenant.id)
          .eq("quiz_type", "examen_blanc")
          .eq("quiz_id", exam.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reponses_apprenants" as any)
          .select("id, exercice_id, reponses, completed, created_at, updated_at")
          .eq("apprenant_id", selectedApprenant.id)
          .eq("exercice_type", "examen_blanc")
          .like("exercice_id", `${exam.id}__%`),
      ]);

      const quizRows = (qData as any[]) || [];
      const repRows = (rData as any[]) || [];
      setRawQuizRows(quizRows);
      setRawRepRows(repRows);

      // Latest quiz row per matiere canonical key
      const latestQuiz = new Map<string, any>();
      quizRows.forEach((r) => {
        const key = getMatiereCanonicalKey(r.matiere_id, r.matiere_nom);
        const prev = latestQuiz.get(key);
        if (!prev || new Date(r.created_at) > new Date(prev.created_at)) latestQuiz.set(key, r);
      });

      // Reponse per matiere key (from exercice_id suffix)
      const repByMatiereKey = new Map<string, any>();
      repRows.forEach((r) => {
        const suffix = String(r.exercice_id || "").split("__")[1] || "";
        const key = suffix.split("__t")[0].toLowerCase();
        if (!key) return;
        const prev = repByMatiereKey.get(key);
        if (!prev || new Date(r.updated_at || r.created_at) > new Date(prev.updated_at || prev.created_at)) {
          repByMatiereKey.set(key, r);
        }
      });

      const rows: DiagRow[] = exam.matieres.map((m: Matiere) => {
        const canonicalKey = getMatiereCanonicalKey(m.id, m.nom);
        const lookupKeys = buildMatiereLookupKeys(m.id, m.nom);
        // Find quiz row by canonical or lookup match
        let quizRow: any = latestQuiz.get(canonicalKey) || null;
        if (!quizRow) {
          for (const [k, v] of latestQuiz.entries()) {
            if (lookupKeys.includes(k)) { quizRow = v; break; }
          }
        }
        const repRow = repByMatiereKey.get(String(m.id).toLowerCase()) || null;

        const answered = repRow?.reponses
          ? Object.values(repRow.reponses).filter((v) => {
              if (v == null) return false;
              if (Array.isArray(v)) return v.length > 0;
              return String(v).trim() !== "";
            }).length
          : 0;
        const total = (m.questions || []).length;

        let statut: Statut = "ok";
        if (!quizRow) {
          if (repRow?.completed) statut = "quiz_result_missing_but_response_completed";
          else if (repRow) statut = "response_incomplete";
          else statut = "response_missing";
        } else {
          const so = toFiniteNumber(quizRow.score_obtenu, 0);
          const sm = toFiniteNumber(quizRow.score_max, 0);
          if (so <= 0 && answered > 0) statut = "zero_score_corrupted";
          else if (sm > 0 && (so < 0 || so > sm)) statut = "score_mismatch";
          else statut = "ok";
        }

        return {
          matiereId: m.id,
          matiereNom: m.nom,
          quizResult: quizRow,
          responseRow: repRow,
          responseAnsweredCount: answered,
          responseTotal: total,
          statut,
          explication: EXPLICATIONS[statut],
        };
      });

      setDiag(rows);
    } finally {
      setLoading(false);
    }
  };

  const runGlobalScan = async () => {
    if (!exam) return;
    setScanning(true);
    setScanRows(null);
    try {
      const { data: quizRows } = await supabase
        .from("apprenant_quiz_results" as any)
        .select("id, apprenant_id, matiere_id, matiere_nom, score_obtenu, score_max, note_sur_20, tentative, completed_at, created_at, details")
        .eq("quiz_type", "examen_blanc")
        .eq("quiz_id", exam.id);

      const rows = (quizRows as any[]) || [];
      if (rows.length === 0) {
        setScanRows([]);
        return;
      }

      // Latest attempt per (apprenant, matiere)
      const latestByKey = new Map<string, any>();
      rows.forEach((r) => {
        const key = `${r.apprenant_id}__${getMatiereCanonicalKey(r.matiere_id, r.matiere_nom)}`;
        const prev = latestByKey.get(key);
        if (!prev || new Date(r.created_at) > new Date(prev.created_at)) latestByKey.set(key, r);
      });

      const apprenantIds = [...new Set([...latestByKey.values()].map((r) => r.apprenant_id))];
      const { data: apprenantsData } = await supabase
        .from("apprenants")
        .select("id, nom, prenom")
        .in("id", apprenantIds);
      const nomById = new Map(((apprenantsData as any[]) || []).map((a) => [a.id, `${a.nom} ${a.prenom}`]));

      const result: ScanRow[] = [];
      for (const row of latestByKey.values()) {
        const matiere = exam.matieres.find(
          (m) => m.id === row.matiere_id || m.nom === row.matiere_nom,
        );
        if (!matiere) continue;
        const reponses = row.details?.reponses;
        const answeredCount = reponses ? Object.keys(reponses).length : 0;
        if (answeredCount === 0) continue; // nothing to compare

        const questionsSafe = (matiere.questions ?? []).filter((q) => q != null && q?.type != null);
        const matchedCount = questionsSafe.filter((q) => {
          const rep = reponses[q.id] ?? reponses[String(q.id)];
          if (rep === undefined || rep === null) return false;
          if (Array.isArray(rep)) return rep.length > 0;
          if (typeof rep === "string") return rep.trim() !== "";
          return true;
        }).length;
        const coverage = questionsSafe.length > 0 ? matchedCount / questionsSafe.length : 0;

        result.push({
          apprenantNom: nomById.get(row.apprenant_id) || row.apprenant_id,
          matiereNom: row.matiere_nom || matiere.nom,
          matiereId: row.matiere_id,
          scoreEnBase: toFiniteNumber(row.score_obtenu, 0),
          noteSur20EnBase: toFiniteNumber(row.note_sur_20, 0),
          coverage,
          answeredCount,
          currentQuestionCount: questionsSafe.length,
          affected: coverage < 0.5,
        });
      }

      result.sort((a, b) => (a.affected === b.affected ? 0 : a.affected ? -1 : 1));
      setScanRows(result);
    } finally {
      setScanning(false);
    }
  };

  const handleRepair = async (row: DiagRow) => {
    if (!selectedApprenant || !exam || !row.responseRow?.reponses) return;
    const matiere = exam.matieres.find((m) => m.id === row.matiereId);
    if (!matiere) return;
    if (!selectedApprenant.auth_user_id) {
      toast.error("Cet apprenant n'a pas de compte utilisateur lié (auth_user_id manquant) — réparation impossible.");
      return;
    }

    setRepairingId(row.matiereId);
    try {
      const score = computeMatiereScore(matiere, row.responseRow.reponses);
      if (!score) {
        toast.error(`Impossible de recalculer le score pour ${row.matiereNom} (réponses insuffisantes).`);
        return;
      }
      const { error } = await supabase
        .from("apprenant_quiz_results" as any)
        .upsert([{
          apprenant_id: selectedApprenant.id,
          user_id: selectedApprenant.auth_user_id,
          quiz_type: "examen_blanc",
          quiz_id: exam.id,
          quiz_titre: exam.titre,
          matiere_id: matiere.id,
          matiere_nom: matiere.nom,
          score_obtenu: score.scoreObtenu,
          score_max: score.scoreMax,
          note_sur_20: score.noteSur20,
          reussi: score.admis,
          details: { reponses: row.responseRow.reponses },
          tentative: row.quizResult?.tentative || 1,
        }] as any, { onConflict: "apprenant_id,quiz_id,matiere_id,tentative" } as any);

      if (error) {
        toast.error(`Échec de la réparation : ${error.message}`);
        return;
      }
      toast.success(`${row.matiereNom} réparée : ${score.scoreObtenu}/${score.scoreMax} (${score.noteSur20.toFixed(1)}/20).`);
      await runDiagnostic();
    } finally {
      setRepairingId(null);
    }
  };

  const summary = useMemo(() => {
    if (!diag) return null;
    const counts: Record<Statut, number> = {
      ok: 0, quiz_result_missing_but_response_completed: 0, response_incomplete: 0,
      response_missing: 0, zero_score_corrupted: 0, score_mismatch: 0,
    };
    diag.forEach((r) => counts[r.statut]++);
    return counts;
  }, [diag]);

  if (isAdmin === null) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card><CardContent className="p-6 text-center">
          <p className="text-lg font-semibold">Accès réservé aux administrateurs.</p>
          <Link to="/" className="text-primary underline mt-2 inline-block">Retour</Link>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button></Link>
        <h1 className="text-2xl font-bold">Diagnostic Examens Blancs</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Explique pourquoi un score n'apparaît pas dans <code>apprenant_quiz_results</code> pour un apprenant donné :
        transaction perdue, réponses manquantes, écriture partielle, etc.
      </p>

      <ConsistencyCheckCard />

      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle className="text-base">Scanner tous les élèves d'un examen</CardTitle>
          <p className="text-xs text-muted-foreground">
            Détecte, pour TOUS les élèves ayant passé cet examen, les matières où les réponses
            enregistrées ne correspondent plus aux questions actuelles (question supprimée/modifiée
            après coup) — sans avoir besoin de chercher élève par élève.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tousLesExamens.map((e) => (
              <Button
                key={e.id}
                size="sm"
                variant={selectedExamId === e.id ? "default" : "outline"}
                onClick={() => { setSelectedExamId(e.id); setScanRows(null); }}
              >
                {e.id} — {e.type}
              </Button>
            ))}
          </div>
          <Button disabled={!selectedExamId || scanning} onClick={runGlobalScan} className="gap-2">
            {scanning && <Loader2 className="w-4 h-4 animate-spin" />}
            Scanner tous les élèves de cet examen
          </Button>

          {scanRows && (
            <div className="space-y-2 pt-2">
              <p className="text-sm">
                {scanRows.filter((r) => r.affected).length > 0 ? (
                  <span className="text-red-600 font-semibold">
                    ⚠ {scanRows.filter((r) => r.affected).length} copie(s) affectée(s) sur {scanRows.length} scannée(s)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold">
                    ✅ Aucune copie affectée sur {scanRows.length} scannée(s)
                  </span>
                )}
              </p>
              {scanRows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élève</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead>Note en base</TableHead>
                      <TableHead>Correspondance</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanRows.map((r, i) => (
                      <TableRow key={i} className={r.affected ? "bg-red-50" : undefined}>
                        <TableCell className="text-xs font-medium">{r.apprenantNom}</TableCell>
                        <TableCell className="text-xs">{r.matiereNom}</TableCell>
                        <TableCell className="text-xs">{r.noteSur20EnBase.toFixed(1)}/20</TableCell>
                        <TableCell className="text-xs">
                          {Math.round(r.coverage * 100)}% ({r.answeredCount} réponses vs {r.currentQuestionCount} questions actuelles)
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.affected ? (
                            <Badge className="bg-red-500 text-white">Affectée — questions changées</Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-white">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Sélectionner l'apprenant</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nom, prénom ou email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchApprenants()}
            />
            <Button onClick={handleSearchApprenants}>Rechercher</Button>
          </div>
          {apprenants.length > 0 && (
            <div className="border rounded max-h-56 overflow-auto divide-y">
              {apprenants.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedApprenant?.id === a.id ? "bg-primary/10" : ""}`}
                  onClick={() => { setSelectedApprenant(a); setDiag(null); }}
                >
                  <div className="font-medium">{a.nom} {a.prenom}</div>
                  <div className="text-xs text-muted-foreground">{a.email} — {a.type_apprenant || "?"}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedApprenant && (
        <Card>
          <CardHeader><CardTitle className="text-base">2. Sélectionner l'examen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {filteredExams.map((e) => (
                <Button
                  key={e.id}
                  size="sm"
                  variant={selectedExamId === e.id ? "default" : "outline"}
                  onClick={() => { setSelectedExamId(e.id); setDiag(null); }}
                >
                  {e.id} — {e.type}
                </Button>
              ))}
            </div>
            <Button disabled={!selectedExamId || loading} onClick={runDiagnostic} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Lancer le diagnostic
            </Button>
          </CardContent>
        </Card>
      )}

      {diag && exam && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Résumé — {selectedApprenant?.nom} {selectedApprenant?.prenom} / {exam.id}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {summary && (Object.entries(summary) as [Statut, number][]).map(([k, v]) => v > 0 && (
                <Badge key={k} className={`${STATUT_LABELS[k].color} text-white gap-1`}>
                  {STATUT_LABELS[k].icon} {STATUT_LABELS[k].label} : {v}
                </Badge>
              ))}
              <div className="w-full text-xs text-muted-foreground mt-2">
                Lignes brutes chargées : {rawQuizRows.length} dans apprenant_quiz_results, {rawRepRows.length} dans reponses_apprenants.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Détail par matière</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>quiz_results</TableHead>
                    <TableHead>reponses</TableHead>
                    <TableHead>Explication</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diag.map((r) => (
                    <TableRow key={r.matiereId}>
                      <TableCell className="font-medium text-xs">
                        <div>{r.matiereId}</div>
                        <div className="text-muted-foreground">{r.matiereNom}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUT_LABELS[r.statut].color} text-white gap-1`}>
                          {STATUT_LABELS[r.statut].icon} {STATUT_LABELS[r.statut].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.quizResult ? (
                          <div>
                            <div>{toFiniteNumber(r.quizResult.score_obtenu, 0)} / {toFiniteNumber(r.quizResult.score_max, 0)}</div>
                            <div className="text-muted-foreground">
                              note20 = {normalizeNoteSur20(r.quizResult.score_obtenu, r.quizResult.score_max, r.quizResult.note_sur_20).toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">t{r.quizResult.tentative} · {new Date(r.quizResult.completed_at || r.quizResult.created_at).toLocaleString("fr-FR")}</div>
                          </div>
                        ) : (
                          <span className="text-red-600 font-semibold">Aucune ligne</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.responseRow ? (
                          <div>
                            <div>{r.responseAnsweredCount} / {r.responseTotal} répondues</div>
                            <div className={r.responseRow.completed ? "text-emerald-600" : "text-amber-600"}>
                              completed = {String(r.responseRow.completed)}
                            </div>
                            <div className="text-muted-foreground">{new Date(r.responseRow.updated_at || r.responseRow.created_at).toLocaleString("fr-FR")}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">Aucune ligne</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-md">{r.explication}</TableCell>
                      <TableCell>
                        {(r.statut === "quiz_result_missing_but_response_completed" || r.statut === "zero_score_corrupted") && r.responseRow?.reponses ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={repairingId === r.matiereId}
                            onClick={() => handleRepair(r)}
                            className="gap-2"
                          >
                            {repairingId === r.matiereId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Réparer
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Causes historiques identifiées</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>« Score jamais enregistré »</strong> — Le upsert vers <code>apprenant_quiz_results</code> depuis <code>handleTerminerMatiere → saveMatiereResult</code> a échoué (3 retries épuisés) : réseau coupé, JWT expiré, ou tablette fermée avant que le fetch ne parte. Depuis le fix « instant-save », <code>reponses_apprenants</code> est presque toujours sauvegardé, ce qui explique pourquoi la matière est marquée « terminée » côté fallback mais sans note.</p>
              <p><strong>« Score corrompu (0) »</strong> — Une ancienne écriture a mis <code>score_obtenu=0</code> alors que des réponses valides existent. Le trigger <code>protect_nonzero_quiz_score_on_update</code> empêche désormais l'écrasement, et l'auto-heal côté client recalcule au chargement des résultats.</p>
              <p><strong>« Réponses incomplètes »</strong> — L'apprenant a ouvert la matière mais n'a pas cliqué « Terminer la matière » : le calcul de score n'est jamais déclenché. Vérifier le timer / une déconnexion pendant la matière.</p>
              <p><strong>« Matière non commencée »</strong> — Aucune trace dans <code>reponses_apprenants</code>. L'apprenant ne l'a jamais ouverte, OU toutes les sauvegardes ont échoué dès le début (edge function down / session invalide).</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
