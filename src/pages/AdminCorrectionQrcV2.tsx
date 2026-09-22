import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  creerServeurDemo,
  ErreurServeur,
  type QrcInstance,
  type Resultat,
} from "@/features/correction-qrc-v2/serveurFictif";

type EtatEcriture = "idle" | "en_cours" | "ok" | "erreur";

const fmtNote = (n: number) => n.toString().replace(".", ",");

/**
 * MAQUETTE — Correction QRC v2 (type Formative), branchée UNIQUEMENT sur le
 * serveur fictif du noyau sécurisé. Aucune donnée réelle n'est lue ni écrite.
 */
export default function AdminCorrectionQrcV2() {
  const [{ serveur, session }] = useState(() => creerServeurDemo(20));
  const [tick, setTick] = useState(0);
  const relire = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => serveur.souscrire(relire) as unknown as () => void, [serveur, relire]);

  const [selection, setSelection] = useState<string | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [ecriture, setEcriture] = useState<EtatEcriture>("idle");
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Toute la vérité vient du serveur : aucun compteur parallèle côté navigateur.
  const instances = useMemo(() => serveur.lireQrcSession(session.session_id), [serveur, session, tick]);
  const parId = useMemo(() => new Map(instances.map((i) => [i.qrc_instance_id, i])), [instances]);
  const courante: QrcInstance | null = selection ? parId.get(selection) ?? null : null;

  const candidats = session.candidats;
  const attemptParApprenant = useMemo(
    () => new Map(candidats.map((c) => [c.apprenant_id, serveur.attemptDe(session.session_id, c.apprenant_id).attempt_id])),
    [candidats, serveur, session],
  );

  const cellule = (apprenantId: string, subjectId: string, questionId: string) =>
    instances.find((i) => i.apprenant_id === apprenantId && i.subject_id === subjectId && i.question_id === questionId);

  const total = instances.length;
  const corrigees = instances.filter((i) => i.etat === "corrigee").length;

  const resultatCourant: Resultat | null = courante ? serveur.lireResultat(courante.attempt_id) : null;

  const ouvrir = (inst: QrcInstance) => {
    setSelection(inst.qrc_instance_id);
    setNote(inst.note);
    setCommentaire(inst.commentaire ?? "");
    setEcriture("idle");
    setMessageErreur(null);
  };

  const listeOrdonnee = useMemo(() => {
    const ordre: QrcInstance[] = [];
    for (const m of session.matieres)
      for (const q of m.questions)
        for (const c of candidats) {
          const i = cellule(c.apprenant_id, m.subject_id, q.question_id);
          if (i) ordre.push(i);
        }
    return ordre;
  }, [instances, session, candidats]);

  const valider = async () => {
    if (!courante || note === null) return;
    setEcriture("en_cours");
    setMessageErreur(null);
    await new Promise((r) => setTimeout(r, 250));
    try {
      const operationId = `op-${courante.qrc_instance_id}-${courante.revision}`;
      serveur.corrigerQrcSync(operationId, courante.qrc_instance_id, note, courante.revision, "formateur@fictif", commentaire || null);
      setEcriture("ok");
      const idx = listeOrdonnee.findIndex((i) => i.qrc_instance_id === courante.qrc_instance_id);
      const suivante = listeOrdonnee.slice(idx + 1).find((i) => i.etat === "en_attente");
      if (suivante) ouvrir(suivante);
    } catch (e) {
      setEcriture("erreur");
      setMessageErreur(e instanceof ErreurServeur ? e.message : "Correction non enregistrée");
    }
  };

  const allerA = (subjectId: string) =>
    sectionsRef.current[subjectId]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const prochaineACorriger = () => {
    const suivante = listeOrdonnee.find((i) => i.etat === "en_attente");
    if (suivante) {
      ouvrir(suivante);
      allerA(suivante.subject_id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête session */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Session</p>
            <h1 className="text-lg font-semibold">
              22/09/2026 — {session.heure} — {session.exam_libelle}
            </h1>
          </div>
          <Badge variant="outline" className="ml-auto">Maquette — données fictives, aucune donnée réelle</Badge>
          <div className="rounded-lg border px-3 py-1.5 text-sm font-medium">
            {corrigees}/{total} QRC corrigées — {total - corrigees} restantes
          </div>
          <Button size="sm" onClick={prochaineACorriger}>Prochaine QRC à corriger</Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {session.matieres.map((m) => {
            const dm = instances.filter((i) => i.subject_id === m.subject_id);
            const ok = dm.filter((i) => i.etat === "corrigee").length;
            return (
              <button
                key={m.subject_id}
                onClick={() => allerA(m.subject_id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted",
                  ok === dm.length && "border-success/40 bg-success/10 text-success",
                )}
              >
                {m.lettre} · {ok}/{dm.length}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex">
        {/* Tableaux : toutes les matières sur une seule page */}
        <main className={cn("flex-1 space-y-8 p-4", courante && "lg:mr-[26rem]")}>
          {session.matieres.map((m) => {
            const dm = instances.filter((i) => i.subject_id === m.subject_id);
            const ok = dm.filter((i) => i.etat === "corrigee").length;
            return (
              <section
                key={m.subject_id}
                ref={(el) => {
                  sectionsRef.current[m.subject_id] = el;
                }}
                className="scroll-mt-32"
              >
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-base font-semibold">{m.lettre} — {m.titre}</h2>
                  {ok === dm.length ? (
                    <Badge className="bg-success text-success-foreground">✓ TERMINÉE</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{ok}/{dm.length}</span>
                  )}
                </div>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="sticky left-0 z-10 min-w-[13rem] border-r bg-muted/60 px-3 py-2 text-left font-semibold">
                            Candidat
                          </th>
                          {m.questions.map((q, i) => (
                            <th key={q.question_id} className="min-w-[7.5rem] px-3 py-2 text-left font-semibold">
                              QRC {i + 1} <span className="text-muted-foreground">/{fmtNote(q.bareme)}</span>
                            </th>
                          ))}
                          <th className="min-w-[7rem] px-3 py-2 text-left font-semibold">Avancement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidats.map((c) => {
                          const ligne = m.questions.map((q) => cellule(c.apprenant_id, m.subject_id, q.question_id));
                          const faits = ligne.filter((i) => i?.etat === "corrigee").length;
                          return (
                            <tr key={c.apprenant_id} className="border-t">
                              <td className="sticky left-0 z-10 border-r bg-card px-3 py-1.5 font-medium">
                                {c.nom} <span className="font-normal text-muted-foreground">{c.prenom}</span>
                              </td>
                              {ligne.map((inst, i) => (
                                <td key={i} className="px-1.5 py-1">
                                  {inst && (
                                    <button
                                      onClick={() => ouvrir(inst)}
                                      className={cn(
                                        "w-full rounded-md border px-2 py-1 text-left text-xs font-medium transition-colors",
                                        inst.etat === "corrigee"
                                          ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
                                          : "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20",
                                        selection === inst.qrc_instance_id && "ring-2 ring-ring",
                                      )}
                                    >
                                      {inst.etat === "corrigee"
                                        ? `✓ ${fmtNote(inst.note ?? 0)}/${fmtNote(inst.bareme)}`
                                        : "À corriger"}
                                    </button>
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-1.5 text-muted-foreground">
                                {faits === ligne.length ? <span className="text-success">✓ TERMINÉ</span> : `${faits}/${ligne.length}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            );
          })}
        </main>

        {/* Panneau de correction */}
        {courante && (
          <aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-[26rem] flex-col gap-3 overflow-y-auto border-l bg-card p-4 pt-24">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Candidat</p>
                <p className="font-semibold">
                  {candidats.find((c) => c.apprenant_id === courante.apprenant_id)?.nom}{" "}
                  {candidats.find((c) => c.apprenant_id === courante.apprenant_id)?.prenom}
                </p>
                <p className="text-xs text-muted-foreground">
                  22/09/2026 — {session.heure} · {session.exam_libelle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.matieres.find((m) => m.subject_id === courante.subject_id)?.titre} · tentative{" "}
                  <span className="font-mono">{attemptParApprenant.get(courante.apprenant_id)?.slice(-6)}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelection(null)}>Fermer</Button>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Question</p>
              <p className="text-sm">{courante.enonce}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Réponse de l'apprenant</p>
              <p className="text-sm">{courante.reponse_eleve}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase text-primary">Réponse officielle (snapshot de la tentative)</p>
              <p className="text-sm">{courante.reponse_officielle}</p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Notation rapide — barème /{fmtNote(courante.bareme)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: Math.round(courante.bareme / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={note === v ? "default" : "outline"}
                    onClick={() => setNote(v)}
                    className={cn(note === v && "ring-2 ring-ring")}
                  >
                    {fmtNote(v)}
                  </Button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="Commentaire (facultatif) — ne modifie jamais la réponse de l'apprenant"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
            />

            {ecriture === "en_cours" && <p className="text-sm text-warning">🟠 Enregistrement de la correction…</p>}
            {ecriture === "ok" && <p className="text-sm text-success">🟢 Correction enregistrée par le serveur</p>}
            {ecriture === "erreur" && (
              <p className="text-sm text-destructive">🔴 CORRECTION NON ENREGISTRÉE — {messageErreur}</p>
            )}

            <Button onClick={valider} disabled={note === null || ecriture === "en_cours"}>
              ✓ Valider et passer à la suivante
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const idx = listeOrdonnee.findIndex((i) => i.qrc_instance_id === courante.qrc_instance_id);
                  if (idx > 0) ouvrir(listeOrdonnee[idx - 1]);
                }}
              >
                ← QRC précédente
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const idx = listeOrdonnee.findIndex((i) => i.qrc_instance_id === courante.qrc_instance_id);
                  if (idx < listeOrdonnee.length - 1) ouvrir(listeOrdonnee[idx + 1]);
                }}
              >
                QRC suivante →
              </Button>
            </div>

            <Separator />

            {resultatCourant && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Résultat serveur (Admin = apprenant)</p>
                {resultatCourant.status === "definitif" ? (
                  <>
                    <p className="text-success">✓ CORRECTION TERMINÉE</p>
                    <p className="font-semibold">NOTE DÉFINITIVE : {fmtNote(resultatCourant.score ?? 0)}/20</p>
                  </>
                ) : (
                  <>
                    <p className="text-warning">🟠 RÉSULTAT PROVISOIRE — {resultatCourant.qrc_restantes} QRC restantes</p>
                    <p className="text-xs text-muted-foreground">
                      Côté apprenant : « Correction en cours — résultat définitif non encore disponible ».
                    </p>
                  </>
                )}
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  révision {resultatCourant.result_revision} · {resultatCourant.status}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
