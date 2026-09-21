import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLiveChallengeState } from "@/hooks/useLiveChallengeState";
import {
  correctLiveResponse,
  createLiveSession,
  endLiveSession,
  fetchLiveSessions,
  updateLiveSession,
  type LiveQuestion,
  type LiveSession,
} from "@/lib/liveChallenge";

import {
  PILOTE_MATIERE,
  buildSnapshotFromSource,
  fetchVtcSourceQuizzes,
  type SourceQuiz,
} from "@/lib/liveChallengeSource";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ChallengeLive() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [titre, setTitre] = useState("Challenge en direct");
  const [creating, setCreating] = useState(false);
  const [projection, setProjection] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Source des questions (LECTURE SEULE) — pilote : une seule matiere VTC.
  const [sources, setSources] = useState<SourceQuiz[]>([]);
  const [matiere, setMatiere] = useState<string>(PILOTE_MATIERE);
  const [quizId, setQuizId] = useState<string>("");
  const [nombre, setNombre] = useState<string>("20");
  const [typeFiltre, setTypeFiltre] = useState<"tous" | "qcm" | "qrc">("tous");
  const [ordre, setOrdre] = useState<"origine" | "aleatoire">("origine");

  const { session, participants, responses, connected, refresh } = useLiveChallengeState(activeId);

  useEffect(() => {
    fetchVtcSourceQuizzes()
      .then(setSources)
      .catch(() => toast.error("Impossible de lire les questions VTC"));
  }, []);

  const matieres = useMemo(() => Array.from(new Set(sources.map((s) => s.matiere))), [sources]);
  const quizOfMatiere = useMemo(() => sources.filter((s) => s.matiere === matiere), [sources, matiere]);
  useEffect(() => {
    setQuizId(quizOfMatiere[0] ? String(quizOfMatiere[0].exerciceId) : "");
  }, [quizOfMatiere]);

  useEffect(() => {
    fetchLiveSessions()
      .then((rows) => {
        setSessions(rows);
        const running = rows.find((r) => r.statut !== "terminee");
        if (running) setActiveId(running.id);
      })
      .catch(() => toast.error("Impossible de charger les challenges"));
  }, []);

  const joinUrl = useMemo(
    () => (session ? `${window.location.origin}/challenge/${session.code}` : ""),
    [session],
  );

  useEffect(() => {
    if (!joinUrl) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(joinUrl, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [joinUrl]);

  const questions = session?.questions_snapshot ?? [];
  const currentIndex = session?.current_index ?? 0;
  const currentQuestion = questions[currentIndex];

  // Une reponse n'est jamais comptee deux fois : dedoublonnage par participant.
  const currentResponses = useMemo(() => {
    const byParticipant = new Map<string, (typeof responses)[number]>();
    responses
      .filter((r) => r.question_id === currentQuestion?.id)
      .forEach((r) => byParticipant.set(r.participant_id, r));
    return Array.from(byParticipant.values());
  }, [responses, currentQuestion?.id]);

  const answeredIds = new Set(currentResponses.map((r) => r.participant_id));
  const sansReponse = participants.filter((p) => !answeredIds.has(p.id));
  const bonnes = currentResponses.filter((r) => r.est_correcte === true).length;
  const mauvaises = currentResponses.filter((r) => r.est_correcte === false).length;
  const qrcAttente = currentResponses.filter((r) => r.question_type === "qrc" && !r.corrigee_manuellement);

  // Controles automatiques de coherence sur la question en cours.
  const controleParticipants = currentResponses.length + sansReponse.length === participants.length;
  const controleReponses = bonnes + mauvaises + qrcAttente.length === currentResponses.length;

  // Classement final : QRC en attente => score PROVISOIRE.
  const classement = useMemo(() => {
    return participants
      .map((p) => {
        const mine = responses.filter((r) => r.participant_id === p.id);
        const uniques = new Map(mine.map((r) => [r.question_id, r]));
        const list = Array.from(uniques.values());
        const bonnes = list.filter((r) => r.est_correcte === true).length;
        const mauvaises = list.filter((r) => r.est_correcte === false).length;
        const attente = list.filter((r) => r.question_type === "qrc" && !r.corrigee_manuellement).length;
        return {
          id: p.id,
          nom: session?.masquer_noms ? `Participant ${p.id.slice(0, 4).toUpperCase()}` : p.display_name,
          bonnes,
          mauvaises,
          sansReponse: Math.max(questions.length - list.length, 0),
          attente,
          score: Number(p.score),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [participants, responses, questions.length, session?.masquer_noms]);
  const qrcEnAttenteTotal = classement.reduce((s, c) => s + c.attente, 0);

  const handleCreate = async () => {
    if (!quizId) {
      toast.error("Choisissez un quiz source");
      return;
    }
    setCreating(true);
    try {
      const source = sources.find((s) => String(s.exerciceId) === quizId);
      const snapshot = await buildSnapshotFromSource(Number(quizId), {
        nombre: Number(nombre) || 20,
        typeFiltre,
        ordre,
      });
      if (snapshot.length === 0) {
        toast.error("Aucune question ne correspond à ces critères");
        return;
      }
      const created = await createLiveSession({
        titre,
        questions: snapshot,
        sourceQuizId: quizId,
        sourceLabel: `VTC · ${source?.titre ?? ""}`,
      });
      setSessions((prev) => [created, ...prev]);
      setActiveId(created.id);
      toast.success(`Challenge lancé — ${snapshot.length} questions — code ${created.code}`);
    } catch {
      toast.error("Le challenge n'a pas pu être lancé");
    } finally {
      setCreating(false);
    }
  };

  const move = async (delta: number) => {
    if (!session) return;
    const next = Math.min(Math.max(currentIndex + delta, 0), Math.max(questions.length - 1, 0));
    await updateLiveSession(session.id, { current_index: next, reveal_results: false });
    await refresh();
  };

  const displayName = (participantId: string) => {
    const p = participants.find((x) => x.id === participantId);
    if (!p) return "—";
    return session?.masquer_noms ? `Participant ${p.id.slice(0, 4).toUpperCase()}` : p.display_name;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🎯 Challenge en direct</h1>
          <p className="text-sm text-muted-foreground">
            Module indépendant : aucune donnée des examens blancs, des QRC ni du e-learning n'est utilisée.
          </p>
        </div>
        <Badge variant={connected ? "default" : "destructive"}>
          {connected ? "Temps réel actif" : "Temps réel interrompu — rattrapage serveur"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lancer un challenge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du challenge" />

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Filière</label>
            <Input value="VTC" readOnly className="w-full" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Matière</label>
            <Select value={matiere} onValueChange={setMatiere}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Matière" />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((m) => (
                  <SelectItem key={m} value={m} disabled={m !== PILOTE_MATIERE}>
                    {m}
                    {m !== PILOTE_MATIERE ? " (hors pilote)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Quiz / module source</label>
            <Select value={quizId} onValueChange={setQuizId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Quiz source" />
              </SelectTrigger>
              <SelectContent>
                {quizOfMatiere.map((q) => (
                  <SelectItem key={q.exerciceId} value={String(q.exerciceId)}>
                    {q.titre} ({q.nbQuestions} questions)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre de questions souhaitées</label>
            <Input type="number" min={1} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type de questions</label>
            <Select value={typeFiltre} onValueChange={(v) => setTypeFiltre(v as typeof typeFiltre)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Mélange QCM + QRC</SelectItem>
                <SelectItem value="qcm">QCM uniquement</SelectItem>
                <SelectItem value="qrc">QRC uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ordre</label>
            <Select value={ordre} onValueChange={(v) => setOrdre(v as typeof ordre)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="origine">Ordre d'origine</SelectItem>
                <SelectItem value="aleatoire">Ordre aléatoire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={creating || !quizId} className="w-full">
            ▶ Lancer un challenge en direct
          </Button>
          <p className="text-xs text-muted-foreground">
            Les questions existantes sont uniquement lues : une copie indépendante est figée au lancement. Modifier ou
            supprimer ensuite une question d'origine ne change jamais un challenge déjà lancé.
          </p>
          {sessions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {sessions.slice(0, 8).map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={s.id === activeId ? "default" : "outline"}
                  onClick={() => setActiveId(s.id)}
                >
                  {s.code} · {s.titre}
                  {s.statut === "terminee" ? " (terminé)" : ""}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {session && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 pt-6">
              <div>
                <div className="text-xs text-muted-foreground">Code de session</div>
                <div className="text-4xl font-bold tracking-widest">{session.code}</div>
                <div className="text-xs text-muted-foreground mt-1 break-all">{joinUrl}</div>
              </div>
              {qrDataUrl && <img src={qrDataUrl} alt="QR code du challenge" className="h-32 w-32" />}
              <div className="flex flex-col gap-2 ml-auto">
                <Button variant="outline" onClick={() => setProjection((v) => !v)}>
                  {projection ? "Quitter la projection" : "🖥 Mode projection"}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await updateLiveSession(session.id, { masquer_noms: !session.masquer_noms });
                    await refresh();
                  }}
                >
                  {session.masquer_noms ? "Afficher les noms" : "Masquer les noms"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await endLiveSession(session.id);
                    await refresh();
                  }}
                  disabled={session.statut === "terminee"}
                >
                  Terminer le challenge
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={projection ? "text-3xl" : ""}>
                Question {questions.length === 0 ? 0 : currentIndex + 1}/{questions.length} —{" "}
                {currentResponses.length}/{participants.length} ont répondu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className={projection ? "text-2xl font-semibold" : "font-medium"}>
                {currentQuestion?.enonce || "Aucune question"}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                <Stat label="Connectés" value={participants.length} />
                <Stat label="Ont répondu" value={currentResponses.length} />
                <Stat label="Sans réponse" value={sansReponse.length} />
                <Stat label="Bonnes" value={bonnes} />
                <Stat label="Mauvaises" value={mauvaises} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => move(-1)} disabled={currentIndex === 0}>
                  ← Précédente
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await updateLiveSession(session.id, { reveal_results: !session.reveal_results });
                    await refresh();
                  }}
                >
                  {session.reveal_results ? "Masquer les résultats" : "Révéler les résultats"}
                </Button>
                <Button onClick={() => move(1)} disabled={currentIndex >= questions.length - 1}>
                  Suivante →
                </Button>
              </div>
            </CardContent>
          </Card>

          {qrcAttente.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>✍️ Réponses ouvertes à corriger ({qrcAttente.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrcAttente.map((r) => (
                  <QrcCorrectionRow
                    key={r.id}
                    name={displayName(r.participant_id)}
                    reponse={r.reponse || ""}
                    pointsMax={Number(r.points_max)}
                    onSave={async (points, commentaire) => {
                      await correctLiveResponse(r.id, points, commentaire);
                      await refresh();
                      toast.success("Correction enregistrée");
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Classement en direct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[...participants]
                  .sort((a, b) => Number(b.score) - Number(a.score))
                  .map((p, i) => (
                    <div key={p.id} className="flex justify-between border-b py-1 text-sm">
                      <span>
                        {i + 1}. {session.masquer_noms ? `Participant ${p.id.slice(0, 4).toUpperCase()}` : p.display_name}
                        {!answeredIds.has(p.id) && <span className="ml-2 text-muted-foreground">(en attente)</span>}
                      </span>
                      <span className="font-semibold">{Number(p.score)} pt</span>
                    </div>
                  ))}
                {participants.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun participant connecté pour l'instant.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QrcCorrectionRow({
  name,
  reponse,
  pointsMax,
  onSave,
}: {
  name: string;
  reponse: string;
  pointsMax: number;
  onSave: (points: number, commentaire: string) => Promise<void>;
}) {
  const [points, setPoints] = useState(String(pointsMax));
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="font-medium">{name}</div>
      <p className="text-sm whitespace-pre-wrap">{reponse || "(réponse vide)"}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          className="w-24"
          value={points}
          min={0}
          max={pointsMax}
          onChange={(e) => setPoints(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">/ {pointsMax}</span>
      </div>
      <Textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Commentaire (facultatif)"
      />
      <Button
        size="sm"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(Number(points) || 0, commentaire);
          } finally {
            setSaving(false);
          }
        }}
      >
        Valider la correction
      </Button>
    </div>
  );
}
