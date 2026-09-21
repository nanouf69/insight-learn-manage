import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLiveChallengeState } from "@/hooks/useLiveChallengeState";
import {
  fetchLiveSessionByCode,
  joinLiveSession,
  submitLiveResponse,
  type LiveParticipant,
} from "@/lib/liveChallenge";

const STORAGE_KEY = "live_challenge_participant";

export default function ChallengePublic() {
  const { code: codeParam } = useParams();
  const [code, setCode] = useState((codeParam || "").toUpperCase());
  const [name, setName] = useState("");
  const [participant, setParticipant] = useState<LiveParticipant | null>(null);
  const [joining, setJoining] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { session, responses, connected, refresh } = useLiveChallengeState(participant?.live_session_id ?? null);

  // Reconnexion : on retrouve le meme participant, jamais un doublon.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.id && saved?.live_session_id) {
        if (!codeParam || String(saved.code || "").toUpperCase() === String(codeParam).toUpperCase()) {
          setParticipant(saved);
          setName(saved.display_name || "");
        }
      }
    } catch {
      /* ignore */
    }
  }, [codeParam]);

  const questions = session?.questions_snapshot ?? [];
  const index = session?.current_index ?? 0;
  const question = questions[index];

  const myResponses = useMemo(
    () => responses.filter((r) => r.participant_id === participant?.id),
    [responses, participant?.id],
  );
  const alreadyAnswered = myResponses.find((r) => r.question_id === question?.id);

  useEffect(() => {
    setDraft("");
  }, [question?.id]);

  const handleJoin = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Indiquez le code du challenge et votre nom");
      return;
    }
    setJoining(true);
    try {
      const found = await fetchLiveSessionByCode(code.trim());
      if (!found) {
        toast.error("Challenge introuvable");
        return;
      }
      const p = await joinLiveSession(code.trim(), name.trim());
      setParticipant(p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, code: found.code }));
    } catch {
      toast.error("Impossible de rejoindre ce challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleAnswer = async (value: string) => {
    if (!participant || !question || alreadyAnswered || sending) return;
    setSending(true);
    try {
      await submitLiveResponse({
        participantId: participant.id,
        question,
        questionIndex: index,
        reponse: value,
      });
      await refresh();
    } catch {
      toast.error("Réponse non enregistrée, réessayez");
    } finally {
      setSending(false);
    }
  };

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🎯 Rejoindre le challenge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code du challenge"
              className="text-center text-2xl tracking-widest"
            />
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom et nom" />
            <Button className="w-full" onClick={handleJoin} disabled={joining}>
              Rejoindre
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{session?.titre || "Challenge en direct"}</div>
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "En direct" : "Reconnexion…"}
          </Badge>
        </div>

        {session?.statut === "terminee" ? (
          <Card>
            <CardHeader>
              <CardTitle>Challenge terminé</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Votre score : <strong>{Number(participant.score)} pt</strong>
              </p>
            </CardContent>
          </Card>
        ) : !question ? (
          <Card>
            <CardContent className="pt-6">En attente du formateur…</CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Question {index + 1}/{questions.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-medium whitespace-pre-wrap">{question.enonce}</p>
              {question.image && (
                <img src={question.image} alt="Illustration de la question" className="max-h-64 rounded-lg" />
              )}

              {alreadyAnswered ? (
                <div className="rounded-lg border p-3 text-sm">
                  ✅ Réponse envoyée : <strong>{alreadyAnswered.reponse}</strong>
                  {session?.reveal_results && alreadyAnswered.est_correcte !== null && (
                    <div className="mt-1">
                      {alreadyAnswered.est_correcte ? "Bonne réponse 🎉" : "Mauvaise réponse"}
                    </div>
                  )}
                  {alreadyAnswered.question_type === "qrc" && !alreadyAnswered.corrigee_manuellement && (
                    <div className="mt-1 text-muted-foreground">En attente de correction du formateur…</div>
                  )}
                </div>
              ) : question.type === "qcm" ? (
                <div className="space-y-2">
                  {(question.propositions || []).map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      className="w-full justify-start h-auto py-3 whitespace-normal text-left"
                      disabled={sending}
                      onClick={() => handleAnswer(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Votre réponse"
                    rows={4}
                  />
                  <Button className="w-full" disabled={sending || !draft.trim()} onClick={() => handleAnswer(draft)}>
                    Envoyer ma réponse
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Score : <strong>{myResponses.reduce((s, r) => s + Number(r.points_obtenus || 0), 0)} pt</strong>
        </div>
      </div>
    </div>
  );
}
