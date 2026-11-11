export type Zone = "charges" | "produits" | "actif" | "passif";
export const JEU_GESTION_ID = "jeu_gestion_classement_comptable_v1";
export const ZONES: { id: Zone; titre: string; sousTitre: string }[] = [
  { id: "charges", titre: "Charges", sousTitre: "Compte de résultat" },
  { id: "produits", titre: "Produits", sousTitre: "Compte de résultat" },
  { id: "actif", titre: "Actif", sousTitre: "Bilan · immobilisé ou circulant" },
  { id: "passif", titre: "Passif", sousTitre: "Bilan · capitaux propres ou dettes" },
];
export type Carte = { id: string; titre: string; zone: Zone; categorie: string; explication: string };
export const CARTES: Carte[] = [
  { id: "essence", titre: "Essence consommée", zone: "charges", categorie: "Charge d’exploitation", explication: "Le carburant consommé pour l’activité est une charge de l’exercice, et non une immobilisation." },
  { id: "entretien", titre: "Entretien du véhicule", zone: "charges", categorie: "Charge d’exploitation", explication: "Il s’agit d’un entretien courant, sans amélioration durable ni remplacement immobilisable." },
  { id: "telephone-charge", titre: "Téléphone acheté · faible valeur", zone: "charges", categorie: "Charge d’exploitation", explication: "Dans cette hypothèse, le traitement en charge est applicable et l’entreprise a choisi de comptabiliser cet achat en charge. Ce n’est pas une règle automatique pour tout téléphone." },
  { id: "abonnement", titre: "Abonnement téléphone", zone: "charges", categorie: "Charge d’exploitation", explication: "L’abonnement consommé pendant l’exercice est un service, donc une charge, distincte de l’achat du téléphone." },
  { id: "comptable", titre: "Expert-comptable", zone: "charges", categorie: "Charge d’exploitation", explication: "Les honoraires de l’expert-comptable pour l’exercice constituent une charge de services extérieurs." },
  { id: "cfe", titre: "CFE", zone: "charges", categorie: "Impôt et taxe", explication: "La cotisation foncière des entreprises due au titre de l’exercice est une charge. Une CFE non payée serait aussi une dette fiscale au bilan : ici, la carte désigne la charge." },
  { id: "remuneration", titre: "Rémunération", zone: "charges", categorie: "Charge de personnel", explication: "On suppose une rémunération de personnel ou de dirigeant comptabilisée en charge par une société. Un prélèvement personnel de l’entrepreneur individuel n’est pas assimilé à un salaire." },
  { id: "cotisations", titre: "Cotisations sociales", zone: "charges", categorie: "Charge sociale", explication: "Les cotisations sociales à la charge de la société sont des charges de l’exercice. Les sommes restant à payer formeraient des dettes sociales distinctes." },
  { id: "dotation", titre: "Dotation aux amortissements", zone: "charges", categorie: "Charge calculée", explication: "La dotation annuelle constate la consommation du bien : elle réduit le résultat sans être un paiement annuel. Les amortissements cumulés diminuent la valeur brute à l’actif, pas les dettes au passif." },
  { id: "ca", titre: "Chiffre d’affaires", zone: "produits", categorie: "Produit d’exploitation", explication: "Les prestations réalisées pendant l’exercice génèrent du chiffre d’affaires, même si certains clients n’ont pas encore payé. Le produit n’est pas le solde bancaire." },
  { id: "vehicule", titre: "Véhicule immobilisé · valeur nette", zone: "actif", categorie: "Actif immobilisé", explication: "Le véhicule utilisé durablement figure à l’actif immobilisé. Sa valeur nette comptable est sa valeur brute moins ses amortissements cumulés." },
  { id: "telephone-actif", titre: "Téléphone immobilisé", zone: "actif", categorie: "Actif immobilisé", explication: "Autre hypothèse, indépendante du téléphone de faible valeur : ce téléphone est utilisé durablement et comptabilisé en immobilisation. Il figure à l’actif pour sa valeur nette." },
  { id: "creances", titre: "Créances clients", zone: "actif", categorie: "Actif circulant", explication: "Il s’agit des sommes que les clients doivent à l’entreprise pour des prestations déjà facturées : un droit à encaisser, pas une dette fournisseur." },
  { id: "stocks", titre: "Stocks à la clôture", zone: "actif", categorie: "Actif circulant", explication: "Les biens encore détenus en stock à la clôture figurent à l’actif. Cette carte ne désigne ni les achats consommés ni la variation de stocks du compte de résultat." },
  { id: "banque", titre: "Banque · solde positif", zone: "actif", categorie: "Actif circulant · disponibilités", explication: "L’argent disponible sur un compte bancaire positif figure à l’actif. Un découvert bancaire serait une dette : ce n’est pas l’hypothèse de cette carte." },
  { id: "capital", titre: "Capital", zone: "passif", categorie: "Capitaux propres", explication: "Les apports des associés financent l’entreprise et figurent dans les capitaux propres au passif. Le capital n’est pas une dette fournisseur ou un emprunt." },
  { id: "resultat", titre: "Résultat de l’exercice · bénéfice", zone: "passif", categorie: "Capitaux propres", explication: "Au bilan avant affectation, le bénéfice de l’exercice augmente les capitaux propres. Une perte les réduirait. Ce n’est pas du chiffre d’affaires ni une dette." },
  { id: "emprunt", titre: "Emprunts · capital restant dû", zone: "passif", categorie: "Dettes financières", explication: "Le capital restant dû à la banque est une dette au passif. Les intérêts sont des charges distinctes ; le remboursement du capital n’est pas une charge." },
  { id: "fournisseurs", titre: "Dettes fournisseurs", zone: "passif", categorie: "Dettes d’exploitation", explication: "Ce sont les factures fournisseurs restant à payer à la date du bilan, distinctes des créances sur les clients." },
];
export const AMORTISSEMENT = { brut: 20000, duree: 5, annees: 3, annuel: 4000, cumule: 12000, net: 8000 };
// Exemple indépendant des cartes et du véhicule du mini-calcul. Toutes les valeurs d’actif sont nettes.
export const BILAN_EXEMPLE = {
  actif: [{ libelle: "Véhicule (net)", montant: 6000 }, { libelle: "Téléphone (net)", montant: 200 }, { libelle: "Créances clients", montant: 15000 }, { libelle: "Stocks", montant: 0 }, { libelle: "Banque", montant: 18800 }],
  passif: [{ libelle: "Capital", montant: 20000 }, { libelle: "Résultat de l’exercice", montant: 20000 }, { libelle: "Emprunts", montant: 0 }, { libelle: "Dettes fournisseurs", montant: 0 }],
};
export const totalBilan = (lignes: { montant: number }[]) => lignes.reduce((s, l) => s + l.montant, 0);
export const euro = (n: number) => `${n.toLocaleString("fr-FR")} €`;
export type Progression = { placements: Record<string, Zone>; premiers: Record<string, Zone>; calcul: boolean };
export const progressionVide = (): Progression => ({ placements: {}, premiers: {}, calcul: false });
export function lireProgression(raw: Record<string, unknown>): Progression {
  const lire = (value: unknown, justes: boolean) => Object.fromEntries(CARTES.flatMap(c => {
    const v = value && typeof value === "object" ? (value as Record<string, unknown>)[c.id] : null;
    return ZONES.some(z => z.id === v) && (!justes || v === c.zone) ? [[c.id, v as Zone]] : [];
  }));
  return { placements: lire(raw.placements, true), premiers: lire(raw.premiers, false), calcul: raw.calcul === true };
}
export const scoreClassement = (p: Progression) => CARTES.filter(c => p.premiers[c.id] === c.zone).length;
export const jeuTermine = (p: Progression) => CARTES.every(c => p.placements[c.id] === c.zone) && p.calcul;
export function placer(p: Progression, id: string, zone: Zone): Progression {
  const c = CARTES.find(c => c.id === id);
  if (!c || p.placements[id]) return p;
  return { ...p, premiers: { ...p.premiers, [id]: p.premiers[id] ?? zone }, placements: c.zone === zone ? { ...p.placements, [id]: zone } : p.placements };
}
export function calculCorrect(values: string[]): boolean {
  return values.length === 3 && values.every((v, i) => {
    const normalized = v.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
    return /^\d+(?:\.\d+)?$/.test(normalized) && Number(normalized) === [4000, 12000, 8000][i];
  });
}
export function afficherJeuGestion(moduleId: number, coursTitre?: string): boolean {
  return [14, 20].includes(moduleId) || ([2, 10].includes(moduleId) && /(?:^|\b)gestion(?:\b|$)/i.test(coursTitre ?? ""));
}