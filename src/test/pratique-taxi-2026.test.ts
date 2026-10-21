import { describe, it, expect, vi, afterEach } from "vitest";
import { FERIES_2026, QUESTIONS_TARIFS, SCENARIOS_RTST, IDS_TAXI, attenteEuros, tarifRhône, estNuit, supplementPassagers, supplementBagages, reservationEuros, minimumCourse, evaluationConditionnelle, saisieComplete } from "@/components/cours-en-ligne/pratique-taxi-2026/donnees";
import { activitesDuModule, activitesRequisesModule, completionAvecActivites } from "@/lib/jeuxPedagogiques";
import { activitesModuleEleve } from "@/lib/activitesModuleEleve";
import { pourcentagePagesActuelles } from "@/lib/pagesProgressionActuelle";
import { accuseTaxiCorrespond, ecrireBrouillonTaxi, lireBrouillonTaxi, cleBrouillonTaxi } from "@/components/cours-en-ligne/pratique-taxi-2026/persistance";
afterEach(()=>vi.useRealTimers());
describe("Pratique TAXI 2026 — données et règles sourcées",()=>{
  it("exactement les 11 dates demandées, aucun jour Alsace/Moselle",()=>expect(FERIES_2026.map(f=>f.date)).toEqual(["2026-01-01","2026-04-06","2026-05-01","2026-05-08","2026-05-14","2026-05-25","2026-07-14","2026-08-15","2026-11-01","2026-11-11","2026-12-25"]));
  it("un quiz >=25 questions et identités uniques",()=>{expect(QUESTIONS_TARIFS.length).toBeGreaterThanOrEqual(25);expect(new Set(QUESTIONS_TARIFS.map(q=>q.id)).size).toBe(30);});
  it("13 scénarios complets avec 52 saisies RTST",()=>{expect(SCENARIOS_RTST).toHaveLength(13);expect(SCENARIOS_RTST.map(s=>s.id)).toEqual(Array.from({length:13},(_,i)=>`s${String(i+1).padStart(2,"0")}`));expect(saisieComplete(IDS_TAXI[2],Object.fromEntries(SCENARIOS_RTST.flatMap(s=>["r","tarif","s","attente"].map(c=>[`${s.id}_${c}`,"hypothèse raisonnable"]))))).toBe(true);});
  it("A jour retour chargé",()=>expect(tarifRhône(false,false,true)).toBe("A"));
  it("B nuit retour chargé",()=>expect(tarifRhône(true,false,true)).toBe("B"));
  it("C jour retour vide",()=>expect(tarifRhône(false,false,false)).toBe("C"));
  it("D nuit retour vide",()=>expect(tarifRhône(true,false,false)).toBe("D"));
  it("férié/dimanche chargé B",()=>expect(tarifRhône(false,true,true)).toBe("B"));
  it("férié/dimanche vide D",()=>expect(tarifRhône(false,true,false)).toBe("D"));
  it("nuit 19h inclus",()=>expect(estNuit(19)).toBe(true));
  it("jour 7h inclus",()=>expect(estNuit(7)).toBe(false));
  it("neige sans équipements non majorée",()=>expect(tarifRhône(false,false,true,true,false)).toBe("A"));
  it("pneus hiver sans neige effective non majorée",()=>expect(tarifRhône(false,false,true,false,true)).toBe("A"));
  it("neige effective ET équipements B",()=>expect(tarifRhône(false,false,true,true,true)).toBe("B"));
  it("neige + nuit pas de cumul",()=>expect(tarifRhône(true,false,true,true,true)).toBe("B"));
  it("réservation immédiate 2€ dans ZUPC",()=>expect(reservationEuros("immediate",true)).toBe(2));
  it("réservation anticipée 4€ dans ZUPC",()=>expect(reservationEuros("avance",true)).toBe(4));
  it("hors ZUPC aucun supplément réservation",()=>expect(reservationEuros("avance",false)).toBe(0));
  it("zone inconnue jamais montant déclaré officiel",()=>expect(reservationEuros("avance",null)).toBeNull());
  it("hélé 0€",()=>expect(reservationEuros("helee",true)).toBe(0));
  it("5 passagers dont enfants supplément 4€",()=>expect(supplementPassagers(5)).toBe(4));
  it("6 passagers 8€",()=>expect(supplementPassagers(6)).toBe(8));
  it("4 passagers aucun supplément",()=>expect(supplementPassagers(4)).toBe(0));
  it("5 valises pour un passager 4€",()=>expect(supplementBagages([5])).toBe(4));
  it("trois bagages PAR passager et non véhicule",()=>expect(supplementBagages([3,3])).toBe(0));
  it("encombrant extérieur distinct 2€",()=>expect(supplementBagages([0],1)).toBe(2));
  it("minimum 8€ suppléments inclus",()=>{expect(minimumCourse(7)).toBe(8);expect(minimumCourse(9)).toBe(9);});
  it.each([[15,10.33],[45,30.98],[10,6.88]])("attente %i min = %f €",(n,e)=>expect(attenteEuros(n)).toBe(e));
  it("hypothèses conditionnelles ne pénalisent pas",()=>{expect(evaluationConditionnelle("A si retour chargé").penalite).toBe(0);expect(evaluationConditionnelle("D si retour vide").penalite).toBe(0);});
  it("incomplet jamais terminé",()=>{expect(saisieComplete(IDS_TAXI[0],{f01:"2026-01-01"})).toBe(false);expect(saisieComplete("autre",{})).toBe(false);});
});
describe("Gel module TAXI et isolement",()=>{
  const row={module_id:6,status:"completed",progress:100,completed_at:"2026-09-17T10:00:00Z"};
  it("exactement trois activités module 6",()=>expect(activitesDuModule(6).map(a=>a.id)).toEqual([...IDS_TAXI]));
  it("100% date initiale et historique inchangés après ajout",()=>{
    const before=JSON.stringify(row);
    const r=completionAvecActivites(row,{moduleId:6,pages:10,questions:99},activitesDuModule(6),new Set());
    expect(r.completion).toMatchObject({status:"completed",progress:100});expect(r.etat.valideLe).toBe("2026-09-17T10:00:00.000Z");expect(JSON.stringify(row)).toBe(before);
  });
  it("facultatives mais toutes visibles",()=>{const e=activitesModuleEleve(6,[{id:6}],[row],new Set());expect(e.etat).toBe("ok");if(e.etat==="ok"){expect(e.requises).toHaveLength(0);expect(e.facultatives.map(a=>a.id)).toEqual([...IDS_TAXI]);}});
  it("en cours trois activités requises",()=>expect(activitesRequisesModule(6,{status:"in_progress"})).toHaveLength(3));
  it("lecture impossible ≠ zéro",()=>expect(activitesModuleEleve(6,[{id:6}],[],null).etat).toBe("indisponible"));
  it("autres modules inchangés",()=>{expect(activitesDuModule(8).map(a=>a.id)).toEqual(["jeu_lyon_arrondissements_quartiers","jeu_lyon_lieux"]);expect(activitesDuModule(1)).toEqual([]);});
  it.each(["2025-01-01","2030-01-01"])("horloge %s pas de filtrage courant",date=>{vi.useFakeTimers();vi.setSystemTime(new Date(date));expect(activitesDuModule(6)).toHaveLength(3);});
  it("relevé historique avant ajout intact",()=>expect(activitesDuModule(6,"2026-10-20T23:59:59Z")).toEqual([]));
  it("ancien compteur 125% borné 100%",()=>expect(pourcentagePagesActuelles([0,1,2,3,4,5,6,7,8,9],8)).toBe(100));
});
describe("Brouillons nouveaux — aucun ancien stockage touché",()=>{
  it("fermer/réouvrir/recharger garde les saisies isolées par compte et activité",()=>{
    const storage=new Map<string,string>();const store={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);}};
    store.setItem("answer_save_queue_v1","ancienne-file");const a={valeurs:{f01:"2026-01-01"},revision:"r1"};
    ecrireBrouillonTaxi(store,"A",IDS_TAXI[0],a);
    expect(lireBrouillonTaxi(store,"A",IDS_TAXI[0])).toEqual(a);expect(lireBrouillonTaxi(store,"B",IDS_TAXI[0])).toBeNull();expect(lireBrouillonTaxi(store,"A",IDS_TAXI[1])).toBeNull();expect(store.getItem("answer_save_queue_v1")).toBe("ancienne-file");
    expect(cleBrouillonTaxi("A",IDS_TAXI[0])).toContain("2026-v1");
  });
  it("erreur stockage et lecture ne deviennent pas brouillon vide",()=>{
    expect(()=>lireBrouillonTaxi({getItem:()=>"{corrompu"},"A",IDS_TAXI[0])).toThrow();
    const draft={valeurs:{s01_r:"4"},revision:"r1"};expect(()=>ecrireBrouillonTaxi({setItem:()=>{throw Error("quota");}},"A",IDS_TAXI[2],draft)).toThrow();expect(draft.valeurs.s01_r).toBe("4");
  });
  it("accusé exact obligatoire et réponse récente non effacée",()=>{
    const draft={valeurs:{f01:"2026-01-01"},revision:"r2"};
    expect(accuseTaxiCorrespond({completed:true,reponses:{version:"2026-v1",valeurs:draft.valeurs,revision:"r1"}},draft,true)).toBe(false);
    expect(accuseTaxiCorrespond({completed:false,reponses:{version:"2026-v1",...draft}},draft,true)).toBe(false);
    expect(accuseTaxiCorrespond({completed:true,reponses:{version:"2026-v1",...draft}},draft,true)).toBe(true);
  });
});