// Données du Test de Compétences avant formation — par filière

export interface CompetenceSection {
  titre: string;
  items: string[];
}

export interface CompetencesData {
  formationLabel: string;
  formationCode: string;
  sections: CompetenceSection[];
}

// ===== Sections communes VTC & TAXI =====
const SECTIONS_COMMUNES: CompetenceSection[] = [
  {
    titre: "RÉGLEMENTATION T3P – Compétences communes",
    items: [
      "Je connais la réglementation s'appliquant aux différents modes de transport publics particuliers : taxis, VTC, véhicules motorisés à deux roues.",
      "Je connais la réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle pour les différents modes de transport publics particuliers.",
      "Je connais les obligations générales relatives aux véhicules.",
      "Je connais les obligations relatives au conducteur : d'accès et d'exercice de la profession, obligations de formation continue.",
      "Je connais la composition et le rôle des divers organismes administratifs, consultatifs et professionnels.",
      "Je connais les autorités administratives et juridictions compétentes dans le cadre de l'activité du transport public particulier de personnes.",
      "Je connais les obligations du conducteur en matière d'assurance, l'identification des assurances obligatoires et les conséquences à ne pas être assuré.",
      "Je connais les agents susceptibles de procéder à des contrôles en entreprise ou sur route et leurs prérogatives respectives ; savoir présenter les documents relatifs au conducteur et au véhicule.",
      "Je connais les sanctions administratives et/ou pénales encourues en cas d'infraction à la réglementation ainsi que les voies et délais de recours.",
      "Je connais les règles relatives à la prise en charge des personnes à mobilité réduite (PMR).",
      "J'ai des notions de réglementation s'appliquant aux transports collectifs assurés sous la forme de services occasionnels ainsi que sur le transport à la demande.",
      "J'ai des notions sur les règles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport privé.",
      "Je connais les dispositions relatives aux intermédiaires, en ce qui concerne la relation avec le conducteur.",
    ],
  },
  {
    titre: "RÉGLEMENTATION T3P – Prévention discriminations et violences sexuelles/sexistes",
    items: [
      "Je connais les comportements constituant des infractions à caractère sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcèlement sexuel, viol).",
      "Je connais les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues.",
      "Je connais les acteurs au service de la prévention en matière de violences sexuelles et sexistes et les acteurs au service de la prévention et de la lutte contre les discriminations.",
    ],
  },
];

const SECTION_SECURITE_ROUTIERE: CompetenceSection = {
  titre: "SÉCURITÉ ROUTIÈRE",
  items: [
    "Je sais appliquer les règles du code de la route (signalisation, règles de circulation, comportement du conducteur, usage de sécurité, utilisation des voies dédiées...).",
    "Je connais et évite les risques liés à l'alcoolémie, l'usage de stupéfiants, la prise de médicaments, le stress, la fatigue.",
    "Je connais les principes de conduite rationnelle pour économiser le carburant, réduire le bruit et préserver le matériel et l'environnement.",
    "Je sais appliquer les règles de sécurité concernant l'utilisation des téléphones et ordiphones dans les véhicules.",
    "Je sais respecter les obligations en matière d'entretien et de visite technique des véhicules.",
    "Je sais appliquer les règles de conduite à tenir en cas d'accident (protection des victimes, alerte des secours, premiers secours à porter...).",
    "Je sais rédiger un constat amiable d'accident matériel.",
    "Je connais la réglementation du permis de conduire (permis à points, permis probatoire, annulation, invalidation et suspension de permis).",
    "Je sais prendre en charge des passagers et leurs bagages en assurant la sécurité des personnes et des biens.",
  ],
};

const SECTION_GESTION_COMMUNE: CompetenceSection = {
  titre: "GESTION – Compétences communes",
  items: [
    "Je connais et sais appliquer les principes de base de gestion et de comptabilité.",
    "Je connais les obligations et documents comptables.",
    "Je connais les charges entrant dans le calcul du coût de revient et les classer en charges fixes et charges variables.",
    "Je connais les principes de base pour déterminer le produit d'exploitation, le bénéfice, le résultat, les charges, le seuil de rentabilité.",
    "Je connais les principes de l'amortissement.",
    "Je connais les différentes formes juridiques d'exploitation (EI, EIRL, EURL, SARL, SASU, SCOP...).",
    "Je connais les modes d'exploitation (exploitation directe, location-gérance).",
    "Je connais les différents régimes d'imposition et déclaration fiscales.",
    "Je connais les différentes formalités déclaratives.",
    "Je connais la composition et le rôle des chambres des métiers et de l'artisanat.",
    "Je définis les différents régimes sociaux (Régime général, régime social des indépendants) ; je comprends les principes de cotisations et prestations par branche (maladie, vieillesse, chômage...).",
  ],
};

