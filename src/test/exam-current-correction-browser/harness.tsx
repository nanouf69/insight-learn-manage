import React from "react";
import {createRoot} from "react-dom/client";
import {useExamCurrentCorrection} from "@/hooks/useExamCurrentCorrection";
import {ExamCurrentCorrectionNotice} from "@/components/cours-en-ligne/ExamCurrentCorrectionNotice";
import {Button} from "@/components/ui/button";
import type {Question} from "@/components/cours-en-ligne/examens-blancs-data";
import "@/index.css";
const frozen:Question={id:3,type:"QCM",enonce:'Sur un trajet de 100 km sur autoroute, si je roule à 130 km/h au lieu de 120 km/h, je "gagne" environ :',choix:[{lettre:"A",texte:"10 minutes"},{lettre:"B",texte:"15minutes"},{lettre:"C",texte:"8 minutes",correct:true}]};
function Harness(){
 const [active,setActive]=React.useState(false);
 const current=useExamCurrentCorrection("EB5","fixture-no-real-account",!active);
 return <main className="mx-auto max-w-3xl space-y-4 p-4"><h1 className="text-xl font-bold">EB5 VTC — C Sécurité routière — Q3</h1><Button onClick={()=>setActive(a=>!a)}>{active?"Voir la correction remise":"Épreuve en cours"}</Button><p>{frozen.enonce}</p><p>Corrigé de notation du passage : C — 8 minutes</p><p>Réponse remise : C · Note enregistrée : 13/20</p>{!active&&<ExamCurrentCorrectionNotice source={current.source} examId="EB5" subject="securite" frozen={frozen}/>} {current.error&&<p role="alert">Lecture actuelle indisponible — copie inchangée</p>}</main>;
}
const root=document.getElementById("root");if(root)createRoot(root).render(<Harness/>);