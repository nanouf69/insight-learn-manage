import { describe, expect, it } from "vitest";
import { controleConnaissancesDisplay, canonicalRowsControle } from "@/lib/controleConnaissancesDisplay";
import { createHash } from "node:crypto";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const questions = [199,201,204,207,226,227].map(id=>({id,enonce:`Question fictive ${id}`,choix:[{lettre:"A",texte:`Choix ${id}`,correct:true}]}));
const moduleTest = {id:13,exercices:[{id:13100,actif:true,questions,sousTitre:"211 questions",deletedQuestionIds:[199,201,204,207]}]};
describe("Contrôle connaissances : suppressions explicites d'affichage",()=>{
  it("une ligne canonique encore active ne ressuscite ni tombstone ni question absente du serveur",()=>{
    const rows=[69,199,201,204,207,226,227,999].map(legacy_question_id=>({section_id:13100,legacy_question_id}));
    expect(canonicalRowsControle(moduleTest,rows).map(r=>r.legacy_question_id)).toEqual([226,227]);
    expect(canonicalRowsControle({...moduleTest,id:12},rows)).toBe(rows);
  });
  it("exclut exactement les quatre IDs retirés, pas les deux questions de la capture",()=>{
    const result=controleConnaissancesDisplay(moduleTest);
    expect(result.exercices[0].questions.map(q=>q.id)).toEqual([226,227]);
    expect(result.exercices[0].sousTitre).toBe("2 questions");
    expect(hash(result.exercices[0].questions)).toBe(hash(questions.filter(q=>[226,227].includes(q.id))));
  });
  it("ne mute ni contenu serveur ni réponses restantes de deux comptes fictifs, même après réhydratation",()=>{
    const before=hash(moduleTest);
    const answersA={"13100-226":"A"},answersB={"13100-227":"B"};
    const proof=hash([answersA,answersB]);
    for(let reload=0;reload<5;reload++) expect(controleConnaissancesDisplay(structuredClone(moduleTest)).exercices[0].questions.map(q=>q.id)).toEqual([226,227]);
    expect(hash(moduleTest)).toBe(before); expect(hash([answersA,answersB])).toBe(proof);
  });
  it("ne touche aucun autre module ni ses questions",()=>{
    const other={...moduleTest,id:12}; expect(controleConnaissancesDisplay(other)).toBe(other);
  });
  it("honore les tombstones d'un quiz ajouté Admin même vide sans fallback",()=>{
    const data={id:13,exercices:[{id:13100,actif:true,questions:[{id:69}],deletedQuestionIds:[69]}]};
    expect(controleConnaissancesDisplay(data).exercices[0].questions).toEqual([]);
  });
});