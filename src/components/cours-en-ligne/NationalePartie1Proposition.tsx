import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { NATIONALE_PARTIE1_AJOUTS, corrigerProposition } from './exercices/nationale-partie1-ajouts';

/** Separate from moduleData: not eligible for editor autosave or learner writes. */
export default function NationalePartie1Proposition() {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [corrected, setCorrected] = useState(false);
  const [saved, setSaved] = useState<Record<string, string[]> | null>(null);
  const result = corrigerProposition(NATIONALE_PARTIE1_AJOUTS, answers);
  return <section className="space-y-6 border-t pt-6">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-lg font-bold">Réglementation Nationale — Partie 1 : ajouts proposés</h3>
      <Badge variant="secondary">25 nouvelles questions · non publiées</Badge>
    </div>
    <p className="text-sm text-muted-foreground">Les 64 questions actuelles restent inchangées. Proposition séparée, sans enregistrement dans les dossiers élèves.</p>
    {NATIONALE_PARTIE1_AJOUTS.map((q, index) => <article key={q.id} className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{q.theme} · identifiant proposé {q.id}</p>
      <h4 className="text-lg font-semibold">{index + 65}. {q.enonce}</h4>
      {q.choix.map(c => <label key={c.lettre} className="flex min-h-11 items-start gap-3 py-2">
        <Checkbox className="mt-1 h-5 w-5 shrink-0" aria-label={`Question ${q.id}, réponse ${c.lettre}`} checked={(answers[String(q.id)] ?? []).includes(c.lettre)} onCheckedChange={checked => {
          setCorrected(false);
          setAnswers(prev => ({ ...prev, [q.id]: checked ? [...(prev[String(q.id)] ?? []), c.lettre] : (prev[String(q.id)] ?? []).filter(v => v !== c.lettre) }));
        }} />
        <span>{c.lettre}. {c.texte}</span>
      </label>)}
      {corrected && <div className="space-y-2 border-t pt-3">
        <p className={result[index]?.correct ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>{result[index]?.correct ? 'Réponse exacte' : 'À revoir'}</p>
        <p className="font-medium">Réponse : {q.choix.filter(c => c.correct).map(c => `${c.lettre}. ${c.texte}`).join(' ; ')}</p>
        <p className="text-sm">{q.explication}</p>
        <a className="text-sm text-primary underline" href={q.source} target="_blank" rel="noreferrer">Texte officiel</a>
      </div>}
    </article>)}
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => setSaved(structuredClone(answers))}>Conserver cette saisie dans l’aperçu</Button>
      <Button variant="outline" disabled={!saved} onClick={() => { if (saved) { setAnswers(structuredClone(saved)); setCorrected(false); } }}>Reprendre la saisie</Button>
      <Button onClick={() => setCorrected(true)}>Voir les corrigés proposés</Button>
    </div>
    {saved && <p role="status" className="text-sm text-muted-foreground">Saisie conservée pour cet aperçu ouvert uniquement ; aucune sauvegarde élève.</p>}
  </section>;
}