const SECTION_FRANCAIS: CompetenceSection = {
  titre: "FRANÇAIS",
  items: [
    "Je comprends un texte simple ou des documents en lien, notamment, avec l'activité des transports.",
    "Je comprends et m'exprime en français pour : accueillir la clientèle, comprendre les demandes des clients, interroger les clients sur leur confort, tenir une conversation neutre et courtoise avec les clients durant le transport, prendre congé des clients.",
  ],
};

const SECTION_ANGLAIS: CompetenceSection = {
  titre: "ANGLAIS",
  items: [
    "Je comprends et m'exprime en anglais, au niveau A2 du CECRL, pour : accueillir la clientèle, comprendre les demandes simples des clients, demander des renseignements simples concernant le confort de la clientèle, tenir une conversation très simple durant le transport, prendre congé des clients.",
  ],
};

// ===== VTC =====
export const COMPETENCES_VTC: CompetencesData = {
  formationLabel: "Habilitation VTC",
  formationCode: "RS5637",
  sections: [
    ...SECTIONS_COMMUNES,
    {
      titre: "RÉGLEMENTATION – Compétences spécifiques VTC",
      items: [
        "Je connais les dispositions relatives aux exploitants VTC : modalités d'inscription au registre des VTC, règles relatives à la capacité financière.",
        "Je connais les obligations spécifiques relatives aux véhicules VTC (dimensions, puissance, âge...) et leur signalisation.",
        "Je sais établir les documents relatifs à l'exécution de la prestation VTC à présenter lors des contrôles.",
      ],
    },
    SECTION_SECURITE_ROUTIERE,
    SECTION_GESTION_COMMUNE,
    {
      titre: "GESTION – Compétences spécifiques VTC",
      items: [
        "Je sais établir un devis pour la réalisation d'une prestation et établir la facturation.",
        "Je sais calculer le coût de revient en formule simple (formule monôme et binôme).",
        "Je sais définir la notion de marge et l'utiliser pour calculer un prix de vente.",
      ],
    },
    SECTION_FRANCAIS,
    SECTION_ANGLAIS,
    {
      titre: "DÉVELOPPEMENT COMMERCIAL (spécifique VTC)",
      items: [
        "Je connais et comprends les principes généraux du marketing (analyse de marché, ciblage de l'offre, compétitivité, détermination du prix...).",
        "Je sais valoriser les qualités de la prestation commerciale VTC.",
        "Je sais fidéliser mes clients et prospecter pour en obtenir d'autres.",
        "Je sais mener des actions de communication pour faire connaître mon entreprise, notamment par internet et les moyens numériques.",
        "Je sais développer un réseau de partenaires favorisant l'accès à la clientèle (hôtels, entreprises...).",
      ],
    },
  ],
};

// ===== TAXI =====
export const COMPETENCES_TAXI: CompetencesData = {
  formationLabel: "Habilitation TAXI",
  formationCode: "RS5635",
  sections: [
    ...SECTIONS_COMMUNES,
    {
      titre: "RÉGLEMENTATION – Compétences spécifiques TAXI",
      items: [
        "Je connais le fonctionnement des équipements spéciaux obligatoires et du terminal de paiement électronique.",
        "Je connais l'articulation entre les réglementations nationales et locales pour les taxis.",
        "Je connais les régimes d'autorisation de stationnement (ADS).",
        "Je connais les règles de tarification d'une course de taxi.",
        "Je connais les activités complémentaires ouvertes aux taxis : services réguliers de transport, transport assis professionnalisé.",
        "Je sais établir les documents relatifs à l'exécution d'une course de taxi.",
      ],
    },
    SECTION_SECURITE_ROUTIERE,
    SECTION_GESTION_COMMUNE,
    {
      titre: "GESTION – Compétences spécifiques TAXI",
      items: [
        "Je connais les règles de détaxation partielle de la taxe intérieure sur la consommation des produits énergétiques (TICPE).",
        "Je connais la réglementation relative à la taxe de stationnement.",
      ],
    },
    SECTION_FRANCAIS,
    SECTION_ANGLAIS,
    {
      titre: "CONNAISSANCE DU TERRITOIRE ET RÉGLEMENTATION LOCALE (spécifique TAXI)",
      items: [
        "Je connais le territoire d'exercice de l'activité : les principaux lieux, sites, bâtiments publics et les principaux axes routiers.",
        "Je connais le règlement local en vigueur.",
      ],
    },
  ],
};

