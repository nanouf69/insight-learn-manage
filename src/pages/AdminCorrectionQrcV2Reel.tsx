// Correction QRC V2 — branchée sur le VRAI noyau sécurisé en base.
// Aucune donnée historique n'est complétée ni recalculée : ce qui manque est signalé.
// Le regroupement des passages suit les sessions réelles du CRM (lecture seule),
// jamais une session reconstruite à partir de la date ou de l'heure d'un passage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  chargerSessionTest,
  corrigerQrc,
  listerGroupesCrm,
  souscrireSignal,
  type GroupeSessionCrm,
  type QrcReelle,
  type SessionReelle,
  type TentativeReelle,
} from "@/features/correction-qrc-v2/noyauReel";

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));

const param = (cle: string) => new URLSearchParams(window.location.search).get(cle);

export default function AdminCorrectionQrcV2Reel() {
  const mode: "test" | "migre" = param("mode") === "test" ? "test" : "migre";

  // Préférences d'interface mémorisées dans l'URL pour survivre à un F5.
  // Les données pédagogiques sont TOUJOURS rechargées depuis le serveur ; l'URL ne porte que la navigation.
  const majUrl = (maj: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(maj)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const [groupes, setGroupes] = useState<GroupeSessionCrm[]>([]);
  const [groupeCle, setGroupeCleState] = useState<string | null>(() => param("qrc_groupe"));
  const [ebCle, setEbCleState] = useState<string | null>(() => param("qrc_eb"));
  // Filtre facultatif sur une seule date de passage à l'intérieur de l'EB choisi.
  const [jourFiltre, setJourFiltreState] = useState<string | null>(() => param("qrc_date"));
  const [session, setSession] = useState<SessionReelle | null>(null);
  const [selection, setSelectionState] = useState<string | null>(() => param("qrc"));
  const [zoom, setZoomState] = useState<number>(() => {
    const z = Number(param("qrc_zoom"));
    return Number.isFinite(z) && z >= 70 && z <= 150 ? z : 100;
  });
  const [largeurPanneau, setLargeurPanneau] = useState<number>(() => {
    const l = Number(sessionStorage.getItem("qrc_v2_panneau"));
    return Number.isFinite(l) && l >= 280 && l <= 900 ? l : 380;
  });
  const [pleinEcran, setPleinEcran] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const setGroupeCle = (cle: string | null) => {
    setGroupeCleState(cle);
    setEbCleState(null);
    setJourFiltreState(null);
    setSelectionState(null);
    majUrl({ qrc_groupe: cle, qrc_eb: null, qrc_date: null, qrc: null });
  };
  const setEbCle = (cle: string | null) => {
    setEbCleState(cle);
    setJourFiltreState(null);
    setSelectionState(null);
    majUrl({ qrc_eb: cle, qrc_date: null, qrc: null });
  };
  const setJourFiltre = (jour: string | null) => {
    setJourFiltreState(jour);
    setSelectionState(null);
    majUrl({ qrc_date: jour, qrc: null });
  };
  const setSelection = (qrc: string | null) => {
    setSelectionState(qrc);
    majUrl({ qrc });
  };
  const setZoom = (z: number) => {
    const v = Math.min(150, Math.max(70, z));
    setZoomState(v);
    majUrl({ qrc_zoom: String(v) });
  };

  const [note, setNote] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [etatEnvoi, setEtatEnvoi] = useState<"vide" | "encours" | "ok" | "echec">("vide");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const liste = await listerGroupesCrm(mode);
        setGroupes(liste);
        if (!param("qrc_groupe")) {
          setGroupeCleState(liste[0]?.cle ?? null);
          setEbCleState(liste[0]?.examens[0]?.cle ?? null);
          majUrl({ qrc_groupe: liste[0]?.cle ?? null, qrc_eb: liste[0]?.examens[0]?.cle ?? null });
        } else if (!param("qrc_eb")) {
          const g = liste.find((x) => x.cle === param("qrc_groupe"));
          setEbCleState(g?.examens[0]?.cle ?? null);
          majUrl({ qrc_eb: g?.examens[0]?.cle ?? null });
        }
      } catch (e) {
        setErreur((e as Error).message);
      }
    })();
  }, [mode]);

  const groupeChoisi = groupes.find((g) => g.cle === groupeCle) ?? null;
  const ebChoisi = groupeChoisi?.examens.find((e) => e.cle === ebCle) ?? groupeChoisi?.examens[0] ?? null;

  const dateChoisie = ebChoisi?.dates.find((d) => d.jour === jourFiltre) ?? null;
  const attemptsAffiches = dateChoisie?.attemptIds ?? ebChoisi?.attemptIds ?? null;

  const recharger = useCallback(async () => {
    if (!attemptsAffiches) return;
    try {
      setSession(await chargerSessionTest(mode, attemptsAffiches));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [mode, attemptsAffiches]);

  useEffect(() => { void recharger(); }, [recharger]);
  useEffect(() => souscrireSignal("admin-qrc-v2", "qrc_instances_v2", () => void recharger()), [recharger]);

  // Plein écran natif du navigateur sur la zone de correction
  const basculerPleinEcran = async () => {
    if (!document.fullscreenElement) await conteneurRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };
  useEffect(() => {
    const onFs = () => setPleinEcran(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Redimensionnement du panneau droit
  const demarrerRedim = (e: React.MouseEvent) => {
    e.preventDefault();
    const departX = e.clientX;
    const departL = largeurPanneau;
    const move = (ev: MouseEvent) => {
      const l = Math.min(900, Math.max(280, departL + (departX - ev.clientX)));
      setLargeurPanneau(l);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      sessionStorage.setItem("qrc_v2_panneau", String(largeurPanneauRef.current));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const largeurPanneauRef = useRef(largeurPanneau);
  useEffect(() => { largeurPanneauRef.current = largeurPanneau; }, [largeurPanneau]);

  // Position de défilement : mémorisée localement, restaurée une fois les données serveur chargées
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => sessionStorage.setItem("qrc_v2_scroll", String(window.scrollY)), 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer) clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!session) return;
    const y = Number(sessionStorage.getItem("qrc_v2_scroll") ?? 0);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [session]);

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

  const valider = async (valeur?: number) => {
    const n = valeur ?? note;
    if (!qrcSel || n === null || n === undefined) return;
    if (etatEnvoi === "encours") return;
    setNote(n);
    setEtatEnvoi("encours");
    setErreur(null);
    try {
      await corrigerQrc({
        // identité déterministe : 10 envois = une seule correction
        operationId: `qrcv2:${qrcSel.qrc_instance_id}:${n}`,
        qrcInstanceId: qrcSel.qrc_instance_id,
        note: n,
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

  const nbIndetermines = groupes.find((g) => g.type === "indetermine")?.nbCandidats ?? 0;
  const nbConflits = groupes.find((g) => g.type === "conflit")?.nbCandidats ?? 0;

  return (
    <div ref={conteneurRef} className="flex min-h-screen bg-background">
      <div className="flex-1 p-4 space-y-6 overflow-x-auto">
        <header className="sticky top-0 z-10 bg-background/95 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">Correction QRC V2</h1>
            <select
              data-testid="choix-session"
              className="rounded border bg-background px-2 py-1 text-sm max-w-[420px]"
              value={groupeCle ?? ""}
              onChange={(e) => setGroupeCle(e.target.value)}
            >
              {groupes.map((g) => (
                <option key={g.cle} value={g.cle}>
                  {g.libelle}{g.periode ? ` (${g.periode})` : ""} · {g.nbCandidats} candidat{g.nbCandidats > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <select
              data-testid="choix-eb"
              className="rounded border bg-background px-2 py-1 text-sm"
              value={ebChoisi?.cle ?? ""}
              onChange={(e) => setEbCle(e.target.value)}
            >
              {(groupeChoisi?.examens ?? []).map((e) => (
                <option key={e.cle} value={e.cle}>
                  {e.exam_id} — {e.attemptIds.length} passage{e.attemptIds.length > 1 ? "s" : ""}
                  {" · "}
                  {e.dates.map((d) => `${d.date.slice(0, 5)} (${d.attemptIds.length})`).join(" • ")}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-1">
              <Button size="icon" variant="outline" onClick={() => setZoom(zoom - 10)} aria-label="Réduire le zoom">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-sm tabular-nums" data-testid="niveau-zoom">{zoom}%</span>
              <Button size="icon" variant="outline" onClick={() => setZoom(zoom + 10)} aria-label="Augmenter le zoom">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => void basculerPleinEcran()} aria-label="Plein écran">
                {pleinEcran ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {(ebChoisi?.dates.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1" data-testid="dates-eb">
              <span className="text-xs text-muted-foreground">Dates de passage :</span>
              <Button
                size="sm"
                variant={jourFiltre ? "outline" : "default"}
                onClick={() => setJourFiltre(null)}
                data-testid="date-toutes"
              >
                Toutes ({ebChoisi?.attemptIds.length})
              </Button>
              {(ebChoisi?.dates ?? []).map((d) => (
                <Button
                  key={d.jour}
                  size="sm"
                  variant={jourFiltre === d.jour ? "default" : "outline"}
                  onClick={() => setJourFiltre(d.jour)}
                  data-testid={`date-${d.jour}`}
                >
                  {d.date} ({d.attemptIds.length})
                </Button>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground" data-testid="compteur-session">
            {corrigees}/{total} QRC corrigées — {total - corrigees} restantes
          </p>
          {(nbIndetermines > 0 || nbConflits > 0) && (
            <p className="text-xs text-warning" data-testid="alerte-rattachement">
              ⚠️ {nbIndetermines} candidat(s) sans session CRM déterminée · {nbConflits} candidat(s) avec des sessions CRM qui se chevauchent (aucun choix automatique).
            </p>
          )}
        </header>

        <div style={{ zoom: `${zoom}%` }} className="space-y-6">
        {matieres.map((m) => {
          const tentatives = (session?.tentatives ?? []).filter((t) =>
            (t.snapshot.matieres ?? []).some((x) => x.subject_id === m.subject_id),
          );
          // Plusieurs dates peuvent coexister sous le même EB : on réunit les questions QRC
          // rencontrées dans les snapshots, sans jamais en inventer ni en fusionner d'un autre EB.
          const questions: typeof tentatives[number]["snapshot"]["questions"] = [];
          for (const t of tentatives) {
            for (const q of t.snapshot.questions ?? []) {
              if (q.matiere === m.subject_id && q.type === "QRC" && !questions.some((x) => x.id === q.id)) {
                questions.push(q);
              }
            }
          }
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
                      <th className="px-2 py-1 text-left">PASSAGE</th>
                      {questions.map((q, i) => <th key={q.id} className="px-2 py-1">QRC {i + 1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tentatives.map((t) => (
                      <tr key={t.attempt_id}>
                        <td className="sticky left-0 bg-background px-2 py-1 font-medium whitespace-nowrap">{t.candidat}</td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-muted-foreground">
                          {t.started_at
                            ? new Date(t.started_at).toLocaleString("fr-FR", {
                                timeZone: "Europe/Paris",
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "date inconnue"}
                          {" · "}tentative {t.attempt_id.slice(0, 8)}
                        </td>
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
        </div>
        {erreur && <p className="text-sm text-destructive" data-testid="erreur-admin">{erreur}</p>}
      </div>

      <div
        onMouseDown={demarrerRedim}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau"
        className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
      />
      <aside className="shrink-0 border-l p-4 space-y-3 overflow-y-auto" style={{ width: largeurPanneau }}>
        {!qrcSel && <p className="text-sm text-muted-foreground">Sélectionnez une QRC dans le tableau.</p>}
        {qrcSel && questionSel && tentativeSel && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2 border-b pb-2">
              <span className="font-semibold">{tentativeSel.candidat}</span>
              <span className="text-xs text-muted-foreground">
                {ebChoisi?.exam_id} ·{" "}
                {tentativeSel.started_at
                  ? new Date(tentativeSel.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
                  : "date inconnue"}{" "}
                · tentative {tentativeSel.attempt_id.slice(0, 8)}
              </span>
              <span
                className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${
                  qrcSel.etat === "corrigee"
                    ? "bg-success/15 text-success"
                    : baremeSel == null
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning"
                }`}
                data-testid="etat-qrc"
              >
                {qrcSel.etat === "corrigee"
                  ? `🔒 Correction déjà validée : ${qrcSel.note}${baremeSel != null ? `/${baremeSel}` : ""}`
                  : baremeSel == null
                    ? "🔴 Correction bloquée"
                    : "🟠 À corriger"}
              </span>
            </div>

            <div className="rounded border bg-muted/40 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</p>
              <p className="text-sm">{questionSel.enonce}</p>
            </div>

            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">🧑 Réponse de l'apprenant</p>
              <p data-testid="reponse-eleve" className="whitespace-pre-wrap text-lg leading-relaxed">
                {texte(qrcSel.reponse) || "(copie vide)"}
              </p>
            </div>

            <div className="rounded-lg border border-success/40 bg-success/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">✓ Réponse officielle (snapshot)</p>
              {questionSel.reponseQRC ? (
                <p data-testid="reponse-officielle" className="whitespace-pre-wrap text-base">{questionSel.reponseQRC}</p>
              ) : (
                <p className="text-warning text-sm" data-testid="officielle-absente">⚠️ RÉPONSE OFFICIELLE HISTORIQUE ABSENTE</p>
              )}
            </div>

            {qrcSel.etat === "corrigee" ? (
              <div className="rounded border bg-muted/40 p-3 text-sm" data-testid="correction-verrouillee">
                <p className="font-medium text-success" data-testid="points-attribues">
                  🔒 Correction déjà validée : {qrcSel.note}
                  {baremeSel != null ? `/${baremeSel}` : " (barème historique absent)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Une correction validée n'est jamais modifiée silencieusement : toute révision doit être une action Admin
                  volontaire et journalisée.
                </p>
              </div>
            ) : baremeSel == null ? (
              <p className="rounded border bg-muted p-2 text-sm text-muted-foreground" data-testid="bareme-absent">
                🔴 BARÈME HISTORIQUE INTROUVABLE — CORRECTION BLOQUÉE. Le barème doit être défini manuellement ; il n'est
                jamais repris de la version actuelle de l'examen.
              </p>
            ) : (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notation — barème : {baremeSel} points
                </p>
                {videSel && (
                  <p className="text-xs text-muted-foreground" data-testid="copie-vide-en-attente">
                    Copie vide — aucune correction historique, aucune note automatique.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.round((baremeSel ?? 0) / 0.5) + 1 }, (_, i) => i * 0.5).map((v) => (
                    <Button
                      key={v}
                      size="lg"
                      className="min-w-[56px] text-base font-semibold"
                      variant={note === v ? "default" : "outline"}
                      data-testid={`note-${v}`}
                      disabled={etatEnvoi === "encours"}
                      onClick={() => void valider(v)}
                    >
                      {String(v).replace(".", ",")}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Commentaire (facultatif)"
                  rows={2}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                />
                <div className="text-sm" data-testid="etat-correction">
                  {etatEnvoi === "encours" && <span className="text-warning">🟠 Enregistrement de la correction…</span>}
                  {etatEnvoi === "ok" && <span className="text-success">🟢 Correction enregistrée</span>}
                  {etatEnvoi === "echec" && <span className="text-destructive">🔴 CORRECTION NON ENREGISTRÉE</span>}
                </div>
              </div>
            )}

            <div className="space-y-1 border-t pt-2 text-[11px] text-muted-foreground">
              {qrcSel.corrige_email?.startsWith("Correction historique") && (
                <p data-testid="origine-correction">
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
                <p data-testid="bareme-restaure">
                  {restaureSel.mention} — barème {restaureSel.bareme} points, {restaureSel.nb_preuves} passage(s) de preuve
                </p>
              )}
              <p>{groupeChoisi?.libelle}</p>
            </div>

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
