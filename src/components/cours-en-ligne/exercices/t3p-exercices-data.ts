// Exercices T3P — Partie 1 (66 questions) + Partie 2 (62 questions)
// Source: Exercices_T3P_Partie1.docx & Exercices_T3P_Partie2.docx

export interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

export interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions: ExerciceQuestion[];
}

// ===== PARTIE 1 =====

const T3P_EXERCICE_SECTION_1: ExerciceQuestion[] = [
  { id: 1, enonce: "Quelles activités concernent le transport public particulier de personnes ?", choix: [
    { lettre: "A", texte: "TAXI", correct: true },
    { lettre: "B", texte: "VTC", correct: true },
    { lettre: "C", texte: "VMDTR", correct: true },
    { lettre: "D", texte: "Transport public collectif" },
  ]},
  { id: 2, enonce: "Quelle est la définition légale du T3P ?", choix: [
    { lettre: "A", texte: "Ce sont des prestations de transport public routier de personnes qui ne relèvent ni des transports publics collectifs ni du transport privé, exécutées à titre onéreux par les taxis, VTC et VMDTR", correct: true },
    { lettre: "B", texte: "Ce sont des prestations de transport privé réservées aux entreprises" },
    { lettre: "C", texte: "Ce sont des services de transport collectif comme le bus et le métro" },
    { lettre: "D", texte: "Ce sont des prestations de transport gratuites pour les particuliers" },
  ]},
  { id: 3, enonce: "Quelles sont les 3 professions du T3P ?", choix: [
    { lettre: "A", texte: "Taxi, VTC et VMDTR", correct: true },
    { lettre: "B", texte: "Taxi, Bus et VTC" },
    { lettre: "C", texte: "VTC, VMDTR et Ambulancier" },
    { lettre: "D", texte: "Taxi, VTC et Chauffeur de bus" },
  ]},
  { id: 4, enonce: "Le transport privé nécessite-t-il une carte professionnelle T3P ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non, le transport privé est pour son propre compte et ne nécessite pas de carte pro T3P", correct: true },
  ]},
  { id: 5, enonce: "Qu'est-ce qui distingue le transport public du transport privé ?", choix: [
    { lettre: "A", texte: "Le transport public est rémunéré et pour compte d'autrui, le transport privé est pour son propre compte", correct: true },
    { lettre: "B", texte: "Le transport public est gratuit, le transport privé est payant" },
    { lettre: "C", texte: "Il n'y a aucune différence" },
  ]},
  { id: 6, enonce: "Quelle loi est le texte fondateur de la réglementation du transport de personnes en France ?", choix: [
    { lettre: "A", texte: "La loi Badinter de 1985" },
    { lettre: "B", texte: "La loi LOTI n°82-1153 du 30 décembre 1982", correct: true },
    { lettre: "C", texte: "La loi Macron de 2015" },
    { lettre: "D", texte: "La loi Thévenoud de 2014" },
  ]},
  { id: 7, enonce: "Quelle autorité délivre les autorisations de transport en France ?", choix: [
    { lettre: "A", texte: "La mairie" },
    { lettre: "B", texte: "La DREAL ou la DRIEAT (Île-de-France)", correct: true },
    { lettre: "C", texte: "La chambre de commerce" },
  ]},
];

const T3P_EXERCICE_SECTION_2: ExerciceQuestion[] = [
  { id: 8, enonce: "Les conducteurs de services réguliers (bus, tramway, TER) ont-ils besoin d'une carte professionnelle T3P ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non, ce sont des services collectifs, pas des services particuliers", correct: true },
  ]},
  { id: 9, enonce: "Qu'est-ce qu'un service à la demande (TAD) ?", choix: [
    { lettre: "A", texte: "Un taxi collectif réservé aux VTC" },
    { lettre: "B", texte: "Un service collectif dont l'itinéraire est déterminé en partie en fonction de la demande des usagers", correct: true },
    { lettre: "C", texte: "Un service de covoiturage entre particuliers" },
  ]},
  { id: 10, enonce: "Auprès de quel organisme s'adresser pour effectuer du service occasionnel ?", choix: [
    { lettre: "A", texte: "Chambre des métiers et de l'artisanat" },
    { lettre: "B", texte: "Préfecture" },
    { lettre: "C", texte: "DRIRE ou DREAL", correct: true },
  ]},
  { id: 11, enonce: "Peut-on transporter un seul passager pour effectuer un transport collectif (service occasionnel) ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non, il faut transporter des groupes d'au moins 2 personnes", correct: true },
  ]},
  { id: 12, enonce: "Depuis le 01/01/2017, quelle restriction s'applique aux services occasionnels dans les grandes agglomérations ?", choix: [
    { lettre: "A", texte: "Interdiction de réaliser des services occasionnels avec des véhicules de moins de 10 places pour des trajets dans les agglomérations de plus de 100 000 habitants", correct: true },
    { lettre: "B", texte: "Obligation d'avoir un taximètre" },
    { lettre: "C", texte: "Interdiction totale des services occasionnels" },
  ]},
];

const T3P_EXERCICE_SECTION_3: ExerciceQuestion[] = [
  { id: 13, enonce: "Quelle est la durée d'interdiction de passer l'examen T3P en cas de fraude ?", choix: [
    { lettre: "A", texte: "1 an" },
    { lettre: "B", texte: "2 ans", correct: true },
    { lettre: "C", texte: "5 ans" },
  ]},
  { id: 14, enonce: "Quelle est la durée d'interdiction en cas de retrait définitif de la carte ?", choix: [
    { lettre: "A", texte: "1 an" },
    { lettre: "B", texte: "2 ans" },
    { lettre: "C", texte: "5 ans" },
    { lettre: "D", texte: "10 ans", correct: true },
  ]},
  { id: 15, enonce: "Peut-on s'inscrire à l'examen T3P si le permis est en période probatoire ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non, le permis doit être hors période probatoire (2 ans en AAC ou 3 ans en conduite normale)", correct: true },
  ]},
];

