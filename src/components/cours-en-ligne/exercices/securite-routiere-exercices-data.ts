import type { ExerciceQuestion } from "./types";

// =============================================
// MATIÈRE C — SÉCURITÉ ROUTIÈRE — Exercices
// Source : Securite_Routiere_Exercices_Partie1.pdf,
//          Securite_Routiere_Exercices_Partie2.pdf,
//          Securite_Routiere_Exercices_Partie3.pdf
// =============================================

export const SECURITE_ROUTIERE_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  // ──────────────────────────────────────────────
  // PARTIE 1 — Signalisation, Marquages & Priorités
  // ──────────────────────────────────────────────
  {
    id: 80, actif: true,
    titre: "Sécurité Routière — Partie 1 : Signalisation, Marquages & Priorités",
    sousTitre: "Panneaux de signalisation, marquages au sol, voies spéciales, stationnement, priorités, feux, éclairage",
    questions: [
      // SECTION 1 — PANNEAUX DE SIGNALISATION
      { id: 1, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-cedez-passage.png", choix: [
        { lettre: "A", texte: "Stop" },
        { lettre: "B", texte: "Cédez le passage", correct: true },
        { lettre: "C", texte: "Interdiction de stationner" },
      ]},
      { id: 2, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-fin-priorite.png", choix: [
        { lettre: "A", texte: "Sortie de zone à stationnement interdit" },
        { lettre: "B", texte: "Passage pour piétons" },
        { lettre: "C", texte: "Priorité ponctuelle à la prochaine intersection", correct: true },
      ]},
      { id: 3, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-priorite-droite.png", choix: [
        { lettre: "A", texte: "Virage à droite" },
        { lettre: "B", texte: "Priorité à droite à la prochaine intersection", correct: true },
        { lettre: "C", texte: "Virage à gauche" },
      ]},
      { id: 4, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-cedez-passage.png", choix: [
        { lettre: "A", texte: "Cédez le passage", correct: true },
        { lettre: "B", texte: "Priorité ponctuelle à la prochaine intersection" },
        { lettre: "C", texte: "Succession de virages dont le 1er est à droite" },
      ]},
      { id: 5, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-route-prioritaire.png", choix: [
        { lettre: "A", texte: "Sortie de zone à stationnement interdit" },
        { lettre: "B", texte: "Fin de voie réservée aux véhicules de TC" },
        { lettre: "C", texte: "Route à caractère prioritaire", correct: true },
      ]},
      { id: 6, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-arret-bus.png", choix: [
        { lettre: "A", texte: "Stationnement interdit" },
        { lettre: "B", texte: "Sens unique" },
        { lettre: "C", texte: "Arrêt d'autobus", correct: true },
      ]},
      { id: 7, enonce: "Ce panneau m'annonce :", image: "/cours/examens/panneaux/panneau-impasse.png", choix: [
        { lettre: "A", texte: "Fin de route à accès réglementé" },
        { lettre: "B", texte: "Arrêt et stationnement interdit" },
        { lettre: "C", texte: "Impasse", correct: true },
      ]},
      { id: 8, enonce: "Ce panneau signifie que le :", image: "/cours/examens/panneaux/panneau-stationnement-interdit-1-15.png", choix: [
        { lettre: "A", texte: "Stationnement est interdit du 1er au 15 du mois du côté du panneau", correct: true },
        { lettre: "B", texte: "Stationnement est interdit du 16 au 31 du mois" },
        { lettre: "C", texte: "Stationnement interdit" },
      ]},
      { id: 9, enonce: "Ce panneau signifie que le :", image: "/cours/examens/panneaux/panneau-stationnement-interdit-16-31.png", choix: [
        { lettre: "A", texte: "Stationnement interdit" },
        { lettre: "B", texte: "Stationnement interdit du 1er au 15 du mois" },
        { lettre: "C", texte: "Stationnement est interdit du 16 au 31 du mois du côté du panneau", correct: true },
      ]},
      { id: 10, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-arret-stationnement-interdit.png", choix: [
        { lettre: "A", texte: "Sortie de zone à stationnement interdit" },
        { lettre: "B", texte: "Arrêt et stationnement interdit", correct: true },
        { lettre: "C", texte: "Proximité d'une chaussée rétrécie" },
      ]},
      { id: 11, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-enfants.png", choix: [
        { lettre: "A", texte: "Passage d'animaux sauvages" },
        { lettre: "B", texte: "Endroit fréquenté par les enfants", correct: true },
        { lettre: "C", texte: "Chemin obligatoire pour cavaliers" },
      ]},
      { id: 12, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-passage-pietons.png", choix: [
        { lettre: "A", texte: "Passage pour piétons", correct: true },
        { lettre: "B", texte: "Endroit fréquenté par les enfants" },
        { lettre: "C", texte: "Chemin obligatoire pour piétons" },
      ]},
      { id: 13, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-voie-bus.png", choix: [
        { lettre: "A", texte: "Voie réservée aux véhicules de transport en commun", correct: true },
        { lettre: "B", texte: "Fin de voie réservée aux véhicules de TC" },
      ]},
      { id: 14, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-vitesse-minimum.png", choix: [
        { lettre: "A", texte: "Vitesse maximum obligatoire" },
        { lettre: "B", texte: "Vitesse minimum obligatoire", correct: true },
        { lettre: "C", texte: "Fin de route à accès réglementé" },
      ]},
      { id: 15, enonce: "Ce panneau signifie :", image: "/cours/examens/panneaux/panneau-piste-cyclable.png", choix: [
        { lettre: "A", texte: "Passage pour piétons" },
        { lettre: "B", texte: "Fin de piste cyclable" },
        { lettre: "C", texte: "Débouchés de cyclistes", correct: true },
      ]},
      { id: 16, enonce: "Ce panneau « ALLUMEZ VOS FEUX » signifie :", choix: [
        { lettre: "A", texte: "Obligation d'allumer ses feux", correct: true },
        { lettre: "B", texte: "Tunnel" },
      ]},
      { id: 17, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Accès interdit aux véhicules de matières dangereuses" },
        { lettre: "B", texte: "Accès interdit aux véhicules de marchandises" },
        { lettre: "C", texte: "Accès interdit aux véhicules de TC", correct: true },
      ]},
      { id: 18, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Contournement obligatoire par la droite", correct: true },
        { lettre: "B", texte: "Sens unique" },
        { lettre: "C", texte: "Succession de virages" },
      ]},
      { id: 19, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Fin de route à accès réglementé" },
        { lettre: "B", texte: "Fin de voie réservée aux véhicules de TC", correct: true },
        { lettre: "C", texte: "Arrêt d'autobus" },
      ]},
      { id: 20, enonce: "Ce panneau (TAXI) signifie :", choix: [
        { lettre: "A", texte: "Station de taxis", correct: true },
        { lettre: "B", texte: "Interdiction aux taxis" },
        { lettre: "C", texte: "Arrêt d'autobus" },
      ]},
      { id: 21, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Succession de virages", correct: true },
        { lettre: "B", texte: "Virage à gauche" },
        { lettre: "C", texte: "Virage à droite" },
      ]},
      { id: 22, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Route à caractère prioritaire" },
        { lettre: "B", texte: "Arrêt et stationnement interdit" },
        { lettre: "C", texte: "Passage à niveau muni de barrière", correct: true },
      ]},
      { id: 23, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Endroit fréquenté par les enfants" },
        { lettre: "B", texte: "Chemin obligatoire pour piétons" },
        { lettre: "C", texte: "Passage pour piétons", correct: true },
      ]},
      { id: 24, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Débouchés de cyclistes" },
        { lettre: "B", texte: "Fin de piste ou de bande cyclable", correct: true },
        { lettre: "C", texte: "Fin de route à accès réglementé" },
      ]},
      { id: 25, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Terrain de camping pour caravane" },
        { lettre: "B", texte: "Passage d'animaux sauvages", correct: true },
        { lettre: "C", texte: "Passage d'animaux domestiques" },
      ]},
      { id: 26, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Proximité d'une chaussée rétrécie", correct: true },
        { lettre: "B", texte: "Arrêt d'autobus" },
        { lettre: "C", texte: "Impasse" },
      ]},
      { id: 27, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Débouché sur un quai ou une berge", correct: true },
        { lettre: "B", texte: "Passage pour piétons" },
        { lettre: "C", texte: "Aire piétonne" },
      ]},
      { id: 28, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Passage d'animaux domestiques", correct: true },
        { lettre: "B", texte: "Passage d'animaux sauvages" },
        { lettre: "C", texte: "Emplacement pour pique-nique" },
      ]},
      { id: 29, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Virage à droite" },
        { lettre: "B", texte: "Succession de virages dont le 1er est à droite", correct: true },
        { lettre: "C", texte: "Virage à gauche" },
      ]},
      { id: 30, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Emplacement pour pique-nique", correct: true },
        { lettre: "B", texte: "Terrain de camping" },
        { lettre: "C", texte: "Passage d'animaux sauvages" },
      ]},
      { id: 31, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Terrain de camping pour caravane" },
        { lettre: "B", texte: "Lieu aménagé pour le stationnement gratuit", correct: true },
        { lettre: "C", texte: "Stationnement interdit" },
      ]},
      { id: 32, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Toilettes publiques" },
        { lettre: "B", texte: "Passage pour piétons" },
        { lettre: "C", texte: "Aire piétonne", correct: true },
      ]},
      { id: 33, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Passage d'animaux sauvages" },
        { lettre: "B", texte: "Emplacement pour pique-nique", correct: true },
      ]},
      { id: 34, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Arrêt d'autobus" },
        { lettre: "B", texte: "Lieu aménagé pour le stationnement gratuit" },
        { lettre: "C", texte: "Terrain de camping pour caravane et auto-caravane", correct: true },
      ]},
      { id: 35, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Sens unique" },
        { lettre: "B", texte: "Fin de route à accès réglementé", correct: true },
        { lettre: "C", texte: "Route à caractère prioritaire" },
      ]},
      { id: 36, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Aire piétonne" },
        { lettre: "B", texte: "Passage pour piétons" },
        { lettre: "C", texte: "Endroit fréquenté par les enfants", correct: true },
      ]},
      { id: 37, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Impasse" },
        { lettre: "B", texte: "Sens unique", correct: true },
        { lettre: "C", texte: "Stop" },
      ]},

      // SECTION 2 — PANNEAUX AVANCÉS ET INTERDICTIONS
      { id: 38, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Lieu aménagé pour le stationnement gratuit" },
        { lettre: "B", texte: "Passage pour piétons" },
        { lettre: "C", texte: "Installations accessibles aux personnes handicapées à mobilité réduite", correct: true },
      ]},
      { id: 39, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Voie réservée aux véhicules de TC" },
        { lettre: "B", texte: "Stationnement interdit", correct: true },
        { lettre: "C", texte: "Fin de route à accès réglementé" },
      ]},
      { id: 40, enonce: "Ce panneau (aire piétonne) signifie :", choix: [
        { lettre: "A", texte: "Aire piétonne — piétons, cyclistes et véhicules de desserte autorisés. Piétons toujours prioritaires, rouler au pas.", correct: true },
        { lettre: "B", texte: "Endroit fréquenté par les enfants" },
        { lettre: "C", texte: "Chemin obligatoire pour piétons" },
      ]},
      { id: 41, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Impasse" },
        { lettre: "B", texte: "Tunnel", correct: true },
        { lettre: "C", texte: "Obligation d'allumer ses feux" },
      ]},
      { id: 42, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Passage interdit aux voitures" },
        { lettre: "B", texte: "Interdit de laver sa voiture" },
        { lettre: "C", texte: "Débouché sur un quai ou une berge", correct: true },
      ]},
      { id: 43, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Interdiction aux véhicules > 3,5t de dépasser" },
        { lettre: "B", texte: "Interdiction aux véhicules < 3,5t de dépasser" },
        { lettre: "C", texte: "Interdiction à tous les véhicules de dépasser", correct: true },
      ]},
      { id: 44, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Accès interdit aux véhicules de matières dangereuses", correct: true },
        { lettre: "B", texte: "Accès interdit aux véhicules de marchandises" },
        { lettre: "C", texte: "Accès interdit aux véhicules de TC" },
      ]},
      { id: 45, enonce: "Ce panneau (2,5t) signifie :", choix: [
        { lettre: "A", texte: "Accès interdit aux véhicules pesant sur un essieu plus que le nombre indiqué", correct: true },
        { lettre: "B", texte: "Accès réservé aux véhicules pesant sur un essieu plus que le nombre indiqué" },
        { lettre: "C", texte: "Accès interdit aux véhicules pesant plus que le nombre indiqué" },
      ]},
      { id: 46, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Accès interdit aux véhicules inflammables" },
        { lettre: "B", texte: "Accès interdit aux véhicules transportant des marchandises explosives ou inflammables", correct: true },
        { lettre: "C", texte: "Interdiction de brûler les véhicules stationnés" },
      ]},
      { id: 47, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Accès interdit aux véhicules polluants", correct: true },
        { lettre: "B", texte: "Zone de contrôle technique" },
        { lettre: "C", texte: "Zone à faibles émissions" },
      ]},
      { id: 48, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Interdit de faire du feu dans la forêt" },
        { lettre: "B", texte: "Accès interdit en périodes de fortes chaleurs" },
        { lettre: "C", texte: "Risque d'incendie", correct: true },
      ]},
      { id: 49, enonce: "Ce panneau m'annonce :", choix: [
        { lettre: "A", texte: "Une circulation à sens unique", correct: true },
        { lettre: "B", texte: "Une obligation d'aller tout droit à la prochaine intersection" },
      ]},
      { id: 50, enonce: "Ce panneau signifie que :", choix: [
        { lettre: "A", texte: "J'ai la priorité de passage par rapport à la circulation inverse", correct: true },
        { lettre: "B", texte: "Je dois céder le passage à la circulation inverse" },
      ]},
      { id: 51, enonce: "Dans une zone de rencontre :", choix: [
        { lettre: "A", texte: "Les piétons sont prioritaires sur tous les véhicules" },
        { lettre: "B", texte: "Les piétons sont prioritaires sur tous les véhicules sauf les tramways", correct: true },
        { lettre: "C", texte: "Les piétons doivent marcher sur les trottoirs" },
      ]},
      { id: 52, enonce: "Ce panneau indique :", choix: [
        { lettre: "A", texte: "Une zone à stationnement payant" },
        { lettre: "B", texte: "Une zone à stationnement à durée limitée avec contrôle par disque", correct: true },
        { lettre: "C", texte: "Une zone à stationnement unilatéral à alternance semi-mensuelle et à durée limitée avec contrôle par disque" },
      ]},
      { id: 53, enonce: "À partir de ce panneau :", choix: [
        { lettre: "A", texte: "Stationnement unilatéral" },
        { lettre: "B", texte: "Stationnement à alternance semi-mensuelle", correct: true },
      ]},
      { id: 54, enonce: "Ce panneau signale :", choix: [
        { lettre: "A", texte: "Un accès interdit aux piétons" },
        { lettre: "B", texte: "Une circulation interdite à tout véhicule dans les deux sens" },
        { lettre: "C", texte: "La fin de toutes les interdictions précédemment signalées", correct: true },
      ]},
      { id: 55, enonce: "Ce panneau signifie :", choix: [
        { lettre: "A", texte: "Interdiction de faire demi-tour jusqu'à la prochaine intersection", correct: true },
        { lettre: "B", texte: "Interdiction de faire demi-tour jusqu'à la prochaine intersection incluse" },
      ]},
      { id: 56, enonce: "Ce panneau interdit l'accès à certains usagers :", choix: [
        { lettre: "A", texte: "Les piétons", correct: true },
        { lettre: "B", texte: "Les cyclistes" },
        { lettre: "C", texte: "Les motocyclistes" },
        { lettre: "D", texte: "Les poids-lourds" },
      ]},

      // SECTION 3 — MARQUAGES AU SOL, VOIES SPÉCIALES ET PRIORITÉS
      { id: 57, enonce: "Ce panneau m'interdit l'accès si je conduis une fourgonnette (< 3,5 t) :", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 58, enonce: "Cette signalisation annonce :", choix: [
        { lettre: "A", texte: "Un virage" },
        { lettre: "B", texte: "Une intersection", correct: true },
      ]},
      { id: 59, enonce: "Un panneau carré ou rectangulaire signale :", choix: [
        { lettre: "A", texte: "Une obligation" },
        { lettre: "B", texte: "Une interdiction" },
        { lettre: "C", texte: "Une indication", correct: true },
        { lettre: "D", texte: "Un danger" },
      ]},
      { id: 60, enonce: "Nous sommes le 14 du mois. Avec le stationnement alterné, je stationne du côté :", choix: [
        { lettre: "A", texte: "Des numéros pairs" },
        { lettre: "B", texte: "Des numéros impairs", correct: true },
      ]},
      { id: 61, enonce: "Ce panneau indique le caractère prioritaire d'une route. Il est répété hors agglomération tous les :", choix: [
        { lettre: "A", texte: "2 km" },
        { lettre: "B", texte: "4 km" },
        { lettre: "C", texte: "5 km", correct: true },
      ]},
      { id: 62, enonce: "Ce signal annonce un passage à niveau :", choix: [
        { lettre: "A", texte: "Avec barrières à fonctionnement manuel" },
        { lettre: "B", texte: "Sans barrières ni demi-barrières", correct: true },
      ]},
      { id: 63, enonce: "Ce panneau annonce un risque temporaire de verglas :", choix: [
        { lettre: "A", texte: "Vrai", correct: true },
        { lettre: "B", texte: "Faux" },
      ]},
      { id: 64, enonce: "Que signifie ce panneau (voie verte) ?", choix: [
        { lettre: "A", texte: "Voie réservée à la circulation des véhicules non motorisés, piétons et cavaliers", correct: true },
        { lettre: "B", texte: "Proximité d'une voie verte" },
      ]},
      { id: 65, enonce: "Que signifie ce panneau (impasse avec issue piétons/cyclistes) ?", choix: [
        { lettre: "A", texte: "Impasse comportant une issue pour les piétons et les cyclistes", correct: true },
        { lettre: "B", texte: "Impasse interdit aux piétons" },
      ]},
      { id: 66, enonce: "Je roule à la vitesse maximale sur autoroute. Je suis seul. Je me place sur la voie :", choix: [
        { lettre: "A", texte: "De gauche" },
        { lettre: "B", texte: "Du milieu" },
        { lettre: "C", texte: "De droite", correct: true },
      ]},
      { id: 67, enonce: "Le feu vert donne la priorité absolue :", choix: [
        { lettre: "A", texte: "Vrai" },
        { lettre: "B", texte: "Faux", correct: true },
      ]},
      { id: 68, enonce: "Je peux dépasser par la droite si :", choix: [
        { lettre: "A", texte: "Le véhicule devant roule sur la voie de gauche" },
        { lettre: "B", texte: "Le véhicule devant signale qu'il va tourner à gauche", correct: true },
        { lettre: "C", texte: "Le véhicule devant signale qu'il va tourner à droite" },
      ]},
      { id: 69, enonce: "La distance de sécurité entre deux véhicules correspond à un délai de :", choix: [
        { lettre: "A", texte: "1 seconde" },
        { lettre: "B", texte: "2 secondes", correct: true },
        { lettre: "C", texte: "3 secondes" },
      ]},
      { id: 70, enonce: "En présence de deux marquages, un jaune et un blanc, je respecte en priorité :", choix: [
        { lettre: "A", texte: "Le marquage blanc" },
        { lettre: "B", texte: "Le marquage jaune", correct: true },
      ]},
      { id: 71, enonce: "Sur une route étroite, un camion arrive en face. Dois-je lui céder le passage ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 72, enonce: "Dernier d'une file qui ralentit fortement, je dois allumer mes feux de détresse :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 73, enonce: "Le stationnement et l'arrêt sont interdits sur la BAU (hors panne) :", choix: [
        { lettre: "A", texte: "Vrai", correct: true },
        { lettre: "B", texte: "Faux" },
      ]},

      // SECTION 4 — FEUX ET ÉCLAIRAGE
      { id: 74, enonce: "Les feux de positions arrière doivent être visibles à :", choix: [
        { lettre: "A", texte: "100 m" },
        { lettre: "B", texte: "150 m", correct: true },
      ]},
      { id: 75, enonce: "Le chargement d'un véhicule peut dépasser à l'arrière de :", choix: [
        { lettre: "A", texte: "2 m" },
        { lettre: "B", texte: "3 m", correct: true },
      ]},
      { id: 76, enonce: "Présente sur les routes étroites, cette ligne autorise le dépassement :", choix: [
        { lettre: "A", texte: "De tous les véhicules" },
        { lettre: "B", texte: "Seulement des véhicules roulant doucement", correct: true },
      ]},
      { id: 77, enonce: "Dans une rue à sens unique, une voie de bus peut être à contresens :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 78, enonce: "Sur chaussée à sens unique, véhicule persistant à gauche — dépasser par la droite ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 79, enonce: "Dans ce tunnel, je peux rouler à :", choix: [
        { lettre: "A", texte: "30 km/h" },
        { lettre: "B", texte: "50 km/h", correct: true },
        { lettre: "C", texte: "60 km/h" },
      ]},
      { id: 80, enonce: "Hors agglomération, visibilité < 50 m, je peux rouler à :", choix: [
        { lettre: "A", texte: "40 km/h" },
        { lettre: "B", texte: "50 km/h", correct: true },
        { lettre: "C", texte: "60 km/h" },
      ]},
      { id: 81, enonce: "En bouchon, je dois :", choix: [
        { lettre: "A", texte: "Rester sur ma file et avancer doucement", correct: true },
        { lettre: "B", texte: "Changer de file régulièrement" },
        { lettre: "C", texte: "Utiliser la BAU" },
      ]},
      { id: 82, enonce: "Dépassement d'un cycliste hors agglo — distance de sécurité minimum :", choix: [
        { lettre: "A", texte: "0,5 m" },
        { lettre: "B", texte: "1 m" },
        { lettre: "C", texte: "1,5 m", correct: true },
      ]},
      { id: 83, enonce: "Hors agglomération, le dépassement d'un cycle est autorisé :", choix: [
        { lettre: "A", texte: "En chevauchant une ligne continue axiale", correct: true },
        { lettre: "B", texte: "En franchissant une ligne continue axiale" },
        { lettre: "C", texte: "En laissant au moins 1,50 m" },
      ]},
      { id: 84, enonce: "Un feu rouge clignotant indique :", choix: [
        { lettre: "A", texte: "Arrêt absolu", correct: true },
        { lettre: "B", texte: "Danger — passage autorisé avec précautions" },
      ]},
      { id: 85, enonce: "Un emplacement peint en bleu :", choix: [
        { lettre: "A", texte: "Stationnement sans restriction" },
        { lettre: "B", texte: "Stationnement payant" },
        { lettre: "C", texte: "Stationnement à durée limitée", correct: true },
      ]},
      { id: 86, enonce: "Un panneau rond à fond bleu est un panneau :", choix: [
        { lettre: "A", texte: "D'interdiction" },
        { lettre: "B", texte: "De danger" },
        { lettre: "C", texte: "D'obligation", correct: true },
        { lettre: "D", texte: "D'indication" },
      ]},
      { id: 87, enonce: "Feu rouge clignotant possible :", choix: [
        { lettre: "A", texte: "Sur un passage à niveau", correct: true },
        { lettre: "B", texte: "Avec un feu tricolore" },
        { lettre: "C", texte: "Sur une zone de danger aérien" },
      ]},
      { id: 88, enonce: "Feux tricolores éteints + panneau cédez le passage :", choix: [
        { lettre: "A", texte: "Je passe sans ralentir" },
        { lettre: "B", texte: "Je ralentis et cède le passage à droite et à gauche", correct: true },
        { lettre: "C", texte: "Je m'arrête" },
      ]},
      { id: 89, enonce: "Lorsque je manœuvre :", choix: [
        { lettre: "A", texte: "Je suis toujours prioritaire" },
        { lettre: "B", texte: "Je dois la priorité à tous, avant et pendant", correct: true },
      ]},
      { id: 90, enonce: "L'accès des autoroutes est interdit aux :", choix: [
        { lettre: "A", texte: "Véhicules à moteur non soumis à immatriculation", correct: true },
        { lettre: "B", texte: "Cyclistes", correct: true },
        { lettre: "C", texte: "Poids lourds" },
      ]},
      { id: 91, enonce: "Par temps de pluie sur autoroute, la vitesse maximale est de :", choix: [
        { lettre: "A", texte: "100 km/h" },
        { lettre: "B", texte: "110 km/h", correct: true },
        { lettre: "C", texte: "120 km/h" },
      ]},
      { id: 92, enonce: "Hors agglomération, les panneaux de danger sont placés à quelle distance ?", choix: [
        { lettre: "A", texte: "50 m" },
        { lettre: "B", texte: "100 m" },
        { lettre: "C", texte: "150 m", correct: true },
      ]},
      { id: 93, enonce: "Par temps de forte pluie, je peux allumer mes feux antibrouillard arrière ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 94, enonce: "Les feux arrière de brouillard peuvent être allumés en cas de :", choix: [
        { lettre: "A", texte: "Chute de neige", correct: true },
        { lettre: "B", texte: "Forte pluie", correct: true },
        { lettre: "C", texte: "Brouillard", correct: true },
      ]},
      { id: 95, enonce: "Il neige, je peux utiliser les feux de brouillard avant :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 96, enonce: "En agglomération éclairée la nuit, je peux circuler :", choix: [
        { lettre: "A", texte: "Sans feux" },
        { lettre: "B", texte: "En feux de croisement", correct: true },
        { lettre: "C", texte: "En feux de route" },
      ]},
      { id: 97, enonce: "Dans un tunnel éclairé hors agglomération, je circule :", choix: [
        { lettre: "A", texte: "En feux de croisement", correct: true },
        { lettre: "B", texte: "En feux de route" },
        { lettre: "C", texte: "En feux de brouillard" },
      ]},
      { id: 98, enonce: "En cas de chute de neige, je circule avec :", choix: [
        { lettre: "A", texte: "Feux de position" },
        { lettre: "B", texte: "Feux de croisement", correct: true },
        { lettre: "C", texte: "Feux de brouillard avant" },
        { lettre: "D", texte: "Feux de brouillard arrière" },
      ]},
      { id: 99, enonce: "Les feux de recul :", choix: [
        { lettre: "A", texte: "Éclairent la zone de recul la nuit", correct: true },
        { lettre: "B", texte: "Indiquent la manœuvre aux usagers", correct: true },
        { lettre: "C", texte: "Sont de couleur verte" },
      ]},
      { id: 100, enonce: "Les feux diurnes :", choix: [
        { lettre: "A", texte: "Rendent le véhicule plus visible le jour", correct: true },
        { lettre: "B", texte: "Sont de couleur jaune" },
        { lettre: "C", texte: "Sont obligatoires" },
      ]},
      { id: 101, enonce: "Je circule sur route de montagne par forte pluie, je peux utiliser :", choix: [
        { lettre: "A", texte: "Les feux de croisement", correct: true },
        { lettre: "B", texte: "Les feux de position seuls" },
        { lettre: "C", texte: "Les feux de brouillard arrière" },
      ]},
      { id: 102, enonce: "Je respecte les signaux de priorité si le feu est :", choix: [
        { lettre: "A", texte: "Rouge" },
        { lettre: "B", texte: "Jaune clignotant", correct: true },
        { lettre: "C", texte: "Jaune fixe" },
        { lettre: "D", texte: "Éteint", correct: true },
      ]},
      { id: 103, enonce: "Les feux de croisement éclairent au moins à :", choix: [
        { lettre: "A", texte: "30 m sans éblouir", correct: true },
        { lettre: "B", texte: "50 m sans éblouir" },
      ]},
      { id: 104, enonce: "Les feux de route éclairent à au moins :", choix: [
        { lettre: "A", texte: "100 m", correct: true },
        { lettre: "B", texte: "150 m" },
      ]},
      { id: 105, enonce: "Quelle action ne nécessite PAS les feux de détresse ?", choix: [
        { lettre: "A", texte: "Attirer l'attention sur soi" },
        { lettre: "B", texte: "Immobilisé sur la chaussée" },
        { lettre: "C", texte: "Quand je veux doubler", correct: true },
      ]},
      { id: 106, enonce: "En agglomération par temps de pluie, la vitesse max est :", choix: [
        { lettre: "A", texte: "40 km/h" },
        { lettre: "B", texte: "50 km/h", correct: true },
      ]},
      { id: 107, enonce: "Avant de traverser une intersection, regarder en premier :", choix: [
        { lettre: "A", texte: "À droite" },
        { lettre: "B", texte: "À gauche", correct: true },
      ]},
    ],
  },

  // ──────────────────────────────────────────────
  // PARTIE 2 — Distances, Priorités avancées & Alcool
  // ──────────────────────────────────────────────
  {
    id: 81, actif: true,
    titre: "Sécurité Routière — Partie 2 : Distances, Priorités avancées & Alcool",
    sousTitre: "Distance de réaction, d'arrêt, de freinage, de sécurité, siège auto, véhicules prioritaires, alcool au volant",
    questions: [
      // SECTION 1 — DISTANCES
      { id: 1, enonce: "Je roule à 110 km/h. Distance parcourue pendant le temps de réaction (1s) :", choix: [
        { lettre: "A", texte: "33 mètres", correct: true },
        { lettre: "B", texte: "45 mètres" },
        { lettre: "C", texte: "66 mètres" },
      ]},
      { id: 2, enonce: "Roulant à 100 km/h, distance parcourue pendant le temps de réaction :", choix: [
        { lettre: "A", texte: "10 m" },
        { lettre: "B", texte: "21 m" },
        { lettre: "C", texte: "28 m", correct: true },
      ]},
      { id: 3, enonce: "Le temps de réaction peut être allongé par :", choix: [
        { lettre: "A", texte: "La fatigue", correct: true },
        { lettre: "B", texte: "Usure du système de freinage" },
        { lettre: "C", texte: "Prise de drogue ou d'alcool", correct: true },
        { lettre: "D", texte: "Mauvaises conditions climatiques" },
      ]},
      { id: 4, enonce: "À 60 km/h, la distance de réaction est de :", choix: [
        { lettre: "A", texte: "18 mètres", correct: true },
        { lettre: "B", texte: "25 mètres" },
        { lettre: "C", texte: "30 mètres" },
      ]},
      { id: 5, enonce: "La distance parcourue pendant le temps de réaction, c'est :", choix: [
        { lettre: "A", texte: "La distance entre perception du danger et appui sur la pédale de frein", correct: true },
        { lettre: "B", texte: "La distance entre perception du danger et arrêt du véhicule" },
        { lettre: "C", texte: "La distance entre début du freinage et arrêt" },
      ]},
      { id: 6, enonce: "Citez 5 critères qui font varier la distance de freinage :", choix: [
        { lettre: "A", texte: "État des freins, état des pneus, état de la route, charge du véhicule, conditions météo", correct: true },
        { lettre: "B", texte: "Couleur du véhicule, marque des pneus, heure de la journée" },
      ]},
      { id: 7, enonce: "La distance de freinage :", choix: [
        { lettre: "A", texte: "Égale à la distance d'arrêt" },
        { lettre: "B", texte: "Égale à la distance d'arrêt − distance de réaction", correct: true },
        { lettre: "C", texte: "Égale à la distance de réaction" },
      ]},
      { id: 8, enonce: "L'ABS réduit-il la distance de freinage ?", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non — il permet de garder le contrôle du véhicule", correct: true },
      ]},
      { id: 9, enonce: "À 90 km/h sur sol sec, distance de freinage approximative :", choix: [
        { lettre: "A", texte: "54 mètres", correct: true },
        { lettre: "B", texte: "64 mètres" },
        { lettre: "C", texte: "59 mètres" },
      ]},
      { id: 10, enonce: "Sur route mouillée à 50 km/h, distance de freinage approximative :", choix: [
        { lettre: "A", texte: "20 mètres", correct: true },
        { lettre: "B", texte: "30 mètres" },
        { lettre: "C", texte: "40 mètres" },
      ]},
      { id: 11, enonce: "La distance de freinage, c'est :", choix: [
        { lettre: "A", texte: "Distance entre réaction et arrêt" },
        { lettre: "B", texte: "Distance entre début du freinage et arrêt complet", correct: true },
        { lettre: "C", texte: "Temps entre freinage et arrêt" },
      ]},
      { id: 12, enonce: "À 90 km/h sur sol sec, distance d'arrêt approximative :", choix: [
        { lettre: "A", texte: "81 mètres", correct: true },
        { lettre: "B", texte: "90 mètres" },
        { lettre: "C", texte: "100 mètres" },
      ]},
      { id: 13, enonce: "Pour calculer la distance d'arrêt, multiplier les dizaines par :", choix: [
        { lettre: "A", texte: "3" },
        { lettre: "B", texte: "4" },
        { lettre: "C", texte: "Eux-mêmes (dizaines × dizaines)", correct: true },
      ]},
      { id: 14, enonce: "La distance d'arrêt est :", choix: [
        { lettre: "A", texte: "Égale à la distance de freinage" },
        { lettre: "B", texte: "Plus grande que la distance de freinage", correct: true },
        { lettre: "C", texte: "Plus petite que la distance de freinage" },
      ]},
      { id: 15, enonce: "À 90 km/h sur sol mouillé, distance d'arrêt :", choix: [
        { lettre: "A", texte: "121,5 mètres", correct: true },
        { lettre: "B", texte: "100 mètres" },
        { lettre: "C", texte: "90 mètres" },
      ]},
      { id: 16, enonce: "La distance d'arrêt = :", choix: [
        { lettre: "A", texte: "Distance de réaction + appui pédale" },
        { lettre: "B", texte: "Distance de freinage seule" },
        { lettre: "C", texte: "Distance de réaction + distance de freinage", correct: true },
      ]},
      { id: 17, enonce: "Distance de sécurité minimum à 90 km/h :", choix: [
        { lettre: "A", texte: "52 m" },
        { lettre: "B", texte: "53 m" },
        { lettre: "C", texte: "54 m", correct: true },
        { lettre: "D", texte: "55 m" },
      ]},
      { id: 18, enonce: "À 130 km/h, 80 m d'intervalle de sécurité est suffisant ?", choix: [
        { lettre: "A", texte: "Oui (13×6=78 m)", correct: true },
        { lettre: "B", texte: "Non" },
      ]},

      // SECTION 2 — SIÈGE AUTO, DÉPASSEMENTS, VÉHICULES PRIORITAIRES
      { id: 19, enonce: "Siège enfant de retenue obligatoire pour :", choix: [
        { lettre: "A", texte: "Enfant < 10 ans", correct: true },
        { lettre: "B", texte: "Enfant < 16 ans" },
      ]},
      { id: 20, enonce: "Enfants de 15 à 36 kg, quel dispositif (hors taxis) ?", choix: [
        { lettre: "A", texte: "Une valise" },
        { lettre: "B", texte: "Siège rehausseur", correct: true },
        { lettre: "C", texte: "Casque de protection" },
      ]},
      { id: 21, enonce: "Lesquels sont des véhicules prioritaires ?", choix: [
        { lettre: "A", texte: "Pompiers", correct: true },
        { lettre: "B", texte: "Police", correct: true },
        { lettre: "C", texte: "SAMU/SMUR", correct: true },
        { lettre: "D", texte: "Gendarmes", correct: true },
      ]},
      { id: 22, enonce: "Véhicules NON prioritaires mais de facilité de passage :", choix: [
        { lettre: "A", texte: "Ambulances", correct: true },
        { lettre: "B", texte: "Véhicules gaz/électricité de secours", correct: true },
        { lettre: "C", texte: "Engins de service hivernaux", correct: true },
        { lettre: "D", texte: "Cortèges de mariage" },
      ]},
      { id: 23, enonce: "Sanctions pour refus de priorité aux véhicules prioritaires :", choix: [
        { lettre: "A", texte: "68 €" },
        { lettre: "B", texte: "135 €", correct: true },
        { lettre: "C", texte: "Suspension permis jusqu'à 3 ans", correct: true },
        { lettre: "D", texte: "Perte de 4 points", correct: true },
      ]},

      // SECTION 3 — ALCOOL AU VOLANT
      { id: 24, enonce: "Quel appareil a une valeur légale et dispense de prise de sang ?", choix: [
        { lettre: "A", texte: "L'éthylotest" },
        { lettre: "B", texte: "L'éthylomètre", correct: true },
      ]},
      { id: 25, enonce: "Le taux de 0,20 g/l s'applique à :", choix: [
        { lettre: "A", texte: "Tous les conducteurs" },
        { lettre: "B", texte: "Conducteurs de taxi", correct: true },
        { lettre: "C", texte: "Conducteurs de TC", correct: true },
        { lettre: "D", texte: "Permis probatoire", correct: true },
      ]},
      { id: 26, enonce: "Taux maximal atteint dans le sang :", choix: [
        { lettre: "A", texte: "30 min après absorption à jeun", correct: true },
        { lettre: "B", texte: "1 h après absorption à jeun" },
        { lettre: "C", texte: "2 h après un repas" },
      ]},
      { id: 27, enonce: "Dépistage possible en cas de non-respect de la vitesse :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 28, enonce: "Dépistage possible en cas de non-respect de la ceinture :", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 29, enonce: "Élimination de 0,10-0,15 g d'alcool :", choix: [
        { lettre: "A", texte: "Par demi-heure" },
        { lettre: "B", texte: "Par heure", correct: true },
        { lettre: "C", texte: "Par jour" },
      ]},
      { id: 30, enonce: "La conduite est un DÉLIT à partir de :", choix: [
        { lettre: "A", texte: "0,50 g/l" },
        { lettre: "B", texte: "0,40 mg/l air expiré" },
        { lettre: "C", texte: "0,80 g/l de sang", correct: true },
      ]},
      { id: 31, enonce: "Taux de 0,80 g/l — combien de temps pour revenir à 0 ?", choix: [
        { lettre: "A", texte: "1 heure" },
        { lettre: "B", texte: "3 heures" },
        { lettre: "C", texte: "5 heures", correct: true },
      ]},
      { id: 32, enonce: "Premiers effets de l'alcool à partir de :", choix: [
        { lettre: "A", texte: "0,30 g/l", correct: true },
        { lettre: "B", texte: "0,50 g/l" },
        { lettre: "C", texte: "0,80 g/l" },
      ]},
      { id: 33, enonce: "Les effets de l'alcool se font sentir immédiatement :", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 34, enonce: "Taux max atteint lors d'un repas au bout de :", choix: [
        { lettre: "A", texte: "30 min" },
        { lettre: "B", texte: "1 h" },
        { lettre: "C", texte: "2 h", correct: true },
      ]},
      { id: 35, enonce: "Sanctions pour alcoolémie entre 0,5 et 0,8 g/l :", choix: [
        { lettre: "A", texte: "Perte de 6 points", correct: true },
        { lettre: "B", texte: "Perte de 8 points" },
        { lettre: "C", texte: "Une amende", correct: true },
      ]},
      { id: 36, enonce: "Conduire avec ≥ 0,8 g/l :", choix: [
        { lettre: "A", texte: "Constitue un délit", correct: true },
        { lettre: "B", texte: "Passible d'une contravention" },
        { lettre: "C", texte: "Suspension ou annulation du permis", correct: true },
      ]},
      { id: 37, enonce: "Sanctions en cas de refus de vérification d'alcool :", choix: [
        { lettre: "A", texte: "Immobilisation du véhicule", correct: true },
        { lettre: "B", texte: "Peine de prison", correct: true },
        { lettre: "C", texte: "Retrait de 6 points", correct: true },
      ]},
      { id: 38, enonce: "Taux à ne pas dépasser en permis probatoire :", choix: [
        { lettre: "A", texte: "0,09 g/l" },
        { lettre: "B", texte: "0,19 g/l", correct: true },
        { lettre: "C", texte: "0,49 g/l" },
      ]},
      { id: 39, enonce: "Taux à ne pas dépasser pour conducteur standard :", choix: [
        { lettre: "A", texte: "0,49 g/l", correct: true },
        { lettre: "B", texte: "0,59 g/l" },
        { lettre: "C", texte: "0,69 g/l" },
      ]},
      { id: 40, enonce: "Sanctions conduite alcool + stupéfiants :", choix: [
        { lettre: "A", texte: "Amende jusqu'à 9 000 €", correct: true },
        { lettre: "B", texte: "Immobilisation/confiscation véhicule", correct: true },
        { lettre: "C", texte: "Travaux d'intérêts généraux", correct: true },
      ]},
    ],
  },

  // ──────────────────────────────────────────────
  // PARTIE 3 — Sanctions, Éco-conduite, CT & Permis
  // ──────────────────────────────────────────────
  {
    id: 82, actif: true,
    titre: "Sécurité Routière — Partie 3 : Sanctions, Éco-conduite, CT & Permis",
    sousTitre: "Sanctions et amendes, limitations de vitesse, éco-conduite, contrôle technique, accidents, permis à points, médicaments",
    questions: [
      // SECTION 1 — SANCTIONS ET LIMITATIONS DE VITESSE
      { id: 1, enonce: "Excès ≥ 30 et < 40 km/h — amende forfaitaire :", choix: [
        { lettre: "A", texte: "135 €", correct: true },
        { lettre: "B", texte: "90 €" },
        { lettre: "C", texte: "68 €" },
        { lettre: "D", texte: "35 €" },
      ]},
      { id: 2, enonce: "Excès ≥ 30 et < 40 km/h — retrait de points :", choix: [
        { lettre: "A", texte: "3", correct: true },
        { lettre: "B", texte: "4" },
      ]},
      { id: 3, enonce: "Usage d'avertisseurs de radars — retrait de :", choix: [
        { lettre: "A", texte: "2 pts" },
        { lettre: "B", texte: "3 pts" },
        { lettre: "C", texte: "4 pts" },
        { lettre: "D", texte: "6 pts", correct: true },
      ]},
      { id: 4, enonce: "Non-respect d'un STOP entraîne :", choix: [
        { lettre: "A", texte: "Amende 3ème classe" },
        { lettre: "B", texte: "Amende 4ème classe", correct: true },
        { lettre: "C", texte: "Retrait de 3 pts" },
        { lettre: "D", texte: "Retrait de 4 pts", correct: true },
      ]},
      { id: 5, enonce: "Conduite sous stupéfiants — condamnation à 2 ans d'emprisonnement :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 6, enonce: "Conduite sous stupéfiants — amende de 4 000 € :", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non (4 500 €)", correct: true },
      ]},
      { id: 7, enonce: "Suspension du permis vaut pour toutes les catégories :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 8, enonce: "Inobservation des distances de sécurité = retrait de 3 pts :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 9, enonce: "Stationnement > 7 jours = abusif :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 10, enonce: "Téléphone au volant sanctionné de :", choix: [
        { lettre: "A", texte: "Retrait de 2 pts" },
        { lettre: "B", texte: "Retrait de 3 pts", correct: true },
        { lettre: "C", texte: "Amende de 75 €" },
        { lettre: "D", texte: "Amende de 135 €", correct: true },
      ]},
      { id: 11, enonce: "Points perdus max par interpellation :", choix: [
        { lettre: "A", texte: "6" },
        { lettre: "B", texte: "8", correct: true },
        { lettre: "C", texte: "10" },
        { lettre: "D", texte: "12" },
      ]},

      // SECTION 2 — POINTS PERDUS PAR INFRACTION
      { id: 12, enonce: "Reconstitution des points après contravention 4ème classe (sans nouvelle infraction) :", choix: [
        { lettre: "A", texte: "6 mois" },
        { lettre: "B", texte: "1 an" },
        { lettre: "C", texte: "2 ans" },
        { lettre: "D", texte: "3 ans", correct: true },
      ]},
      { id: 13, enonce: "Invalidation pour solde nul — stage de récupération possible ?", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 14, enonce: "Période probatoire — stage obligatoire si perte de :", choix: [
        { lettre: "A", texte: "2 pts" },
        { lettre: "B", texte: "3 pts ou plus en une infraction", correct: true },
        { lettre: "C", texte: "4 pts" },
      ]},
      { id: 15, enonce: "Sens interdit — classe de l'amende :", choix: [
        { lettre: "A", texte: "2ème" },
        { lettre: "B", texte: "3ème" },
        { lettre: "C", texte: "4ème", correct: true },
      ]},
      { id: 16, enonce: "Récidive excès > 50 km/h dans l'année — tribunal :", choix: [
        { lettre: "A", texte: "Tribunal de police" },
        { lettre: "B", texte: "Tribunal correctionnel", correct: true },
      ]},
      { id: 17, enonce: "VTC sur emplacement TAXI — sanctions :", choix: [
        { lettre: "A", texte: "Contravention 2ème classe" },
        { lettre: "B", texte: "Contravention 4ème classe", correct: true },
        { lettre: "C", texte: "Toléré si < 15 min" },
        { lettre: "D", texte: "Mise en fourrière", correct: true },
      ]},
      { id: 18, enonce: "Perte deux fois de tous les points sur 5 ans — délai d'interdiction :", choix: [
        { lettre: "A", texte: "3 mois" },
        { lettre: "B", texte: "6 mois", correct: true },
        { lettre: "C", texte: "1 an" },
      ]},
      { id: 19, enonce: "Fréquence d'un stage de récupération de points :", choix: [
        { lettre: "A", texte: "Tous les 3 ans" },
        { lettre: "B", texte: "Tous les 2 ans" },
        { lettre: "C", texte: "Tous les ans", correct: true },
        { lettre: "D", texte: "Tous les 6 mois" },
      ]},
      { id: 20, enonce: "Points perdus pour non-présentation de la carte grise :", choix: [
        { lettre: "A", texte: "0", correct: true },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
      ]},
      { id: 21, enonce: "Points perdus pour accélération lors d'un dépassement :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2", correct: true },
        { lettre: "D", texte: "3" },
      ]},
      { id: 22, enonce: "Points perdus pour non-port de ceinture :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
        { lettre: "D", texte: "3", correct: true },
      ]},
      { id: 23, enonce: "Points perdus pour franchissement ligne continue :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
        { lettre: "D", texte: "3", correct: true },
      ]},
      { id: 24, enonce: "Points perdus pour absence de clignotant :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
        { lettre: "D", texte: "3", correct: true },
      ]},
      { id: 25, enonce: "Points perdus pour oreillettes/écouteurs au volant :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
        { lettre: "D", texte: "3", correct: true },
      ]},
      { id: 26, enonce: "Points perdus pour circuler sur la BAU :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2" },
        { lettre: "D", texte: "3", correct: true },
      ]},
      { id: 27, enonce: "Points perdus pour sens interdit :", choix: [
        { lettre: "A", texte: "1" },
        { lettre: "B", texte: "2" },
        { lettre: "C", texte: "3" },
        { lettre: "D", texte: "4", correct: true },
      ]},
      { id: 28, enonce: "Points perdus pour alcool ≥ 0,5 g/l :", choix: [
        { lettre: "A", texte: "4" },
        { lettre: "B", texte: "5" },
        { lettre: "C", texte: "6", correct: true },
      ]},
      { id: 29, enonce: "Points perdus pour refus de priorité à droite :", choix: [
        { lettre: "A", texte: "1" },
        { lettre: "B", texte: "2" },
        { lettre: "C", texte: "3" },
        { lettre: "D", texte: "4", correct: true },
      ]},
      { id: 30, enonce: "Points perdus pour circulation voie de bus :", choix: [
        { lettre: "A", texte: "0" },
        { lettre: "B", texte: "1" },
        { lettre: "C", texte: "2", correct: true },
      ]},
      { id: 31, enonce: "Amende pour circulation voie de bus :", choix: [
        { lettre: "A", texte: "11 €" },
        { lettre: "B", texte: "35 €" },
        { lettre: "C", texte: "135 €", correct: true },
      ]},
      { id: 32, enonce: "Amende non-présentation carte grise :", choix: [
        { lettre: "A", texte: "11 €", correct: true },
        { lettre: "B", texte: "17 €" },
        { lettre: "C", texte: "21 €" },
      ]},
      { id: 33, enonce: "Amende stationnement abusif (> 7 jours) :", choix: [
        { lettre: "A", texte: "De 35 € à 135 € selon zones", correct: true },
        { lettre: "B", texte: "De 11 € à 35 €" },
      ]},
      { id: 34, enonce: "Amende défaut de présentation du CT :", choix: [
        { lettre: "A", texte: "90 €" },
        { lettre: "B", texte: "135 €", correct: true },
        { lettre: "C", texte: "190 €" },
      ]},
      { id: 35, enonce: "Amende fumer/manger au volant (danger) :", choix: [
        { lettre: "A", texte: "11 €" },
        { lettre: "B", texte: "17 €" },
        { lettre: "C", texte: "35 €", correct: true },
      ]},

      // SECTION 3 — ÉCO-CONDUITE, CONTRÔLE TECHNIQUE ET DIVERS
      { id: 36, enonce: "Éco-conduite — comportements corrects :", choix: [
        { lettre: "A", texte: "Vitesse stable", correct: true },
        { lettre: "B", texte: "Éviter démarrages brusques", correct: true },
        { lettre: "C", texte: "Couper le moteur pour arrêts longs", correct: true },
        { lettre: "D", texte: "Anticiper le trafic", correct: true },
      ]},
      { id: 37, enonce: "L'éco-conduite c'est :", choix: [
        { lettre: "A", texte: "Conduite rapide pour polluer moins" },
        { lettre: "B", texte: "Conduite écologique et économique", correct: true },
        { lettre: "C", texte: "Emprunter que les grands axes" },
      ]},
      { id: 38, enonce: "Bons gestes éco-conduite :", choix: [
        { lettre: "A", texte: "Utiliser le frein moteur", correct: true },
        { lettre: "B", texte: "Accélérer d'un coup" },
        { lettre: "C", texte: "Utiliser une huile moteur de haute qualité", correct: true },
      ]},
      { id: 39, enonce: "CT pour chauffeur VTC/TAXI tous les :", choix: [
        { lettre: "A", texte: "1 an", correct: true },
        { lettre: "B", texte: "2 ans" },
        { lettre: "C", texte: "3 ans" },
      ]},
      { id: 40, enonce: "Délai contre-visite défaillance majeure :", choix: [
        { lettre: "A", texte: "1 mois" },
        { lettre: "B", texte: "2 mois", correct: true },
        { lettre: "C", texte: "3 mois" },
      ]},
      { id: 41, enonce: "Défaillance critique au CT — le véhicule peut :", choix: [
        { lettre: "A", texte: "Circuler normalement" },
        { lettre: "B", texte: "Circuler uniquement le jour du CT pour réparations", correct: true },
      ]},
      { id: 42, enonce: "Sur 100 km, rouler à 130 au lieu de 120 fait gagner :", choix: [
        { lettre: "A", texte: "4 minutes", correct: true },
        { lettre: "B", texte: "6 minutes" },
        { lettre: "C", texte: "10 minutes" },
      ]},
      { id: 43, enonce: "Avec le permis B, transport max (sans conducteur) :", choix: [
        { lettre: "A", texte: "7 pers." },
        { lettre: "B", texte: "8 pers.", correct: true },
        { lettre: "C", texte: "9 pers." },
      ]},
      { id: 44, enonce: "Acuité visuelle minimum pour le permis B :", choix: [
        { lettre: "A", texte: "4/10e" },
        { lettre: "B", texte: "5/10e", correct: true },
        { lettre: "C", texte: "7/10e" },
      ]},
      { id: 45, enonce: "Changement de domicile — délai nouvelle carte grise :", choix: [
        { lettre: "A", texte: "15 jours" },
        { lettre: "B", texte: "3 semaines" },
        { lettre: "C", texte: "1 mois", correct: true },
      ]},
      { id: 46, enonce: "Bornes d'urgence autoroute tous les :", choix: [
        { lettre: "A", texte: "1 km" },
        { lettre: "B", texte: "2 km", correct: true },
        { lettre: "C", texte: "3 km" },
      ]},
      { id: 47, enonce: "En cas d'accident matériel, constat à l'assurance sous :", choix: [
        { lettre: "A", texte: "2 jours ouvrés" },
        { lettre: "B", texte: "5 jours ouvrés", correct: true },
        { lettre: "C", texte: "10 jours ouvrés" },
      ]},
      { id: 48, enonce: "L'aquaplaning est favorisé par :", choix: [
        { lettre: "A", texte: "La vitesse", correct: true },
        { lettre: "B", texte: "Forte pluie", correct: true },
        { lettre: "C", texte: "Pneus usés", correct: true },
        { lettre: "D", texte: "Pneus neufs" },
      ]},
      { id: 49, enonce: "L'ESP réduit les distances de freinage :", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 50, enonce: "L'ESP détecte la perte d'adhérence en virage :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 51, enonce: "Covoiturage permet de diminuer :", choix: [
        { lettre: "A", texte: "La pollution", correct: true },
        { lettre: "B", texte: "Les frais de carburant", correct: true },
        { lettre: "C", texte: "Les embouteillages", correct: true },
      ]},
      { id: 52, enonce: "Pression des pneus = incidence sur la consommation :", choix: [
        { lettre: "A", texte: "Vrai", correct: true },
        { lettre: "B", texte: "Faux" },
      ]},
      { id: 53, enonce: "Qu'est-ce qui favorise l'éclatement d'un pneu ?", choix: [
        { lettre: "A", texte: "Sous-gonflage", correct: true },
        { lettre: "B", texte: "Sur-gonflage", correct: true },
        { lettre: "C", texte: "Roulage à plat", correct: true },
      ]},
      { id: 54, enonce: "Champ de vision à 130 km/h :", choix: [
        { lettre: "A", texte: "30°", correct: true },
        { lettre: "B", texte: "45°" },
        { lettre: "C", texte: "75°" },
      ]},
      { id: 55, enonce: "Temps de réaction augmente quand :", choix: [
        { lettre: "A", texte: "Alcool", correct: true },
        { lettre: "B", texte: "Cannabis", correct: true },
        { lettre: "C", texte: "Pluie" },
        { lettre: "D", texte: "Téléphone", correct: true },
      ]},
      { id: 56, enonce: "Après annulation, nouveau permis = probatoire ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 57, enonce: "Actions en présence d'un blessé :", choix: [
        { lettre: "A", texte: "Retirer le casque" },
        { lettre: "B", texte: "Parler à la victime", correct: true },
        { lettre: "C", texte: "Couvrir la victime", correct: true },
      ]},
      { id: 58, enonce: "En cas d'aquaplaning :", choix: [
        { lettre: "A", texte: "Freiner immédiatement" },
        { lettre: "B", texte: "Ralentir", correct: true },
        { lettre: "C", texte: "Continuer même vitesse" },
      ]},
      { id: 59, enonce: "L'ABS :", choix: [
        { lettre: "A", texte: "Freiner d'urgence sans doser la pédale", correct: true },
        { lettre: "B", texte: "Garder la trajectoire", correct: true },
        { lettre: "C", texte: "Diminue la distance de freinage" },
      ]},
      { id: 60, enonce: "Rouler à 120 au lieu de 130 réduit les émissions de CO2 :", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 61, enonce: "Piéton = :", choix: [
        { lettre: "A", texte: "Personne avec poussette", correct: true },
        { lettre: "B", texte: "Personne en fauteuil roulant", correct: true },
        { lettre: "C", texte: "Cyclomotoriste" },
        { lettre: "D", texte: "Personne poussant son vélo", correct: true },
      ]},
      { id: 62, enonce: "Pictogramme niveau 3 (rouge) sur un médicament :", choix: [
        { lettre: "A", texte: "Soyez prudent" },
        { lettre: "B", texte: "Soyez très prudent" },
        { lettre: "C", texte: "DANGER — conduite INTERDITE", correct: true },
      ]},
      { id: 63, enonce: "Ceinture obligatoire avant/arrière. Passager mineur sans ceinture — qui est sanctionné ?", choix: [
        { lettre: "A", texte: "Le passager lui-même" },
        { lettre: "B", texte: "Le conducteur", correct: true },
      ]},
      { id: 64, enonce: "Franchissement feu rouge clignotant — sanctions :", choix: [
        { lettre: "A", texte: "Retrait de 4 pts", correct: true },
        { lettre: "B", texte: "Amende de 68 €" },
        { lettre: "C", texte: "Amende de 135 €", correct: true },
        { lettre: "D", texte: "Suspension permis 3 ans max", correct: true },
      ]},
    ],
  },
];
