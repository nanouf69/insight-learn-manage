import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { freshSessionCall } from "@/lib/sessionRpc";
import { enqueueAnswerSave, flushAnswerSavesAndWait, getPendingAnswers } from "@/lib/answerPersistence";
import { isLearnerPreviewReadOnly } from "@/lib/learnerPreviewGuard";
import { EXERCICE_TYPE_JEU } from "@/lib/jeuxPedagogiques";
import { VERSION_TAXI, saisieComplete, type SaisiesTaxi } from "./donnees";
import { accuseTaxiCorrespond, ecrireBrouillonTaxi, lireBrouillonTaxi, type BrouillonTaxi } from "./persistance";

export interface TransportTaxi {
  lire(compte: string, id: string): Promise<unknown>;
  envoyer(compte: string, id: string, draft: BrouillonTaxi, termine: boolean): Promise<boolean>;
}
const transportReel: TransportTaxi = {
  async lire(compte,id) {
    const {data,error} = await freshSessionCall(()=>supabase.from("reponses_apprenants").select("completed,reponses").eq("apprenant_id",compte).eq("exercice_id",id).maybeSingle());
    if(error) throw error;
    return data;
  },
  async envoyer(compte,id,draft,termine) {
    enqueueAnswerSave({apprenant_id:compte,module_id:null,exercice_id:id,exercice_type:EXERCICE_TYPE_JEU,reponses:{version:VERSION_TAXI,...draft},completed:termine,score:null});
    return flushAnswerSavesAndWait(compte,id);
  },
};
export function useActiviteTaxi(compte: string | null | undefined, id: string, transport: TransportTaxi = transportReel) {
  const [valeurs,setValeurs] = useState<SaisiesTaxi>({});
  const [statut,setStatut] = useState("Chargement du suivi…");
  const [confirme,setConfirme] = useState(false);
  const [charge,setCharge] = useState(false);
  const [busy,setBusy] = useState(false);
  const generation = useRef(0);
  const revision = useRef("");
  const valeursRef = useRef<SaisiesTaxi>({});
  const relire = useCallback(async()=> {
    const g=++generation.current;
    setCharge(false); setConfirme(false); setValeurs({}); valeursRef.current={};
    if(!compte) {setStatut("Aperçu — aucune sauvegarde élève");setCharge(true);return;}
    let local: BrouillonTaxi | null = null;
    let erreurLocale = false;
    try { local=lireBrouillonTaxi(window.localStorage,compte,id); } catch { erreurLocale=true; }
    const appliquer=(v:SaisiesTaxi,r:string)=>{setValeurs(v);valeursRef.current=v;revision.current=r;};
    if(local) appliquer(local.valeurs,local.revision);
    try {
      const raw=await transport.lire(compte,id) as {completed?:boolean;reponses?:{version?:string;valeurs?:SaisiesTaxi;revision?:string}} | null;
      if(g!==generation.current)return;
      if(raw?.reponses && raw.reponses.version!==VERSION_TAXI) throw new Error("Version du suivi incompatible : aucune ancienne réponse remplacée.");
      const pending=transport===transportReel ? getPendingAnswers(compte,id) as {valeurs?:SaisiesTaxi;revision?:string}|null : null;
      if(!local) appliquer(pending?.valeurs ?? raw?.reponses?.valeurs ?? {},pending?.revision ?? raw?.reponses?.revision ?? "");
      setConfirme(raw?.completed===true);
      setStatut(erreurLocale ? "Lecture locale impossible — anciennes saisies conservées, ne validez pas." : raw?.completed ? "Activité terminée — preuve serveur" : local && !accuseTaxiCorrespond(raw,local,false) ? "Saisie conservée sur cet appareil — à enregistrer" : "Suivi chargé");
      setCharge(!erreurLocale);
    } catch {
      if(g!==generation.current)return;
      setStatut("Suivi indisponible — saisie conservée, réessayez la lecture.");setCharge(false);
    }
  },[compte,id,transport]);
  useEffect(()=>{void relire();return()=>{generation.current++;};},[relire]);
  const modifier=(champ:string,valeur:string)=> {
    const next={...valeursRef.current,[champ]:valeur};
    valeursRef.current=next;setValeurs(next);revision.current=crypto.randomUUID();
    if(!compte || isLearnerPreviewReadOnly() || confirme)return;
    try{ecrireBrouillonTaxi(window.localStorage,compte,id,{valeurs:next,revision:revision.current});setStatut("Saisie conservée sur cet appareil — à enregistrer");}
    catch{setStatut("Stockage appareil indisponible — gardez cette fenêtre ouverte.");}
  };
  const enregistrer=async(termine=false)=> {
    if(!compte || !charge || busy || confirme || isLearnerPreviewReadOnly())return;
    if(termine && !saisieComplete(id,valeursRef.current)){setStatut("Complétez toutes les réponses avant de terminer.");return;}
    const g=generation.current;
    const draft={valeurs:{...valeursRef.current},revision:revision.current || crypto.randomUUID()};revision.current=draft.revision;
    try {ecrireBrouillonTaxi(window.localStorage,compte,id,draft);}catch{setStatut("Stockage appareil indisponible — saisie conservée à l’écran.");return;}
    setBusy(true);setStatut("Enregistrement en cours…");
    try{
      const ok=await transport.envoyer(compte,id,draft,termine);
      const row=await transport.lire(compte,id);
      if(g!==generation.current)return;
      if(!ok || !accuseTaxiCorrespond(row,draft,termine))throw new Error("Accusé non prouvé");
      if(termine){setConfirme(true);window.dispatchEvent(new Event("activite-registre-confirmee"));}
      setStatut(revision.current!==draft.revision ? "Nouvelle saisie conservée sur cet appareil — à enregistrer" : termine ? "Activité terminée — confirmée par le serveur" : "Brouillon enregistré — confirmé par le serveur");
    }catch{if(g===generation.current)setStatut("Enregistrement non confirmé — saisie conservée sur cet appareil.");}
    finally{if(g===generation.current)setBusy(false);}
  };
  return {valeurs,modifier,statut,confirme,charge,busy,enregistrer,relire};
}