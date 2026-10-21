/** New immutable activity version; never used to replace existing course questions. */
export const VERSION_TAXI = "2026-v1";
export const IDS_TAXI = ["jeu_taxi_2026_feries_v1", "jeu_taxi_2026_tarifs_v1", "jeu_taxi_2026_rtst_v1"] as const;
export const SOURCE_RHONE = {
  numero: "69-2026-02-19-00002", date: "19 février 2026",
  url: "https://www.rhone.gouv.fr/contenu/telechargement/67519/454692/file/Arr%C3%AAt%C3%A9%20reglementant%20les%20tarifs%20taxis%20dans%20le%20d%C3%A9partement%20du%20Rh%C3%B4ne%202026.pdf",
  miroir: "https://www.taxis-de-france.com/arretesprefectoraux/2026/69.pdf",
};
export const FERIES_2026 = [
  { id: "f01", date: "2026-01-01", nom: "Jour de l’An" },
  { id: "f02", date: "2026-04-06", nom: "Lundi de Pâques" },
  { id: "f03", date: "2026-05-01", nom: "Fête du Travail" },
  { id: "f04", date: "2026-05-08", nom: "Victoire de 1945" },
  { id: "f05", date: "2026-05-14", nom: "Ascension" },
  { id: "f06", date: "2026-05-25", nom: "Lundi de Pentecôte" },
  { id: "f07", date: "2026-07-14", nom: "Fête nationale" },
  { id: "f08", date: "2026-08-15", nom: "Assomption" },
  { id: "f09", date: "2026-11-01", nom: "Toussaint" },
  { id: "f10", date: "2026-11-11", nom: "Armistice de 1918" },
  { id: "f11", date: "2026-12-25", nom: "Noël" },
] as const;

export const ATTENTE_MAX = 41.3;
export const attenteEuros = (minutes: number) => Math.round((ATTENTE_MAX / 60 * minutes + Number.EPSILON) * 100) / 100;
export function tarifRhône(nuit: boolean, ferieOuDimanche: boolean, retourCharge: boolean, neigeEffective = false, equipement = false): "A" | "B" | "C" | "D" {
  const majore = nuit || ferieOuDimanche || (neigeEffective && equipement);
  return retourCharge ? (majore ? "B" : "A") : (majore ? "D" : "C");
}
export const supplementPassagers = (passagers: number) => Math.max(0, passagers - 4) * 4;
export const supplementBagages = (bagagesParPassager: readonly number[], exterieursDistincts = 0) =>
  (bagagesParPassager.reduce((s, n) => s + Math.max(0, n - 3), 0) + exterieursDistincts) * 2;
export const reservationEuros = (type: "helee" | "immediate" | "avance", dansZupc: boolean | null): number | null =>
  type === "helee" ? 0 : dansZupc === null ? null : !dansZupc ? 0 : type === "immediate" ? 2 : 4;
export const minimumCourse = (compteurEtSupplements: number) => Math.max(8, compteurEtSupplements);
export const estNuit = (heure: number) => heure >= 19 || heure < 7;
export const evaluationConditionnelle = (_saisie: string) => ({ penalite: 0, statut: "hypothèses à comparer" });

