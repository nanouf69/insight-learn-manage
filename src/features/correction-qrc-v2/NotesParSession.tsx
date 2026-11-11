import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GroupeSessionCrm } from './noyauReel';
import { sessionFormationActuelle } from './sessionsActuelles';
import { chargerNotesSession, filiereInscrit, moyenneSessionExamen, type NoteSession, type ReleveSession } from './notesSession';
const texteNote=(n:NoteSession|undefined)=>!n?'Lecture indisponible':n.etat==='definitif'?`${n.note?.toLocaleString('fr-FR')} /20`:n.etat==='non_passe'?'Non passé':n.etat==='attente'?'À corriger / en attente':n.etat==='incomplet'?`Incomplet (${n.couverture})`:'Lecture indisponible';
export function NotesParSession({sessions}:{sessions:GroupeSessionCrm[]}){
  const [examenId,setExamenId]=useState('tous');
  const [cle,setCle]=useState<string|null>(null);const [releve,setReleve]=useState<ReleveSession|null>(null);const [erreur,setErreur]=useState<string|null>(null);const [loading,setLoading]=useState(false);const [retry,setRetry]=useState(0);
  useEffect(()=>{if(!cle)return;let alive=true;setLoading(true);setReleve(null);setExamenId('tous');setErreur(null);void chargerNotesSession(cle.slice(4)).then(r=>{if(alive){setReleve(r);setErreur(r.erreur);}}).catch(e=>{if(alive)setErreur(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false};},[cle,retry]);
  const examens=releve?.examens??[];
  const choisi=examens.find(e=>e.id===examenId);
  const colonnes=choisi?[{id:'general',nom:`EB${choisi.numero} ${choisi.filiere} — général /20`},...choisi.matieres]:examens.map(e=>({id:e.id,nom:`EB${e.numero} ${e.filiere} — général /20`}));
  const moyenne=(id:string)=>{
    if(!releve)return null;const exam=choisi??examens.find(e=>e.id===id);if(!exam)return null;
    return moyenneSessionExamen(releve,exam,choisi&&id!=='general'?id:undefined);
  };
  return <section aria-label="Notes par session" className="space-y-4 py-4">
    <h2 className="text-lg font-semibold">Notes par session</h2>
    <div className="flex flex-wrap gap-2">{sessions.filter(s=>sessionFormationActuelle(s)).map(s=><Button key={s.cle} variant={cle===s.cle?'default':'outline'} onClick={()=>setCle(s.cle)} className="h-auto whitespace-normal text-left py-2">{s.libelle}</Button>)}</div>
    <select aria-label="Session du relevé" className="max-w-full rounded border bg-background px-2 py-1 text-sm" value={cle??''} onChange={e=>setCle(e.target.value||null)}><option value="">Choisir une session</option>{sessions.map(s=><option key={s.cle} value={s.cle}>{s.libelle}</option>)}</select>
    {loading&&<p role="status">Chargement des notes de cette session…</p>}
    {erreur&&<div role="alert" className="text-destructive"><p>Lecture indisponible — {erreur}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Réessayer</Button></div>}
    {releve&&<>
      <label className="block space-y-1 text-sm"><span>Examen blanc</span><select aria-label="Examen blanc" className="block max-w-full rounded border bg-background px-2 py-1" value={examenId} onChange={e=>setExamenId(e.target.value)}><option value="tous">Tous les examens</option>{examens.map(e=><option key={e.id} value={e.id}>EB{e.numero} {e.filiere}</option>)}</select></label>
      <div className="overflow-x-auto"><p className="text-sm text-muted-foreground">{releve.inscrits.length} inscrits</p><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Apprenant</th><th className="p-2 text-left">Filière</th>{colonnes.map(c=><th key={c.id} className="p-2 text-left">{c.nom}</th>)}</tr></thead><tbody>
        <tr className="border-b bg-muted/50 font-semibold"><th className="p-2 text-left">Moyenne de la session</th><td className="p-2">—</td>{colonnes.map(c=>{const m=moyenne(c.id);return <td key={c.id} className="p-2 align-top min-w-32">{!choisi?<Button variant="ghost" className="h-auto p-0 whitespace-normal text-left" onClick={()=>setExamenId(c.id)}>{m?.note!=null?`${m.note.toLocaleString('fr-FR')} /20`:'Aucune note définitive'}</Button>:<span>{m?.note!=null?`${m.note.toLocaleString('fr-FR')} /20`:'Aucune note définitive'}</span>}<span className="block text-xs text-muted-foreground">{m?.n??0}/{m?.inscrits??0} notes définitives</span></td>;})}</tr>
        {releve.inscrits.map(a=><tr key={a.id} className="border-b"><th className="p-2 text-left font-medium">{a.nom} {a.prenom}</th><td className="p-2">{filiereInscrit(a.type_apprenant)??'À vérifier'}</td>{colonnes.map(c=>{
          const exam=choisi??examens.find(e=>e.id===c.id);const applicable=!!exam&&filiereInscrit(a.type_apprenant)===exam.filiere;
          const n=exam?(choisi&&c.id!=='general'?releve.matieres?.[a.id]?.[exam.id]?.[c.id]:releve.notes[a.id]?.[exam.numero]):undefined;
          return <td key={c.id} className="p-2 align-top min-w-32"><span>{applicable?texteNote(n):'Non concerné'}</span>{applicable&&n?.etat==='definitif'&&<span className="block text-xs text-muted-foreground">Définitive{n.verdict?` · ${n.verdict==='reussi'?'Réussi':n.verdict==='echoue'?'Échoué':'Verdict indéterminé'}`:''}</span>}</td>;
        })}</tr>)}
      </tbody></table>{releve.inscrits.length===0&&<p className="py-4 text-muted-foreground">Aucun inscrit — Aucune note définitive (0/0).</p>}</div>
    </>}

  </section>;
}