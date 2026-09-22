// Écran APPRENANT du pilote TEST : branché sur le vrai noyau sécurisé en base.
// Aucune donnée réelle : seules les tentatives marquées TEST sont accessibles ici.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  chargerSessionTest,
  enregistrerReponse,
  finaliserTentative,
  lireResultat,
  souscrireSignal,
  type ResultatReel,
  type TentativeReelle,
} from "@/features/correction-qrc-v2/noyauReel";

type EtatEnvoi = "vide" | "encours" | "ok" | "echec";

export default function PiloteApprenantTest() {
  const [session, setSession] = useState<unknown>(null);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentative, setTentative] = useState<TentativeReelle | null>(null);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const [etats, setEtats] = useState<Record<string, EtatEnvoi>>({});
  const [resultat, setResultat] = useState<ResultatReel | null>(null);
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const recharger = useCallback(async () => {
    if (!session) return;
    try {
      const s = await chargerSessionTest();
      const mienne = s.tentatives[0] ?? null;
      setTentative(mienne);
      if (mienne) {
        const { data } = await supabase
          .from("answer_state")
          .select("question_id, valeur, revision")
          .eq("attempt_id", mienne.attempt_id);
        const r: Record<string, string> = {};
        const rev: Record<string, number> = {};
        for (const a of data ?? []) {
          r[a.question_id] = typeof a.valeur === "string" ? a.valeur : JSON.stringify(a.valeur ?? "");
          rev[a.question_id] = a.revision;
        }
        setReponses(r);
        setRevisions(rev);
        setResultat(await lireResultat(mienne.attempt_id));
      }
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [session]);

  useEffect(() => {
    void recharger();
  }, [recharger, signal]);

  useEffect(() => {
    if (!session) return;
    // Temps réel = simple notification : on relit toujours le serveur ensuite.
    return souscrireSignal("pilote-apprenant", "core_exam_results", () => setSignal((n) => n + 1));
  }, [session]);

  const connexion = async () => {
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) setErreur(error.message);
  };

  const sauver = async (questionId: string) => {
    if (!tentative) return;
    setEtats((e) => ({ ...e, [questionId]: "encours" }));
    try {
      const res = await enregistrerReponse({
        operationId: crypto.randomUUID(),
        attemptId: tentative.attempt_id,
        questionId,
        valeur: reponses[questionId] ?? "",
        revisionAttendue: revisions[questionId] ?? 0,
      });
      const nouvelleRevision = Number((res as { revision?: number })?.revision ?? (revisions[questionId] ?? 0) + 1);
      setRevisions((r) => ({ ...r, [questionId]: nouvelleRevision }));
      setEtats((e) => ({ ...e, [questionId]: "ok" }));
    } catch (e) {
      setErreur((e as Error).message);
      setEtats((e2) => ({ ...e2, [questionId]: "echec" }));
    }
  };

  const terminer = async () => {
    if (!tentative) return;
    try {
      await finaliserTentative({
        operationId: crypto.randomUUID(),
        attemptId: tentative.attempt_id,
        questionsQrc: tentative.snapshot.questions.filter((q) => q.type === "QRC").map((q) => q.id),
      });
      setSignal((n) => n + 1);
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-sm p-8 space-y-3">
        <h1 className="text-lg font-semibold">Pilote TEST — espace apprenant</h1>
        <Input placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        <Button className="w-full" onClick={connexion}>Se connecter</Button>
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      </div>
    );
  }

  if (!tentative) {
    return (
      <div className="p-8 space-y-2">
        <p>Aucune épreuve TEST accessible pour ce compte.</p>
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>Se déconnecter</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{tentative.snapshot.exam_libelle}</h1>
        <p className="text-sm text-muted-foreground">
          Épreuve {tentative.etat === "terminee" ? "terminée" : "en cours"} · tentative {tentative.attempt_id.slice(0, 8)}
        </p>
      </header>

      {resultat && (
        <Card className="p-4" data-testid="resultat-apprenant">
          {resultat.status === "definitif" ? (
            <p className="font-semibold text-success">
              ✓ CORRECTION TERMINÉE — NOTE DÉFINITIVE : <span data-testid="note-definitive">{resultat.score}</span>/20
            </p>
          ) : (
            <p className="text-warning">
              Correction en cours — résultat définitif non encore disponible ({resultat.qrc_restantes} restantes)
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            result_id <span data-testid="result-id">{resultat.result_id}</span> · révision{" "}
            <span data-testid="result-revision">{resultat.result_revision}</span>
          </p>
        </Card>
      )}

      {tentative.snapshot.questions.map((q) => (
        <Card key={q.id} className="p-4 space-y-2">
          <p className="font-medium">{q.enonce} <span className="text-xs text-muted-foreground">({q.points} pts)</span></p>
          <Textarea
            data-testid={`reponse-${q.id}`}
            value={reponses[q.id] ?? ""}
            disabled={tentative.etat !== "en_cours"}
            onChange={(e) => setReponses((r) => ({ ...r, [q.id]: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <Button size="sm" disabled={tentative.etat !== "en_cours"} onClick={() => sauver(q.id)} data-testid={`sauver-${q.id}`}>
              Enregistrer
            </Button>
            <span className="text-sm" data-testid={`etat-${q.id}`}>
              {etats[q.id] === "encours" && <span className="text-warning">🟠 Enregistrement…</span>}
              {etats[q.id] === "ok" && <span className="text-success">🟢 Enregistré</span>}
              {etats[q.id] === "echec" && (
                <span className="text-destructive">🔴 Réponse non encore enregistrée — ne fermez pas cette page</span>
              )}
            </span>
          </div>
        </Card>
      ))}

      {tentative.etat === "en_cours" && (
        <Button onClick={terminer} data-testid="terminer">Terminer l'épreuve</Button>
      )}
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Se déconnecter</Button>
    </div>
  );
}