export interface QuestionTarif { id: string; enonce: string; choix: string[]; correct: number; justification: string; source: string }
const q = (n: number, enonce: string, choix: string[], correct: number, justification: string, source = "Art. 4, p. 2–3") : QuestionTarif => ({ id: `t${String(n).padStart(2,"0")}`, enonce, choix, correct, justification, source });
export const QUESTIONS_TARIFS: QuestionTarif[] = [
  q(1,"Jour ordinaire, retour en charge à la station : quel tarif ?",["A","B","C","D"],0,"A : jour et retour en charge."),
  q(2,"Nuit, retour en charge à la station : quel tarif ?",["A","B","C","D"],1,"B : nuit et retour en charge."),
  q(3,"Jour ordinaire, retour à vide à la station : quel tarif ?",["A","B","C","D"],2,"C : jour et retour à vide."),
  q(4,"Nuit, retour à vide à la station : quel tarif ?",["A","B","C","D"],3,"D : nuit et retour à vide."),
  q(5,"Dimanche à 14 h, retour en charge : quel tarif ?",["A","B","C","D"],1,"Dimanche : B avec retour en charge, même en journée."),
  q(6,"14 juillet à 16 h, retour à vide : quel tarif ?",["A","B","C","D"],3,"Jour férié : D avec retour à vide."),
  q(7,"Quelles sont les heures de nuit ?",["19 h–7 h","20 h–8 h","22 h–6 h"],0,"L’arrêté fixe la nuit de 19 h à 7 h."),
  q(8,"À 7 h précises, en semaine ordinaire, quelle période commence ?",["Jour","Nuit","Dimanche"],0,"Le jour commence à 7 h, hors autres motifs de majoration."),
  q(9,"À 19 h précises, quelle période commence ?",["Jour","Nuit","Aucun changement"],1,"La nuit commence à 19 h."),
  q(10,"Réservation immédiate, prise en charge DANS la ZUPC : supplément ?",["0 €","2 €","4 €"],1,"2 € ; la prise en charge doit être dans la ZUPC.","Art. 6 §3, p. 4"),
  q(11,"Réservation à date et heure données DANS la ZUPC : supplément ?",["0 €","2 €","4 €"],2,"Réservation à l’avance : 4 €.","Art. 6 §3, p. 4"),
  q(12,"Taxi hélé ou pris en station, sans réservation : supplément réservation ?",["0 €","2 €","4 €"],0,"Pas de réservation : pas de supplément réservation.","Art. 6 et 8, p. 4"),
  q(13,"Prise en charge HORS ZUPC : suppléments réservation 2 €/4 € ?",["Toujours","Ne s’appliquent pas","Doublés"],1,"Les suppléments réservations ne s’appliquent pas ; règles d’approche distinctes.","Art. 8 §2 b, p. 5"),
  q(14,"À quel moment démarrer le compteur pour une réservation immédiate dans la ZUPC ?",["Lors de l’appel","À l’arrivée à l’adresse du client","Après 10 minutes"],1,"Le compteur est enclenché lorsque le taxi arrive à l’adresse du client.","Art. 6 §3, p. 4"),
  q(15,"Pour une réservation à l’avance dans la ZUPC, le compteur démarre…",["À l’heure réservée et à l’adresse du client","Dès la commande","À la station précédente"],0,"Les deux conditions sont indiquées par l’arrêté.","Art. 6 §3, p. 4"),
  q(16,"Supplément pour 5 passagers, majeurs ou mineurs ?",["0 €","4 €","8 €"],1,"4 € pour le cinquième passager.","Art. 6 §1, p. 3"),
  q(17,"Supplément pour 6 passagers ?",["4 €","8 €","12 €"],1,"2 passagers au-delà de quatre × 4 € = 8 €.","Art. 6 §1, p. 3"),
  q(18,"Un enfant compte-t-il pour le supplément à partir du cinquième passager ?",["Oui","Non","Seulement après 12 ans"],0,"L’arrêté vise chaque passager, majeur ou mineur.","Art. 6 §1, p. 3"),
  q(19,"Un seul passager avec 5 valises de taille équivalente, toutes intérieures : supplément ?",["0 €","2 €","4 €"],2,"Au-delà de 3 par passager : (5−3) × 2 € = 4 €.","Art. 6 §2, p. 4"),
  q(20,"Deux passagers ayant chacun 3 valises intérieures : supplément bagages ?",["0 €","6 €","12 €"],0,"Le seuil est de trois PAR PASSAGER, pas trois pour le véhicule.","Art. 6 §2, p. 4"),
  q(21,"Une malle qui nécessite un équipement extérieur : supplément ?",["0 €","2 €","4 €"],1,"2 € par encombrant nécessitant un équipement extérieur ; ne pas compter deux fois le même bagage.","Art. 6 §2, p. 4"),
  q(22,"Maximum horaire d’attente pour les quatre tarifs ?",["41,30 €","35 €","50 €"],0,"41,30 €/h pour A, B, C et D.","Art. 3–4, p. 2–3"),
  q(23,"15 minutes d’attente au maximum horaire : montant arrondi ?",["10,33 €","15 €","6,88 €"],0,"41,3 / 60 × 15 = 10,325 €, arrondi à 10,33 €.","Art. 3, p. 2"),
  q(24,"45 minutes d’attente au maximum horaire : montant arrondi ?",["30,98 €","41,30 €","10,33 €"],0,"41,3 / 60 × 45 = 30,975 €, arrondi à 30,98 €.","Art. 3, p. 2"),
  q(25,"10 minutes d’attente au maximum horaire : montant arrondi ?",["6,88 €","8 €","10,33 €"],0,"41,3 / 60 × 10 = 6,8833… €, arrondi à 6,88 €.","Art. 3, p. 2"),
  q(26,"Minimum d’une course, suppléments compris ?",["8 €","8 € + tous les suppléments","10 €"],0,"Le minimum est 8 € SUPPLÉMENTS INCLUS.","Art. 5, p. 3"),
  q(27,"Neige : quelles conditions cumulatives justifient la majoration ?",["Routes effectivement enneigées/verglacées ET équipements spéciaux ou pneus hiver utilisés","Pneus hiver seuls","Prévision météo de neige"],0,"Les deux conditions doivent être remplies."),
  q(28,"Peut-on cumuler la majoration neige et la majoration nuit ?",["Oui","Non","Seulement dimanche"],1,"La majoration neige ne se cumule pas avec celle de nuit."),
  q(29,"Changement de tarif pendant une course : que faut-il faire ?",["Le signaler au client","Ne rien dire","Terminer la course"],0,"Tout changement de tarif pendant la course doit être signalé au client.","Art. 8 §1, p. 4"),
  q(30,"Les montants du tableau préfectoral sont-ils des maxima ?",["Oui","Non, obligatoirement le prix pratiqué","Seulement l’attente"],0,"Le tableau présente les tarifs maximaux ; le tarif pratiqué et le compteur peuvent être inférieurs."),
];

