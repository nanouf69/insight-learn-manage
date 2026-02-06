/**
 * Parse une chaîne de date du catalogue (ex: "Du 12 au 25 janvier 2026")
 * et retourne les dates de début et fin au format YYYY-MM-DD
 */
export function parseDateRange(dateString: string): { dateDebut: string | null; dateFin: string | null } {
  if (!dateString || dateString === "manuel") {
    return { dateDebut: null, dateFin: null };
  }

  const moisMap: Record<string, string> = {
    'janvier': '01',
    'février': '02',
    'mars': '03',
    'avril': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07',
    'août': '08',
    'septembre': '09',
    'octobre': '10',
    'novembre': '11',
    'décembre': '12',
  };

  try {
    // Pattern 1: "Du 12 au 25 janvier 2026" (même mois)
    const sameMonthPattern = /Du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i;
    const sameMonthMatch = dateString.match(sameMonthPattern);
    
    if (sameMonthMatch) {
      const [, jourDebut, jourFin, mois, annee] = sameMonthMatch;
      const moisNum = moisMap[mois.toLowerCase()];
      
      if (moisNum) {
        const dateDebut = `${annee}-${moisNum}-${jourDebut.padStart(2, '0')}`;
        const dateFin = `${annee}-${moisNum}-${jourFin.padStart(2, '0')}`;
        return { dateDebut, dateFin };
      }
    }

    // Pattern 2: "Du 29 juin au 20 juillet 2026" (mois différents, même année)
    const diffMonthPattern = /Du\s+(\d{1,2})\s+(\w+)\s+au\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i;
    const diffMonthMatch = dateString.match(diffMonthPattern);
    
    if (diffMonthMatch) {
      const [, jourDebut, moisDebut, jourFin, moisFin, annee] = diffMonthMatch;
      const moisDebutNum = moisMap[moisDebut.toLowerCase()];
      const moisFinNum = moisMap[moisFin.toLowerCase()];
      
      if (moisDebutNum && moisFinNum) {
        const dateDebut = `${annee}-${moisDebutNum}-${jourDebut.padStart(2, '0')}`;
        const dateFin = `${annee}-${moisFinNum}-${jourFin.padStart(2, '0')}`;
        return { dateDebut, dateFin };
      }
    }

    // Pattern 3: "Du 26 octobre au 16 novembre 2026" (mois différents)
    // Déjà couvert par Pattern 2

    return { dateDebut: null, dateFin: null };
  } catch (error) {
    console.error('Erreur lors du parsing de la date:', error);
    return { dateDebut: null, dateFin: null };
  }
}
