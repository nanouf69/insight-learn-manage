export type QuestionType = "QCM" | "QRC";

export interface Choix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface Question {
  id: number;
  type: QuestionType;
  enonce: string;
  choix?: Choix[];
  reponseQRC?: string;
  reponses_possibles?: string[];
}

export interface Matiere {
  id: string;
  nom: string;
  duree: number; // en minutes
  coefficient: number;
  noteEliminatoire: number;
  noteSur: number;
  questions: Question[];
}

export interface ExamenBlanc {
  id: string;
  numero: number;
  type: "TAXI" | "VTC";
  titre: string;
  matieres: Matiere[];
}

// ===== MATIÈRES COMMUNES (T3P, GESTION, SÉCURITÉ ROUTIÈRE, FRANÇAIS, ANGLAIS) =====

const matiere_t3p_examen1: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Je me fais contrôler sur la route, quels documents communs aux trois professions dois-je présenter aux forces de l'ordre ?",
      reponseQRC: "Le permis de conduire. La carte professionnelle. L'attestation de formation continue. Le certificat médical. L'attestation d'assurance du véhicule. L'attestation de responsabilité civile professionnelle (RCP).",
      reponses_possibles: ["permis de conduire", "carte professionnelle", "attestation de formation", "certificat médical", "assurance", "responsabilité civile"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans votre profession ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "casier b2 vierge", "b2 vierge"]
    },
    {
      id: 3, type: "QRC", enonce: "Que devez-vous présenter aux agents susceptibles d'effectuer des contrôles pour justifier d'une réservation préalable ?",
      reponseQRC: "Un document écrit sur papier ou support électronique.",
      reponses_possibles: ["document écrit", "papier ou support électronique", "document papier ou électronique"]
    },
    {
      id: 4, type: "QRC", enonce: "Citez trois des conditions d'accès et/ou d'exercice aux professions de conducteurs de T3P :",
      reponseQRC: "Réussite à l'examen. Carte professionnelle en cours de validité. Formation continue. Aptitude médicale. Honorabilité. Assurance responsabilité civile professionnelle.",
      reponses_possibles: ["examen", "carte professionnelle", "formation continue", "aptitude médicale", "honorabilité", "assurance"]
    },
    {
      id: 5, type: "QRC", enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ?",
      reponseQRC: "Un avertissement. Un retrait temporaire. Un retrait définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif"]
    },
    {
      id: 6, type: "QCM", enonce: "Quelles sont les conditions requises pour pouvoir passer l'examen de T3P ?",
      choix: [
        { lettre: "A", texte: "Avoir son permis de conduire depuis plus de 5 ans" },
        { lettre: "B", texte: "Avoir 10 points minimum sur son permis de conduire", correct: true },
        { lettre: "C", texte: "Casier judiciaire B2 vierge", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelles sont les sanctions possibles en cas d'exercice illégal d'une des professions du T3P ?",
      choix: [
        { lettre: "A", texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
        { lettre: "B", texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
        { lettre: "C", texte: "Une amende de 1 500 € et six mois d'emprisonnement" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Pour effectuer du T3P, le véhicule doit :",
      choix: [
        { lettre: "A", texte: "Être de couleur blanche" },
        { lettre: "B", texte: "Avoir des tailles de pneumatiques fixées par décret" },
        { lettre: "C", texte: "Avoir une signalétique distinctive", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Parmi les entreprises du T3P, quelles sont celles soumises à l'obligation de s'assurer en responsabilité civile professionnelle ?",
      choix: [
        { lettre: "A", texte: "VTC et 2 ou 3 roues" },
        { lettre: "B", texte: "Le taxi, VTC et 2 ou 3 roues seulement" },
        { lettre: "C", texte: "Le taxi seulement" },
        { lettre: "D", texte: "Le taxi et le VTC seulement", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Qui délivre les agréments aux centres de formation ?",
      choix: [
        { lettre: "A", texte: "Les conseils départementaux" },
        { lettre: "B", texte: "L'association permanente des chambres de métiers et de l'artisanat" },
        { lettre: "C", texte: "Les préfectures", correct: true },
        { lettre: "D", texte: "Le ministère des transports" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Qui préside la commission locale du T3P ?",
      choix: [
        { lettre: "A", texte: "Le représentant de chaque collège à tour de rôle" },
        { lettre: "B", texte: "Le préfet ou son représentant", correct: true },
        { lettre: "C", texte: "Le directeur des transports du département" },
        { lettre: "D", texte: "Le Président de la chambre de métiers" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quelle est la durée du mandat des membres de la commission locale des T3P ?",
      choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "2 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "1 an" }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Un client avec une prescription médicale sera remboursé de son transport s'il utilise :",
      choix: [
        { lettre: "A", texte: "Un taxi conventionné ou un VTC conventionné" },
        { lettre: "B", texte: "Un VTC conventionné ou un taxi moto conventionné" },
        { lettre: "C", texte: "Un taxi conventionné, un taxi moto conventionné ou un VTC conventionné" },
        { lettre: "D", texte: "Un taxi conventionné", correct: true }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Quels agents sont habilités à effectuer un contrôle routier de conducteur de T3P ?",
      choix: [
        { lettre: "A", texte: "Les agents représentant la SNCF" },
        { lettre: "B", texte: "Les gendarmes", correct: true },
        { lettre: "C", texte: "Le juge du tribunal d'instance" },
        { lettre: "D", texte: "Les policiers", correct: true }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Parmi les condamnations suivantes, lesquelles peuvent être mentionnées au bulletin n°2 du casier judiciaire ?",
      choix: [
        { lettre: "A", texte: "Transporter des objets insalubres sans autorisation" },
        { lettre: "B", texte: "Conduire avec un taux d'alcool de 0,8g/L ou plus", correct: true },
        { lettre: "C", texte: "Transporter un détecteur de radar", correct: true },
        { lettre: "D", texte: "Poursuivre sa route après avoir occasionné un accident", correct: true }
      ]
    }
  ]
};

const matiere_gestion_examen1: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Citez deux régimes de base de la protection sociale en France.",
      reponseQRC: "Le régime général et le régime agricole.",
      reponses_possibles: ["régime général", "régime agricole", "régimes spéciaux"]
    },
    {
      id: 2, type: "QRC", enonce: "Développez le sigle URSSAF.",
      reponseQRC: "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales.",
      reponses_possibles: ["union de recouvrement", "sécurité sociale", "allocations familiales"]
    },
    {
      id: 3, type: "QCM", enonce: "À l'actif du bilan figure :",
      choix: [
        { lettre: "A", texte: "Les créances des clients", correct: true },
        { lettre: "B", texte: "Le capital" },
        { lettre: "C", texte: "Le bénéfice de l'année" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Quelle mention n'est pas obligatoire sur le bulletin de salaire ?",
      choix: [
        { lettre: "A", texte: "Le montant net à payer" },
        { lettre: "B", texte: "Le diplôme du salarié", correct: true },
        { lettre: "C", texte: "La convention collective applicable" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "La SAS est sur le plan juridique :",
      choix: [
        { lettre: "A", texte: "Une personne juridique" },
        { lettre: "B", texte: "Une personne morale", correct: true },
        { lettre: "C", texte: "Une personne professionnelle" },
        { lettre: "D", texte: "Une personne physique" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Dans un bilan comptable, un amortissement fait baisser :",
      choix: [
        { lettre: "A", texte: "Les charges" },
        { lettre: "B", texte: "Le bénéfice", correct: true },
        { lettre: "C", texte: "L'imposition" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "La libération totale du capital social dans une SARL doit intervenir au plus tard dans un délai de :",
      choix: [
        { lettre: "A", texte: "99 ans" },
        { lettre: "B", texte: "5 ans", correct: true },
        { lettre: "C", texte: "10 ans" },
        { lettre: "D", texte: "1 an" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Les montants figurant dans le compte de résultat sont :",
      choix: [
        { lettre: "A", texte: "HT", correct: true },
        { lettre: "B", texte: "TTC" },
        { lettre: "C", texte: "BIC" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Au 1er janvier 2016, j'achète un véhicule 20 000€ HT amortissable sur 4 ans, et un ordinateur 600€ HT sur 3 ans. Quelle est la dotation d'amortissement déductible en 2017 ?",
      choix: [
        { lettre: "A", texte: "5 300 €" },
        { lettre: "B", texte: "5 200 €", correct: true },
        { lettre: "C", texte: "10 400 €" },
        { lettre: "D", texte: "4 198 €" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Existe-t-il une durée minimale pour un contrat à durée déterminée ?",
      choix: [
        { lettre: "A", texte: "1 mois" },
        { lettre: "B", texte: "Pas de durée minimale", correct: true },
        { lettre: "C", texte: "7 jours" },
        { lettre: "D", texte: "15 jours" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Pour une entreprise sous statut SARL, la TVA est :",
      choix: [
        { lettre: "A", texte: "Une charge financière" },
        { lettre: "B", texte: "Une charge" },
        { lettre: "C", texte: "Un mouvement de trésorerie", correct: true },
        { lettre: "D", texte: "Un produit" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Quelle est la dépense qui ne constitue pas une charge pour l'entreprise ?",
      choix: [
        { lettre: "A", texte: "Intérêt d'un prêt professionnel" },
        { lettre: "B", texte: "Abonnement à une revue professionnelle" },
        { lettre: "C", texte: "Remboursement du capital d'un prêt professionnel", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Je peux être gérant minoritaire d'une entreprise individuelle ?",
      choix: [
        { lettre: "A", texte: "Sous certaines conditions" },
        { lettre: "B", texte: "Oui" },
        { lettre: "C", texte: "Non", correct: true }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Quel statut du conjoint du chef d'entreprise ne convient pas à l'entreprise individuelle ?",
      choix: [
        { lettre: "A", texte: "Conjoint salarié" },
        { lettre: "B", texte: "Conjoint hors statut" },
        { lettre: "C", texte: "Conjoint associé", correct: true },
        { lettre: "D", texte: "Conjoint collaborateur" }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Vous empruntez 25 000€ sur 5 ans, l'annuité est de 5 600€. Quel est le coût de l'emprunt ?",
      choix: [
        { lettre: "A", texte: "4 200 €" },
        { lettre: "B", texte: "3 000 €", correct: true },
        { lettre: "C", texte: "3 600 €" }
      ]
    },
    {
      id: 16, type: "QCM", enonce: "Qu'est-ce qu'un chiffre d'affaires ?",
      choix: [
        { lettre: "A", texte: "L'argent qui reste en banque après avoir payé toutes les charges" },
        { lettre: "B", texte: "L'ensemble des commandes ou devis" },
        { lettre: "C", texte: "L'ensemble des sommes facturées aux clients", correct: true },
        { lettre: "D", texte: "La différence entre les produits et les charges" }
      ]
    }
  ]
};

const matiere_securite_examen1: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Pour faire établir une nouvelle carte grise lors d'un changement de domicile, le propriétaire dispose de :",
      choix: [
        { lettre: "A", texte: "3 semaines" },
        { lettre: "B", texte: "1 mois", correct: true },
        { lettre: "C", texte: "15 jours" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En agglomération éclairée la nuit :",
      choix: [
        { lettre: "A", texte: "Je dois rouler en feux de croisement" },
        { lettre: "B", texte: "Je peux rouler en feux de position", correct: true },
        { lettre: "C", texte: "Je peux rouler en feux de croisement" },
        { lettre: "D", texte: "Je peux rouler sans feux" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Sur les routes à 2x2 voies séparées par une ligne continue, la vitesse est limitée à :",
      choix: [
        { lettre: "A", texte: "90 km/h" },
        { lettre: "B", texte: "110 km/h", correct: true },
        { lettre: "C", texte: "130 km/h" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Les éléments qui favorisent le risque d'aquaplanage sont :",
      choix: [
        { lettre: "A", texte: "Une grande quantité d'eau sur la chaussée", correct: true },
        { lettre: "B", texte: "Une vitesse élevée", correct: true },
        { lettre: "C", texte: "Une route sèche" },
        { lettre: "D", texte: "Un fort vent latéral" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "En agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
      choix: [
        { lettre: "A", texte: "100 m" },
        { lettre: "B", texte: "40 m" },
        { lettre: "C", texte: "50 m", correct: true },
        { lettre: "D", texte: "30 m" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "La roue de secours est-elle obligatoire dans une voiture ?",
      choix: [
        { lettre: "A", texte: "Non, la réglementation française ne l'impose pas", correct: true },
        { lettre: "B", texte: "Oui, il s'agit d'un équipement de sécurité" },
        { lettre: "C", texte: "Oui, il s'agit d'une obligation européenne" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Que faut-il faire en cas d'incendie dans un tunnel ?",
      choix: [
        { lettre: "A", texte: "Réduire la distance de sécurité à l'arrêt pour faciliter l'accès des secours" },
        { lettre: "B", texte: "Faire un demi-tour avec son véhicule pour fuir au plus vite" },
        { lettre: "C", texte: "Laisser les clefs de contact sur le véhicule, après avoir éteint le moteur", correct: true },
        { lettre: "D", texte: "Évacuer le tunnel par l'issue de secours la plus proche", correct: true }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "En roulant à 90 km/h, un conducteur doit laisser une distance de sécurité de :",
      choix: [
        { lettre: "A", texte: "20 mètres environ" },
        { lettre: "B", texte: "80 mètres environ" },
        { lettre: "C", texte: "50 mètres environ", correct: true },
        { lettre: "D", texte: "30 mètres environ" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Conduire durant une période de suspension :",
      choix: [
        { lettre: "A", texte: "Je commets un délit", correct: true },
        { lettre: "B", texte: "Je risque un retrait de 6 points de mon permis de conduire" },
        { lettre: "C", texte: "Il ne peut pas y avoir de retrait de point" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Je dépasse un cycliste hors agglomération, je dois laisser un espace de sécurité :",
      choix: [
        { lettre: "A", texte: "De 2,50 m" },
        { lettre: "B", texte: "De 1 m" },
        { lettre: "C", texte: "De 1,5 m", correct: true }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "En cas de non-paiement, une amende forfaitaire devient majorée à l'issue d'un délai de :",
      choix: [
        { lettre: "A", texte: "30 jours" },
        { lettre: "B", texte: "40 jours" },
        { lettre: "C", texte: "45 jours", correct: true }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Hors agglomération, à quelle distance d'un danger les panneaux de signalisation sont-ils placés ?",
      choix: [
        { lettre: "A", texte: "50 m" },
        { lettre: "B", texte: "200 m" },
        { lettre: "C", texte: "100 m" },
        { lettre: "D", texte: "150 m", correct: true }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "Les témoins sur le tableau de bord qui alertent d'une urgence mécanique sont de couleur :",
      choix: [
        { lettre: "A", texte: "Bleue" },
        { lettre: "B", texte: "Rouge", correct: true },
        { lettre: "C", texte: "Orange" },
        { lettre: "D", texte: "Verte" }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "Un permis B permet de transporter au maximum :",
      choix: [
        { lettre: "A", texte: "7 passagers" },
        { lettre: "B", texte: "8 passagers", correct: true },
        { lettre: "C", texte: "9 passagers" },
        { lettre: "D", texte: "6 passagers" }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Si mon temps de réaction augmente :",
      choix: [
        { lettre: "A", texte: "La distance de réaction augmente", correct: true },
        { lettre: "B", texte: "La distance d'arrêt augmente", correct: true },
        { lettre: "C", texte: "La distance de freinage augmente" },
        { lettre: "D", texte: "La distance d'arrêt est inchangée" }
      ]
    }
  ]
};

const matiere_francais_examen1: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Selon l'auteur, comment peut-on expliquer le comportement agressif de certains automobilistes ?",
      reponseQRC: "La voiture est vécue comme une sphère privée, le prolongement de l'habitat, ce qui explique des comportements agressifs face à tout écart perçu comme une agression à la propriété privée.",
      reponses_possibles: ["sphère privée", "prolongement de l'habitat", "agression", "comportements agressifs"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce qui a permis de mettre en évidence les différents comportements routiers ?",
      reponseQRC: "L'attitude est porteuse de sens, sinon d'intentions, ce qui a permis de mettre en évidence les différents comportements routiers.",
      reponses_possibles: ["attitude", "comportements", "mise en évidence"]
    },
    {
      id: 3, type: "QRC", enonce: "Disposer d'une voiture est synonyme d'avantage selon vous. Développez votre réponse.",
      reponseQRC: "Oui : raccourcir le temps de trajet, liberté de déplacement. Mais cela crée aussi des comportements agressifs, de la pollution et des accidents.",
      reponses_possibles: ["temps de trajet", "liberté", "pollution", "accidents", "comportements"]
    },
    {
      id: 4, type: "QCM", enonce: "Selon l'auteur, après quel événement l'automobile est-elle devenue symbole de liberté individuelle ?",
      choix: [
        { lettre: "A", texte: "Après la démocratisation", correct: true },
        { lettre: "B", texte: "Après la première guerre mondiale" },
        { lettre: "C", texte: "Après la révolution industrielle" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Que signifie l'expression « conducteur exacerbé » employée par l'auteur ?",
      choix: [
        { lettre: "A", texte: "Le conducteur est désorienté" },
        { lettre: "B", texte: "Le conducteur éprouve une forte colère", correct: true },
        { lettre: "C", texte: "Le conducteur est paisible" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Que signifie la voiture après la 1ère guerre mondiale ?",
      choix: [
        { lettre: "A", texte: "La liberté", correct: true },
        { lettre: "B", texte: "La contrainte" },
        { lettre: "C", texte: "Un danger" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "La voiture permet :",
      choix: [
        { lettre: "A", texte: "De raccourcir le temps de trajet", correct: true },
        { lettre: "B", texte: "De modifier les rapports spatiotemporels de la personne" },
        { lettre: "C", texte: "De montrer que l'on est riche" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "D'après le texte, disposer d'une voiture pour l'homme signifie :",
      choix: [
        { lettre: "A", texte: "Être intelligent" },
        { lettre: "B", texte: "Être fort", correct: true },
        { lettre: "C", texte: "Être beau" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Quelles sont les autres fonctions de la voiture citées dans le texte ?",
      choix: [
        { lettre: "A", texte: "Elle permet d'afficher son rang", correct: true },
        { lettre: "B", texte: "Elle permet de faire des économies" },
        { lettre: "C", texte: "Elle permet de voyager gratuitement" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "La voiture est vue :",
      choix: [
        { lettre: "A", texte: "Comme une chose personnelle", correct: true },
        { lettre: "B", texte: "Comme un objet public" }
      ]
    }
  ]
};

const matiere_anglais_examen1: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Which currency can I use to pay for the trip?",
      choix: [
        { lettre: "A", texte: "I only accept cash and card", correct: true },
        { lettre: "B", texte: "It's possible to pay by cheques" },
        { lettre: "C", texte: "You can only pay in Euro" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Sorry! It's quite expensive for us. May we get a ......... price?",
      choix: [
        { lettre: "A", texte: "Less" },
        { lettre: "B", texte: "Reduction" },
        { lettre: "C", texte: "Lower", correct: true },
        { lettre: "D", texte: "Gooder" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Are you sure it is the shortest way? Traduisez :",
      choix: [
        { lettre: "A", texte: "Vous vous êtes trompé d'adresse" },
        { lettre: "B", texte: "Je ne suis pas certain que ce soit le bon endroit" },
        { lettre: "C", texte: "Êtes-vous sûr de prendre le chemin le plus court ?", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "France has ......... places to visit.",
      choix: [
        { lettre: "A", texte: "Lots of", correct: true },
        { lettre: "B", texte: "A lot of" },
        { lettre: "C", texte: "A many" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Ma voiture ne démarre pas. Traduisez en anglais :",
      choix: [
        { lettre: "A", texte: "My car doesn't start" },
        { lettre: "B", texte: "My car won't start", correct: true },
        { lettre: "C", texte: "My car didn't start" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Votre séjour s'est-il bien passé ? En anglais :",
      choix: [
        { lettre: "A", texte: "Where would you like to go?" },
        { lettre: "B", texte: "Did you enjoy your stay?", correct: true },
        { lettre: "C", texte: "How was your trip?" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Your passenger plans to stay in Guadeloupe for a fortnight. Que veut dire 'fortnight' ?",
      choix: [
        { lettre: "A", texte: "Quatre nuits" },
        { lettre: "B", texte: "Deux semaines", correct: true },
        { lettre: "C", texte: "Un long séjour" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Can I eat in your car?",
      choix: [
        { lettre: "A", texte: "No I am not" },
        { lettre: "B", texte: "No I would prefer you wait", correct: true },
        { lettre: "C", texte: "No I don't have this music" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "That's fine, keep the change. Traduisez :",
      choix: [
        { lettre: "A", texte: "C'est bon, je veux faire le change" },
        { lettre: "B", texte: "C'est bon, gardez la monnaie", correct: true },
        { lettre: "C", texte: "C'est bien, j'avais besoin de monnaie" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Don't forget to give me a bill, please.",
      choix: [
        { lettre: "A", texte: "Of course, I will prepare it as soon as we arrive", correct: true },
        { lettre: "B", texte: "Sorry, I don't know Bill" },
        { lettre: "C", texte: "Of course, I give you them when we arrive" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "How long are you staying in town? Traduisez :",
      choix: [
        { lettre: "A", texte: "Est-ce que vous vivez en ville ?" },
        { lettre: "B", texte: "Pourquoi êtes-vous en ville ?" },
        { lettre: "C", texte: "Vous restez longtemps en ville ?", correct: true }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Do you mind if I smoke in the car, sir? Traduisez :",
      choix: [
        { lettre: "A", texte: "Ai-je le droit de fumer dans la voiture, monsieur ?" },
        { lettre: "B", texte: "Est-ce que ça vous dérange si je fume dans la voiture, monsieur ?", correct: true },
        { lettre: "C", texte: "Puis-je fumer dans la voiture, monsieur ?" },
        { lettre: "D", texte: "Est-ce possible de fumer dans la voiture, monsieur ?" }
      ]
    },
    {
      id: 13, type: "QCM", enonce: "A quel nom dois-je établir la facture ? En anglais :",
      choix: [
        { lettre: "A", texte: "What is the name of the bill?" },
        { lettre: "B", texte: "What name do I put on the bill?", correct: true },
        { lettre: "C", texte: "Which name for the bill?" }
      ]
    },
    {
      id: 14, type: "QCM", enonce: "No vacancies. Que signifie cette enseigne ?",
      choix: [
        { lettre: "A", texte: "Pas de vacances" },
        { lettre: "B", texte: "Pas de vacanciers" },
        { lettre: "C", texte: "Complet", correct: true }
      ]
    },
    {
      id: 15, type: "QCM", enonce: "Have you been a driver for a long time?",
      choix: [
        { lettre: "A", texte: "I have been a driver for half past four" },
        { lettre: "B", texte: "I've been a driver since 1990", correct: true },
        { lettre: "C", texte: "I was a driver in the 90's" },
        { lettre: "D", texte: "I've been a driver for 27 years" }
      ]
    }
  ]
};

// ===== MATIÈRE SPÉCIFIQUE TAXI =====
const matiere_reglementation_taxi_examen1: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Développez le sigle TICPE.",
      reponseQRC: "Taxe Intérieure sur la Consommation des Produits Énergétiques.",
      reponses_possibles: ["taxe intérieure", "consommation", "produits énergétiques"]
    },
    {
      id: 2, type: "QRC", enonce: "Je veux passer mon véhicule professionnel en véhicule personnel pour la journée. Que dois-je faire ?",
      reponseQRC: "Bâcher le lumineux. Éteindre le taximètre. Retirer la carte professionnelle.",
      reponses_possibles: ["bâcher le lumineux", "éteindre le taximètre", "retirer la carte professionnelle"]
    },
    {
      id: 3, type: "QRC", enonce: "Lorsqu'un titulaire ne peut exploiter lui-même son autorisation de stationnement, quelles sont les deux possibilités qui s'offrent à lui ?",
      reponseQRC: "La location du véhicule taxi à un conducteur de taxi. L'emploi d'un salarié.",
      reponses_possibles: ["location", "conducteur de taxi", "emploi d'un salarié", "salarié"]
    },
    {
      id: 4, type: "QCM", enonce: "Le taximètre mesure :",
      choix: [
        { lettre: "A", texte: "La distance parcourue et le temps d'attente", correct: true },
        { lettre: "B", texte: "La vitesse du véhicule" },
        { lettre: "C", texte: "La consommation de carburant" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "L'autorisation de stationnement (ADS) d'un taxi est délivrée par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le maire de la commune", correct: true },
        { lettre: "C", texte: "La chambre de métiers" },
        { lettre: "D", texte: "Le conseil régional" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "La carte professionnelle de taxi est valable :",
      choix: [
        { lettre: "A", texte: "1 an" },
        { lettre: "B", texte: "3 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Un taxi peut-il refuser une course ?",
      choix: [
        { lettre: "A", texte: "Jamais" },
        { lettre: "B", texte: "Oui, en fin de service ou pour des motifs légitimes", correct: true },
        { lettre: "C", texte: "Oui, à tout moment et sans justification" }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen1: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le tarimètre (taximètre) doit être homologué par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Un organisme agréé par le ministère", correct: true },
        { lettre: "C", texte: "La chambre de métiers" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "La formation continue obligatoire pour les conducteurs de taxi est de :",
      choix: [
        { lettre: "A", texte: "14h tous les 5 ans", correct: true },
        { lettre: "B", texte: "7h par an" },
        { lettre: "C", texte: "21h tous les 3 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En cas de perte de la carte professionnelle de taxi, le conducteur doit :",
      choix: [
        { lettre: "A", texte: "Continuer à exercer en attendant le renouvellement" },
        { lettre: "B", texte: "Cesser toute activité jusqu'à obtention d'un duplicata", correct: true },
        { lettre: "C", texte: "Exercer sous la responsabilité de son employeur" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le tarif taxi est fixé par :",
      choix: [
        { lettre: "A", texte: "Le chauffeur librement" },
        { lettre: "B", texte: "Le préfet après avis de la commission locale", correct: true },
        { lettre: "C", texte: "Le maire de la commune" },
        { lettre: "D", texte: "Le client par négociation" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le lumineux d'un taxi doit être de couleur :",
      choix: [
        { lettre: "A", texte: "Verte" },
        { lettre: "B", texte: "Jaune orangée", correct: true },
        { lettre: "C", texte: "Blanche" },
        { lettre: "D", texte: "Rouge" }
      ]
    }
  ]
};

// ===== MATIÈRE SPÉCIFIQUE VTC =====
const matiere_reglementation_vtc_examen1: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce qu'une plateforme de mise en relation (application VTC) ?",
      reponseQRC: "C'est une plateforme numérique qui met en relation des clients avec des conducteurs VTC. Elle n'est pas responsable du transport mais facilite la réservation.",
      reponses_possibles: ["plateforme", "mise en relation", "clients", "conducteurs", "réservation"]
    },
    {
      id: 2, type: "QRC", enonce: "Quels sont les documents obligatoires pour exercer en tant que VTC ?",
      reponseQRC: "La carte professionnelle VTC. L'attestation d'assurance. La carte grise du véhicule. Le certificat de visite technique.",
      reponses_possibles: ["carte professionnelle", "assurance", "carte grise", "contrôle technique"]
    },
    {
      id: 3, type: "QCM", enonce: "La carte professionnelle VTC est délivrée par :",
      choix: [
        { lettre: "A", texte: "La mairie" },
        { lettre: "B", texte: "La préfecture", correct: true },
        { lettre: "C", texte: "Le tribunal de commerce" },
        { lettre: "D", texte: "L'URSSAF" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Un VTC peut-il stationner sur une borne de taxis ?",
      choix: [
        { lettre: "A", texte: "Oui, si la borne est vide" },
        { lettre: "B", texte: "Non, c'est interdit", correct: true },
        { lettre: "C", texte: "Oui, mais seulement la nuit" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "La vignette distinctive obligatoire d'un VTC est de couleur :",
      choix: [
        { lettre: "A", texte: "Jaune" },
        { lettre: "B", texte: "Bleue" },
        { lettre: "C", texte: "Rouge", correct: true },
        { lettre: "D", texte: "Verte" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un conducteur VTC peut-il prendre des clients en maraude (dans la rue) ?",
      choix: [
        { lettre: "A", texte: "Oui, si le client lève le bras" },
        { lettre: "B", texte: "Non, toute course doit faire l'objet d'une réservation préalable", correct: true },
        { lettre: "C", texte: "Oui, après 22h" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Quelle est la puissance fiscale minimale requise pour un véhicule VTC ?",
      choix: [
        { lettre: "A", texte: "5 CV" },
        { lettre: "B", texte: "7 CV", correct: true },
        { lettre: "C", texte: "9 CV" },
        { lettre: "D", texte: "4 CV" }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen1: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Le registre des VTC (REVTC) est tenu par :",
      choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "Le ministère chargé des transports", correct: true },
        { lettre: "C", texte: "La chambre de commerce" },
        { lettre: "D", texte: "L'URSSAF" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "La formation continue obligatoire pour les conducteurs VTC est de :",
      choix: [
        { lettre: "A", texte: "14h tous les 5 ans", correct: true },
        { lettre: "B", texte: "7h par an" },
        { lettre: "C", texte: "21h tous les 3 ans" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un VTC doit retourner à sa base ou dans un lieu non public entre deux courses. C'est :",
      choix: [
        { lettre: "A", texte: "Obligatoire uniquement en Île-de-France" },
        { lettre: "B", texte: "Obligatoire sur tout le territoire national", correct: true },
        { lettre: "C", texte: "Optionnel" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La capacité minimale d'un véhicule VTC est de :",
      choix: [
        { lettre: "A", texte: "3 places assises" },
        { lettre: "B", texte: "4 places assises hors conducteur", correct: true },
        { lettre: "C", texte: "5 places au total" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "L'inscription au registre VTC doit être renouvelée :",
      choix: [
        { lettre: "A", texte: "Tous les ans" },
        { lettre: "B", texte: "Tous les 5 ans", correct: true },
        { lettre: "C", texte: "Tous les 3 ans" },
        { lettre: "D", texte: "Elle est permanente" }
      ]
    }
  ]
};

// ===== EXAMEN BLANC N°1 =====
export const examenBlanc1Taxi: ExamenBlanc = {
  id: "eb1-taxi",
  numero: 1,
  type: "TAXI",
  titre: "Examen Blanc N°1 - Formation TAXI",
  matieres: [
    matiere_t3p_examen1,
    matiere_gestion_examen1,
    matiere_securite_examen1,
    matiere_francais_examen1,
    matiere_anglais_examen1,
    matiere_reglementation_taxi_examen1,
    matiere_reglementation_taxi2_examen1
  ]
};

export const examenBlanc1VTC: ExamenBlanc = {
  id: "eb1-vtc",
  numero: 1,
  type: "VTC",
  titre: "Examen Blanc N°1 - Formation VTC",
  matieres: [
    matiere_t3p_examen1,
    matiere_gestion_examen1,
    matiere_securite_examen1,
    matiere_francais_examen1,
    matiere_anglais_examen1,
    matiere_reglementation_vtc_examen1,
    matiere_reglementation_vtc2_examen1
  ]
};

// ===== EXAMEN BLANC N°2 - Questions différentes =====
const matiere_t3p_examen2: Matiere = {
  id: "t3p",
  nom: "A - Transport Public Particulier de Personnes (T3P)",
  duree: 45,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Citez trois des conditions d'accès et/ou d'exercice aux professions de conducteurs de T3P :",
      reponseQRC: "Réussite à l'examen. Carte professionnelle en cours de validité. Formation continue. Aptitude médicale. Honorabilité.",
      reponses_possibles: ["examen", "carte professionnelle", "formation continue", "aptitude médicale", "honorabilité"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles sont les sanctions possibles qui peuvent être décidées par les commissions disciplinaires locales ?",
      reponseQRC: "Un avertissement. Un retrait temporaire. Un retrait définitif de la carte professionnelle.",
      reponses_possibles: ["avertissement", "retrait temporaire", "retrait définitif"]
    },
    {
      id: 3, type: "QRC", enonce: "Que devez-vous présenter aux agents pour justifier d'une réservation préalable ?",
      reponseQRC: "Un document écrit sur support papier ou électronique.",
      reponses_possibles: ["document écrit", "papier ou électronique"]
    },
    {
      id: 4, type: "QRC", enonce: "Qu'est-ce que l'honorabilité dans votre profession ?",
      reponseQRC: "Avoir le casier judiciaire B2 vierge.",
      reponses_possibles: ["casier judiciaire b2 vierge", "b2 vierge", "casier b2"]
    },
    {
      id: 5, type: "QRC", enonce: "Je me fais contrôler sur la route. Quels documents communs dois-je présenter aux forces de l'ordre ?",
      reponseQRC: "Le permis de conduire. La carte professionnelle. L'attestation de formation continue. Le certificat médical. L'attestation d'assurance. L'attestation RCP.",
      reponses_possibles: ["permis de conduire", "carte professionnelle", "formation continue", "certificat médical", "assurance"]
    },
    {
      id: 6, type: "QCM", enonce: "Quelles sont les conditions requises pour passer l'examen T3P ?",
      choix: [
        { lettre: "A", texte: "Avoir son permis depuis plus de 3 ans", correct: true },
        { lettre: "B", texte: "Être âgé de 21 ans minimum" },
        { lettre: "C", texte: "Avoir un casier judiciaire B2 vierge", correct: true }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Les sanctions en cas d'exercice illégal d'une profession T3P ?",
      choix: [
        { lettre: "A", texte: "Une amende de 30 000 € et deux ans d'emprisonnement" },
        { lettre: "B", texte: "Une amende de 15 000 € et un an d'emprisonnement", correct: true },
        { lettre: "C", texte: "Une amende de 1 500 € et six mois d'emprisonnement" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Parmi les entreprises du T3P, lesquelles sont soumises à l'obligation d'assurance RCP ?",
      choix: [
        { lettre: "A", texte: "VTC et 2 ou 3 roues" },
        { lettre: "B", texte: "Le taxi, VTC et 2 ou 3 roues" },
        { lettre: "C", texte: "Le taxi seulement" },
        { lettre: "D", texte: "Le taxi et le VTC seulement", correct: true }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Pour effectuer du T3P, le véhicule doit :",
      choix: [
        { lettre: "A", texte: "Être de couleur blanche" },
        { lettre: "B", texte: "Avoir des pneumatiques fixés par décret" },
        { lettre: "C", texte: "Avoir une signalétique distinctive", correct: true }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Qui délivre les agréments aux centres de formation ?",
      choix: [
        { lettre: "A", texte: "Les conseils départementaux" },
        { lettre: "B", texte: "L'association permanente des chambres de métiers" },
        { lettre: "C", texte: "Les préfectures", correct: true },
        { lettre: "D", texte: "Le ministère des transports" }
      ]
    },
    {
      id: 11, type: "QCM", enonce: "Qui préside la commission locale du T3P ?",
      choix: [
        { lettre: "A", texte: "Le représentant de chaque collège à tour de rôle" },
        { lettre: "B", texte: "Le préfet ou son représentant", correct: true },
        { lettre: "C", texte: "Le directeur des transports" },
        { lettre: "D", texte: "Le Président de la chambre de métiers" }
      ]
    },
    {
      id: 12, type: "QCM", enonce: "Durée du mandat des membres de la commission locale des T3P ?",
      choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "2 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "1 an" }
      ]
    }
  ]
};

const matiere_gestion_examen2: Matiere = {
  id: "gestion",
  nom: "B - Gestion",
  duree: 45,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que la TVA ? Développez le sigle.",
      reponseQRC: "Taxe sur la Valeur Ajoutée. C'est un impôt indirect sur la consommation, collecté par les entreprises pour le compte de l'État.",
      reponses_possibles: ["taxe sur la valeur ajoutée", "impôt", "consommation"]
    },
    {
      id: 2, type: "QRC", enonce: "Qu'est-ce qu'un bilan comptable ?",
      reponseQRC: "Le bilan est un document comptable qui présente la situation patrimoniale de l'entreprise à une date donnée, avec l'actif (ce que l'entreprise possède) et le passif (ce qu'elle doit).",
      reponses_possibles: ["situation patrimoniale", "actif", "passif", "document comptable"]
    },
    {
      id: 3, type: "QCM", enonce: "Le résultat d'exploitation est :",
      choix: [
        { lettre: "A", texte: "La différence entre produits et charges d'exploitation", correct: true },
        { lettre: "B", texte: "Le chiffre d'affaires total" },
        { lettre: "C", texte: "La trésorerie disponible" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "L'auto-entrepreneur (micro-entrepreneur) est soumis à :",
      choix: [
        { lettre: "A", texte: "L'impôt sur les sociétés" },
        { lettre: "B", texte: "L'impôt sur le revenu dans la catégorie BIC", correct: true },
        { lettre: "C", texte: "L'impôt forfaitaire" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le seuil de chiffre d'affaires pour le régime micro-entrepreneur (VTC/Taxi) est :",
      choix: [
        { lettre: "A", texte: "72 600 € HT" },
        { lettre: "B", texte: "176 200 € HT" },
        { lettre: "C", texte: "188 700 € HT", correct: true }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Un véhicule utilisé à 70% pour l'activité professionnelle : quelle part des charges est déductible ?",
      choix: [
        { lettre: "A", texte: "100%" },
        { lettre: "B", texte: "70%", correct: true },
        { lettre: "C", texte: "50%" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Les cotisations sociales d'un auto-entrepreneur sont calculées sur :",
      choix: [
        { lettre: "A", texte: "Le bénéfice net" },
        { lettre: "B", texte: "Le chiffre d'affaires brut", correct: true },
        { lettre: "C", texte: "Le salaire minimum" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "L'amortissement d'un véhicule professionnel VTC s'effectue généralement sur :",
      choix: [
        { lettre: "A", texte: "2 ans" },
        { lettre: "B", texte: "4 ans" },
        { lettre: "C", texte: "5 ans", correct: true },
        { lettre: "D", texte: "10 ans" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Un conducteur VTC/Taxi peut déduire ses frais de repas si :",
      choix: [
        { lettre: "A", texte: "Il mange toujours au restaurant" },
        { lettre: "B", texte: "Ils sont engagés dans le cadre de son activité professionnelle", correct: true },
        { lettre: "C", texte: "Il facture plus de 50 000€ par an" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le compte de résultat permet de savoir si l'entreprise :",
      choix: [
        { lettre: "A", texte: "Est solvable" },
        { lettre: "B", texte: "A réalisé un bénéfice ou une perte", correct: true },
        { lettre: "C", texte: "Dispose de liquidités suffisantes" }
      ]
    }
  ]
};

const matiere_securite_examen2: Matiere = {
  id: "securite",
  nom: "C - Sécurité routière",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La distance de freinage double quand la vitesse :",
      choix: [
        { lettre: "A", texte: "Double" },
        { lettre: "B", texte: "Triple" },
        { lettre: "C", texte: "Augmente de 40%" },
        { lettre: "D", texte: "Double, la distance de freinage quadruple", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En ville, la vitesse maximale autorisée en zone 30 est de :",
      choix: [
        { lettre: "A", texte: "20 km/h" },
        { lettre: "B", texte: "30 km/h", correct: true },
        { lettre: "C", texte: "50 km/h" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Le taux d'alcoolémie maximal autorisé pour un conducteur professionnel est de :",
      choix: [
        { lettre: "A", texte: "0,5 g/L de sang" },
        { lettre: "B", texte: "0,2 g/L de sang", correct: true },
        { lettre: "C", texte: "0,8 g/L de sang" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "En cas de crevaison, le conducteur doit :",
      choix: [
        { lettre: "A", texte: "Freiner brusquement" },
        { lettre: "B", texte: "Tenir fermement le volant et ralentir progressivement", correct: true },
        { lettre: "C", texte: "Accélérer pour s'éloigner du danger" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Le délai légal pour déclarer un accident matériel à l'assurance est de :",
      choix: [
        { lettre: "A", texte: "24 heures" },
        { lettre: "B", texte: "5 jours ouvrés", correct: true },
        { lettre: "C", texte: "15 jours" },
        { lettre: "D", texte: "1 mois" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "L'éco-conduite permet de réduire la consommation de carburant d'environ :",
      choix: [
        { lettre: "A", texte: "5%" },
        { lettre: "B", texte: "15%", correct: true },
        { lettre: "C", texte: "30%" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "Sur autoroute, la distance de sécurité minimale doit être :",
      choix: [
        { lettre: "A", texte: "50 mètres" },
        { lettre: "B", texte: "La distance parcourue en 2 secondes", correct: true },
        { lettre: "C", texte: "100 mètres fixes" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "Quelle infraction entraîne la perte de 6 points sur le permis ?",
      choix: [
        { lettre: "A", texte: "Excès de vitesse de plus de 50 km/h", correct: true },
        { lettre: "B", texte: "Utilisation du téléphone en conduisant" },
        { lettre: "C", texte: "Stationnement interdit" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Un véhicule doit obligatoirement passer le contrôle technique tous les :",
      choix: [
        { lettre: "A", texte: "2 ans", correct: true },
        { lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "3 ans" },
        { lettre: "D", texte: "4 ans" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Le port de la ceinture de sécurité est :",
      choix: [
        { lettre: "A", texte: "Obligatoire uniquement sur autoroute" },
        { lettre: "B", texte: "Obligatoire pour tous les occupants du véhicule", correct: true },
        { lettre: "C", texte: "Obligatoire seulement pour le conducteur" }
      ]
    }
  ]
};

const matiere_francais_examen2: Matiere = {
  id: "francais",
  nom: "D - Capacité d'expression et de compréhension en langue française",
  duree: 30,
  coefficient: 2,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Rédigez un message professionnel pour confirmer un rendez-vous avec un client.",
      reponseQRC: "Madame, Monsieur, Je vous confirme notre rendez-vous le [date] à [heure]. Je serai présent à [lieu]. Cordialement, [Nom].",
      reponses_possibles: ["confirme", "rendez-vous", "date", "heure", "cordialement"]
    },
    {
      id: 2, type: "QRC", enonce: "Comment accueillez-vous un client dans votre véhicule ? Développez votre réponse.",
      reponseQRC: "Je salue le client poliment, je l'aide avec ses bagages si nécessaire, je confirme sa destination, je m'assure de son confort et je lui signale les options disponibles (climatisation, musique).",
      reponses_possibles: ["salue", "politesse", "destination", "confort", "bagages"]
    },
    {
      id: 3, type: "QCM", enonce: "Quel est le ton approprié dans une communication professionnelle ?",
      choix: [
        { lettre: "A", texte: "Familier et détendu" },
        { lettre: "B", texte: "Courtois, clair et professionnel", correct: true },
        { lettre: "C", texte: "Froid et distant" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Un client se plaint du trajet. Comment réagissez-vous ?",
      choix: [
        { lettre: "A", texte: "Vous l'ignorez" },
        { lettre: "B", texte: "Vous l'écoutez, vous expliquez et vous proposez une solution", correct: true },
        { lettre: "C", texte: "Vous lui dites qu'il a tort" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Qu'est-ce qu'un service de qualité dans le transport VTC/Taxi ?",
      choix: [
        { lettre: "A", texte: "Arriver le plus vite possible" },
        { lettre: "B", texte: "Ponctualité, courtoisie, véhicule propre, conduite apaisée", correct: true },
        { lettre: "C", texte: "Proposer le tarif le moins cher" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Dans quelle situation un conducteur peut-il parler au téléphone ?",
      choix: [
        { lettre: "A", texte: "Avec un kit mains-libres et seulement si nécessaire", correct: true },
        { lettre: "B", texte: "En tenant le téléphone si le client l'appelle" },
        { lettre: "C", texte: "Jamais, même avec un kit mains-libres" }
      ]
    }
  ]
};

const matiere_anglais_examen2: Matiere = {
  id: "anglais",
  nom: "E - Capacité d'expression et de compréhension en langue anglaise",
  duree: 30,
  coefficient: 1,
  noteEliminatoire: 4,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "Where would you like to go? Traduisez :",
      choix: [
        { lettre: "A", texte: "Où habitez-vous ?" },
        { lettre: "B", texte: "Où voulez-vous aller ?", correct: true },
        { lettre: "C", texte: "D'où venez-vous ?" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "I'll be there in ten minutes. Traduisez :",
      choix: [
        { lettre: "A", texte: "Je suis là depuis dix minutes" },
        { lettre: "B", texte: "J'y serai dans dix minutes", correct: true },
        { lettre: "C", texte: "Il était là il y a dix minutes" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Could you please open the trunk? Que demande le client ?",
      choix: [
        { lettre: "A", texte: "D'ouvrir la fenêtre" },
        { lettre: "B", texte: "D'ouvrir le coffre", correct: true },
        { lettre: "C", texte: "D'ouvrir la porte arrière" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Is the airport far from here?",
      choix: [
        { lettre: "A", texte: "L'aéroport est-il loin d'ici ?", correct: true },
        { lettre: "B", texte: "Pouvez-vous aller à l'aéroport ?" },
        { lettre: "C", texte: "Combien coûte l'aéroport ?" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Please fasten your seatbelt. Que signifie cette phrase ?",
      choix: [
        { lettre: "A", texte: "Fermez la portière, s'il vous plaît" },
        { lettre: "B", texte: "Veuillez attacher votre ceinture", correct: true },
        { lettre: "C", texte: "Asseyez-vous, s'il vous plaît" }
      ]
    },
    {
      id: 6, type: "QCM", enonce: "Can you recommend a good restaurant? Que demande le passager ?",
      choix: [
        { lettre: "A", texte: "S'arrêter dans un restaurant" },
        { lettre: "B", texte: "De recommander un bon restaurant", correct: true },
        { lettre: "C", texte: "D'appeler un restaurant" }
      ]
    },
    {
      id: 7, type: "QCM", enonce: "What time does your shift end? Que vous demande-t-on ?",
      choix: [
        { lettre: "A", texte: "À quelle heure commence votre service ?" },
        { lettre: "B", texte: "À quelle heure se termine votre service ?", correct: true },
        { lettre: "C", texte: "Combien d'heures travaillez-vous ?" }
      ]
    },
    {
      id: 8, type: "QCM", enonce: "I've left my luggage in your car. Que signifie cette phrase ?",
      choix: [
        { lettre: "A", texte: "J'ai laissé mes bagages dans votre voiture", correct: true },
        { lettre: "B", texte: "J'ai perdu mes bagages" },
        { lettre: "C", texte: "Pouvez-vous porter mes bagages ?" }
      ]
    },
    {
      id: 9, type: "QCM", enonce: "Is it possible to pay by credit card?",
      choix: [
        { lettre: "A", texte: "Est-il possible de payer par carte bancaire ?", correct: true },
        { lettre: "B", texte: "Acceptez-vous les chèques ?" },
        { lettre: "C", texte: "Quel est le prix de la course ?" }
      ]
    },
    {
      id: 10, type: "QCM", enonce: "Could you please turn down the music?",
      choix: [
        { lettre: "A", texte: "Pouvez-vous baisser la musique, s'il vous plaît ?", correct: true },
        { lettre: "B", texte: "Pouvez-vous mettre de la musique ?" },
        { lettre: "C", texte: "Pouvez-vous éteindre la radio ?" }
      ]
    }
  ]
};

// Examens 2 Taxi & VTC (matières spécifiques légèrement différentes)
const matiere_reglementation_taxi_examen2: Matiere = {
  id: "reglementation_taxi",
  nom: "F(T) - Connaissance du territoire et réglementation locale TAXI",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Qu'est-ce que l'autorisation de stationnement (ADS) pour un taxi ?",
      reponseQRC: "L'ADS est une autorisation administrative délivrée par le maire permettant à son titulaire d'exercer la profession de taxi sur le territoire de la commune.",
      reponses_possibles: ["autorisation administrative", "maire", "commune", "profession de taxi"]
    },
    {
      id: 2, type: "QRC", enonce: "Dans quels cas le taxi peut-il utiliser les voies réservées aux bus ?",
      reponseQRC: "Le taxi peut utiliser les voies réservées aux bus lorsque c'est explicitement indiqué sur les panneaux de signalisation.",
      reponses_possibles: ["voies bus", "signalisation", "autorisé", "panneaux"]
    },
    {
      id: 3, type: "QCM", enonce: "Le tarif B d'un taxi s'applique :",
      choix: [
        { lettre: "A", texte: "En agglomération de jour" },
        { lettre: "B", texte: "La nuit, les week-ends et jours fériés", correct: true },
        { lettre: "C", texte: "Pour les courses longue distance" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le reçu remis au client par le taxi doit mentionner :",
      choix: [
        { lettre: "A", texte: "Uniquement le montant total" },
        { lettre: "B", texte: "Le montant, le numéro de taxi, la date et le trajet", correct: true },
        { lettre: "C", texte: "Le nom du chauffeur uniquement" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un taxi en maraude (disponible) doit avoir son compteur en position :",
      choix: [
        { lettre: "A", texte: "Marche avec tarif A" },
        { lettre: "B", texte: "Arrêt", correct: true },
        { lettre: "C", texte: "Marche en veille" }
      ]
    }
  ]
};

const matiere_reglementation_taxi2_examen2: Matiere = {
  id: "reglementation_taxi2",
  nom: "G(T) - Réglementation nationale TAXI et gestion propre à cette activité",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La géolocalisation des taxis est obligatoire pour :",
      choix: [
        { lettre: "A", texte: "Tous les taxis en France" },
        { lettre: "B", texte: "Les taxis ayant plus de 3 ans d'exercice" },
        { lettre: "C", texte: "Les taxis opérant dans les agglomérations de plus de 100 000 habitants", correct: true }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "En cas de litige sur le prix d'une course, que peut faire le client ?",
      choix: [
        { lettre: "A", texte: "Appeler la police immédiatement" },
        { lettre: "B", texte: "Contacter la commission locale des T3P ou la DGCCRF", correct: true },
        { lettre: "C", texte: "Refuser de payer" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "Un taxi peut transporter des animaux :",
      choix: [
        { lettre: "A", texte: "Jamais" },
        { lettre: "B", texte: "Seulement les petits animaux en cage" },
        { lettre: "C", texte: "Oui, avec l'accord du conducteur", correct: true }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La durée maximale de travail journalière d'un chauffeur de taxi salarié est de :",
      choix: [
        { lettre: "A", texte: "8 heures" },
        { lettre: "B", texte: "10 heures" },
        { lettre: "C", texte: "12 heures", correct: true },
        { lettre: "D", texte: "14 heures" }
      ]
    }
  ]
};

const matiere_reglementation_vtc_examen2: Matiere = {
  id: "reglementation_vtc",
  nom: "F(V) - Développement commercial et gestion propre à l'activité de VTC",
  duree: 30,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QRC", enonce: "Comment fonctionne le système de notation dans les applications VTC ?",
      reponseQRC: "Le client note le conducteur après chaque course (généralement de 1 à 5 étoiles). Une mauvaise note répétée peut entraîner la suspension ou l'exclusion de la plateforme.",
      reponses_possibles: ["notation", "étoiles", "client", "suspension", "plateforme"]
    },
    {
      id: 2, type: "QRC", enonce: "Quelles sont les obligations du VTC envers le passager à mobilité réduite (PMR) ?",
      reponseQRC: "Le VTC doit accepter le transport des PMR si son véhicule est adapté. Il doit aider à l'embarquement/débarquement et transporter le fauteuil roulant.",
      reponses_possibles: ["PMR", "accepter", "adapté", "fauteuil roulant", "aide"]
    },
    {
      id: 3, type: "QCM", enonce: "Un VTC peut-il afficher ses tarifs à l'extérieur du véhicule ?",
      choix: [
        { lettre: "A", texte: "Oui, librement" },
        { lettre: "B", texte: "Non, aucun affichage extérieur de tarif n'est autorisé", correct: true },
        { lettre: "C", texte: "Seulement la nuit" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "La commission prélevée par une plateforme VTC représente en moyenne :",
      choix: [
        { lettre: "A", texte: "5 à 10%" },
        { lettre: "B", texte: "15 à 30%", correct: true },
        { lettre: "C", texte: "40 à 50%" }
      ]
    },
    {
      id: 5, type: "QCM", enonce: "Un VTC peut-il exercer dans n'importe quelle ville de France ?",
      choix: [
        { lettre: "A", texte: "Non, uniquement dans la ville d'immatriculation" },
        { lettre: "B", texte: "Oui, sur tout le territoire national", correct: true },
        { lettre: "C", texte: "Seulement dans sa région" }
      ]
    }
  ]
};

const matiere_reglementation_vtc2_examen2: Matiere = {
  id: "reglementation_vtc2",
  nom: "G(V) - Réglementation nationale spécifique à l'activité de VTC",
  duree: 20,
  coefficient: 3,
  noteEliminatoire: 6,
  noteSur: 20,
  questions: [
    {
      id: 1, type: "QCM", enonce: "La durée minimale d'une course VTC est fixée par :",
      choix: [
        { lettre: "A", texte: "Le conducteur" },
        { lettre: "B", texte: "La loi Thévenoud", correct: true },
        { lettre: "C", texte: "La plateforme" }
      ]
    },
    {
      id: 2, type: "QCM", enonce: "Le conducteur VTC a l'obligation de communiquer le prix avant la course. C'est :",
      choix: [
        { lettre: "A", texte: "Optionnel" },
        { lettre: "B", texte: "Obligatoire", correct: true },
        { lettre: "C", texte: "Obligatoire seulement pour les trajets longue distance" }
      ]
    },
    {
      id: 3, type: "QCM", enonce: "En cas de contrôle, le conducteur VTC doit pouvoir justifier :",
      choix: [
        { lettre: "A", texte: "D'une réservation préalable électronique ou papier", correct: true },
        { lettre: "B", texte: "Uniquement de sa carte professionnelle" },
        { lettre: "C", texte: "Du montant de la course" }
      ]
    },
    {
      id: 4, type: "QCM", enonce: "Le conducteur VTC peut-il proposer un service de taxi conventionné santé ?",
      choix: [
        { lettre: "A", texte: "Oui, sans condition" },
        { lettre: "B", texte: "Oui, s'il est conventionné par l'Assurance Maladie", correct: true },
        { lettre: "C", texte: "Non, ce service est réservé aux taxis" }
      ]
    }
  ]
};

export const examenBlanc2Taxi: ExamenBlanc = {
  id: "eb2-taxi",
  numero: 2,
  type: "TAXI",
  titre: "Examen Blanc N°2 - Formation TAXI",
  matieres: [
    matiere_t3p_examen2,
    matiere_gestion_examen2,
    matiere_securite_examen2,
    matiere_francais_examen2,
    matiere_anglais_examen2,
    matiere_reglementation_taxi_examen2,
    matiere_reglementation_taxi2_examen2
  ]
};

export const examenBlanc2VTC: ExamenBlanc = {
  id: "eb2-vtc",
  numero: 2,
  type: "VTC",
  titre: "Examen Blanc N°2 - Formation VTC",
  matieres: [
    matiere_t3p_examen2,
    matiere_gestion_examen2,
    matiere_securite_examen2,
    matiere_francais_examen2,
    matiere_anglais_examen2,
    matiere_reglementation_vtc_examen2,
    matiere_reglementation_vtc2_examen2
  ]
};

// ===== EXAMENS 3, 4, 5, 6 - Variantes avec questions supplémentaires =====
// Pour les examens 3-6, on réutilise la même structure avec des numéros différents
// En pratique il faudrait importer les autres fichiers docx

const createExamen = (num: number, type: "TAXI" | "VTC"): ExamenBlanc => {
  const baseExamen = num % 2 === 1 ? (type === "TAXI" ? examenBlanc1Taxi : examenBlanc1VTC)
                                    : (type === "TAXI" ? examenBlanc2Taxi : examenBlanc2VTC);
  return {
    ...baseExamen,
    id: `eb${num}-${type.toLowerCase()}`,
    numero: num,
    titre: `Examen Blanc N°${num} - Formation ${type}`,
    matieres: baseExamen.matieres.map(m => ({
      ...m,
      questions: m.questions.map((q, idx) => ({ ...q, id: idx + 1 }))
    }))
  };
};

export const examenBlanc3Taxi = createExamen(3, "TAXI");
export const examenBlanc3VTC = createExamen(3, "VTC");
export const examenBlanc4Taxi = createExamen(4, "TAXI");
export const examenBlanc4VTC = createExamen(4, "VTC");
export const examenBlanc5Taxi = createExamen(5, "TAXI");
export const examenBlanc5VTC = createExamen(5, "VTC");
export const examenBlanc6Taxi = createExamen(6, "TAXI");
export const examenBlanc6VTC = createExamen(6, "VTC");

export const tousLesExamens: ExamenBlanc[] = [
  examenBlanc1Taxi, examenBlanc1VTC,
  examenBlanc2Taxi, examenBlanc2VTC,
  examenBlanc3Taxi, examenBlanc3VTC,
  examenBlanc4Taxi, examenBlanc4VTC,
  examenBlanc5Taxi, examenBlanc5VTC,
  examenBlanc6Taxi, examenBlanc6VTC,
];
