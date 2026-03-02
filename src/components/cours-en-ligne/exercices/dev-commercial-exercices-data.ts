// Exercices Développement Commercial — 67 questions
// Source: Développement_commercial_exercices_améliorés.docx

import type { ExerciceItem, ExerciceQuestion } from "./t3p-exercices-data";

const DEV_COMMERCIAL_QUESTIONS: ExerciceQuestion[] = [
  { id: 1, enonce: "Qu'est-ce que le marketing ?", choix: [
    { lettre: "A", texte: "Techniques pour acheter des biens à prix bas et les revendre au prix fort" },
    { lettre: "B", texte: "Techniques pour influencer les comportements des consommateurs, afin d'adapter l'offre commerciale", correct: true },
    { lettre: "C", texte: "Techniques pour augmenter le nombre d'embauches" },
  ]},
  { id: 2, enonce: "Comment dit-on « marketing » en français ?", choix: [
    { lettre: "A", texte: "Le Marketing" }, { lettre: "B", texte: "La mercatique", correct: true }, { lettre: "C", texte: "Le B to B" },
  ]},
  { id: 3, enonce: "Le marketing stratégique permet de faire :", choix: [
    { lettre: "A", texte: "La segmentation" },
    { lettre: "B", texte: "La prospection" },
    { lettre: "C", texte: "Une analyse externe du marché et une analyse interne de l'entreprise", correct: true },
  ]},
  { id: 4, enonce: "Qu'est-ce qu'une analyse externe ?", choix: [
    { lettre: "A", texte: "Réaliser un diagnostic au sein de l'entreprise" },
    { lettre: "B", texte: "Réaliser une étude du marché (demande, offre, environnement)", correct: true },
    { lettre: "C", texte: "Il s'agit de la segmentation" },
  ]},
  { id: 5, enonce: "Réaliser une étude de marché, c'est rechercher des informations sur :", choix: [
    { lettre: "A", texte: "La segmentation" },
    { lettre: "B", texte: "La prospection" },
    { lettre: "C", texte: "La demande, l'offre, les fournisseurs, la réglementation", correct: true },
  ]},
  { id: 6, enonce: "Quels sont les autres noms donnés au marketing opérationnel ?", choix: [
    { lettre: "A", texte: "Marketing stratégique" },
    { lettre: "B", texte: "Marketing OP" },
    { lettre: "C", texte: "Marketing mix", correct: true },
    { lettre: "D", texte: "Les 4P", correct: true },
  ]},
  { id: 7, enonce: "Que signifient les 4P ?", choix: [
    { lettre: "A", texte: "Produit, Prix, Communication (Promotion), Distribution (Place)", correct: true },
    { lettre: "B", texte: "Projet, Prix, Communication, Distribution" },
    { lettre: "C", texte: "Produit, Présence, Communication, Distribution" },
  ]},
  { id: 8, enonce: "Qu'est-ce que la cohérence du plan de marchéage ?", choix: [
    { lettre: "A", texte: "Faire la même publicité pour tous les produits" },
    { lettre: "B", texte: "S'assurer que les 4P sont en accord entre eux, avec les capacités de l'entreprise et dans le temps", correct: true },
    { lettre: "C", texte: "Aligner les prix sur la concurrence" },
  ]},
  { id: 9, enonce: "Pourquoi l'entreprise doit-elle contrôler ses actions marketing ?", choix: [
    { lettre: "A", texte: "Pour augmenter les prix" },
    { lettre: "B", texte: "Pour vérifier l'atteinte des objectifs et comparer résultats et prévisions", correct: true },
    { lettre: "C", texte: "Pour recruter du personnel" },
  ]},
  { id: 10, enonce: "Quels sont les outils servant à la réalisation d'une étude de marché ?", choix: [
    { lettre: "A", texte: "Les 5 forces de Porter", correct: true },
    { lettre: "B", texte: "L'analyse PESTEL", correct: true },
    { lettre: "C", texte: "PARO" },
    { lettre: "D", texte: "L'analyse SWOT", correct: true },
  ]},
  { id: 11, enonce: "Que signifie SWOT ?", choix: [
    { lettre: "A", texte: "Strengths, Weaknesses, Opportunities, Threats (Danger)" },
    { lettre: "B", texte: "Strengths, Weaknesses (Avantages), Opportunities, Threats" },
    { lettre: "C", texte: "Strengths (Forces), Weaknesses (Faiblesses), Opportunities (Opportunités), Threats (Menaces)", correct: true },
  ]},
  { id: 12, enonce: "L'analyse SWOT peut être utilisée :", choix: [
    { lettre: "A", texte: "Uniquement avant de lancer un produit" },
    { lettre: "B", texte: "Uniquement après le lancement" },
    { lettre: "C", texte: "Avant ou après le lancement pour développer et améliorer son activité", correct: true },
  ]},
  { id: 13, enonce: "Quelles sont les 5 forces de Porter ?", choix: [
    { lettre: "A", texte: "Concurrents actuels, menace des nouveaux entrants, menace des produits de substitution, pouvoir des fournisseurs, pouvoir des clients", correct: true },
    { lettre: "B", texte: "Concurrents actuels, menace des anciens clients, menace des nouveaux produits, pouvoir des banques, pouvoir des salariés" },
    { lettre: "C", texte: "Force de vente, force financière, force technologique, force humaine, force commerciale" },
  ]},
  { id: 14, enonce: "Que signifie PESTEL ?", choix: [
    { lettre: "A", texte: "Politique, Économique, Social, Technologique, Écologique, Légal", correct: true },
    { lettre: "B", texte: "Politique, Éducatif, Social, Technique, Environnemental, Logistique" },
    { lettre: "C", texte: "Planification, Économie, Stratégie, Technologie, Éthique, Logistique" },
  ]},
  { id: 15, enonce: "Dans l'analyse PESTEL appliquée au VTC, le facteur « Écologique » concerne :", choix: [
    { lettre: "A", texte: "Le type de carburant utilisé" },
    { lettre: "B", texte: "Les ZFE, les vignettes CRIT'AIR et les normes de développement durable", correct: true },
    { lettre: "C", texte: "La propreté du véhicule" },
  ]},
  { id: 16, enonce: "Qu'est-ce qu'une zone de chalandise ?", choix: [
    { lettre: "A", texte: "Une zone de prospection" },
    { lettre: "B", texte: "La zone géographique d'où provient la majorité de la clientèle", correct: true },
    { lettre: "C", texte: "Une zone dans laquelle les prix sont bas" },
  ]},
  { id: 17, enonce: "Qu'est-ce qu'un prix psychologique ?", choix: [
    { lettre: "A", texte: "Un prix accepté par le plus grand nombre de consommateurs selon les caractéristiques du produit", correct: true },
    { lettre: "B", texte: "Un prix bas" },
    { lettre: "C", texte: "Un prix élevé" },
  ]},
  { id: 18, enonce: "Qu'est-ce que le B to B ?", choix: [
    { lettre: "A", texte: "Activités commerciales entre professionnels uniquement", correct: true },
    { lettre: "B", texte: "Activités commerciales pour des particuliers" },
    { lettre: "C", texte: "Le fait de prospecter" },
  ]},
  { id: 19, enonce: "Qu'est-ce que le B to C ?", choix: [
    { lettre: "A", texte: "Activités commerciales entre professionnels uniquement" },
    { lettre: "B", texte: "Activités commerciales par des entreprises pour des particuliers", correct: true },
    { lettre: "C", texte: "Le fait de prospecter" },
  ]},
  { id: 20, enonce: "Qu'est-ce que la notoriété ?", choix: [
    { lettre: "A", texte: "L'image de marque" },
    { lettre: "B", texte: "Le nombre de personnes qui connaissent telle ou telle marque", correct: true },
    { lettre: "C", texte: "Le fait de prospecter" },
  ]},
  { id: 21, enonce: "Qu'est-ce que le marketing direct ?", choix: [
    { lettre: "A", texte: "Une démarche commerciale sans intermédiaire, personnalisée et à distance", correct: true },
    { lettre: "B", texte: "Vendre uniquement en magasin" },
    { lettre: "C", texte: "La publicité télévisée" },
  ]},
  { id: 22, enonce: "Qu'est-ce que le packaging pour un chauffeur VTC ?", choix: [
    { lettre: "A", texte: "L'emballage des produits vendus" },
    { lettre: "B", texte: "L'apparence globale du service : véhicule, tenue du chauffeur, carte de visite, site web", correct: true },
    { lettre: "C", texte: "Le type de carton utilisé pour les livraisons" },
  ]},
  { id: 23, enonce: "Qu'est-ce que le street marketing ?", choix: [
    { lettre: "A", texte: "Publicité dans les rues piétonnes uniquement" },
    { lettre: "B", texte: "Tactique promotionnelle consistant à distribuer du matériel publicitaire dans l'espace public", correct: true },
    { lettre: "C", texte: "La décoration du véhicule VTC" },
  ]},
  { id: 24, enonce: "Qu'est-ce qu'un service premium ?", choix: [
    { lettre: "A", texte: "Un service d'entrée de gamme" },
    { lettre: "B", texte: "Un service moyen de gamme" },
    { lettre: "C", texte: "Un service haut de gamme", correct: true },
  ]},
  { id: 25, enonce: "Qu'est-ce qu'un marché de niche ?", choix: [
    { lettre: "A", texte: "Un marché pour animaux" },
    { lettre: "B", texte: "Un marché très étroit correspondant à un produit/service très spécialisé", correct: true },
    { lettre: "C", texte: "Un marché très large" },
  ]},
  { id: 26, enonce: "Qu'est-ce que la segmentation ?", choix: [
    { lettre: "A", texte: "Diviser le marché en sous-groupes ayant les mêmes caractéristiques", correct: true },
    { lettre: "B", texte: "Fidéliser un client" },
    { lettre: "C", texte: "Prospecter un client" },
  ]},
  { id: 27, enonce: "Qu'est-ce que le positionnement pour un VTC ?", choix: [
    { lettre: "A", texte: "Choisir sa place de stationnement" },
    { lettre: "B", texte: "Définir le niveau de gamme du service proposé", correct: true },
    { lettre: "C", texte: "Le prix le plus bas du marché" },
  ]},
  { id: 28, enonce: "Qu'est-ce qu'une cible en marketing ?", choix: [
    { lettre: "A", texte: "Un concurrent à éliminer" },
    { lettre: "B", texte: "La clientèle à qui l'on va vendre le produit ou service", correct: true },
    { lettre: "C", texte: "Un fournisseur" },
  ]},
  { id: 29, enonce: "Un client se présente lors d'une mission. Que faites-vous ?", choix: [
    { lettre: "A", texte: "Vous restez dans la voiture en attendant qu'il monte" },
    { lettre: "B", texte: "Vous sortez de la voiture pour lui ouvrir la porte" },
    { lettre: "C", texte: "Vous sortez et vérifiez que son nom correspond au bon de commande avant de le laisser monter" },
    { lettre: "D", texte: "Vous sortez et vous vous présentez avant de lui demander son nom", correct: true },
  ]},
  { id: 30, enonce: "Un client seul demande à monter à l'avant car il est mal en voiture.", choix: [
    { lettre: "A", texte: "Vous refusez, car c'est interdit" },
    { lettre: "B", texte: "Vous acceptez, le laissez monter et reculez le siège", correct: true },
  ]},
  { id: 31, enonce: "Vous devez prendre en charge un client dans un grand hôtel à une heure précise.", choix: [
    { lettre: "A", texte: "Vous arrivez juste à l'heure" },
    { lettre: "B", texte: "Vous vous présentez au concierge avec quelques minutes d'avance", correct: true },
    { lettre: "C", texte: "Vous arrivez en avance mais attendez l'heure exacte" },
    { lettre: "D", texte: "Vous arrivez en avance et attendez dans votre voiture" },
  ]},
  { id: 32, enonce: "Quel est le premier critère d'une bonne conduite professionnelle ?", choix: [
    { lettre: "A", texte: "Une conduite la plus rapide possible" },
    { lettre: "B", texte: "Une conduite souple, sûre et respectueuse du confort du passager", correct: true },
  ]},
  { id: 33, enonce: "Vous réalisez que vous allez arriver en retard. Que faites-vous ?", choix: [
    { lettre: "A", texte: "Vous appelez le client pour le prévenir", correct: true },
    { lettre: "B", texte: "Vous appelez un collègue ou votre dispatcher pour envoyer un autre chauffeur", correct: true },
    { lettre: "C", texte: "Cela ne vous arrive pas" },
  ]},
  { id: 34, enonce: "Le nombre de personnes que vous pouvez transporter est au maximum de :", choix: [
    { lettre: "A", texte: "Trois" },
    { lettre: "B", texte: "Deux" },
    { lettre: "C", texte: "Quatre" },
    { lettre: "D", texte: "Cela dépend du nombre de ceintures de sécurité et 8 au maximum sans le chauffeur", correct: true },
  ]},
  { id: 35, enonce: "Avant de fermer le coffre, je demande aux clients de vérifier le nombre de valises.", choix: [
    { lettre: "A", texte: "Oui", correct: true },
    { lettre: "B", texte: "Non" },
  ]},
  { id: 36, enonce: "Un client se fait conduire en boîte de nuit et me demande de l'attendre.", choix: [
    { lettre: "A", texte: "J'en profite pour aller danser" },
    { lettre: "B", texte: "Je reste dans ma voiture à proximité", correct: true },
    { lettre: "C", texte: "Je vais rentrer chez moi" },
  ]},
  { id: 37, enonce: "Après un violent orage, dès que possible, je lave la voiture.", choix: [
    { lettre: "A", texte: "Vrai", correct: true },
    { lettre: "B", texte: "Faux" },
  ]},
  { id: 38, enonce: "Un client allume une cigarette alors que votre entreprise ne le permet pas.", choix: [
    { lettre: "A", texte: "Vous n'intervenez pas, le client est roi" },
    { lettre: "B", texte: "Vous lui demandez courtoisement d'entrebâiller sa fenêtre" },
    { lettre: "C", texte: "Vous utilisez l'humour en indiquant que fumer tue" },
    { lettre: "D", texte: "Vous appelez courtoisement son attention sur le fait qu'il n'est pas possible de fumer", correct: true },
  ]},
  { id: 39, enonce: "En accueillant un client seul, le chauffeur VTC l'invite à prendre place :", choix: [
    { lettre: "A", texte: "Sur le siège arrière gauche" },
    { lettre: "B", texte: "Sur le siège arrière droit", correct: true },
    { lettre: "C", texte: "Sur le siège avant" },
  ]},
  { id: 40, enonce: "Lors d'un transfert aéroport vers l'hôtel, les clients demandent un détour devant un monument. Pas de mission suivante.", choix: [
    { lettre: "A", texte: "Vous acceptez et en profitez pour faire le guide touristique", correct: true },
    { lettre: "B", texte: "Vous refusez car ce n'était pas prévu dans le devis" },
  ]},
  { id: 41, enonce: "Le client vous donne un pourboire qui était destiné au voiturier.", choix: [
    { lettre: "A", texte: "Vous gardez le pourboire" },
    { lettre: "B", texte: "Vous le rendez au voiturier qui en était le destinataire", correct: true },
    { lettre: "C", texte: "Vous partagez avec le voiturier" },
  ]},
  { id: 42, enonce: "Vous partez pour une course et votre réservoir est dans son dernier quart.", choix: [
    { lettre: "A", texte: "Par sécurité, vous faites le plein avant la course", correct: true },
    { lettre: "B", texte: "Vous ferez le plein avec le client au moment utile" },
  ]},
  { id: 43, enonce: "Les clients veulent dîner dans un restaurant gastronomique et vous demandent de réserver.", choix: [
    { lettre: "A", texte: "Vous le faites avec plaisir et en leur donnant même le choix", correct: true },
    { lettre: "B", texte: "Vous leur expliquez que vous êtes chauffeur VTC, pas guide gastronomique" },
    { lettre: "C", texte: "Vous n'en connaissez pas, vous appelez des collègues" },
  ]},
  { id: 44, enonce: "En présence d'un client, j'utilise le GPS seulement quand je ne peux pas faire autrement.", choix: [
    { lettre: "A", texte: "Vrai" },
    { lettre: "B", texte: "Faux, le GPS permet de connaître de nombreuses informations", correct: true },
  ]},
  { id: 45, enonce: "J'utilise des applications de suivi des vols pour anticiper les retards.", choix: [
    { lettre: "A", texte: "Vrai", correct: true },
    { lettre: "B", texte: "Faux" },
  ]},
  { id: 46, enonce: "Après 2h30 d'attente, les clients arrivent contrariés car leurs valises sont perdues.", choix: [
    { lettre: "A", texte: "Vous compatissez mais il faut partir car vous avez une autre mission" },
    { lettre: "B", texte: "Vous les accompagnez au bureau des réclamations et les aidez, tout en prévenant votre dispatcher", correct: true },
  ]},
  { id: 47, enonce: "Quelles sont les stratégies de différenciation tarifaire pour un VTC ?", choix: [
    { lettre: "A", texte: "Forfait aéroport/gare, tarif horaire, abonnement entreprise, tarif premium, réductions fidélité", correct: true },
    { lettre: "B", texte: "Un seul tarif fixe pour toutes les courses" },
    { lettre: "C", texte: "Toujours le prix le plus bas possible" },
  ]},
  { id: 48, enonce: "Qu'est-ce qu'un prospect ?", choix: [
    { lettre: "A", texte: "Un client fidèle" },
    { lettre: "B", texte: "Un client en colère" },
    { lettre: "C", texte: "Un client potentiel", correct: true },
  ]},
  { id: 49, enonce: "Qu'est-ce que la fidélisation ?", choix: [
    { lettre: "A", texte: "Trouver de nouveaux clients" },
    { lettre: "B", texte: "Les actions pour que les clients restent fidèles et continuent à consommer", correct: true },
    { lettre: "C", texte: "Baisser les prix pour attirer plus de monde" },
  ]},
  { id: 50, enonce: "Comment fidéliser une clientèle VTC ?", choix: [
    { lettre: "A", texte: "Être disponible et réactif (téléphone, mail, WhatsApp)", correct: true },
    { lettre: "B", texte: "Envoyer des courriels ou SMS avec offres et promotions", correct: true },
    { lettre: "C", texte: "Laisser PLUSIEURS cartes de visite au client", correct: true },
    { lettre: "D", texte: "Proposer des réductions fidélité", correct: true },
    { lettre: "E", texte: "Toutes les réponses ci-dessus", correct: true },
  ]},
  { id: 51, enonce: "Un client insatisfait en parlera en moyenne à combien de personnes ?", choix: [
    { lettre: "A", texte: "2 personnes" },
    { lettre: "B", texte: "5 personnes" },
    { lettre: "C", texte: "10 personnes", correct: true },
  ]},
  { id: 52, enonce: "Quelles sont les formes de prospection ?", choix: [
    { lettre: "A", texte: "Prospection traditionnelle : porte à porte, téléphone, cartes de visite, flyers, salons" },
    { lettre: "B", texte: "Prospection numérique : site web, réseaux sociaux, emailing, Google My Business" },
    { lettre: "C", texte: "Les deux réponses sont correctes", correct: true },
  ]},
  { id: 53, enonce: "Qu'est-ce que la communication média ?", choix: [
    { lettre: "A", texte: "Toucher une cible large et importante au niveau national ou international (TV, radio, publicité en ligne…)", correct: true },
    { lettre: "B", texte: "Toucher une clientèle précise (sponsoring, mécénat…)" },
    { lettre: "C", texte: "Faire de la pub sur un salon" },
  ]},
  { id: 54, enonce: "Qu'est-ce que la communication hors média ?", choix: [
    { lettre: "A", texte: "Toucher une cible large au niveau national ou international" },
    { lettre: "B", texte: "Toucher une clientèle précise (cartes de visite, emailing, parrainage, partenariats locaux)", correct: true },
    { lettre: "C", texte: "Uniquement faire de la pub sur un salon" },
  ]},
  { id: 55, enonce: "Qu'est-ce que le SEO (référencement naturel) ?", choix: [
    { lettre: "A", texte: "Payer Google pour apparaître en premier" },
    { lettre: "B", texte: "Techniques pour améliorer la position de son site web dans les résultats Google de manière naturelle", correct: true },
    { lettre: "C", texte: "Un réseau social" },
  ]},
  { id: 56, enonce: "Qu'est-ce que Google My Business ?", choix: [
    { lettre: "A", texte: "Un réseau social comme Facebook" },
    { lettre: "B", texte: "Une fiche gratuite sur Google permettant d'apparaître dans les recherches locales avec photos, horaires, avis", correct: true },
    { lettre: "C", texte: "Un logiciel de comptabilité" },
  ]},
  { id: 57, enonce: "Quels réseaux sociaux sont pertinents pour un chauffeur VTC ?", choix: [
    { lettre: "A", texte: "Instagram, Facebook et LinkedIn", correct: true },
    { lettre: "B", texte: "Uniquement TikTok" },
    { lettre: "C", texte: "Aucun, les réseaux sociaux ne servent à rien pour un VTC" },
  ]},
  { id: 58, enonce: "Quel pourcentage de clients consultent les avis en ligne avant de réserver ?", choix: [
    { lettre: "A", texte: "30%" }, { lettre: "B", texte: "60%" }, { lettre: "C", texte: "90%", correct: true },
  ]},
  { id: 59, enonce: "Quels éléments doit contenir un site web professionnel VTC ?", choix: [
    { lettre: "A", texte: "Uniquement un numéro de téléphone" },
    { lettre: "B", texte: "Page d'accueil, services, tarifs, réservation en ligne, mentions légales, responsive mobile", correct: true },
    { lettre: "C", texte: "Juste une page Facebook suffit" },
  ]},
  { id: 60, enonce: "Quels types de partenaires un chauffeur VTC peut-il développer ?", choix: [
    { lettre: "A", texte: "Hôtels et restaurants", correct: true },
    { lettre: "B", texte: "Entreprises et comités d'entreprise", correct: true },
    { lettre: "C", texte: "Conciergeries et événementiel", correct: true },
    { lettre: "D", texte: "Cliniques, hôpitaux, CPAM", correct: true },
    { lettre: "E", texte: "Agences de voyage", correct: true },
    { lettre: "F", texte: "Toutes les réponses ci-dessus", correct: true },
  ]},
  { id: 61, enonce: "Quel est le taux de commission moyen prélevé par les plateformes VTC ?", choix: [
    { lettre: "A", texte: "5 à 10%" }, { lettre: "B", texte: "20 à 25%", correct: true }, { lettre: "C", texte: "40 à 50%" },
  ]},
  { id: 62, enonce: "Comment développer un partenariat avec un hôtel ?", choix: [
    { lettre: "A", texte: "Proposer un tarif préférentiel, laisser des cartes à la réception, offrir une commission", correct: true },
    { lettre: "B", texte: "Demander à l'hôtel de payer pour être référencé" },
    { lettre: "C", texte: "Ne travailler qu'avec des hôtels 5 étoiles" },
  ]},
  { id: 63, enonce: "Combien de mentions obligatoires doit comporter un devis VTC ?", choix: [
    { lettre: "A", texte: "5 mentions" }, { lettre: "B", texte: "8 mentions" }, { lettre: "C", texte: "11 mentions", correct: true },
  ]},
  { id: 64, enonce: "Parmi les éléments suivants, lesquels sont des mentions obligatoires du devis ?", choix: [
    { lettre: "A", texte: "Date du devis et durée de validité de l'offre", correct: true },
    { lettre: "B", texte: "Nom, raison sociale et adresse de l'entreprise", correct: true },
    { lettre: "C", texte: "Le capital social de l'entreprise" },
    { lettre: "D", texte: "Numéro individuel d'identification à la TVA", correct: true },
    { lettre: "E", texte: "Somme globale à payer HT et TTC", correct: true },
  ]},
  { id: 65, enonce: "Quelle est la différence entre un devis et une facture ?", choix: [
    { lettre: "A", texte: "Il n'y a aucune différence" },
    { lettre: "B", texte: "La facture reprend toutes les mentions du devis + un numéro de facture unique et chronologique", correct: true },
    { lettre: "C", texte: "Le devis est plus détaillé que la facture" },
  ]},
  { id: 66, enonce: "Combien de temps minimum doit-on conserver les factures ?", choix: [
    { lettre: "A", texte: "3 ans" }, { lettre: "B", texte: "5 ans" }, { lettre: "C", texte: "10 ans", correct: true },
  ]},
];

export const DEV_COMMERCIAL_EXERCICE: ExerciceItem = {
  id: 7,
  titre: "Exercices Développement Commercial",
  sousTitre: "66 questions : Mercatique, SWOT, PESTEL, Porter, Segmentation, Fidélisation, Communication, Devis & Facture",
  actif: true,
  questions: DEV_COMMERCIAL_QUESTIONS,
};

export const DEV_COMMERCIAL_EXERCICES: ExerciceItem[] = [DEV_COMMERCIAL_EXERCICE];
