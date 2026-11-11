/** Display-only labels for the existing mock-exam identifiers. Unknown IDs stay unchanged. */
export function libelleExamen(examId:string):string {
  const match=/^eb([1-6])(?:-(taxi|ta|va))?$/i.exec(examId);
  if(!match)return examId;
  return `EB${match[1]} ${(match[2]??'VTC').toUpperCase()}`;
}