/** Export/display only: an explicitly empty half-day must not gain default hours. */
export function creneauxFeuillePratique(slot?: { matin?: string; apresmidi?: string; horaireMode?: string } | string) {
  if (typeof slot === 'string' && slot.trim()) return { matin: slot.trim(), apresmidi: '' };
  if (typeof slot === 'object' && (slot.horaireMode === 'custom' || slot.matin !== undefined || slot.apresmidi !== undefined)) {
    return { matin: slot.matin?.trim() ?? '', apresmidi: slot.apresmidi?.trim() ?? '' };
  }
  return { matin: '9h-12h', apresmidi: '13h-16h' };
}