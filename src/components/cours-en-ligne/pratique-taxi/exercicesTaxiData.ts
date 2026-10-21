// Contenus des 3 exercices interactifs du module PRATIQUE TAXI (id 6), ajoutés le 21/10/2026.
// Tarifs vérifiés le 21/10/2026 : arrêté préfectoral n° 69-2026-02-19-00002 du 19/02/2026
// (Rhône), tel que repris par la Métropole de Lyon (mobilites.grandlyon.com) :
// prise en charge 3,10 € ; A 1 €/km, B 1,50 €/km, C 2 €/km, D 3 €/km ; attente/marche lente
// 41,30 €/h ; minimum 8 € ; jour 7h–19h ; nuit 19h–7h, dimanches, jours fériés, routes enneigées ;
// réservation immédiate 2 €, à l'avance 4 € ; 5e passager et suivants 4 € ; bagages 2 € par
// bagage au-delà de 3 bagages par personne ; note obligatoire dès 25 € ; chien guide jamais refusé.

export const SOURCE_TARIFS = "Arrêté préfectoral n° 69-2026-02-19-00002 du 19 février 2026 réglementant les tarifs des taxis dans le Rhône";

export interface QuestionQcm { id: string; question: string; options: string[]; bonne: number; explication: string }

// ── Exercice 1 : 11 jours fériés nationaux 2026 (Rhône : pas de jour férié local supplémentaire)
export interface JourFerie { id: string; nom: string; iso: string; libelle: string }
export const JOURS_FERIES_2026: JourFerie[] = [
  { id: "jour_an", nom: "Jour de l'an", iso: "2026-01-01", libelle: "jeudi 1er janvier 2026" },
  { id: "lundi_paques", nom: "Lundi de Pâques", iso: "2026-04-06", libelle: "lundi 6 avril 2026" },
  { id: "fete_travail", nom: "Fête du Travail", iso: "2026-05-01", libelle: "vendredi 1er mai 2026" },
  { id: "victoire_1945", nom: "Victoire 1945", iso: "2026-05-08", libelle: "vendredi 8 mai 2026" },
  { id: "ascension", nom: "Ascension", iso: "2026-05-14", libelle: "jeudi 14 mai 2026" },
  { id: "lundi_pentecote", nom: "Lundi de Pentecôte", iso: "2026-05-25", libelle: "lundi 25 mai 2026" },
  { id: "fete_nationale", nom: "Fête nationale", iso: "2026-07-14", libelle: "mardi 14 juillet 2026" },
  { id: "assomption", nom: "Assomption", iso: "2026-08-15", libelle: "samedi 15 août 2026" },
  { id: "toussaint", nom: "Toussaint", iso: "2026-11-01", libelle: "dimanche 1er novembre 2026" },
  { id: "armistice", nom: "Armistice 1918", iso: "2026-11-11", libelle: "mercredi 11 novembre 2026" },
  { id: "noel", nom: "Noël", iso: "2026-12-25", libelle: "vendredi 25 décembre 2026" },
];
const LEURRES: Record<string, string[]> = {
  jour_an: ["mercredi 31 décembre 2025", "vendredi 2 janvier 2026", "mardi 6 janvier 2026"],
  lundi_paques: ["dimanche 5 avril 2026", "lundi 13 avril 2026", "lundi 30 mars 2026"],
  fete_travail: ["jeudi 30 avril 2026", "lundi 4 mai 2026", "vendredi 8 mai 2026"],
  victoire_1945: ["jeudi 7 mai 2026", "lundi 11 mai 2026", "vendredi 1er mai 2026"],
  ascension: ["jeudi 7 mai 2026", "jeudi 21 mai 2026", "lundi 25 mai 2026"],
  lundi_pentecote: ["dimanche 24 mai 2026", "lundi 18 mai 2026", "lundi 1er juin 2026"],
  fete_nationale: ["lundi 13 juillet 2026", "mercredi 15 juillet 2026", "samedi 4 juillet 2026"],
  assomption: ["vendredi 14 août 2026", "lundi 17 août 2026", "samedi 1er août 2026"],
  toussaint: ["samedi 31 octobre 2026", "lundi 2 novembre 2026", "mercredi 11 novembre 2026"],
  armistice: ["mardi 10 novembre 2026", "jeudi 12 novembre 2026", "dimanche 1er novembre 2026"],
  noel: ["jeudi 24 décembre 2026", "samedi 26 décembre 2026", "jeudi 31 décembre 2026"],
};
/** Ordre des options figé (déterministe) : la bonne réponse change de position selon l'index. */
export const QUESTIONS_FERIES: QuestionQcm[] = JOURS_FERIES_2026.map((j, i) => {
  const l = LEURRES[j.id];
  const bonne = i % 4;
  const options = [...l]; options.splice(bonne, 0, j.libelle);
  return { id: j.id, question: `Quelle est la date du jour férié « ${j.nom} » en 2026 ?`, options, bonne,
    explication: `${j.nom} : ${j.libelle}. Jour férié → tarif B (retour en charge) ou D (retour à vide) toute la journée.` };
});

