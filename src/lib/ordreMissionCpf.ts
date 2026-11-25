/** Ordre de mission CPF complémentaire au contrat-cadre intervenant : aperçu seul, jamais envoyé ni signé ici. */
export const TARIF_HORAIRE_TTC = 50;

export interface BlocAgenda { semaine_debut: string; jour: number; heure_debut: string; heure_fin: string; formation: string | null; discipline_nom: string | null }
export interface CreneauMission { date: string; debut: string; fin: string; formation: string; minutes: number; etat: "realise_emarge" | "prevu_futur" | "prevu_non_prouve" }

const ajouterJours = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const minutes = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); };

/** jour = index depuis le lundi de semaine_debut (0 = lundi). Réalisé seulement si émargement formateur signé ce jour. */
export function creneauxMission(blocs: BlocAgenda[], joursEmarges: string[], aujourdhui: string): CreneauMission[] {
  const emarges = new Set(joursEmarges);
  return blocs.map((b) => {
    const date = ajouterJours(b.semaine_debut, b.jour);
    const etat = emarges.has(date) ? "realise_emarge" : date > aujourdhui ? "prevu_futur" : "prevu_non_prouve";
    return { date, debut: b.heure_debut.slice(0, 5), fin: b.heure_fin.slice(0, 5), formation: b.formation || "—", minutes: Math.max(0, minutes(b.heure_fin) - minutes(b.heure_debut)), etat } as CreneauMission;
  }).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
}

export function montantTtc(minutesTotal: number) { return Math.round((minutesTotal / 60) * TARIF_HORAIRE_TTC * 100) / 100; }

export interface EntreesOrdre {
  contratPrestataireSigne: boolean; contratCentreSigne: boolean;
  financementCpfConfirme: boolean; referenceDossierCpf?: string | null;
  ndaPrestataire?: string | null; habilitationRequise: boolean; habilitationPreuve?: string | null;
  creneaux: CreneauMission[];
}

/** Liste des blocages : vide = ordre préparable pour signature des deux parties (jamais conforme Qualiopi automatiquement). */
export function blocagesOrdre(e: EntreesOrdre): string[] {
  const b: string[] = [];
  if (!e.contratPrestataireSigne) b.push("Contrat-cadre non signé par le prestataire");
  if (!e.contratCentreSigne) b.push("Contrat-cadre non signé par SERVICES PRO");
  if (!e.creneaux.length) b.push("Aucun créneau réel au planning");
  if (!e.financementCpfConfirme) b.push("Financement CPF non confirmé pour la session");
  if (!e.referenceDossierCpf) b.push("Référence de dossier CPF/EDOF absente");
  if (!e.ndaPrestataire) b.push("NDA du prestataire non vérifié (à fournir ou mention d'exonération à justifier)");
  if (e.habilitationRequise && !e.habilitationPreuve) b.push("Habilitation requise sans preuve");
  return b;
}

export const CLAUSES_ORDRE = [
  "Le présent ordre de mission complète le contrat-cadre de prestation de formation signé par les deux parties ; en cas de contradiction, le contrat-cadre prévaut.",
  "Rémunération : 50 € TTC par heure effectivement réalisée et émargée ; aucune heure prévue non émargée n'est facturable.",
  "Interdiction de re-sous-traiter tout ou partie de la mission sans accord écrit préalable de SERVICES PRO.",
  "Le prestataire applique le programme, les modalités d'évaluation et les exigences qualité (Qualiopi) de SERVICES PRO, fait émarger les stagiaires et signe sa propre feuille de présence.",
  "Action financée par le CPF : SERVICES PRO reste seul titulaire de l'action vis-à-vis de la Caisse des Dépôts et du stagiaire.",
  "Prise d'effet uniquement à la signature datée des deux parties ; aucune signature n'est antidatée.",
];
