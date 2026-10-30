import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { quizItems, QuizItem } from "@/data/quiz-qrc-taxi/quizData";
import { ElementReference, METROPOLE_LYON, ZUPC_LYON, distracteurs } from "@/lib/quizQrcTaxi/communesLyon";
import { corrigerCases, corrigerCommunes, corrigerQrc } from "@/lib/quizQrcTaxi/correction";

/** Entraînement facultatif : aucune écriture serveur, aucun jalon, aucune progression. Sauvegarde locale par compte. */
export type QuizQrcTaxiId = "complet" | "specialites";
type Zone = "metropole" | "zupc";

export const QUIZ_QRC_TAXI: Record<QuizQrcTaxiId, { titre: string; items: QuizItem[]; zones: Zone[]; qrcDesLaPremiere: boolean }> = {
  complet: { titre: "QRC TAXI complet", items: quizItems, zones: ["metropole"], qrcDesLaPremiere: false },
  specialites: { titre: "QRC TAXI spécialités", items: quizItems.filter((q) => q.category === "national"), zones: ["zupc", "metropole"], qrcDesLaPremiere: true },
};

const ZONES: Record<Zone, { titre: string; ref: ElementReference[]; consigne: string }> = {
  metropole: { titre: "Communes de la Métropole de Lyon", ref: METROPOLE_LYON, consigne: "58 communes" },
  zupc: { titre: "ZUPC de Lyon", ref: ZUPC_LYON, consigne: "23 communes + l'Aéroport de Lyon-Saint-Exupéry (à citer, ce n'est pas une commune)" },
};

interface Reponse { qcm: string; qrc: string }
interface Etat { index: number; phase: "qcm" | "qrc"; reponses: Record<number, Reponse>; cases: Record<string, string[]>; saisies: Record<string, string>; casesCorrigees: Record<string, boolean>; saisiesCorrigees: Record<string, boolean>; termine: boolean }
const VIDE: Etat = { index: 0, phase: "qcm", reponses: {}, cases: {}, saisies: {}, casesCorrigees: {}, saisiesCorrigees: {}, termine: false };

export const cleStockage = (userId: string, quiz: QuizQrcTaxiId) => `quiz-qrc-taxi:v1:${userId}:${quiz}`;

function Liste({ titre, noms, ton }: { titre: string; noms: string[]; ton: "ok" | "ko" | "neutre" }) {
  if (!noms.length) return null;
  const cls = ton === "ok" ? "text-primary" : ton === "ko" ? "text-destructive" : "text-muted-foreground";
  return <div className="mt-2"><p className={`font-semibold ${cls}`}>{titre} ({noms.length})</p><p className="text-sm">{noms.join(" · ")}</p></div>;
}

function ExerciceZone({ zone, etat, maj }: { zone: Zone; etat: Etat; maj: (f: (e: Etat) => Etat) => void }) {
  const z = ZONES[zone];
  const options = useMemo(() => [...z.ref.map((e) => e.nom), ...distracteurs(zone)].sort((a, b) => a.localeCompare(b, "fr")), [zone, z.ref]);
  const cochees = etat.cases[zone] ?? [];
  const bilanCases = corrigerCases(cochees, z.ref);
  const bilanSaisie = corrigerCommunes(etat.saisies[zone] ?? "", z.ref);
  return (
    <div className="rounded-lg border p-4 space-y-4" data-testid={`zone-${zone}`}>
      <p className="font-semibold text-lg">{z.titre} — {z.consigne}</p>
      <div>
        <p className="font-medium mb-2">a) Cochez les éléments de la liste</p>
        <div className="flex flex-col gap-2">
          {options.map((nom) => (
            <label key={nom} className="flex items-center gap-2">
              <Checkbox checked={cochees.includes(nom)} disabled={etat.casesCorrigees[zone]}
                onCheckedChange={(v) => maj((e) => ({ ...e, cases: { ...e.cases, [zone]: v ? [...cochees, nom] : cochees.filter((n) => n !== nom) } }))} />
              <span>{nom}</span>
            </label>
          ))}
        </div>
        {!etat.casesCorrigees[zone]
          ? <Button className="w-full mt-3" onClick={() => maj((e) => ({ ...e, casesCorrigees: { ...e.casesCorrigees, [zone]: true } }))}>Corriger les cases</Button>
          : <div className="mt-3"><p className="font-semibold">{bilanCases.justes.length}/{z.ref.length} justes</p>
              <Liste titre="Oubliées" noms={bilanCases.oubliees} ton="ko" />
              <Liste titre="Cochées à tort" noms={bilanCases.erronees} ton="ko" /></div>}
      </div>
      <div>
        <p className="font-medium mb-2">b) Écrivez librement toute la liste (une par ligne ou séparées par des virgules)</p>
        <Textarea value={etat.saisies[zone] ?? ""} disabled={etat.saisiesCorrigees[zone]} className="min-h-[140px]"
          onChange={(ev) => maj((e) => ({ ...e, saisies: { ...e.saisies, [zone]: ev.target.value } }))} />
        {!etat.saisiesCorrigees[zone]
          ? <Button className="w-full mt-3" onClick={() => maj((e) => ({ ...e, saisiesCorrigees: { ...e.saisiesCorrigees, [zone]: true } }))}>Corriger ma liste</Button>
          : <div className="mt-3">
              <p className="font-semibold">{bilanSaisie.communesTrouvees}/{bilanSaisie.totalCommunes} communes trouvées
                {zone === "zupc" && ` · Aéroport : ${bilanSaisie.trouvees.includes(ZUPC_LYON[0].nom) ? "cité" : "oublié"}`}</p>
              <Liste titre="Oubliées" noms={bilanSaisie.oubliees} ton="ko" />
              <Liste titre="Réponses erronées (hors zone ou inconnues)" noms={bilanSaisie.erronees} ton="ko" />
              <Liste titre="Citées en double" noms={bilanSaisie.doublons} ton="neutre" />
              <Liste titre="Acceptées malgré l'orthographe" noms={bilanSaisie.orthographe.map((o) => `${o.saisie} → ${o.officiel}`)} ton="neutre" />
            </div>}
        {(etat.casesCorrigees[zone] || etat.saisiesCorrigees[zone]) &&
          <Button variant="outline" className="w-full mt-2" onClick={() => maj((e) => ({ ...e, cases: { ...e.cases, [zone]: [] }, saisies: { ...e.saisies, [zone]: "" }, casesCorrigees: { ...e.casesCorrigees, [zone]: false }, saisiesCorrigees: { ...e.saisiesCorrigees, [zone]: false } }))}>Refaire cet exercice</Button>}
      </div>
    </div>
  );
}

