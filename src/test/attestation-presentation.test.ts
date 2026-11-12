import { describe, expect, it } from "vitest";
import { attestationFinaleProuvee, jalonsIntegralementProuves } from "@/lib/attestationFinValidee/presentation";
import { elementsRestantAValider, motifSansDuree } from '@/lib/attestationFinValidee/redactionPresentation';
const p = { apprenantId: "fixture", sourceId: "server-proof", verifieLe: "2026-11-12T17:01:00Z", jalonsObligatoires: 7, jalonsValides: 7, validationsRequisesConfirmees: true };
const signature = { nom: "Fixture", image: "existing-image", le: p.verifieLe, autorisationId: "explicit-authorization", tampon: "existing-stamp" };
describe("attestation presentation proof", () => {
  it('le détail pédagogique vient du verdict serveur ; une lecture absente ne devient pas un module manquant',()=>{
    const etat = {module_id:3,status:null,status_effectif:null,completed_at:null,questions_requises:0,questions_prouvees:0,preuve_complete:false,progress_effectif:0};
    expect(elementsRestantAValider([{id:3,nom:'3.FORMULES'}],new Map([[3,etat]]))).toEqual([{nom:'3.FORMULES',statut:'Validation non enregistrée'}]);
    expect(elementsRestantAValider([{id:3,nom:'3.FORMULES'}],new Map())).toBeNull();
    expect(elementsRestantAValider([{id:3,nom:'3.FORMULES'}],new Map([[3,{...etat,status_effectif:'completed',preuve_complete:true}]]))).toEqual([]);
  });
  it('aucun motif de durée ne passe dans la présentation',()=>{
    expect(motifSansDuree('38h11 / 60h')).toBe(false);
    expect(motifSansDuree('Heures manquantes')).toBe(false);
    expect(motifSansDuree('Durée à compléter')).toBe(false);
    expect(motifSansDuree('Identité à vérifier')).toBe(true);
  });
  it("Léa 3/7 et 98,9% ne prouvent pas tous les jalons", () => {
    expect(jalonsIntegralementProuves({ ...p, jalonsValides: 3 }, "fixture")).toBe(false);
    expect(jalonsIntegralementProuves({ ...p, jalonsValides: 6.923 }, "fixture")).toBe(false);
  });
  it("100% sans validation requise ou sans source serveur ne certifie rien", () => {
    expect(jalonsIntegralementProuves({ ...p, validationsRequisesConfirmees: false }, "fixture")).toBe(false);
    expect(jalonsIntegralementProuves({ ...p, sourceId: "" }, "fixture")).toBe(false);
    expect(jalonsIntegralementProuves(p, "another")).toBe(false);
    expect(jalonsIntegralementProuves(p, "fixture")).toBe(true);
  });
  it("final uniquement après preuve complète, tampon, autorisation et double signature de même empreinte", () => {
    const e = { apprenantId: "fixture", preuve: p, empreinte: "sha", empreinteSignee: "sha", centre: signature, apprenant: signature };
    expect(attestationFinaleProuvee(e)).toBe(true);
    expect(attestationFinaleProuvee({ ...e, centre: { ...signature, tampon: undefined } })).toBe(false);
    expect(attestationFinaleProuvee({ ...e, centre: { ...signature, autorisationId: "" } })).toBe(false);
    expect(attestationFinaleProuvee({ ...e, apprenant: null })).toBe(false);
    expect(attestationFinaleProuvee({ ...e, empreinteSignee: "other" })).toBe(false);
  });
});