const T3P_EXERCICE_SECTION_4: ExerciceQuestion[] = [
  { id: 16, enonce: "Les taxis circulant dans leur zone de rattachement ont-ils le droit de prendre des clients sans réservation préalable ?", choix: [
    { lettre: "A", texte: "Oui", correct: true },
    { lettre: "B", texte: "Non" },
  ]},
  { id: 17, enonce: "Quelle(s) définition(s) correspond(ent) à la « maraude » ?", choix: [
    { lettre: "A", texte: "La maraude est le fait de prendre un client sans réservation préalable sur une voie publique", correct: true },
    { lettre: "B", texte: "La maraude est le fait d'être en quête de clients sur une voie publique", correct: true },
    { lettre: "C", texte: "La maraude est le fait de prendre un client avec une réservation préalable" },
    { lettre: "D", texte: "La maraude est le fait que les clients procèdent au paiement avant la course" },
  ]},
  { id: 18, enonce: "Les VTC, les VMDTR et les taxis hors zone de rattachement ont-ils le droit de prendre un client sans réservation préalable ?", choix: [
    { lettre: "A", texte: "Vrai" },
    { lettre: "B", texte: "Faux", correct: true },
  ]},
  { id: 19, enonce: "Quels sont les 4 statuts d'exercice possibles pour un taxi ?", choix: [
    { lettre: "A", texte: "Artisan, Salarié, Locataire-gérant, Actionnaire", correct: true },
    { lettre: "B", texte: "Artisan, Intérimaire, Bénévole, Actionnaire" },
    { lettre: "C", texte: "Salarié, Stagiaire, Locataire, Freelance" },
  ]},
  { id: 20, enonce: "Quelle est la sanction pour exercer le taxi sans ADS ?", choix: [
    { lettre: "A", texte: "Amende de 1 500 €" },
    { lettre: "B", texte: "DÉLIT — 1 an de prison + 15 000 €", correct: true },
    { lettre: "C", texte: "Simple avertissement" },
  ]},
  { id: 21, enonce: "Le PSC1 (Premiers Secours) est-il obligatoire pour les taxis ?", choix: [
    { lettre: "A", texte: "Oui, obligatoire uniquement pour les taxis", correct: true },
    { lettre: "B", texte: "Oui, obligatoire pour toutes les professions T3P" },
    { lettre: "C", texte: "Non, facultatif pour tous" },
  ]},
  { id: 22, enonce: "Que signifie un lumignon vert sur un taxi ?", choix: [
    { lettre: "A", texte: "Le taxi est occupé" },
    { lettre: "B", texte: "Le taxi est libre / disponible", correct: true },
    { lettre: "C", texte: "Le taxi est en panne" },
  ]},
];

const T3P_EXERCICE_SECTION_5: ExerciceQuestion[] = [
  { id: 23, enonce: "Quelle est la règle d'or du VTC ?", choix: [
    { lettre: "A", texte: "Le tarif est réglementé par le préfet" },
    { lettre: "B", texte: "La réservation préalable est TOUJOURS obligatoire", correct: true },
    { lettre: "C", texte: "Le VTC peut marauder dans sa zone" },
  ]},
  { id: 24, enonce: "Quelle est la sanction pour un VTC qui pratique la maraude ?", choix: [
    { lettre: "A", texte: "Amende de 135 €" },
    { lettre: "B", texte: "DÉLIT — 1 an d'emprisonnement + 15 000 € d'amende", correct: true },
    { lettre: "C", texte: "Simple avertissement du préfet" },
  ]},
  { id: 25, enonce: "Quelles sont les conditions du véhicule VTC (5 critères) ?", choix: [
    { lettre: "A", texte: "4 à 9 places, moins de 7 ans, minimum 4 portes, 4,50 m × 1,70 m, minimum 84 kW", correct: true },
    { lettre: "B", texte: "4 à 9 places, moins de 10 ans, minimum 2 portes, aucune dimension minimale, aucune puissance minimale" },
  ]},
  { id: 26, enonce: "Le VTC peut-il exercer sur toute la France ?", choix: [
    { lettre: "A", texte: "Oui, aucune restriction géographique", correct: true },
    { lettre: "B", texte: "Non, uniquement dans sa zone de rattachement" },
  ]},
  { id: 27, enonce: "Ma voiture est en panne, puis-je prendre le véhicule personnel de ma femme pour travailler les week-ends ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non", correct: true },
  ]},
];

const T3P_EXERCICE_SECTION_6: ExerciceQuestion[] = [
  { id: 28, enonce: "Quelles sont les conditions d'accès à la profession pour les VMDTR ?", choix: [
    { lettre: "A", texte: "Expérience de 6 mois dans le transport de personnes" },
    { lettre: "B", texte: "Expérience d'un an dans le transport de personnes au cours des dix années précédant la demande", correct: true },
    { lettre: "C", texte: "Aptitude médicale", correct: true },
    { lettre: "D", texte: "Aptitude sportive" },
  ]},
  { id: 29, enonce: "Quel permis est requis pour exercer en tant que VMDTR ?", choix: [
    { lettre: "A", texte: "Permis B depuis au moins 3 ans" },
    { lettre: "B", texte: "Permis A depuis au moins 3 ans", correct: true },
    { lettre: "C", texte: "Permis A2 depuis au moins 2 ans" },
  ]},
  { id: 30, enonce: "Combien de passagers maximum un VMDTR peut-il transporter ?", choix: [
    { lettre: "A", texte: "1 seul passager" },
    { lettre: "B", texte: "2 passagers" },
    { lettre: "C", texte: "3 passagers", correct: true },
  ]},
  { id: 31, enonce: "Quel est l'âge maximum du véhicule VMDTR ?", choix: [
    { lettre: "A", texte: "Moins de 5 ans" },
    { lettre: "B", texte: "Moins de 7 ans" },
    { lettre: "C", texte: "Moins de 10 ans", correct: true },
  ]},
  { id: 32, enonce: "Quelle est la signalétique obligatoire pour les VMDTR ?", choix: [
    { lettre: "A", texte: "Vignette bleue à mettre sur un endroit visible de la moto", correct: true },
    { lettre: "B", texte: "Vignette rouge" },
    { lettre: "C", texte: "Vignette verte" },
  ]},
];

