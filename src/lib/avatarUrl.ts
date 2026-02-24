/**
 * Generate a gendered DiceBear avatar URL based on civilité.
 * "Mme" / "Mlle" → female appearance, "M." → male appearance.
 */
export function getAvatarUrl(prenom: string, nom: string, civilite?: string | null): string {
  const seed = `${prenom}${nom}`;
  const isFemale = civilite === 'Mme' || civilite === 'Mlle';

  if (isFemale) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&top=longHairStraight,longHairCurly,longHairBob,longHairBun,longHairFrida,longHairNotTooLong&facialHairProbability=0&clothing=blazerAndShirt,collarAndSweater,graphicShirt,overall`;
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&top=shortFlat,shortCurly,shortWaved,shortRound,theCaesar,theCaesarAndSidePart&facialHairProbability=40&clothing=blazerAndShirt,collarAndSweater,graphicShirt,hoodie`;
}
