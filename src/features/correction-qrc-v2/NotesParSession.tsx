import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GroupeSessionCrm } from './noyauReel';
import { sessionFormationActuelle } from './sessionsActuelles';
import { extremesNotesSession, rangNoteSession } from './extremesNotesSession';
import { noteDefinitiveManquante } from './noteDefinitiveManquante';
import { souscrireNotesSession } from './signalNotesSession';
import { lienCorrectionSession, type DestinationCorrection } from './lienCorrectionSession';
import { useAbsentsSessionJour } from './AbsenceSessionJour';
import { chargerAbsentsSessionJour } from './absenceSessionJour';
import { chargerNotesSession, filiereInscrit, moyenneSessionExamen, type NoteSession, type ReleveSession } from './notesSession';
const texteNote=(n:NoteSession|undefined)=>!n?'Lecture indisponible':n.etat==='definitif'?`${n.note?.toLocaleString('fr-FR')} /20`:n.etat==='non_passe'?'Non passé':n.etat==='attente'?'À corriger / en attente':n.etat==='incomplet'?`Incomplet (${n.couverture})`:'Lecture indisponible';
const motifs={publication:'Publication en attente — aucune QRC à corriger',non_rattachee:'Copie non rattachée au circuit de correction',ambigue:'Session de la copie à vérifier'} as const;
export function NotesParSession({sessions,charger=chargerNotesSession,souscrire=souscrireNotesSession,chargerAbsences=chargerAbsentsSessionJour}:{sessions:GroupeSessionCrm[];charger?:typeof chargerNotesSession;souscrire?:typeof souscrireNotesSession;chargerAbsences?:typeof chargerAbsentsSessionJour}){
  const [examenId,setExamenId]=useState('tous');
  const [cle,setCle]=useState<string|null>(()=>new URLSearchParams(window.location.search).get('notes_session'));const [releve,setReleve]=useState<ReleveSession|null>(null);const [erreur,setErreur]=useState<string|null>(null);const [loading,setLoading]=useState(false);const [retry,setRetry]=useState(0);
  const lecture=useRef<Promise<void>|null>(null);
  const [dateExamen,setDateExamen]=useState<{contexte:string;jour:string}|null>(null);
  const contexteExamen=`${cle}|${examenId}`;
  const jourExamen=examenId!=='tous'&&dateExamen?.contexte===contexteExamen?dateExamen.jour:null;
  const [jetonPresence,setJetonPresence]=useState(0);const [actualisation,setActualisation]=useState(false);
  const absents=useAbsentsSessionJour(cle,jourExamen,chargerAbsences,jetonPresence);
  const actualiser=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{
    if(!cle)return;
    let alive=true,scheduled=false,dirty=false,initial=true;
    setLoading(true);setReleve(null);setExamenId('tous');setErreur(null);
    const lire=async()=>{
      if(!alive||(!initial&&document.visibilityState==='hidden'))return;
      if(scheduled){dirty=true;return;}
      scheduled=true;
      if(lecture.current)await lecture.current;
      if(!alive){scheduled=false;return;}
      const task=(async()=>{
        try{
          const r=await charger(cle.slice(4));
          if(alive){setReleve(prev=>r.erreur&&prev?prev:r);setErreur(r.erreur);}
        }catch(e){if(alive)setErreur(e instanceof Error?e.message:'Lecture indisponible');}
        finally{if(alive){initial=false;setLoading(false);}}
      })();
      lecture.current=task;
      await task;
      if(lecture.current===task)lecture.current=null;
      scheduled=false;
      if(alive&&dirty){dirty=false;void lire();}
    };
    actualiser.current=()=>lire();
    void lire();
    return()=>{alive=false;actualiser.current=async()=>{};};
  },[cle,charger]);
  useEffect(()=>{if(retry)void actualiser.current();},[retry]);
  const actualiserManuel=async()=>{
    if(!cle||actualisation)return;
    setActualisation(true);
    try{setJetonPresence(n=>n+1);await actualiser.current();}finally{setActualisation(false);}
  };
  const inscritsSignal=releve?.inscrits.map(a=>a.id).sort().join(',')??'';
  useEffect(()=>{
    if(!cle||!inscritsSignal)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const signal=()=>{
      if(document.visibilityState==='hidden'||timer)return;
      timer=setTimeout(()=>{timer=undefined;void actualiser.current();},400);
    };
    const stop=souscrire(inscritsSignal.split(','),signal);
    document.addEventListener('visibilitychange',signal);
    window.addEventListener('focus',signal);
    window.addEventListener('online',signal);
    return()=>{stop();if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',signal);window.removeEventListener('focus',signal);window.removeEventListener('online',signal);};
  },[cle,inscritsSignal,souscrire]);
  const examens=releve?.examens??[];
  const choisi=examens.find(e=>e.id===examenId);
  const inscritsAffiches=(releve?.inscrits??[]).filter(a=>!choisi||filiereInscrit(a.type_apprenant)===choisi.filiere);
  const extremes= new Map(examens.map(e=>[e.id,releve?extremesNotesSession(releve,e):null]));
  const colonnes=choisi?[{id:'general',nom:`EB${choisi.numero} ${choisi.filiere} — général /20`},...choisi.matieres]:examens.map(e=>({id:e.id,nom:`EB${e.numero} ${e.filiere} — général /20`}));
  const moyenne=(id:string)=>{
    if(!releve)return null;const exam=choisi??examens.find(e=>e.id===id);if(!exam)return null;
    return moyenneSessionExamen(releve,exam,choisi&&id!=='general'?id:undefined);
  };
  return <section aria-label="Notes par session" className="space-y-4 py-4">
    <h2 className="text-lg font-semibold">Notes par session</h2>
    <div className="flex flex-wrap gap-2">{sessions.filter(s=>sessionFormationActuelle(s)).map(s=><Button key={s.cle} variant={cle===s.cle?'default':'outline'} onClick={()=>setCle(s.cle)} className="h-auto whitespace-normal text-left py-2">{s.libelle}</Button>)}</div>
    <select aria-label="Session du relevé" className="max-w-full rounded border bg-background px-2 py-1 text-sm" value={cle??''} onChange={e=>setCle(e.target.value||null)}><option value="">Choisir une session</option>{sessions.map(s=><option key={s.cle} value={s.cle}>{s.libelle}</option>)}</select>
    {cle&&<div><Button variant="outline" onClick={()=>void actualiserManuel()} disabled={actualisation||loading} aria-busy={actualisation}>{actualisation?'Actualisation…':'Actualiser'}</Button></div>}
    {loading&&<p role="status">Chargement des notes de cette session…</p>}
    {erreur&&<div role="alert" className="text-destructive"><p>Lecture indisponible — {erreur}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>Réessayer</Button></div>}
    {releve&&<>
      <label className="block space-y-1 text-sm"><span>Examen blanc</span><select aria-label="Examen blanc" className="block max-w-full rounded border bg-background px-2 py-1" value={examenId} onChange={e=>setExamenId(e.target.value)}><option value="tous">Tous les examens</option>{examens.map(e=><option key={e.id} value={e.id}>EB{e.numero} {e.filiere}</option>)}</select></label>
      {choisi&&<label className="block space-y-1 text-sm"><span>Date de l’examen</span><input type="date" aria-label="Date de l’examen" className="block max-w-full rounded border bg-background px-2 py-1" value={jourExamen??''} onChange={e=>setDateExamen({contexte:contexteExamen,jour:e.target.value})}/></label>}
      <div className="overflow-x-auto"><p className="text-sm text-muted-foreground">{inscritsAffiches.length} inscrits</p><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Apprenant</th><th className="p-2 text-left">Filière</th>{colonnes.map(c=><th key={c.id} className="p-2 text-left">{c.nom}</th>)}</tr></thead><tbody>
        <tr className="border-b bg-muted/50 font-semibold"><th className="p-2 text-left">Moyenne de la session</th><td className="p-2">—</td>{colonnes.map(c=>{const m=moyenne(c.id);const general=!choisi||c.id==='general';const valeur=m?.note!=null?<><span className={general?'text-destructive':undefined}>{m.note.toLocaleString('fr-FR')}</span> /20</>:'Aucune note définitive';return <td key={c.id} className="p-2 align-top min-w-32">{!choisi?<Button variant="ghost" className="h-auto p-0 whitespace-normal text-left" onClick={()=>setExamenId(c.id)}>{valeur}</Button>:<span>{valeur}</span>}<span className="block text-xs text-muted-foreground">{m?.n??0}/{m?.inscrits??0} notes définitives</span></td>;})}</tr>
        {inscritsAffiches.map(a=>{const manque=noteDefinitiveManquante(a,choisi,choisi?releve.notes[a.id]?.[choisi.numero]:undefined);return <tr key={a.id} className="border-b"><th className="p-2 text-left font-medium"><span className={manque?'inline-block max-w-full rounded border border-warning px-2 py-1':undefined}><a href={`/?section=crm&apprenant=${encodeURIComponent(String(a.id))}`} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={`Ouvrir la fiche CRM de ${a.nom} ${a.prenom} (nouvel onglet)`} aria-label={`Ouvrir la fiche CRM de ${a.nom} ${a.prenom} (nouvel onglet)`}>{a.nom} {a.prenom}</a>{manque&&<span className="block text-xs font-normal text-muted-foreground">Note définitive manquante</span>}</span>{absents.has(a.id)&&<span className={absents.get(a.id)==='absent'?'block text-xs text-destructive':'block text-xs text-muted-foreground'} title={`${jourExamen} — ${absents.get(a.id)==='absent'?'Absence déclarée au registre':'Aucune preuve de présence sur les créneaux terminés et dispensés ; absence non déclarée'}`}>{absents.get(a.id)==='absent'?'Absent':'Non émargé'}</span>}</th><td className="p-2">{filiereInscrit(a.type_apprenant)??'À vérifier'}</td>{colonnes.map(c=>{
          const exam=choisi??examens.find(e=>e.id===c.id);const applicable=!!exam&&filiereInscrit(a.type_apprenant)===exam.filiere;
          const n=exam?(choisi&&c.id!=='general'?releve.matieres?.[a.id]?.[exam.id]?.[c.id]:releve.notes[a.id]?.[exam.numero]):undefined;
          const rang=applicable&&exam&&(!choisi||c.id==='general')?rangNoteSession(n,extremes.get(exam.id)??null):null;
          const manqueCellule=!choisi&&noteDefinitiveManquante(a,exam,n);
          const sources=exam?Object.entries(releve.sourcesAttente?.[a.id]?.[exam.id]??{}).filter(([m])=>!choisi||c.id==='general'||m===c.id).map(([,s])=>s):[];
          const destinations=[...new Map(sources.flatMap(s=>s.destinations).map(d=>[`${d.sessionCle}|${d.attemptId}|${d.vue}`,d])).values()] as DestinationCorrection[];
          const motifsCellule=[...new Set(sources.map(s=>s.motif).filter(Boolean))] as Array<keyof typeof motifs>;
          return <td key={c.id} className="p-2 align-top min-w-32"><div className={manqueCellule?'rounded border border-warning px-2 py-1':undefined}>{applicable&&n?.etat==='attente'&&exam?<div className="space-y-1">{destinations.length===0&&motifsCellule.length===0&&<span>À corriger / en attente</span>}<div className="flex flex-wrap items-center gap-x-3 gap-y-1">{destinations.map((d,index)=>{const libelle=d.vue==='valider'?'À valider':d.vue==='verifier'?'À vérifier':'Corriger ici';const contexte=`${libelle} — ${a.nom} ${a.prenom}, EB${exam.numero} ${exam.filiere}${choisi&&c.id!=='general'?`, ${c.nom}`:''} — ${d.libelle} — ${d.jour} — copie ${d.attemptId} — ${d.qrcRestantes} QRC — Correction QRC V2, nouvel onglet`;return <a key={`${d.sessionCle}-${d.attemptId}-${d.vue}`} href={lienCorrectionSession(d.sessionCle,exam.id,a.id,d)} target="_blank" rel="noopener noreferrer" className="inline-block text-xs underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={contexte} title={contexte}>{libelle}{destinations.length>1?` ${index+1}`:''}</a>;})}</div>{motifsCellule.map(m=><span key={m} className="block text-xs text-muted-foreground">{motifs[m]}</span>)}</div>:<span className={rang==='meilleure'?'text-success':rang==='basse'?'text-destructive':undefined}>{applicable?texteNote(n):'Non concerné'}</span>}{manqueCellule&&<span className="block text-xs text-muted-foreground">Note définitive manquante</span>}{rang&&<span className="block text-xs text-muted-foreground">{rang==='meilleure'?'↑ Meilleure note de la session':'↓ Plus basse note de la session'}</span>}{applicable&&n?.etat==='definitif'&&<span className="block text-xs text-muted-foreground">Définitive{n.verdict?` · ${n.verdict==='reussi'?'Réussi':n.verdict==='echoue'?'Échoué':'Verdict indéterminé'}`:''}</span>}</div></td>;
        })}</tr>;})}
      </tbody></table>{inscritsAffiches.length===0&&<p className="py-4 text-muted-foreground">{choisi?`Aucun inscrit ${choisi.filiere}`:'Aucun inscrit'} — Aucune note définitive (0/0).</p>}</div>
    </>}

  </section>;
}