const T3P_EXERCICE_SECTION_7: ExerciceQuestion[] = [
  { id: 33, enonce: "Faut-il être titulaire de la carte professionnelle même en exerçant épisodiquement ?", choix: [
    { lettre: "A", texte: "Oui", correct: true },
    { lettre: "B", texte: "Non" },
  ]},
  { id: 34, enonce: "Quelles sont les conditions pour obtenir une carte professionnelle T3P ?", choix: [
    { lettre: "A", texte: "Satisfaire à une condition d'aptitude professionnelle (examen ou expérience)", correct: true },
    { lettre: "B", texte: "Satisfaire à une condition d'honorabilité professionnelle (casier judiciaire B2 vierge)", correct: true },
    { lettre: "C", texte: "Être titulaire d'un permis de conduire en période probatoire" },
    { lettre: "D", texte: "Être titulaire d'un permis de conduire hors période probatoire", correct: true },
  ]},
  { id: 35, enonce: "Combien de temps dispose la préfecture pour délivrer une carte professionnelle T3P ?", choix: [
    { lettre: "A", texte: "Un mois" },
    { lettre: "B", texte: "Deux mois" },
    { lettre: "C", texte: "Trois mois", correct: true },
    { lettre: "D", texte: "Quatre mois" },
  ]},
  { id: 36, enonce: "La carte professionnelle doit être apposée sur le pare-brise pendant le temps de travail ?", choix: [
    { lettre: "A", texte: "Oui", correct: true },
    { lettre: "B", texte: "Non" },
  ]},
  { id: 37, enonce: "En usage privé, doit-on apposer sa carte professionnelle sur le pare-brise ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non", correct: true },
  ]},
  { id: 38, enonce: "Où doit être apposée la carte professionnelle T3P ?", choix: [
    { lettre: "A", texte: "Sur le pare-brise, photographie visible de l'extérieur", correct: true },
    { lettre: "B", texte: "Sur le pare-brise, photographie visible de l'intérieur" },
    { lettre: "C", texte: "Sur le pare-brise, photographie non visible" },
  ]},
  { id: 39, enonce: "En cas d'arrêt définitif de la profession, doit-on rendre sa carte professionnelle ?", choix: [
    { lettre: "A", texte: "Oui", correct: true },
    { lettre: "B", texte: "Non" },
  ]},
  { id: 40, enonce: "Que doit faire un conducteur T3P lorsqu'il cesse définitivement son activité ?", choix: [
    { lettre: "A", texte: "Il garde sa carte professionnelle" },
    { lettre: "B", texte: "Il restitue sa carte professionnelle auprès de la préfecture", correct: true },
  ]},
  { id: 41, enonce: "Dans quel cas la carte professionnelle T3P peut-elle être retirée ?", choix: [
    { lettre: "A", texte: "Lorsque le casier judiciaire B2 est impacté", correct: true },
    { lettre: "B", texte: "Lorsque le conducteur part en vacances temporairement" },
    { lettre: "C", texte: "Lorsqu'il n'a pas payé ses impôts" },
  ]},
  { id: 42, enonce: "Qu'est-ce que l'honorabilité professionnelle ?", choix: [
    { lettre: "A", texte: "Avoir réussi l'examen théorique" },
    { lettre: "B", texte: "Avoir réussi l'examen pratique" },
    { lettre: "C", texte: "Avoir le casier B2 vierge", correct: true },
    { lettre: "D", texte: "Avoir le casier B3 vierge" },
  ]},
  { id: 43, enonce: "Auprès de quel organisme demander sa carte professionnelle ?", choix: [
    { lettre: "A", texte: "La mairie" },
    { lettre: "B", texte: "La préfecture", correct: true },
    { lettre: "C", texte: "La chambre des métiers et de l'artisanat" },
  ]},
];

const T3P_EXERCICE_SECTION_8: ExerciceQuestion[] = [
  { id: 44, enonce: "Condamné à 10 mois pour agression sexuelle, ai-je le droit d'exercer en tant que chauffeur VTC ou TAXI ?", choix: [
    { lettre: "A", texte: "Oui" },
    { lettre: "B", texte: "Non", correct: true },
  ]},
  { id: 45, enonce: "J'ai récidivé à un excès de vitesse de plus de 50 km/h, puis-je obtenir la carte T3P ?", choix: [
    { lettre: "A", texte: "Vrai" },
    { lettre: "B", texte: "Faux", correct: true },
  ]},
  { id: 46, enonce: "Quelles condamnations du casier B2 ne permettent pas de travailler en T3P ?", choix: [
    { lettre: "A", texte: "Avoir perdu 6 points d'un coup (délits)", correct: true },
    { lettre: "B", texte: "Avoir été condamné d'au moins 6 mois pour violence", correct: true },
    { lettre: "C", texte: "Ne pas avoir été condamné pour conduite sans permis lorsqu'il était mineur" },
    { lettre: "D", texte: "Décisions à l'encontre d'un mineur", correct: true },
  ]},
  { id: 47, enonce: "Quelles condamnations du casier B2 ne permettent pas de travailler en T3P ? (2ème série)", choix: [
    { lettre: "A", texte: "Condamnation d'au moins 6 mois pour vol", correct: true },
    { lettre: "B", texte: "Ivresse sur la voie publique (à pieds)" },
    { lettre: "C", texte: "Perte de 6 points d'un coup (délits)", correct: true },
    { lettre: "D", texte: "Condamnation d'au moins 6 mois pour escroquerie", correct: true },
  ]},
];

const T3P_EXERCICE_SECTION_9: ExerciceQuestion[] = [
  { id: 48, enonce: "Quelle est l'autorité compétente pour le T3P ?", choix: [
    { lettre: "A", texte: "Ministère de la Transition écologique et de la Cohésion des territoires", correct: true },
    { lettre: "B", texte: "Ministère de la culture" },
    { lettre: "C", texte: "Ministère de la défense" },
  ]},
  { id: 49, enonce: "Quelle autorité accorde l'agrément aux écoles de formation T3P ?", choix: [
    { lettre: "A", texte: "Le président du Conseil Régional" },
    { lettre: "B", texte: "Le président du Conseil Général" },
    { lettre: "C", texte: "Le Ministère de l'Intérieur" },
    { lettre: "D", texte: "Le préfet", correct: true },
  ]},
  { id: 50, enonce: "Quelle mission T3P se charge la préfecture ?", choix: [
    { lettre: "A", texte: "Contrôle des inscriptions aux examens" },
    { lettre: "B", texte: "Vérification des papiers d'identités lors de l'examen" },
    { lettre: "C", texte: "Application et contrôle des lois concernant les activités T3P", correct: true },
    { lettre: "D", texte: "Délivrance des cartes professionnelles TAXI, VTC, VMDTR", correct: true },
  ]},
  { id: 51, enonce: "Quelles sont les missions des chambres des métiers et de l'artisanat ?", choix: [
    { lettre: "A", texte: "Défenseur des intérêts généraux de l'artisanat", correct: true },
    { lettre: "B", texte: "Centre d'examens du code de la route" },
    { lettre: "C", texte: "Centre d'examens TAXI, VTC, VMDTR", correct: true },
  ]},
  { id: 52, enonce: "Par qui est nommé le préfet ?", choix: [
    { lettre: "A", texte: "Le président de la République", correct: true },
    { lettre: "B", texte: "Le premier ministre" },
    { lettre: "C", texte: "Le ministre de l'intérieur" },
    { lettre: "D", texte: "Le ministre des transports" },
  ]},
];