// ── Exercice 2 : quiz tarifs (25 questions)
const q = (id: string, question: string, options: string[], bonne: number, explication: string): QuestionQcm => ({ id, question, options, bonne, explication });
export const QUESTIONS_TARIFS: QuestionQcm[] = [
  q("t01", "Quel est le montant de la prise en charge en 2026 dans le Rhône ?", ["3,00 €", "3,10 €", "2,00 €", "4,00 €"], 1, "Prise en charge : 3,10 €, identique pour les quatre tarifs."),
  q("t02", "Quel est le prix du kilomètre au tarif A ?", ["1,00 €", "1,50 €", "2,00 €", "3,00 €"], 0, "Tarif A : 1 €/km."),
  q("t03", "Quel est le prix du kilomètre au tarif B ?", ["1,00 €", "1,50 €", "2,00 €", "3,00 €"], 1, "Tarif B : 1,50 €/km."),
  q("t04", "Quel est le prix du kilomètre au tarif C ?", ["1,00 €", "1,50 €", "2,00 €", "3,00 €"], 2, "Tarif C : 2 €/km."),
  q("t05", "Quel est le prix du kilomètre au tarif D ?", ["1,50 €", "2,00 €", "2,50 €", "3,00 €"], 3, "Tarif D : 3 €/km."),
  q("t06", "Le tarif A correspond à :", ["Jour, retour à vide", "Jour, aller et retour avec le client", "Nuit, retour à vide", "Nuit, retour avec le client"], 1, "A = jour (7h–19h), aller et retour avec le client."),
  q("t07", "Le tarif D correspond à :", ["Jour, retour à vide", "Nuit/dimanche/férié, retour avec le client", "Nuit/dimanche/férié, retour à vide", "Jour, retour avec le client"], 2, "D = nuit, dimanche, jour férié ou routes enneigées, avec retour à vide."),
  q("t08", "Quelles sont les heures du tarif de jour ?", ["6h – 20h", "7h – 19h", "8h – 20h", "7h – 21h"], 1, "Jour : de 7h à 19h ; nuit : de 19h à 7h."),
  q("t09", "Un dimanche à 14h, client déposé, retour à vide : quel tarif ?", ["A", "B", "C", "D"], 3, "Dimanche = tarif de nuit toute la journée ; retour à vide → D."),
  q("t10", "Un mardi ordinaire à 10h, aller-retour avec le client : quel tarif ?", ["A", "B", "C", "D"], 0, "Jour ordinaire, retour avec le client → A."),
  q("t11", "Un jeudi ordinaire à 21h, client déposé, retour à vide : quel tarif ?", ["A", "B", "C", "D"], 3, "Après 19h = nuit ; retour à vide → D."),
  q("t12", "Le 14 juillet à 11h, aller-retour avec le client : quel tarif ?", ["A", "B", "C", "D"], 1, "Jour férié = tarif de nuit ; retour en charge → B."),
  q("t13", "Quel est le supplément pour une réservation immédiate ?", ["0 €", "2 €", "4 €", "8 €"], 1, "Réservation immédiate : 2 €."),
  q("t14", "Quel est le supplément pour une réservation à l'avance ?", ["2 €", "3,10 €", "4 €", "8 €"], 2, "Réservation à l'avance : 4 €."),
  q("t15", "Un client hèle le taxi dans la rue : supplément réservation ?", ["0 €", "2 €", "4 €", "Au choix du chauffeur"], 0, "Client pris à la volée ou en station : aucune réservation, 0 €."),
  q("t16", "Quel est le prix de l'heure d'attente ou de marche lente ?", ["39,47 €", "40,00 €", "41,30 €", "45,00 €"], 2, "Attente / marche lente : 41,30 €/h."),
  q("t17", "Combien coûtent 15 minutes d'attente ?", ["10,33 €", "8,00 €", "12,50 €", "6,88 €"], 0, "41,30 / 60 × 15 = 10,325 → 10,33 €."),
  q("t18", "Combien coûtent 10 minutes d'attente ?", ["4,13 €", "6,88 €", "10,33 €", "8,00 €"], 1, "41,30 / 60 × 10 = 6,883 → 6,88 €."),
  q("t19", "Combien coûtent 45 minutes d'attente ?", ["30,98 €", "27,53 €", "41,30 €", "35,00 €"], 0, "41,30 / 60 × 45 = 30,975 → 30,98 €."),
  q("t20", "Quel est le minimum de perception d'une course ?", ["3,10 €", "5,00 €", "8,00 €", "10,00 €"], 2, "Course minimum : 8,00 €."),
  q("t21", "À partir de quel passager un supplément est-il dû ?", ["Le 4e", "Le 5e", "Le 6e", "Aucun supplément"], 1, "Supplément de 4 € à compter du 5e passager."),
  q("t22", "Combien coûte le supplément par passager à partir du 5e ?", ["2 €", "3 €", "4 €", "5 €"], 2, "4 € par passager à compter du 5e."),
  q("t23", "Quand le supplément bagages s'applique-t-il ?", ["Dès le 1er bagage", "Au-delà de 3 bagages par personne", "Au-delà de 2 bagages par personne", "Jamais"], 1, "2 € par bagage au-delà de 3 bagages par personne."),
  q("t24", "Un client seul a 5 valises : quel supplément bagages ?", ["0 €", "2 €", "4 €", "10 €"], 2, "5 − 3 = 2 bagages au-delà → 2 × 2 € = 4 €."),
  q("t25", "Course de jour, tarif A, 6 km, sans attente ni supplément : quel montant ?", ["6,00 €", "8,00 €", "9,10 €", "12,10 €"], 2, "3,10 + 6 × 1,00 = 9,10 € (supérieur au minimum de 8 €)."),
  q("t26", "Course de jour, tarif A, 3 km : combien le client paie-t-il ?", ["6,10 €", "8,00 €", "3,10 €", "9,00 €"], 1, "3,10 + 3 × 1 = 6,10 € < minimum → 8,00 €."),
  q("t27", "Un chauffeur peut-il refuser un chien guide d'aveugle ?", ["Oui, toujours", "Oui, la nuit", "Non, jamais", "Oui, s'il facture un supplément"], 2, "Refus interdit, et aucun supplément."),
  q("t28", "À partir de quel montant la note est-elle obligatoire ?", ["8 €", "15 €", "25 €", "50 €"], 2, "Note imprimée obligatoire dès 25 € ou à la demande du client."),
];

