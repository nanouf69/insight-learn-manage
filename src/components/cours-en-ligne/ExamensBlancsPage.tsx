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
  FileText, Timer, Trophy, RotateCcw, ChevronRight, BookOpen, Pencil
} from "lucide-react";
import { tousLesExamens, type ExamenBlanc, type Matiere, type Question } from "./examens-blancs-data";
import ExamensBlancsEditor from "./ExamensBlancsEditor";

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

interface ResultatMatiere {
  matiereId: string;
  nomMatiere: string;
  noteObtenue: number;
  noteSur: number;
  noteEliminatoire: number;
  coefficient: number;
  admis: boolean;
  reponses: Reponses;
}

// ===== ÉCRAN DE SÉLECTION =====
function EcranSelection({ onStart, onEdit }: { onStart: (examen: ExamenBlanc) => void; onEdit: () => void }) {
  const [typeFiltre, setTypeFiltre] = useState<"tous" | "TAXI" | "VTC">("tous");

  const examens = tousLesExamens.filter(e =>
    typeFiltre === "tous" || e.type === typeFiltre
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Examens Blancs</h2>
          <p className="text-muted-foreground text-sm">
            Entraînez-vous avec les 12 examens blancs officiels — 6 TAXI et 6 VTC. Chaque examen comporte 7 matières chronométrées.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 shrink-0">
          <Pencil className="w-4 h-4" />
          Modifier les examens
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(["tous", "TAXI", "VTC"] as const).map(t => (
          <Button
            key={t}
            variant={typeFiltre === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFiltre(t)}
          >
            {t === "tous" ? "Tous" : t}
          </Button>
        ))}
      </div>

      {/* Grille des examens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examens.map(examen => {
          const totalQuestions = examen.matieres.reduce((acc, m) => acc + m.questions.length, 0);
          const dureeTotal = examen.matieres.reduce((acc, m) => acc + m.duree, 0);
          return (
            <Card key={examen.id} className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={examen.type === "TAXI" ? "default" : "secondary"} className="text-xs">
                    {examen.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">N°{examen.numero}</span>
                </div>
                <CardTitle className="text-base mt-2">{examen.titre}</CardTitle>
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
                    <span>7 matières</span>
                  </div>
                </div>

                {/* Matières */}
                <div className="space-y-1">
                  {examen.matieres.map(m => (
                    <div key={m.id} className="flex justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-2">{m.nom.split(" - ")[0]}</span>
                      <span className="shrink-0">{m.duree}min</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full mt-2 gap-2" onClick={() => onStart(examen)}>
                  Commencer l'examen
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
}: {
  matiere: Matiere;
  numero: number;
  total: number;
  onTerminer: (reponses: Reponses) => void;
}) {
  const [reponses, setReponses] = useState<Reponses>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [expire, setExpire] = useState(false);

  const question = matiere.questions[questionIndex];
  const dureeSecondes = matiere.duree * 60;

  const handleQCMChange = (qId: number, lettre: string, checked: boolean, isMultiple: boolean) => {
    setReponses(prev => {
      const current = (prev[qId] as string[]) || [];
      if (!isMultiple) {
        return { ...prev, [qId]: [lettre] };
      }
      if (checked) {
        return { ...prev, [qId]: [...current, lettre] };
      } else {
        return { ...prev, [qId]: current.filter(l => l !== lettre) };
      }
    });
  };

  const handleQRCChange = (qId: number, val: string) => {
    setReponses(prev => ({ ...prev, [qId]: val }));
  };

  const handleTerminer = () => onTerminer(reponses);
  const handleExpire = () => { setExpire(true); onTerminer(reponses); };

  const isMultiple = (q: Question) =>
    q.type === "QCM" && (q.choix?.filter(c => c.correct).length || 0) > 1;

  const progress = ((questionIndex + 1) / matiere.questions.length) * 100;

  return (
    <div className="space-y-4">
      {/* En-tête matière */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Matière {numero}/{total}</p>
          <h3 className="font-semibold text-base">{matiere.nom}</h3>
        </div>
        <TimerBadge seconds={dureeSecondes} onExpire={handleExpire} />
      </div>

      {/* Progression questions */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {questionIndex + 1} / {matiere.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card className="border-2 border-primary/10">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Badge variant={question.type === "QRC" ? "secondary" : "outline"} className="shrink-0 mt-0.5">
                {question.type}
              </Badge>
              <p className="font-medium leading-relaxed">{question.enonce}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold text-primary border-primary/40">
              {(matiere.noteSur / matiere.questions.length).toFixed(2)} pt{matiere.noteSur / matiere.questions.length > 1 ? "s" : ""}
            </Badge>
          </div>

          {question.type === "QCM" && question.choix && (
            <div className="space-y-2 ml-2">
              {isMultiple(question) && (
                <p className="text-xs text-muted-foreground italic">Plusieurs réponses possibles</p>
              )}
              {isMultiple(question) ? (
                question.choix.map(choix => {
                  const checked = ((reponses[question.id] as string[]) || []).includes(choix.lettre);
                  return (
                    <div key={choix.lettre} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}
                      onClick={() => handleQCMChange(question.id, choix.lettre, !checked, true)}>
                      <Checkbox checked={checked} onCheckedChange={(c) => handleQCMChange(question.id, choix.lettre, !!c, true)} />
                      <span className="font-mono text-sm font-bold w-6 shrink-0">{choix.lettre})</span>
                      <span className="text-sm">{choix.texte}</span>
                    </div>
                  );
                })
              ) : (
                <RadioGroup
                  value={((reponses[question.id] as string[]) || [])[0] || ""}
                  onValueChange={(val) => handleQCMChange(question.id, val, true, false)}
                >
                  {question.choix.map(choix => {
                    const selected = ((reponses[question.id] as string[]) || [])[0] === choix.lettre;
                    return (
                      <div key={choix.lettre} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}>
                        <RadioGroupItem value={choix.lettre} id={`q${question.id}-${choix.lettre}`} />
                        <Label htmlFor={`q${question.id}-${choix.lettre}`} className="flex items-center gap-2 cursor-pointer w-full">
                          <span className="font-mono text-sm font-bold w-6 shrink-0">{choix.lettre})</span>
                          <span className="text-sm">{choix.texte}</span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>
          )}

          {question.type === "QRC" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Rédigez votre réponse ci-dessous :</p>
              <Textarea
                placeholder="Votre réponse..."
                rows={4}
                value={(reponses[question.id] as string) || ""}
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
          disabled={questionIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Précédente
        </Button>

        <div className="flex gap-1">
          {matiere.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setQuestionIndex(i)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${i === questionIndex ? "bg-primary text-primary-foreground" : reponses[matiere.questions[i].id] !== undefined ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {questionIndex < matiere.questions.length - 1 ? (
          <Button onClick={() => setQuestionIndex(i => i + 1)} className="gap-2">
            Suivante
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleTerminer} className="gap-2 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Terminer la matière
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== RÉSULTATS =====
function EcranResultats({
  examen,
  resultats,
  onRecommencer,
  onRetour,
}: {
  examen: ExamenBlanc;
  resultats: ResultatMatiere[];
  onRecommencer: () => void;
  onRetour: () => void;
}) {
  // Calcul note globale pondérée
  const totalCoef = resultats.reduce((acc, r) => acc + r.coefficient, 0);
  const noteGlobale = resultats.reduce((acc, r) => acc + (r.noteObtenue / r.noteSur * 20) * r.coefficient, 0) / totalCoef;
  const admisGlobal = noteGlobale >= 10 && resultats.every(r => r.admis);

  return (
    <div className="space-y-6">
      {/* Header résultats */}
      <div className={`rounded-xl p-6 text-center ${admisGlobal ? "bg-green-50 border-2 border-green-300" : "bg-red-50 border-2 border-red-300"}`}>
        {admisGlobal ? (
          <Trophy className="w-12 h-12 text-green-600 mx-auto mb-2" />
        ) : (
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
        )}
        <h3 className="text-2xl font-bold mb-1">
          {admisGlobal ? "Admis(e) ✅" : "Non admis(e) ❌"}
        </h3>
        <p className="text-4xl font-black mt-2">
          {noteGlobale.toFixed(1)} / 20
        </p>
        <p className="text-sm text-muted-foreground mt-1">{examen.titre}</p>
      </div>

      {/* Détail par matière */}
      <div className="space-y-3">
        <h4 className="font-semibold">Résultats par matière</h4>
        {resultats.map(r => (
          <Card key={r.matiereId} className={`border-l-4 ${r.admis ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.nomMatiere}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Coeff. {r.coefficient}</span>
                    <span className="text-xs text-muted-foreground">Min. {r.noteEliminatoire}/{r.noteSur}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${r.admis ? "text-green-600" : "text-red-600"}`}>
                    {r.noteObtenue.toFixed(1)} / {r.noteSur}
                  </span>
                  {r.admis ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              <Progress
                value={(r.noteObtenue / r.noteSur) * 100}
                className={`h-1.5 mt-2 ${r.admis ? "[&>*]:bg-green-500" : "[&>*]:bg-red-500"}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Correction détaillée */}
      <div className="space-y-4">
        <h4 className="font-semibold">Correction détaillée</h4>
        {examen.matieres.map((matiere, mi) => {
          const resultat = resultats[mi];
          if (!resultat) return null;
          return (
            <Card key={matiere.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{matiere.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matiere.questions.map(q => {
                  const rep = resultat.reponses[q.id];
                  let isCorrect = false;

                  if (q.type === "QCM" && q.choix) {
                    const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
                    const donnees = ((rep as string[]) || []).sort();
                    isCorrect = JSON.stringify(correctes) === JSON.stringify(donnees);
                  } else if (q.type === "QRC") {
                    // Pour QRC : correction auto basique par mots-clés
                    const repStr = ((rep as string) || "").toLowerCase();
                    const motsCles = q.reponses_possibles || [];
                    isCorrect = motsCles.some(mc => repStr.includes(mc.toLowerCase()));
                  }

                  return (
                    <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium">{q.id}. {q.enonce}</p>
                            <span className={`text-xs font-bold shrink-0 px-1.5 py-0.5 rounded ${isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                              {isCorrect ? "+" : "0"}{(matiere.noteSur / matiere.questions.length).toFixed(2)} pt
                            </span>
                          </div>

                          {q.type === "QCM" && (
                            <div className="mt-1 space-y-0.5">
                              {(q.choix || []).map(c => (
                                <div key={c.lettre} className={`text-xs flex items-center gap-1 ${c.correct ? "text-green-700 font-semibold" : "text-muted-foreground"}`}>
                                  <span>{c.lettre})</span>
                                  <span>{c.texte}</span>
                                  {c.correct && <span className="text-green-600">✓</span>}
                                </div>
                              ))}
                              {rep && (
                                <p className="text-xs mt-1 italic text-muted-foreground">
                                  Votre réponse : {(rep as string[]).join(", ") || "Aucune"}
                                </p>
                              )}
                            </div>
                          )}

                          {q.type === "QRC" && (
                            <div className="mt-1 space-y-1">
                              {rep && (
                                <p className="text-xs italic text-muted-foreground">
                                  Votre réponse : {(rep as string) || "Aucune"}
                                </p>
                              )}
                              <p className="text-xs text-green-700 font-medium">
                                Réponse attendue : {q.reponseQRC}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

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

// ===== COMPOSANT PRINCIPAL =====
export default function ExamensBlancsPage() {
  const [phase, setPhase] = useState<"selection" | "intro" | "examen" | "resultats" | "edition">("selection");
  const [examenChoisi, setExamenChoisi] = useState<ExamenBlanc | null>(null);
  const [matiereIndex, setMatiereIndex] = useState(0);
  const [tousResultats, setTousResultats] = useState<ResultatMatiere[]>([]);

  const handleStart = (examen: ExamenBlanc) => {
    setExamenChoisi(examen);
    setMatiereIndex(0);
    setTousResultats([]);
    setPhase("intro");
  };

  const handleDebuterExamen = () => {
    setPhase("examen");
  };

  const calculerNote = (matiere: Matiere, reponses: Reponses): number => {
    let bonnes = 0;
    matiere.questions.forEach(q => {
      const rep = reponses[q.id];
      if (q.type === "QCM" && q.choix) {
        const correctes = q.choix.filter(c => c.correct).map(c => c.lettre).sort();
        const donnees = ((rep as string[]) || []).sort();
        if (JSON.stringify(correctes) === JSON.stringify(donnees)) bonnes++;
      } else if (q.type === "QRC") {
        const repStr = ((rep as string) || "").toLowerCase();
        const motsCles = q.reponses_possibles || [];
        if (motsCles.some(mc => repStr.includes(mc.toLowerCase()))) bonnes++;
      }
    });
    return (bonnes / matiere.questions.length) * matiere.noteSur;
  };

  const handleTerminerMatiere = (reponses: Reponses) => {
    if (!examenChoisi) return;
    const matiere = examenChoisi.matieres[matiereIndex];
    const note = calculerNote(matiere, reponses);
    const resultat: ResultatMatiere = {
      matiereId: matiere.id,
      nomMatiere: matiere.nom,
      noteObtenue: note,
      noteSur: matiere.noteSur,
      noteEliminatoire: matiere.noteEliminatoire,
      coefficient: matiere.coefficient,
      admis: note >= matiere.noteEliminatoire,
      reponses,
    };

    const newResultats = [...tousResultats, resultat];
    setTousResultats(newResultats);

    if (matiereIndex < examenChoisi.matieres.length - 1) {
      setMatiereIndex(i => i + 1);
    } else {
      setPhase("resultats");
    }
  };

  if (phase === "edition") {
    return <ExamensBlancsEditor onBack={() => setPhase("selection")} />;
  }

  if (phase === "selection") {
    return <EcranSelection onStart={handleStart} onEdit={() => setPhase("edition")} />;
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
            <Badge className="mx-auto mb-2 w-fit" variant={examenChoisi.type === "TAXI" ? "default" : "secondary"}>
              {examenChoisi.type}
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
                <li>Répondez à toutes les questions avant de valider la matière</li>
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
                      <th className="text-center p-2 font-medium">Coeff.</th>
                      <th className="text-center p-2 font-medium">Note élim.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examenChoisi.matieres.map((m, i) => (
                      <tr key={m.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        <td className="p-2 text-xs">{m.nom}</td>
                        <td className="p-2 text-center">{m.duree} min</td>
                        <td className="p-2 text-center">{m.coefficient}</td>
                        <td className="p-2 text-center text-red-600">{m.noteEliminatoire}/{m.noteSur}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-semibold bg-primary/5">
                      <td className="p-2">TOTAL</td>
                      <td className="p-2 text-center">{dureeTotal} min</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-center">Moy. ≥ 10/20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Button className="w-full gap-2 text-base py-5" onClick={handleDebuterExamen}>
              <Timer className="w-5 h-5" />
              Démarrer l'examen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "examen" && examenChoisi) {
    const matiere = examenChoisi.matieres[matiereIndex];
    return (
      <div className="max-w-3xl mx-auto space-y-4">
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
        />
      </div>
    );
  }

  return null;
}
