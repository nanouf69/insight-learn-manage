// Correction QRC V2 — branchée sur le VRAI noyau sécurisé en base.
// Aucune donnée historique n'est complétée ni recalculée : ce qui manque est signalé.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  chargerSessionTest,
  corrigerQrc,
  listerSessions,
  souscrireSignal,
  type QrcReelle,
  type SessionListee,
  type SessionReelle,
  type TentativeReelle,
} from "@/features/correction-qrc-v2/noyauReel";

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

export default function AdminCorrectionQrcV2Reel() {
  const mode: "test" | "migre" =
    new URLSearchParams(window.location.search).get("mode") === "test" ? "test" : "migre";

  const [sessions, setSessions] = useState<SessionListee[]>([]);
  const [sessionCle, setSessionCle] = useState<string | null>(null);
  const [session, setSession] = useState<SessionReelle | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [etatEnvoi, setEtatEnvoi] = useState<"vide" | "encours" | "ok" | "echec">("vide");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const liste = await listerSessions(mode);
        setSessions(liste);
        setSessionCle((c) => c ?? liste[0]?.cle ?? null);
      } catch (e) {
        setErreur((e as Error).message);
      }
    })();
  }, [mode]);

  const sessionChoisie = sessions.find((s) => s.cle === sessionCle) ?? null;

  const recharger = useCallback(async () => {
    if (!sessionChoisie) return;
    try {
      setSession(await chargerSessionTest(mode, sessionChoisie.attemptIds));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [mode, sessionChoisie]);

  useEffect(() => { void recharger(); }, [recharger]);
  useEffect(() => souscrireSignal("admin-qrc-v2", "qrc_instances_v2", () => void recharger()), [recharger]);

  const parTentative = useMemo(() => {
    const m = new Map<string, TentativeReelle>();
    for (const t of session?.tentatives ?? []) m.set(t.attempt_id, t);
    return m;
  }, [session]);

  const baremeRestaureDe = useMemo(() => {
    const m = new Map<string, { bareme: number; mention: string; nb_preuves: number }>();
    for (const b of session?.baremesRestaures ?? []) m.set(b.qrc_instance_id, b);
    return m;
  }, [session]);

  const qrcSel: QrcReelle | undefined = session?.qrc.find((q) => q.qrc_instance_id === selection);
  const tentativeSel = qrcSel ? parTentative.get(qrcSel.attempt_id) : undefined;
  const questionSel = tentativeSel?.snapshot.questions.find((q) => q.id === qrcSel?.question_id);
  const restaureSel = qrcSel ? baremeRestaureDe.get(qrcSel.qrc_instance_id) ?? null : null;
  const baremeSel = questionSel?.points ?? restaureSel?.bareme ?? null;
  const videSel = !texte(qrcSel?.reponse).trim();

  const total = session?.qrc.length ?? 0;
  const corrigees = session?.qrc.filter((q) => q.etat === "corrigee").length ?? 0;

  const matieres = useMemo(() => {
    const m = new Map<string, { subject_id: string; lettre: string; titre: string }>();
    for (const t of session?.tentatives ?? []) {
      for (const mat of t.snapshot.matieres ?? []) if (!m.has(mat.subject_id)) m.set(mat.subject_id, mat);
    }
    return Array.from(m.values()).sort((a, b) => (a.lettre ?? "").localeCompare(b.lettre ?? ""));
  }, [session]);

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
        <header className="sticky top-0 z-10 bg-background/95 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">Correction QRC V2</h1>
            <select
              data-testid="choix-session"
              className="rounded border bg-background px-2 py-1 text-sm"
              value={sessionCle ?? ""}
              onChange={(e) => { setSessionCle(e.target.value); setSelection(null); setSession(null); }}
            >
              {sessions.map((s) => (
                <option key={s.cle} value={s.cle}>
                  {s.date} · {s.heureMin}–{s.heureMax} · {s.exam_id} ({s.attemptIds.length} passages)
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="compteur-session">
            {corrigees}/{total} QRC corrigées — {total - corrigees} restantes
          </p>
        </header>

        {matieres.map((m) => {
          const tentatives = (session?.tentatives ?? []).filter((t) =>
            (t.snapshot.matieres ?? []).some((x) => x.subject_id === m.subject_id),
          );
          const questions = (tentatives[0]?.snapshot.questions ?? []).filter(
            (q) => q.matiere === m.subject_id && q.type === "QRC",
          );
          const attemptIds = new Set(tentatives.map((t) => t.attempt_id));
          const dansMatiere = (session?.qrc ?? []).filter((q) => attemptIds.has(q.attempt_id));
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
                    {tentatives.map((t) => (
                      <tr key={t.attempt_id}>
                        <td className="sticky left-0 bg-background px-2 py-1 font-medium whitespace-nowrap">{t.candidat}</td>
                        {questions.map((q) => {
                          const qt = t.snapshot.questions.find((x) => x.id === q.id);
                          const inst = (session?.qrc ?? []).find(
                            (x) => x.attempt_id === t.attempt_id && x.question_id === q.id,
                          );
                          if (!inst) return <td key={q.id} className="px-2 py-1 text-muted-foreground">—</td>;
                          const restaure = baremeRestaureDe.get(inst.qrc_instance_id) ?? null;
                          const points = qt?.points ?? restaure?.bareme ?? null;
                          const corrigee = inst.etat === "corrigee";
                          const bloquee = !corrigee && points == null;
                          const vide = !texte(inst.reponse).trim();
                          const videEnAttente = !corrigee && !bloquee && vide;
                          return (
                            <td key={q.id} className="px-1 py-1">
                              <button
                                data-testid={`cellule-${inst.qrc_instance_id}`}
                                onClick={() => { setSelection(inst.qrc_instance_id); setNote(null); setEtatEnvoi("vide"); }}
                                className={`rounded border px-2 py-1 whitespace-nowrap ${
                                  corrigee
                                    ? "border-success bg-success/10 text-success"
                                    : bloquee
                                      ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                                      : videEnAttente
                                        ? "border-dashed border-muted-foreground/60 bg-background text-muted-foreground"
                                        : "border-warning bg-warning/10 text-warning"
                                }`}
                              >
                                {corrigee
                                  ? `✓ ${inst.note}${points != null ? `/${points}` : ""}`
                                  : bloquee
                                    ? "⚠️ Barème absent"
                                    : videEnAttente
                                      ? `Copie vide (/${points})`
                                      : `À corriger (/${points})`}
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
                {tentativeSel.snapshot.session?.date} {tentativeSel.snapshot.session?.heure} ·{" "}
                {tentativeSel.exam_id} · tentative {tentativeSel.attempt_id.slice(0, 8)}
              </p>
            </div>
            <Card className="p-3 space-y-2 text-sm">
              <p className="font-medium">QUESTION</p>
              <p>{questionSel.enonce}</p>
              <p className="font-medium">RÉPONSE DE L'APPRENANT</p>
              <p data-testid="reponse-eleve" className="whitespace-pre-wrap">{texte(qrcSel.reponse) || "(vide)"}</p>
              <p className="font-medium">RÉPONSE OFFICIELLE (snapshot de la tentative)</p>
              {questionSel.reponseQRC
                ? <p data-testid="reponse-officielle">{questionSel.reponseQRC}</p>
                : <p className="text-warning" data-testid="officielle-absente">⚠️ RÉPONSE OFFICIELLE HISTORIQUE ABSENTE</p>}
              {qrcSel.etat === "corrigee" && (
                <p className="text-success" data-testid="points-attribues">
                  Points attribués : {qrcSel.note}{baremeSel != null ? `/${baremeSel}` : " (barème historique absent)"}
                </p>
              )}
              {qrcSel.corrige_email?.startsWith("Correction historique") && (
                <p className="text-xs text-muted-foreground" data-testid="origine-correction">
                  {qrcSel.corrige_email}
                  {qrcSel.corrige_at ? ` · ${new Date(qrcSel.corrige_at).toLocaleString("fr-FR")}` : " · date historique inconnue"}
                </p>
              )}
              {qrcSel.etat === "corrigee" && !texte(qrcSel.reponse) && (
                <p className="text-warning" data-testid="points-sans-reponse">
                  ⚠️ Correction historique avec points mais sans réponse enregistrée — contrôle manuel requis
                </p>
              )}
              {restaureSel && (
                <p className="text-xs text-muted-foreground" data-testid="bareme-restaure">
                  {restaureSel.mention} — barème {restaureSel.bareme} points, {restaureSel.nb_preuves} passage(s) de preuve
                </p>
              )}
            </Card>

            {qrcSel.etat !== "corrigee" && baremeSel == null ? (
              <p className="rounded border bg-muted p-2 text-sm text-muted-foreground" data-testid="bareme-absent">
                🔴 BARÈME HISTORIQUE INTROUVABLE — CORRECTION BLOQUÉE. Le barème doit être défini manuellement ; il n'est
                jamais repris de la version actuelle de l'examen.
              </p>
            ) : qrcSel.etat !== "corrigee" && videSel ? (
              <p className="rounded border border-dashed p-2 text-sm text-muted-foreground" data-testid="copie-vide-en-attente">
                Copie vide — aucune correction historique. Barème disponible ({baremeSel} points) mais aucune note n'est
                attribuée automatiquement : le comportement des copies vides reste à décider.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.round((baremeSel ?? 0) / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
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
              </>
            )}

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
