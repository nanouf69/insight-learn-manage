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
  const indications=["Placez les 11 jours fériés 2026","30 questions sur les tarifs maximaux","13 étapes avec corrigés"];
  const ok=etat?.etat==="ok"?etat:null;
  const requisIds=ok?ok.requises.map(a=>a.id):etat?.etat==="indisponible"?etat.requises.map(a=>a.id):[];
  const nbRequis=IDS_TAXI.filter(id=>requisIds.includes(id)).length;
  const nbFaits=ok?IDS_TAXI.filter(id=>ok.requises.some(a=>a.id===id&&a.termine)).length:0;
  const toutFacultatif=ok!==null&&nbRequis===0;
  return <section className="space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 sm:p-5" aria-labelledby="taxi-2026-titre" data-testid="taxi-2026-section">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h3 id="taxi-2026-titre" className="text-xl font-bold">🚕 {ok&&nbRequis>0?`Exercice${nbRequis>1?"s":""} obligatoire${nbRequis>1?"s":""}`:toutFacultatif?"Exercices facultatifs":"Exercices"} — Pratique TAXI</h3>
      {ok && nbRequis>0 && <Badge variant={nbFaits===nbRequis?"default":"destructive"} className="text-sm w-fit" data-testid="taxi-2026-compteur">{nbFaits}/{nbRequis} terminé{nbFaits>1?"s":""}</Badge>}
    </div>
    <p className="text-sm">{etat?.etat==="indisponible"?"Statut momentanément indisponible. Rien n'est perdu : réessayez dans un instant.":toutFacultatif?"Votre module est déjà validé : ces exercices sont facultatifs, sans effet sur votre progression.":ok?nbRequis===3?"Faites ces 3 exercices pour terminer le module. Ils sont validés une fois confirmés par le serveur.":`${nbRequis} exercice${nbRequis>1?"s sont requis":" est requis"} pour terminer le module (marqués « À faire » ou « Terminé »). Les autres sont facultatifs.`:"Chargement du statut…"}</p>
    <div className="grid gap-3 md:grid-cols-3">{IDS_TAXI.map((id,i)=>{
      const Icon=icons[i];
      const termine=!!ok&&[...ok.requises,...ok.facultatives].some(a=>a.id===id&&a.termine);
      const facultatif=!!ok&&ok.facultatives.some(a=>a.id===id);
      const statut=!ok?"Statut à vérifier":termine?"Terminé":facultatif?"Facultatif":"À faire";
      return <button type="button" key={id} onClick={()=>setOuvert(id)} data-testid={`taxi-2026-carte-${id}`} aria-label={`${TITRES_TAXI[i]} — ${statut}`}
        className={`flex flex-col gap-3 rounded-xl border-2 bg-card p-4 text-left min-h-40 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${termine?"border-primary":facultatif||!ok?"border-border":"border-destructive/60"}`}>
        <span className="flex items-start justify-between gap-2"><Icon className="h-8 w-8 shrink-0 text-primary" aria-hidden/>
          <Badge variant={termine?"default":facultatif||!ok?"outline":"destructive"}>{termine?<CheckCircle2 className="h-3 w-3 mr-1" aria-hidden/>:null}{statut}</Badge></span>
        <span className="block font-bold text-base break-words">{TITRES_TAXI[i]}</span>
        <span className="block text-sm text-muted-foreground">{indications[i]}</span>
        <span className="mt-auto inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{termine?"Revoir":"Commencer / reprendre"}</span>
      </button>;
    })}</div>
    <p className="text-xs text-muted-foreground">Arrêté du {SOURCE_RHONE.date} : copie du document préfectoral consultée ; téléchargement préfectoral actuellement indisponible. Zone de réservation et exceptions non établies : hypothèses explicites dans les situations.</p>
    <a href={SOURCE_RHONE.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Source préfectorale</a>
    <Dialog open={!!ouvert} onOpenChange={o=>{if(!o)setOuvert(null);}}><DialogContent className="max-w-5xl w-[96vw] max-h-[94dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>{TITRES_TAXI[IDS_TAXI.indexOf(ouvert as typeof IDS_TAXI[number])]}</DialogTitle><DialogDescription>Rhône 2026 · réalisation non notée · saisies conservées séparément pour chaque exercice.</DialogDescription></DialogHeader>
      {ouvert && <ActiviteTaxi key={`${compteId??"apercu"}:${ouvert}`} compteId={compteId} id={ouvert} transport={transport}/>}
    </DialogContent></Dialog>
  </section>;
}