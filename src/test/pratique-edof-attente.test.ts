import { describe,expect,it } from "vitest";
import { pratiqueEdofEnAttente, listePratiqueEdofVisible } from "@/lib/pratiqueEdofEnAttente";
const date="2026-10-17";
const sig={date_emargement:date,demi_journee:"matin",signature_data_url:"data:image/png;base64,YQ==",absent:false,masque:false};
const inscription={liste_attente:false,sessions:{type_session:"pratique_taxi",date_debut:date,date_fin:date,heure_debut:"09:00",heure_fin:"12:00"}};
describe("Pratique signée à valider EDOF",()=>{
  it("trie selon la dernière date pratique, du plus récent au moins récent",()=>{
    const rows=[{id:"ancien",dates:["2026-08-24","2026-08-25"]},{id:"recent",dates:["2026-10-13"]},{id:"dernier",dates:["2026-09-02","2026-10-19"]}];
    expect(listePratiqueEdofVisible(rows,[]).map(a=>a.id)).toEqual(["dernier","recent","ancien"]);
    expect(rows.map(a=>a.id)).toEqual(["ancien","recent","dernier"]);
  });
  it("retire uniquement de la projection et permet de réafficher sans modifier les preuves",()=>{
    const rows=[{id:"a",dates:[date]},{id:"b",dates:[date]}]; const before=JSON.stringify(rows);
    expect(listePratiqueEdofVisible(rows,["a"]).map(a=>a.id)).toEqual(["b"]);
    expect(listePratiqueEdofVisible(rows,[]).map(a=>a.id)).toEqual(["a","b"]);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it.each(["personnel", " Personnel ", "PERSONNEL"])("le financement personnel signé sans badge E est affiché (%s)", mode => expect(pratiqueEdofEnAttente([sig],[inscription],[],[],false,mode)).not.toEqual([]));
  it("le financement personnel validé EDOF disparaît", () => expect(pratiqueEdofEnAttente([sig],[inscription],[],[],true,"personnel")).toEqual([]));
  it("le financement CPF signé reste en attente sans badge E",()=>expect(pratiqueEdofEnAttente([sig],[inscription],[],[],false,"cpf")).toEqual([date]));
  it("une signature pratique réelle apparaît",()=>expect(pratiqueEdofEnAttente([sig],[inscription],[],[],false)).toEqual([date]));
  it("le badge E retire uniquement de la liste",()=>expect(pratiqueEdofEnAttente([sig],[inscription],[],[],true)).toEqual([]));
  it.each([{...sig,masque:true},{...sig,absent:true},{...sig,signature_data_url:null}])("aucune présence sans preuve",s=>expect(pratiqueEdofEnAttente([s],[inscription],[],[],false)).toEqual([]));
  it("une signature théorique seule n'apparaît pas",()=>expect(pratiqueEdofEnAttente([sig],[{...inscription,sessions:{...inscription.sessions,type_session:"theorique"}}],[],[],false)).toEqual([]));
  it("une inscription en attente n'apparaît pas",()=>expect(pratiqueEdofEnAttente([sig],[{...inscription,liste_attente:true}],[],[],false)).toEqual([]));
  it("les doublons de feuilles ne doublent pas la date et restent intacts",()=>{const rows=[sig,{...sig}];const before=JSON.stringify(rows);expect(pratiqueEdofEnAttente(rows,[inscription],[],[],false)).toEqual([date]);expect(JSON.stringify(rows)).toBe(before);});
});