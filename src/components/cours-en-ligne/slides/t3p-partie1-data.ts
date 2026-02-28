// Données des slides T3P Partie 1 — Réglementation du Transport Public Particulier de Personnes
// Source : vrai_cours_t3P_partie_1-4.pptx (50 slides)

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
  examples?: string[];
}

export interface SlideTableType extends SlideBase {
  type: "table";
  ref?: string;
  intro?: string;
  headers: string[];
  rows: string[][];
  keyRule?: string;
  extraSections?: { heading: string; items: string[] }[];
}

export interface SlideChiffresType extends SlideBase {
  type: "chiffres";
  items: { val: string; desc: string }[];
}

export interface SlideSchemaType extends SlideBase {
  type: "schema";
  intro?: string;
  tables?: { headers: string[]; rows: string[][] }[];
  keyRule?: string;
  lists?: { heading: string; items: string[] }[];
}

export interface SlideSynthesisType extends SlideBase {
  type: "synthesis";
  intro?: string;
  sections: { heading: string; color: string; points: string[] }[];
  keyRule?: string;
}

export type Slide =
  | SlideTitleType
  | SlideSommaireType
  | SlideSectionType
  | SlideContentType
  | SlideTableType
  | SlideChiffresType
  | SlideSchemaType
  | SlideSynthesisType;

