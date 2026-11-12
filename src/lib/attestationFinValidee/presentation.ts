/** Presentation only: a displayed rate, module counter or signature image alone is never proof. */
export interface PreuvePresentationAttestation {
  apprenantId: string;
  sourceId: string;
  verifieLe: string;
  jalonsObligatoires: number;
  jalonsValides: number;
  validationsRequisesConfirmees: boolean;
}
export function jalonsIntegralementProuves(p: PreuvePresentationAttestation | null, apprenantId: string): boolean {
  return !!p && p.apprenantId === apprenantId && !!p.sourceId && Number.isFinite(Date.parse(p.verifieLe))
    && Number.isInteger(p.jalonsObligatoires) && p.jalonsObligatoires > 0
    && p.jalonsValides === p.jalonsObligatoires && p.validationsRequisesConfirmees === true;
}
/** Without certification, personal data never fills the certification sentence. */
export function texteCertificationPresentation(e: {certifie:boolean;prenom:string;nom:string;formation:string;debut:string;fin:string}):string {
  const personne=e.certifie?`${e.prenom} ${e.nom.toUpperCase()}`:'[Prénom NOM]';
  const formation=e.certifie?e.formation:'[intitulé de la formation]';
  const debut=e.certifie?e.debut:'[date de début]';const fin=e.certifie?e.fin:'[date de fin]';
  return `Je soussigné(e), représentant(e) de l'organisme Ftransport, atteste que ${personne} a suivi et réalisé l'intégralité des jalons pédagogiques obligatoires prévus dans le cadre de sa formation ${formation}, dispensée du ${debut} au ${fin}.\n\nLa présente attestation est délivrée pour servir et valoir ce que de droit.`;
}
export interface SignaturePresentation {
  nom: string; image: string; le: string; autorisationId: string; tampon?: string;
}
export function attestationFinaleProuvee(e: {
  apprenantId: string; preuve: PreuvePresentationAttestation | null; empreinteSignee: string | null;
  empreinte: string | null; centre: SignaturePresentation | null; apprenant: SignaturePresentation | null;
}): boolean {
  const signatureValide = (s: SignaturePresentation | null) => !!s?.image && !!s.autorisationId && Number.isFinite(Date.parse(s.le));
  return jalonsIntegralementProuves(e.preuve, e.apprenantId) && !!e.empreinte && e.empreinte === e.empreinteSignee
    && signatureValide(e.centre) && !!e.centre?.tampon && signatureValide(e.apprenant);
}