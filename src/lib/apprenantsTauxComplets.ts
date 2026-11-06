import { chargerCandidatModules } from "@/hooks/useCandidatModules";
import { chargerApprenantTauxRealisation } from "@/hooks/useApprenantTauxRealisation";
import { chargerTauxPresenceHeures } from "@/components/crm/TauxPresenceSessionsCard";
import { regleSuiviFormation } from "@/lib/suiviFormationIndicateurs";
import { tauxTotalPresence } from "@/lib/tauxTotalPresence";

export interface ApprenantTauxComplet {
  id: string;
  prenom: string | null;
  nom: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  tauxJalons: number | null;
  tauxTotal: number | null;
  complet: boolean;
  erreur: boolean;
}

/** Critere demande : 100 % de jalons OU au moins 100 % au total. */
export function estApprenantTauxComplet(tauxJalons: number | null, tauxTotal: number | null) {
  return (tauxJalons !== null && tauxJalons >= 100) || (tauxTotal !== null && tauxTotal >= 100);
}

/** Affichage seul : le retrait de liste ne change jamais le dossier ni ses preuves. */
export function apprenantsCompletsVisibles<T extends { id: string; complet: boolean }>(rows: readonly T[], retires: readonly string[]) {
  const masques = new Set(retires);
  return rows.filter((row) => row.complet && !masques.has(row.id));
}

/** Reprend le meme assemblage que les quatre indicateurs de la fiche apprenant. */
export async function chargerTauxCompletApprenant(apprenant: {
  id: string;
  prenom: string | null;
  nom: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
}): Promise<ApprenantTauxComplet> {
  try {
    const regle = regleSuiviFormation(apprenant);
    const [modules, tauxBrut, presence] = await Promise.all([
      chargerCandidatModules(apprenant.id),
      chargerApprenantTauxRealisation(apprenant.id, apprenant),
      regle.filiere ? chargerTauxPresenceHeures(apprenant.id, regle.filiere) : Promise.resolve(null),
    ]);
    if (!tauxBrut) throw new Error("Taux total indisponible");

    const tauxJalons = modules.etat === "ok" && modules.total > 0
      ? Math.round((modules.termines / modules.total) * 100)
      : null;
    let tauxTotal = tauxBrut.pctTotal;
    if (tauxBrut.totalParSignatures) {
      const total = tauxTotalPresence(presence);
      tauxTotal = total ? total.pct : null;
    }

    return {
      ...apprenant,
      tauxJalons,
      tauxTotal,
      complet: estApprenantTauxComplet(tauxJalons, tauxTotal),
      erreur: false,
    };
  } catch {
    return { ...apprenant, tauxJalons: null, tauxTotal: null, complet: false, erreur: true };
  }
}
