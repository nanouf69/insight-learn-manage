// Reprise EXCEPTIONNELLE autorisée le 23/10/2026 (demande « Des correctifs »),
// UNE fois, pour exactement ces 6 QRC d'Aba-Bakre BENJELLOUN dont l'appel du
// 22/10 a été abandonné localement à 60 s (journal passerelle : 499, 0 jeton de
// sortie, corrélation unique à la seconde). La base revérifie tout (constat figé).
export const REPRISE_EXCEPTIONNELLE_6: ReadonlyMap<string, string> = new Map([
  ["4814bf89-d0e3-484f-9a94-143eaa113ec9", "f129b372-951f-42a8-95b0-d6421ace164b"],
  ["6f0e5f81-98c9-4ec7-aee6-97004edabb78", "f129b372-951f-42a8-95b0-d6421ace164b"],
  ["972083aa-6b40-4523-baf0-e823c6afc3cb", "0ffd1d8e-90ee-4a4b-b551-039850013ec5"],
  ["8161a9b6-6fab-48c5-af94-c7cfce9e9965", "7bb05127-90a6-4ec4-b95a-2e36a19f4dfc"],
  ["b64b7b6f-f739-4a67-9411-18d6f7df1166", "5c329b15-7981-420d-9b2b-e9cfaf8c3d05"],
  ["58229778-73a7-4db6-bb7d-6babdf103ae2", "5c329b15-7981-420d-9b2b-e9cfaf8c3d05"],
]);
export const repriseExceptionnelleAutorisee = (qrcId: string | undefined, attemptId: string): boolean =>
  !!qrcId && REPRISE_EXCEPTIONNELLE_6.get(qrcId) === attemptId;
