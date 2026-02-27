// Données des slides T3P Partie 1 — Réglementation du Transport Public Particulier de Personnes

export interface SlideBlock {
  heading: string;
  color: string;
  points: string[];
}

export interface SlideBase {
  type: string;
  title: string;
}

export interface SlideTitleType extends SlideBase {
  type: "title";
  subtitle?: string;
  footer?: string;
  brand?: string;
}

export interface SlideSommaireType extends SlideBase {
  type: "sommaire";
  items: { n: string; label: string; page: number }[];
}

export interface SlideSectionType extends SlideBase {
  type: "section";
  subtitle?: string;
}

export interface SlideContentType extends SlideBase {
  type: "content";
  ref?: string;
  intro?: string;
  blocks?: SlideBlock[];
  keyRule?: string;
}

export interface SlideTableType extends SlideBase {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface SlideChiffresType extends SlideBase {
  type: "chiffres";
  items: { val: string; desc: string }[];
}

export type Slide = SlideTitleType | SlideSommaireType | SlideSectionType | SlideContentType | SlideTableType | SlideChiffresType;

export const T3P_PARTIE1_SLIDES: Slide[] = [
  {
    type: "title",
    title: "RÉGLEMENTATION DU TRANSPORT PUBLIC PARTICULIER DE PERSONNES",
    subtitle: "et prévention des discriminations et des violences sexuelles et sexistes",
    footer: "Arrêté du 20 mars 2024 — En vigueur depuis le 1ᵉʳ avril 2024",
    brand: "FTRANSPORT - SERVICES PRO • Formation certifiée Qualiopi • Éligible CPF • Lyon"
  },
  {
    type: "sommaire",
    title: "SOMMAIRE — Plan du cours",
    items: [
      { n: "1", label: "Transport public ou transport privé ?", page: 3 },
      { n: "2", label: "Le transport public collectif", page: 5 },
      { n: "3", label: "La loi LOTI — Définition du T3P", page: 12 },
      { n: "4", label: "Non-inscription aux examens T3P", page: 14 },
      { n: "5", label: "Réglementation des Taxis", page: 16 },
      { n: "6", label: "Réglementation des VTC", page: 25 },
      { n: "6b", label: "Réglementation des VMDTR", page: 30 },
      { n: "7", label: "Organismes autour du T3P + Centres de formation", page: 35 },
      { n: "8", label: "Les assurances obligatoires", page: 39 },
      { n: "9", label: "Formation continue et visite médicale", page: 42 },
    ]
  },
  {
    type: "section",
    title: "1. Transport public ou transport privé ?",
    subtitle: "Comprendre la classification fondamentale du transport de personnes"
  },
  {
    type: "content",
    title: "Transport public ou transport privé ?",
    intro: "Avant d'aborder la réglementation des taxis et des VTC, il est indispensable de comprendre comment le transport de personnes est classifié en France. Cette distinction détermine quelles règles s'appliquent et qui a besoin d'une carte professionnelle.",
    blocks: [
      {
        heading: "TRANSPORT PRIVÉ — Pour compte propre",
        color: "#e74c3c",
        points: [
          "Transport pour son propre compte, sans ouvrir le service au public.",
          "Aucune autorisation administrative spécifique n'est requise.",
          "Pas de carte professionnelle T3P nécessaire.",
          "Exemple : entreprise avec son propre minibus pour ses salariés."
        ]
      },
      {
        heading: "TRANSPORT PUBLIC — Pour compte d'autrui",
        color: "#2980b9",
        points: [
          "Transport pour un CLIENT, contre rémunération.",
          "Service ouvert à quiconque souhaite l'utiliser.",
          "Des autorisations administratives sont nécessaires.",
          "Exemple : école commandant un car, client appelant un taxi."
        ]
      }
    ],
    keyRule: "Règle clé : TRANSPORT PRIVÉ = pour soi-même, pas de carte pro. TRANSPORT PUBLIC = pour un client, contre paiement = réglementation obligatoire."
  },
  {
    type: "content",
    title: "Le transport public — Deux grandes familles",
    intro: "Le transport PUBLIC se divise en deux grandes catégories. La distinction est fondamentale : elle détermine si vous avez besoin d'une carte professionnelle T3P ou non.",
    blocks: [
      {
        heading: "TRANSPORT PUBLIC COLLECTIF",
        color: "#27ae60",
        points: [
          "Services réguliers : Bus TCL, métro, TER — Horaires et lignes FIXES",
          "Services à la demande : Transport flexible selon réservations usagers",
          "Services occasionnels : Cars tourisme, sorties — Groupes, billet collectif"
        ]
      },
      {
        heading: "TRANSPORT PUBLIC PARTICULIER (T3P)",
        color: "#e67e22",
        points: [
          "🚕 TAXI — Maraude dans la zone, ADS obligatoire, Tarif réglementé",
          "🚗 VTC — Réservation obligatoire, Registre national, Tarif libre",
          "🏍 VMDTR — Moto/3-roues, Max 1 passager, Réservation obligatoire"
        ]
      }
    ],
    keyRule: "À retenir : Seul le transport PUBLIC PARTICULIER (T3P) nécessite une carte professionnelle. Taxi, VTC et VMDTR sont les 3 professions T3P."
  },
  {
    type: "section",
    title: "2.1 — Les services réguliers",
    subtitle: "Dessertes urbaines et interurbaines à horaires et trajets fixes"
  },
  {
    type: "content",
    title: "Les services réguliers",
    ref: "Art. L3111-1 Code des transports — Loi 2015-990 du 6 août 2015",
    intro: "Les services réguliers sont la forme la plus connue du transport collectif. Ce sont les lignes de bus, de métro, de tramway que vous empruntez au quotidien.",
    blocks: [
      {
        heading: "DÉFINITION LÉGALE",
        color: "#2c3e50",
        points: [
          "Services collectifs offerts à la place, dont les ITINÉRAIRES, POINTS D'ARRÊT, HORAIRES, FRÉQUENCES et TARIFS sont fixés et publiés à l'avance.",
          "Ils peuvent être URBAINS ou EXTRA-URBAINS. Les transports scolaires en font partie.",
          "Organisés par des collectivités locales (AOM).",
          "Depuis 2015 : liaisons > 100 km sur initiative privée (Flixbus, BlaBlaBus)."
        ]
      },
      {
        heading: "CE QUI CARACTÉRISE UN SERVICE RÉGULIER",
        color: "#2980b9",
        points: [
          "Itinéraire FIXE — ne change pas selon les passagers.",
          "Horaires PUBLICS — connus à l'avance par tous.",
          "Tarif UNIQUE et identique pour tous les usagers.",
          "Ouvert à TOUS sans réservation obligatoire."
        ]
      }
    ],
    keyRule: "Les conducteurs de services réguliers (bus, tramway, TER) n'ont PAS besoin d'une carte professionnelle T3P."
  },
  {
    type: "section",
    title: "2.2 — Les services à la demande (TAD)",
    subtitle: "Transport flexible entre le collectif et le particulier"
  },
  {
    type: "content",
    title: "Les services à la demande (TAD)",
    ref: "Art. L3111-1 Code des transports",
    intro: "Les TAD sont une forme hybride de transport collectif. Contrairement aux lignes régulières, ils n'ont pas d'itinéraire fixe, mais restent organisés collectivement.",
    blocks: [
      {
        heading: "DÉFINITION LÉGALE",
        color: "#8e44ad",
        points: [
          "Services collectifs DÉTERMINÉS EN PARTIE en fonction de la demande des usagers.",
          "Tarification établie à l'avance — véhicules de 4 places minimum.",
          "Pas d'itinéraire fixe ni d'horaire précis.",
          "Organisés par des professionnels sous l'autorité d'une collectivité."
        ]
      },
      {
        heading: "DIFFÉRENCES AVEC UN TAXI",
        color: "#c0392b",
        points: [
          "COLLECTIF : plusieurs passagers dans le même véhicule.",
          "TARIF RÉGLEMENTÉ par la collectivité à l'avance.",
          "ORGANISÉ par une autorité publique.",
          "Pas de carte professionnelle T3P requise pour les conducteurs TAD."
        ]
      }
    ]
  },
  {
    type: "section",
    title: "2.3 — Les services occasionnels",
    subtitle: "Transport de groupes à la demande d'un donneur d'ordre"
  },
  {
    type: "content",
    title: "Les services occasionnels",
    intro: "Transport collectif ponctuel, organisé pour un groupe précis. Réglementation stricte depuis 2017.",
    blocks: [
      {
        heading: "DÉFINITION ET OBLIGATIONS",
        color: "#d35400",
        points: [
          "Transports de groupes d'au moins 2 personnes, à l'initiative d'un donneur d'ordre.",
          "Exemples : autocar colonie, visite touristique, concert.",
          "Inscription au Registre DREAL obligatoire.",
          "Réservation préalable avec BILLET COLLECTIF."
        ]
      },
      {
        heading: "⚠ RÈGLE DEPUIS LE 01/01/2017",
        color: "#c0392b",
        points: [
          "Interdiction de services occasionnels avec véhicules < 10 PLACES pour trajets entièrement dans agglomérations > 100 000 habitants.",
          "Objectif : protéger les taxis et les VTC."
        ]
      }
    ]
  },
  {
    type: "table",
    title: "Comparatif des 3 types collectifs",
    headers: ["Critère", "Services réguliers", "TAD", "Occasionnels"],
    rows: [
      ["Public", "Tout le monde", "Individus ayant réservé", "Groupe constitué"],
      ["Itinéraire", "Fixe et publié", "Variable selon réservations", "Libre"],
      ["Tarif", "Unique, affiché", "Réglementé par collectivité", "Négocié"],
      ["Billet", "Individuel", "Individuel ou collectif", "COLLECTIF obligatoire"],
      ["DREAL", "Non obligatoire", "Non obligatoire", "OBLIGATOIRE"],
      ["Carte T3P", "Non requise", "Non requise", "Non (Permis D + FIMO)"]
    ]
  },
  {
    type: "section",
    title: "3. La loi LOTI — Définition du T3P",
    subtitle: "Loi n°82-1153 du 30 décembre 1982 — Le cadre légal fondateur"
  },
  {
    type: "content",
    title: "La loi LOTI et la prestation T3P",
    ref: "Loi n°82-1153 du 30 décembre 1982 — DREAL / DRIEAT",
    intro: "La loi LOTI est le texte fondateur de toute la réglementation du transport de personnes en France.",
    blocks: [
      {
        heading: "DÉFINITION OFFICIELLE",
        color: "#2c3e50",
        points: [
          "\"Les prestations T3P sont des prestations de transport public routier qui ne relèvent NI des transports publics collectifs NI du transport privé. Exécutées à titre ONÉREUX par les taxis, VTC et VMDTR.\"",
        ]
      },
      {
        heading: "3 ÉLÉMENTS CLÉS",
        color: "#2980b9",
        points: [
          "À titre ONÉREUX — Le service est payant.",
          "NI collectif NI privé — Pas un bus/tram ni une navette interne.",
          "Taxi, VTC ou VMDTR — Seules ces 3 professions sont habilitées."
        ]
      }
    ],
    keyRule: "Prestation T3P = Transport de personnes + payant + à la demande d'un client précis + exercé par Taxi, VTC ou VMDTR avec carte professionnelle."
  },
  {
    type: "section",
    title: "4. Non-inscription aux examens T3P",
    subtitle: "Les 3 situations qui empêchent de s'inscrire à l'examen"
  },
  {
    type: "content",
    title: "Conditions de non-inscription aux examens T3P",
    ref: "Art. R3120-1 Code des transports",
    intro: "3 situations bloquantes à vérifier avant de postuler à l'examen T3P.",
    blocks: [
      {
        heading: "CAS 1 — RETRAIT DÉFINITIF DE CARTE → 10 ANS",
        color: "#c0392b",
        points: [
          "Ne pas avoir fait l'objet d'un RETRAIT DÉFINITIF de la carte pro dans les 10 ans précédant la demande."
        ]
      },
      {
        heading: "CAS 2 — FRAUDE À L'EXAMEN → 5 ANS",
        color: "#e67e22",
        points: [
          "Ne pas avoir été EXCLU POUR FRAUDE lors d'une session d'examen T3P dans les 5 ans."
        ]
      },
      {
        heading: "CAS 3 — PERMIS PROBATOIRE → ACCÈS IMPOSSIBLE",
        color: "#8e44ad",
        points: [
          "Ne pas être en période probatoire. Minimum : 2 ans (AAC) ou 3 ans (conduite normale)."
        ]
      }
    ],
    keyRule: "Mémo examen : Retrait carte → 10 ans | Fraude → 5 ans | Permis probatoire → inscription impossible."
  },
  {
    type: "section",
    title: "5. Réglementation des Taxis",
    subtitle: "Statuts, tarifs, maraude, véhicule, sanctions"
  },
  {
    type: "content",
    title: "Réglementation des Taxis — Cadre légal et statuts",
    ref: "Code des transports + textes préfectoraux + arrêté métropolitain",
    intro: "Le taxi est la profession T3P la plus ancienne et la plus réglementée.",
    blocks: [
      {
        heading: "CADRE RÉGLEMENTAIRE",
        color: "#1a5276",
        points: [
          "Licence ADS obligatoire (délivrée par le Préfet). Sans ADS : DÉLIT — 1 an + 15 000 €.",
          "Carte professionnelle + Certificat médical + PSC1 obligatoire.",
          "Casier judiciaire B2 vierge. Permis B hors probatoire."
        ]
      },
      {
        heading: "LES 4 STATUTS D'EXERCICE",
        color: "#2e86c1",
        points: [
          "ARTISAN — Propre licence ADS, propriétaire de son droit d'exercer.",
          "SALARIÉ — Carte pro mais travaille pour un employeur possédant l'ADS.",
          "LOCATAIRE-GÉRANT — Loue l'ADS ET le véhicule contre un loyer.",
          "ACTIONNAIRE — Parts dans une société de taxi (ex : Taxi Radio)."
        ]
      }
    ]
  },
  {
    type: "content",
    title: "La maraude — Définition légale et règles",
    ref: "Droit exclusif du taxi — 3 formes définies par le Code des transports",
    intro: "La maraude est l'un des droits les plus importants du taxi et l'une des distinctions fondamentales avec le VTC.",
    blocks: [
      {
        heading: "LES 3 FORMES DE MARAUDE",
        color: "#1a5276",
        points: [
          "1. PRENDRE EN CHARGE un client sur la voie publique SANS réservation.",
          "2. ÊTRE EN QUÊTE DE CLIENTÈLE sur la voie publique.",
          "3. Dépasser 1 HEURE d'attente en gare/aéroport par rapport à l'horaire prévu."
        ]
      },
      {
        heading: "TAXI ✔ vs VTC/VMDTR ✘",
        color: "#c0392b",
        points: [
          "TAXI : Autorisée UNIQUEMENT dans la zone de rattachement. Hors zone → réservation obligatoire.",
          "VTC/VMDTR : Maraude INTERDITE. Jamais de prise en charge sans réservation.",
          "⚠ Sanction maraude VTC : DÉLIT — 1 an + 15 000 €."
        ]
      }
    ]
  },
  {
    type: "section",
    title: "6. Réglementation des VTC",
    subtitle: "Voiture de Transport avec Chauffeur — Réservation toujours obligatoire"
  },
  {
    type: "content",
    title: "Réglementation des VTC — Cadre légal, statut et tarifs",
    ref: "Code des transports — Registre National VTC — DRIEAT",
    intro: "Le VTC se distingue du taxi : réservation préalable toujours obligatoire, tarifs librement fixés à l'avance, exercice sur toute la France.",
    blocks: [
      {
        heading: "CADRE RÉGLEMENTAIRE VTC",
        color: "#117a65",
        points: [
          "Inscription obligatoire au REGISTRE NATIONAL des VTC (DRIEAT).",
          "Exercer sans inscription = DÉLIT — 1 an + 15 000 €.",
          "Peut exercer sur TOUTE LA FRANCE — aucune restriction géographique.",
          "Vignette VTC sur le véhicule."
        ]
      },
      {
        heading: "CONDITIONS DU VÉHICULE VTC — 5 CRITÈRES",
        color: "#1f618d",
        points: [
          "4 à 9 places (chauffeur compris) — Minimum 4 portes.",
          "Moins de 7 ans (sauf hybrides/électriques/collection).",
          "Dimensions min : 4,50 m × 1,70 m.",
          "Puissance nette moteur ≥ 84 kW (≈ 114 ch)."
        ]
      }
    ],
    keyRule: "RÈGLE D'OR VTC : Réservation PRÉALABLE OBLIGATOIRE — toujours. Maraude = DÉLIT : 1 an + 15 000 €."
  },
  {
    type: "table",
    title: "Comparatif Taxi vs VTC",
    headers: ["Critère", "TAXI", "VTC"],
    rows: [
      ["Maraude", "✔ Zone de rattachement", "✘ Interdite"],
      ["Tarif", "Réglementé (préfectoral)", "Libre (fixé avant course)"],
      ["Signalétique", "Lumineux TAXI + commune", "Vignette VTC"],
      ["Âge véhicule", "< 10 ans (variable)", "< 7 ans (sauf exceptions)"],
      ["PSC1", "✔ Obligatoire", "Facultatif"],
      ["Zone d'exercice", "Zone de rattachement", "Toute la France"]
    ]
  },
  {
    type: "section",
    title: "6b. Réglementation des VMDTR",
    subtitle: "Véhicules Motorisés à Deux ou Trois Roues — Moto-taxi"
  },
  {
    type: "content",
    title: "Réglementation des VMDTR",
    ref: "Code des transports",
    intro: "Le VMDTR est la 3e profession T3P. Réservation toujours obligatoire, 1 seul passager maximum.",
    blocks: [
      {
        heading: "CONDITIONS D'ACCÈS",
        color: "#6c3483",
        points: [
          "Permis A depuis au moins 3 ANS (hors probatoire).",
          "Carte professionnelle VMDTR délivrée par la préfecture.",
          "Visite médicale obligatoire (même fréquence que Taxi/VTC).",
          "Casier judiciaire B2 vierge."
        ]
      },
      {
        heading: "CONDITIONS DU VÉHICULE",
        color: "#1a5276",
        points: [
          "Moins de 5 ANS (vs < 7 ans VTC, < 10 ans Taxi).",
          "Puissance nette moteur ≥ 40 kW.",
          "1 passager maximum à bord.",
          "Casque homologué obligatoire (conducteur ET passager)."
        ]
      }
    ],
    keyRule: "VMDTR non conforme (< 40 kW ou > 5 ans) = contravention 3e classe (jusqu'à 450 €). Maraude = DÉLIT : 1 an + 15 000 €."
  },
  {
    type: "table",
    title: "Comparatif des 3 professions T3P",
    headers: ["Critère", "🚕 TAXI", "🚗 VTC", "🛵 VMDTR"],
    rows: [
      ["Permis requis", "Permis B", "Permis B", "Permis A (3 ans)"],
      ["Maraude", "✔ Zone seule", "✘ Interdite", "✘ Interdite"],
      ["Passagers max", "4 à 7", "4 à 8", "1 seul"],
      ["Âge véhicule", "< 10 ans", "< 7 ans", "< 5 ans"],
      ["Puissance", "Variable", "Min 84 kW", "Min 40 kW"],
      ["PSC1", "✔ Obligatoire", "✘ Facultatif", "✘ Facultatif"],
      ["Taximètre", "✔ Obligatoire", "✘ Non", "✘ Non"],
      ["Registre DRIEAT", "✘ Non", "✔ Obligatoire", "✘ Non"],
      ["ADS", "✔ Obligatoire", "✘ Non", "✘ Non"],
      ["Formation 14h/5 ans", "✔", "✔", "✔"]
    ]
  },
  {
    type: "section",
    title: "7. Organismes autour du T3P",
    subtitle: "Préfecture, DRIEAT, CMA, Ministère — Centres agréés"
  },
  {
    type: "content",
    title: "Les organismes gravitant autour du T3P",
    intro: "Le secteur T3P est encadré par plusieurs institutions complémentaires.",
    blocks: [
      {
        heading: "PRÉFECTURE / PRÉFET",
        color: "#1a5276",
        points: [
          "Délivre et retire les cartes professionnelles T3P.",
          "Délivre les ADS pour les taxis.",
          "Agrée les centres de formation (5 ans renouvelable)."
        ]
      },
      {
        heading: "DRIEAT / DREAL",
        color: "#117a65",
        points: [
          "Enregistrement des entreprises de transport public.",
          "Délivrance des licences de transport.",
          "Contrôle l'application de la réglementation."
        ]
      },
      {
        heading: "CHAMBRE DES MÉTIERS ET DE L'ARTISANAT (CMA)",
        color: "#7d3c98",
        points: [
          "Centre d'examens TAXI / VTC / VMDTR.",
          "Stage de préparation à l'installation.",
          "Tient le répertoire des métiers."
        ]
      },
      {
        heading: "COMMISSION DISCIPLINAIRE",
        color: "#c0392b",
        points: [
          "Jusqu'à 3 sections : Taxis / VTC / VMDTR.",
          "Composée à parts égales : collège État + collège professionnels.",
          "L'inculpé peut venir avec une personne de son choix."
        ]
      }
    ]
  },
  {
    type: "section",
    title: "8. Les assurances obligatoires",
    subtitle: "RC Circulation + RC Professionnelle — Loi Badinter — FGAO"
  },
  {
    type: "content",
    title: "Les 2 assurances obligatoires pour tout conducteur T3P",
    ref: "RC de circulation + RC professionnelle — Cumulatives",
    intro: "Tout conducteur T3P doit souscrire DEUX contrats distincts. Oublier de déclarer l'usage professionnel = risque de refus total d'indemnisation.",
    blocks: [
      {
        heading: "1. RC CIRCULATION (à titre onéreux)",
        color: "#2980b9",
        points: [
          "Couvre les dommages avec IMPLICATION DU VÉHICULE.",
          "Exemple : accident pendant une course qui blesse le passager.",
          "OBLIGATION : déclarer l'usage professionnel à l'assureur.",
          "Défaut d'assurance : DÉLIT — jusqu'à 3 750 €."
        ]
      },
      {
        heading: "2. RC PROFESSIONNELLE (d'exploitation)",
        color: "#27ae60",
        points: [
          "Couvre les dommages EN DEHORS de toute implication du véhicule.",
          "Exemple : client glisse en montant, bagages endommagés.",
          "3 éléments de la RC : FAUTE + DOMMAGE + LIEN DE CAUSALITÉ."
        ]
      },
      {
        heading: "LOI BADINTER (5 juillet 1985) + FGAO",
        color: "#7d3c98",
        points: [
          "Garantit l'indemnisation de TOUTES les victimes (accident + véhicule impliqué).",
          "FGAO : indemnise quand le responsable n'est PAS ASSURÉ ou PAS IDENTIFIÉ."
        ]
      }
    ],
    keyRule: "Les 2 assurances sont CUMULATIVES et obligatoires. Sanction : jusqu'à 3 750 € d'amende."
  },
  {
    type: "section",
    title: "9. Formation continue et visite médicale",
    subtitle: "Obligations périodiques pour maintenir la carte professionnelle"
  },
  {
    type: "content",
    title: "Formation continue et visite médicale obligatoires",
    intro: "Pour conserver la carte professionnelle, deux obligations périodiques s'appliquent aux Taxis, VTC et VMDTR.",
    blocks: [
      {
        heading: "FORMATION CONTINUE — 14h tous les 5 ANS",
        color: "#2980b9",
        points: [
          "Mise à jour réglementaire, sécurité routière, relation client.",
          "Depuis 2024 : prévention discriminations et VSS.",
          "Centre AGRÉÉ par le Préfet. CPF mobilisable.",
          "Sans justificatif → carte non renouvelée → exercice illégal = DÉLIT."
        ]
      },
      {
        heading: "VISITE MÉDICALE — Fréquence selon l'âge",
        color: "#27ae60",
        points: [
          "20 → 60 ans : tous les 5 ANS",
          "60 → 76 ans : tous les 2 ANS",
          "76 ans et plus : chaque ANNÉE"
        ]
      }
    ]
  },
  {
    type: "chiffres",
    title: "FICHE DE RÉVISION — Chiffres et délais essentiels",
    items: [
      { val: "14h", desc: "Formation continue / 5 ans" },
      { val: "5 ans", desc: "Visite méd. 20-60 ans" },
      { val: "2 ans", desc: "Visite méd. 60-76 ans" },
      { val: "1 an", desc: "Visite méd. 76 ans+" },
      { val: "10 ans", desc: "Non-inscription retrait carte" },
      { val: "5 ans", desc: "Non-inscription fraude examen" },
      { val: "3 mois", desc: "Délai délivrance carte pro" },
      { val: "15 000 €", desc: "Amende exercice illégal T3P" },
      { val: "1 an", desc: "Prison exercice illégal T3P" },
      { val: "3 750 €", desc: "Amende défaut assurance" },
      { val: "50", desc: "Membres Comité national T3P" },
      { val: "12/20", desc: "Note min. épreuve pratique" },
      { val: "6/20", desc: "Note éliminatoire théorique" },
    ]
  }
];