const T3P_EXERCICE_SECTION_10: ExerciceQuestion[] = [
  { id: 53, enonce: "Faut-il une attestation d'aptitude physique délivrée par un médecin agréé pour la carte TAXI ou VTC ?", choix: [
    { lettre: "A", texte: "Vrai", correct: true },
    { lettre: "B", texte: "Faux" },
  ]},
  { id: 54, enonce: "Quelle assurance est obligatoire pour exercer la fonction de chauffeur Taxi et VTC ?", choix: [
    { lettre: "A", texte: "Responsabilité civile professionnelle", correct: true },
    { lettre: "B", texte: "Assurance décès" },
    { lettre: "C", texte: "Assurance chômage" },
  ]},
  { id: 55, enonce: "La RC Pro est la Responsabilité Commerciale Professionnelle ?", choix: [
    { lettre: "A", texte: "Vrai" },
    { lettre: "B", texte: "Faux — c'est la Responsabilité Civile Professionnelle", correct: true },
  ]},
  { id: 56, enonce: "Quelle est la définition de l'assurance civile professionnelle ?", choix: [
    { lettre: "A", texte: "Devoir payer les dommages causés à autrui sans peine judiciaire" },
    { lettre: "B", texte: "Permet d'éviter de réparer les dommages causés à autrui" },
    { lettre: "C", texte: "Obligation d'indemniser les dommages causés à autrui dans un cadre professionnel", correct: true },
  ]},
  { id: 57, enonce: "Que prévoit la loi Badinter ?", choix: [
    { lettre: "A", texte: "D'indemniser tous les dommages engendrés par un accident de la circulation", correct: true },
    { lettre: "B", texte: "D'indemniser les personnes en cas d'accident au domicile" },
    { lettre: "C", texte: "De protéger les chauffeurs VTC en cas de conduite en état d'ébriété" },
  ]},
  { id: 58, enonce: "Que signifie FGAO ?", choix: [
    { lettre: "A", texte: "Fonds de Garantie des Assurances Obligatoires de dangers" },
    { lettre: "B", texte: "Fonds de Garantie des Assurances Obligatoires de dommages", correct: true },
    { lettre: "C", texte: "Fonds de Garantie des Assurances Obligations de dommages" },
  ]},
  { id: 59, enonce: "Que se passe-t-il si vous conduisez sans être assuré ?", choix: [
    { lettre: "A", texte: "Interdiction de se présenter aux examens du code pendant 8 ans" },
    { lettre: "B", texte: "Confiscation du véhicule", correct: true },
    { lettre: "C", texte: "Aucune indemnité pour vos dommages corporels ou matériels", correct: true },
    { lettre: "D", texte: "Peine de 5 ans d'emprisonnement" },
  ]},
];

const T3P_EXERCICE_SECTION_11: ExerciceQuestion[] = [
  { id: 60, enonce: "Périodicité de la visite médicale pour les conducteurs T3P de 60 à 76 ans ?", choix: [
    { lettre: "A", texte: "1 an" },
    { lettre: "B", texte: "2 ans", correct: true },
    { lettre: "C", texte: "5 ans" },
  ]},
  { id: 61, enonce: "Périodicité de la visite médicale pour les conducteurs T3P de 20 à 60 ans ?", choix: [
    { lettre: "A", texte: "1 an" },
    { lettre: "B", texte: "2 ans" },
    { lettre: "C", texte: "5 ans", correct: true },
  ]},
  { id: 62, enonce: "Périodicité de la visite médicale pour les conducteurs T3P de plus de 76 ans ?", choix: [
    { lettre: "A", texte: "1 an (chaque année)", correct: true },
    { lettre: "B", texte: "2 ans" },
    { lettre: "C", texte: "3 ans" },
  ]},
  { id: 63, enonce: "La formation continue pour les VTC, TAXIS ou VMDTR a une durée de :", choix: [
    { lettre: "A", texte: "5 h" },
    { lettre: "B", texte: "6 h" },
    { lettre: "C", texte: "14 h", correct: true },
  ]},
  { id: 64, enonce: "La formation continue obligatoire doit être passée tous les :", choix: [
    { lettre: "A", texte: "5 ans", correct: true },
    { lettre: "B", texte: "3 ans" },
    { lettre: "C", texte: "2 ans" },
  ]},
  { id: 65, enonce: "La formation continue est dispensée par :", choix: [
    { lettre: "A", texte: "Les services préfectoraux" },
    { lettre: "B", texte: "La chambre de commerce et d'industrie" },
    { lettre: "C", texte: "La chambre des métiers et de l'artisanat" },
    { lettre: "D", texte: "Les centres de formation agréés par le Préfet", correct: true },
  ]},
  { id: 66, enonce: "À quoi sert la formation continue ?", choix: [
    { lettre: "A", texte: "Mettre à jour des connaissances essentielles du secteur", correct: true },
    { lettre: "B", texte: "Se préparer à l'examen continue" },
    { lettre: "C", texte: "Échanger sur ses expériences avec les autres chauffeurs" },
  ]},
];

export const T3P_EXERCICE_PARTIE_1: ExerciceItem = {
  id: 1,
  titre: "Exercices T3P — Partie 1",
  sousTitre: "66 questions : Transport public/privé, Loi LOTI, Taxis, VTC, VMDTR, Carte professionnelle, Assurances, Formation continue",
  actif: true,
  questions: [
    ...T3P_EXERCICE_SECTION_1,
    ...T3P_EXERCICE_SECTION_2,
    ...T3P_EXERCICE_SECTION_3,
    ...T3P_EXERCICE_SECTION_4,
    ...T3P_EXERCICE_SECTION_5,
    ...T3P_EXERCICE_SECTION_6,
    ...T3P_EXERCICE_SECTION_7,
    ...T3P_EXERCICE_SECTION_8,
    ...T3P_EXERCICE_SECTION_9,
    ...T3P_EXERCICE_SECTION_10,
    ...T3P_EXERCICE_SECTION_11,
  ],
};

