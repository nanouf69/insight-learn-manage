// Référentiel de connaissances copié à l'identique des pages Programme VTC / TAXI du site ftransport.fr.
export interface ReferentielSection { titre: string; groupes: { sousTitre: string; items: string[] }[] }
export const REFERENTIEL: Record<"vtc" | "taxi", ReferentielSection[]> = {
 "vtc": [
  {
   "titre": "Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
   "groupes": [
    {
     "sousTitre": "Compétences communes",
     "items": [
      "Connaître la réglementation s'appliquant aux différents modes de transport publics particuliers : taxis, VTC, véhicules motorisés à deux roues",
      "Connaître la réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle pour les différents modes de transport publics particuliers",
      "Connaître les obligations générales relatives aux véhicules",
      "Connaître les obligations relatives au conducteur : d'accès et d'exercice de la profession, obligations de formation continue",
      "Connaître la composition et le rôle des divers organismes administratifs, consultatifs et professionnels",
      "Connaître les autorités administratives et juridiction compétentes dans le cadre de l'activité du transport public particulier de personnes",
      "Connaître les obligations du conducteur en matière d'assurance, l'identification des assurances obligatoires et les conséquences à ne pas être assuré",
      "Connaître les agents susceptibles de procéder à des contrôles en entreprise ou sur route et leurs prérogatives respectives ; savoir présenter les documents relatifs au conducteur et au véhicule",
      "Connaître les sanctions administratives et/ou pénales encourues en cas d'infraction à la réglementation ainsi que les voies et délais de recours",
      "Connaître les règles relatives à la prise en charge des personnes à mobilité réduite",
      "Avoir des notions de réglementation s'appliquant aux transports collectifs assurés sous la forme de services occasionnels ainsi que sur le transport à la demande",
      "Avoir des notions sur les règles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport privé",
      "Connaître les dispositions relatives aux intermédiaires, en ce qui concerne la relation avec le conducteur",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcèlement sexuel, viol)",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et les acteurs au service de la prévention et de la lutte contre les discriminations"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques VTC",
     "items": [
      "Connaître les dispositions relatives aux exploitants : les modalités d'inscription au registre des VTC, les règles relatives à la capacité financière…",
      "Connaître les obligations spécifiques relatives aux véhicules d'exploitation (dimensions, puissance, âge...) et connaître leur signalisation",
      "Savoir établir les documents relatifs à l'exécution de la prestation de transport qui doivent être présentés en cas de contrôle"
     ]
    }
   ]
  },
  {
   "titre": "Sécurité Routière",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Savoir appliquer les règles du code de la route (signalisation, règles de circulation, comportement du conducteur, usage de sécurité, utilisation des voies dédiées…)",
      "Connaître et éviter les risques liés à l'alcoolémie, l'usage de stupéfiants, la prise de médicaments, le stress, la fatigue",
      "Connaître les principes de conduite rationnelle pour économiser le carburant, réduire le bruit et préserver le matériel et l'environnement",
      "Savoir appliquer les règles de sécurité concernant l'utilisation des téléphones et ordiphones dans les véhicules",
      "Savoir respecter les obligations en matière d'entretien et de visite technique des véhicules",
      "Savoir appliquer les règles de conduite à tenir en cas d'accident (protection des victimes, alerte des secours, premiers secours à porter…)",
      "Savoir rédiger un constat amiable d'accident matériel",
      "Connaître la réglementation du permis de conduire (permis à points, permis probatoire, annulation, invalidation et suspension de permis)",
      "Savoir prendre en charge des passagers et leurs bagages en assurant la sécurité des personnes et des biens"
     ]
    }
   ]
  },
  {
   "titre": "Gestion",
   "groupes": [
    {
     "sousTitre": "Compétences communes",
     "items": [
      "Connaître les obligations et documents comptables",
      "Connaître les charges entrant dans le calcul du coût de revient et les classer en charges fixes et charges variables",
      "Connaître les principes de base pour déterminer le produit d'exploitation, le bénéfice, le résultat, les charges, le seuil de rentabilité",
      "Connaître les principes de l'amortissement",
      "Connaître les différentes formes juridiques d'exploitation (EI, EIRL, EURL, SARL, SASU, SCOP...)",
      "Connaître les modes d'exploitation (exploitation directe, location-gérance)",
      "Connaître les différents régimes d'imposition et déclaration fiscales",
      "Connaître les différentes formalités déclaratives",
      "Connaître la composition et le rôle des chambres des métiers et de l'artisanat",
      "Savoir définir les différents régimes sociaux (Régime général, régime social des indépendants) ; comprendre les principes de cotisations et prestations par branche (maladie, vieillesse, chômage…)"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques VTC",
     "items": [
      "Savoir établir un devis pour la réalisation d'une prestation et établir la facturation",
      "Savoir calculer le coût de revient en formule simple (formule monôme et binôme)",
      "Savoir définir la notion de marge et l'utiliser pour calculer un prix de vente"
     ]
    }
   ]
  },
  {
   "titre": "Français",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Comprendre un texte simple ou des documents en lien, notamment, avec l'activité des transports",
      "Accueillir la clientèle",
      "Comprendre les demandes des clients",
      "Interroger les clients sur leur confort",
      "Tenir une conversation neutre et courtoise avec les clients durant le transport",
      "Prendre congé des clients"
     ]
    }
   ]
  },
  {
   "titre": "Anglais",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Accueillir la clientèle",
      "Comprendre les demandes simples des clients",
      "Demander des renseignements simples concernant le confort de la clientèle",
      "Tenir une conversation très simple durant le transport",
      "Prendre congé des clients"
     ]
    }
   ]
  },
  {
   "titre": "Développement Commercial (Spécifique VTC)",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Connaître et comprendre les principes généraux du marketing (analyse de marché, ciblage de l'offre, compétitivité, détermination du prix...)",
      "Savoir valoriser les qualités de la prestation commerciale VTC",
      "Savoir fidéliser ses clients et prospecter pour en obtenir d'autres",
      "Savoir mener des actions de communication pour faire connaître son entreprise, notamment par internet et les moyens numériques",
      "Savoir développer un réseau de partenaires favorisant l'accès à la clientèle (hôtels, entreprise...)"
     ]
    }
   ]
  },
  {
   "titre": "Référentiel de compétences de l'épreuve pratique",
   "groupes": [
    {
     "sousTitre": "A-1 Conduite en sécurité et respect du code de la route",
     "items": [
      "Intégrer son véhicule dans la circulation sur les différents types de réseaux et d'environnement routiers (agglomération denses, route hors agglomération, voie rapides, autoroutes)",
      "Respecter l'ensemble des règles du code de la route en circulation ; signalisation, limitation de vitesse, priorité, usage des voies, croisement, dépassement...",
      "Rechercher visuellement les informations : regarder, percevoir et trier les informations sur les situations de conduite, contrôler dans les rétroviseurs, contrôler les angles morts en vision direct...",
      "Analyser les situations de conduites et prévoir leurs évolution (détecter les indices utiles, comprendre les intentions des autres usagers...)",
      "Adapter l'allure aux circonstances (type et état de la route, densité de circulation, conditions météorologiques)",
      "Respecter les distances et marges de sécurité",
      "Respecter les autres usagers et apporter toute la vigilance nécessaire aux usagers vulnérables (piétons, deux-roues)",
      "Appliquer les principes d'éco-conduite"
     ]
    },
    {
     "sousTitre": "A-2 Souplesse de la conduite assurant le confort des passagers",
     "items": [
      "Utiliser de manière souple et rationnelle les commandes du véhicule : lors des changements d'allure (utilisant des freins et de l'accélérateur), lors des changements de direction (maniement du volant, trajectoire), lors des changements de vitesse (sauf si boite de vitesse automatique)",
      "Anticiper les situations de conduite et leurs évolutions afin d'éviter les décélération ou changement de direction brutaux (ajustement de l'allure à l'approche d'un feu tricolore, anticipation des décélérations...)"
     ]
    },
    {
     "sousTitre": "A-3 Prise en charge et dépose des clients et leurs bagages",
     "items": [
      "Respecter la réglementation de l'arrêt et du stationnement",
      "Assurer la sécurité de l'arrêt par le choix de l'emplacement et le cas échéant par la gestion du risque (attirer l'attention des clients sur les véhicules circulants à proximité, utiliser les feux de détresse)",
      "Manier correctement et précautionneusement les bagages (savoir porter des charges, charger et décharger sans abimer les sacs et valises, savoir installer d'éventuels objets fragiles...)"
     ]
    },
    {
     "sousTitre": "B-1 Présentation générale et attitudes du candidat",
     "items": [
      "Avoir une tenue vestimentaire correcte et adaptée à l'activité ainsi qu'une bonne présentation générale",
      "Avoir des attitudes et comportements adaptés (démarche, geste, expression, accueil des personnes à mobilité réduite)",
      "Être discret, courtois et respectueux du client"
     ]
    },
    {
     "sousTitre": "B-2 Accueil, comportement durant le parcours et prise de congé",
     "items": [
      "Accueillir le client lors de sa montée dans le véhicule, de façon adaptée à l'activité",
      "Converser durant le parcours si le client le désire en restant neutre et discret ; veiller aux éléments de confort (température de l'habitacle, radio...)",
      "Prendre congé du client lors de l'arrivée au point de destination, de façon adaptée à l'activité"
     ]
    },
    {
     "sousTitre": "B-3 Vérification de l'état du véhicule avant et après la prestation",
     "items": [
      "Veiller au bon état et à la propreté du véhicule"
     ]
    },
    {
     "sousTitre": "C-1 Construction du parcours et accompagnement touristique",
     "items": [
      "Elaborer un parcours d'un lieu de prise en charge à un lieu de dépose des clients",
      "Utiliser un GPS (programmation, suivi de l'itinéraire) et utiliser un plan ou une carte routière",
      "Adapter le parcours à d'éventuelles difficultés inattendues (embouteillages, travaux...)"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques VTC",
     "items": [
      "Préparer un parcours en fonction de la commande des clients"
     ]
    }
   ]
  },
  {
   "titre": "Moyens Pédagogiques",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Tablettes et plateforme numérique",
      "Cours magistraux"
     ]
    }
   ]
  },
  {
   "titre": "Évaluations",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Contrôles continus et examens blancs"
     ]
    }
   ]
  }
 ],
 "taxi": [
  {
   "titre": "Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes",
   "groupes": [
    {
     "sousTitre": "Compétences communes",
     "items": [
      "Connaître la réglementation s'appliquant aux différents modes de transport publics particuliers : taxis, VTC, véhicules motorisés à deux roues",
      "Connaître la réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle pour les différents modes de transport publics particuliers",
      "Connaître les obligations générales relatives aux véhicules",
      "Connaître les obligations relatives au conducteur : d'accès et d'exercice de la profession, obligations de formation continue",
      "Connaître la composition et le rôle des divers organismes administratifs, consultatifs et professionnels",
      "Connaître les autorités administratives et juridiction compétentes dans le cadre de l'activité du transport public particulier de personnes",
      "Connaître les obligations du conducteur en matière d'assurance, l'identification des assurances obligatoires et les conséquences à ne pas être assuré",
      "Connaître les agents susceptibles de procéder à des contrôles en entreprise ou sur route et leurs prérogatives respectives ; savoir présenter les documents relatifs au conducteur et au véhicule",
      "Connaître les sanctions administratives et/ou pénales encourues en cas d'infraction à la réglementation ainsi que les voies et délais de recours",
      "Connaître les règles relatives à la prise en charge des personnes à mobilité réduite",
      "Avoir des notions de réglementation s'appliquant aux transports collectifs assurés sous la forme de services occasionnels ainsi que sur le transport à la demande",
      "Avoir des notions sur les règles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport privé",
      "Connaître les dispositions relatives aux intermédiaires, en ce qui concerne la relation avec le conducteur",
      "Connaître les comportements constituant des infractions à caractère sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcèlement sexuel, viol)",
      "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues",
      "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et les acteurs au service de la prévention et de la lutte contre les discriminations"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques TAXI",
     "items": [
      "Connaître le fonctionnement des équipements spéciaux obligatoires et du terminal de paiement électronique",
      "Connaître l'articulation entre les réglementations nationales et locales",
      "Connaître les régimes d'autorisation de stationnement",
      "Connaître les règles de tarification d'une course de Taxi",
      "Connaître les activités complémentaires ouvertes aux taxis : services réguliers de transport, transport assis professionnalisé",
      "Savoir établir les documents relatifs à l'exécution"
     ]
    }
   ]
  },
  {
   "titre": "Sécurité Routière",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Savoir appliquer les règles du code de la route (signalisation, règles de circulation, comportement du conducteur, usage de sécurité, utilisation des voies dédiées…)",
      "Connaître et éviter les risques liés à l'alcoolémie, l'usage de stupéfiants, la prise de médicaments, le stress, la fatigue",
      "Connaître les principes de conduite rationnelle pour économiser le carburant, réduire le bruit et préserver le matériel et l'environnement",
      "Savoir appliquer les règles de sécurité concernant l'utilisation des téléphones et ordiphones dans les véhicules",
      "Savoir respecter les obligations en matière d'entretien et de visite technique des véhicules",
      "Savoir appliquer les règles de conduite à tenir en cas d'accident (protection des victimes, alerte des secours, premiers secours à porter…)",
      "Savoir rédiger un constat amiable d'accident matériel",
      "Connaître la réglementation du permis de conduire (permis à points, permis probatoire, annulation, invalidation et suspension de permis)",
      "Savoir prendre en charge des passagers et leurs bagages en assurant la sécurité des personnes et des biens"
     ]
    }
   ]
  },
  {
   "titre": "Gestion",
   "groupes": [
    {
     "sousTitre": "Compétences communes",
     "items": [
      "Connaître les obligations et documents comptables",
      "Connaître les charges entrant dans le calcul du coût de revient et les classer en charges fixes et charges variables",
      "Connaître les principes de base pour déterminer le produit d'exploitation, le bénéfice, le résultat, les charges, le seuil de rentabilité",
      "Connaître les principes de l'amortissement",
      "Connaître les différentes formes juridiques d'exploitation (EI, EIRL, EURL, SARL, SASU, SCOP...)",
      "Connaître les modes d'exploitation (exploitation directe, location-gérance)",
      "Connaître les différents régimes d'imposition et déclaration fiscales",
      "Connaître les différentes formalités déclaratives",
      "Connaître la composition et le rôle des chambres des métiers et de l'artisanat",
      "Savoir définir les différents régimes sociaux (Régime général, régime social des indépendants) ; comprendre les principes de cotisations et prestations par branche (maladie, vieillesse, chômage…)"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques TAXI",
     "items": [
      "Connaître les règles de détaxation partielle de la taxe intérieure sur la consommation des produits énergétiques (TICPE)",
      "Connaître la réglementation relative à la taxe de stationnement"
     ]
    }
   ]
  },
  {
   "titre": "Français",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Comprendre un texte simple ou des documents en lien, notamment, avec l'activité des transports",
      "Comprendre et s'exprimer en français pour accueillir la clientèle"
     ]
    }
   ]
  },
  {
   "titre": "Anglais",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Accueillir la clientèle",
      "Comprendre les demandes simples des clients",
      "Demander des renseignements simples concernant le confort de la clientèle",
      "Tenir une conversation très simple durant le transport",
      "Prendre congé des clients"
     ]
    }
   ]
  },
  {
   "titre": "Connaissance du Territoire et de la Réglementation Locale (Spécifique TAXI)",
   "groupes": [
    {
     "sousTitre": "",
     "items": [
      "Connaître le territoire d'exercice de l'activité : les principaux lieux, sites, bâtiments publics et les principaux axes routiers",
      "Connaître le règlement local en vigueur"
     ]
    }
   ]
  },
  {
   "titre": "Référentiel de compétences de l'épreuve pratique",
   "groupes": [
    {
     "sousTitre": "A-1 Conduite en sécurité et respect du code de la route",
     "items": [
      "Intégrer son véhicule dans la circulation sur les différents types de réseaux et d'environnement routiers (agglomération denses, route hors agglomération, voie rapides, autoroutes)",
      "Respecter l'ensemble des règles du code de la route en circulation ; signalisation, limitation de vitesse, priorité, usage des voies, croisement, dépassement...",
      "Rechercher visuellement les informations : regarder, percevoir et trier les informations sur les situations de conduite, contrôler dans les rétroviseurs, contrôler les angles morts en vision direct...",
      "Analyser les situations de conduites et prévoir leurs évolution (détecter les indices utiles, comprendre les intentions des autres usagers...)",
      "Adapter l'allure aux circonstances (type et état de la route, densité de circulation, conditions météorologiques)",
      "Respecter les distances et marges de sécurité",
      "Respecter les autres usagers et apporter toute la vigilance nécessaire aux usagers vulnérables (piétons, deux-roues)",
      "Appliquer les principes d'éco-conduite"
     ]
    },
    {
     "sousTitre": "A-2 Souplesse de la conduite assurant le confort des passagers",
     "items": [
      "Utiliser de manière souple et rationnelle les commandes du véhicule : lors des changements d'allure, lors des changements de direction, lors des changements de vitesse (sauf si boite de vitesse automatique)",
      "Anticiper les situations de conduite et leurs évolutions afin d'éviter les décélérations ou changement de direction brutaux"
     ]
    },
    {
     "sousTitre": "A-3 Prise en charge et dépose des clients et leurs bagages",
     "items": [
      "Respecter la réglementation de l'arrêt et du stationnement",
      "Assurer la sécurité de l'arrêt par le choix de l'emplacement et le cas échéant par la gestion du risque",
      "Manier correctement et précautionneusement les bagages"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques TAXI",
     "items": [
      "Se faire héler en circulation par des clients dans le cadre de la maraude et s'arrêter en toute sécurité pour les prendre en charge",
      "Le cas échéant, utilisation des voies réservées à la circulation des véhicules des services réguliers de transport en commun"
     ]
    },
    {
     "sousTitre": "B-1 Présentation générale et attitudes du candidat",
     "items": [
      "Avoir une tenue vestimentaire correcte et adaptée à l'activité ainsi qu'une bonne présentation générale",
      "Avoir des attitudes et comportements adaptés (démarche, geste, expression, accueil des personnes à mobilité réduite)",
      "Être discret, courtois et respectueux du client"
     ]
    },
    {
     "sousTitre": "B-2 Accueil, comportement durant le parcours et prise de congé",
     "items": [
      "Accueillir le client lors de sa montée dans le véhicule, de façon adaptée à l'activité",
      "Converser durant le parcours si le client le désire en restant neutre et discret ; veiller aux éléments de confort",
      "Prendre congé du client lors de l'arrivée au point de destination, de façon adaptée à l'activité"
     ]
    },
    {
     "sousTitre": "B-3 Vérification de l'état du véhicule avant et après la prestation",
     "items": [
      "Veiller au bon état et à la propreté du véhicule"
     ]
    },
    {
     "sousTitre": "C-1 Construction du parcours et accompagnement touristique",
     "items": [
      "Elaborer un parcours d'un lieu de prise en charge à un lieu de dépose des clients",
      "Utiliser un GPS (programmation, suivi de l'itinéraire) et utiliser un plan ou une carte routière",
      "Adapter le parcours à d'éventuelles difficultés inattendues (embouteillages, travaux...)"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques TAXI",
     "items": [
      "Construire immédiatement en réponse à la demande du client pris en charge, l'itinéraire le plus adapté en s'appuyant sur la connaissance du territoire",
      "Connaître et savoir appliquer la réglementation locale de l'exploitation des taxis"
     ]
    },
    {
     "sousTitre": "C-2 Délivrance d'informations touristiques et pratiques",
     "items": [
      "Délivrer des informations de base sur les sites et monuments d'intérêts culturel et touristique situés à proximité du lieu de l'épreuve et sur les lieux publics (gare, hôpitaux etc)"
     ]
    },
    {
     "sousTitre": "D-1 Etablir le prix de la prestation, facturer et procéder à l'encaissement",
     "items": [
      "Pour les taxis, utiliser les équipements spéciaux",
      "Calculer le prix d'une course / de la mission",
      "Etablir les documents (facture)",
      "Encaisser le paiement, notamment avec un terminal de paiement électronique"
     ]
    },
    {
     "sousTitre": "Compétences spécifiques TAXI",
     "items": [
      "Utiliser des équipements spéciaux (compteur horokilométrique, dispositif lumineux, plaque horodateur, imprimante) et le terminal de paiement électronique (TPE) et contrôler leur bon fonctionnement",
      "Connaître la tarification locale applicable",
      "Calculer le coût estimatif d'une course en fonction de la durée, de la distance et des aléas de la circulation",
      "Etablir une facturation"
     ]
    }
   ]
  }
 ]
};
