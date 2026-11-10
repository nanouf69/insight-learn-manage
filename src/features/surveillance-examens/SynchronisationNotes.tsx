import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  actualiserCopie, compterParType, EVENEMENT_NOTES_CORRIGEES, LIBELLES_ECART, lireDiagnostic, lireDiagnosticCopie,
  ORDRE_ECARTS, remplacerLigne, VerificationAnnulee, type Diagnostic, type LigneDiagnostic, type Progression,
} from "./synchronisationNotes";

const heure = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" }) : "—";
const nomComplet = (l: { nom: string | null; prenom: string | null }) => `${l.nom ?? "?"} ${l.prenom ?? ""}`.trim();
const etat = (e: LigneDiagnostic["stocke"]) =>
  e ? `${e.status ?? "—"} · ${e.score ?? "—"}/20 · ${e.qrc_restantes ?? "—"} QRC restante(s)` : "aucun résultat";

/**
 * Onglet « Actualiser les notes » : relit la source serveur, compare résultats enregistrés et calcul serveur,
 * et n'actualise que les états dérivés prouvés (verrou, version, journal). Lecture seule par défaut.
 */
export function SynchronisationNotes({ compact = false }: { compact?: boolean }) {
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [lecture, setLecture] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<Set<string>>(new Set());
  // Une opération par copie et par révision lue : double clic = même opération (rejeu serveur).
  const operations = useRef(new Map<string, string>());
  const diagCharge = useRef(false);
  useEffect(() => { diagCharge.current = !!diag; }, [diag]);

  const [progression, setProgression] = useState<Progression | null>(null);
  const annulation = useRef<AbortController | null>(null);
  useEffect(() => () => annulation.current?.abort(), []);

  const verifier = useCallback(async () => {
    annulation.current?.abort();
    const ctrl = new AbortController();
    annulation.current = ctrl;
    setLecture(true); setErreur(null); setMessage(null); setDiag(null); setProgression(null);
    try {
      const d = await lireDiagnostic(undefined, { signal: ctrl.signal, onProgress: (p) => { if (!ctrl.signal.aborted) setProgression(p); } });
      if (!ctrl.signal.aborted) setDiag(d);
    } catch (e) {
      if (annulation.current !== ctrl) return;  // remplacée par une nouvelle vérification
      setDiag(null);
      setErreur(e instanceof VerificationAnnulee
        ? `${e.message}.`
        : `Vérification impossible : ${(e as Error).message}. Aucun résultat partiel n'est affiché.`);
    } finally {
      if (annulation.current === ctrl) { setLecture(false); setProgression(null); annulation.current = null; }
    }
  }, []);
  const annuler = useCallback(() => annulation.current?.abort(), []);

  const relireCopie = useCallback(async (attemptId: string) => {
    const relue = await lireDiagnosticCopie(attemptId);
    setDiag((d) => (d ? { ...d, lignes: remplacerLigne(d.lignes, attemptId, relue) } : d));
    return relue;
  }, []);

  // Revérification automatique de la copie après chaque correction enregistrée (aucune écriture).
  useEffect(() => {
    const surCorrection = (e: Event) => {
      const id = (e as CustomEvent).detail?.attemptId as string | undefined;
      if (!id || !diagCharge.current) return;
      void relireCopie(id).catch((err) => setErreur(`Relecture de la copie impossible : ${(err as Error).message}`));
    };
    window.addEventListener(EVENEMENT_NOTES_CORRIGEES, surCorrection);
    return () => window.removeEventListener(EVENEMENT_NOTES_CORRIGEES, surCorrection);
  }, [relireCopie]);

  const actualiser = useCallback(async (l: LigneDiagnostic) => {
    if (!l.reparable || enCours.has(l.attempt_id)) return;
    const cle = `${l.attempt_id}:${l.result_revision ?? "absent"}`;
    if (!operations.current.has(cle)) operations.current.set(cle, crypto.randomUUID());
    setEnCours((s) => new Set(s).add(l.attempt_id));
    setErreur(null);
    try {
      const r = await actualiserCopie(operations.current.get(cle)!, l);
      const relue = await relireCopie(l.attempt_id);
      setMessage(`${nomComplet(l)} — ${l.exam_id} ${l.titre ?? l.matiere ?? ""} : ${r.statut === "actualise" ? "actualisé" : "déjà cohérent"} (${r.status}, ${r.score ?? "—"}/20, version ${r.result_revision})${relue && relue.reparable ? " — écart persistant, relancer la vérification" : ""}.`);
    } catch (e) {
      setErreur(`${nomComplet(l)} : ${(e as Error).message}`);
      await relireCopie(l.attempt_id).catch(() => undefined);
    } finally {
      setEnCours((s) => { const n = new Set(s); n.delete(l.attempt_id); return n; });
    }
  }, [enCours, relireCopie]);

  const reparables = useMemo(() => (diag?.lignes ?? []).filter((l) => l.reparable), [diag]);
  const actualiserTout = useCallback(async () => {
    for (const l of reparables) await actualiser(l);  // une copie à la fois, chacune avec sa version lue
  }, [reparables, actualiser]);

  const comptes = diag ? compterParType(diag.lignes) : null;
  const lignesTriees = useMemo(() => [...(diag?.lignes ?? [])].sort((a, b) =>
    String(a.exam_id ?? "").localeCompare(String(b.exam_id ?? ""), "fr", { numeric: true }) || nomComplet(a).localeCompare(nomComplet(b), "fr")), [diag]);
  const anciennesSans = (diag?.anciennes ?? []).filter((a) => a.type === "ancienne_copie_sans_correction");
  const anciennesV2 = (diag?.anciennes ?? []).filter((a) => a.type === "ancienne_copie_v2_meme_matiere");
  const defauts = comptes ? ORDRE_ECARTS.filter((t) => t !== "qrc_non_corrigee").reduce((s, t) => s + comptes[t], 0) : 0;

  return (
    <section data-testid="synchronisation-notes" className={`space-y-4 rounded-lg border bg-card p-4 ${compact ? "text-sm" : ""}`}>
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Actualiser les notes</h2>
        <Button data-testid="verifier-actualiser" onClick={() => void verifier()} disabled={lecture}>
          {lecture ? "Vérification en cours…" : "Vérifier et actualiser"}
        </Button>
        {lecture && (
          <Button variant="outline" size="sm" data-testid="annuler-verification" onClick={annuler}>Annuler</Button>
        )}
        {reparables.length > 0 && (
          <Button variant="destructive" data-testid="actualiser-tout" disabled={enCours.size > 0} onClick={() => void actualiserTout()}>
            Actualiser les {reparables.length} copie(s) réparable(s)
          </Button>
        )}
        {diag && <span className="text-xs text-muted-foreground">Lu sur le serveur le {heure(diag.luA)}</span>}
      </header>
      <p className="text-xs text-muted-foreground">
        La vérification ne modifie rien. Une actualisation ne recalcule que le statut d'une copie terminée avec la formule serveur ;
        elle n'attribue jamais de note, ne change jamais une note existante et ne transforme jamais une correction automatique en correction humaine.
      </p>
      {lecture && progression && (
        <div role="status" data-testid="progression-verification" className="space-y-1">
          <p className="text-sm">
            {progression.circuit === "nouveau" ? "Étape 1/2 — nouveau correcteur" : "Étape 2/2 — anciennes copies"} :{" "}
            {progression.lues}{progression.total != null ? ` / ${progression.total}` : ""} copies lues (lot {progression.lot})
          </p>
          {progression.total ? (
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((progression.lues / progression.total) * 100))}%` }} />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">Aucun résultat n'est affiché avant la fin complète de la lecture.</p>
        </div>
      )}
      {erreur && <p role="alert" className="rounded border border-destructive bg-destructive/10 p-2 font-semibold text-destructive">{erreur}</p>}
      {message && <p role="status" className="rounded border bg-muted p-2">{message}</p>}

      {diag && comptes && (
        <>
          <div className="flex flex-wrap gap-2" data-testid="compteurs-synchronisation">
            {diag.couverture && (
              <Badge variant="secondary" data-testid="couverture-verification">
                Lecture complète : {diag.couverture.nouveau.lues}/{diag.couverture.nouveau.total ?? "?"} copies nouveau correcteur · {diag.couverture.ancien.lues}/{diag.couverture.ancien.total ?? "?"} anciennes copies
              </Badge>
            )}
            <Badge variant="outline">{diag.terminees} copies terminées vérifiées</Badge>
            <Badge variant="outline">{diag.enCours} en cours (jamais touchées)</Badge>
            <Badge variant={defauts ? "destructive" : "secondary"}>{defauts} défaut(s)</Badge>
            <Badge variant="secondary">{comptes.qrc_non_corrigee} copie(s) en attente normale</Badge>
            <Badge variant={anciennesSans.length ? "destructive" : "secondary"}>{anciennesSans.length} ancienne(s) copie(s) sans correction humaine</Badge>
            <Badge variant="outline">{anciennesV2.length} ancienne(s) copie(s) avec copie nouveau correcteur même matière</Badge>
            <Badge variant="outline">{diag.importeesSansBareme} copie(s) importée(s) sans barème</Badge>
          </div>
          <ul className="grid gap-1 text-sm">
            {ORDRE_ECARTS.map((t) => (
              <li key={t} className={comptes[t] && t !== "qrc_non_corrigee" ? "font-semibold text-destructive" : ""}>
                {LIBELLES_ECART[t]} : {comptes[t]}
              </li>
            ))}
          </ul>

          {lignesTriees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="lignes-synchronisation">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="p-1">Candidat</th><th className="p-1">Examen</th><th className="p-1">Matière</th><th className="p-1">Fin</th>
                    <th className="p-1">Constat</th><th className="p-1">Enregistré</th><th className="p-1">Calcul serveur</th><th className="p-1" />
                  </tr>
                </thead>
                <tbody>
                  {lignesTriees.map((l) => (
                    <tr key={l.attempt_id} className="border-t align-top" data-type={l.type}>
                      <td className="p-1 font-medium">{nomComplet(l)}</td>
                      <td className="p-1">{l.exam_id}</td>
                      <td className="p-1">{l.titre ?? l.matiere}</td>
                      <td className="p-1 whitespace-nowrap">{heure(l.finished_at)}</td>
                      <td className={`p-1 ${l.type === "qrc_non_corrigee" ? "" : "font-semibold text-destructive"}`}>{LIBELLES_ECART[l.type]}</td>
                      <td className="p-1">{etat(l.stocke)}</td>
                      <td className="p-1">{etat(l.attendu)}</td>
                      <td className="p-1">
                        {l.reparable ? (
                          <Button size="sm" variant="outline" disabled={enCours.has(l.attempt_id)} onClick={() => void actualiser(l)}>
                            {enCours.has(l.attempt_id) ? "…" : "Actualiser cette copie"}
                          </Button>
                        ) : l.type !== "qrc_non_corrigee" ? <span className="text-xs">Vérification humaine</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {anciennesSans.length > 0 && (
            <details open={!compact}>
              <summary className="cursor-pointer font-semibold text-destructive">
                Anciennes copies avec QRC sans correction humaine ({anciennesSans.length}) — affichées « En attente » chez l'élève
              </summary>
              <table className="mt-2 w-full text-sm" data-testid="anciennes-sans-correction">
                <thead><tr className="text-left text-muted-foreground"><th className="p-1">Candidat</th><th className="p-1">Examen</th><th className="p-1">Matière</th><th className="p-1">Tentative</th><th className="p-1">Fin</th><th className="p-1">QRC</th><th className="p-1">Correction possible</th></tr></thead>
                <tbody>
                  {[...anciennesSans].sort((a, b) => String(a.exam_id ?? "").localeCompare(String(b.exam_id ?? ""), "fr", { numeric: true }) || nomComplet(a).localeCompare(nomComplet(b), "fr")).map((a) => (
                    <tr key={a.result_id} className="border-t">
                      <td className="p-1 font-medium">{nomComplet(a)}</td><td className="p-1">{a.exam_id}</td><td className="p-1">{a.titre ?? a.matiere}</td>
                      <td className="p-1">{a.tentative ?? "—"}</td><td className="p-1 whitespace-nowrap">{heure(a.completed_at)}</td><td className="p-1">{a.qrc_sans_correction_humaine}</td>
                      <td className="p-1">{a.circuit_notation === "aucun" ? "Aucune (TAXI ancien circuit)" : "Seulement si la remise est prouvée"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </section>
  );
}

export default SynchronisationNotes;
