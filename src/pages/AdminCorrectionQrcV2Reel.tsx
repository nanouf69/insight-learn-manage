// Correction QRC V2 — branchée sur le VRAI noyau sécurisé en base (session TEST).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  chargerSessionTest,
  corrigerQrc,
  souscrireSignal,
  type QrcReelle,
  type SessionReelle,
  type TentativeReelle,
} from "@/features/correction-qrc-v2/noyauReel";

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

export default function AdminCorrectionQrcV2Reel() {
  const [session, setSession] = useState<SessionReelle | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [etatEnvoi, setEtatEnvoi] = useState<"vide" | "encours" | "ok" | "echec">("vide");
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      setSession(await chargerSessionTest());
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);
  useEffect(() => souscrireSignal("admin-qrc-v2", "qrc_instances_v2", () => void recharger()), [recharger]);

  const parTentative = useMemo(() => {
    const m = new Map<string, TentativeReelle>();
    for (const t of session?.tentatives ?? []) m.set(t.attempt_id, t);
    return m;
  }, [session]);

  const qrcSel: QrcReelle | undefined = session?.qrc.find((q) => q.qrc_instance_id === selection);
  const tentativeSel = qrcSel ? parTentative.get(qrcSel.attempt_id) : undefined;
  const questionSel = tentativeSel?.snapshot.questions.find((q) => q.id === qrcSel?.question_id);

  const total = session?.qrc.length ?? 0;
  const corrigees = session?.qrc.filter((q) => q.etat === "corrigee").length ?? 0;
  const premiere = session?.tentatives[0];
  const matieres = premiere?.snapshot.matieres ?? [];

  const valider = async () => {
    if (!qrcSel || note === null) return;
    setEtatEnvoi("encours");
    setErreur(null);
    try {
      await corrigerQrc({
        operationId: crypto.randomUUID(),
        qrcInstanceId: qrcSel.qrc_instance_id,
        note,
        commentaire: commentaire || undefined,
        email: "formateur@pilote.test",
      });
      setEtatEnvoi("ok");
      setNote(null);
      setCommentaire("");
      await recharger();
    } catch (e) {
      setEtatEnvoi("echec");
      setErreur((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 p-4 space-y-6">
        <header className="sticky top-0 z-10 bg-background/95 py-2">
          <h1 className="text-lg font-semibold">
            Correction QRC V2 — {premiere?.snapshot.session?.date} {premiere?.snapshot.session?.heure} ·{" "}
            {premiere?.snapshot.exam_libelle ?? "session TEST"}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="compteur-session">
            {corrigees}/{total} QRC corrigées — {total - corrigees} restantes
          </p>
        </header>

        {matieres.map((m) => {
          const questions = (premiere?.snapshot.questions ?? []).filter((q) => q.matiere === m.subject_id);
          const dansMatiere = (session?.qrc ?? []).filter((q) => questions.some((x) => x.id === q.question_id));
          const ok = dansMatiere.filter((q) => q.etat === "corrigee").length;
          return (
            <section key={m.subject_id} className="space-y-2">
              <h2 className="text-base font-semibold">
                {m.lettre} — {m.titre}{" "}
                <span className="text-sm text-muted-foreground">
                  {dansMatiere.length > 0 && ok === dansMatiere.length ? "✓ TERMINÉE" : `${ok}/${dansMatiere.length}`}
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-background px-2 py-1 text-left">CANDIDAT</th>
                      {questions.map((q, i) => <th key={q.id} className="px-2 py-1">QRC {i + 1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(session?.tentatives ?? []).map((t) => (
                      <tr key={t.attempt_id}>
                        <td className="sticky left-0 bg-background px-2 py-1 font-medium whitespace-nowrap">{t.candidat}</td>
                        {questions.map((q) => {
                          const inst = (session?.qrc ?? []).find(
                            (x) => x.attempt_id === t.attempt_id && x.question_id === q.id,
                          );
                          if (!inst) return <td key={q.id} className="px-2 py-1 text-muted-foreground">—</td>;
                          const corrigee = inst.etat === "corrigee";
                          return (
                            <td key={q.id} className="px-1 py-1">
                              <button
                                data-testid={`cellule-${inst.qrc_instance_id}`}
                                onClick={() => { setSelection(inst.qrc_instance_id); setNote(null); setEtatEnvoi("vide"); }}
                                className={`rounded border px-2 py-1 ${
                                  corrigee
                                    ? "border-success bg-success/10 text-success"
                                    : "border-warning bg-warning/10 text-warning"
                                }`}
                              >
                                {corrigee ? `✓ ${inst.note}/${q.points}` : "À corriger"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {erreur && <p className="text-sm text-destructive" data-testid="erreur-admin">{erreur}</p>}
      </div>

      <aside className="w-[380px] shrink-0 border-l p-4 space-y-3">
        {!qrcSel && <p className="text-sm text-muted-foreground">Sélectionnez une QRC dans le tableau.</p>}
        {qrcSel && questionSel && tentativeSel && (
          <>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Candidat</p>
              <p className="font-semibold">{tentativeSel.candidat}</p>
              <p className="text-xs text-muted-foreground">
                {tentativeSel.snapshot.session?.date} {tentativeSel.snapshot.session?.heure} · tentative{" "}
                {tentativeSel.attempt_id.slice(0, 8)}
              </p>
            </div>
            <Card className="p-3 space-y-2 text-sm">
              <p className="font-medium">QUESTION</p>
              <p>{questionSel.enonce}</p>
              <p className="font-medium">RÉPONSE DE L'APPRENANT</p>
              <p data-testid="reponse-eleve" className="whitespace-pre-wrap">{texte(qrcSel.reponse) || "(vide)"}</p>
              <p className="font-medium">RÉPONSE OFFICIELLE (snapshot de la tentative)</p>
              <p data-testid="reponse-officielle">{questionSel.reponseQRC}</p>
            </Card>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.round(questionSel.points / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={note === v ? "default" : "outline"}
                  data-testid={`note-${v}`}
                  disabled={qrcSel.etat === "corrigee"}
                  onClick={() => setNote(v)}
                >
                  {String(v).replace(".", ",")}
                </Button>
              ))}
            </div>
            <Textarea placeholder="Commentaire (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            <div className="text-sm" data-testid="etat-correction">
              {etatEnvoi === "encours" && <span className="text-warning">🟠 Enregistrement de la correction…</span>}
              {etatEnvoi === "ok" && <span className="text-success">🟢 Correction enregistrée</span>}
              {etatEnvoi === "echec" && <span className="text-destructive">🔴 CORRECTION NON ENREGISTRÉE</span>}
            </div>
            <Button
              className="w-full"
              disabled={note === null || qrcSel.etat === "corrigee"}
              onClick={valider}
              data-testid="valider-correction"
            >
              ✓ Valider
            </Button>
            {(() => {
              const res = session?.resultats.find((r) => r.attempt_id === qrcSel.attempt_id);
              if (!res) return null;
              return (
                <p className="text-xs text-muted-foreground" data-testid="resultat-admin">
                  {res.status === "definitif"
                    ? `Résultat DÉFINITIF ${res.score}/20`
                    : `🟠 RÉSULTAT PROVISOIRE — ${res.qrc_restantes} QRC restantes`}{" "}
                  · result_id <span data-testid="admin-result-id">{res.result_id}</span> · révision{" "}
                  <span data-testid="admin-result-revision">{res.result_revision}</span>
                </p>
              );
            })()}
          </>
        )}
      </aside>
    </div>
  );
}
