import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { QuizItem } from '@/data/quiz-qrc-taxi/quizData';
import { QcmBilanTa } from '@/data/bilan-ta/qcmLocauxBilanTa';
import { METROPOLE_LYON, ZUPC_LYON, distracteurs } from '@/lib/quizQrcTaxi/communesLyon';
import { corrigerCases, corrigerCommunes } from '@/lib/quizQrcTaxi/correction';
import { AnswerValue, PracticeQuiz, QUIZ_DEFINITIONS, legacyAnswers, missingAnswers, requirements, validAnswer } from '@/lib/quizQrcTaxi/manifest';
import { useDurablePractice } from '@/lib/quizQrcTaxi/useDurablePractice';
import { CorrectionQrcTaxiIA } from './CorrectionQrcTaxiIA';

export type QuizQrcTaxiId = PracticeQuiz;
export const QUIZ_QRC_TAXI = QUIZ_DEFINITIONS;
export const cleStockage = (account: string, quiz: PracticeQuiz) => `quiz-qrc-taxi:v1:${account}:${quiz}`;
export const qcmLocalJuste = (q: QcmBilanTa, choices: string[]) => q.choix.filter(c => c.correct).map(c => c.lettre).sort().join() === [...choices].sort().join();

/** Feedback only: original references and local answers remain untouched pending arbitration. */
export function alerteReglementaireQrc(q: QuizItem): string | null {
  if (q.qrcQuestion === "Quelle est la sanction encourue pour exercice de l'activité de conducteur de taxi sans être titulaire de la carte professionnelle en cours de validité ?") {
    return "Corrigé en attente d’arbitrage : la loi du 25 juin 2026 prévoit aussi un délit de transport sans la carte professionnelle correspondante (3 ans et 45 000 €). L’articulation avec la contravention pour carte non valide doit être distinguée ; les 3 000 € en récidive ne sont pas établis pour ce cas. Une carte jamais délivrée ne peut pas être retirée. La référence historique ci-dessous n’est pas un corrigé juridiquement validé.";
  }
  if (q.qrcQuestion === "Quelles sont les conditions de stationnement des taxis en attente de la clientèle ?") {
    return "Corrigé en attente d’arbitrage : vert signifie libre, rouge occupé, et non simplement dans ou hors du ressort de l’ADS. Hors ressort, la réservation préalable ne donne pas un droit illimité d’attente dans toute station. La règle universelle sur la gaine opaque n’est pas établie par les textes vérifiés. La référence historique ci-dessous n’est pas un corrigé juridiquement validé.";
  }
  if (q.qrcQuestion === "Citez 4 équipements obligatoires hors ceux cités ci-après : taximètre, lumineux, plaques scellées, imprimante :") {
    return "Précision vérifiée : terminal de paiement électronique (TPE), carnet de métrologie et affichette des tarifs. La trousse de secours est obligatoire si le taxi est conventionné CPAM ; cette convention ne l’impose pas à tous les taxis. L’énoncé demandant quatre équipements universellement obligatoires reste à arbitrer. Le facturier et l’horodateur de la référence historique ne sont pas établis comme obligations universelles. Le barème historique est conservé, sans recalcul des réponses enregistrées.";
  }
  return null;
}