// ===== PARTIE 2 =====

const T3P_P2_SECTION_1: ExerciceQuestion[] = [
  { id: 1, enonce: "Quels sont les documents communs aux trois professions à présenter lors d'un contrôle routier ?", choix: [
    { lettre: "A", texte: "Carte professionnelle", correct: true },
    { lettre: "B", texte: "Certificat médical", correct: true },
    { lettre: "C", texte: "Vignette", correct: true },
    { lettre: "D", texte: "Carte grise", correct: true },
  ]},
  { id: 2, enonce: "Quels agents sont habilités à contrôler un conducteur T3P ?", choix: [
    { lettre: "A", texte: "Police nationale et Gendarmerie", correct: true },
    { lettre: "B", texte: "Agents DRIEAT/DREAL", correct: true },
    { lettre: "C", texte: "URSSAF (sans préavis en cas de travail dissimulé)", correct: true },
    { lettre: "D", texte: "DGFIP (avec avis préalable d'environ 15 jours)", correct: true },
  ]},
  { id: 3, enonce: "L'URSSAF peut-elle contrôler un conducteur T3P sans préavis ?", choix: [
    { lettre: "A", texte: "Oui, en cas de travail dissimulé", correct: true },
    { lettre: "B", texte: "Non, un avis préalable de 15 jours est toujours nécessaire" },
  ]},
  { id: 4, enonce: "Quel délai préalable la DGFIP doit-elle respecter avant un contrôle fiscal ?", choix: [
    { lettre: "A", texte: "Aucun délai, contrôle immédiat" },
    { lettre: "B", texte: "Environ 15 jours d'avis préalable", correct: true },
    { lettre: "C", texte: "1 mois d'avis préalable" },
  ]},
];

const T3P_P2_SECTION_2: ExerciceQuestion[] = [
  { id: 5, enonce: "Dans quel domaine le tribunal des prud'hommes est-il compétent ?", choix: [
    { lettre: "A", texte: "Litige entre un chauffeur locataire et son loueur" },
    { lettre: "B", texte: "Litige entre un commerçant et son fournisseur" },
    { lettre: "C", texte: "Litige avec un client" },
    { lettre: "D", texte: "Litige entre employé et employeur", correct: true },
  ]},
  { id: 6, enonce: "Quel est le dernier degré de recours de la juridiction administrative ?", choix: [
    { lettre: "A", texte: "Le Conseil constitutionnel" },
    { lettre: "B", texte: "La Cour de cassation" },
    { lettre: "C", texte: "Le Conseil d'État", correct: true },
    { lettre: "D", texte: "La cour d'assises" },
  ]},
  { id: 7, enonce: "Condamné par le tribunal de commerce, quelle juridiction pour faire appel ?", choix: [
    { lettre: "A", texte: "La cour d'appel", correct: true },
    { lettre: "B", texte: "Le tribunal administratif" },
    { lettre: "C", texte: "La Cour de cassation" },
    { lettre: "D", texte: "Le tribunal de police" },
  ]},
  { id: 8, enonce: "Litige avec un particulier, montant < 4 000 €. Quelle autorité ?", choix: [
    { lettre: "A", texte: "Le conseil de Prud'hommes" },
    { lettre: "B", texte: "Le tribunal de grande instance" },
    { lettre: "C", texte: "Le tribunal judiciaire", correct: true },
    { lettre: "D", texte: "Le tribunal de commerce" },
  ]},
  { id: 9, enonce: "Quelles sont les missions de la Cour de cassation ?", choix: [
    { lettre: "A", texte: "Elle juge les personnes accusées de crime" },
    { lettre: "B", texte: "Elle juge les affaires civiles supérieures à 7 600 euros" },
    { lettre: "C", texte: "Elle vérifie que les lois ont été correctement appliquées par les tribunaux et les cours d'appel", correct: true },
  ]},
  { id: 10, enonce: "Auprès de quel tribunal contester sa contravention ?", choix: [
    { lettre: "A", texte: "Tribunal de commerce" },
    { lettre: "B", texte: "Tribunal de police", correct: true },
    { lettre: "C", texte: "Tribunal administratif" },
  ]},
  { id: 11, enonce: "Quel tribunal est compétent pour juger un conducteur T3P qui pratique la maraude illégale ?", choix: [
    { lettre: "A", texte: "Tribunal de police" },
    { lettre: "B", texte: "Tribunal correctionnel", correct: true },
    { lettre: "C", texte: "Tribunal administratif" },
    { lettre: "D", texte: "Cour d'assises" },
  ]},
  { id: 12, enonce: "Pour contester un retrait de carte professionnelle par le préfet, quel tribunal saisir ?", choix: [
    { lettre: "A", texte: "Tribunal correctionnel" },
    { lettre: "B", texte: "Tribunal judiciaire" },
    { lettre: "C", texte: "Tribunal administratif", correct: true },
  ]},
];

