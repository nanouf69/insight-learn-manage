// Trois exercices interactifs du module PRATIQUE TAXI (id 6), ajoutés le 21/10/2026.
// Réalisation confirmée par le serveur (reponses_apprenants via la file durable existante),
// jamais de note ; un module déjà validé n'est jamais rouvert (gel par module du registre).
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarDays, Calculator, Route, CheckCircle2, XCircle } from "lucide-react";
import { useSuiviJeu, type EtatSuivi } from "../jeux-lyon/useSuiviJeu";
import { ecouterDemandeJeu } from "@/lib/demandeJeuRegistre";
import { JOURS_FERIES_2026, OPTIONS_TARIF, QUESTIONS_FERIES, QUESTIONS_TARIFS, SCENARIOS_RTST, SOURCE_TARIFS, type ChampRtst, type QuestionQcm } from "./exercicesTaxiData";
import { evaluerScenario, qcmJuste, qcmTermine, saisieComplete, scenariosTermines, type SaisieRtst } from "./exercicesTaxiLogic";

export const ID_FERIES = "exo_taxi_jours_feries_2026";
export const ID_TARIFS = "exo_taxi_tarifs_2026";
export const ID_RTST = "exo_taxi_scenarios_rtst";

const LIBELLE: Record<EtatSuivi, string> = {
  inconnu: "Suivi non disponible (aperçu ou compte non identifié)",
  a_faire: "À terminer",
  envoi: "Envoi au serveur…",
  attente_locale: "Enregistré sur cet appareil — en attente du serveur",
  confirme: "Terminé — confirmé par le serveur",
  lecture_impossible: "Lecture du suivi impossible — rien n'est perdu, réessayez",
};
function BadgeEtat({ etat }: { etat: EtatSuivi }) {
  return <Badge role="status" variant={etat === "confirme" ? "default" : etat === "lecture_impossible" ? "destructive" : "outline"}>{LIBELLE[etat]}</Badge>;
}