// ── Exercice 3 : 13 scénarios RTST
export type ChampRtst = "reservation" | "tarif" | "supplements" | "attente";
export const OPTIONS_TARIF = ["A", "B", "C", "D", "A puis B", "B puis A", "C puis D", "D puis C"];
export interface Scenario {
  id: string; titre: string; enonce: string;
  attendu: Record<ChampRtst, string>;          // affiché en rouge dans le corrigé
  acceptes: { reservation: number[]; tarif: string[]; supplements: number[]; attente: number[] };
  justification: Record<ChampRtst, string>;
}
const ATT = (m: number) => Math.round((41.3 / 60) * m * 100) / 100;
const att = (m: number) => `41,3 / 60 × ${m} = ${ATT(m).toFixed(2).replace(".", ",")} €`;
const s = (x: Scenario) => x;

export const SCENARIOS_RTST: Scenario[] = [
  s({ id: "s01", titre: "Mairie du 2e arrondissement",
    enonce: "Un client a appelé hier pour réserver. Départ à 13h du 66 rue Smith, destination 2 rue d'Enghien (69002). Vous l'attendez 15 minutes sur place, puis vous le ramenez. Les routes sont enneigées.",
    attendu: { reservation: "4 €", tarif: "B si les routes enneigées sont reconnues (sinon A)", supplements: "0 €", attente: att(15) },
    acceptes: { reservation: [4], tarif: ["B", "A"], supplements: [0], attente: [ATT(15)] },
    justification: { reservation: "Réservation faite la veille = à l'avance : 4 €.", tarif: "Journée (13h) avec retour en charge → A. L'arrêté autorise le tarif de nuit (B) sur routes enneigées : B seulement si cette condition est réellement remplie, sinon A.", supplements: "Un seul client, pas de bagages au-delà de 3.", attente: att(15) } }),
  s({ id: "s02", titre: "Commissariat du 2e arrondissement",
    enonce: "Le 14 juillet à 16h, un client ayant réservé hier part du 47 rue de la Charité (69002) pour le 66 rue Smith. Il a 5 valises. Vous repartez à vide.",
    attendu: { reservation: "4 €", tarif: "D", supplements: "4 € (2 bagages au-delà de 3 × 2 €)", attente: "0 €" },
    acceptes: { reservation: [4], tarif: ["D"], supplements: [4], attente: [0] },
    justification: { reservation: "Réservé la veille : à l'avance, 4 €.", tarif: "14 juillet = jour férié (tarif de nuit), retour à vide → D.", supplements: "5 − 3 = 2 bagages taxables × 2 € = 4 €.", attente: "Aucune attente." } }),
  s({ id: "s03", titre: "Musée des Tissus",
    enonce: "Un jour ordinaire à 18h30, un client vous hèle rue Smith pour le 34 rue de la Charité (69002). Vous l'attendez 45 minutes, puis vous le ramenez.",
    attendu: { reservation: "0 €", tarif: "A puis B à 19h", supplements: "0 €", attente: att(45) },
    acceptes: { reservation: [0], tarif: ["A puis B"], supplements: [0], attente: [ATT(45)] },
    justification: { reservation: "Client hélé dans la rue : pas de réservation.", tarif: "Départ à 18h30 (jour, retour en charge = A) ; à 19h le compteur passe au tarif de nuit B.", supplements: "Aucun.", attente: att(45) } }),
  s({ id: "s04", titre: "Hôtel Boscolo",
    enonce: "À 4h30, appel pour une prise en charge immédiate : 5 personnes au départ du 11 quai Jules-Courmont (69002), destination 66 rue Smith. Vous repartez à vide.",
    attendu: { reservation: "2 €", tarif: "D", supplements: "4 € (5e passager)", attente: "0 €" },
    acceptes: { reservation: [2], tarif: ["D"], supplements: [4], attente: [0] },
    justification: { reservation: "Réservation immédiate : 2 €.", tarif: "4h30 = nuit, retour à vide → D.", supplements: "Le 5e passager : 4 €.", attente: "Aucune attente." } }),
  s({ id: "s05", titre: "Palais de Justice",
    enonce: "En station rue Smith, une personne aveugle avec son chien guide et une accompagnatrice vont au 1 rue du Palais-de-Justice (69005). Attente de 10 minutes, puis retour de l'accompagnatrice seule.",
    attendu: { reservation: "0 €", tarif: "A", supplements: "0 €", attente: att(10) },
    acceptes: { reservation: [0], tarif: ["A"], supplements: [0], attente: [ATT(10)] },
    justification: { reservation: "Prise en station : pas de réservation.", tarif: "Journée ordinaire, retour avec une cliente → A.", supplements: "Chien guide : aucun supplément, refus interdit. 2 personnes.", attente: att(10) } }),
  s({ id: "s06", titre: "Cathédrale Saint-Jean",
    enonce: "Un client a réservé hier pour 6h55, place Saint-Jean (69005), destination 66 rue Smith. Il transporte une malle sur la galerie. Vous repartez à vide.",
    attendu: { reservation: "4 €", tarif: "D puis C à 7h si la course continue", supplements: "2 € sous conditions (encombrant)", attente: "0 €" },
    acceptes: { reservation: [4], tarif: ["D puis C", "D"], supplements: [2, 0], attente: [0] },
    justification: { reservation: "Réservé la veille : 4 €.", tarif: "6h55 = nuit, retour à vide → D ; si la course se poursuit après 7h, passage au tarif de jour C.", supplements: "La malle peut être comptée comme encombrant (2 €) selon les conditions affichées ; 0 € est aussi admis.", attente: "Aucune attente." } }),
  s({ id: "s07", titre: "Halle Tony Garnier",
    enonce: "En station au 66 rue Smith, un client va au 20 place Charles-et-Christophe-Mérieux (69007). Attente de 10 minutes, puis retour avec 4 enfants et 4 valises.",
    attendu: { reservation: "0 €", tarif: "A", supplements: "4 € (5e passager)", attente: att(10) },
    acceptes: { reservation: [0], tarif: ["A"], supplements: [4], attente: [ATT(10)] },
    justification: { reservation: "Prise en station.", tarif: "Journée, retour en charge → A.", supplements: "Au retour 5 personnes → 4 € ; 4 valises pour 5 personnes : aucun bagage au-delà de 3 par personne.", attente: att(10) } }),
  s({ id: "s08", titre: "Palais des Sports",
    enonce: "Appel pour une prise en charge immédiate : 5 personnes au 66 rue Smith, destination 350 avenue Jean-Jaurès (69007). Attente de 10 minutes, retour du client seul avec 4 valises.",
    attendu: { reservation: "2 €", tarif: "A", supplements: "4 € (5e passager) + bagages éventuels", attente: att(10) },
    acceptes: { reservation: [2], tarif: ["A"], supplements: [4, 6], attente: [ATT(10)] },
    justification: { reservation: "Réservation immédiate : 2 €.", tarif: "Journée, retour en charge → A.", supplements: "5e passager à l'aller : 4 €. Au retour, client seul avec 4 valises : 1 bagage au-delà de 3 → +2 € possible (6 € admis).", attente: att(10) } }),
  s({ id: "s09", titre: "Matmut Stadium",
    enonce: "Appel pour une prise en charge immédiate au 353 avenue Jean-Jaurès (69007), destination rue Smith. Le client a 1 sac à main et 4 sacs de sport. Vous repartez à vide.",
    attendu: { reservation: "2 €", tarif: "C", supplements: "2 € si les 4 sacs sont taxables", attente: "0 €" },
    acceptes: { reservation: [2], tarif: ["C"], supplements: [2, 0], attente: [0] },
    justification: { reservation: "Réservation immédiate : 2 €.", tarif: "Journée, retour à vide → C.", supplements: "Sac à main non compté ; 4 sacs de sport = 1 au-delà de 3 → 2 € s'ils sont considérés comme bagages (0 € admis).", attente: "Aucune attente." } }),
  s({ id: "s10", titre: "Carnegie Hall",
    enonce: "À 23h55, 5 musiciens vous hèlent rue Smith pour le 253 rue Marcel-Mérieux (69007), avec 3 instruments, 3 valises et 2 sacs. Attente de 45 minutes, puis retour.",
    attendu: { reservation: "0 €", tarif: "B", supplements: "4 € (5e passager) + équipements éventuels", attente: att(45) },
    acceptes: { reservation: [0], tarif: ["B"], supplements: [4], attente: [ATT(45)] },
    justification: { reservation: "Client hélé : pas de réservation.", tarif: "Nuit, retour en charge → B.", supplements: "5e passager : 4 €. 8 objets pour 5 personnes : aucun au-delà de 3 par personne.", attente: att(45) } }),
  s({ id: "s11", titre: "Mairie de La Mulatière",
    enonce: "Réservé la veille pour 6h30 : départ 1 place Jean-Moulin (69350), arrivée Hôtel de Région. Le client a une valise et un fauteuil roulant pliable. Vous repartez à vide.",
    attendu: { reservation: "4 € (à vérifier selon la zone)", tarif: "D puis C après 7h", supplements: "0 €", attente: "0 €" },
    acceptes: { reservation: [4, 0], tarif: ["D puis C", "D"], supplements: [0], attente: [0] },
    justification: { reservation: "Réservation à l'avance (4 €), à vérifier selon la zone de prise en charge du taxi.", tarif: "6h30 = nuit, retour à vide → D ; C si la course continue après 7h.", supplements: "Fauteuil roulant : jamais facturé ; une seule valise.", attente: "Aucune attente." } }),
  s({ id: "s12", titre: "Mairie d'Oullins",
    enonce: "Réservé la veille pour 7h : départ place Valmy (69600), arrivée 66 rue Smith. Le client a une valise et 3 cartons. Vous repartez à vide.",
    attendu: { reservation: "4 € (à vérifier selon la zone)", tarif: "C", supplements: "Selon bagages taxables (0 ou 2 €)", attente: "0 €" },
    acceptes: { reservation: [4, 0], tarif: ["C"], supplements: [0, 2], attente: [0] },
    justification: { reservation: "Réservation à l'avance (4 €), à vérifier selon la zone.", tarif: "7h = début du tarif de jour, retour à vide → C.", supplements: "4 objets : 1 au-delà de 3 → 2 € si les cartons sont taxables, sinon 0 €.", attente: "Aucune attente." } }),
  s({ id: "s13", titre: "Gare d'Oullins",
    enonce: "À 3h, appel pour une prise en charge immédiate rue Smith, destination place Valmy (69600). Le client est ivre et a une valise. Attente de 15 minutes, puis retour.",
    attendu: { reservation: "2 €", tarif: "B", supplements: "0 €", attente: att(15) },
    acceptes: { reservation: [2], tarif: ["B"], supplements: [0], attente: [ATT(15)] },
    justification: { reservation: "Réservation immédiate : 2 €.", tarif: "Nuit, retour en charge → B.", supplements: "Une valise : aucun supplément.", attente: att(15) } }),
];
