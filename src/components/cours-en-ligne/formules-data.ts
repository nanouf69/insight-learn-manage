// ===== Données du module "3. FORMULES" =====
// Toutes les formules de calcul qui peuvent tomber à l'examen théorique

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
}

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string;
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

export const FORMULES_DATA: ModuleData = {
  id: 3,
  nom: "3.FORMULES",
  description: "Ensemble des formules et calculs qui peuvent tomber à l'examen théorique : remises, vitesse, distances, TVA, amortissement, seuil de rentabilité, etc.",
  cours: [
    {
      id: 0,
      titre: "📥 Document complet — Formules et exercices",
      sousTitre: "Téléchargez le document avec toutes les formules et exercices corrigés",
      description: "Ce document contient l'ensemble des formules de calcul et exercices avec corrections détaillées pour préparer l'examen théorique.",
      actif: true,
      fichiers: [
        { nom: "Formules & Exercices (Word)", url: "/cours/vtc/FORMULE_exercice.docx" },
      ],
    },
    {
      id: 1,
      titre: "📐 Formule — Remise",
      sousTitre: "Prix × pourcentage de remise",
      description: `Comment calculer le montant d'une remise ?

📌 Formule : Prix × pourcentage de remise

Exemple : Une prestation de 80 €, remise de 5 %
→ 80 × 5 / 100 = 4 €`,
      actif: true,
    },
    {
      id: 2,
      titre: "🚗 Formule — Gain de temps (Vitesse)",
      sousTitre: "Distance × 60 / Vitesse",
      description: `Comment calculer le gain de temps en fonction de la vitesse ?

📌 Formule : Distance × 60 / Vitesse = Temps en minutes

Exemple : 100 km, à 130 km/h vs 120 km/h
→ 100 × 60 / 130 = 46 min
→ 100 × 60 / 120 = 50 min
→ Gain = 4 minutes`,
      actif: true,
    },
    {
      id: 3,
      titre: "⏱️ Formule — Distance de réaction",
      sousTitre: "Dizaines × 3",
      description: `Comment calculer la distance parcourue pendant le temps de réaction (1 seconde) ?

📌 Formule : Dizaines × 3

Exemples :
• À 110 km/h → 11 × 3 = 33 mètres
• À 100 km/h → 10 × 3 = 30 mètres
• À 60 km/h → 6 × 3 = 18 mètres`,
      actif: true,
    },
    {
      id: 4,
      titre: "💰 Formule — Résultat comptable",
      sousTitre: "Produits − Charges",
      description: `Comment calculer le résultat comptable ?

📌 Formule : Résultat = Produits − Charges

Exemple : CA HT de 43 500 €, charges = 65 % du CA
→ Charges = 43 500 × 65 / 100 = 28 275 €
→ Résultat = 43 500 − 28 275 = 15 225 €`,
      actif: true,
    },
    {
      id: 5,
      titre: "📊 Formule — Seuil de rentabilité",
      sousTitre: "Charges fixes / (Prix de vente HT − Charges variables)",
      description: `Combien de courses dois-je réaliser pour commencer à faire des bénéfices ?

📌 Seuil de rentabilité en volume :
Charges fixes / (Prix de vente HT − Charges variables)

📌 Seuil de rentabilité en valeur :
(Charges fixes / (Prix de vente HT − Charges variables)) × Prix de vente HT

Exemple : Charges fixes = 2 000 €, course = 10 €, frais variables = 2 €
→ 2 000 / (10 − 2) = 2 000 / 8 = 250 courses`,
      actif: true,
    },
    {
      id: 6,
      titre: "🔧 Formule — Coût de revient kilométrique (Monôme)",
      sousTitre: "(Charges fixes + Charges variables) / Nombre de km",
      description: `Comment calculer le coût de revient kilométrique ?

📌 Formule : CRK = (CF + CV) / Nb de km

Exemple : CF = 25 000 €, CV = 8 000 €, 55 000 km/an
→ CRK = (25 000 + 8 000) / 55 000 = 0,60 €/km`,
      actif: true,
    },
    {
      id: 7,
      titre: "🔧 Formule — Binôme (Terme kilométrique + journalier)",
      sousTitre: "TK = CV / km — TJ = CF / jours",
      description: `Comment calculer le terme kilométrique et le terme journalier ?

📌 Terme kilométrique (TK) = Charges variables / Nombre de km
📌 Terme journalier (TJ) = Charges fixes / Nombre de jours travaillés

Exemple : CF = 25 000 €, CV = 8 000 €, 55 000 km en 280 jours
→ TK = 8 000 / 55 000 = 0,15 €/km
→ TJ = 25 000 / 280 = 89,29 €/jour`,
      actif: true,
    },
    {
      id: 8,
      titre: "🛑 Formule — Distance d'arrêt",
      sousTitre: "Sol sec : Dizaines² — Sol mouillé : Dizaines² × 1,5",
      description: `Comment calculer la distance d'arrêt ?

📌 Sol sec : Dizaines × Dizaines
📌 Sol mouillé : Dizaines × Dizaines × 1,5

Exemples :
• 90 km/h sol sec → 9 × 9 = 81 m
• 75 km/h sol mouillé → 7,5 × 7,5 × 1,5 = 84,38 m
• 90 km/h sol mouillé → 9 × 9 × 1,5 = 121,5 m`,
      actif: true,
    },
    {
      id: 9,
      titre: "🛑 Formule — Distance de freinage",
      sousTitre: "Distance d'arrêt − Distance de réaction",
      description: `Comment calculer la distance de freinage ?

📌 Sol sec : (Dizaines²) − (Dizaines × 3)
📌 Sol mouillé : ((Dizaines²) − (Dizaines × 3)) × 2

Exemples :
• 90 km/h sol sec → 81 − 27 = 54 m
• 50 km/h sol mouillé → (25 − 15) × 2 = 20 m`,
      actif: true,
    },
    {
      id: 10,
      titre: "🛑 Formule — Distance de sécurité",
      sousTitre: "Dizaines × 6",
      description: `Comment calculer la distance de sécurité avec le véhicule qui précède ?

📌 Formule : Dizaines × 6

Exemples :
• À 110 km/h → 11 × 6 = 66 m
• À 100 km/h → 10 × 6 = 60 m
• À 60 km/h → 6 × 6 = 36 m`,
      actif: true,
    },
    {
      id: 11,
      titre: "💶 Formule — TVA (HT → TVA)",
      sousTitre: "Prix HT × taux de TVA",
      description: `Comment trouver le montant de TVA en connaissant le montant HT ?

📌 Formule : Prix HT × taux de TVA

Exemple : Course de 10 € HT, TVA à 10 %
→ 10 × 10 / 100 = 1 €

Rappel : TVA transport de personnes = 10 %`,
      actif: true,
    },
    {
      id: 12,
      titre: "💶 Formule — TVA (TTC → HT → TVA)",
      sousTitre: "HT = TTC / 1,1 (ou 1,2) — TVA = TTC − HT",
      description: `Comment trouver le montant TVA en connaissant le TTC ?

📌 Formules :
• Prix HT = Prix TTC / 1,1 (si TVA 10 %) ou / 1,2 (si TVA 20 %)
• TVA = Prix TTC − Prix HT

Exemples :
• Transfert 75 € TTC → 75 / 1,1 = 68,18 € HT → TVA = 6,82 €
• Gasoil 70 € TTC → 70 / 1,2 = 58,33 € HT → TVA = 11,67 €`,
      actif: true,
    },
    {
      id: 13,
      titre: "💶 Formule — Montant HT depuis TTC",
      sousTitre: "Prix TTC / 1,1 (TVA 10%) ou / 1,2 (TVA 20%)",
      description: `Comment trouver le montant HT en connaissant le TTC ?

📌 Formule : Prix HT = Prix TTC / coefficient TVA
• 1,1 si TVA à 10 % (transport de personnes)
• 1,2 si TVA à 20 % (carburant, fournitures)

Exemple : Course de 55 € TTC → 55 / 1,1 = 50 € HT`,
      actif: true,
    },
    {
      id: 14,
      titre: "📅 Formule — Amortissement",
      sousTitre: "Prix HT / Nombre d'années",
      description: `Comment calculer la dotation d'amortissement d'un bien ?

📌 Formule : Prix HT / Nombre d'années d'amortissement

⚠️ Si achat en cours d'année : prorata temporis (nombre de mois restants)

Exemple : Véhicule 28 000 € HT, amorti sur 4 ans, acheté le 1er avril
→ Annuité complète = 28 000 / 4 = 7 000 €/an
→ 1ère année (9 mois) = 7 000 / 12 × 9 = 5 250 €`,
      actif: true,
    },
    {
      id: 15,
      titre: "📈 Formule — Pourcentage d'augmentation / diminution",
      sousTitre: "(Valeur finale − Valeur initiale) / Valeur initiale × 100",
      description: `Comment trouver un pourcentage d'augmentation ou de diminution ?

📌 Formule : ((Valeur finale − Valeur initiale) / Valeur initiale) × 100

Exemple : CA passe de 10 100 € à 15 440 €
→ (15 440 − 10 100) / 10 100 × 100 = 52,87 %`,
      actif: true,
    },
  ],
  exercices: [
    {
      id: 400, titre: "Remise et gain de temps", actif: true,
      questions: [
        { id: 1, enonce: "Vous accordez une remise de 5% sur une prestation de 80€. Quel est le montant de la remise ?", choix: [{ lettre: "A", texte: "3,20 €" }, { lettre: "B", texte: "5,00 €" }, { lettre: "C", texte: "4,00 €", correct: true }] },
        { id: 2, enonce: "Sur 100 km d'autoroute, si je roule à 130 km/h au lieu de 120 km/h, je 'gagne' environ :", choix: [{ lettre: "A", texte: "4 minutes", correct: true }, { lettre: "B", texte: "10 minutes" }, { lettre: "C", texte: "15 minutes" }, { lettre: "D", texte: "8 minutes" }] },
      ]
    },
    {
      id: 401, titre: "Distance de réaction", actif: true,
      questions: [
        { id: 1, enonce: "À 110 km/h, quelle distance aurais-je parcourue pendant mon temps de réaction (1 seconde) ?", choix: [{ lettre: "A", texte: "33 mètres", correct: true }, { lettre: "B", texte: "45 mètres" }, { lettre: "C", texte: "66 mètres" }] },
        { id: 2, enonce: "Roulant à 100 km/h, la distance parcourue durant le temps de réaction d'une seconde est de :", choix: [{ lettre: "A", texte: "10 m" }, { lettre: "B", texte: "21 m" }, { lettre: "C", texte: "30 m", correct: true }] },
      ]
    },
    {
      id: 402, titre: "Résultat comptable et seuil de rentabilité", actif: true,
      questions: [
        { id: 1, enonce: "Monsieur X a un CA HT de 43 500€, ses charges = 65% du CA. Son résultat comptable est de :", choix: [{ lettre: "A", texte: "14 225 €" }, { lettre: "B", texte: "17 225 €" }, { lettre: "C", texte: "16 225 €" }, { lettre: "D", texte: "15 225 €", correct: true }] },
        { id: 2, enonce: "Un chauffeur VMDTR en EURL fait un CA de 50 000€, 10 000€ de charges sociales, vend sa voiture 8 000€ HT, paye 5 000€ de TVA. Son résultat ?", choix: [{ lettre: "A", texte: "27 000 €" }, { lettre: "B", texte: "37 000 €" }, { lettre: "C", texte: "43 000 €", correct: true }] },
        { id: 3, enonce: "Charges fixes = 2 000€, courses à 10€, frais variables = 2€. Combien de courses pour le seuil de rentabilité ?", choix: [{ lettre: "A", texte: "200" }, { lettre: "B", texte: "250", correct: true }, { lettre: "C", texte: "400" }] },
      ]
    },
    {
      id: 403, titre: "Coût de revient kilométrique", actif: true,
      questions: [
        { id: 1, enonce: "CF = 25 000€, CV = 8 000€, 55 000 km/an. Quel est le CRK (monôme) ?", choix: [{ lettre: "A", texte: "0,60 €/km", correct: true }, { lettre: "B", texte: "0,80 €/km" }] },
        { id: 2, enonce: "Même données : TK (terme kilométrique) ?", choix: [{ lettre: "A", texte: "0,13 €" }, { lettre: "B", texte: "0,15 €", correct: true }] },
        { id: 3, enonce: "Même données, 280 jours : TJ (terme journalier) ?", choix: [{ lettre: "A", texte: "93,29 €" }, { lettre: "B", texte: "89,29 €", correct: true }] },
      ]
    },
    {
      id: 404, titre: "Distances d'arrêt, freinage et sécurité", actif: true,
      questions: [
        { id: 1, enonce: "À 90 km/h sur sol sec, quelle est la distance d'arrêt approximative ?", choix: [{ lettre: "A", texte: "60 mètres" }, { lettre: "B", texte: "81 mètres", correct: true }, { lettre: "C", texte: "100 mètres" }] },
        { id: 2, enonce: "Il pleut, je circule à 75 km/h. Ma distance totale d'arrêt sera d'environ :", choix: [{ lettre: "A", texte: "55 mètres" }, { lettre: "B", texte: "75 mètres" }, { lettre: "C", texte: "100 mètres", correct: true }] },
        { id: 3, enonce: "À 90 km/h sur sol mouillé, quelle distance d'arrêt ?", choix: [{ lettre: "A", texte: "81 m" }, { lettre: "B", texte: "121,5 m", correct: true }, { lettre: "C", texte: "122 m" }, { lettre: "D", texte: "123 m" }] },
        { id: 4, enonce: "À 90 km/h, quelle est la distance de freinage (sol sec) ?", choix: [{ lettre: "A", texte: "54 m", correct: true }, { lettre: "B", texte: "64 m" }, { lettre: "C", texte: "59 m" }] },
        { id: 5, enonce: "À 50 km/h sur route mouillée, quelle distance de freinage ?", choix: [{ lettre: "A", texte: "20 mètres", correct: true }, { lettre: "B", texte: "30 mètres" }, { lettre: "C", texte: "40 mètres" }] },
        { id: 6, enonce: "À 110 km/h, quelle distance de sécurité respecter ?", choix: [{ lettre: "A", texte: "33 mètres" }, { lettre: "B", texte: "45 mètres" }, { lettre: "C", texte: "66 mètres", correct: true }] },
        { id: 7, enonce: "À 100 km/h, quelle distance de sécurité ?", choix: [{ lettre: "A", texte: "10 m" }, { lettre: "B", texte: "21 m" }, { lettre: "C", texte: "60 m", correct: true }] },
      ]
    },
    {
      id: 405, titre: "TVA et montants HT / TTC", actif: true,
      questions: [
        { id: 1, enonce: "Une course facturée 10€ HT. Quel est le montant de la TVA (10%) ?", choix: [{ lettre: "A", texte: "0,10 €" }, { lettre: "B", texte: "0,20 €" }, { lettre: "C", texte: "1 €", correct: true }, { lettre: "D", texte: "10 €" }] },
        { id: 2, enonce: "Un transfert de 75€ TTC. Quel est le montant de TVA déductible (TVA 10%) ?", choix: [{ lettre: "A", texte: "12,50 €" }, { lettre: "B", texte: "6,82 €", correct: true }, { lettre: "C", texte: "5,22 €" }] },
        { id: 3, enonce: "70€ TTC de gasoil (TVA 20%). Calculez la TVA :", choix: [{ lettre: "A", texte: "11,67 €", correct: true }, { lettre: "B", texte: "4,58 €" }, { lettre: "C", texte: "3,65 €" }] },
        { id: 4, enonce: "Facture TTC de 638€ pour une course VTC. Montant de TVA (10%) ?", choix: [{ lettre: "A", texte: "48 €" }, { lettre: "B", texte: "58 €", correct: true }, { lettre: "C", texte: "68 €" }] },
        { id: 5, enonce: "Quel est le montant HT d'une course de 55€ TTC (TVA 10%) ?", choix: [{ lettre: "A", texte: "50 €", correct: true }, { lettre: "B", texte: "52,13 €" }, { lettre: "C", texte: "45,83 €" }] },
      ]
    },
    {
      id: 406, titre: "Amortissement", actif: true,
      questions: [
        { id: 1, enonce: "Véhicule 20 000€ HT amorti sur 4 ans + PC 600€ HT sur 3 ans. Dotation annuelle en 2017 ?", choix: [{ lettre: "A", texte: "5 300 €" }, { lettre: "B", texte: "5 200 €", correct: true }] },
        { id: 2, enonce: "Véhicule 28 000€ HT acheté le 1er avril, amorti sur 4 ans. Amortissement 1ère année ?", choix: [{ lettre: "A", texte: "13 000 €" }, { lettre: "B", texte: "6 500 €" }, { lettre: "C", texte: "5 250 €", correct: true }, { lettre: "D", texte: "7 350 €" }] },
        { id: 3, enonce: "Véhicule 22 000€ HT au 1er avril. Amortissement sur 4 ans, exercice au 31/12. Dotation année N ?", choix: [{ lettre: "A", texte: "6 574 €" }, { lettre: "B", texte: "4 125 €", correct: true }, { lettre: "C", texte: "5 885 €" }, { lettre: "D", texte: "5 500 €" }] },
      ]
    },
    {
      id: 407, titre: "Pourcentage d'augmentation", actif: true,
      questions: [
        { id: 1, enonce: "Le CA d'un artisan T3P passe de 10 100€ à 15 440€. Quel pourcentage d'augmentation ?", choix: [{ lettre: "A", texte: "54,20 %" }, { lettre: "B", texte: "52,87 %", correct: true }, { lettre: "C", texte: "51,83 %" }] },
      ]
    },
  ],
};