function Qcm({ compteId, exerciceId, questions, extra }: { compteId: string | null; exerciceId: string; questions: QuestionQcm[]; extra?: React.ReactNode }) {
  const suivi = useSuiviJeu(compteId, exerciceId);
  const [rep, setRep] = useState<Record<string, number>>({});
  useEffect(() => { const r = (suivi.reponses as any)?.choix; if (r && typeof r === "object") setRep(r); }, [suivi.reponses]);
  const choisir = (id: string, i: number) => {
    if (typeof rep[id] === "number") return; // une réponse donnée n'est pas réécrite
    const n = { ...rep, [id]: i }; setRep(n);
    void suivi.enregistrer({ choix: n }, qcmTermine(questions, n));
  };
  const score = questions.filter((q) => qcmJuste(q, rep[q.id])).length;
  const nb = Object.keys(rep).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><BadgeEtat etat={suivi.etat} /><span className="text-sm text-muted-foreground">{nb}/{questions.length} répondues · {score} justes (repère, non noté)</span></div>
      {extra}
      {questions.map((q, k) => {
        const c = rep[q.id];
        return (
          <div key={q.id} data-learner-question className="rounded-xl border bg-card p-4 space-y-3">
            <p className="font-semibold text-lg">{k + 1}. {q.question}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const fait = typeof c === "number";
                const cls = !fait ? "hover:bg-muted" : i === q.bonne ? "border-primary bg-primary/10" : i === c ? "border-destructive bg-destructive/10" : "opacity-60";
                return <button key={i} type="button" disabled={fait} onClick={() => choisir(q.id, i)} className={`min-h-11 rounded-lg border px-3 py-2 text-left ${cls}`}>{String.fromCharCode(65 + i)}. {o}</button>;
              })}
            </div>
            {typeof c === "number" && (
              <p className="text-sm"><span className="font-bold text-destructive">Corrigé : {q.options[q.bonne]}</span> — {q.explication}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Calendrier() {
  const mois = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label="Calendrier 2026 des jours fériés">
      {mois.map((m, i) => {
        const j = JOURS_FERIES_2026.filter((f) => Number(f.iso.slice(5, 7)) === i + 1);
        return <div key={m} className="rounded-lg border p-2 text-sm"><p className="font-semibold">{m}</p>{j.length ? j.map((f) => <p key={f.id} className="text-destructive font-bold">{Number(f.iso.slice(8))} · {f.nom}</p>) : <p className="text-muted-foreground">—</p>}</div>;
      })}
    </div>
  );
}

const CHAMPS: { c: ChampRtst; l: string }[] = [
  { c: "reservation", l: "R — Réservation (€)" }, { c: "tarif", l: "T — Tarif" },
  { c: "supplements", l: "S — Suppléments (€)" }, { c: "attente", l: "T — Temps d'attente (€)" },
];
function Scenarios({ compteId }: { compteId: string | null }) {
  const suivi = useSuiviJeu(compteId, ID_RTST);
  const [saisies, setSaisies] = useState<Record<string, SaisieRtst>>({});
  const [valides, setValides] = useState<Record<string, boolean>>({});
  const [i, setI] = useState(0);
  useEffect(() => {
    const r = suivi.reponses as any;
    if (r?.saisies) setSaisies(r.saisies);
    if (r?.valides) setValides(r.valides);
  }, [suivi.reponses]);
  const sc = SCENARIOS_RTST[i];
  const s = saisies[sc.id] ?? {};
  const fait = !!valides[sc.id];
  const res = fait ? evaluerScenario(sc, s) : null;
  const maj = (c: ChampRtst, v: string) => { if (!fait) setSaisies((x) => ({ ...x, [sc.id]: { ...s, [c]: v } })); };
  const corriger = () => {
    const v = { ...valides, [sc.id]: true }; setValides(v);
    void suivi.enregistrer({ saisies, valides: v }, scenariosTermines(SCENARIOS_RTST.map((x) => x.id), v));
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><BadgeEtat etat={suivi.etat} /><span className="text-sm text-muted-foreground">{Object.keys(valides).length}/13 corrigés</span></div>
      <div className="flex flex-wrap gap-1">{SCENARIOS_RTST.map((x, k) => <Button key={x.id} size="sm" variant={k === i ? "default" : valides[x.id] ? "secondary" : "outline"} onClick={() => setI(k)}>{k + 1}</Button>)}</div>
      <div data-learner-question className="rounded-xl border bg-card p-4 space-y-3">
        <p className="font-semibold text-lg">Étape {i + 1}/13 — {sc.titre}</p>
        <p data-learner-passage>{sc.enonce}</p>
        <p className="text-xs text-muted-foreground">Sans date ni heure indiquée : journée ordinaire en semaine.</p>
        <div className="flex flex-col gap-3">
          {CHAMPS.map(({ c, l }) => (
            <label key={c} className="flex flex-col gap-1 text-sm font-medium">{l}
              {c === "tarif" ? (
                <select disabled={fait} value={s.tarif ?? ""} onChange={(e) => maj("tarif", e.target.value)} className="h-11 rounded-md border bg-background px-3">
                  <option value="">Choisir…</option>{OPTIONS_TARIF.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : <Input inputMode="decimal" disabled={fait} value={s[c] ?? ""} onChange={(e) => maj(c, e.target.value)} placeholder="ex. 4 ou 10,33" />}
              {res && (
                <span className="text-sm font-normal">
                  {res[c] ? <CheckCircle2 className="inline h-4 w-4 text-primary" /> : <XCircle className="inline h-4 w-4 text-destructive" />}{" "}
                  <span className="font-bold text-destructive">{sc.attendu[c]}</span> — {sc.justification[c]}
                </span>
              )}
            </label>
          ))}
        </div>
        {!fait ? <Button disabled={!saisieComplete(s)} onClick={corriger}>Voir le corrigé</Button>
          : i < 12 && <Button variant="secondary" onClick={() => setI(i + 1)}>Étape suivante</Button>}
      </div>
    </div>
  );
}

const EXOS = [
  { id: ID_FERIES, titre: "Jours fériés 2026 (Rhône)", icone: CalendarDays },
  { id: ID_TARIFS, titre: "Quiz tarifs et suppléments 2026", icone: Calculator },
  { id: ID_RTST, titre: "13 scénarios RTST", icone: Route },
];

export default function ExercicesPratiqueTaxi({ compteId }: { compteId: string | null }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  useEffect(() => ecouterDemandeJeu((id) => { if (EXOS.some((e) => e.id === id)) setOuvert(id); }), []);
  const titre = useMemo(() => EXOS.find((e) => e.id === ouvert)?.titre ?? "", [ouvert]);
  return (
    <section className="rounded-2xl border bg-card p-4 space-y-3" aria-label="Exercices pratiques TAXI">
      <h3 className="text-xl font-bold">Exercices pratiques TAXI</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {EXOS.map(({ id, titre: t, icone: I }) => <Button key={id} variant="outline" className="h-auto min-h-14 justify-start gap-2 whitespace-normal text-left" onClick={() => setOuvert(id)}><I className="h-5 w-5 shrink-0" />{t}</Button>)}
      </div>
      <Dialog open={!!ouvert} onOpenChange={(o) => !o && setOuvert(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{titre}</DialogTitle><DialogDescription>Source des tarifs : {SOURCE_TARIFS}.</DialogDescription></DialogHeader>
          {ouvert === ID_FERIES && <Qcm compteId={compteId} exerciceId={ID_FERIES} questions={QUESTIONS_FERIES} extra={<Calendrier />} />}
          {ouvert === ID_TARIFS && <Qcm compteId={compteId} exerciceId={ID_TARIFS} questions={QUESTIONS_TARIFS} />}
          {ouvert === ID_RTST && <Scenarios compteId={compteId} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
