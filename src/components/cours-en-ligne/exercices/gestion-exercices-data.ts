import type { ExerciceQuestion } from "./types";

export const GESTION_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  {
    id: 60, actif: true,
    titre: "Gestion — Partie 1 : Entrepreneurs & Formes Juridiques",
    sousTitre: "Compte de résultat, bilan, types d'entrepreneurs, formes juridiques, capital social",
    questions: [
      { id: 1, enonce: "Qu'est-ce que le compte de résultat pour une entreprise ?", choix: [
        { lettre: "A", texte: "Permet d'apprécier la performance d'une entreprise", correct: true },
        { lettre: "B", texte: "Mesure l'activité de l'entreprise sur une période déterminée", correct: true },
        { lettre: "C", texte: "L'excédent des dépenses sur les recettes" },
        { lettre: "D", texte: "La différence entre les produits et les recettes" },
      ]},
      { id: 2, enonce: "Choisir parmi les éléments suivants, les dépenses qui constituent des charges :", choix: [
        { lettre: "A", texte: "Le remboursement d'un emprunt" },
        { lettre: "B", texte: "L'emprunt se rembourse donc ce n'est pas une charge" },
        { lettre: "C", texte: "Le paiement du salaire des employés", correct: true },
        { lettre: "D", texte: "Assurance responsabilité civile professionnelle", correct: true },
      ]},
      { id: 3, enonce: "Le compte de résultat montre :", choix: [
        { lettre: "A", texte: "Quel est le résultat de l'entreprise", correct: true },
        { lettre: "B", texte: "Quelle est la rentabilité des investissements" },
        { lettre: "C", texte: "Quelle est la situation financière de l'entreprise" },
      ]},
      { id: 4, enonce: "À l'actif du bilan figure :", choix: [
        { lettre: "A", texte: "Le capital" },
        { lettre: "B", texte: "Les créances des clients", correct: true },
        { lettre: "C", texte: "Le résultat de l'année" },
      ]},
      { id: 5, enonce: "Un exemple de charges d'exploitation :", choix: [
        { lettre: "A", texte: "Essence", correct: true },
        { lettre: "B", texte: "Les agios" },
        { lettre: "C", texte: "Chiffre d'affaires" },
      ]},
      { id: 6, enonce: "Un exemple de charges financières :", choix: [
        { lettre: "A", texte: "Achat de marchandises" },
        { lettre: "B", texte: "Agios, intérêts d'emprunt", correct: true },
        { lettre: "C", texte: "Salaires" },
      ]},
      { id: 7, enonce: "Un exemple de produit d'exploitation :", choix: [
        { lettre: "A", texte: "Chiffre d'affaires", correct: true },
        { lettre: "B", texte: "Achat de marchandises" },
        { lettre: "C", texte: "Salaires" },
      ]},
      { id: 8, enonce: "Dans le bilan de l'entreprise, le véhicule figure :", choix: [
        { lettre: "A", texte: "Dans l'actif circulant" },
        { lettre: "B", texte: "Au passif au niveau du capital" },
        { lettre: "C", texte: "Dans l'actif immobilisé", correct: true },
      ]},
      { id: 9, enonce: "Quel élément ne se trouve pas au passif d'un bilan ?", choix: [
        { lettre: "A", texte: "Capital" },
        { lettre: "B", texte: "Véhicule", correct: true },
        { lettre: "C", texte: "Emprunt" },
      ]},
      { id: 10, enonce: "Les dettes à court terme sont un poste :", choix: [
        { lettre: "A", texte: "De l'actif du bilan" },
        { lettre: "B", texte: "Des charges du compte de résultat" },
        { lettre: "C", texte: "Du passif du bilan", correct: true },
        { lettre: "D", texte: "Des produits du compte de résultat" },
      ]},
      { id: 11, enonce: "Dans un bilan :", choix: [
        { lettre: "A", texte: "Si le total de l'actif est supérieur au passif il y a bénéfice" },
        { lettre: "B", texte: "Si le total de l'actif est inférieur au passif il y a perte" },
        { lettre: "C", texte: "Le total de l'actif est toujours égal au total du passif", correct: true },
      ]},
      { id: 12, enonce: "Les dettes fiscales et sociales de l'entreprise sont reprises :", choix: [
        { lettre: "A", texte: "À l'actif du bilan" },
        { lettre: "B", texte: "Dans les charges d'exploitation du compte de résultat" },
        { lettre: "C", texte: "Au passif du bilan", correct: true },
      ]},
      { id: 13, enonce: "La Trésorerie/Disponibilités/Banque figure :", choix: [
        { lettre: "A", texte: "À l'actif du bilan", correct: true },
        { lettre: "B", texte: "Au passif du bilan" },
      ]},
      { id: 14, enonce: "Quelle est la définition du bilan ?", choix: [
        { lettre: "A", texte: "C'est une photographie de la notoriété de l'entreprise" },
        { lettre: "B", texte: "C'est une photographie de la taille de l'entreprise" },
        { lettre: "C", texte: "C'est une photographie du patrimoine de l'entreprise à un moment donné", correct: true },
      ]},
      { id: 15, enonce: "De quoi est composé le bilan ?", choix: [
        { lettre: "A", texte: "Actif = actif immobilisé et circulant / Passif = capitaux propres et dettes", correct: true },
        { lettre: "B", texte: "Charges d'exploitation et financière / Produits d'exploitation et financiers" },
        { lettre: "C", texte: "Dettes = emprunts, factures / Bénéfices = trésorerie, chiffre d'affaires" },
      ]},
      { id: 16, enonce: "En tant que micro-entrepreneur inscrit comme chauffeur VTC ou TAXI, j'agis en tant que :", choix: [
        { lettre: "A", texte: "Personne physique", correct: true },
        { lettre: "B", texte: "Personne morale" },
      ]},
      { id: 17, enonce: "Qu'est-ce qu'une SARL ?", choix: [
        { lettre: "A", texte: "Une Société à Responsabilité Limitée", correct: true },
        { lettre: "B", texte: "Une Société à Répartition Limitée" },
      ]},
      { id: 18, enonce: "Quel est le capital minimal pour une S.A.S. ?", choix: [
        { lettre: "A", texte: "Aucun montant minimum (montant libre)", correct: true },
        { lettre: "B", texte: "7 500 €" },
        { lettre: "C", texte: "37 000 €" },
      ]},
      { id: 19, enonce: "Combien y a-t-il d'associés minimum dans une SARL ?", choix: [
        { lettre: "A", texte: "1" },
        { lettre: "B", texte: "2", correct: true },
      ]},
      { id: 20, enonce: "Le capital social d'une SARL est au minimum de :", choix: [
        { lettre: "A", texte: "1 €", correct: true },
        { lettre: "B", texte: "7 500 €" },
      ]},
      { id: 21, enonce: "Je peux créer une Société par Actions Simplifiée avec un seul associé. Cela s'appelle :", choix: [
        { lettre: "A", texte: "S.A.S.U.", correct: true },
        { lettre: "B", texte: "S.A.S.I" },
        { lettre: "C", texte: "S.A.S." },
      ]},
      { id: 22, enonce: "Une entreprise individuelle est obligée de déposer ses comptes tous les ans au greffe du tribunal de commerce.", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 23, enonce: "En EURL, la responsabilité est engagée en cas de faute grave de gestion ?", choix: [
        { lettre: "A", texte: "Vrai", correct: true },
        { lettre: "B", texte: "Faux" },
      ]},
      { id: 24, enonce: "Combien d'associés possède une EURL ?", choix: [
        { lettre: "A", texte: "7" },
        { lettre: "B", texte: "2" },
        { lettre: "C", texte: "1", correct: true },
      ]},
      { id: 25, enonce: "Le nombre d'associés d'une SARL est au maximum de :", choix: [
        { lettre: "A", texte: "2 associés" },
        { lettre: "B", texte: "7 associés" },
        { lettre: "C", texte: "100 associés", correct: true },
      ]},
      { id: 26, enonce: "Dans une entreprise individuelle :", choix: [
        { lettre: "A", texte: "L'entrepreneur est responsable à hauteur du capital" },
        { lettre: "B", texte: "L'entrepreneur n'est pas responsable du paiement des dettes" },
        { lettre: "C", texte: "Le patrimoine de l'entreprise est séparé de celui de son fondateur", correct: true },
      ]},
      { id: 28, enonce: "Pour une entreprise individuelle, la constitution d'un capital est-elle nécessaire ?", choix: [
        { lettre: "A", texte: "Oui 7 500 €" },
        { lettre: "B", texte: "Oui 1 €" },
        { lettre: "C", texte: "Non", correct: true },
      ]},
      { id: 29, enonce: "Combien y a-t-il d'associés dans une SARL ?", choix: [
        { lettre: "A", texte: "De 1 à 50" },
        { lettre: "B", texte: "De 2 à 100", correct: true },
        { lettre: "C", texte: "Maximum 10" },
      ]},
      { id: 30, enonce: "L'entreprise individuelle est considérée comme une personne :", choix: [
        { lettre: "A", texte: "Physique", correct: true },
        { lettre: "B", texte: "Morale" },
      ]},
      { id: 31, enonce: "À l'installation d'un artisan avec le statut d'EURL, quel est le montant du capital minimum ?", choix: [
        { lettre: "A", texte: "1 €", correct: true },
        { lettre: "B", texte: "10 000 €" },
        { lettre: "C", texte: "Il n'y a pas de notion de capital social dans une EURL" },
      ]},
      { id: 32, enonce: "Quel est le capital maximum pour créer une SARL ?", choix: [
        { lettre: "A", texte: "1 €" },
        { lettre: "B", texte: "100 €" },
        { lettre: "C", texte: "1 000 €" },
        { lettre: "D", texte: "Pas de montant maximum", correct: true },
      ]},
    ],
  },
  {
    id: 61, actif: true,
    titre: "Gestion — Partie 2 : Amortissements, Coût de revient, TVA & Fiscalité",
    sousTitre: "Amortissements, charges fixes/variables, CRK, seuil de rentabilité, régimes d'imposition",
    questions: [
      { id: 1, enonce: "Dans un bilan comptable, l'amortissement fait baisser :", choix: [
        { lettre: "A", texte: "Les charges" },
        { lettre: "B", texte: "Le bénéfice", correct: true },
        { lettre: "C", texte: "L'imposition" },
      ]},
      { id: 2, enonce: "Les dotations aux amortissements sont :", choix: [
        { lettre: "A", texte: "Une charge d'exploitation", correct: true },
        { lettre: "B", texte: "Une dette" },
        { lettre: "C", texte: "Un décaissement" },
      ]},
      { id: 3, enonce: "Véhicule 20 000 € HT sur 4 ans + ordinateur 600 € HT sur 3 ans. Dotation d'amortissement en 2016 ?", choix: [
        { lettre: "A", texte: "4 200 €" },
        { lettre: "B", texte: "5 000 €" },
        { lettre: "C", texte: "5 200 €", correct: true },
        { lettre: "D", texte: "5 300 €" },
      ]},
      { id: 4, enonce: "Dotation annuelle de 5 875 € HT sur 4 ans. Quel est le prix TTC du véhicule ?", choix: [
        { lettre: "A", texte: "5 875 × 4 = 23 500 € HT, 23 500 × 1.2 = 28 200 € TTC", correct: true },
        { lettre: "B", texte: "5 875 × 4 = 23 500 × 0.2 = 28 600 €" },
      ]},
      { id: 5, enonce: "Quelle est la durée d'amortissement habituelle d'un véhicule ?", choix: [
        { lettre: "A", texte: "2 ans" },
        { lettre: "B", texte: "4 à 5 ans", correct: true },
        { lettre: "C", texte: "10 ans" },
        { lettre: "D", texte: "20 ans" },
      ]},
      { id: 6, enonce: "L'amortissement dégressif est-il autorisé pour les véhicules VTC/Taxi ?", choix: [
        { lettre: "A", texte: "Oui, c'est le mode privilégié" },
        { lettre: "B", texte: "Non, seul l'amortissement linéaire est autorisé", correct: true },
        { lettre: "C", texte: "Oui, mais uniquement pour les véhicules neufs" },
      ]},
      { id: 7, enonce: "Définition d'une charge fixe :", choix: [
        { lettre: "A", texte: "C'est une charge budgétisée en fonction de sa consommation (ex : essence)" },
        { lettre: "B", texte: "C'est une charge qui ne peut jamais augmenter" },
        { lettre: "C", texte: "C'est une charge qui ne varie pas en fonction de l'activité (ex : loyer)", correct: true },
      ]},
      { id: 8, enonce: "Définition d'une charge variable :", choix: [
        { lettre: "A", texte: "C'est une charge qui varie en fonction de l'activité (ex : essence)", correct: true },
        { lettre: "B", texte: "C'est une charge qui varie mais ne dépasse pas le budget imposé" },
      ]},
      { id: 9, enonce: "CF 25 000 €, CV 8 000 €, 55 000 km/an. CRK = ?", choix: [
        { lettre: "A", texte: "CRK = (8 000 + 25 000) / 55 000 = 0,60 €", correct: true },
        { lettre: "B", texte: "CRK = 8 000 / 25 000 × 55 000 = 0,80 €" },
      ]},
      { id: 10, enonce: "Formule binôme — CF 25 000 €, CV 8 000 €, 55 000 km, 280 jours. TK et TJ = ?", choix: [
        { lettre: "A", texte: "TK = 8 000 × 55 000 = 0,13 € ; TJ = 25 000 / 280 = 93,29 €" },
        { lettre: "B", texte: "TK = 8 000 / 55 000 = 0,15 € ; TJ = 25 000 / 280 = 89,29 €", correct: true },
      ]},
      { id: 11, enonce: "Coût variable de 3 € sur une course facturée 8 € → activité rentable ?", choix: [
        { lettre: "A", texte: "Vrai" },
        { lettre: "B", texte: "Vrai si dans ce coût variable est inclus le salaire du chauffeur", correct: true },
        { lettre: "C", texte: "On ne peut pas le savoir" },
      ]},
      { id: 12, enonce: "CF 2 000 €, courses à 10 € avec 2 € de frais variables. Seuil de rentabilité = combien de courses ?", choix: [
        { lettre: "A", texte: "200 courses" },
        { lettre: "B", texte: "250 courses", correct: true },
        { lettre: "C", texte: "300 courses" },
      ]},
      { id: 13, enonce: "Quelle est la définition du seuil de rentabilité ?", choix: [
        { lettre: "A", texte: "C'est le niveau de CA pour lequel l'entreprise n'a ni perte, ni bénéfice", correct: true },
        { lettre: "B", texte: "C'est le niveau maximum du CA que l'entreprise peut atteindre" },
        { lettre: "C", texte: "C'est le meilleur CA produit par l'entreprise" },
      ]},
      { id: 14, enonce: "Avec un niveau d'activité en dessous du seuil de rentabilité, l'entreprise est déficitaire.", choix: [
        { lettre: "A", texte: "Vrai", correct: true },
        { lettre: "B", texte: "Faux" },
      ]},
      { id: 15, enonce: "CA de 26 500 € HT en micro-entrepreneur. Régime d'imposition ?", choix: [
        { lettre: "A", texte: "Régime simplifié d'imposition dit réel simplifié" },
        { lettre: "B", texte: "Régime d'imposition de la micro-entreprise", correct: true },
        { lettre: "C", texte: "Régime d'imposition du réel normal" },
      ]},
      { id: 16, enonce: "CA maximum pour le régime simplifié (prestation de services) ?", choix: [
        { lettre: "A", texte: "254 000 € HT", correct: true },
        { lettre: "B", texte: "777 000 € HT" },
        { lettre: "C", texte: "333 200 € HT" },
      ]},
      { id: 17, enonce: "CA maximum pour le régime Micro-Entreprise (artisan VTC/TAXI) ?", choix: [
        { lettre: "A", texte: "30 500 €" },
        { lettre: "B", texte: "34 440 €" },
        { lettre: "C", texte: "77 700 €", correct: true },
        { lettre: "D", texte: "89 600 €" },
      ]},
      { id: 18, enonce: "Quelle est la définition d'un régime d'imposition ?", choix: [
        { lettre: "A", texte: "Il détermine les modalités du calcul de votre bénéfice et la périodicité des déclarations de TVA", correct: true },
        { lettre: "B", texte: "Il détermine les modalités de calcul de vos dettes et la périodicité des paiements de salaires" },
        { lettre: "C", texte: "Il détermine les modalités de calcul de votre CA et la périodicité des déclarations des impôts" },
      ]},
      { id: 19, enonce: "Quel est le principal avantage du régime simplifié ?", choix: [
        { lettre: "A", texte: "Une seule déclaration de TVA annuelle et un paiement semestriel", correct: true },
        { lettre: "B", texte: "Des déclarations mensuelles et un paiement au comptant simplifié" },
        { lettre: "C", texte: "Une seule déclaration annuelle et aucun impôt à payer" },
      ]},
      { id: 20, enonce: "Principal inconvénient du régime réel normal (prestation de service) ?", choix: [
        { lettre: "A", texte: "Une déclaration trimestrielle et paiement mensuel" },
        { lettre: "B", texte: "Une déclaration journalière et paiement mensuel" },
        { lettre: "C", texte: "Une déclaration mensuelle et paiement mensuel sauf TVA < 4 000 €", correct: true },
      ]},
      { id: 21, enonce: "Comment calcule-t-on le bénéfice pour les régimes réel normal et simplifié ?", choix: [
        { lettre: "A", texte: "Actif – Passif" },
        { lettre: "B", texte: "Chiffre d'affaires – charges fixes" },
        { lettre: "C", texte: "Produits – Charges", correct: true },
      ]},
      { id: 22, enonce: "Qu'est-ce que le bénéfice pour le régime des micro-entreprises ?", choix: [
        { lettre: "A", texte: "Il correspond au chiffre d'affaires – les salaires" },
        { lettre: "B", texte: "Il correspond au chiffre d'affaires", correct: true },
        { lettre: "C", texte: "Il correspond à la trésorerie" },
      ]},
      { id: 23, enonce: "En entreprise individuelle, vous communiquez à l'administration fiscale :", choix: [
        { lettre: "A", texte: "Le chiffre d'affaires HT réalisé" },
        { lettre: "B", texte: "Le chiffre d'affaires prévisionnel HT" },
        { lettre: "C", texte: "Le montant de vos prélèvements sociaux" },
        { lettre: "D", texte: "Le bénéfice industriel et commercial (BIC)", correct: true },
      ]},
    ],
  },
  {
    id: 62, actif: true,
    titre: "Gestion — Partie 3 : Marge, Dividendes, Organismes & Indicateurs",
    sousTitre: "Marge, dividendes, CMA, CGA, expert-comptable, moyens de paiement, SIG, BFR",
    questions: [
      { id: 1, enonce: "Quelle est la différence entre chiffre d'affaires et bénéfice ?", choix: [
        { lettre: "A", texte: "CA = ventes / Bénéfice = Produits - Charges", correct: true },
        { lettre: "B", texte: "CA = ventes + charges / Bénéfice = ventes" },
        { lettre: "C", texte: "CA = ventes + achats / Bénéfice = trésorerie" },
      ]},
      { id: 2, enonce: "Quand les charges d'exploitation sont inférieures aux produits :", choix: [
        { lettre: "A", texte: "Il y a une perte d'exploitation" },
        { lettre: "B", texte: "Il y a un bénéfice", correct: true },
        { lettre: "C", texte: "L'entreprise doit déposer le bilan" },
      ]},
      { id: 3, enonce: "Comment se calcule le résultat d'une entreprise ?", choix: [
        { lettre: "A", texte: "Par la différence entre les charges et les produits" },
        { lettre: "B", texte: "Par la différence entre les produits et les charges consommées", correct: true },
        { lettre: "C", texte: "Par la différence entre les encaissements et les dépenses" },
      ]},
      { id: 4, enonce: "Le capital remboursé des emprunts est-il une charge déductible ?", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 5, enonce: "Les remboursements du capital de l'emprunt apparaissent :", choix: [
        { lettre: "A", texte: "Au compte de résultat en « produit »" },
        { lettre: "B", texte: "Au compte de résultat en « charge »" },
        { lettre: "C", texte: "À la fois au bilan et au compte de résultat" },
        { lettre: "D", texte: "Au « passif » du bilan de l'entreprise", correct: true },
      ]},
      { id: 6, enonce: "Qu'est-ce qui constitue une charge déductible pour un entrepreneur individuel ?", choix: [
        { lettre: "A", texte: "Mensualité de remboursement d'emprunt" },
        { lettre: "B", texte: "Loyer de crédit-bail", correct: true },
        { lettre: "C", texte: "Achat d'un véhicule" },
        { lettre: "D", texte: "Intérêt d'un emprunt", correct: true },
      ]},
      { id: 7, enonce: "Le crédit-bail d'un véhicule permet la déduction fiscale :", choix: [
        { lettre: "A", texte: "De l'amortissement du véhicule" },
        { lettre: "B", texte: "Des loyers du crédit-bail", correct: true },
      ]},
      { id: 8, enonce: "Comment se calcule le BIC imposable pour le régime en micro-entreprise ?", choix: [
        { lettre: "A", texte: "Produits moins charges" },
        { lettre: "B", texte: "Négociation d'un forfait avec l'administration fiscale" },
        { lettre: "C", texte: "Abattement automatique de 50 % du chiffre d'affaires", correct: true },
      ]},
      { id: 9, enonce: "Les dividendes d'une société sont :", choix: [
        { lettre: "A", texte: "Prélevés à tout moment" },
        { lettre: "B", texte: "Prélevés après la clôture annuelle des comptes" },
        { lettre: "C", texte: "Prélevés après l'assemblée générale", correct: true },
      ]},
      { id: 10, enonce: "Le conjoint collaborateur d'une entreprise individuelle peut-il être rémunéré ?", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 11, enonce: "Comment sont imposés les dividendes d'une société ?", choix: [
        { lettre: "A", texte: "Uniquement à l'impôt sur les sociétés" },
        { lettre: "B", texte: "Au prélèvement forfaitaire unique (PFU) de 30 %", correct: true },
        { lettre: "C", texte: "Ils ne sont pas imposés" },
      ]},
      { id: 13, enonce: "Une entreprise artisanale relève de plein droit d'un régime fiscal au titre de :", choix: [
        { lettre: "A", texte: "Son nombre de salariés" },
        { lettre: "B", texte: "Son chiffre d'affaires annuel", correct: true },
        { lettre: "C", texte: "Son résultat d'exploitation" },
      ]},
      { id: 14, enonce: "Que signifie C.F.E au sein d'une CMA ?", choix: [
        { lettre: "A", texte: "Centre de formalités des entreprises", correct: true },
        { lettre: "B", texte: "Centre de formation des entreprises" },
        { lettre: "C", texte: "Centre de fermeture des entreprises" },
      ]},
      { id: 15, enonce: "La chambre des métiers et de l'artisanat est :", choix: [
        { lettre: "A", texte: "Un syndicat professionnel d'artisans" },
        { lettre: "B", texte: "Une association reconnue d'utilité publique" },
        { lettre: "C", texte: "Un établissement public placé sous tutelle de l'État", correct: true },
      ]},
      { id: 17, enonce: "Quelles sont les missions d'un expert-comptable ?", choix: [
        { lettre: "A", texte: "Présentation et réalisation des comptes annuels", correct: true },
        { lettre: "B", texte: "Présentation des budgets annuels" },
        { lettre: "C", texte: "Présentation des salaires annuels" },
      ]},
      { id: 18, enonce: "Un centre de gestion agréé tient la comptabilité de l'entreprise.", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non", correct: true },
      ]},
      { id: 19, enonce: "Taux normal d'imposition à l'IS ?", choix: [
        { lettre: "A", texte: "25 %", correct: true },
        { lettre: "B", texte: "15 %" },
        { lettre: "C", texte: "40 %" },
      ]},
      { id: 21, enonce: "En cas de non-respect des délais de déclaration fiscale, la pénalité s'applique :", choix: [
        { lettre: "A", texte: "À l'expert-comptable" },
        { lettre: "B", texte: "À l'entreprise", correct: true },
        { lettre: "C", texte: "Au centre de gestion" },
      ]},
      { id: 22, enonce: "La déclaration de cessation de paiement se fait :", choix: [
        { lettre: "A", texte: "Auprès du greffe du Tribunal de Commerce", correct: true },
        { lettre: "B", texte: "À la Chambre de Commerce et d'Industrie" },
        { lettre: "C", texte: "À la Chambre de Métiers et de l'Artisanat" },
      ]},
      { id: 23, enonce: "Le dispositif A.C.R.E. permet l'exonération :", choix: [
        { lettre: "A", texte: "Des cotisations sociales" },
        { lettre: "B", texte: "Des cotisations sociales sauf CSG/CRDS, retraite complémentaire et formation professionnelle", correct: true },
        { lettre: "C", texte: "De l'impôt sur le revenu" },
      ]},
      { id: 24, enonce: "La publication de l'annonce légale est obligatoire pour :", choix: [
        { lettre: "A", texte: "Les entreprises individuelles" },
        { lettre: "B", texte: "Les sociétés", correct: true },
        { lettre: "C", texte: "L'EURL" },
      ]},
      { id: 25, enonce: "Le dépôt des statuts est obligatoire pour la création d'une E.U.R.L ?", choix: [
        { lettre: "A", texte: "Oui", correct: true },
        { lettre: "B", texte: "Non" },
      ]},
      { id: 26, enonce: "Où enregistrez-vous votre société ?", choix: [
        { lettre: "A", texte: "Au centre de formalité des entreprises", correct: true },
        { lettre: "B", texte: "Au centre de formation des entrepreneurs" },
        { lettre: "C", texte: "Au centre de traitement des données des entreprises" },
      ]},
      { id: 27, enonce: "Pour immatriculer son entreprise, le VTC ou TAXI doit s'adresser au CFE :", choix: [
        { lettre: "A", texte: "De la chambre de commerce et d'industrie" },
        { lettre: "B", texte: "De l'URSSAF" },
        { lettre: "C", texte: "De la chambre des métiers et de l'artisanat", correct: true },
        { lettre: "D", texte: "Des services fiscaux" },
      ]},
      { id: 28, enonce: "Le numéro SIRET est délivré par :", choix: [
        { lettre: "A", texte: "La préfecture" },
        { lettre: "B", texte: "La DREAL" },
        { lettre: "C", texte: "La CMA" },
        { lettre: "D", texte: "L'INSEE", correct: true },
      ]},
      { id: 29, enonce: "Le numéro SIREN identifie :", choix: [
        { lettre: "A", texte: "La personne (le gérant)" },
        { lettre: "B", texte: "L'entreprise", correct: true },
        { lettre: "C", texte: "L'activité" },
      ]},
      { id: 30, enonce: "Le code NAF/APE se rattache à :", choix: [
        { lettre: "A", texte: "La personne" },
        { lettre: "B", texte: "L'établissement" },
        { lettre: "C", texte: "L'activité", correct: true },
      ]},
      { id: 31, enonce: "Que signifie RCS ?", choix: [
        { lettre: "A", texte: "Réseau des commerces solidaires" },
        { lettre: "B", texte: "Registre central des sociétés" },
        { lettre: "C", texte: "Registre du commerce et des sociétés", correct: true },
      ]},
      { id: 32, enonce: "Auprès de quel organisme doit s'immatriculer un VTC ou Taxi exploitant individuel ?", choix: [
        { lettre: "A", texte: "Registre du commerce et des sociétés" },
        { lettre: "B", texte: "Répertoire des métiers" },
        { lettre: "C", texte: "Les deux", correct: true },
      ]},
      { id: 33, enonce: "À partir de quel montant un artisan VTC ou TAXI doit-il faire une facture ?", choix: [
        { lettre: "A", texte: "120 euros" },
        { lettre: "B", texte: "100 euros" },
        { lettre: "C", texte: "25 euros", correct: true },
        { lettre: "D", texte: "N'importe quel montant" },
      ]},
      { id: 34, enonce: "Définition d'un SIG (Soldes Intermédiaires de Gestion) ?", choix: [
        { lettre: "A", texte: "Indicateur pour analyser le résultat de l'entreprise", correct: true },
        { lettre: "B", texte: "Indicateur pour analyser les dettes" },
        { lettre: "C", texte: "Indicateur pour analyser les ventes" },
      ]},
      { id: 35, enonce: "Que signifie un BFR positif ?", choix: [
        { lettre: "A", texte: "L'entreprise n'a pas assez d'argent pour payer ses dettes à court terme", correct: true },
        { lettre: "B", texte: "L'entreprise n'a pas d'argent pour ses dettes à long terme" },
        { lettre: "C", texte: "L'entreprise a de l'argent pour payer ses dettes" },
      ]},
      { id: 36, enonce: "Que signifie un BFR négatif ?", choix: [
        { lettre: "A", texte: "L'entreprise dispose d'assez d'argent pour payer ses dettes à court terme", correct: true },
        { lettre: "B", texte: "L'entreprise dispose assez d'argent pour ses dettes à long terme" },
        { lettre: "C", texte: "L'entreprise n'a pas assez d'argent" },
      ]},
      { id: 37, enonce: "Définition du BFR ?", choix: [
        { lettre: "A", texte: "Sommes comptabilisées dans le bénéfice" },
        { lettre: "B", texte: "Sommes nécessaires au financement de l'activité de production, sur un cycle d'exploitation", correct: true },
        { lettre: "C", texte: "Sommes à régler aux fournisseurs" },
      ]},
      { id: 38, enonce: "Quelle est la durée de validité d'un chèque ?", choix: [
        { lettre: "A", texte: "1 an et 6 mois" },
        { lettre: "B", texte: "1 an et 8 jours", correct: true },
        { lettre: "C", texte: "1 an et 1 jour" },
      ]},
      { id: 40, enonce: "Que signifie URSSAF ?", choix: [
        { lettre: "A", texte: "Union de recouvrement des cotisations pour les allocations familiales" },
        { lettre: "B", texte: "Union de recouvrement des cotisations de sécurité sociale et d'aides sociales" },
        { lettre: "C", texte: "Union de recouvrement des cotisations de sécurité sociale et d'allocations familiales", correct: true },
      ]},
      { id: 41, enonce: "Comment se calcule le Fonds de Roulement (FR) ?", choix: [
        { lettre: "A", texte: "Actif circulant - Dettes à court terme" },
        { lettre: "B", texte: "Capitaux permanents - Actif immobilisé", correct: true },
        { lettre: "C", texte: "Chiffre d'affaires - Charges fixes" },
      ]},
      { id: 42, enonce: "Quelle est la relation entre FR, BFR et Trésorerie ?", choix: [
        { lettre: "A", texte: "Trésorerie = FR + BFR" },
        { lettre: "B", texte: "Trésorerie = FR - BFR", correct: true },
        { lettre: "C", texte: "Trésorerie = BFR - FR" },
      ]},
      { id: 43, enonce: "Quels moyens de paiement un VTC ou Taxi doit-il obligatoirement accepter ?", choix: [
        { lettre: "A", texte: "Uniquement les espèces" },
        { lettre: "B", texte: "Les espèces et la carte bancaire", correct: true },
        { lettre: "C", texte: "Uniquement la carte bancaire" },
      ]},
      { id: 44, enonce: "Les 3 statuts possibles du conjoint qui travaille dans l'entreprise :", choix: [
        { lettre: "A", texte: "Conjoint collaborateur, conjoint salarié, conjoint associé", correct: true },
        { lettre: "B", texte: "Conjoint bénévole, conjoint intérimaire, conjoint associé" },
        { lettre: "C", texte: "Conjoint employé, conjoint stagiaire, conjoint partenaire" },
      ]},
    ],
  },
];
