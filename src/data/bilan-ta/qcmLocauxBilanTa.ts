// Copie mot pour mot du Bilan examen TA, module 28, exercice 701 « G(T) - Réglementation Locale — Métropole de Lyon »
// lue le 30/10/2026 (empreinte exercice cf3b79f57ca535f29065b00d35c826d0). Ne pas modifier : source = banque admin TA.
export interface QcmBilanTa { id: number; enonce: string; choix: { lettre: string; texte: string; correct: boolean }[] }
export const QCM_LOCAUX_BILAN_TA: QcmBilanTa[] = [
 {
  "id": 1,
  "choix": [
   {
    "texte": "Course de jour",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Trajet aller avec le client et retour à vide à la station",
    "lettre": "C",
    "correct": false
   }
  ],
  "enonce": "Que signifie le tarif A ?"
 },
 {
  "id": 2,
  "choix": [
   {
    "texte": "4 €",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "5 €",
    "lettre": "B",
    "correct": false
   }
  ],
  "enonce": "Quel est le montant de la prise en charge ?"
 },
 {
  "id": 3,
  "choix": [
   {
    "texte": "Les valises, ou bagages de taille équivalente, au-delà de trois valises",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Les valises, ou bagages de taille équivalente, au-delà de quatre valises",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Les valises, ou bagages de taille équivalente, au-delà de cinq valises",
    "lettre": "C",
    "correct": false
   }
  ],
  "enonce": "Le supplément bagage est pour :"
 },
 {
  "id": 4,
  "choix": [
   {
    "texte": "46 allées d'Italie 69005",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "2 rue Bichat 69005",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "63 rue Philippe de Lassalle 69005",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "17 rue Cléberg 69005",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Où se situe le musée LUGDUNUM ?"
 },
 {
  "id": 5,
  "choix": [
   {
    "texte": "2,31€",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "2€",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "2,28€",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "2,50€",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quel est le prix au km du tarif C ?"
 },
 {
  "id": 6,
  "choix": [
   {
    "texte": "5 place du Petit Collège 69100",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "6 place du Marché 69100",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "16 place Jean Macé 69100",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Place du Dr Lazarre Goujon 69100",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Où se situe la mairie de Villeurbanne ?"
 },
 {
  "id": 7,
  "choix": [
   {
    "texte": "Course de jour",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Trajet aller avec le client et retour en charge à la station",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "Trajet aller avec le client et retour à vide à la station",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Que signifie le tarif B ?"
 },
 {
  "id": 8,
  "choix": [
   {
    "texte": "2€",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "2,50€",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "4€",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "3€",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quelle est le montant de la réservation immédiate ?"
 },
 {
  "id": 9,
  "choix": [
   {
    "texte": "2€",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "2,50€",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "4€",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "3€",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quelle est le montant de la réservation à l'avance ?"
 },
 {
  "id": 10,
  "choix": [
   {
    "texte": "Oui",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Non",
    "lettre": "B",
    "correct": false
   }
  ],
  "enonce": "La basilique de Notre Dame de Fourvière est-elle inscrite au patrimoine mondial de l'UNESCO ?"
 },
 {
  "id": 11,
  "choix": [
   {
    "texte": "2,31€",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "1,54€",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "1,50€",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "2,50€",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quel est le prix au km du tarif B ?"
 },
 {
  "id": 12,
  "choix": [
   {
    "texte": "2/4 rue Carry",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "131 Boulevard de Stalingrad, 69100",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "126 rue Vauban",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "26 Rue Louis Blanc",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se situe le consulat du Japon ?"
 },
 {
  "id": 13,
  "choix": [
   {
    "texte": "Course de jour",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Trajet aller avec le client et retour en charge à la station",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Course de nuit, course effectuée le dimanche et les jours fériés ou course sur route effectivement enneigées ou verglacées",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "Trajet aller avec le client et retour à vide à la station",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Que signifie le tarif D ?"
 },
 {
  "id": 14,
  "choix": [
   {
    "texte": "35,20€",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "35,25€",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "35,30€",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "41,30€",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Quel est le tarif maximum de prise en charge sur le département du Rhône par horaire ?"
 },
 {
  "id": 15,
  "choix": [
   {
    "texte": "Caluire-et-Cuire",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Saint-Priest",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Chassieu",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Villefranche",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Quelle(s) commune(s) ne fait (font) pas partie(s) de la ZUPC ?"
 },
 {
  "id": 16,
  "choix": [
   {
    "texte": "2,43€",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "1,54€",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "1,22€",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "3€",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Quel est le prix au km du tarif D ?"
 },
 {
  "id": 17,
  "choix": [
   {
    "texte": "2/4 rue Carry",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "23 rue Jean Baldassini",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "126 rue Vauban",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "26 Rue Louis Blanc",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se situe la chambre régionale d'agriculture ?"
 },
 {
  "id": 18,
  "choix": [
   {
    "texte": "Mairie de Dardilly",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Métropole de Lyon",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Préfecture du Rhône",
    "lettre": "C",
    "correct": false
   }
  ],
  "enonce": "Je souhaite m'inscrire sur une liste d'attente pour l'obtention d'une ADS gratuite sur la commune de Dardilly, à qui devrais-je m'adresser ?"
 },
 {
  "id": 19,
  "choix": [
   {
    "texte": "Mairie de Genas",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Métropole de Lyon",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Préfecture du Rhône",
    "lettre": "C",
    "correct": false
   }
  ],
  "enonce": "Je souhaite m'inscrire sur une liste d'attente pour l'obtention d'une ADS gratuite sur la commune de Genas, à qui devrais-je m'adresser ?"
 },
 {
  "id": 20,
  "choix": [
   {
    "texte": "Je garde l'objet pour moi",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Aux services des objets trouvés de la mairie de dépose ou auprès de l'autorité de délivrance de l'ADS dans un délai maximum de 72h",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Aux services des objets trouvés dans un délai maximum de 48h",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Aux services des objets trouvés dans un délai maximum de 24h",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Un client a oublié un objet dans le véhicule TAXI, où dois-je le déposer ?"
 },
 {
  "id": 21,
  "choix": [
   {
    "texte": "Saint-Genis-Laval",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Marcy-l'Étoile",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Tassin-la-Demi-Lune",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Lyon 9",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se situe le château de Lacroix-Laval ?"
 },
 {
  "id": 22,
  "choix": [
   {
    "texte": "Station place Bellecour",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Station hôtel Sofitel",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Station hôtel Royal",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Station Gare Perrache",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se situe la station de taxi la plus proche du Musée des Tissus et des Arts Décoratifs ?"
 },
 {
  "id": 23,
  "choix": [
   {
    "texte": "Place Sathonnay",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Rue de la Martinière",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Avenue Tony Garnier",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Boulevard des Canuts",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se trouve la fresque de la Martinière ?"
 },
 {
  "id": 24,
  "choix": [
   {
    "texte": "18 rue Créqui Lyon",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "20 place Charles Béraudier Lyon",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Métro Jean Jaurès Lyon 7",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "20 place Bellecour",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Le service Taxis de la Métropole de Lyon se trouve :"
 },
 {
  "id": 25,
  "choix": [
   {
    "texte": "Du loueur",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Du locataire",
    "lettre": "B",
    "correct": false
   }
  ],
  "enonce": "En cas de location gérance, l'assurance est à la charge :"
 },
 {
  "id": 26,
  "choix": [
   {
    "texte": "Lyon",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Villeurbanne",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Paris",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Le Havre",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quelle ville a été considérée comme capitale française de la culture ?"
 },
 {
  "id": 27,
  "choix": [
   {
    "texte": "Oui",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Non",
    "lettre": "B",
    "correct": false
   }
  ],
  "enonce": "Je suis convoqué à une commission disciplinaire locale, puis-je me faire assister par quelqu'un de mon choix ?"
 },
 {
  "id": 28,
  "choix": [
   {
    "texte": "Oui",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Non",
    "lettre": "B",
    "correct": true
   }
  ],
  "enonce": "Puis-je transporter des personnes autres que des clients, lors d'une course avec ces derniers ?"
 },
 {
  "id": 29,
  "choix": [
   {
    "texte": "La Métropole de Lyon",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "La mairie de Lyon 8",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "La mairie de Villeurbanne",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "La mairie de Villefranche",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Je dispose d'une licence de Villefranche, je souhaite déposer un article trouvé dans mon véhicule à Lyon 8, je le dépose à :"
 },
 {
  "id": 30,
  "choix": [
   {
    "texte": "À la dernière station ou à équidistance de la ZUPC ou à la dernière station ou à équidistance de la commune de rattachement du TAXI",
    "lettre": "A",
    "correct": true
   },
   {
    "texte": "Saint-Genis-Laval",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Bron",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Lyon",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Je suis à Bron, j'ai une course au départ de Saint-Genis-Laval, j'active mon compteur à :"
 },
 {
  "id": 31,
  "choix": [
   {
    "texte": "La statue de Louis XIV",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "La fontaine Bartholdi",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "La statue de Charlemagne",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "La statue de Bonaparte",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quel monument figure sur la place des Terreaux ?"
 },
 {
  "id": 32,
  "choix": [
   {
    "texte": "La statue de Charlemagne",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "La tour Eiffel",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Burj Khalifa",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "La statue de la Liberté",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Quel autre monument a été réalisé par Bartholdi ?"
 },
 {
  "id": 33,
  "choix": [
   {
    "texte": "La préfecture",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "La chambre des métiers et de l'artisanat",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "La DREAL",
    "lettre": "C",
    "correct": false
   }
  ],
  "enonce": "Avant d'être enregistré au service en charge des taxis à la Métropole de Lyon, où doit être présenté le contrat de location gérance ?"
 },
 {
  "id": 34,
  "choix": [
   {
    "texte": "Tarare",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Brignais",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Sérézin-du-Rhône",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Quincieux",
    "lettre": "D",
    "correct": true
   }
  ],
  "enonce": "Quelle commune fait partie de la Métropole de Lyon ?"
 },
 {
  "id": 35,
  "choix": [
   {
    "texte": "La station doit avoir 5 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "La station doit avoir 4 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "La station doit avoir 3 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "La station doit avoir 6 places minimum, 1/3 de la partie arrière peut être utilisée, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Que doit faire un chauffeur TAXI qui n'est pas en course et qui stationne sur une place de TAXI ?"
 },
 {
  "id": 36,
  "choix": [
   {
    "texte": "Boulevard Eugène Deruelle",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Rue de Bonnel",
    "lettre": "B",
    "correct": false
   },
   {
    "texte": "Boulevard Vivier Merle",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "Rue Servient",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Où se situe la station de taxi la plus proche des Halles Paul Bocuse ?"
 },
 {
  "id": 37,
  "choix": [
   {
    "texte": "1 an",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "2 ans",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "3 ans",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "4 ans",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "À quelle fréquence se réunit le SIRHA sur Lyon ?"
 },
 {
  "id": 38,
  "choix": [
   {
    "texte": "Anne Roumanoff",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Florence Foresti",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Claude Lelouch",
    "lettre": "C",
    "correct": false
   },
   {
    "texte": "Jean Dujardin",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quelle personnalité publique est originaire de la région lyonnaise ?"
 },
 {
  "id": 39,
  "choix": [
   {
    "texte": "A7",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "M6",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "A89",
    "lettre": "C",
    "correct": true
   }
  ],
  "enonce": "À partir de Bellecour, quels axes autoroutiers et/ou périphériques prenez-vous pour aller à Clermont-Ferrand ?"
 },
 {
  "id": 40,
  "choix": [
   {
    "texte": "Véhicule de moins de 7 ans",
    "lettre": "A",
    "correct": false
   },
   {
    "texte": "Véhicule de moins de 10 ans",
    "lettre": "B",
    "correct": true
   },
   {
    "texte": "Coffre d'un volume minimum de 400 litres pour les véhicules thermiques et 300 litres pour les véhicules électriques",
    "lettre": "C",
    "correct": true
   },
   {
    "texte": "Coffre d'un volume minimum de 500 litres pour les véhicules thermiques et 400 litres pour les véhicules électriques",
    "lettre": "D",
    "correct": false
   }
  ],
  "enonce": "Quels sont les critères de véhicule pour exploiter un véhicule taxi ?"
 }
];
