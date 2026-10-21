import { useEffect, useState } from "react";
import { CalendarDays, Calculator, ClipboardList, ChevronLeft, ChevronRight, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ecouterDemandeJeu } from "@/lib/demandeJeuRegistre";
import { useActivitesModule } from "@/components/cours-en-ligne/ActivitesModuleStatut";
import { FERIES_2026, IDS_TAXI, QUESTIONS_TARIFS, SCENARIOS_RTST, SOURCE_RHONE, attenteEuros, saisieComplete } from "./donnees";
import { useActiviteTaxi, type TransportTaxi } from "./useActiviteTaxi";

export const TITRES_TAXI = ["Calendrier des jours fériés 2026", "Tarifs TAXI du Rhône 2026", "13 situations pratiques — RTST"];
const dateFr=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR",{timeZone:"Europe/Paris",day:"numeric",month:"long",year:"numeric"});

function Calendrier({ reponse, onChoisir, index }: {reponse:string;onChoisir:(s:string)=>void;index:number}) {
  const ferie=FERIES_2026[index];
  const [mois,setMois]=useState(Number(ferie.date.slice(5,7))-1);
  useEffect(()=>setMois(Number(ferie.date.slice(5,7))-1),[ferie.id]);
  const debut=new Date(Date.UTC(2026,mois,1));
  const jours=new Date(Date.UTC(2026,mois+1,0)).getUTCDate();
  const vides=(debut.getUTCDay()+6)%7;
  return <div className="space-y-4">
    <p className="text-lg font-semibold">À quelle date tombe {ferie.nom} en 2026 ?</p>
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" aria-label="Mois précédent" disabled={mois===0} onClick={()=>setMois(m=>m-1)}><ChevronLeft className="h-4 w-4"/></Button>
      <h3 className="font-bold capitalize">{debut.toLocaleDateString("fr-FR",{month:"long",timeZone:"UTC"})} 2026</h3>
      <Button variant="outline" size="icon" aria-label="Mois suivant" disabled={mois===11} onClick={()=>setMois(m=>m+1)}><ChevronRight className="h-4 w-4"/></Button>
    </div>
    <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="Calendrier 2026">
      {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j=><span key={j} className="text-center text-xs text-muted-foreground py-2">{j}</span>)}
      {Array.from({length:vides},(_,i)=><span key={`vide-${i}`}/>)}
      {Array.from({length:jours},(_,i)=>{
        const d=`2026-${String(mois+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
        return <Button key={d} variant={reponse===d?"default":"outline"} aria-label={dateFr(d)} aria-pressed={reponse===d} className="h-12 sm:h-16 p-0 w-full" onClick={()=>onChoisir(d)}>{i+1}</Button>;
      })}
    </div>
    <p className="text-sm">Réponse : <strong>{reponse?dateFr(reponse):"Non renseignée"}</strong></p>
  </div>;
}

export function ActiviteTaxi({compteId,id,transport}:{compteId?:string|null;id:string;transport?:TransportTaxi}) {
  const suivi=useActiviteTaxi(compteId,id,transport);
  const [index,setIndex]=useState(0);
  const [correction,setCorrection]=useState(false);
  const type=IDS_TAXI.indexOf(id as typeof IDS_TAXI[number]);
  const taille=type===0?FERIES_2026.length:type===1?QUESTIONS_TARIFS.length:SCENARIOS_RTST.length;
  const q=QUESTIONS_TARIFS[index];const s=SCENARIOS_RTST[index];const ferie=FERIES_2026[index];
  const complet=saisieComplete(id,suivi.valeurs);
  const repondu=type===0?!!suivi.valeurs[ferie?.id]:type===1?!!suivi.valeurs[q?.id]:["r","tarif","s","attente"].every(c=>!!suivi.valeurs[`${s?.id}_${c}`]?.trim());
  const valeur=(k:string)=>suivi.valeurs[k]??"";
  const suivant=(n:number)=>{setIndex(n);setCorrection(false);};
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <Badge variant="outline">{type===2?"Étape":"Question"} {index+1} / {taille}</Badge>
      <p role="status" className="text-sm font-medium break-words">{suivi.statut}</p>
    </div>
    {!suivi.charge && <Button variant="outline" onClick={()=>void suivi.relire()}>Réessayer la lecture</Button>}
    {suivi.confirme && <p className="text-sm text-muted-foreground">Réalisation confirmée conservée. Consultation du corrigé ; aucune réponse validée ne sera réécrite.</p>}
    <fieldset disabled={suivi.confirme || suivi.busy || !suivi.charge} className="space-y-4 min-w-0">
      {type===0 && <Calendrier index={index} reponse={valeur(ferie.id)} onChoisir={v=>suivi.modifier(ferie.id,v)}/>}
      {type===1 && <>
        <h3 className="text-lg font-bold leading-relaxed">{q.enonce}</h3>
        <div className="space-y-3">{q.choix.map((texte,i)=><Label key={texte} className="flex items-start gap-3 border rounded-lg p-4 cursor-pointer leading-relaxed">
          <Checkbox checked={valeur(q.id)===String(i)} onCheckedChange={checked=>suivi.modifier(q.id,checked?String(i):"")} aria-label={texte}/><span>{texte}</span>
        </Label>)}</div>
      </>}
      {type===2 && <>
        <h3 className="text-xl font-bold">{s.titre}</h3>
        <p className="leading-relaxed text-base whitespace-pre-wrap">{s.texte}</p>
        <div className="space-y-4">{[["r","R — Réservation"],["tarif","T — Tarif A/B/C/D et changements"],["s","S — Suppléments et hypothèses"],["attente","T — Temps d’attente : calcul et montant"]].map(([c,label])=><div key={c} className="space-y-2">
          <Label htmlFor={`${id}-${c}`}>{label}</Label><Input id={`${id}-${c}`} value={valeur(`${s.id}_${c}`)} onChange={e=>suivi.modifier(`${s.id}_${c}`,e.target.value)} className="h-12"/>
        </div>)}</div>
      </>}
    </fieldset>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={!repondu} onClick={()=>setCorrection(v=>!v)}>{correction?"Masquer le corrigé":"Comparer au corrigé"}</Button>
      <Button variant="outline" disabled={!compteId||!suivi.charge||suivi.busy||suivi.confirme} onClick={()=>void suivi.enregistrer(false)}><Save className="h-4 w-4 mr-2"/>Enregistrer mes saisies</Button>
    </div>
    {correction && <div className="border-l-4 border-destructive bg-muted p-4 space-y-2" role="region" aria-label="Corrigé détaillé">
      {type===0 && <><p className="text-destructive font-bold">{ferie.nom} : {dateFr(ferie.date)}</p><p>{valeur(ferie.id)===ferie.date?"Exact.":"Date à retenir."} Onze jours fériés nationaux applicables au Rhône ; aucun jour propre à l’Alsace-Moselle.</p></>}
      {type===1 && <><p className="text-destructive font-bold">{q.choix[q.correct]}</p><p>{q.justification}</p><p className="text-xs text-muted-foreground">Arrêté {SOURCE_RHONE.numero} du {SOURCE_RHONE.date} — {q.source}. Montants maximaux.</p></>}
      {type===2 && <>
        <p className="text-destructive font-bold">R : {s.r}</p><p className="text-destructive font-bold">T : {s.tarif}</p><p className="text-destructive font-bold">S : {s.s}</p>
        <p className="text-destructive font-bold">Attente : 41,3 / 60 × {s.minutes} = {attenteEuros(s.minutes).toFixed(2).replace(".",",")} €</p>
        <p className="leading-relaxed">{s.justification}</p><p className="text-sm font-semibold">Corrigé conditionnel — comparez vos hypothèses. Aucune pénalité ni note automatique pour cette situation.</p>
      </>}
    </div>}
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <Button variant="outline" disabled={index===0} onClick={()=>suivant(index-1)}><ChevronLeft className="h-4 w-4 mr-1"/>Précédent</Button>
      {index<taille-1?<Button onClick={()=>suivant(index+1)}>Suivant<ChevronRight className="h-4 w-4 ml-1"/></Button>:<Button disabled={!complet||!compteId||!suivi.charge||suivi.busy||suivi.confirme} onClick={()=>void suivi.enregistrer(true)}><CheckCircle2 className="h-4 w-4 mr-2"/>Terminer l’activité</Button>}
    </div>
  </div>;
}

export default function ExercicesTaxi2026({compteId,transport}:{compteId?:string|null;transport?:TransportTaxi}) {
  const [ouvert,setOuvert]=useState<string|null>(null);
  const etat=useActivitesModule();
  useEffect(()=>ecouterDemandeJeu(id=>{if(IDS_TAXI.includes(id as typeof IDS_TAXI[number]))setOuvert(id);}),[]);
  const icons=[CalendarDays,Calculator,ClipboardList];
  return <section className="space-y-4" aria-label="Exercices pratiques TAXI 2026">
    <h3 className="text-xl font-bold">Pratique TAXI — Rhône 2026</h3>
    <div className="grid gap-3 lg:grid-cols-3">{IDS_TAXI.map((id,i)=>{
      const Icon=icons[i];const facultatif=etat?.etat==="ok" && etat.facultatives.some(a=>a.id===id);
      return <Button key={id} variant="outline" onClick={()=>setOuvert(id)} className="h-auto min-h-24 whitespace-normal text-left items-start justify-start p-4 gap-3">
        <Icon className="h-6 w-6 shrink-0 text-primary"/><span className="space-y-2 min-w-0"><span className="block font-bold">{TITRES_TAXI[i]}</span><span className="block text-xs text-muted-foreground">{i===0?"11 jours fériés":i===1?"30 questions • tarifs maximaux":"13 étapes • corrigés conditionnels"}{facultatif?" • Facultatif":""}</span></span>
      </Button>;
    })}</div>
    <p className="text-xs text-muted-foreground">Arrêté du {SOURCE_RHONE.date} : copie du document préfectoral consultée ; téléchargement préfectoral actuellement indisponible. Zone de réservation et exceptions non établies : hypothèses explicites dans les situations.</p>
    <a href={SOURCE_RHONE.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Source préfectorale</a>
    <Dialog open={!!ouvert} onOpenChange={o=>{if(!o)setOuvert(null);}}><DialogContent className="max-w-5xl w-[96vw] max-h-[94dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>{TITRES_TAXI[IDS_TAXI.indexOf(ouvert as typeof IDS_TAXI[number])]}</DialogTitle><DialogDescription>Rhône 2026 · réalisation non notée · saisies conservées séparément pour chaque exercice.</DialogDescription></DialogHeader>
      {ouvert && <ActiviteTaxi key={`${compteId??"apercu"}:${ouvert}`} compteId={compteId} id={ouvert} transport={transport}/>}
    </DialogContent></Dialog>
  </section>;
}