export const T3P_PARTIE1_SLIDES: Slide[] = [
  // ── Page 1 ──
  {
    type: "title",
    title: "RÉGLEMENTATION DU TRANSPORT PUBLIC PARTICULIER DE PERSONNES",
    subtitle: "et prévention des discriminations et des violences sexuelles et sexistes",
    footer: "Arrêté du 20 mars 2024 — En vigueur depuis le 1ᵉʳ avril 2024",
    brand: "FTRANSPORT - SERVICES PRO • Formation certifiée Qualiopi • Éligible CPF • Lyon"
  },
  // ── Page 2 ──
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
      { n: "—", label: "— PARTIE 2 —", page: 0 },
      { n: "8b", label: "Agents de contrôle et documents", page: 53 },
      { n: "9", label: "Les juridictions compétentes", page: 54 },
      { n: "10", label: "Sanctions et voies de recours", page: 57 },
      { n: "11", label: "Transport de Personnes à Mobilité Réduite (TPMR)", page: 61 },
      { n: "12", label: "Covoiturage et transport privé", page: 63 },
      { n: "13", label: "Les intermédiaires", page: 65 },
      { n: "14", label: "VSS et discriminations", page: 67 },
    ]
  },
  // ── Page 3 ──
  {
    type: "section",
    title: "1. Transport public ou transport privé ?",
    subtitle: "Comprendre la classification fondamentale du transport de personnes"
  },
  // ── Page 4 ──
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
  // ── Page 5 ──
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
  // ── Page 6 ──
  {
    type: "section",
    title: "2.1 — Les services réguliers",
    subtitle: "Dessertes urbaines et interurbaines à horaires et trajets fixes"
  },
  // ── Page 7 ──
  {
    type: "content",
    title: "Les services réguliers",
    ref: "Art. L3111-1 Code des transports — Loi 2015-990 du 6 août 2015",
    intro: "Les services réguliers sont la forme la plus connue du transport collectif. Ce sont les lignes de bus, de métro, de tramway que vous empruntez au quotidien. Leur organisation est précisément définie par le Code des transports.",
    blocks: [
      {
        heading: "DÉFINITION LÉGALE — Ce que dit le Code des transports",
        color: "#2c3e50",
        points: [
          "Services collectifs offerts à la place, dont les ITINÉRAIRES, POINTS D'ARRÊT, HORAIRES, FRÉQUENCES et TARIFS sont fixés et publiés à l'avance.",
          "Ils peuvent être URBAINS (en ville) ou EXTRA-URBAINS (entre villes). Les transports scolaires sont aussi des services réguliers.",
          "Organisés par des collectivités locales (mairie, métropole, conseil général) en tant qu'Autorité Organisatrice de Mobilité (AOM).",
          "Depuis la loi 2015-990 du 6 août 2015 : liaisons interurbaines > 100 km peuvent aussi être organisées sur INITIATIVE PRIVÉE (Flixbus, BlaBlaBus)."
        ]
      },
      {
        heading: "EXEMPLES CONCRETS",
        color: "#16a085",
        points: [
          "TCL Lyon : lignes de métro, tramway et bus avec horaires affichés.",
          "RATP Paris : RER, métro, bus franciliens.",
          "TER SNCF : trains régionaux entre villes.",
          "Cars scolaires : ramassage à heure et itinéraire fixes.",
          "Flixbus / BlaBlaBus : liaisons longue distance > 100 km sur initiative privée."
        ]
      },
      {
        heading: "CE QUI CARACTÉRISE UN SERVICE RÉGULIER",
        color: "#2980b9",
        points: [
          "Itinéraire FIXE — ne change pas selon les passagers.",
          "Horaires PUBLICS — connus à l'avance par tous.",
          "Tarif UNIQUE et identique pour tous les usagers.",
          "Ouvert à TOUS sans réservation obligatoire.",
          "Organisé par une autorité publique ou un opérateur délégué."
        ]
      }
    ],
    keyRule: "Les conducteurs de services réguliers (bus, tramway, TER) n'ont PAS besoin d'une carte professionnelle T3P. Ce sont des services collectifs, pas des services particuliers."
  },
  // ── Page 8 ──
  {
    type: "schema",
    title: "Les services réguliers — Schéma de fonctionnement",
    intro: "Comment fonctionne un service régulier de transport collectif ?",
    tables: [
      {
        headers: ["AUTORITÉ ORGANISATRICE (AOM)", "OPÉRATEUR DE TRANSPORT", "LIGNE FIXE", "USAGERS"],
        rows: [
          ["Mairie, Métropole", "Entreprise publique ou privée déléguée", "Horaires publiés", "Paiement titre de transport"],
          ["Conseil Général", "", "Arrêts définis", "Tarif affiché"]
        ]
      }
    ],
    lists: [
      {
        heading: "Exemples de services réguliers en France",
        items: [
          "Bus / Métro — Ex: Ligne A Lyon",
          "TER / TGV — Ex: Lyon-Paris SNCF",
          "Cars Départementaux — Ex: Isère Mobilités",
          "Transport Scolaire — Horaires scolaires fixes",
          "Flixbus — Liaisons > 100 km initiative privée",
          "Tramway / TCL / RATP"
        ]
      }
    ],
    keyRule: "Les conducteurs de services réguliers (bus, tramway, TER) n'ont PAS besoin d'une carte professionnelle T3P. Ce sont des services collectifs, pas des services particuliers."
  },
  // ── Page 9 ──
  {
    type: "section",
    title: "2.2 — Les services à la demande (TAD)",
    subtitle: "Transport flexible entre le collectif et le particulier"
  },
  // ── Page 10 ──
  {
    type: "content",
    title: "Les services à la demande (TAD)",
    ref: "Forme intermédiaire entre service régulier et taxi — Art. L3111-1 Code des transports",
    intro: "Les services à la demande (TAD) sont une forme hybride de transport collectif. Contrairement aux lignes régulières, ils n'ont pas d'itinéraire fixe, mais ils restent organisés collectivement et réglementés par une autorité publique.",
    blocks: [
      {
        heading: "DÉFINITION LÉGALE",
        color: "#8e44ad",
        points: [
          "Ce sont des services collectifs offerts à la place, DÉTERMINÉS EN PARTIE en fonction de la demande des usagers.",
          "Les règles de tarification sont établies à l'avance — les véhicules ont une capacité MINIMALE de 4 places (conducteur inclus).",
          "Ils se distinguent des services réguliers car les véhicules n'empruntent PAS d'itinéraire fixe et ne respectent pas d'horaire précis.",
          "Les TAD sont organisés par des professionnels du transport sous l'autorité d'une collectivité — ils ne sont PAS des taxis ni des VTC."
        ]
      },
      {
        heading: "EXEMPLES CONCRETS",
        color: "#16a085",
        points: [
          "Commune rurale : navette hebdomadaire vers le marché local, à heure connue.",
          "Service nocturne à la demande : bus passe seulement si des usagers ont réservé la veille.",
          "Transport médical flexible : itinéraire adapté selon les rendez-vous des patients.",
          "Desserte d'un hameau isolé : service actif seulement sur réservation."
        ]
      },
      {
        heading: "DIFFÉRENCES AVEC UN TAXI",
        color: "#c0392b",
        points: [
          "COLLECTIF : plusieurs passagers dans le même véhicule.",
          "TARIF RÉGLEMENTÉ : identique pour tous, fixé par la collectivité à l'avance.",
          "ORGANISÉ par une autorité publique, pas par un conducteur indépendant.",
          "Pas de carte professionnelle T3P requise pour les conducteurs TAD."
        ]
      }
    ]
  },
  // ── Page 11 ──
  {
    type: "schema",
    title: "Les services à la demande — Schéma comparatif",
    intro: "Position du TAD entre le service régulier et le taxi :",
    tables: [
      {
        headers: ["SERVICE RÉGULIER", "SERVICE À LA DEMANDE", "TAXI / VTC"],
        rows: [
          ["Itinéraire & horaire FIXES", "Flexible selon réservations", "Véhicule dédié pour 1 client"],
          ["Bus, Métro, TER", "TAD, Navettes", "T3P — Carte pro requise"]
        ]
      },
      {
        headers: ["Collectif", "Flexible", "Réglementé", "Public"],
        rows: [
          ["Plusieurs passagers par véhicule", "Itinéraire variable selon réservations", "Tarif fixé à l'avance", "Organisé par une collectivité"]
        ]
      }
    ]
  },
  // ── Page 12 ──
  {
    type: "section",
    title: "2.3 — Les services occasionnels",
    subtitle: "Transport de groupes à la demande d'un donneur d'ordre"
  },
  // ── Page 13 ──
  {
    type: "content",
    title: "Les services occasionnels",
    ref: "Transport de groupes — Règle importante depuis le 01/01/2017",
    intro: "Les services occasionnels sont des transports collectifs ponctuels, organisés pour un groupe précis à l'occasion d'un événement particulier. Ils font l'objet d'une réglementation stricte, notamment depuis 2017 dans les grandes agglomérations.",
    blocks: [
      {
        heading: "DÉFINITION LÉGALE ET OBLIGATIONS",
        color: "#d35400",
        points: [
          "Services qui ne répondent PAS à la définition des services réguliers et qui transportent des groupes d'au moins 2 personnes, à l'initiative d'un donneur d'ordre ou du transporteur.",
          "Exemples : autocar pour une colonie de vacances, visite touristique, concert, exposition, circuit vendu par une agence de voyage.",
          "OBLIGATION : ne peuvent être exécutés que par des entreprises inscrites au Registre électronique national des entreprises de transport (DREAL).",
          "OBLIGATION : réservation préalable avec un BILLET COLLECTIF — signalétique distinctive apposée sur le véhicule."
        ]
      },
      {
        heading: "⚠ RÈGLE DEPUIS LE 01/01/2017",
        color: "#c0392b",
        points: [
          "Interdiction de réaliser des services occasionnels avec des véhicules de MOINS DE 10 PLACES pour des trajets entièrement situés dans des agglomérations de plus de 100 000 habitants.",
          "Objectif : protéger les taxis et les VTC."
        ]
      },
      {
        heading: "EXEMPLES DE SERVICES OCCASIONNELS",
        color: "#2c3e50",
        points: [
          "Autocar loué pour une colonie de vacances — Pas d'itinéraire fixe, service ponctuel.",
          "Circuit touristique vendu par une agence de voyage — Réservé à un groupe précis.",
          "Transport pour un concert ou une exposition — Billet COLLECTIF obligatoire.",
          "Navette aller-retour pour un événement sportif — Inscription au registre DREAL obligatoire."
        ]
      }
    ]
  },
  // ── Page 14 ──
  {
    type: "table",
    title: "Comparatif des 3 types collectifs — Conditions et exemples",
    headers: ["Critère", "Services réguliers", "Services à la demande (TAD)", "Services occasionnels"],
    rows: [
      ["Public cible", "Tout le monde — sans réservation", "Individus ayant réservé à l'avance", "Groupe CONSTITUÉ par un donneur d'ordre (école, asso, entreprise…)"],
      ["Itinéraire", "Fixe et publié", "Variable selon les réservations", "Libre — défini pour l'événement"],
      ["Tarif", "Unique, affiché, identique", "Réglementé par la collectivité", "Négocié — variable selon contrat"],
      ["Billet", "Individuel", "Individuel ou collectif", "COLLECTIF obligatoire"],
      ["Inscription DREAL", "Non obligatoire", "Non obligatoire", "OBLIGATOIRE"],
      ["Conditions conducteur", "Pas de carte pro T3P", "Pas de carte pro T3P", "Permis D + FIMO voyageurs OU capacité transport léger"]
    ],
    extraSections: [
      {
        heading: "Exemples TAD à LYON — commandés par la Métropole de Lyon",
        items: [
          "🚌 Navette TAD Bourg-en-Bresse ↔ villages du Ain (Keolis)",
          "🚐 Transport à la demande nocturne Optibus (périphérie Lyon)",
          "🩺 Navette médicale sur résa pour zones rurales (SYTRAL)",
          "🚌 Réseau TAD Libellule — Ain Dombes Saône (résa 48h avant)",
          "🏫 Navette scolaire TAD Villages de l'Ain sur réservation"
        ]
      },
      {
        heading: "Exemples Occasionnels à LYON",
        items: [
          "🏫 Car pour sortie scolaire : l'école commande = donneur d'ordre",
          "🏕 Car colonie de vacances : l'asso = donneur d'ordre",
          "🎵 Car pour concert à Fourvière : l'agence = donneur d'ordre",
          "🏢 Navette séminaire entreprise : l'entreprise = donneur d'ordre",
          "🚌 Circuit touristique Lyon Presqu'île : agence tour = donneur d'ordre"
        ]
      }
    ]
  },
  // ── Page 15 ──
  {
    type: "section",
    title: "3. La loi LOTI — Définition du T3P",
    subtitle: "Loi n°82-1153 du 30 décembre 1982 — Le cadre légal fondateur"
  },
  // ── Page 16 ──
  {
    type: "content",
    title: "La loi LOTI et la prestation T3P",
    ref: "Loi n°82-1153 du 30 décembre 1982 — DREAL / DRIEAT",
    intro: "La loi LOTI est le texte fondateur de toute la réglementation du transport de personnes en France. C'est elle qui définit précisément ce qu'est le transport public particulier de personnes (T3P) et qui peut l'exercer.",
    blocks: [
      {
        heading: "LOI LOTI — Loi n°82-1153 du 30 décembre 1982",
        color: "#2c3e50",
        points: [
          "Loi d'orientation des transports intérieurs — organise l'ensemble du transport de marchandises et de voyageurs en France.",
          "La DREAL ou la DRIEAT (Île-de-France) délivre les autorisations de transport.",
          "Elle distingue : transport public collectif, transport public particulier (T3P), et transport privé."
        ]
      },
      {
        heading: "DÉFINITION OFFICIELLE",
        color: "#1a5276",
        points: [
          "\"Les prestations de transports publics particuliers de personnes sont des prestations de transport public routier de personnes qui ne relèvent NI des transports publics collectifs NI du transport privé routier de personnes. Elles sont exécutées à titre ONÉREUX par les taxis, les VTC et les véhicules motorisés à deux ou trois roues.\""
        ]
      },
      {
        heading: "3 ÉLÉMENTS CLÉS",
        color: "#2980b9",
        points: [
          "À titre ONÉREUX — Le service est payant. Sans rémunération = covoiturage ou transport privé.",
          "NI collectif NI privé — Pas un bus/tram (collectif) ni une navette interne (privé).",
          "Taxi, VTC ou VMDTR — Seules ces 3 professions sont légalement habilitées."
        ]
      }
    ],
    keyRule: "Prestation T3P = Transport de personnes + payant + à la demande d'un client précis + exercé par Taxi, VTC ou VMDTR avec carte professionnelle."
  },
  // ── Page 17 ──
  {
    type: "schema",
    title: "La prestation T3P — Schéma de positionnement",
    intro: "Comment identifier une prestation T3P parmi toutes les formes de transport ?",
    lists: [
      {
        heading: "Arbre de décision",
        items: [
          "Transport de personnes ? → Non → Hors champ",
          "Service payant (onéreux) ? → Non → Covoiturage",
          "À la demande d'un client précis ? → Oui mais collectif → TPC (bus/tram)",
          "OUI → Prestation T3P : TAXI / VTC / VMDTR → Carte professionnelle obligatoire"
        ]
      }
    ],
    keyRule: "La prestation T3P = Transport de personnes + payant + à la demande d'un client précis + exercé par Taxi, VTC ou VMDTR avec carte professionnelle."
  },
  // ── Page 18 ──
  {
    type: "section",
    title: "4. Non-inscription aux examens T3P",
    subtitle: "Les 3 situations qui empêchent de s'inscrire à l'examen"
  },
  // ── Page 19 ──
  {
    type: "content",
    title: "Conditions de non-inscription aux examens T3P",
    ref: "3 situations bloquantes — Art. R3120-1 Code des transports",
    intro: "Avant de postuler à l'examen T3P, il faut vérifier que l'on ne se trouve pas dans l'une des 3 situations suivantes. Ces cas d'exclusion visent à protéger la sécurité des passagers et l'intégrité de la profession.",
    blocks: [
      {
        heading: "CAS 1 — RETRAIT DÉFINITIF DE CARTE → 10 ANS",
        color: "#c0392b",
        points: [
          "Ne pas avoir fait l'objet, dans les 10 ans qui précèdent la demande, d'un RETRAIT DÉFINITIF de la carte professionnelle T3P.",
          "En cas de violation grave de la réglementation, le préfet peut prononcer un retrait définitif. Ce conducteur ne peut plus s'inscrire pendant 10 ans pour protéger le public."
        ]
      },
      {
        heading: "CAS 2 — FRAUDE À L'EXAMEN → 5 ANS",
        color: "#e67e22",
        points: [
          "Ne pas avoir fait l'objet, dans les 5 ans qui précèdent la demande, d'une EXCLUSION POUR FRAUDE lors d'une session d'examen T3P.",
          "La fraude inclut : utilisation d'antisèche, aide extérieure non autorisée, usurpation d'identité lors d'une épreuve."
        ]
      },
      {
        heading: "CAS 3 — PERMIS PROBATOIRE → ACCÈS IMPOSSIBLE",
        color: "#8e44ad",
        points: [
          "Ne pas être en période probatoire de permis de conduire.",
          "Minimum requis : 2 ans de permis en conduite accompagnée (AAC) ou 3 ans en conduite normale.",
          "Un conducteur trop jeune n'a pas l'expérience suffisante pour transporter des passagers en sécurité."
        ]
      }
    ],
    keyRule: "Mémo examen : Retrait carte → 10 ans | Fraude → 5 ans | Permis probatoire → inscription impossible."
  },
  // ── Page 20 ──
  {
    type: "schema",
    title: "Non-inscription aux examens — Schéma récapitulatif",
    intro: "Comment vérifier son éligibilité à l'inscription à l'examen T3P :",
    tables: [
      {
        headers: ["10 ANS", "5 ANS", "3 ans", "2 ans"],
        rows: [
          ["Délai retrait définitif carte", "Délai exclusion pour fraude", "Permis normal (hors probatoire)", "Permis AAC (hors probatoire)"]
        ]
      },
      {
        headers: ["Retrait définitif dans les 10 ans ?", "Fraude à l'examen dans les 5 ans ?", "Permis en période probatoire ?", "AUCUN des 3 cas ?"],
        rows: [
          ["→ EXCLU 10 ans", "→ EXCLU 5 ans", "→ EXCLU jusqu'à fin probatoire", "→ INSCRIPTION AUTORISÉE"]
        ]
      }
    ],
    keyRule: "⚠ Mémo examen : Retrait carte → 10 ans | Fraude → 5 ans | Permis probatoire → inscription impossible. Ces 3 cas doivent être sus par cœur."
  },
  // ── Page 21 ──
  {
    type: "section",
    title: "5. Réglementation des Taxis",
    subtitle: "Statuts, tarifs, maraude, véhicule, sanctions"
  },
  // ── Page 22 ──
  {
    type: "content",
    title: "Réglementation des Taxis — Cadre légal et statuts",
    ref: "Code des transports + textes préfectoraux + arrêté métropolitain",
    intro: "Le taxi est la profession T3P la plus ancienne et la plus réglementée. Il se distingue du VTC notamment par son droit de maraude et par des tarifs strictement encadrés par arrêté préfectoral.",
    blocks: [
      {
        heading: "CADRE RÉGLEMENTAIRE TAXI",
        color: "#1a5276",
        points: [
          "Textes : Code des transports + textes préfectoraux + arrêté métropolitain.",
          "Autorité compétente : Ministère de la Transition écologique et de la Cohésion des territoires.",
          "Licence ADS obligatoire (délivrée par le Préfet). Sans ADS : DÉLIT — 1 an + 15 000 €.",
          "Casier judiciaire Bulletin n°2 vierge. Permis B hors probatoire."
        ]
      },
      {
        heading: "CONDITIONS D'ACCÈS TAXI",
        color: "#2e86c1",
        points: [
          "Carte professionnelle (examen T3P réussi — tronc commun VTC).",
          "Certificat médical en cours de validité.",
          "PSC1 (Premiers Secours) — OBLIGATOIRE pour taxi uniquement."
        ]
      },
      {
        heading: "LES 4 STATUTS D'EXERCICE",
        color: "#117a65",
        points: [
          "ARTISAN — Il dispose de sa propre licence (ADS). Il est propriétaire de son droit d'exercer.",
          "SALARIÉ — Titulaire de la carte pro mais travaille pour un employeur qui possède l'ADS.",
          "LOCATAIRE-GÉRANT — Loue la licence (ADS) ET le véhicule à un titulaire contre paiement d'un loyer.",
          "ACTIONNAIRE — Achète des parts d'une société de taxi (ex : Taxi Radio) qui détient les licences."
        ]
      }
    ]
  },
  // ── Page 23 ──
  {
    type: "schema",
    title: "Les 4 statuts du Taxi — Schéma comparatif",
    intro: "Qui possède quoi selon le statut du conducteur taxi :",
    tables: [
      {
        headers: ["ARTISAN", "SALARIÉ", "LOCATAIRE-GÉRANT", "ACTIONNAIRE"],
        rows: [
          ["Propre ADS ✔", "ADS de l'employeur", "Loue l'ADS", "Parts dans société"],
          ["Propre véhicule ✔", "Véhicule fourni", "Loue le véhicule", "ADS collective"],
          ["Propre client ✔", "Salaire mensuel", "Garde les recettes", "Partage des bénéfices"],
          ["Indépendant total", "Lien de subordination", "Contrat de louage", "Ex : Taxi Radio"]
        ]
      }
    ],
    lists: [
      {
        heading: "Le calcul du tarif taxi",
        items: [
          "Prise en charge + Km parcourus + Suppléments = TARIF FINAL",
          "Suppléments autorisés : 5e passager — 4e bagage — équipements spéciaux — animaux — nuit / dimanche / fériés.",
          "Tarifs fixés par ARRÊTÉ PRÉFECTORAL — pas libres."
        ]
      }
    ]
  },
  // ── Page 24 ──
  {
    type: "content",
    title: "La maraude — Définition légale et règles",
    ref: "Droit exclusif du taxi — 3 formes définies par le Code des transports",
    intro: "La maraude est l'un des droits les plus importants du taxi et l'une des distinctions fondamentales avec le VTC. Elle désigne le fait de rechercher des clients sur la voie publique sans réservation préalable. Ce droit est exclusivement réservé aux taxis.",
    blocks: [
      {
        heading: "LES 3 FORMES DE MARAUDE (définies par le Code des transports)",
        color: "#1a5276",
        points: [
          "1. Le fait de PRENDRE EN CHARGE un client sur la voie publique SANS réservation préalable.",
          "2. Le fait d'ÊTRE EN QUÊTE DE CLIENTÈLE sur la voie publique (circuler lentement en cherchant des passagers).",
          "3. Le fait de dépasser 1 HEURE d'attente pour récupérer un client dans une gare ou un aéroport par rapport à l'horaire prévu."
        ]
      },
      {
        heading: "TAXI — Maraude AUTORISÉE ✔",
        color: "#27ae60",
        points: [
          "Autorisée UNIQUEMENT dans la zone de rattachement du taxi.",
          "HORS de la zone : réservation préalable obligatoire (comme un VTC).",
          "Peut stationner aux emplacements TAXI (tête de station).",
          "Lumignon VERT = libre — Lumignon ROUGE = occupé."
        ]
      },
      {
        heading: "VTC / VMDTR — Maraude INTERDITE ✖",
        color: "#c0392b",
        points: [
          "Jamais de prise en charge sans réservation préalable enregistrée.",
          "Interdit de stationner aux emplacements taxis.",
          "⚠ Sanction maraude VTC : DÉLIT — 1 an de prison + 15 000 € d'amende.",
          "La simple présence visible sur la voie publique en attente de clients sans réservation peut être qualifiée de maraude."
        ]
      }
    ]
  },
  // ── Page 25 ──
  {
    type: "schema",
    title: "La maraude et les conditions du véhicule taxi — Schémas",
    intro: "Taxi vs VTC : qui peut faire quoi sur la voie publique ?",
    tables: [
      {
        headers: ["🚕 TAXI", "🚗 VTC"],
        rows: [
          ["✔ Maraude dans la zone de rattachement", "✘ Maraude INTERDITE partout"],
          ["✔ Stationnement emplacements TAXI", "✘ Emplacements taxi INTERDITS"],
          ["✔ Lumignon vert = disponible", "✘ Pas de signalétique de disponibilité"],
          ["✔ Prise en charge immédiate dans la rue", "✘ Jamais de prise en charge sans réservation"],
          ["✘ Hors zone → réservation obligatoire", "✔ Réservation → prise en charge autorisée"]
        ]
      },
      {
        headers: ["< 10 ans", "Min 3 pass.", "Couleur", "Signalétique", "Taximètre"],
        rows: [
          ["Âge max du véhicule", "Capacité d'accueil", "Blanche, grise ou noire (Lyon)", "Dispositif lumineux TAXI + commune", "Homologué + Carnet métrologique"]
        ]
      }
    ]
  },
  // ── Page 26 ──
  {
    type: "section",
    title: "6. Réglementation des VTC",
    subtitle: "Voiture de Transport avec Chauffeur — Réservation toujours obligatoire"
  },
  // ── Page 27 ──
  {
    type: "content",
    title: "Réglementation des VTC — Cadre légal, statut et tarifs",
    ref: "Code des transports — Registre National VTC — DRIEAT",
    intro: "Le VTC se distingue fondamentalement du taxi par deux règles absolues : la réservation préalable est toujours obligatoire et les tarifs sont librement fixés à l'avance. Il peut exercer sur toute la France sans restriction géographique.",
    blocks: [
      {
        heading: "CADRE RÉGLEMENTAIRE VTC",
        color: "#117a65",
        points: [
          "Texte : Code des transports.",
          "Inscription obligatoire au REGISTRE NATIONAL des VTC (DRIEAT).",
          "Vignette VTC sur le véhicule.",
          "Exercer sans inscription au registre : DÉLIT — 1 an + 15 000 €.",
          "Peut exercer sur TOUTE LA FRANCE — aucune restriction géographique."
        ]
      },
      {
        heading: "STATUT ET TARIFS VTC",
        color: "#1f618d",
        points: [
          "Statut : SALARIÉ (Uber, Bolt…) OU INDÉPENDANT (micro-entrepreneur).",
          "Tarif : FORFAIT LIBRE fixé à l'avance. Prix communiqué AVANT le départ.",
          "Pas de taximètre mais un système de calcul du prix est requis.",
          "RC Circulation (titre onéreux) + RC Professionnelle obligatoires."
        ]
      },
      {
        heading: "CONDITIONS D'ACCÈS VTC",
        color: "#2c3e50",
        points: [
          "Carte professionnelle T3P (examen réussi — tronc commun avec taxi). Aucune équivalence par expérience.",
          "Certificat médical valide. Casier judiciaire B2 vierge. Permis B hors période probatoire.",
          "PSC1 NON obligatoire pour les VTC. Inscription individuelle au Registre national des VTC."
        ]
      }
    ],
    keyRule: "RÈGLE D'OR VTC : Réservation PRÉALABLE OBLIGATOIRE — toujours. Jamais de prise en charge dans la rue. Maraude = DÉLIT : 1 an + 15 000 €."
  },
  // ── Page 28 ──
  {
    type: "content",
    title: "Conditions du véhicule VTC — Les 5 critères obligatoires",
    ref: "Art. R3122-1 Code des transports — Sauf hybrides, électriques et véhicules de collection",
    intro: "Le véhicule VTC doit répondre à des critères précis fixés par le Code des transports. Ces critères visent à garantir un niveau de confort et de sécurité élevé pour les passagers.",
    blocks: [
      {
        heading: "PLACES",
        color: "#2980b9",
        points: [
          "4 à 9 places (chauffeur compris).",
          "Un VTC ne peut pas avoir plus de 8 passagers.",
          "Sauf hybrides, électriques ou véhicules de collection."
        ]
      },
      {
        heading: "ÂGE",
        color: "#27ae60",
        points: [
          "Moins de 7 ans au moment de l'utilisation.",
          "Sauf hybrides, électriques ou véhicules de collection."
        ]
      },
      {
        heading: "PORTES",
        color: "#8e44ad",
        points: [
          "Minimum 4 portes.",
          "Véhicule 2 portes ou 3 portes non accepté."
        ]
      },
      {
        heading: "DIMENSIONS",
        color: "#d35400",
        points: [
          "4,50 m × 1,70 m — Dimensions minimales hors tout requises."
        ]
      },
      {
        heading: "PUISSANCE",
        color: "#c0392b",
        points: [
          "Minimum 84 kW (≈ 114 chevaux). Garantit confort de motorisation."
        ]
      }
    ],
    keyRule: "Formation continue identique au taxi : 14 heures tous les 5 ans. PSC1 non obligatoire pour les VTC (contrairement aux taxis)."
  },
  // ── Page 29 ──
  {
    type: "table",
    title: "Comparatif Taxi vs VTC",
    intro: "Conditions véhicule VTC — Schéma visuel + comparatif Taxi/VTC",
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
  // ── Page 30 ──
  {
    type: "section",
    title: "6b. Réglementation des VMDTR",
    subtitle: "Véhicules Motorisés à Deux ou Trois Roues — Moto-taxi"
  },
  // ── Page 31 ──
  {
    type: "content",
    title: "Réglementation des VMDTR — Cadre légal, statut et tarifs",
    ref: "Véhicules Motorisés à Deux ou Trois Roues — Code des transports",
    intro: "Le VMDTR (Véhicule Motorisé à Deux ou Trois Roues) est la troisième profession T3P. Comme le VTC, la réservation préalable est TOUJOURS obligatoire. Il ne peut transporter qu'un seul passager à la fois. Exercé principalement sous forme de « moto-taxi ».",
    blocks: [
      {
        heading: "CADRE RÉGLEMENTAIRE VMDTR",
        color: "#6c3483",
        points: [
          "Texte de référence : Code des transports.",
          "Autorité compétente : Ministère de la Transition écologique et de la Cohésion des territoires.",
          "Pas d'inscription à un registre national (contrairement au VTC).",
          "Carte professionnelle VMDTR obligatoire — délivrée par la préfecture.",
          "Réservation PRÉALABLE obligatoire — maraude INTERDITE."
        ]
      },
      {
        heading: "STATUT ET TARIFS VMDTR",
        color: "#1a5276",
        points: [
          "Statut : SALARIÉ ou TRAVAILLEUR INDÉPENDANT.",
          "Tarif : forfait libre OU tarif horokilométrique — fixé à l'avance.",
          "Prix communiqué AVANT le départ.",
          "Pas de taximètre — système de calcul de prix requis.",
          "RC Circulation (titre onéreux) + RC Professionnelle obligatoires.",
          "1 passager maximum à bord."
        ]
      },
      {
        heading: "⚠ SANCTIONS SPÉCIFIQUES VMDTR",
        color: "#c0392b",
        points: [
          "3ème classe : Exercice avec moto non-conforme (< 40 kW ou > 5 ans) → Amende jusqu'à 450 €.",
          "Délit : Prise en charge sans réservation préalable → 1 an de prison + 15 000 €.",
          "Délit : Exercice sans carte professionnelle VMDTR valide → Classe 5 + jusqu'à 1 500 €."
        ]
      }
    ],
    keyRule: "RÈGLE D'OR DU VMDTR : Réservation PRÉALABLE OBLIGATOIRE — 1 passager max — Maraude = DÉLIT : 1 an + 15 000 €."
  },
  // ── Page 32 ──
  {
    type: "content",
    title: "Conditions d'accès à la profession VMDTR",
    ref: "CONDITIONS D'ACCÈS À LA CARTE PROFESSIONNELLE VMDTR",
    blocks: [
      {
        heading: "🏍 PERMIS DE CONDUIRE CATÉGORIE A",
        color: "#6c3483",
        points: [
          "Permis de conduire de catégorie A depuis AU MOINS 3 ANS.",
          "Le permis doit être hors période probatoire.",
          "Permis A1 ou A2 insuffisant — seul le permis A (sans restriction) est accepté.",
          "💡 Attention : contrairement au VTC/Taxi (permis B), le VMDTR exige le permis A moto — 3 ans minimum."
        ]
      },
      {
        heading: "📋 CARTE PROFESSIONNELLE VMDTR",
        color: "#1a5276",
        points: [
          "Réussir l'examen T3P (tronc commun) OU justifier d'une expérience professionnelle dans le transport de personnes d'au moins 12 mois au cours des 10 années précédant la demande.",
          "La carte est délivrée par la préfecture dans un délai maximum de 3 mois.",
          "💡 Carte apposée sur le véhicule — photographie visible de l'extérieur obligatoire."
        ]
      },
      {
        heading: "🩺 VISITE MÉDICALE",
        color: "#27ae60",
        points: [
          "Visite médicale obligatoire auprès d'un médecin agréé par la préfecture.",
          "20 à 60 ans : tous les 5 ans.",
          "60 à 76 ans : tous les 2 ans.",
          "76 ans et + : tous les ans.",
          "💡 Sans attestation médicale valide → Classe 4 d'amende et impossibilité de travailler."
        ]
      },
      {
        heading: "📄 CASIER JUDICIAIRE B2 VIERGE",
        color: "#c0392b",
        points: [
          "Le bulletin n°2 du casier judiciaire ne doit pas mentionner certaines condamnations incompatibles avec l'exercice du T3P.",
          "Casier vérifié à chaque renouvellement de la carte professionnelle.",
          "💡 Condamnations définitives uniquement (après délai de 10 jours)."
        ]
      }
    ]
  },
  // ── Page 33 ──
  {
    type: "content",
    title: "Conditions du véhicule VMDTR",
    ref: "Critères obligatoires — Moteur, âge, équipements",
    intro: "Le véhicule VMDTR doit répondre à des critères réglementaires stricts.",
    blocks: [
      {
        heading: "ÂGE MAXIMUM",
        color: "#2980b9",
        points: [
          "< 5 ANS au moment de l'utilisation professionnelle.",
          "(Contrairement au VTC : < 7 ans, Taxi : < 10 ans)"
        ]
      },
      {
        heading: "PUISSANCE NETTE MOTEUR",
        color: "#d35400",
        points: [
          "≥ 40 kW.",
          "Un moteur insuffisant = infraction de 3ème classe."
        ]
      },
      {
        heading: "PASSAGER MAXIMUM",
        color: "#c0392b",
        points: [
          "1 seul passager à la fois — en plus du conducteur.",
          "Pas de copassager supplémentaire."
        ]
      },
      {
        heading: "ÉQUIPEMENTS DE PROTECTION (EPI)",
        color: "#2c3e50",
        points: [
          "Casque homologué obligatoire pour le conducteur ET le passager.",
          "Veste, gants, pantalons de protection recommandés/obligatoires selon réglementation."
        ]
      }
    ]
  },
  // ── Page 34 ──
  {
    type: "table",
    title: "Comparatif des 3 professions T3P",
    intro: "Documents de contrôle VMDTR et tableau comparatif des 3 professions",
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
  // ── Page 35 ──
  {
    type: "section",
    title: "7. Les organismes autour du T3P et centres de formation",
    subtitle: "Préfecture, DRIEAT, CMA, Ministère — Centres agréés — Fin Partie 1"
  },
  // ── Page 36 ──
  {
    type: "content",
    title: "Les organismes gravitant autour du T3P",
    ref: "Organismes administratifs, consulaires, représentatifs et de contrôle",
    intro: "Le secteur T3P est encadré par plusieurs institutions complémentaires. À l'examen, il faut savoir quel organisme est responsable de quelle mission.",
    blocks: [
      {
        heading: "PRÉFECTURE / PRÉFET",
        color: "#1a5276",
        points: [
          "Enregistrement des documents administratifs carte Taxi/VTC/VMDTR.",
          "Délivre et retire les cartes professionnelles T3P.",
          "Délivre les autorisations de stationnement (ADS) pour les taxis."
        ]
      },
      {
        heading: "MINISTÈRE DE LA TRANSITION ÉCOLOGIQUE ET SOLIDAIRE",
        color: "#117a65",
        points: [
          "Application et contrôle des lois concernant les activités T3P.",
          "Prépare et suit la politique de l'État à l'égard des taxis et des VTC."
        ]
      },
      {
        heading: "DRIEAT (Île-de-France) / DREAL (autres régions)",
        color: "#2e86c1",
        points: [
          "Agrée les centres de formation pour une durée de 5 ans renouvelable.",
          "Répertorie la réglementation liée aux professions T3P.",
          "Inscription au registre des VTC — Demande de vignette VTC."
        ]
      },
      {
        heading: "CHAMBRE DES MÉTIERS ET DE L'ARTISANAT (CMA)",
        color: "#7d3c98",
        points: [
          "Enregistrement des entreprises de transport public (personnes et marchandises).",
          "Délivrance des licences de transport de personnes et de marchandises.",
          "Contrôle l'application de la réglementation."
        ]
      },
      {
        heading: "LES CENTRES DE FORMATION",
        color: "#d35400",
        points: [
          "Centre d'examens TAXI / VTC / VMDTR.",
          "Stage de préparation à l'installation pour la création d'une entreprise.",
          "Dispensent les cours pour la préparation à l'examen de chauffeur TAXI, VTC et VMDTR.",
          "Agréés par la préfecture pour une durée de 5 ans renouvelable.",
          "Proposent les formations continues obligatoires pour les chauffeurs T3P."
        ]
      },
      {
        heading: "LA COMMISSION DISCIPLINAIRE",
        color: "#c0392b",
        points: [
          "Peut comprendre jusqu'à 3 sections spécialisées : Taxis / VTC / VMDTR.",
          "Composée à parts égales des membres du collège de l'État et du collège des professionnels.",
          "L'inculpé peut venir avec une personne de son choix."
        ]
      }
    ]
  },
  // ── Page 37 ──
  {
    type: "schema",
    title: "Les organismes autour du T3P — Schéma de l'écosystème",
    intro: "Qui intervient auprès du conducteur T3P et pour quoi ?",
    tables: [
      {
        headers: ["PRÉFECTURE", "CHAMBRE DES MÉTIERS", "DRIEAT / DREAL", "POLICE / GENDARMERIE"],
        rows: [
          ["Carte pro / ADS", "Examen / Formation", "Registre VTC / LOTI", "Contrôle route"]
        ]
      },
      {
        headers: ["URSSAF", "DGFIP / DGCCRF", "MINISTÈRE DES TRANSPORTS"],
        rows: [
          ["Cotisations sociales", "Fiscal / Commercial", "Politique nationale — lois et décrets"]
        ]
      }
    ]
  },
  // ── Page 38 ──
  {
    type: "synthesis",
    title: "Synthèse — Les organismes gravitant autour du T3P",
    intro: "Récapitulatif des missions de chaque organisme (p.113)",
    sections: [
      {
        heading: "LES PRÉFECTURES",
        color: "#1a5276",
        points: [
          "Enregistrement des documents administratifs carte Taxi/VTC/VMDTR.",
          "Application et contrôle des lois concernant les taxis et les VTC.",
          "Inscription au registre des VTC — Demande de vignette VTC.",
          "Répertorie la réglementation liée aux professions T3P."
        ]
      },
      {
        heading: "DRIEAT / DREAL",
        color: "#117a65",
        points: [
          "Enregistrement des entreprises de transport public (personnes et marchandises).",
          "Délivrance des licences de transport de personnes et de marchandises.",
          "Contrôle l'application de la réglementation."
        ]
      },
      {
        heading: "LES CENTRES DE FORMATION",
        color: "#d35400",
        points: [
          "Centre d'examens TAXI/VTC/VMDTR.",
          "Stage de préparation à l'installation pour la création d'une entreprise.",
          "Dispensent les cours pour la préparation à l'examen TAXI, VTC et VMDTR.",
          "Agréés par la préfecture pour une durée de 5 ans renouvelable.",
          "Proposent les formations continues obligatoires pour les chauffeurs T3P."
        ]
      }
    ]
  },
  // ── Page 39 ──
  {
    type: "section",
    title: "8. Les assurances obligatoires",
    subtitle: "RC Circulation + RC Professionnelle — Loi Badinter — FGAO"
  },
  // ── Page 40 ──
  {
    type: "content",
    title: "Les 2 assurances obligatoires pour tout conducteur T3P",
    ref: "RC de circulation + RC professionnelle — Toutes deux obligatoires et cumulatives",
    intro: "Tout conducteur T3P doit impérativement souscrire DEUX contrats d'assurance distincts. Ces deux assurances couvrent des risques différents et sont complémentaires. Oublier de déclarer l'usage professionnel peut entraîner un refus total d'indemnisation.",
    blocks: [
      {
        heading: "1. RC CIRCULATION (à titre onéreux)",
        color: "#2980b9",
        points: [
          "Couvre les dommages CORPORELS, MATÉRIELS et IMMATÉRIELS causés à un client ou à un tiers AVEC L'IMPLICATION DU VÉHICULE.",
          "Exemple : accident lors d'une course qui blesse le passager ou un autre usager de la route — le véhicule est impliqué.",
          "OBLIGATION : déclarer l'usage professionnel à l'assureur. Sans déclaration = fausse déclaration → risque de refus d'indemnisation total.",
          "Défaut d'assurance : DÉLIT — jusqu'à 3 750 € d'amende."
        ]
      },
      {
        heading: "2. RC PROFESSIONNELLE (d'exploitation)",
        color: "#27ae60",
        points: [
          "Couvre les dommages CORPORELS, MATÉRIELS et IMMATÉRIELS causés à un client ou à un tiers EN DEHORS DE TOUTE IMPLICATION DU VÉHICULE.",
          "Exemple : un client glisse en montant dans le véhicule. Ou ses bagages sont endommagés lors du chargement. Le véhicule n'est pas impliqué dans un accident.",
          "Les 3 éléments de la responsabilité civile : FAUTE + DOMMAGE + LIEN DE CAUSALITÉ.",
          "Sans ces 3 éléments simultanément, la responsabilité ne peut pas être engagée."
        ]
      },
      {
        heading: "LOI BADINTER (5 juillet 1985) — Protection des victimes + FGAO",
        color: "#7d3c98",
        points: [
          "La loi Badinter garantit l'indemnisation de TOUTES les victimes sous 3 conditions : accident de circulation + véhicule terrestre à moteur impliqué + implication du véhicule.",
          "FGAO (Fonds de Garantie des Assurances Obligatoires) : indemnise les victimes quand le responsable n'est PAS ASSURÉ ou n'est PAS IDENTIFIÉ (délit de fuite).",
          "Le conducteur non assuré reste personnellement redevable de la totalité des sommes versées."
        ]
      }
    ],
    keyRule: "Les 2 assurances sont CUMULATIVES et obligatoires. Ni l'une ni l'autre ne peut remplacer l'autre. Sanction : jusqu'à 3 750 € d'amende."
  },
  // ── Page 41 ──
  {
    type: "schema",
    title: "Les assurances — Schéma : qui couvre quoi ?",
    intro: "RC Circulation vs RC Professionnelle : les deux situations couvertes :",
    tables: [
      {
        headers: ["RC CIRCULATION", "RC PROFESSIONNELLE"],
        rows: [
          ["VÉHICULE IMPLIQUÉ dans l'accident", "VÉHICULE NON IMPLIQUÉ — pas d'accident de circulation"]
        ]
      }
    ],
    lists: [
      {
        heading: "Exemples RC Circulation",
        items: [
          "Accident avec un autre véhicule pendant une course",
          "Choc avec un piéton lors du trajet",
          "Collision dans un parking",
          "Tout dommage où le véhicule est impliqué"
        ]
      },
      {
        heading: "Exemples RC Professionnelle",
        items: [
          "Client glisse en montant dans le véhicule",
          "Bagages endommagés lors du chargement",
          "Chute d'un passager à l'arrêt complet",
          "Mauvaise information causant un préjudice"
        ]
      }
    ],
    keyRule: "Les 2 assurances sont CUMULATIVES et obligatoires. Condition RC : Faute + Dommage + Lien de causalité DIRECT."
  },
  // ── Page 42 ──
  {
    type: "section",
    title: "9. Formation continue et visite médicale",
    subtitle: "Obligations périodiques pour maintenir la carte professionnelle"
  },
  // ── Page 43 ──
  {
    type: "content",
    title: "Formation continue et visite médicale obligatoires",
    ref: "Conditions de maintien de la carte professionnelle T3P",
    intro: "Obtenir la carte professionnelle n'est qu'une première étape. Pour la conserver, deux obligations périodiques doivent être respectées : la formation continue et la visite médicale. Elles s'appliquent aux Taxis, VTC et VMDTR.",
    blocks: [
      {
        heading: "FORMATION CONTINUE — 14h tous les 5 ANS",
        color: "#2980b9",
        points: [
          "Mise à jour réglementaire (nouvelles lois, arrêtés).",
          "Révision de la sécurité routière spécifique T3P.",
          "Amélioration relation client — gestion situations difficiles.",
          "Depuis 2024 : prévention des discriminations et des VSS.",
          "Centre de formation AGRÉÉ par le Préfet (pour 5 ans). CPF mobilisable.",
          "Sans justificatif → carte non renouvelée → exercice illégal = DÉLIT.",
          "La formation peut être fractionnée sur les 5 ans."
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
  // ── Page 44 ──
  {
    type: "schema",
    title: "Formation et visite médicale — Schéma chronologique",
    intro: "Cycle de maintien de la carte professionnelle T3P dans le temps :",
    tables: [
      {
        headers: ["Obtention carte pro", "Visite méd. (20-60 ans)", "Formation continue", "Visite méd. (60-76 ans)", "Visite méd. (76 ans+)"],
        rows: [
          ["Examen réussi", "Tous les 5 ans", "14h — Centre agréé", "Tous les 2 ans", "Chaque année"]
        ]
      }
    ],
    keyRule: "Formation continue (14h/5ans) + Visite médicale : deux conditions cumulatives pour renouveler la carte professionnelle T3P."
  },
  // ── Page 45 ──
  {
    type: "chiffres",
    title: "FICHE DE RÉVISION — Les chiffres et délais essentiels à retenir",
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
      { val: "5 ans", desc: "Mandat Comité national" },
      { val: "3 ans", desc: "Mandat commission locale" },
      { val: "1 fois/an", desc: "Réunion commission locale" },
      { val: "100 000", desc: "Hab. — seuil services occas." },
      { val: "10 places", desc: "Mini véhicule services occas." },
      { val: "12/20", desc: "Note min. épreuve pratique" },
      { val: "6/20", desc: "Note éliminatoire théorique" },
    ]
  },
  // ── Page 46 ──
  {
    type: "section",
    title: "Synthèse Partie 1 — Révision",
    subtitle: "Définition T3P • Non-inscription • Assurances • Maraude • Carte pro • Permis"
  },
  // ── Page 47 ──
  {
    type: "synthesis",
    title: "Définition du T3P et cas de non-inscription à l'examen",
    sections: [
      {
        heading: "DÉFINITION DES PRESTATIONS T3P (Code des transports)",
        color: "#1a5276",
        points: [
          "Les prestations de transports publics particuliers sont des prestations de transport public routier de personnes qui NE relèvent NI des transports publics collectifs NI du transport privé routier de personnes.",
          "Elles sont exécutées, à titre onéreux, par les taxis, les voitures de transport avec chauffeur et les véhicules motorisés à deux ou trois roues."
        ]
      },
      {
        heading: "LES 3 CAS DE NON-INSCRIPTION À UN EXAMEN T3P",
        color: "#c0392b",
        points: [
          "1er CAS — Retrait définitif de carte : dans les DIX ANS qui précèdent sa demande, retrait DÉFINITIF de sa carte professionnelle.",
          "2ème CAS — Fraude à un examen : dans les CINQ ANS qui précèdent, exclusion pour fraude lors d'une session d'examen T3P.",
          "3ème CAS — Permis probatoire : le délai probatoire n'est pas expiré (2 ans AAC ou 3 ans conduite normale)."
        ]
      }
    ],
    keyRule: "ATTENTION : une condamnation DÉFINITIVE n'est pas une condamnation temporaire. Le délai de recours est en général de 10 jours après le prononcé du jugement."
  },
  // ── Page 48 ──
  {
    type: "synthesis",
    title: "Assurances, visite médicale, formation continue et maraude",
    sections: [
      {
        heading: "LES 2 ASSURANCES OBLIGATOIRES T3P",
        color: "#2980b9",
        points: [
          "RC CIRCULATION : dommages corporels, matériels ou immatériels AVEC implication du véhicule.",
          "RC PROFESSIONNELLE D'EXPLOITATION : dommages EN DEHORS de toute implication du véhicule."
        ]
      },
      {
        heading: "VISITE MÉDICALE",
        color: "#27ae60",
        points: [
          "20 à 60 ans : tous les 5 ans.",
          "60 à 76 ans : tous les 2 ans (lendemain date anniversaire des 60 ans).",
          "À partir de 76 ans : chaque année."
        ]
      },
      {
        heading: "LA MARAUDE — TABLEAU DES RÈGLES",
        color: "#c0392b",
        points: [
          "🚕 TAXI : Oui — uniquement dans la zone de rattachement.",
          "🚗 VTC : Non — réservation préalable obligatoire.",
          "🛵 VMDTR : Non — réservation préalable obligatoire."
        ]
      }
    ],
    keyRule: "SOURCES DE LA RÉGLEMENTATION — Les 3 professions s'appuient sur : Code des transports | Textes préfectoraux (Taxi) | EPCI/Métropole (Taxi)."
  },
  // ── Page 49 ──
  {
    type: "synthesis",
    title: "Documents de contrôle et délivrance de la carte professionnelle",
    intro: "Livre pages 110-111",
    sections: [
      {
        heading: "📋 DOCUMENTS VÉHICULE",
        color: "#1a5276",
        points: [
          "Carte grise.",
          "Contrôle technique ou attestation d'entretien.",
          "Attestation d'assurance à titre onéreux.",
          "Permis A ou B."
        ]
      },
      {
        heading: "💼 DOCUMENTS PROFESSION",
        color: "#117a65",
        points: [
          "Carte professionnelle T3P.",
          "Attestation médicale ou visite médicale.",
          "Billet individuel ou collectif ou carnet de bord (sauf taxi).",
          "Licence (ADS ou inscription au registre).",
          "Pour salariés : contrat de travail + DPAE.",
          "Carnet de notes concernant les tarifs.",
          "Carnet métrologique taximètre (taxi).",
          "Attestation de formation continue."
        ]
      },
      {
        heading: "LA CARTE PROFESSIONNELLE — CONDITIONS DE DÉLIVRANCE",
        color: "#7d3c98",
        points: [
          "Permis hors période probatoire : titulaire d'un permis B (taxi/VTC) ou A 3 ans.",
          "Aptitude professionnelle : examen réussi OU expérience pro de 12 mois minimum dans les 10 ans précédant la demande.",
          "Honorabilité professionnelle : casier judiciaire B2 vierge des mentions incompatibles avec l'exercice du T3P."
        ]
      }
    ]
  },
  // ── Page 50 ──
  {
    type: "content",
    title: "La perte de 6 points sur le permis de conduire",
    blocks: [
      {
        heading: "LES CONTRAVENTIONS — 6 pts retirés",
        color: "#e67e22",
        points: [
          "Alcool 0,25 à 0,4 mg/litre d'air expiré (0,5 à 0,8 g/l de sang).",
          "Excès de vitesse > 50 km/h (radar auto ou mobile).",
          "Utilisation d'un détecteur de radar ou avertisseur antiradars."
        ]
      },
      {
        heading: "LES DÉLITS — 6 pts retirés",
        color: "#c0392b",
        points: [
          "Alcool ≥ 0,40 mg/litre d'air expiré (≥ 0,8 g/l de sang).",
          "Conduite en état d'ivresse manifeste.",
          "Conduite après consommation de stupéfiants.",
          "Refus de se soumettre aux tests (alcool ou stupéfiants).",
          "Homicide ou blessures involontaires (incapacité de travail).",
          "Délit de fuite.",
          "Refus d'obtempérer ou de s'immobiliser.",
          "Gêne ou entrave à la circulation.",
          "Usage volontaire de fausses plaques d'immatriculation.",
          "Conduite malgré retrait/suspension/annulation de permis."
        ]
      },
      {
        heading: "MENTIONS DU B2 INCOMPATIBLES AVEC L'EXERCICE DU T3P — 3 CONDAMNATIONS DÉFINITIVES",
        color: "#8e44ad",
        points: [
          "Délit permis (retrait 6 pts) : condamnation définitive pour un délit du Code de la route donnant lieu à une réduction de la moitié du nombre maximal de points du permis.",
          "Peine criminelle ou correctionnelle ≥ 6 mois : vol, escroquerie, abus de confiance, atteinte à l'intégrité, agression sexuelle, trafic d'armes, extorsion, stupéfiants.",
          "Conduite sans permis / malgré annulation : conduite sans permis, malgré l'annulation, l'interdiction d'obtenir le permis, ou refus de restitution."
        ]
      }
    ]
  }
];
