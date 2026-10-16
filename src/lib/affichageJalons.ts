import { BUDGET_CPF, arrondirPoidsAffichage, dureeLigne } from "@/lib/jalonsPonderes";
import type { chargerCalculJalons } from "@/lib/jalonsPedagogiques";
import type { PreuvesJalons } from "@/lib/preuvesJalons";

type Calcul = Awaited<ReturnType<typeof chargerCalculJalons>>;
export const formatDureeJalon = (minutes: number) => {
  const arrondi = Math.round(minutes);
  return `${Math.floor(arrondi / 60)}h${String(arrondi % 60).padStart(2, "0")}`;
};
export const EXPLICATION_JALONS = "Poids : part du jalon dans la formation. Progression (avancement) : activités réellement réalisées par l’élève — un module validé compte 100 %, les mauvaises réponses comptent comme faites ; le score de bonnes réponses n’entre jamais dans les jalons. Contribution : poids × progression / 100, en points de pourcentage. Les heures CPF et leur couverture sont prévisionnelles, pas un chronomètre ni des heures réellement effectuées.";

/** Présentation uniquement : aucune modification des calculs ou des progressions. */
export function tableauAffichageJalons(calcul: Calcul) {
  const ponderees = calcul.resultat.lignes.filter((l) => l.poids > 0);
  const arrondis = arrondirPoidsAffichage(ponderees.map((l) => l.poids));
  const poids = new Map(ponderees.map((l, i) => [l.moduleId, arrondis[i]]));
  const lignes = calcul.resultat.lignes.map((l) => {
    const minutesCpf = dureeLigne(calcul.durees, l.moduleId, l.poids);
    return { ...l, poidsAffiche: poids.get(l.moduleId) ?? 0, minutesCpf, minutesCouvertes: minutesCpf * l.progression / 100 };
  });
  return { lignes, totalMinutes: BUDGET_CPF[calcul.filiere].total, minutesCouvertes: lignes.reduce((s, l) => s + l.minutesCouvertes, 0), taux: calcul.resultat.taux, contributionBrute: lignes.reduce((s, l) => s + l.contribution, 0) };
}

export function heuresEnregistreesJalons(calcul: Calcul, preuves?: PreuvesJalons | null) {
  const enLigneLisible = !!preuves && ["connexions", "activites", "reponses", "quiz"].every((cle) => preuves.sources.some((s) => s.cle === cle && s.lu));
  const enLigne = enLigneLisible ? preuves?.minutesConnexionRetenues ?? null : null;
  const pratique = calcul.pratique.minutes; // Non plafonnée : présence signée + heures validées par l’admin, pas durée CPF.
  return { enLigne, pratique, total: enLigne == null ? null : enLigne + pratique };
}