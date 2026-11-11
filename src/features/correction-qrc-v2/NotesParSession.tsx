import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GroupeSessionCrm } from './noyauReel';
import { sessionFormationActuelle } from './sessionsActuelles';
import { chargerNotesSession, filiereInscrit, type NoteSession, type ReleveSession } from './notesSession';
const texteNote=(n:NoteSession|undefined)=>!n?'Lecture indisponible':n.etat==='definitif'?`${n.note?.toLocaleString('fr-FR')} /20`:n.etat==='non_passe'?'Non passé':n.etat==='attente'?'À corriger / en attente':n.etat==='incomplet'?`Incomplet (${n.couverture})`:'Lecture indisponible';
export function NotesParSession({sessions}:{sessions:GroupeSessionCrm[]}){
  const [cle,setCle]=useState<string|null>(null);const [releve,setReleve]=useState<ReleveSession|null>(null);const [erreur,setErreur]=useState<string|null>(null);const [loading,setLoading]=useState(false);const [retry,setRetry]=useState(0);
  useEffect(()=>{if(!cle)return;let alive=true;setLoading(true);setReleve(null);setErreur(null);void chargerNotesSession(cle.slice(4)).then(r=>{if(alive){setReleve(r);setErreur(r.erreur);}}).catch(e=>{if(alive)setErreur(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false};},[cle,retry]);
  return <section aria-label="Notes par session" className="space-y-4 py-4">
    <h2 className="text-lg font-semibold">Notes par session</h2>
    <div className="flex flex-wrap gap-2">{sessions.filter(sessionFormationActuelle).map(s=><Button key={s.cle} variant={cle===s.cle?'default':'outline'} onClick={()=>setCle(s.cle)} className="h-auto whitespace-normal text-left py-2">{s.libelle}</Button>)}</div>
    <select aria-label="Session du relevé" className="max-w-full rounded border bg-background px-2 py-1 text-sm" value={cle??''} onChange={e=>setCle(e.target.value||null)}><option value="">Choisir une session</option>{sessions.map(s=><option key={s.cle} value={s.cle}>{s.libelle}</option>)}</select>
    {loading&&<p role="status">Chargement des notes de cette session…</p>}
    {erreur&&<div role="alert" className="text-destructive"><p>Lecture indisponible — {erreur}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Réessayer</Button></div>}
    {releve&&<div className="overflow-x-auto"><p className="text-sm text-muted-foreground">{releve.inscrits.length} inscrits</p><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Apprenant</th><th className="p-2 text-left">Filière</th>{Array.from({length:6},(_,i)=><th key={i} className="p-2 text-left">EB{i+1} — général /20</th>)}</tr></thead><tbody>{releve.inscrits.map(a=><tr key={a.id} className="border-b"><th className="p-2 text-left font-medium">{a.nom} {a.prenom}</th><td className="p-2">{filiereInscrit(a.type_apprenant)??'À vérifier'}</td>{Array.from({length:6},(_,i)=>{const n=releve.notes[a.id]?.[i+1];return <td key={i} className="p-2 align-top min-w-28"><span>{texteNote(n)}</span>{n?.etat==='definitif'&&<span className="block text-xs text-muted-foreground">Définitive · {n.verdict==='reussi'?'Réussi':n.verdict==='echoue'?'Échoué':'Verdict indéterminé'}</span>}</td>;})}</tr>)}</tbody></table></div>}
  </section>;
}