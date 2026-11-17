import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eligible, THEMES, type ItemInventaire } from '@/lib/quizAvantExamenTaxi/inventaire';
import { bilan, ordonner } from '@/lib/quizAvantExamenTaxi/tentatives';
import { lireOperation, nouvelleOperation, referencesQuiz, type EtatQuiz, type OperationQuiz, type TransportQuiz } from '@/lib/quizAvantExamenTaxi/serveur';

export function QuizEleveAutonome({ owner, items, transport }: { owner: string; items: ItemInventaire[]; transport: TransportQuiz }) {
  const [etat, setEtat] = useState<EtatQuiz>({ tentatives: [], coursActif: false });
  const [courante, setCourante] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<OperationQuiz | null>(null);
  const [corrige, setCorrige] = useState(false);
  const lock = useRef(false);
  const quiz = useMemo(() => ordonner(items.filter(eligible)), [items]);
  const map = useMemo(() => new Map(quiz.map(q => [q.cle,q])), [quiz]);
  const appliquer = (next: EtatQuiz) => {
    setEtat(next); setCourante(old => old ?? next.tentatives.filter(t => !t.termineeLe).at(-1)?.id ?? next.tentatives.at(-1)?.id ?? null);
  };
  const relire = async () => {
    if (lock.current) return;
    lock.current=true; setBusy(true);
    try { appliquer(await transport.lire()); setPending(lireOperation(owner)); setError(''); }
    catch(e) { setError((e as Error).message); }
    finally { lock.current=false; setBusy(false); }
  };
  useEffect(() => { void relire(); const resume=()=>void relire(); window.addEventListener('focus',resume); window.addEventListener('online',resume);
    return () => { window.removeEventListener('focus',resume); window.removeEventListener('online',resume); };
  }, [owner,transport]);
  const t = etat.tentatives.find(t => t.id===courante);
  const q = t ? map.get(t.cles[index]) : undefined;
  const adapted = t ? { ...t, reponses: Object.fromEntries(Object.entries(t.reponses).map(([key,r]) => [key,{...r,
    empreinte: r.empreinte===t.empreintes[key] ? map.get(key)?.empreinteContenu ?? 'source-absente' : 'source-modifiee',
  }])) } : null;
  const b = adapted ? bilan(adapted,map,eligible) : null;
  const envoyer = async (op: OperationQuiz) => {
    if(lock.current) return;
    lock.current=true; setBusy(true); setPending(op);
    try {
      const ack=await transport.envoyer(op);
      appliquer({ coursActif:ack.coursActif,tentatives:[...etat.tentatives.filter(x=>!ack.tentatives.some(y=>x.id===y.id)),...ack.tentatives] });
      // Full authenticated read supplies current source fingerprints and current internal notes.
      appliquer(await transport.lire()); setCourante(op.tentative); setPending(null); setError('');
    } catch(e) { setError((e as Error).message+' — choix conservé, non confirmé.'); }
    finally { lock.current=false; setBusy(false); }
  };
  const demarrer = (mode:'toutes'|'erreurs') => {
    const list = mode==='erreurs' ? quiz.filter(q=>b?.fausses.includes(q.cle)) : quiz;
    if(!list.length) return;
    setIndex(0); setCorrige(false);
    void envoyer(nouvelleOperation('start',crypto.randomUUID(),0,{ mode,parent:mode==='erreurs'?t?.id:null,references:referencesQuiz(list) }));
  };
  const blocked=busy||!!pending||etat.coursActif;
  return <div className="space-y-5">
    {etat.coursActif && <p className="text-destructive">Une session de cours est encore ouverte. Fermez-la avant cet entraînement facultatif.</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={blocked||quiz.length!==671} onClick={()=>demarrer('toutes')}>Nouvelle tentative ({quiz.length} QCM)</Button>
      {t?.termineeLe && <Button variant="outline" disabled={blocked||!b?.fausses.length} onClick={()=>demarrer('erreurs')}>Refaire les erreurs ({b?.fausses.length})</Button>}
      <Button variant="outline" disabled={busy} onClick={()=>void relire()}>Relire la sauvegarde</Button>
      {pending && <Button disabled={busy} onClick={()=>void envoyer(pending)}>Réessayer la sauvegarde</Button>}
    </div>
    {!!etat.tentatives.length && <Select value={courante??undefined} onValueChange={id=>{setCourante(id);setIndex(0);setCorrige(false);}}>
      <SelectTrigger className="w-full" aria-label="Tentative"><SelectValue /></SelectTrigger>
      <SelectContent>{etat.tentatives.map(t=><SelectItem key={t.id} value={t.id}>Tentative {t.numero} — {t.termineeLe?'Terminée':'En cours'} — {t.note20===null?'Note indisponible':`${t.note20} /20`}</SelectItem>)}</SelectContent>
    </Select>}
    {t&&b&&<>
      <div className="space-y-2"><div className="flex flex-wrap justify-between gap-2"><span>{b.repondues}/{b.total} réponses enregistrées</span><strong>Note interne : {t.note20===null?'indisponible':`${t.note20} /20`}</strong></div>
        <Progress value={b.total?b.repondues/b.total*100:0}/>
        <Select value={q?.theme} onValueChange={theme=>{const i=t.cles.findIndex(key=>map.get(key)?.theme===theme);if(i>=0)setIndex(i);}}>
          <SelectTrigger aria-label="Thème" className="w-full h-auto min-h-10 text-left whitespace-normal"><SelectValue placeholder="Thème"/></SelectTrigger>
          <SelectContent>{b.parTheme.map(p=><SelectItem key={p.theme} value={p.theme}>{THEMES[p.theme]} — {p.repondues}/{p.total}</SelectItem>)}</SelectContent>
        </Select>
        {!!(b.modifiees.length+b.introuvables.length+b.nonNotees.length)&&<p className="text-destructive">{b.modifiees.length+b.introuvables.length+b.nonNotees.length} question(s) non notée(s) : source modifiée ou indisponible.</p>}
      </div>
      {q?<article className="space-y-4">
        <Badge variant="secondary">Question {index+1}/{t.cles.length}</Badge>
        <h2 className="text-xl font-semibold whitespace-pre-line">{q.enonce}</h2>
        <ul className="space-y-2">{q.choix.map(c=>{
          const checked=t.reponses[q.cle]?.lettres.includes(c.lettre)??false;
          return <li key={c.lettre}><label className="flex items-start gap-3 border rounded-md p-3">
            <Checkbox aria-label={`Réponse ${c.lettre}`} checked={checked} disabled={blocked||!!t.termineeLe||!t.empreintes[q.cle]}
              onCheckedChange={yes=>{const values=(t.reponses[q.cle]?.lettres??[]).filter(l=>l!==c.lettre);void envoyer(nouvelleOperation('answer',t.id,t.revision??0,{cle:q.cle,lettres:(yes?[...values,c.lettre]:values).sort(),empreinte:t.empreintes[q.cle]}));}}/>
            <span>{c.lettre}) {c.texte}{corrige&&c.correct?' ✓':''}</span>
          </label></li>;
        })}</ul>
        {corrige&&<p>Bonne(s) réponse(s) : {q.bonnes.join(' + ')}</p>}
      </article>:<p className="text-destructive">Question absente de la source actuelle.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy||index===0} onClick={()=>setIndex(index-1)}>Précédente</Button>
        <Button variant="outline" onClick={()=>setCorrige(!corrige)}>{corrige?'Masquer le corrigé':'Voir le corrigé'}</Button>
        <Button variant="outline" disabled={busy||index>=t.cles.length-1} onClick={()=>setIndex(index+1)}>Suivante</Button>
        {!t.termineeLe&&<Button disabled={blocked||b.repondues!==b.total} onClick={()=>{if(window.confirm('Terminer cette tentative et figer vos réponses ?'))void envoyer(nouvelleOperation('finish',t.id,t.revision??0,{}));}}>Terminer la tentative</Button>}
      </div>
    </>}
  </div>;
}