export interface ScenarioRTST { id: string; titre: string; texte: string; r: string; tarif: string; s: string; minutes: number; justification: string; conditionnel: boolean }
const ORDINAIRE = " Sans autre date ou heure précisée : journée ordinaire de semaine, hors jour férié, entre 7 h et 19 h.";
const ZONE = "Réservation : 4 € à l’avance ou 2 € immédiate uniquement si la prise en charge est dans la ZUPC ; sinon aucun supplément réservation (approche distincte).";
export const SCENARIOS_RTST: ScenarioRTST[] = [
  { id:"s01", titre:"Mairie du 2e", texte:"Le client a appelé hier. Départ du 66 rue Smith à 13 h, destination 2 rue d’Enghien, 69002 Lyon (Mairie du 2e). Attente de 15 minutes, puis retour avec le client. Les routes sont enneigées. Sans date précisée : journée ordinaire de semaine hors jour férié.", r:"4 € sous condition ZUPC",tarif:"B si neige effective ET équipements ; sinon A",s:"0 € (aucun supplément décrit)",minutes:15,conditionnel:true,justification:`Art. 4 p. 3 : neige et équipements cumulativement nécessaires, retour en charge. ${ZONE}` },
  { id:"s02", titre:"Commissariat du 2e",texte:"Le 14 juillet à 16 h, course réservée hier. Départ du 47 rue de la Charité, 69002 Lyon (Commissariat du 2e), arrivée au 66 rue Smith. Le client transporte 5 valises. Aucun retour avec le client ni temps d’attente n’est indiqué : hypothèse d’un retour à vide à la station.",r:"4 € sous condition ZUPC",tarif:"D si retour à vide ; B si retour en charge",s:"4 € si les 5 valises appartiennent à un seul passager",minutes:0,conditionnel:true,justification:"14 juillet férié. Art. 6 §2 p. 4 : seuil 3 valises PAR PASSAGER. Hypothèse d’un passager : (5−3) × 2 = 4 €. Plusieurs passagers : répartition à préciser." },
  { id:"s03",titre:"Musée des Tissus",texte:"À 18 h 30, un client hèle le taxi rue Smith pour aller au Musée des Tissus, 34 rue de la Charité, 69002 Lyon. Attente de 45 minutes puis retour avec le client. Sans date : journée ordinaire de semaine hors jour férié.",r:"0 €",tarif:"A avant 19 h ; B sur la partie nocturne",s:"0 € (aucun supplément décrit)",minutes:45,conditionnel:true,justification:"Art. 4 et art. 8 §1 : horaires 19 h–7 h, changement annoncé au client. L’heure exacte d’arrivée est inconnue : ne pas inventer la répartition kilométrique, ni appliquer une double majoration à l’attente." },
  { id:"s04",titre:"Hôtel Boscolo",texte:"À 4 h 30, appel pour une course immédiate de 5 personnes au départ de l’Hôtel Boscolo, 11 quai Jules Courmont, 69002 Lyon, vers le 66 rue Smith. Aucun retour avec le client ni temps d’attente n’est indiqué : hypothèse d’un retour à vide à la station.",r:"2 € sous condition ZUPC",tarif:"D si retour à vide ; B si retour en charge",s:"4 €",minutes:0,conditionnel:true,justification:"Nuit. Art. 6 §1 : (5−4) × 4 = 4 €. Le retour à vide est une hypothèse, pas une donnée inventée." },
  { id:"s05",titre:"Palais de Justice",texte:"À la station rue Smith, une personne aveugle accompagnée de son chien guide et d’une accompagnatrice souhaite aller au Palais de Justice, 1 rue du Palais de Justice, 69005 Lyon. Attente de 10 minutes, puis retour avec l’accompagnatrice."+ORDINAIRE,r:"0 €",tarif:"A",s:"0 € attendu ; chien guide : source nationale à vérifier",minutes:10,conditionnel:true,justification:"Retour en charge avec l’accompagnatrice. Le chien n’est pas un cinquième passager. L’arrêté tarifaire ne mentionne pas explicitement le chien guide : pas de supplément inventé, réponse raisonnable non pénalisée." },
  { id:"s06",titre:"Cathédrale Saint-Jean",texte:"Course réservée hier pour 6 h 55. Départ de la Cathédrale Saint-Jean, place Saint-Jean, 69005 Lyon, vers le 66 rue Smith. Une malle est transportée sur la galerie. Aucun retour avec le client ni temps d’attente n’est indiqué : hypothèse d’un retour à vide. Sans date : jour ordinaire de semaine hors jour férié.",r:"4 € sous condition ZUPC",tarif:"D avant 7 h ; C après 7 h si la course continue",s:"2 € si la malle nécessite un équipement extérieur",minutes:0,conditionnel:true,justification:"Art. 6 §2 a : nécessité d’un équipement extérieur, pas simple choix de placer un bagage sur la galerie. Art. 8 : changement annoncé au client ; ne pas inventer la durée du trajet." },
  { id:"s07",titre:"Halle Tony Garnier",texte:"À la station du 66 rue Smith, un client demande la Halle Tony Garnier, 20 place Charles-et-Christophe-Mérieux, 69007 Lyon. Attente de 10 minutes, puis retour avec 4 enfants et 4 valises. Le corrigé suppose que le client initial revient aussi : 5 passagers au retour ; cette présence doit être confirmée."+ORDINAIRE,r:"0 €",tarif:"A",s:"4 € si client initial + 4 enfants ; bagages selon répartition",minutes:10,conditionnel:true,justification:"Les enfants comptent. Si 4 enfants seuls : pas de cinquième passager. Quatre valises réparties entre passagers : pas de supplément automatique ; si 4 valises de même taille pour un seul passager : +2 €. Ne pas taxer globalement au-delà de trois valises du véhicule." },
  { id:"s08",titre:"Palais des Sports",texte:"Appel immédiat. 5 personnes au départ du 66 rue Smith vers le Palais des Sports, 350 avenue Jean-Jaurès, 69007 Lyon. Attente de 10 minutes, puis retour du client seul avec 4 valises."+ORDINAIRE,r:"2 € sous condition ZUPC",tarif:"A",s:"4 € passager à l’aller + 2 € si 4 valises taxables du client au retour",minutes:10,conditionnel:true,justification:"Art. 6 §1–2 : 4 € cinquième passager ; (4−3) × 2 = 2 € pour les valises de taille équivalente du seul client. Hypothèse de suppléments distincts de la même course, sans double compter des bagages." },
  { id:"s09",titre:"Matmut Stadium",texte:"Appel immédiat. Départ du Matmut Stadium, 353 avenue Jean-Jaurès, 69007 Lyon, arrivée rue Smith. Le client transporte 1 sac à main et 4 sacs de sport. Aucun retour avec le client ni temps d’attente n’est indiqué : hypothèse d’un retour à vide à la station."+ORDINAIRE,r:"2 € sous condition ZUPC",tarif:"C si retour à vide ; A si retour en charge",s:"2 € si les 4 sacs de sport sont de taille équivalente à des valises",minutes:0,conditionnel:true,justification:"Le sac à main n’est pas automatiquement de taille équivalente à une valise. Pour un passager, quatre sacs taxables : (4−3) × 2 = 2 €. Sinon pas de supplément automatique." },
  { id:"s10",titre:"Carnegie Hall",texte:"À 23 h 55, 5 musiciens hèlent le taxi rue Smith pour aller au Carnegie Hall, 253 rue Marcel-Mérieux, 69007 Lyon. Ils transportent 3 instruments, 3 valises et 2 sacs. Attente de 45 minutes, puis retour avec les musiciens.",r:"0 €",tarif:"B",s:"4 € passager + éventuels encombrants selon dimensions/répartition",minutes:45,conditionnel:true,justification:"Retour en charge de nuit. (5−4) × 4 = 4 €. Huit objets ne donnent pas automatiquement cinq suppléments : seuil par passager, taille équivalente et équipement extérieur à vérifier. Si aucun équipement nécessaire et répartition sous seuil : bagages 0 €." },
  { id:"s11",titre:"Mairie de La Mulatière",texte:"Course réservée la veille pour 6 h 30. Départ de la Mairie de La Mulatière, 1 place Jean-Moulin, 69350 La Mulatière, arrivée à l’Hôtel de Région. Le client a une valise et un fauteuil roulant pliable. Aucun retour avec le client ni attente indiqué : hypothèse retour à vide. Sans date : journée de semaine hors férié.",r:"4 € si prise en charge ZUPC ; sinon 0 € (zone à confirmer)",tarif:"D avant 7 h ; C après 7 h si course continue",s:"0 € attendu ; fauteuil : source nationale à vérifier",minutes:0,conditionnel:true,justification:"L’arrêté 2026 renvoie au périmètre ZUPC de 2018 sans le reproduire. Ne pas déclarer La Mulatière dedans/dehors sans preuve. Une valise sous seuil ; aucun supplément fauteuil inventé." },
  { id:"s12",titre:"Mairie d’Oullins",texte:"Course réservée la veille pour 7 h. Départ de la Mairie d’Oullins, place Valmy, 69600 Oullins, arrivée au 66 rue Smith. Le client a une valise et 3 cartons. Aucun retour avec le client ni attente indiqué : hypothèse retour à vide. Sans date : journée ordinaire de semaine hors jour férié.",r:"4 € si prise en charge ZUPC ; sinon 0 € (zone à confirmer)",tarif:"C si retour à vide ; A si retour en charge",s:"2 € si valise + 3 cartons tous de taille équivalente, pour un seul passager",minutes:0,conditionnel:true,justification:"7 h = jour. Bagages : (4−3) × 2 = 2 € sous l’hypothèse de cartons taxables ; sinon 0 € ou encombrants extérieurs distincts selon nécessité. Ne pas corriger silencieusement l’adresse fournie : destination d’exercice conservée, point exact à confirmer." },
  { id:"s13",titre:"Gare d’Oullins",texte:"À 3 h, appel immédiat. Départ rue Smith vers la Gare d’Oullins, place Valmy, 69600 Oullins. Le client est ivre et transporte une valise. Attente de 15 minutes puis retour avec le client.",r:"2 € sous condition ZUPC",tarif:"B",s:"0 €",minutes:15,conditionnel:true,justification:"Nuit et retour en charge. L’ivresse seule ne crée aucun supplément tarifaire. Évaluer la sécurité sans inventer un droit de refus automatique ; règle de refus spécifique non prouvée ici." },
];
export type SaisiesTaxi = Record<string, string>;
export function champsActivite(id: string): string[] {
  if (id === IDS_TAXI[0]) return FERIES_2026.map(f=>f.id);
  if (id === IDS_TAXI[1]) return QUESTIONS_TARIFS.map(q=>q.id);
  if (id === IDS_TAXI[2]) return SCENARIOS_RTST.flatMap(s=>["r","tarif","s","attente"].map(c=>`${s.id}_${c}`));
  return [];
}
export function saisieComplete(id: string, valeurs: SaisiesTaxi): boolean {
  const champs = champsActivite(id);
  return champs.length > 0 && champs.every(k=>typeof valeurs[k] === "string" && valeurs[k].trim().length > 0);
}