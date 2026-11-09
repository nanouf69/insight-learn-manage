import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { estConsultation, exerciceIdEb2, projeterResultatEb2, remiseProuvee, provenanceRemise, chargerConsultationEb2, type ResultatEb2 } from "@/features/correction-qrc-v2/eb2Consultation";
import { supabase } from "@/integrations/supabase/client";

const base = (o: Partial<ResultatEb2> = {}): ResultatEb2 => ({
  id: "r1", apprenant_id: "a1", quiz_id: "EB2", matiere_id: "t3p", tentative: 1, completed_at: "2026-11-09T09:00:00Z",
  details: {
    reponses: { "1": "réponse élève", "2": "B" },
    questions: [
      { id: 1, type: "QRC", enonce: "Question QRC", reponseQRC: "Corrigé", points: 2 },
      { id: 2, type: "QCM", enonce: "QCM" },
    ],
    qrc_pending_correction: true,
    correctionsIA: { "1": { pointsObtenus: 1.5 } },
  },
  ...o,
});

describe("EB2 VTC en consultation dans le correcteur V2", () => {
  it("lit les preuves au-delà de 1000 sans masquer une remise située sur la seconde page", async () => {
    const ranges:number[]=[];
    const proof={apprenant_id:'a1',exercice_id:'EB2__t3p',tentative:1,completed:true,status:'submitted',submitted_at:'2026-11-09T09:00:00Z',reponses:base().details.reponses};
    const builder=(table:string):any=>({select(){return this;},eq(){return this;},order(){return this;},in(){return this;},then(resolve:any){return Promise.resolve({data:table==='apprenants'?[{id:'a1',nom:'X',prenom:'Y'}]:[base()],error:null}).then(resolve);},range(from:number){ranges.push(from);return Promise.resolve({data:from===0?Array.from({length:1000},()=>({...proof,apprenant_id:'other'})):[proof],error:null});}});
    Object.assign(supabase,{from:vi.fn(builder)});
    const result=await chargerConsultationEb2(['consultation:r1']);
    expect(ranges).toEqual([0,1000]);expect(result.tentatives[0].etat).toBe('terminee');expect(result.qrc[0].note).toBeNull();
  });
  it("projette seulement les QRC, avec la réponse enregistrée et l'identité de la copie d'origine", () => {
    const { tentative, qrc } = projeterResultatEb2(base(), "DUPONT Jean", true);
    expect(tentative.attempt_id).toBe("consultation:r1");
    expect(tentative.exam_id).toBe("EB2");
    expect(qrc).toHaveLength(1);
    expect(qrc[0].qrc_instance_id).toBe("consultation:r1:1");
    expect(qrc[0].reponse).toBe("réponse élève");
    expect(tentative.snapshot.questions[0].reponseQRC).toBe("Corrigé");
    expect(tentative.snapshot.questions[0].points).toBe(2);
    expect(estConsultation(qrc[0].qrc_instance_id)).toBe(true);
  });
  it("une copie marquée en attente reste à corriger : aucune note provisoire présentée comme définitive", () => {
    const { qrc } = projeterResultatEb2(base(), "x", true);
    expect(qrc[0].etat).toBe("en_attente");
    expect(qrc[0].note).toBeNull();
  });
  it("une correction historique enregistrée est affichée comme automatique historique", () => {
    const r = base(); r.details.qrc_pending_correction = undefined;
    const { qrc } = projeterResultatEb2(r, "x", true);
    expect(qrc[0].etat).toBe("corrigee");
    expect(qrc[0].note).toBe(1.5);
    expect(qrc[0].corrige_email).toBe("correction historique importée");
  });
  it("remise prouvée seulement par fiche identique (élève, exercice, tentative, statut, réponses)", () => {
    const r = base({ tentative: 2 });
    expect(exerciceIdEb2(r)).toBe("EB2__t3p__t2");
    const ok = { apprenant_id: "a1", exercice_id: "EB2__t3p__t2", tentative: 2, completed: true, status: "submitted", submitted_at: "x", reponses: { "1": "réponse élève", "2": "B" } };
    expect(remiseProuvee(r, [ok])).toBe(true);
    expect(remiseProuvee(r, [{ ...ok, reponses: { "1": "autre" } }])).toBe(false);
    expect(remiseProuvee(r, [{ ...ok, tentative: 1 }])).toBe(false);
    expect(remiseProuvee(r, [{ ...ok, status: "draft" }])).toBe(false);
    expect(projeterResultatEb2(r, "x", false).tentative.etat).toBe("remise_non_certifiee");
  });
  it("ne modifie jamais la copie source", () => {
    const r = base(); const avant = JSON.stringify(r);
    projeterResultatEb2(r, "x", true);
    expect(JSON.stringify(r)).toBe(avant);
  });
  it("une QRC validée par un formateur est verrouillée comme corrigée, même si la copie reste marquée en attente", () => {
    const r = base(); r.details.correctionsIA = { "1": { pointsObtenus: 1, validatedByAdmin: true, manuel: true, correctedAt: "2026-11-09T18:00:00Z" } };
    const { qrc } = projeterResultatEb2(r, "x", true);
    expect(qrc[0].etat).toBe("corrigee");
    expect(qrc[0].note).toBe(1);
    expect(qrc[0].corrige_email).toBe("formateur (copie historique)");
  });
  it("une proposition automatique en attente n'est jamais présentée comme note (QRC partielle à corriger)", () => {
    const { qrc } = projeterResultatEb2(base(), "x", true);
    expect(qrc[0].etat).toBe("en_attente"); expect(qrc[0].note).toBeNull();
  });
  it("provenance : même instant = identique ; réponses identiques mais autre instant = à confirmer ; aucune fiche = résultat seul", () => {
    const r = base();
    const ok = { apprenant_id: "a1", exercice_id: "EB2__t3p", tentative: 1, completed: true, status: "submitted", submitted_at: "2026-11-09T09:00:00.000Z", reponses: r.details.reponses };
    expect(provenanceRemise(r, [ok])).toBe("remise_identique");
    expect(provenanceRemise(r, [{ ...ok, submitted_at: "2026-11-09T09:02:00Z" }])).toBe("remise_horodatage_divergent");
    expect(provenanceRemise(r, [{ ...ok, reponses: { "1": "autre" } }])).toBe("resultat_seul");
    expect(provenanceRemise(r, [])).toBe("resultat_seul");
  });
  it("expose l'identité serveur de notation (copie + score attendu + seuil configuré EB2)", () => {
    const { tentative } = projeterResultatEb2(base({ score_obtenu: 9.5 }), "x", true);
    expect(tentative.historique.result_id).toBe("r1");
    expect(tentative.historique.score_obtenu).toBe(9.5);
    expect(typeof tentative.historique.seuil).toBe("number");
  });
});