const T3P_P2_SECTION_3: ExerciceQuestion[] = [
  { id: 13, enonce: "Quelles sanctions administratives risque-t-on pour non-respect de la réglementation T3P ?", choix: [
    { lettre: "A", texte: "Retrait définitif ou temporaire de carte professionnelle", correct: true },
    { lettre: "B", texte: "Avertissement", correct: true },
    { lettre: "C", texte: "Amende de 1 500 euros", correct: true },
    { lettre: "D", texte: "Amende de 15 000 €" },
  ]},
  { id: 14, enonce: "Quelle sanction pour circulation sur voie publique en quête de clients (sauf taxi dans sa zone) ?", choix: [
    { lettre: "A", texte: "375 €" },
    { lettre: "B", texte: "575 €" },
    { lettre: "C", texte: "1 an d'emprisonnement et 15 000 €", correct: true },
    { lettre: "D", texte: "1 500 € (contravention de 5ème classe)" },
  ]},
  { id: 15, enonce: "Quelle sanction pour circulation sans assurance à titre onéreux ?", choix: [
    { lettre: "A", texte: "1 000 €" },
    { lettre: "B", texte: "1 500 €", correct: true },
    { lettre: "C", texte: "2 500 €" },
  ]},
  { id: 16, enonce: "Quelle sanction pour l'exercice illégal de l'activité ?", choix: [
    { lettre: "A", texte: "1 an d'emprisonnement et 15 000 €", correct: true },
    { lettre: "B", texte: "6 mois d'emprisonnement et 15 000 €" },
    { lettre: "C", texte: "1 500 € d'amende" },
  ]},
  { id: 17, enonce: "Quelle sanction pour une location à la place ?", choix: [
    { lettre: "A", texte: "6 mois d'emprisonnement et 15 000 €" },
    { lettre: "B", texte: "1 an d'emprisonnement et 15 000 €", correct: true },
    { lettre: "C", texte: "2 ans d'emprisonnement et 15 000 €" },
  ]},
  { id: 18, enonce: "Quelle sanction pour non-apposition de la carte professionnelle ?", choix: [
    { lettre: "A", texte: "11 € (contravention de 1ère classe)", correct: true },
    { lettre: "B", texte: "17 €" },
    { lettre: "C", texte: "35 €" },
  ]},
  { id: 19, enonce: "Quelle sanction pour l'exercice sans carte professionnelle valide ?", choix: [
    { lettre: "A", texte: "975 €" },
    { lettre: "B", texte: "1 500 € (contravention de 5ème classe)", correct: true },
    { lettre: "C", texte: "3 000 €" },
  ]},
  { id: 20, enonce: "Quelle sanction pour conduite sans attestation de visite médicale ?", choix: [
    { lettre: "A", texte: "35 €" },
    { lettre: "B", texte: "95 €" },
    { lettre: "C", texte: "135 € (contravention de 4ème classe)", correct: true },
  ]},
  { id: 21, enonce: "Quel est le délai pour faire appel d'un jugement pénal ?", choix: [
    { lettre: "A", texte: "5 jours" },
    { lettre: "B", texte: "10 jours après notification du jugement", correct: true },
    { lettre: "C", texte: "30 jours" },
  ]},
  { id: 22, enonce: "Quelles sont les sanctions complémentaires pour les délits T3P ?", choix: [
    { lettre: "A", texte: "Suspension du permis pour 5 ans maximum", correct: true },
    { lettre: "B", texte: "Immobilisation du véhicule pour 1 an maximum", correct: true },
    { lettre: "C", texte: "Confiscation du véhicule", correct: true },
    { lettre: "D", texte: "Interdiction de voyager à l'étranger" },
  ]},
];