const arrayAnswer = (value: AnswerValue | undefined): string[] => Array.isArray(value) ? value : [];
const textAnswer = (value: AnswerValue | undefined): string => typeof value === 'string' ? value : '';
const dateText = (date: string) => new Date(date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

export function QuizQrcTaxiIntegre({ quiz }: { quiz: PracticeQuiz }) {
  const { user } = useAuth();
  const state = useDurablePractice(user?.id, quiz);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'qcm' | 'qrc'>('qcm');
  const [legacy, setLegacy] = useState<{ answers: Record<string, AnswerValue>; rejected: string[] }>();
  const def = QUIZ_QRC_TAXI[quiz];
  const rules = state.attempt?.manifest ?? requirements(quiz);
  const missing = missingAnswers(rules, state.answers);
  const submitted = !!state.attempt?.submitted_at;
  const frozen = submitted || state.busy && !state.pending.length;
  const item = def.items[index];
  useEffect(() => {
    setIndex(0); setPhase('qcm'); setLegacy(undefined);
    if (!user?.id) return;
    try { const raw = localStorage.getItem(cleStockage(user.id, quiz)); if (raw) setLegacy(legacyAnswers(JSON.parse(raw), requirements(quiz))); }
    catch { setLegacy({ answers: {}, rejected: ['Ancienne sauvegarde illisible, conservée sur cet appareil'] }); }
  }, [user?.id, quiz]);
  const stamp = (key: string) => {
    const meta = state.attempt?.answer_meta?.[key];
    return <p className="text-sm text-muted-foreground">{state.pending.some(p => p.key === key) ? 'Saisie conservée sur cet appareil — sauvegarde serveur en attente' : meta?.saved_at ? `Sauvegardée le ${dateText(meta.saved_at)}` : 'Pas encore sauvegardée'}</p>;
  };
  const go = (key: string) => {
    const [kind, id] = key.split(':');
    if (kind === 'mcq' || kind === 'qrc') { setIndex(def.items.findIndex(q => String(q.id) === id)); setPhase(kind === 'qrc' ? 'qrc' : 'qcm'); }
    else setIndex(def.items.length);
    setTimeout(() => document.getElementById(`practice-${quiz}-${key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
  };
  const importLegacy = () => {
    if (!legacy || !state.attempt) return;
    for (const [key, answer] of Object.entries(legacy.answers)) {
      if (state.answers[key] === undefined) state.edit(key, answer);
    }
    setLegacy(undefined);
  };
  if (state.loading) return <p role="status">Lecture de votre sauvegarde…</p>;
  if (!state.attempt) return <div className="space-y-3"><p role="alert">{state.error || 'Sauvegarde indisponible.'}</p><Button onClick={() => void state.synchronize()}>Réessayer la lecture</Button></div>;

  return <div className="space-y-4" data-testid={`quiz-qrc-taxi-${quiz}`}>
    <div className="border-b pb-3 space-y-2">
      <p className="font-semibold">{submitted ? `Quiz soumis le ${dateText(state.attempt.submitted_at ?? '')}` : `${rules.length - missing.length}/${rules.length} réponses renseignées — non soumis`}</p>
      <p role="status" className="text-sm text-muted-foreground">{state.busy ? 'Envoi en cours…' : state.pending.length ? `${state.pending.length} sauvegarde(s) en attente` : state.attempt.saved_at ? `Sauvegarde serveur : ${dateText(state.attempt.saved_at)}` : 'Brouillon ouvert'}</p>
      {state.error && <p role="alert" className="text-destructive">{state.error}</p>}
      {!!state.error && !state.conflicts.length && <Button variant="outline" disabled={state.busy} onClick={() => void state.synchronize()}>Réessayer la sauvegarde</Button>}
      {state.conflicts.map(key => <div key={key} className="space-y-2"><p>{rules.find(r => r.key === key)?.label} — deux versions conservées</p><p className="break-words">Autre appareil : {textAnswer(state.attempt?.answers[key]) || arrayAnswer(state.attempt?.answers[key]).join(', ')}</p><Button variant="outline" onClick={() => state.resolve(key, true)}>Enregistrer ma version</Button><Button variant="outline" onClick={() => state.resolve(key, false)}>Garder la version serveur</Button></div>)}
      {legacy && !submitted && (Object.keys(legacy.answers).length > 0 || legacy.rejected.length > 0) && <div className="space-y-2"><p>Anciennes réponses conservées sur cet appareil : {Object.keys(legacy.answers).length}.</p>{legacy.rejected.length > 0 && <p className="text-destructive">À vérifier : {legacy.rejected.join(', ')}</p>}<Button variant="outline" onClick={importLegacy}>Reprendre les anciennes réponses manquantes</Button></div>}
      {!submitted && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setIndex(0); setPhase('qcm'); }}>Questions</Button><Button variant="outline" onClick={() => setIndex(def.items.length)}>Exercices et soumission</Button></div>}
    </div>

    {!submitted && item && index < def.items.length && <div className="border p-4 rounded-lg space-y-4">
      <p className="text-sm text-muted-foreground">Question {index + 1} / {def.items.length} · {phase === 'qcm' ? 'QCM' : 'QRC'}</p>
      {alerteReglementaireQrc(item) && <p role="note" className="text-sm text-destructive">{alerteReglementaireQrc(item)}</p>}
      {phase === 'qcm' ? <div id={`practice-${quiz}-mcq:${item.id}`} className="space-y-3">
        <p className="text-xl font-semibold">{item.mcqQuestion}</p>
        {item.mcqOptions.map((option, n) => { const letter = String.fromCharCode(65 + n); return <Button key={letter} disabled={frozen} variant={state.answers[`mcq:${item.id}`] === letter ? 'default' : 'outline'} className="w-full h-auto py-3 justify-start whitespace-normal text-left" onClick={() => state.edit(`mcq:${item.id}`, letter)}>{letter}. {option}</Button>; })}
        {stamp(`mcq:${item.id}`)}
        <Button className="w-full" disabled={!state.answers[`mcq:${item.id}`]} onClick={() => rules.some(r => r.key === `qrc:${item.id}`) ? setPhase('qrc') : setIndex(index + 1)}>{rules.some(r => r.key === `qrc:${item.id}`) ? 'Passer à la QRC' : 'Question suivante'}</Button>
      </div> : <div id={`practice-${quiz}-qrc:${item.id}`} className="space-y-3">
        <p className="text-xl font-semibold">{item.qrcQuestion}</p>
        <Textarea disabled={frozen} maxLength={4000} className="min-h-[120px]" placeholder="Tapez votre réponse ici..." value={textAnswer(state.answers[`qrc:${item.id}`])} onChange={e => state.edit(`qrc:${item.id}`, e.target.value)} />
        {item.qrcMultipleAnswers && <p className="text-sm text-muted-foreground">Cette question attend plusieurs éléments de réponse</p>}
        {stamp(`qrc:${item.id}`)}
        <Button className="w-full" disabled={!textAnswer(state.answers[`qrc:${item.id}`]).trim()} onClick={() => { setIndex(index + 1); setPhase('qcm'); }}>Question suivante</Button>
      </div>}
      <Button variant="outline" disabled={index === 0 && phase === 'qcm'} onClick={() => { if (phase === 'qrc') setPhase('qcm'); else { setIndex(Math.max(0, index - 1)); setPhase('qcm'); } }}>Précédente</Button>
    </div>}

    {(submitted || index >= def.items.length) && <>
      {def.qcmLocaux.length > 0 && <section data-testid="qcm-locaux-ta" className="space-y-4"><p className="font-semibold text-lg">QCM Réglementation locale — repris du Bilan examen TA ({def.qcmLocaux.length} questions)</p><p className="text-sm text-muted-foreground">Questions à choix : cochez la ou les bonnes réponses.</p>{def.qcmLocaux.map(q => {
        const choices = arrayAnswer(state.answers[`local:${q.id}`]);
        return <div id={`practice-${quiz}-local:${q.id}`} key={q.id} className="border-t pt-3 space-y-2"><p className="font-medium">{q.id}. {q.enonce}</p>{q.choix.map(c => <label key={c.lettre} className="flex items-center gap-2"><Checkbox disabled={submitted || frozen} checked={choices.includes(c.lettre)} onCheckedChange={v => state.edit(`local:${q.id}`, v ? [...choices, c.lettre] : choices.filter(l => l !== c.lettre))} /><span>{c.lettre}. {c.texte}</span></label>)}{stamp(`local:${q.id}`)}{submitted && <p className={qcmLocalJuste(q, choices) ? 'text-primary' : 'text-destructive'}>{qcmLocalJuste(q, choices) ? 'Juste' : `Faux — attendu : ${q.choix.filter(c => c.correct).map(c => `${c.lettre}. ${c.texte}`).join(' + ')}`}</p>}</div>;
      })}</section>}
      {def.zones.map(zone => {
        const ref = zone === 'metropole' ? METROPOLE_LYON : ZUPC_LYON;
        const chosen = arrayAnswer(state.answers[`cases:${zone}`]); const text = textAnswer(state.answers[`list:${zone}`]);
        const cases = corrigerCases(chosen, ref), list = corrigerCommunes(text, ref);
        return <section key={zone} data-testid={`zone-${zone}`} className="border-t pt-4 space-y-3">
          <p className="font-semibold text-lg">{zone === 'metropole' ? 'Communes de la Métropole de Lyon — 58 communes' : "ZUPC de Lyon — 23 communes + l'Aéroport de Lyon-Saint-Exupéry (à citer, ce n'est pas une commune)"}</p>
          <div id={`practice-${quiz}-cases:${zone}`} className="space-y-2"><p className="font-medium">a) Cochez les éléments de la liste</p>{[...ref.map(e => e.nom), ...distracteurs(zone)].sort((a, b) => a.localeCompare(b, 'fr')).map(name => <label className="flex items-center gap-2" key={name}><Checkbox checked={chosen.includes(name)} disabled={submitted || frozen} onCheckedChange={v => state.edit(`cases:${zone}`, v ? [...chosen, name] : chosen.filter(n => n !== name))} /><span>{name}</span></label>)}{stamp(`cases:${zone}`)}</div>
          <div id={`practice-${quiz}-list:${zone}`} className="space-y-2"><p className="font-medium">b) Écrivez librement toute la liste (une par ligne ou séparées par des virgules)</p><Textarea className="min-h-[140px]" maxLength={8000} value={text} disabled={submitted || frozen} onChange={e => state.edit(`list:${zone}`, e.target.value)} />{stamp(`list:${zone}`)}</div>
          {submitted && <div className="space-y-2"><p>{cases.justes.length}/{ref.length} cases justes</p><p>{list.communesTrouvees}/{list.totalCommunes} communes trouvées{zone === 'zupc' && ` · Aéroport : ${list.trouvees.includes(ZUPC_LYON[0].nom) ? 'cité' : 'oublié'}`}</p><p className="text-destructive">Oubliées : {list.oubliees.join(' · ') || '—'}</p><p className="text-destructive">Réponses erronées : {list.erronees.join(' · ') || '—'}</p><p className="text-muted-foreground">Acceptées malgré l'orthographe : {list.orthographe.map(o => `${o.saisie} → ${o.officiel}`).join(' · ') || '—'}</p></div>}
        </section>;
      })}
      {!submitted && <section className="border-t pt-4 space-y-3">
        {missing.length > 0 && <><p className="font-semibold">Réponses manquantes ({missing.length})</p><div className="flex flex-col items-start gap-1">{missing.map(r => <Button variant="link" key={r.key} className="h-auto whitespace-normal text-left" onClick={() => go(r.key)}>{r.label}</Button>)}</div></>}
        <Button className="w-full" disabled={state.busy || !!state.pending.length || !!missing.length || !!state.conflicts.length} onClick={() => void state.submit()}>{state.busy ? 'Envoi en cours…' : 'Soumettre le quiz'}</Button>
      </section>}
      {submitted && <section className="border-t pt-4 space-y-3"><p className="font-semibold text-lg">Correction des {def.items.length} questions</p>{def.items.map((q, i) => <div className="border-t pt-3 space-y-2" key={q.id}><p className="font-medium">{i + 1}. {q.mcqQuestion}</p>{alerteReglementaireQrc(q) && <p role="note" className="text-sm text-destructive">{alerteReglementaireQrc(q)}</p>}<p>QCM : {q.mcqOptions[Number(textAnswer(state.answers[`mcq:${q.id}`]).charCodeAt(0)) - 65] === q.mcqCorrectAnswer ? 'juste' : `faux — attendu : ${q.mcqCorrectAnswer}`}</p>{rules.some(r => r.key === `qrc:${q.id}`) && <><p>{q.qrcQuestion}</p><p className="break-words">Votre réponse : {textAnswer(state.answers[`qrc:${q.id}`])}</p><CorrectionQrcTaxiIA quiz={quiz} questionId={q.id} answer={textAnswer(state.answers[`qrc:${q.id}`])} attemptId={state.attempt?.id} /></>}</div>)}<Button variant="outline" className="w-full" disabled={state.busy} onClick={() => void state.fresh()}>Nouvelle tentative — conserver celle-ci</Button></section>}
    </>}
  </div>;
}
export default QuizQrcTaxiIntegre;
