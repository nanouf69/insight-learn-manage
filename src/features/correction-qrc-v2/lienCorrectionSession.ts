export type DestinationCorrection={sessionCle:string;jour:string;attemptId:string;libelle:string;qrcRestantes:number};
export function lienCorrectionSession(sessionCle: string, examenId: string, apprenantId: string, source?: Pick<DestinationCorrection,'jour'|'attemptId'>) {
  const params = new URLSearchParams({ qrc_groupe: sessionCle, qrc_eb: `${sessionCle}::${examenId}`, qrc_apprenant: apprenantId, qrc_vue: 'corriger', ...(source?{qrc_date:source.jour,qrc_passage:source.attemptId}:{}) });
  return `/admin/correction-qrc-v2?${params}`;
}