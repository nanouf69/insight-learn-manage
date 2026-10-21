/** Explicit browser test entry, NOT an app route; synthetic accounts/transport only. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { Button } from "@/components/ui/button";
import ExercicesTaxi2026 from "@/components/cours-en-ligne/pratique-taxi-2026/ExercicesTaxi2026";
import { ActivitesModuleContext } from "@/components/cours-en-ligne/ActivitesModuleStatut";
import { activitesModuleEleve } from "@/lib/activitesModuleEleve";
import { IDS_TAXI } from "@/components/cours-en-ligne/pratique-taxi-2026/donnees";
import type { TransportTaxi } from "@/components/cours-en-ligne/pratique-taxi-2026/useActiviteTaxi";
const transportFictif:TransportTaxi={
  async lire(c,id){return JSON.parse(localStorage.getItem(`harness-only:${c}:${id}`)??"null");},
  async envoyer(c,id,draft,termine){
    if(localStorage.getItem("harness-only:panne")==="oui")throw Error("Panne fictive");
    if(termine && !draft.valeurs)throw Error("Saisie absente");
    localStorage.setItem(`harness-only:${c}:${id}`,JSON.stringify({completed:termine,reponses:{version:"2026-v1",...draft}}));return true;
  },
};
function Harness(){
  const [c,setC]=useState("fictif-A");const [gel,setGel]=useState(true);const [panne,setPanne]=useState(false);
  const rows=gel?[{module_id:6,status:"completed",progress:100,completed_at:"2026-09-17T10:00:00Z"}]:[];
  const e=activitesModuleEleve(6,[{id:6}],rows,new Set());
  return <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Contrôle fictif TAXI — aucune donnée élève</h1>
    <div className="flex flex-wrap gap-2">
      <Button onClick={()=>setC(v=>v==="fictif-A"?"fictif-B":"fictif-A")}>Compte {c}</Button>
      <Button onClick={()=>setGel(v=>!v)}>{gel?"Module gelé 100 % — 17/09":"Module en cours"}</Button>
      <Button onClick={()=>{const n=!panne;setPanne(n);localStorage.setItem("harness-only:panne",n?"oui":"non");}}>{panne?"Rétablir le réseau fictif":"Simuler une panne"}</Button>
    </div>
    <ActivitesModuleContext.Provider value={e}><ExercicesTaxi2026 key={c} compteId={c} transport={transportFictif}/></ActivitesModuleContext.Provider>
    <p className="text-xs text-muted-foreground">3 identités : {IDS_TAXI.join(" · ")}</p>
  </main>;
}
const root=document.getElementById("root");if(root)createRoot(root).render(<Harness/>);