const T3P_P2_SECTION_4_TO_9: ExerciceQuestion[] = [
  // Section 4 — TPMR
  { id: 23, enonce: "Quel est le nom de la formation obligatoire pour le secteur PMR ?", choix: [
    { lettre: "A", texte: "Transport de personnes à mobilité réduite (TPMR)", correct: true },
    { lettre: "B", texte: "Transport de personnes handicapées" },
    { lettre: "C", texte: "Transport de personnes malades" },
  ]},
  { id: 24, enonce: "Quels sont les 5 critères obligatoires pour les véhicules TPMR ?", choix: [
    { lettre: "A", texte: "Homologation spécifique, place réservée PMR, dimensions intérieures minimales, ceintures 3 points, signalétique spécifique", correct: true },
    { lettre: "B", texte: "Couleur spéciale, GPS obligatoire, climatisation, siège chauffant, radio" },
  ]},
  { id: 25, enonce: "La formation TPMR est-elle obligatoire même pour un exercice occasionnel ?", choix: [
    { lettre: "A", texte: "Oui, pour toute personne intervenant à titre permanent ou occasionnel", correct: true },
    { lettre: "B", texte: "Non, seulement pour l'exercice permanent" },
  ]},
  // Section 5 — Covoiturage
  { id: 26, enonce: "À quoi correspond le tarif du covoiturage ?", choix: [
    { lettre: "A", texte: "Partage des frais sans recherche de bénéfices", correct: true },
    { lettre: "B", texte: "Partage des frais avec recherche de bénéfices" },
    { lettre: "C", texte: "Partage des frais entre passagers uniquement" },
  ]},
  { id: 27, enonce: "Quelle est la différence fondamentale entre covoiturage et T3P ?", choix: [
    { lettre: "A", texte: "Le covoiturage est à titre non onéreux, le T3P est à titre onéreux", correct: true },
    { lettre: "B", texte: "Il n'y a aucune différence" },
    { lettre: "C", texte: "Le covoiturage nécessite une carte professionnelle" },
  ]},
  { id: 28, enonce: "Un conducteur T3P peut-il faire du covoiturage pour ses propres trajets ?", choix: [
    { lettre: "A", texte: "Oui, à condition de ne pas exercer son activité professionnelle pendant ce temps", correct: true },
    { lettre: "B", texte: "Non, c'est totalement interdit" },
  ]},
  // Section 6 — Intermédiaires
  { id: 29, enonce: "Qu'est-ce qu'un intermédiaire T3P ?", choix: [
    { lettre: "A", texte: "Toute personne qui met en relation des clients avec des conducteurs T3P via une plateforme numérique", correct: true },
    { lettre: "B", texte: "Un conducteur T3P qui travaille pour plusieurs plateformes" },
  ]},
  { id: 30, enonce: "Quelles sont les obligations de l'intermédiaire (plateforme) ?", choix: [
    { lettre: "A", texte: "Vérifier que le conducteur possède une carte pro T3P valide", correct: true },
    { lettre: "B", texte: "Vérifier l'inscription du VTC au registre national", correct: true },
    { lettre: "C", texte: "S'assurer que le conducteur est bien assuré", correct: true },
    { lettre: "D", texte: "Fixer le tarif des courses sans consulter le conducteur" },
  ]},
  { id: 31, enonce: "Le conducteur VTC indépendant est-il libre de refuser des courses proposées par la plateforme ?", choix: [
    { lettre: "A", texte: "Oui, il reste libre de refuser", correct: true },
    { lettre: "B", texte: "Non, il doit accepter toutes les courses" },
  ]},
  // Section 7 — Observatoire, Comité, Commissions
  { id: 32, enonce: "Quelles sont les tâches de l'observatoire national des T3P ?", choix: [
    { lettre: "A", texte: "Il mène toute étude pour améliorer la connaissance des T3P", correct: true },
    { lettre: "B", texte: "Il établit les examens des T3P" },
    { lettre: "C", texte: "Il établit chaque année un rapport sur l'évolution des T3P", correct: true },
    { lettre: "D", texte: "Il donne des sanctions à l'une des professions T3P" },
  ]},
  { id: 33, enonce: "Qu'est-ce que le Comité national des T3P ?", choix: [
    { lettre: "A", texte: "Il débat des grands enjeux des T3P", correct: true },
    { lettre: "B", texte: "Il donne un avis sur uniquement la profession des taxis et des VTC" },
    { lettre: "C", texte: "Il comprend 50 membres au plus dont un président et un vice-président", correct: true },
    { lettre: "D", texte: "Le comité national est établi pour une durée de cinq ans", correct: true },
  ]},
  { id: 34, enonce: "Qu'est-ce que les commissions locales des T3P ?", choix: [
    { lettre: "A", texte: "Elle établit un rapport annuel sur l'activité T3P de son ressort", correct: true },
    { lettre: "B", texte: "Présidée par le préfet de département ou son représentant", correct: true },
    { lettre: "C", texte: "Présidée par le ministre des Transports" },
    { lettre: "D", texte: "Durée du mandat : trois ans", correct: true },
  ]},
  { id: 35, enonce: "Quelles personnes sont présentes aux commissions locales T3P ?", choix: [
    { lettre: "A", texte: "Le préfet ou son représentant", correct: true },
    { lettre: "B", texte: "Des représentants des collectivités territoriales", correct: true },
    { lettre: "C", texte: "Le président de la communauté d'agglomération" },
    { lettre: "D", texte: "Des représentants d'associations de consommateurs, de personnes à mobilité réduite", correct: true },
  ]},
  { id: 36, enonce: "Combien de fois se réunit la commission locale T3P ?", choix: [
    { lettre: "A", texte: "1 fois par an" },
    { lettre: "B", texte: "2 fois par an", correct: true },
    { lettre: "C", texte: "3 fois par an" },
    { lettre: "D", texte: "3 fois tous les 2 ans" },
  ]},
  { id: 37, enonce: "Quelles sont les missions de la commission locale T3P ?", choix: [
    { lettre: "A", texte: "Établir un rapport annuel pour l'observatoire", correct: true },
    { lettre: "B", texte: "Recevoir tous les renseignements et statistiques des pouvoirs publics", correct: true },
    { lettre: "C", texte: "Être informée de tous projets de nouvelles ADS", correct: true },
    { lettre: "D", texte: "Peut être saisie par une autorité organisatrice de transports", correct: true },
    { lettre: "E", texte: "Sanctionner les TAXIS et les VTC" },
  ]},
  { id: 38, enonce: "Comment est composée la commission disciplinaire T3P ?", choix: [
    { lettre: "A", texte: "3 sections spécialisées : Taxi, VTC, VMDTR", correct: true },
    { lettre: "B", texte: "Composée à parts égales du collège de l'État et du collège des professionnels", correct: true },
    { lettre: "C", texte: "L'inculpé peut venir avec une personne de son choix", correct: true },
    { lettre: "D", texte: "Composée uniquement de magistrats" },
  ]},
  // Section 8 — VSS & Discriminations
  { id: 39, enonce: "Quels sont les risques encourus pour agression sexuelle ?", choix: [
    { lettre: "A", texte: "5 ans d'emprisonnement et 55 000 € d'amende" },
    { lettre: "B", texte: "5 ans d'emprisonnement et 75 000 € d'amende", correct: true },
    { lettre: "C", texte: "5 ans d'emprisonnement et 85 000 € d'amende" },
  ]},
  { id: 40, enonce: "Quels sont les risques encourus pour outrage sexiste ou sexuel ?", choix: [
    { lettre: "A", texte: "3 750 € d'amende (délit si aggravé)", correct: true },
    { lettre: "B", texte: "3 850 €" },
    { lettre: "C", texte: "2 ans d'emprisonnement et 85 000 €" },
    { lettre: "D", texte: "5 ans d'emprisonnement et 85 000 €" },
  ]},
  { id: 41, enonce: "Quels sont les risques encourus pour harcèlement sexuel ?", choix: [
    { lettre: "A", texte: "2 ans d'emprisonnement et 10 000 €" },
    { lettre: "B", texte: "2 ans d'emprisonnement et 30 000 €", correct: true },
    { lettre: "C", texte: "4 ans d'emprisonnement et 50 000 €" },
    { lettre: "D", texte: "8 ans d'emprisonnement et 30 000 €" },
  ]},
  { id: 42, enonce: "Quels sont les risques encourus pour discrimination ?", choix: [
    { lettre: "A", texte: "Un an d'emprisonnement et 45 000 euros" },
    { lettre: "B", texte: "Deux ans d'emprisonnement et 45 000 euros" },
    { lettre: "C", texte: "Trois ans d'emprisonnement et 45 000 euros", correct: true },
    { lettre: "D", texte: "Quatre ans d'emprisonnement et 45 000 euros" },
  ]},
  { id: 43, enonce: "Quelle est la peine maximale pour un viol ?", choix: [
    { lettre: "A", texte: "5 ans de réclusion criminelle" },
    { lettre: "B", texte: "10 ans de réclusion criminelle" },
    { lettre: "C", texte: "15 ans de réclusion criminelle (voire plus)", correct: true },
    { lettre: "D", texte: "20 ans de réclusion criminelle" },
  ]},
  { id: 44, enonce: "Quels sont les 4 types d'infractions à caractère sexuel ou sexiste à connaître ?", choix: [
    { lettre: "A", texte: "Outrage sexiste, harcèlement sexuel, agression sexuelle, viol", correct: true },
    { lettre: "B", texte: "Insulte, menace, violence, meurtre" },
    { lettre: "C", texte: "Discrimination, vol, escroquerie, abus de confiance" },
  ]},
  { id: 45, enonce: "Quel est le numéro d'écoute pour les femmes victimes de violences ?", choix: [
    { lettre: "A", texte: "3918" },
    { lettre: "B", texte: "3919", correct: true },
    { lettre: "C", texte: "3939" },
    { lettre: "D", texte: "3980" },
  ]},
  { id: 46, enonce: "Quel est le numéro pour le signalement des discriminations ?", choix: [
    { lettre: "A", texte: "3928" },
    { lettre: "B", texte: "3929" },
    { lettre: "C", texte: "3930" },
    { lettre: "D", texte: "3939", correct: true },
  ]},
  { id: 47, enonce: "Quels critères de discrimination sont listés à l'article 225-1 du Code pénal ?", choix: [
    { lettre: "A", texte: "Origine, sexe, situation de famille, grossesse, apparence physique", correct: true },
    { lettre: "B", texte: "Patronyme, lieu de résidence, état de santé, handicap", correct: true },
    { lettre: "C", texte: "Appartenance à une ethnie, une nation, une religion", correct: true },
    { lettre: "D", texte: "Niveau d'études, revenus financiers, profession exercée" },
  ]},
  { id: 48, enonce: "Quels sont les bons réflexes en cas de comportement VSS ?", choix: [
    { lettre: "A", texte: "Arrêter la course, proposer d'appeler le 17, noter heure/lieu/description", correct: true },
    { lettre: "B", texte: "Ne rien faire et continuer la course" },
    { lettre: "C", texte: "Minimiser la situation" },
  ]},
  // Section 9 — Questions complémentaires
  { id: 49, enonce: "Quelle est l'amende forfaitaire d'une contravention de classe 2 ?", choix: [
    { lettre: "A", texte: "11 €" },
    { lettre: "B", texte: "35 €", correct: true },
    { lettre: "C", texte: "68 €" },
    { lettre: "D", texte: "135 €" },
  ]},
  { id: 50, enonce: "Quelle est l'amende forfaitaire d'une contravention de classe 4 ?", choix: [
    { lettre: "A", texte: "35 €" },
    { lettre: "B", texte: "68 €" },
    { lettre: "C", texte: "135 €", correct: true },
    { lettre: "D", texte: "750 €" },
  ]},
  { id: 51, enonce: "Quel est le montant maximum d'une contravention de classe 5 ?", choix: [
    { lettre: "A", texte: "750 €" },
    { lettre: "B", texte: "1 500 € (3 000 € en récidive)", correct: true },
    { lettre: "C", texte: "3 750 €" },
  ]},
  { id: 52, enonce: "Sous quel délai peut-on bénéficier de l'amende minorée ?", choix: [
    { lettre: "A", texte: "Sous 10 jours" },
    { lettre: "B", texte: "Sous 15 jours", correct: true },
    { lettre: "C", texte: "Sous 30 jours" },
  ]},
  { id: 53, enonce: "Que se passe-t-il après 45 jours sans paiement d'une amende forfaitaire ?", choix: [
    { lettre: "A", texte: "L'amende est annulée" },
    { lettre: "B", texte: "L'amende est majorée automatiquement", correct: true },
    { lettre: "C", texte: "Un rappel simple est envoyé" },
  ]},
  { id: 54, enonce: "Quelle sanction pour non-présentation de la carte professionnelle ?", choix: [
    { lettre: "A", texte: "Contravention de 1ère classe (11 €)" },
    { lettre: "B", texte: "Contravention de 2ème classe (35 €)", correct: true },
    { lettre: "C", texte: "Contravention de 4ème classe (135 €)" },
  ]},
  { id: 55, enonce: "Quel délai pour justifier la possession de la carte professionnelle après un contrôle ?", choix: [
    { lettre: "A", texte: "24 heures" },
    { lettre: "B", texte: "5 jours (sinon contravention de 4ème classe)", correct: true },
    { lettre: "C", texte: "15 jours" },
  ]},
  { id: 56, enonce: "À qui l'observatoire national adresse-t-il son rapport annuel ?", choix: [
    { lettre: "A", texte: "Au ministre des Transports directement" },
    { lettre: "B", texte: "Au Comité national des T3P", correct: true },
    { lettre: "C", texte: "Au président de la République" },
  ]},
  { id: 57, enonce: "Quelle est la durée du mandat des membres du Comité national T3P ?", choix: [
    { lettre: "A", texte: "3 ans" },
    { lettre: "B", texte: "5 ans", correct: true },
    { lettre: "C", texte: "7 ans" },
  ]},
  { id: 58, enonce: "Combien de collèges composent le Comité national T3P ?", choix: [
    { lettre: "A", texte: "2 collèges (État et professionnels)" },
    { lettre: "B", texte: "3 collèges (État, professionnels, collectivités)" },
    { lettre: "C", texte: "4 collèges (État, professionnels, collectivités, associations de défense)", correct: true },
  ]},
  { id: 59, enonce: "Les fonctions au sein du Comité national T3P sont exercées à quel titre ?", choix: [
    { lettre: "A", texte: "À titre rémunéré" },
    { lettre: "B", texte: "À titre gratuit", correct: true },
  ]},
  { id: 60, enonce: "Quelle est la définition légale du covoiturage ?", choix: [
    { lettre: "A", texte: "L'utilisation en commun d'un véhicule terrestre à moteur par un conducteur et des passagers, à titre non onéreux", correct: true },
    { lettre: "B", texte: "Un service professionnel de transport payant" },
    { lettre: "C", texte: "Un service de transport collectif organisé par une collectivité" },
  ]},
  { id: 61, enonce: "Quel est le rôle de la DGCCRF dans le contrôle T3P ?", choix: [
    { lettre: "A", texte: "Contrôle fiscal des conducteurs" },
    { lettre: "B", texte: "Contrôle des pratiques commerciales, tarifs et concurrence", correct: true },
    { lettre: "C", texte: "Délivrance des cartes professionnelles" },
  ]},
  { id: 62, enonce: "Un intermédiaire peut-il informer de façon irrégulière sur la localisation et disponibilité des véhicules ?", choix: [
    { lettre: "A", texte: "Oui, c'est une pratique courante" },
    { lettre: "B", texte: "Non, c'est une infraction de classe 5", correct: true },
  ]},
];

export const T3P_EXERCICE_PARTIE_2: ExerciceItem = {
  id: 2,
  titre: "Exercices T3P — Partie 2",
  sousTitre: "62 questions : Agents de contrôle, Juridictions, Sanctions, TPMR, Covoiturage, Intermédiaires, VSS & Discriminations",
  actif: true,
  questions: [
    ...T3P_P2_SECTION_1,
    ...T3P_P2_SECTION_2,
    ...T3P_P2_SECTION_3,
    ...T3P_P2_SECTION_4_TO_9,
  ],
};

export const T3P_EXERCICES: ExerciceItem[] = [T3P_EXERCICE_PARTIE_1, T3P_EXERCICE_PARTIE_2];