// ===== TA (Passerelle TAXI pour VTC) =====
export const COMPETENCES_TA: CompetencesData = {
  formationLabel: "Complément TAXI pour chauffeur VTC",
  formationCode: "Formation TA",
  sections: [
    {
      titre: "RÉGLEMENTATION – Compétences spécifiques TAXI (à acquérir)",
      items: [
        "Je connais le fonctionnement des équipements spéciaux obligatoires et du terminal de paiement électronique.",
        "Je connais l'articulation entre les réglementations nationales et locales pour les taxis.",
        "Je connais les régimes d'autorisation de stationnement (ADS).",
        "Je connais les règles de tarification d'une course de taxi.",
        "Je connais les activités complémentaires ouvertes aux taxis : services réguliers de transport, transport assis professionnalisé.",
        "Je sais établir les documents relatifs à l'exécution d'une course de taxi.",
      ],
    },
    {
      titre: "GESTION – Compétences spécifiques TAXI",
      items: [
        "Je connais les règles de détaxation partielle de la taxe intérieure sur la consommation des produits énergétiques (TICPE).",
        "Je connais la réglementation relative à la taxe de stationnement.",
      ],
    },
    {
      titre: "CONNAISSANCE DU TERRITOIRE ET RÉGLEMENTATION LOCALE (spécifique TAXI)",
      items: [
        "Je connais le territoire d'exercice de l'activité : les principaux lieux, sites, bâtiments publics et les principaux axes routiers.",
        "Je connais le règlement local en vigueur.",
      ],
    },
    {
      titre: "SÉCURITÉ ROUTIÈRE – Rappel et mise à niveau",
      items: [
        "Je sais appliquer les règles du code de la route (signalisation, règles de circulation, comportement du conducteur, usage de sécurité, utilisation des voies dédiées...).",
        "Je connais et évite les risques liés à l'alcoolémie, l'usage de stupéfiants, la prise de médicaments, le stress, la fatigue.",
      ],
    },
  ],
};

// ===== VA (Passerelle VTC pour TAXI) =====
export const COMPETENCES_VA: CompetencesData = {
  formationLabel: "Complément VTC pour chauffeur TAXI",
  formationCode: "Formation VA",
  sections: [
    {
      titre: "RÉGLEMENTATION – Compétences spécifiques VTC (à acquérir)",
      items: [
        "Je connais les dispositions relatives aux exploitants VTC : modalités d'inscription au registre des VTC, règles relatives à la capacité financière.",
        "Je connais les obligations spécifiques relatives aux véhicules VTC (dimensions, puissance, âge...) et leur signalisation.",
        "Je sais établir les documents relatifs à l'exécution de la prestation VTC à présenter lors des contrôles.",
      ],
    },
    {
      titre: "GESTION – Compétences spécifiques VTC",
      items: [
        "Je sais établir un devis pour la réalisation d'une prestation et établir la facturation.",
        "Je sais calculer le coût de revient en formule simple (formule monôme et binôme).",
        "Je sais définir la notion de marge et l'utiliser pour calculer un prix de vente.",
      ],
    },
    {
      titre: "DÉVELOPPEMENT COMMERCIAL (spécifique VTC)",
      items: [
        "Je connais et comprends les principes généraux du marketing (analyse de marché, ciblage de l'offre, compétitivité, détermination du prix...).",
        "Je sais valoriser les qualités de la prestation commerciale VTC.",
        "Je sais fidéliser mes clients et prospecter pour en obtenir d'autres.",
        "Je sais mener des actions de communication pour faire connaître mon entreprise, notamment par internet et les moyens numériques.",
        "Je sais développer un réseau de partenaires favorisant l'accès à la clientèle (hôtels, entreprises...).",
      ],
    },
    {
      titre: "SÉCURITÉ ROUTIÈRE – Rappel et mise à niveau",
      items: [
        "Je sais appliquer les règles du code de la route (signalisation, règles de circulation, comportement du conducteur, usage de sécurité, utilisation des voies dédiées...).",
      ],
    },
  ],
};

// Helper: get competences data by formation type
export function getCompetencesForFormation(formationType: string | null | undefined): CompetencesData {
  if (!formationType) return COMPETENCES_VTC;
  const ft = formationType.replace(/-E$/i, "").trim().toUpperCase();
  if (ft === "TA" || ft.includes("TAXI-POUR-VTC")) return COMPETENCES_TA;
  if (ft === "VA" || ft.includes("VTC-POUR-TAXI")) return COMPETENCES_VA;
  if (ft === "TAXI" || ft.includes("TAXI")) return COMPETENCES_TAXI;
  return COMPETENCES_VTC;
}
