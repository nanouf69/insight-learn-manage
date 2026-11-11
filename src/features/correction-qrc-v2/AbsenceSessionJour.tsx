import { useEffect, useState } from 'react';
import { chargerAbsentsSessionJour, type StatutPresenceExamen } from './absenceSessionJour';
import { HEURES_VALIDEES_EVENT } from '@/lib/heuresValideesAdmin';

export function useAbsentsSessionJour(sessionCle: string|null, jour: string|null, charger=chargerAbsentsSessionJour){
  const [etat,setEtat]=useState<{cle:string;ids:Map<string,StatutPresenceExamen>}|null>(null);
  useEffect(()=>{
    if(!sessionCle||!jour)return;
    let alive=true,busy=false;
    const lire=async()=>{
      if(busy||document.visibilityState==='hidden')return;
      busy=true;
      try{const ids=await charger(sessionCle.slice(4),jour);if(alive)setEtat({cle:`${sessionCle}|${jour}`,ids});}
      catch{if(alive)setEtat(null);}
      finally{busy=false;}
    };
    void lire();
    const resume=()=>{void lire();};
    window.addEventListener('focus',resume);window.addEventListener(HEURES_VALIDEES_EVENT,resume);document.addEventListener('visibilitychange',resume);
    return()=>{alive=false;window.removeEventListener('focus',resume);window.removeEventListener(HEURES_VALIDEES_EVENT,resume);document.removeEventListener('visibilitychange',resume);};
  },[sessionCle,jour,charger]);
  return sessionCle&&jour&&etat?.cle===`${sessionCle}|${jour}`?etat.ids:new Map<string,StatutPresenceExamen>();
}