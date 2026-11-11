export function lienCorrectionSession(sessionCle: string, examenId: string, apprenantId: string) {
  const params = new URLSearchParams({ qrc_groupe: sessionCle, qrc_eb: `${sessionCle}::${examenId}`, qrc_apprenant: apprenantId, qrc_vue: 'corriger' });
  return `/admin/correction-qrc-v2?${params}`;
}