export function QuizQrcTaxiIntegre({ quiz }: { quiz: QuizQrcTaxiId }) {
  const def = QUIZ_QRC_TAXI[quiz];
  const { user } = useAuth();
  const cle = user?.id ? cleStockage(user.id, quiz) : null;
  const [etat, setEtat] = useState<Etat>(VIDE);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    setCharge(false);
    let e = VIDE;
    if (cle) { try { const s = localStorage.getItem(cle); if (s) e = { ...VIDE, ...JSON.parse(s) }; } catch { /* stockage indisponible */ } }
    setEtat(e); setCharge(true);
  }, [cle]);
  useEffect(() => { if (cle && charge) { try { localStorage.setItem(cle, JSON.stringify(etat)); } catch { /* ignore */ } } }, [cle, charge, etat]);

  const maj = (f: (e: Etat) => Etat) => setEtat(f);
  const n = def.items.length;
  const enQuestions = etat.index < n && !etat.termine;
  const item = def.items[etat.index];
  const avecQrc = (i: number) => (def.qrcDesLaPremiere || i >= 1) && !!def.items[i]?.qrcQuestion?.trim();
  const rep = item ? etat.reponses[item.id] ?? { qcm: "", qrc: "" } : { qcm: "", qrc: "" };
  const setRep = (r: Partial<Reponse>) => maj((e) => ({ ...e, reponses: { ...e.reponses, [item.id]: { ...rep, ...r } } }));
  const suivant = () => maj((e) => ({ ...e, index: e.index + 1, phase: "qcm" }));

  if (!charge) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-4" data-testid={`quiz-qrc-taxi-${quiz}`}>
      {enQuestions && item && (
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Question {etat.index + 1} / {n} · {etat.phase === "qcm" ? "QCM" : "QRC"}</p>
          {etat.phase === "qcm" ? (<>
            <p className="text-xl font-semibold">{item.mcqQuestion}</p>
            <div className="flex flex-col gap-2">
              {item.mcqOptions.map((o, i) => (
                <Button key={o} variant={rep.qcm === o ? "default" : "outline"} className="w-full justify-start whitespace-normal h-auto py-3 text-left" onClick={() => setRep({ qcm: o })}>
                  {String.fromCharCode(65 + i)}. {o}
                </Button>
              ))}
            </div>
            <Button className="w-full" disabled={!rep.qcm} onClick={() => avecQrc(etat.index) ? maj((e) => ({ ...e, phase: "qrc" })) : suivant()}>
              {avecQrc(etat.index) ? "Passer à la QRC" : "Question suivante"}
            </Button>
          </>) : (<>
            <p className="text-xl font-semibold">{item.qrcQuestion}</p>
            <Textarea value={rep.qrc} onChange={(ev) => setRep({ qrc: ev.target.value })} className="min-h-[120px]" placeholder="Tapez votre réponse ici..." />
            {item.qrcMultipleAnswers && <p className="text-sm text-muted-foreground">Cette question attend plusieurs éléments de réponse</p>}
            <Button className="w-full" onClick={suivant}>Valider ma réponse</Button>
          </>)}
        </div>
      )}

      {!enQuestions && (<>
        {def.zones.map((z) => <ExerciceZone key={z} zone={z} etat={etat} maj={maj} />)}
        <div className="rounded-lg border p-4 space-y-3">
          <p className="font-semibold text-lg">Correction des {n} questions</p>
          {def.items.map((q, i) => {
            const r = etat.reponses[q.id] ?? { qcm: "", qrc: "" };
            const qcmOk = r.qcm === q.mcqCorrectAnswer;
            const c = avecQrc(i) ? corrigerQrc(r.qrc, q.qrcCorrectAnswer) : null;
            return (
              <div key={q.id} className="border-t pt-3">
                <p className="font-medium">{i + 1}. {q.mcqQuestion}</p>
                <p className={qcmOk ? "text-primary" : "text-destructive"}>QCM : {qcmOk ? "juste" : `faux — attendu : ${q.mcqCorrectAnswer}`}</p>
                {c && <>
                  <p className="font-medium mt-1">{q.qrcQuestion}</p>
                  <p className="text-sm">Votre réponse : {r.qrc || "—"}</p>
                  <p className={c.isCorrect ? "text-primary" : "text-destructive"}>QRC ({c.score} pt) : {c.feedback}</p>
                </>}
              </div>
            );
          })}
        </div>
        <Button variant="outline" className="w-full" onClick={() => setEtat(VIDE)}>Recommencer le quiz</Button>
      </>)}
    </div>
  );
}

export default QuizQrcTaxiIntegre;
