/** Clé de stockage immuable : jamais réutilisée, même à la même milliseconde. */
export function cheminDocumentUnique(apprenantId: string, typeDocument: string, ext: string, now: number = Date.now(), uuid: string = crypto.randomUUID()): string {
  return `${apprenantId}/${typeDocument}-${now}-${uuid}.${ext}`;
}
