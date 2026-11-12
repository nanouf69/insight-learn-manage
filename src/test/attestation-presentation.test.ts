import { describe, expect, it } from "vitest";
import { attestationFinaleProuvee, jalonsIntegralementProuves, texteCertificationPresentation } from "@/lib/attestationFinValidee/presentation";
import { elementsRestantAValider, motifSansDuree, intituleAttestation } from '@/lib/attestationFinValidee/redactionPresentation';
const p = { apprenantId: "fixture", sourceId: "server-proof", verifieLe: "2026-11-12T17:01:00Z", jalonsObligatoires: 7, jalonsValides: 7, validationsRequisesConfirmees: true };
const signature = { nom: "Fixture", image: "existing-image", le: p.verifieLe, autorisationId: "explicit-authorization", tampon: "existing-stamp" };
describe("attestation presentation proof", () => {
  it('VTC : intitulés demandés à distance et en présentiel',()=>{
    expect(intituleAttestation('vtc-elearning','e-learning')).toBe('Formation VTC E-learning');
    expect(intituleAttestation('vtc','présentiel')).toBe('Formation VTC');
  });
  it('le brouillon reprend l’identité renseignée sans changer la validité du document',()=>{
    const e={certifie:false,prenom:'Léa',nom:'CATANIA',formation:'Formation VTC',debut:'14 septembre 2026',fin:'19 octobre 2026'};
    const texte=texteCertificationPresentation(e);
    expect(texte).toContain('atteste que Léa CATANIA');expect(texte).not.toContain('[Prénom NOM]');
    expect(texte).toContain('dispensée du 14 septembre 2026 au 19 octobre 2026');
    expect(texte).toContain('formation « VTC »');
    expect(texteCertificationPresentation({...e,certifie:true})).toContain('atteste que Léa CATANIA');
  });
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