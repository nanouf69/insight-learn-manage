// Bilan fin de formation — Formation Continue VTC
// Source : document Word "Bilan_formation_continue.docx"
// Les bonnes réponses sont marquées { correct: true } et seront affichées en rouge dans l'UI.

import handicapeImage from "@/assets/bilan-fc-vtc/handicape-stationnement.jpg";

export interface BilanFCVtcChoix {
  texte: string;
  correct?: boolean;
}

export interface BilanFCVtcQuestion {
  id: number;
  enonce: string;
  image?: string;
  choix: BilanFCVtcChoix[];
  multi?: boolean; // plusieurs bonnes réponses
}

export const BILAN_FIN_FORMATION_FC_VTC: BilanFCVtcQuestion[] = [
  {
    id: 1,
    enonce: "Parmi les entreprises du T3P, quelles sont celles qui sont soumises à l'obligation de s'assurer en responsabilité civile professionnelle ?",
    choix: [
      { texte: "VTC et 2 ou 3 roues" },
      { texte: "Le taxi, VTC et 2 ou 3 roues seulement", correct: true },
      { texte: "Le taxi seulement" },
      { texte: "Le taxi et le VTC seulement" },
    ],
  },
  {
    id: 2,
    enonce: "Qui préside la commission locale du T3P ?",
    choix: [
      { texte: "Le représentant de chaque collège à tour de rôle" },
      { texte: "Le directeur des transports du département" },
      { texte: "Le Président de la chambre de métiers" },
      { texte: "Le préfet ou son représentant", correct: true },
    ],
  },
  {
    id: 3,
    enonce: "Quelles sont les sanctions possibles en cas d'exercice illégal d'une des professions du T3P ?",
    choix: [
      { texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
      { texte: "Une amende de 1 500 € et six mois d'emprisonnement" },
      { texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
    ],
  },
  {
    id: 4,
    enonce: "Pour effectuer du T3P le véhicule doit :",
    choix: [
      { texte: "Avoir des tailles de pneumatiques fixées par décret" },
      { texte: "Avoir une signalétique distinctive", correct: true },
      { texte: "Être de couleur blanche" },
    ],
  },
  {
    id: 5,
    enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
    multi: true,
    choix: [
      { texte: "Les policiers", correct: true },
      { texte: "Les agents représentant la SNCF" },
      { texte: "Les gendarmes", correct: true },
      { texte: "Le juge du tribunal d'instance" },
    ],
  },
  {
    id: 6,
    enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n°2 du casier judiciaire ?",
    multi: true,
    choix: [
      { texte: "Transporter et déposer des objets, déchets, liquides insalubres en un lieu sans l'autorisation de la personne ayant la jouissance du lieu", correct: true },
      { texte: "Conduire avec un taux d'alcool dans le sang de 0,8 gramme par litre ou plus", correct: true },
      { texte: "Transporter un appareil permettant de déceler la présence de systèmes servant à la constatation des infractions à la législation, ou à la réglementation de la circulation routière", correct: true },
      { texte: "Poursuivre sa route, en connaissance de cause, après avoir occasionné un accident", correct: true },
    ],
  },
  {
    id: 7,
    enonce: "Quelles sont les conditions requises pour pouvoir passer l'examen de T3P ?",
    multi: true,
    choix: [
      { texte: "Avoir son permis de conduire depuis plus de 5 ans" },
      { texte: "Casier judiciaire B2 vierge", correct: true },
      { texte: "Avoir 10 points minimum sur son permis de conduire" },
    ],
  },
  {
    id: 8,
    enonce: "Quelle est la durée du mandat des membres de la commission locale des T3P ?",
    choix: [
      { texte: "2 ans" },
      { texte: "5 ans", correct: true },
      { texte: "3 ans" },
      { texte: "1 an" },
    ],
  },
  {
    id: 9,
    enonce: "Qui délivre les agréments aux centres de formation ?",
    choix: [
      { texte: "L'association permanente des chambres de métiers et de l'artisanat" },
      { texte: "Les conseils départementaux" },
      { texte: "Le ministère des transports pour les VTC, le ministère de l'environnement pour les 2 ou 3 roues, le ministère de l'intérieur pour les taxis" },
      { texte: "Les préfectures", correct: true },
    ],
  },
  {
    id: 10,
    enonce: "Un client avec une prescription médicale sera remboursé de son transport s'il utilise :",
    choix: [
      { texte: "Un VTC conventionné ou un taxi moto conventionné" },
      { texte: "Un taxi conventionné ou un taxi moto conventionné ou un VTC conventionné" },
      { texte: "Un taxi conventionné", correct: true },
      { texte: "Un taxi conventionné ou VTC conventionné" },
    ],
  },
  {
    id: 11,
    enonce: "Quelle est l'autorité compétente organisatrice de l'examen du T3P ?",
    choix: [
      { texte: "Les centres de formation" },
      { texte: "La chambre de métiers et de l'artisanat", correct: true },
      { texte: "La chambre de commerce et d'industrie" },
      { texte: "La préfecture" },
    ],
  },
  {
    id: 12,
    enonce: "Si un chauffeur utilise son véhicule T3P dans le cadre d'une activité non-professionnelle que doit-il faire ?",
    choix: [
      { texte: "Enlever ou occulter toutes références à la profession exercée", correct: true },
      { texte: "Ne rien faire de spécifique" },
      { texte: "Il n'a pas le droit d'utiliser son véhicule en dehors de son activité professionnelle" },
      { texte: "Apposer un panneau indiquant qu'il ne prend pas de client" },
    ],
  },
  {
    id: 13,
    enonce: "Les conducteurs de T3P bénéficient-ils d'un régime particulier au niveau de la limitation de vitesse ?",
    choix: [
      { texte: "Pas de régime particulier", correct: true },
      { texte: "Oui, suivant l'accord conclu avec le ministère de l'intérieur" },
      { texte: "Oui, suivant l'accord conclu avec les autorités locales" },
      { texte: "Oui ou non en fonction du véhicule utilisé" },
    ],
  },
  {
    id: 14,
    enonce: "Quelle est la périodicité de la formation continue pour le T3P ?",
    choix: [
      { texte: "Tous les 2 ans" },
      { texte: "Tous les 5 ans", correct: true },
      { texte: "Jamais" },
      { texte: "Chaque année" },
    ],
  },
  {
    id: 15,
    enonce: "Quelle est la périodicité de la visite médicale d'un conducteur, âgé de 61 ans à ce jour ?",
    choix: [
      { texte: "2 ans", correct: true },
      { texte: "5 ans" },
      { texte: "7 ans" },
      { texte: "1 an" },
    ],
  },
  {
    id: 16,
    enonce: "À partir de quel montant minimal le conducteur de T3P a-t-il l'obligation de fournir une note de course ?",
    multi: true,
    choix: [
      { texte: "25 €", correct: true },
      { texte: "Il n'y a pas de montant minimal si c'est à la demande du client", correct: true },
      { texte: "1 euro" },
      { texte: "15,24 €" },
    ],
  },
  {
    id: 17,
    enonce: "La carte professionnelle d'un conducteur de T3P :",
    choix: [
      { texte: "Doit être apposée de telle manière que la photographie soit visible de l'intérieur par le client" },
      { texte: "Il n'y a pas d'obligation d'apposer sa carte professionnelle dans le véhicule" },
      { texte: "Doit être apposée de telle manière que la photographie soit visible de l'extérieur", correct: true },
    ],
  },
  {
    id: 18,
    enonce: "La police des transports est chargée de :",
    choix: [
      { texte: "Au respect de la réglementation applicable au T3P à titre onéreux" },
      { texte: "Au respect du code de la route" },
      { texte: "Au respect du code de la route et de la réglementation applicable au T3P", correct: true },
    ],
  },
  {
    id: 19,
    enonce: "La location à la place est interdite pour (la location à la place est le fait de faire payer la course par personne) :",
    multi: true,
    choix: [
      { texte: "Les taxis", correct: true },
      { texte: "Les VTC", correct: true },
      { texte: "Le transport soumis au régime de la loi LOTI (transport collectif)" },
    ],
  },
  {
    id: 20,
    enonce: "Pendant combien de temps est agréé un centre de formation T3P ?",
    choix: [
      { texte: "2 ans" },
      { texte: "3 ans" },
      { texte: "5 ans", correct: true },
    ],
  },
  {
    id: 21,
    enonce: "Qui a le droit à la location à la place ?",
    choix: [
      { texte: "Chauffeur taxi" },
      { texte: "Chauffeur VTC" },
      { texte: "Chauffeur VMDTR" },
      { texte: "Chauffeur sous le régime LOTI (transport collectif)", correct: true },
    ],
  },
  {
    id: 22,
    enonce: "Quelle est la taille minimum de la commune dans laquelle peut s'exercer une activité du T3P ?",
    choix: [
      { texte: "11 000 habitants" },
      { texte: "20 000 habitants" },
      { texte: "Pas de taille minimum", correct: true },
      { texte: "1500" },
    ],
  },
  {
    id: 23,
    enonce: "La réglementation T3P se trouve dans :",
    choix: [
      { texte: "Code du transport", correct: true },
      { texte: "Code du travail" },
      { texte: "Code préfectoral" },
      { texte: "Code pénal" },
    ],
  },
  {
    id: 24,
    enonce: "Pour être exploitable en activité de T3P, un véhicule hybride doit être :",
    choix: [
      { texte: "Équipé d'un pack confort" },
      { texte: "Soumis à des contraintes particulières" },
      { texte: "Sans contrainte particulière", correct: true },
      { texte: "De couleur noire" },
    ],
  },
  {
    id: 25,
    enonce: "Quelle est l'ancienneté maximum pour un véhicule hybride ?",
    choix: [
      { texte: "7 ans" },
      { texte: "2 ans" },
      { texte: "6 ans" },
      { texte: "Aucune", correct: true },
    ],
  },
  {
    id: 26,
    enonce: "Le retrait de la carte professionnelle peut être prononcé par :",
    choix: [
      { texte: "Le maire" },
      { texte: "Le président de la métropole" },
      { texte: "Le préfet de la région" },
      { texte: "Le préfet de police ou le préfet", correct: true },
    ],
  },
  {
    id: 27,
    enonce: "L'assurance dite responsabilité civile professionnelle (RCP) peut être invoquée par le conducteur s'il :",
    choix: [
      { texte: "Abîme le vêtement de son passager en l'accompagnant jusqu'à son hôtel", correct: true },
      { texte: "Accroche un autre véhicule en manœuvrant pour se garer" },
      { texte: "Est contrôlé et n'a pas sa carte professionnelle" },
    ],
  },
  {
    id: 28,
    enonce: "Qui parmi les T3P peuvent être conventionnés par la caisse d'assurance maladie ?",
    choix: [
      { texte: "Les taxis", correct: true },
      { texte: "Les VTC" },
      { texte: "Les véhicules motorisés à 2 ou 3 roues" },
    ],
  },
  {
    id: 29,
    enonce: "Quelle est l'autorité qui effectue la vérification du casier judiciaire d'un candidat à la carte professionnelle de conducteur de véhicules T3P ?",
    choix: [
      { texte: "Le ministère chargé des transports" },
      { texte: "Le préfet de région" },
      { texte: "Le préfet de police ou le préfet", correct: true },
      { texte: "Les forces de l'ordre" },
    ],
  },
  {
    id: 30,
    enonce: "Le retrait de la carte professionnelle est :",
    choix: [
      { texte: "Consécutif à la décision d'un juge de l'ordre administratif sous certaines conditions" },
      { texte: "Une sanction administrative prise par un préfet", correct: true },
      { texte: "Une sanction administrative prise par un juge" },
      { texte: "Consécutif à la décision d'un juge de l'ordre pénal sous certaines conditions" },
    ],
  },
  {
    id: 31,
    enonce: "Quelles sont les conditions obligatoires pour l'exercice d'une profession T3P ?",
    multi: true,
    choix: [
      { texte: "Disposer de l'honorabilité professionnelle", correct: true },
      { texte: "Avoir perdu plus de six points sur le permis de conduire" },
      { texte: "Être titulaire de la carte professionnelle", correct: true },
      { texte: "Avoir une Tesla" },
    ],
  },
  {
    id: 32,
    enonce: "Quelles sont les conséquences pour un conducteur de T3P qui ne serait pas titulaire d'une responsabilité civile professionnelle ?",
    choix: [
      { texte: "Une amende de 1 500 € et six mois d'emprisonnement" },
      { texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
      { texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
      { texte: "Une amende de 5ème classe" },
    ],
  },
  {
    id: 33,
    enonce: "Combien de fois au minimum les commissions locales du T3P doivent-elles se réunir chaque année ?",
    choix: [
      { texte: "Au minimum 1 fois" },
      { texte: "Au minimum 2 fois", correct: true },
      { texte: "Au minimum 3 fois" },
      { texte: "Aucune obligation" },
    ],
  },
  {
    id: 34,
    enonce: "À quel moment doit être restituée la carte professionnelle ?",
    choix: [
      { texte: "En cas d'arrêt maladie" },
      { texte: "Pendant les périodes de congés" },
      { texte: "En cas de cessation d'activité temporaire" },
      { texte: "En cas de cessation d'activité totale", correct: true },
    ],
  },
  {
    id: 35,
    enonce: "Quelle est la périodicité du contrôle technique pour un véhicule utilisé pour une activité de VTC ou de taxi ?",
    choix: [
      { texte: "2 ans" },
      { texte: "3 ans" },
      { texte: "1 an", correct: true },
      { texte: "6 mois" },
    ],
  },
  {
    id: 36,
    enonce: "Depuis l'arrêté d'août 2017, la durée minimum de la formation continue obligatoire des conducteurs de T3P est de :",
    choix: [
      { texte: "35 heures" },
      { texte: "7 heures" },
      { texte: "14 heures", correct: true },
    ],
  },
  {
    id: 37,
    enonce: "De quel ministère dépend l'activité principale des T3P ?",
    choix: [
      { texte: "Ministère du tourisme" },
      { texte: "Ministère de l'économie" },
      { texte: "Ministère du transport", correct: true },
      { texte: "Ministère de l'intérieur" },
    ],
  },
  {
    id: 38,
    enonce: "L'attestation de formation continue est valable :",
    choix: [
      { texte: "2 ans" },
      { texte: "1 an" },
      { texte: "5 ans", correct: true },
      { texte: "10 ans" },
    ],
  },
  {
    id: 39,
    enonce: "Le fait de ne pas présenter immédiatement sa carte professionnelle lors d'un contrôle est passible :",
    choix: [
      { texte: "D'une immobilisation du véhicule" },
      { texte: "D'une amende de quatrième classe" },
      { texte: "D'une amende de deuxième classe", correct: true },
      { texte: "D'une amende de première classe" },
    ],
  },
  {
    id: 40,
    enonce: "Quelle est l'autorité compétente organisatrice de l'examen T3P ?",
    choix: [
      { texte: "La chambre des métiers et de l'artisanat", correct: true },
      { texte: "La chambre de commerce et d'industrie" },
      { texte: "La préfecture" },
      { texte: "Les centres de formation" },
    ],
  },
  {
    id: 41,
    enonce: "Le port de la ceinture de sécurité est obligatoire pour le chauffeur ?",
    choix: [
      { texte: "Pour les VTC", correct: true },
      { texte: "Pour les taxis" },
      { texte: "Pour les deux professions" },
    ],
  },
  {
    id: 42,
    enonce: "En cas de contrôle, le conducteur d'un véhicule de transport public particulier doit être en mesure de justifier ?",
    choix: [
      { texte: "Trois assurances" },
      { texte: "Deux assurances dont l'une est obligatoirement tous risques" },
      { texte: "Deux assurances", correct: true },
      { texte: "Une assurance" },
    ],
  },
  {
    id: 43,
    enonce: "Dans quel cas un bon de mission VTC n'est pas obligatoire ?",
    choix: [
      { texte: "Pour un transport TPMR" },
      { texte: "Pour le transport d'un colis" },
      { texte: "Il est toujours obligatoire", correct: true },
      { texte: "Si je réalise une mission en sous-traitance" },
    ],
  },
  {
    id: 44,
    enonce: "Quel est le terme utilisé quand un conducteur de T3P propose ses services sur la voie publique sans réservation au préalable ?",
    choix: [
      { texte: "Maraude" },
      { texte: "Racolage", correct: true },
      { texte: "Réservation immédiate" },
    ],
  },
  {
    id: 45,
    enonce: "Vous accordez à un client régulier une remise de 5 % sur le 10ème trajet. La prestation est d'un montant de 80 €, la remise sera donc de :",
    choix: [
      { texte: "3,20 €" },
      { texte: "5,00 €" },
      { texte: "4,00 €", correct: true },
    ],
  },
  {
    id: 46,
    enonce: "Quelle affirmation est vraie ?",
    choix: [
      { texte: "Lorsque la demande est supérieure à l'offre, les prix diminuent" },
      { texte: "Lorsque la demande est inférieure à l'offre, les prix augmentent" },
      { texte: "Lorsque la demande est supérieure à l'offre, les prix augmentent", correct: true },
    ],
  },
  {
    id: 47,
    enonce: "En accueillant un client qui voyage seul, un chauffeur de VTC l'invite à prendre place :",
    choix: [
      { texte: "Sur le siège arrière droit", correct: true },
      { texte: "Sur le siège arrière gauche" },
      { texte: "Sur le siège avant" },
    ],
  },
  {
    id: 48,
    enonce: "Diriez-vous que fidéliser vos clients VTC coûte :",
    choix: [
      { texte: "Le même prix que d'en trouver de nouveaux" },
      { texte: "Moins cher que d'en trouver de nouveaux", correct: true },
      { texte: "Plus cher que d'en trouver de nouveaux" },
    ],
  },
  {
    id: 49,
    enonce: "Qu'est-ce qu'une zone de chalandise ?",
    choix: [
      { texte: "C'est un bateau" },
      { texte: "C'est le nombre de conducteurs de VTC qu'il y a dans une zone géographique" },
      { texte: "C'est la zone géographique d'où provient la majorité de la clientèle", correct: true },
    ],
  },
  {
    id: 50,
    enonce: "Une personne qui influence l'acte d'achat est :",
    choix: [
      { texte: "Un consommateur" },
      { texte: "Un grossiste" },
      { texte: "Un prescripteur", correct: true },
    ],
  },
  {
    id: 51,
    enonce: "Qu'appelle-t-on un service premium ?",
    choix: [
      { texte: "Un service de premier prix" },
      { texte: "Un service gratuit" },
      { texte: "Un service haut de gamme", correct: true },
    ],
  },
  {
    id: 52,
    enonce: "Que doit-on dire lorsqu'on décroche un appel téléphonique ?",
    choix: [
      { texte: "Le nom de la société et bonjour", correct: true },
      { texte: "Le nom de la société" },
      { texte: "Allo" },
    ],
  },
  {
    id: 53,
    enonce: "Vendre une prestation à perte :",
    choix: [
      { texte: "Est interdit par le code du commerce" },
      { texte: "N'est possible que lorsqu'un contrat annuel de type abonnement a été souscrit par le client" },
      { texte: "Constitue une forme de concurrence déloyale", correct: true },
    ],
  },
  {
    id: 54,
    enonce: "Le sourire a-t-il une incidence au téléphone ?",
    choix: [
      { texte: "Ça dépend" },
      { texte: "Oui, tout à fait", correct: true },
      { texte: "Non, car l'interlocuteur ne me voit pas" },
    ],
  },
  {
    id: 55,
    enonce: "Le seuil de rentabilité d'une entreprise est atteint lorsque :",
    choix: [
      { texte: "Le chiffre d'affaires permet de couvrir toutes les charges", correct: true },
      { texte: "L'entreprise dégage sa marge bénéficiaire prévisionnelle" },
      { texte: "Le chiffre d'affaires permet de couvrir les charges fixes" },
    ],
  },
  {
    id: 56,
    enonce: "Le concierge dans un hôtel a pour fonction :",
    choix: [
      { texte: "La surveillance de l'hôtel afin d'assurer la tranquillité des clients" },
      { texte: "De satisfaire les besoins et demandes des clients", correct: true },
      { texte: "Le ménage, la sortie des poubelles" },
    ],
  },
  {
    id: 57,
    enonce: "Tu as des clients dans une voiture et tu arrives à l'hôtel :",
    choix: [
      { texte: "Tu restes dans la voiture, tu attends que le chasseur s'éloigne" },
      { texte: "Tu ouvres la porte au client et tu laisses le chasseur décharger les valises" },
      { texte: "Tu ouvres la porte aux clients et tu aides le chasseur", correct: true },
    ],
  },
  {
    id: 58,
    enonce: "Un client a la mention suivante « le client paie 30 jours fin du mois ». Nous sommes le 2 octobre, quand doit-il payer ?",
    choix: [
      { texte: "31 octobre" },
      { texte: "30 octobre" },
      { texte: "30 novembre", correct: true },
      { texte: "31 novembre" },
    ],
  },
  {
    id: 59,
    enonce: "Que signifie B to C :",
    choix: [
      { texte: "Business to Consumer", correct: true },
      { texte: "Business to Customer" },
      { texte: "Business entre entreprises" },
    ],
  },
  {
    id: 60,
    enonce: "Sur les routes à 2x2 voies séparées par une ligne continue, la vitesse est limitée à :",
    choix: [
      { texte: "90 km/h", correct: true },
      { texte: "110 km/h" },
      { texte: "130 km/h" },
    ],
  },
  {
    id: 61,
    enonce: "La roue de secours est-elle obligatoire dans une voiture ?",
    choix: [
      { texte: "Non, la règlementation française ne l'impose pas", correct: true },
      { texte: "Oui, il s'agit d'un équipement de sécurité" },
      { texte: "Oui, il s'agit d'une obligation européenne" },
    ],
  },
  {
    id: 62,
    enonce: "Que faut-il faire en cas d'incendie dans un tunnel ?",
    choix: [
      { texte: "Faire un demi-tour avec son véhicule pour fuir plus vite" },
      { texte: "Laisser les clefs de contact sur le véhicule, après avoir éteint le moteur pour fuir plus vite", correct: true },
      { texte: "Évacuer le tunnel par l'issue de secours la plus proche", correct: true },
    ],
    multi: true,
  },
  {
    id: 63,
    enonce: "En cas de non-paiement, une amende forfaitaire devient majorée à l'issue d'un délai de :",
    choix: [
      { texte: "30 jours" },
      { texte: "40 jours" },
      { texte: "45 jours", correct: true },
    ],
  },
  {
    id: 64,
    enonce: "Un permis B permet de transporter au maximum :",
    choix: [
      { texte: "7 passagers" },
      { texte: "6 passagers" },
      { texte: "9 passagers", correct: true },
      { texte: "8 passagers" },
    ],
  },
  {
    id: 65,
    enonce: "Sur une route étroite, un camion arrive en face de moi, je dois lui céder le passage ?",
    choix: [
      { texte: "Oui", correct: true },
      { texte: "Non" },
    ],
  },
  {
    id: 66,
    enonce: "En présence d'un accident qui vient d'avoir lieu, je dois :",
    choix: [
      { texte: "Protéger, alerter, secourir", correct: true },
      { texte: "Alerter, secourir, protéger" },
      { texte: "Secourir, protéger, alerter" },
    ],
  },
  {
    id: 67,
    enonce: "Cet emplacement :",
    image: handicapeImage,
    multi: true,
    choix: [
      { texte: "Est réservé aux véhicules portant une carte de stationnement pour personnes handicapées", correct: true },
      { texte: "Est réservé aux véhicules transportant une ou plusieurs personnes handicapées" },
      { texte: "Son occupation illicite est punie d'une contravention de troisième classe" },
      { texte: "Son occupation illicite fait encourir une mise en fourrière du véhicule", correct: true },
    ],
  },
  {
    id: 68,
    enonce: "Lorsque le permis a été invalidé en raison d'une perte totale de points, le nouveau permis obtenu est :",
    choix: [
      { texte: "Un permis probatoire doté d'un capital de 12 points" },
      { texte: "Un permis probatoire doté d'un capital de 6 points", correct: true },
      { texte: "Un permis non probatoire doté d'un capital de 12 points" },
    ],
  },
  {
    id: 69,
    enonce: "Lorsque je manœuvre :",
    multi: true,
    choix: [
      { texte: "Je suis toujours prioritaire" },
      { texte: "Je dois la priorité durant la manœuvre", correct: true },
      { texte: "Je dois la priorité avant de manœuvrer", correct: true },
    ],
  },
  {
    id: 70,
    enonce: "L'éclatement d'un pneu, dû à un mauvais gonflage, provient plutôt :",
    choix: [
      { texte: "D'un excès de pression" },
      { texte: "D'avoir deux pneus de taille différente" },
      { texte: "D'un manque de pression", correct: true },
    ],
  },
  {
    id: 71,
    enonce: "Le passager a-t-il le droit de fumer dans le véhicule ?",
    choix: [
      { texte: "Oui" },
      { texte: "Non" },
      { texte: "Oui mais hors présence d'un mineur (sanction 135€)", correct: true },
    ],
  },
  {
    id: 72,
    enonce: "Le non-port de la ceinture de sécurité en voiture peut entraîner un retrait sur le permis de conduire de :",
    choix: [
      { texte: "2 points" },
      { texte: "3 points", correct: true },
      { texte: "4 points" },
    ],
  },
  {
    id: 73,
    enonce: "Quel est le numéro d'appel d'urgence européen ?",
    choix: [
      { texte: "112", correct: true },
      { texte: "15" },
      { texte: "911" },
      { texte: "17" },
    ],
  },
  {
    id: 74,
    enonce: "Quelle réglementation est juste concernant les vitres tintées dans le véhicule à l'avant et à l'arrière ?",
    choix: [
      { texte: "30% de la lumière doit pénétrer -3 points et 135€ et 70% à l'arrière" },
      { texte: "40% de la lumière doit pénétrer -3 points et 135€ et 70% à l'arrière" },
      { texte: "50% de la lumière doit pénétrer -3 points et 135€ et 70% à l'arrière" },
      { texte: "70% de la lumière doit pénétrer -3 points et 135€ et aucune restriction à l'arrière", correct: true },
    ],
  },
  {
    id: 75,
    enonce: "En cas de panne de votre véhicule, à quelle distance placez-vous le triangle de pré-signalisation ?",
    choix: [
      { texte: "30 mètres au moins de votre véhicule", correct: true },
      { texte: "50 mètres au moins de votre véhicule" },
      { texte: "10 mètres au moins de votre véhicule" },
    ],
  },
  {
    id: 76,
    enonce: "Jusqu'à quel âge peut-on circuler sur un trottoir à vélo ?",
    choix: [
      { texte: "Cinq ans" },
      { texte: "Six ans" },
      { texte: "Sept ans" },
      { texte: "Huit ans", correct: true },
    ],
  },
  {
    id: 77,
    enonce: "Le constat amiable est :",
    choix: [
      { texte: "Obligatoire" },
      { texte: "Obligatoire sinon sanction" },
      { texte: "Non obligatoire", correct: true },
    ],
  },
  {
    id: 78,
    enonce: "À la suite d'un accident matériel, je dois envoyer le constat amiable à mon assureur dans un délai maximum de :",
    choix: [
      { texte: "5 jours ouvrés", correct: true },
      { texte: "4 jours ouvrés" },
      { texte: "2 jours ouvrés" },
    ],
  },
  {
    id: 79,
    enonce: "Le dispositif de contrôle électronique de stabilité ESP :",
    choix: [
      { texte: "Agit sur les freins de manière à renforcer la stabilité du véhicule lors des freinages" },
      { texte: "Agit sur les freins et le moteur de manière à corriger les pertes d'adhérence ou de stabilité du véhicule", correct: true },
      { texte: "Doit obligatoirement être proposé en option par les constructeurs automobiles sur les véhicules mis en circulation actuellement" },
      { texte: "Est obligatoire sur toutes les automobiles mises en circulation actuellement", correct: true },
    ],
    multi: true,
  },
  {
    id: 80,
    enonce: "Les piétons sont tenus d'utiliser les passages prévus à leur intention lorsqu'il en existe un à moins de :",
    choix: [
      { texte: "20 mètres" },
      { texte: "50 mètres", correct: true },
      { texte: "100 mètres" },
    ],
  },
  {
    id: 81,
    enonce: "La durée maximale de stationnement précédant l'horaire de prise en charge mentionné par le client lors de sa réservation à un aéroport ou une gare pour un VTC est de :",
    choix: [
      { texte: "45 minutes" },
      { texte: "1 heure", correct: true },
      { texte: "30 minutes" },
      { texte: "1 h 30" },
    ],
  },
  {
    id: 82,
    enonce: "Qui délivre la carte professionnelle des conducteurs de VTC ?",
    choix: [
      { texte: "La préfecture", correct: true },
      { texte: "La chambre de métiers et de l'artisanat" },
      { texte: "La Mairie" },
      { texte: "Les organisations professionnelles de VTC" },
    ],
  },
  {
    id: 83,
    enonce: "La justification d'une réservation préalable :",
    multi: true,
    choix: [
      { texte: "Doit obligatoirement mentionner le nom du bénéficiaire de la prestation", correct: true },
      { texte: "Est facultative" },
      { texte: "Peut être établie sur support numérique", correct: true },
    ],
  },
  {
    id: 84,
    enonce: "Parmi les puissances de moteur suivantes, quelles sont celles permettant à une voiture d'être exploitée en VTC ?",
    multi: true,
    choix: [
      { texte: "82 kilowatts" },
      { texte: "86 kilowatts", correct: true },
      { texte: "80 kilowatts" },
      { texte: "84 kilowatts", correct: true },
    ],
  },
  {
    id: 85,
    enonce: "Quelles sont les caractéristiques d'une voiture adaptée pour un usage de VTC ?",
    choix: [
      { texte: "Une longueur hors tout minimale de 4,50 mètres et au moins quatre portes", correct: true },
      { texte: "Une longueur hors tout comprise entre 4,70 mètres et une largeur hors tout minimale de 1,60 mètre" },
      { texte: "Une longueur hors tout comprise entre 4,05 mètres et 5,12 mètres" },
      { texte: "Une longueur hors tout comprise entre 3,58 mètres et 4,50 mètres" },
    ],
  },
  {
    id: 86,
    enonce: "Pour chaque véhicule exploité comme VTC, une capacité financière est exigée. Quel est son montant ?",
    choix: [
      { texte: "1 500 euros", correct: true },
      { texte: "100 euros" },
      { texte: "8 000 euros" },
    ],
  },
  {
    id: 87,
    enonce: "Un véhicule VTC doit être âgé de :",
    choix: [
      { texte: "Moins de 7 ans, sauf pour les véhicules de collection de 30 ans", correct: true },
      { texte: "Moins de 5 ans, sauf pour les véhicules de collection de 15 ans" },
      { texte: "Moins de 6 ans, sauf pour les véhicules de collection de 25 ans" },
      { texte: "Moins de 5 ans, sauf pour les véhicules de collection de 20 ans" },
    ],
  },
  {
    id: 88,
    enonce: "Quel est le périmètre d'exercice de l'activité de conducteur de VTC ?",
    choix: [
      { texte: "Son département de résidence" },
      { texte: "Sa commune de résidence" },
      { texte: "Le territoire national", correct: true },
    ],
  },
  {
    id: 89,
    enonce: "La prise en charge d'un client sur une voie ouverte à la circulation publique sans réservation préalable est :",
    choix: [
      { texte: "Autorisée si elle est consécutive à la dépose du client précédent sur le même lieu" },
      { texte: "Passible d'une suspension du permis de conduire" },
      { texte: "Un délit puni d'une peine de prison et d'une amende pouvant aller jusqu'à 15 000€", correct: true },
    ],
  },
  {
    id: 90,
    enonce: "La procédure d'inscription au registre des exploitants de VTC doit être renouvelée tous les :",
    choix: [
      { texte: "4 ans" },
      { texte: "1 an" },
      { texte: "5 ans", correct: true },
      { texte: "2 ans" },
    ],
  },
  {
    id: 91,
    enonce: "Un véhicule VTC peut-il être électrique ?",
    choix: [
      { texte: "Oui, s'il respecte les conditions de puissance" },
      { texte: "Oui, s'il respecte les conditions de taille et de puissance" },
      { texte: "Non, c'est interdit" },
      { texte: "Oui, quelles que soient la taille et la puissance", correct: true },
    ],
  },
  {
    id: 92,
    enonce: "Quel est le délai maximum de livraison de l'attestation du registre de VTC ?",
    choix: [
      { texte: "1 mois" },
      { texte: "2 mois" },
      { texte: "3 mois", correct: true },
      { texte: "4 mois" },
    ],
  },
  {
    id: 93,
    enonce: "Quel est le ministère qui gère le registre des VTC ?",
    choix: [
      { texte: "Ministère du tourisme" },
      { texte: "Ministère de l'intérieur" },
      { texte: "Ministère des transports", correct: true },
      { texte: "Ministère de l'économie" },
    ],
  },
];
