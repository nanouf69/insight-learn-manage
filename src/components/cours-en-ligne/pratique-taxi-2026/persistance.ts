import { VERSION_TAXI, type SaisiesTaxi } from "./donnees";
export interface BrouillonTaxi { valeurs: SaisiesTaxi; revision: string }
export const cleBrouillonTaxi = (compte: string, activite: string) => `taxi_pratique_draft:${encodeURIComponent(compte)}:${activite}:${VERSION_TAXI}`;
export function lireBrouillonTaxi(store: Pick<Storage,"getItem">, compte: string, activite: string): BrouillonTaxi | null {
  const raw = store.getItem(cleBrouillonTaxi(compte, activite));
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!data || typeof data.revision !== "string" || !data.valeurs || typeof data.valeurs !== "object" || Array.isArray(data.valeurs)) throw new Error("Brouillon illisible : conservé sur cet appareil.");
  return data;
}
export function ecrireBrouillonTaxi(store: Pick<Storage,"setItem">, compte: string, activite: string, draft: BrouillonTaxi): void {
  store.setItem(cleBrouillonTaxi(compte, activite), JSON.stringify(draft));
}
/** No deletion: an acknowledgement cannot erase a later edit, nor an older queue. */
export function accuseTaxiCorrespond(data: unknown, draft: BrouillonTaxi, termine: boolean): boolean {
  const row = data as { completed?: boolean; reponses?: { version?: string; revision?: string; valeurs?: SaisiesTaxi } } | null;
  return !!row && (!termine || row.completed === true) && row.reponses?.version === VERSION_TAXI && row.reponses?.revision === draft.revision &&
    JSON.stringify(Object.entries(row.reponses?.valeurs ?? {}).sort()) === JSON.stringify(Object.entries(draft.valeurs).sort());
}