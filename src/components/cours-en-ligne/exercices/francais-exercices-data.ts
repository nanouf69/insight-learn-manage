import type { ExerciceQuestion } from "./types";

export const FRANCAIS_EXERCICES: {
  id: number; titre: string; sousTitre?: string; actif: boolean; questions: ExerciceQuestion[];
}[] = [
  {
    id: 50, actif: true,
    titre: "Français — Compréhension & Expression",
    sousTitre: "Conjugaison, participe passé, compréhension de texte, accueil clientèle",
    questions: [
      // SECTION 1 — CONJUGAISON : LES 3 GROUPES VERBAUX
      { id: 1, enonce: "Le verbe « parler » appartient au :\n\nIndice : Les verbes en -er (sauf aller) = 1er groupe.", choix: [
        { lettre: "A", texte: "1er groupe", correct: true },
        { lettre: "B", texte: "2ème groupe" },
        { lettre: "C", texte: "3ème groupe" },
      ]},
      { id: 2, enonce: "Le verbe « finir » appartient au :\n\nIndice : Finir → finissant = 2ème groupe", choix: [
        { lettre: "A", texte: "1er groupe" },
        { lettre: "B", texte: "2ème groupe", correct: true },
        { lettre: "C", texte: "3ème groupe" },
      ]},
      { id: 3, enonce: "Le verbe « aller » appartient au :\n\nIndice : Aller est l'exception : malgré sa terminaison en -er, il est du 3ème groupe.", choix: [
        { lettre: "A", texte: "1er groupe (car il se termine en -er)" },
        { lettre: "B", texte: "2ème groupe" },
        { lettre: "C", texte: "3ème groupe", correct: true },
      ]},
      { id: 4, enonce: "Le verbe « prendre » appartient au :", choix: [
        { lettre: "A", texte: "1er groupe" },
        { lettre: "B", texte: "2ème groupe" },
        { lettre: "C", texte: "3ème groupe", correct: true },
      ]},
      { id: 5, enonce: "Le verbe « choisir » appartient au :", choix: [
        { lettre: "A", texte: "1er groupe" },
        { lettre: "B", texte: "2ème groupe", correct: true },
        { lettre: "C", texte: "3ème groupe" },
      ]},
      { id: 6, enonce: "Le verbe « pouvoir » appartient au :", choix: [
        { lettre: "A", texte: "1er groupe" },
        { lettre: "B", texte: "2ème groupe" },
        { lettre: "C", texte: "3ème groupe", correct: true },
      ]},
      { id: 7, enonce: "Quel pourcentage des verbes français appartient au 1er groupe ?", choix: [
        { lettre: "A", texte: "50 %" },
        { lettre: "B", texte: "70 %" },
        { lettre: "C", texte: "90 %", correct: true },
      ]},
      { id: 8, enonce: "Comment reconnaît-on un verbe du 2ème groupe ?", choix: [
        { lettre: "A", texte: "Il se termine en -er" },
        { lettre: "B", texte: "Il se termine en -ir et son participe présent se termine en -issant", correct: true },
        { lettre: "C", texte: "Il se termine en -oir" },
      ]},
      { id: 9, enonce: "Parmi ces verbes, lequel est du 2ème groupe ?\n\nIndice : Réfléchir → réfléchissant. Courir → courant (3ème groupe).", choix: [
        { lettre: "A", texte: "Courir" },
        { lettre: "B", texte: "Réfléchir", correct: true },
        { lettre: "C", texte: "Voir" },
        { lettre: "D", texte: "Mettre" },
      ]},
      { id: 10, enonce: "Les terminaisons au présent du 1er groupe sont :", choix: [
        { lettre: "A", texte: "-is, -is, -it, -issons, -issez, -issent" },
        { lettre: "B", texte: "-e, -es, -e, -ons, -ez, -ent", correct: true },
        { lettre: "C", texte: "-s, -s, -t, -ons, -ez, -ent" },
      ]},
      { id: 11, enonce: "Les terminaisons au présent du 2ème groupe sont :", choix: [
        { lettre: "A", texte: "-e, -es, -e, -ons, -ez, -ent" },
        { lettre: "B", texte: "-is, -is, -it, -issons, -issez, -issent", correct: true },
        { lettre: "C", texte: "-s, -s, -t, -ons, -ez, -ent" },
      ]},
      { id: 17, enonce: "Les verbes « pouvoir », « vouloir », « valoir » prennent au présent (je/tu) :", choix: [
        { lettre: "A", texte: "-s, -s" },
        { lettre: "B", texte: "-x, -x", correct: true },
        { lettre: "C", texte: "-e, -es" },
      ]},
      { id: 18, enonce: "Le verbe « ouvrir » se conjugue au présent comme un verbe du :", choix: [
        { lettre: "A", texte: "1er groupe (-e, -es, -e, -ons, -ez, -ent)", correct: true },
        { lettre: "B", texte: "2ème groupe" },
        { lettre: "C", texte: "3ème groupe classique (-s, -s, -t...)" },
      ]},
      { id: 19, enonce: "Les verbes en -dre (vendre, perdre) prennent quelle terminaison à la 3e pers. du sing. ?", choix: [
        { lettre: "A", texte: "-t (il vend-t)" },
        { lettre: "B", texte: "-d (il vend)", correct: true },
        { lettre: "C", texte: "-e (il vende)" },
      ]},
      // SECTION 2 — ACCORD DU PARTICIPE PASSÉ
      { id: 20, enonce: "Avec l'auxiliaire ÊTRE, le participe passé s'accorde avec :", choix: [
        { lettre: "A", texte: "Le COD" },
        { lettre: "B", texte: "Le sujet", correct: true },
        { lettre: "C", texte: "Le verbe" },
      ]},
      { id: 21, enonce: "Avec l'auxiliaire AVOIR, le participe passé s'accorde avec le COD si celui-ci est :", choix: [
        { lettre: "A", texte: "Placé avant le verbe", correct: true },
        { lettre: "B", texte: "Placé après le verbe" },
        { lettre: "C", texte: "Il ne s'accorde jamais" },
      ]},
      { id: 22, enonce: "Complétez : « Les filles sont parti__ à l'heure. »\n\nIndice : Être + fém. plur. → parties", choix: [
        { lettre: "A", texte: "parti" },
        { lettre: "B", texte: "partis" },
        { lettre: "C", texte: "parties", correct: true },
      ]},
      { id: 23, enonce: "Complétez : « Les fleurs qu'il a cueilli__ étaient belles. »\n\nIndice : Avoir + COD « les fleurs » (fém. plur.) AVANT → cueillies", choix: [
        { lettre: "A", texte: "cueilli" },
        { lettre: "B", texte: "cueillis" },
        { lettre: "C", texte: "cueillies", correct: true },
      ]},
      { id: 24, enonce: "Complétez : « Les filles ont cueilli__ des fleurs. »\n\nIndice : Avoir + COD APRÈS → pas d'accord", choix: [
        { lettre: "A", texte: "cueilli (pas d'accord)", correct: true },
        { lettre: "B", texte: "cueillies" },
      ]},
      { id: 25, enonce: "Complétez : « Ils se sont lavé__ les mains. »\n\nIndice : Pronominal + COD après → pas d'accord", choix: [
        { lettre: "A", texte: "lavé (pas d'accord)", correct: true },
        { lettre: "B", texte: "lavés" },
      ]},
      { id: 26, enonce: "Le participe passé du 1er groupe se termine en :", choix: [
        { lettre: "A", texte: "-é", correct: true },
        { lettre: "B", texte: "-i" },
        { lettre: "C", texte: "-u" },
      ]},
      { id: 27, enonce: "Le participe passé du 2ème groupe se termine en :", choix: [
        { lettre: "A", texte: "-é" },
        { lettre: "B", texte: "-i", correct: true },
        { lettre: "C", texte: "-u" },
      ]},
      { id: 28, enonce: "Participe passé de « mettre » :", choix: [
        { lettre: "A", texte: "mettu" },
        { lettre: "B", texte: "mis", correct: true },
        { lettre: "C", texte: "mettis" },
      ]},
      { id: 29, enonce: "Participe passé de « recevoir » :", choix: [
        { lettre: "A", texte: "recevi" },
        { lettre: "B", texte: "reçu", correct: true },
        { lettre: "C", texte: "recevé" },
      ]},
      { id: 30, enonce: "Complétez : « La cliente est arrivé__ en retard. »\n\nIndice : Être + fém. sing. → arrivée", choix: [
        { lettre: "A", texte: "arrivé" },
        { lettre: "B", texte: "arrivée", correct: true },
      ]},
      { id: 31, enonce: "Complétez : « Les bagages que j'ai pris__ étaient lourds. »\n\nIndice : Avoir + COD « bagages » (masc. plur.) AVANT → pris", choix: [
        { lettre: "A", texte: "pris", correct: true },
        { lettre: "B", texte: "prises" },
      ]},
      { id: 32, enonce: "Parmi ces verbes pronominaux, lesquels sont INVARIABLES ?", choix: [
        { lettre: "A", texte: "Se plaire", correct: true },
        { lettre: "B", texte: "Se laver" },
        { lettre: "C", texte: "Se nuire", correct: true },
        { lettre: "D", texte: "Se mentir", correct: true },
      ]},
      // SECTION 3 — COMPRÉHENSION DE TEXTE
      // TEXTE 1 — Le quotidien d'un chauffeur VTC
      { id: 33, enonce: "TEXTE 1 — Le quotidien d'un chauffeur VTC\n\nM. Dupont est chauffeur VTC à Lyon depuis 5 ans. Chaque matin, il vérifie son véhicule : niveaux, pneus, propreté intérieure et extérieure. Il commence ses courses à 7 h et termine rarement avant 20 h. Sa priorité est la satisfaction du client. Il accueille toujours ses passagers avec le sourire, confirme la destination et propose son aide pour les bagages. Pendant le trajet, il reste discret et ne parle que si le client engage la conversation. À la fin de chaque course, il remercie le client et lui remet sa carte de visite.\n\nDepuis combien de temps M. Dupont est-il chauffeur VTC ?", choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "5 ans", correct: true },
        { lettre: "C", texte: "10 ans" },
      ]},
      { id: 34, enonce: "Que vérifie M. Dupont chaque matin ?", choix: [
        { lettre: "A", texte: "Uniquement les pneus" },
        { lettre: "B", texte: "Les niveaux, pneus, propreté intérieure et extérieure", correct: true },
        { lettre: "C", texte: "Rien, il part directement" },
      ]},
      { id: 35, enonce: "Quelle est la priorité de M. Dupont ?", choix: [
        { lettre: "A", texte: "Gagner le plus d'argent possible" },
        { lettre: "B", texte: "La satisfaction du client", correct: true },
        { lettre: "C", texte: "Finir le plus tôt possible" },
      ]},
      { id: 36, enonce: "Pendant le trajet, M. Dupont :", choix: [
        { lettre: "A", texte: "Parle beaucoup de sa vie personnelle" },
        { lettre: "B", texte: "Reste discret et ne parle que si le client engage la conversation", correct: true },
        { lettre: "C", texte: "Écoute la radio très fort" },
      ]},
      { id: 37, enonce: "Que fait M. Dupont à la fin de chaque course ?", choix: [
        { lettre: "A", texte: "Il part sans rien dire" },
        { lettre: "B", texte: "Il remercie le client et lui remet sa carte de visite", correct: true },
        { lettre: "C", texte: "Il demande un pourboire" },
      ]},
      // TEXTE 2 — Le métier de service
      { id: 38, enonce: "TEXTE 2 — Le métier de service\n\nLe transport de personnes est un métier de service. Le conducteur VTC ou taxi doit posséder des qualités relationnelles : patience, courtoisie, discrétion. Il doit s'adapter à chaque client : un homme d'affaires pressé n'a pas les mêmes attentes qu'un touriste en visite. La ponctualité est essentielle : arriver en avance montre du professionnalisme. Le véhicule doit être irréprochable : propre, climatisé, bien entretenu. Enfin, le conducteur doit respecter le code de la route en toute circonstance, même sous la pression d'un client pressé.\n\nLe transport de personnes est un métier de :", choix: [
        { lettre: "A", texte: "Commerce" },
        { lettre: "B", texte: "Service", correct: true },
        { lettre: "C", texte: "Production" },
      ]},
      { id: 39, enonce: "Quelles qualités relationnelles sont citées dans le texte ?", choix: [
        { lettre: "A", texte: "Rapidité, agressivité, indifférence" },
        { lettre: "B", texte: "Patience, courtoisie, discrétion", correct: true },
        { lettre: "C", texte: "Bavardage, familiarité" },
      ]},
      { id: 40, enonce: "Pourquoi le conducteur doit-il s'adapter à chaque client ?", choix: [
        { lettre: "A", texte: "Car tous les clients sont identiques" },
        { lettre: "B", texte: "Car un homme d'affaires pressé et un touriste n'ont pas les mêmes attentes", correct: true },
      ]},
      { id: 41, enonce: "Que montre la ponctualité du conducteur ?", choix: [
        { lettre: "A", texte: "Qu'il n'a pas beaucoup de clients" },
        { lettre: "B", texte: "Du professionnalisme", correct: true },
      ]},
      { id: 42, enonce: "Si un client pressé demande de rouler plus vite, le conducteur doit :", choix: [
        { lettre: "A", texte: "Accélérer pour satisfaire le client" },
        { lettre: "B", texte: "Respecter le code de la route en toute circonstance", correct: true },
      ]},
      // TEXTE 3 — Une course vers l'aéroport
      { id: 43, enonce: "TEXTE 3 — Une course vers l'aéroport\n\nCe matin, Mme Lefèvre a réservé un VTC pour se rendre à l'aéroport Saint-Exupéry. Le chauffeur, Karim, arrive 10 minutes avant l'heure prévue. Il sort du véhicule, salue la cliente avec un sourire et prend ses deux valises pour les ranger dans le coffre. « Bonjour Madame Lefèvre, je suis Karim, votre chauffeur. Nous allons à l'aéroport, c'est bien cela ? » La cliente confirme et s'installe. Karim lui demande si la température lui convient et si elle souhaite de la musique. Pendant le trajet, Mme Lefèvre reçoit plusieurs appels téléphoniques professionnels. Karim reste silencieux et concentré sur la route. À l'arrivée, il aide la cliente avec ses bagages, lui souhaite un bon vol et lui remet deux cartes de visite : « N'hésitez pas à me recontacter ou à donner ma carte à vos collègues. » Mme Lefèvre le remercie chaleureusement.\n\nOù Mme Lefèvre doit-elle se rendre ?", choix: [
        { lettre: "A", texte: "À la gare Part-Dieu" },
        { lettre: "B", texte: "À l'aéroport Saint-Exupéry", correct: true },
        { lettre: "C", texte: "À son bureau" },
      ]},
      { id: 44, enonce: "Combien de temps avant l'heure prévue Karim arrive-t-il ?", choix: [
        { lettre: "A", texte: "5 minutes" },
        { lettre: "B", texte: "10 minutes", correct: true },
        { lettre: "C", texte: "Pile à l'heure" },
      ]},
      { id: 45, enonce: "Que fait Karim en premier en arrivant ?", choix: [
        { lettre: "A", texte: "Il klaxonne pour prévenir la cliente" },
        { lettre: "B", texte: "Il sort du véhicule, salue la cliente et prend ses valises", correct: true },
        { lettre: "C", texte: "Il reste dans la voiture et attend" },
      ]},
      { id: 46, enonce: "Quelles questions de confort Karim pose-t-il ?", choix: [
        { lettre: "A", texte: "Il demande si la température convient et si elle souhaite de la musique", correct: true },
        { lettre: "B", texte: "Il ne pose aucune question" },
        { lettre: "C", texte: "Il demande combien elle gagne" },
      ]},
      { id: 47, enonce: "Pendant que Mme Lefèvre téléphone, Karim :", choix: [
        { lettre: "A", texte: "Écoute la conversation et fait des commentaires" },
        { lettre: "B", texte: "Reste silencieux et concentré sur la route", correct: true },
        { lettre: "C", texte: "Monte le volume de la radio" },
      ]},
      { id: 48, enonce: "Pourquoi Karim donne-t-il DEUX cartes de visite ?", choix: [
        { lettre: "A", texte: "Parce qu'il s'est trompé" },
        { lettre: "B", texte: "Pour que la cliente puisse en donner une à ses collègues (bouche-à-oreille)", correct: true },
        { lettre: "C", texte: "Parce que c'est obligatoire" },
      ]},
      // TEXTE 4 — Le client mécontent
      { id: 49, enonce: "TEXTE 4 — Le client mécontent\n\nSamedi soir, un client monte dans le taxi de Fatima. Il semble très agacé : « Vous êtes en retard, j'attends depuis dix minutes ! » En réalité, Fatima est arrivée exactement à l'heure convenue, mais le client était sorti cinq minutes plus tôt. Fatima reste calme et répond poliment : « Je suis désolée pour l'attente, Monsieur. Nous allons bien au restaurant Le Bouchon Lyonnais, c'est cela ? » Le client confirme sèchement. Pendant le trajet, il se plaint des embouteillages. Fatima ne se justifie pas et propose une alternative : « Je connais un itinéraire par les petites rues, nous devrions gagner quelques minutes. » Le client accepte. À l'arrivée, il est visiblement plus détendu. « Merci, vous avez bien conduit. » Fatima lui souhaite un bon dîner et lui tend sa carte.\n\nPourquoi le client est-il agacé au départ ?", choix: [
        { lettre: "A", texte: "Parce que Fatima était vraiment en retard" },
        { lettre: "B", texte: "Parce qu'il pense que Fatima est en retard, alors qu'il était sorti trop tôt", correct: true },
        { lettre: "C", texte: "Parce que le véhicule est sale" },
      ]},
      { id: 50, enonce: "Comment Fatima réagit-elle face au reproche du client ?", choix: [
        { lettre: "A", texte: "Elle s'énerve et conteste" },
        { lettre: "B", texte: "Elle reste calme et répond poliment", correct: true },
        { lettre: "C", texte: "Elle ne dit rien et démarre en silence" },
      ]},
      { id: 51, enonce: "Que propose Fatima quand le client se plaint des embouteillages ?", choix: [
        { lettre: "A", texte: "Elle s'excuse et ne fait rien" },
        { lettre: "B", texte: "Elle propose un itinéraire alternatif par les petites rues", correct: true },
        { lettre: "C", texte: "Elle demande au client de se taire" },
      ]},
      { id: 52, enonce: "Comment évolue l'attitude du client pendant la course ?", choix: [
        { lettre: "A", texte: "Il reste agacé du début à la fin" },
        { lettre: "B", texte: "Il se détend progressivement grâce au professionnalisme de Fatima", correct: true },
        { lettre: "C", texte: "Il demande à descendre en route" },
      ]},
      { id: 53, enonce: "Quelle leçon peut-on tirer du texte sur le client mécontent ?", choix: [
        { lettre: "A", texte: "Il faut se justifier face à un client mécontent" },
        { lettre: "B", texte: "Le calme, la politesse et les propositions d'alternatives permettent de désamorcer un conflit", correct: true },
        { lettre: "C", texte: "Il vaut mieux ne pas parler du tout" },
      ]},
      // TEXTE 5 — La réglementation du transport de personnes
      { id: 54, enonce: "TEXTE 5 — La réglementation du transport de personnes\n\nEn France, pour exercer le métier de chauffeur VTC, il faut obtenir une carte professionnelle délivrée par la préfecture. Le candidat doit passer un examen comprenant plusieurs épreuves : réglementation des transports, gestion, sécurité routière, français et anglais. Le véhicule utilisé doit respecter des critères stricts : moins de 6 ans d'ancienneté, 4 portes minimum, et un contrôle technique à jour. Le chauffeur doit également disposer d'une assurance RC professionnelle. Toute infraction à ces règles peut entraîner le retrait de la carte professionnelle et une amende pouvant aller jusqu'à 15 000 euros. La formation continue est obligatoire tous les 5 ans.\n\nQui délivre la carte professionnelle VTC ?", choix: [
        { lettre: "A", texte: "La mairie" },
        { lettre: "B", texte: "La préfecture", correct: true },
        { lettre: "C", texte: "L'auto-école" },
      ]},
      { id: 55, enonce: "Quelles épreuves comprend l'examen VTC selon le texte ?", choix: [
        { lettre: "A", texte: "Uniquement le code de la route" },
        { lettre: "B", texte: "Réglementation, gestion, sécurité routière, français et anglais", correct: true },
        { lettre: "C", texte: "Uniquement la conduite" },
      ]},
      { id: 56, enonce: "Quelle est l'ancienneté maximale du véhicule VTC ?", choix: [
        { lettre: "A", texte: "3 ans" },
        { lettre: "B", texte: "6 ans", correct: true },
        { lettre: "C", texte: "10 ans" },
      ]},
      { id: 57, enonce: "Quelle sanction est prévue en cas d'infraction aux règles du transport VTC ?", choix: [
        { lettre: "A", texte: "Un simple avertissement" },
        { lettre: "B", texte: "Le retrait de la carte professionnelle et une amende jusqu'à 15 000 euros", correct: true },
        { lettre: "C", texte: "Rien de particulier" },
      ]},
      { id: 58, enonce: "Tous les combien la formation continue est-elle obligatoire ?", choix: [
        { lettre: "A", texte: "Tous les 2 ans" },
        { lettre: "B", texte: "Tous les 5 ans", correct: true },
        { lettre: "C", texte: "Tous les 10 ans" },
      ]},
      // TEXTE 6 — Les avantages de l'éco-conduite pour un VTC
      { id: 59, enonce: "TEXTE 6 — Les avantages de l'éco-conduite pour un VTC\n\nL'éco-conduite présente de nombreux avantages pour un chauffeur VTC. En adoptant une conduite souple — accélérations progressives, anticipation du trafic, utilisation du frein moteur — le conducteur peut réduire sa consommation de carburant de 15 à 20 %. Sur une année, cela représente une économie de plusieurs centaines d'euros. Mais l'éco-conduite n'est pas seulement économique : elle est aussi plus confortable pour les passagers. Une conduite sans à-coups, sans freinages brusques, rassure le client et lui offre un trajet agréable. De plus, un véhicule conduit en douceur s'use moins vite : les freins, les pneus et l'embrayage durent plus longtemps. Enfin, l'éco-conduite réduit les émissions de CO2, ce qui est un argument commercial de plus en plus important pour les clients sensibles à l'environnement.\n\nDe combien l'éco-conduite peut-elle réduire la consommation de carburant ?", choix: [
        { lettre: "A", texte: "5 à 10 %" },
        { lettre: "B", texte: "15 à 20 %", correct: true },
        { lettre: "C", texte: "30 à 40 %" },
      ]},
      { id: 60, enonce: "Pourquoi l'éco-conduite est-elle plus confortable pour les passagers ?", choix: [
        { lettre: "A", texte: "Parce qu'elle permet de rouler plus vite" },
        { lettre: "B", texte: "Parce qu'elle est sans à-coups ni freinages brusques", correct: true },
        { lettre: "C", texte: "Parce qu'elle permet de parler au téléphone" },
      ]},
      { id: 61, enonce: "Quelles pièces du véhicule durent plus longtemps grâce à l'éco-conduite ?", choix: [
        { lettre: "A", texte: "Les vitres et les sièges" },
        { lettre: "B", texte: "Les freins, les pneus et l'embrayage", correct: true },
        { lettre: "C", texte: "La radio et le GPS" },
      ]},
      { id: 62, enonce: "Quel argument commercial est de plus en plus important selon le texte ?", choix: [
        { lettre: "A", texte: "La vitesse du trajet" },
        { lettre: "B", texte: "La réduction des émissions de CO2", correct: true },
        { lettre: "C", texte: "Le nombre de passagers transportés" },
      ]},
      { id: 63, enonce: "L'éco-conduite est à la fois :", choix: [
        { lettre: "A", texte: "Économique, confortable, écologique et bonne pour le véhicule", correct: true },
        { lettre: "B", texte: "Dangereuse et lente" },
        { lettre: "C", texte: "Uniquement écologique" },
      ]},
      // TEXTE 7 — Un client étranger à Lyon
      { id: 64, enonce: "TEXTE 7 — Un client étranger à Lyon\n\nM. Tanaka est un homme d'affaires japonais en déplacement à Lyon pour trois jours. Il ne parle pas français mais comprend un peu l'anglais. Son chauffeur VTC, Youssef, l'accueille à la gare Part-Dieu avec une pancarte portant son nom. Youssef lui dit lentement en français : « Bonjour Monsieur Tanaka, bienvenue à Lyon. Je suis votre chauffeur. » Puis il ajoute en anglais simple : « Welcome to Lyon. » M. Tanaka sourit et monte dans le véhicule. Pendant le trajet vers l'hôtel, Youssef conduit en douceur et reste silencieux, voyant que son client consulte des documents sur sa tablette. À l'arrivée à l'hôtel, Youssef aide M. Tanaka avec ses bagages et lui remet une carte de visite en disant : « Si vous avez besoin d'un chauffeur pendant votre séjour, appelez-moi. » M. Tanaka le remercie d'un signe de tête respectueux et prend la carte.\n\nD'où vient M. Tanaka et pourquoi est-il à Lyon ?", choix: [
        { lettre: "A", texte: "Il est américain et en vacances" },
        { lettre: "B", texte: "Il est japonais et en déplacement professionnel pour 3 jours", correct: true },
        { lettre: "C", texte: "Il est lyonnais et rentre chez lui" },
      ]},
      { id: 65, enonce: "Comment Youssef accueille-t-il M. Tanaka à la gare ?", choix: [
        { lettre: "A", texte: "Il attend dans la voiture" },
        { lettre: "B", texte: "Il l'accueille avec une pancarte portant son nom", correct: true },
        { lettre: "C", texte: "Il l'appelle au téléphone" },
      ]},
      { id: 66, enonce: "Comment Youssef adapte-t-il sa communication ?", choix: [
        { lettre: "A", texte: "Il parle très vite en français" },
        { lettre: "B", texte: "Il parle lentement en français puis ajoute quelques mots en anglais", correct: true },
        { lettre: "C", texte: "Il ne dit rien du tout" },
      ]},
      { id: 67, enonce: "Pourquoi Youssef reste-t-il silencieux pendant le trajet ?", choix: [
        { lettre: "A", texte: "Parce qu'il est impoli" },
        { lettre: "B", texte: "Parce qu'il voit que M. Tanaka consulte des documents sur sa tablette", correct: true },
        { lettre: "C", texte: "Parce qu'il ne sait pas conduire et parler en même temps" },
      ]},
      { id: 68, enonce: "Quelle bonne pratique de fidélisation Youssef applique-t-il à la fin ?", choix: [
        { lettre: "A", texte: "Il demande un pourboire" },
        { lettre: "B", texte: "Il remet sa carte de visite et propose ses services pour le séjour", correct: true },
        { lettre: "C", texte: "Il ne fait rien" },
      ]},
      { id: 69, enonce: "Ce texte montre l'importance de (plusieurs réponses possibles) :", choix: [
        { lettre: "A", texte: "S'adapter au client étranger", correct: true },
        { lettre: "B", texte: "Respecter le silence du client quand il est occupé", correct: true },
        { lettre: "C", texte: "Parler fort pour être compris" },
        { lettre: "D", texte: "Proposer ses services pour fidéliser", correct: true },
      ]},
      { id: 70, enonce: "Quel est l'antonyme (contraire) de « monter » ?", choix: [
        { lettre: "A", texte: "Grimper" },
        { lettre: "B", texte: "Descendre", correct: true },
        { lettre: "C", texte: "Avancer" },
      ]},
      { id: 71, enonce: "Quel est l'antonyme de « accepter » ?", choix: [
        { lettre: "A", texte: "Approuver" },
        { lettre: "B", texte: "Refuser", correct: true },
      ]},
      { id: 72, enonce: "Un paradoxe est :", choix: [
        { lettre: "A", texte: "Un mot de sens opposé" },
        { lettre: "B", texte: "Une opinion contraire à l'avis général", correct: true },
        { lettre: "C", texte: "Un synonyme" },
      ]},
      // SECTION 4 — ACCUEILLIR LA CLIENTÈLE
      { id: 73, enonce: "Quelle formule d'accueil est la plus appropriée ?", choix: [
        { lettre: "A", texte: "« Salut, monte ! »" },
        { lettre: "B", texte: "« Bonjour Monsieur, je suis [Prénom], votre chauffeur. »", correct: true },
        { lettre: "C", texte: "« Vous êtes en retard. »" },
      ]},
      { id: 74, enonce: "Combien de temps avant l'heure prévue doit arriver un chauffeur VTC ?", choix: [
        { lettre: "A", texte: "Pile à l'heure" },
        { lettre: "B", texte: "5 minutes avant", correct: true },
        { lettre: "C", texte: "15 minutes après" },
      ]},
      { id: 75, enonce: "Quelle erreur faut-il absolument éviter lors de l'accueil ?", choix: [
        { lettre: "A", texte: "Sourire au client" },
        { lettre: "B", texte: "Tutoyer un client sans y être invité", correct: true },
        { lettre: "C", texte: "Confirmer la destination" },
      ]},
      { id: 76, enonce: "Quels sont les éléments clés d'une bonne première impression ?", choix: [
        { lettre: "A", texte: "Sourire naturel et chaleureux", correct: true },
        { lettre: "B", texte: "Tenue soignée et professionnelle", correct: true },
        { lettre: "C", texte: "Rester dans la voiture sans sortir" },
        { lettre: "D", texte: "Sortir du véhicule et proposer d'aider avec les bagages", correct: true },
      ]},
      { id: 77, enonce: "La règle d'or de la première impression est :", choix: [
        { lettre: "A", texte: "Le client a toujours raison" },
        { lettre: "B", texte: "Vous n'avez qu'une seule chance de faire une bonne première impression", correct: true },
      ]},
      // SECTION 5 — COMPRENDRE LES DEMANDES DES CLIENTS
      { id: 78, enonce: "« Pouvez-vous passer par l'autoroute ? » = demande de :", choix: [
        { lettre: "A", texte: "Tarification" },
        { lettre: "B", texte: "Trajet spécifique", correct: true },
        { lettre: "C", texte: "Confort" },
      ]},
      { id: 79, enonce: "La bonne technique de reformulation est :", choix: [
        { lettre: "A", texte: "« C'est pas mon problème. »" },
        { lettre: "B", texte: "« Si je comprends bien, vous souhaitez… »", correct: true },
      ]},
      { id: 80, enonce: "Face à un client mécontent, le chauffeur doit :", choix: [
        { lettre: "A", texte: "S'énerver à son tour" },
        { lettre: "B", texte: "Rester calme et professionnel", correct: true },
      ]},
      { id: 81, enonce: "L'écoute active signifie :", choix: [
        { lettre: "A", texte: "Écouter la radio activement" },
        { lettre: "B", texte: "Écouter sans interrompre, reformuler et confirmer", correct: true },
      ]},
      { id: 82, enonce: "Si vous ne connaissez pas la réponse à une demande :", choix: [
        { lettre: "A", texte: "Inventer" },
        { lettre: "B", texte: "« Je vais vérifier cela pour vous »", correct: true },
      ]},
      { id: 83, enonce: "La « prise en charge » désigne :", choix: [
        { lettre: "A", texte: "La destination du client" },
        { lettre: "B", texte: "Le lieu où le client est récupéré", correct: true },
      ]},
      { id: 84, enonce: "Un « embouteillage » est aussi appelé :", choix: [
        { lettre: "A", texte: "Un forfait" },
        { lettre: "B", texte: "Un bouchon", correct: true },
      ]},
      // SECTION 6 — INTERROGER SUR LE CONFORT
      { id: 85, enonce: "À quel moment poser les questions de confort ?", choix: [
        { lettre: "A", texte: "À la fin de la course" },
        { lettre: "B", texte: "En début de course", correct: true },
      ]},
      { id: 86, enonce: "Si le client décline une proposition, le chauffeur doit :", choix: [
        { lettre: "A", texte: "Insister" },
        { lettre: "B", texte: "Respecter son choix sans insister", correct: true },
      ]},
      { id: 87, enonce: "Quelle question est appropriée ?", choix: [
        { lettre: "A", texte: "« Vous gagnez combien ? »" },
        { lettre: "B", texte: "« La température vous convient-elle ? »", correct: true },
      ]},
      { id: 88, enonce: "Services à bord pour se différencier :", choix: [
        { lettre: "A", texte: "Eau fraîche", correct: true },
        { lettre: "B", texte: "Chargeurs USB", correct: true },
        { lettre: "C", texte: "Télévision grand écran" },
        { lettre: "D", texte: "Bonbons / mints", correct: true },
      ]},
      { id: 89, enonce: "La bonne pratique pour la climatisation :", choix: [
        { lettre: "A", texte: "Au maximum systématiquement" },
        { lettre: "B", texte: "Anticiper : régler la clim avant que le client monte", correct: true },
      ]},
      { id: 90, enonce: "Pourquoi éviter un désodorisant fort ?", choix: [
        { lettre: "A", texte: "C'est trop cher" },
        { lettre: "B", texte: "Certains clients peuvent être gênés ou allergiques", correct: true },
      ]},
      // SECTION 7 — CONVERSATION NEUTRE ET COURTOISE
      { id: 91, enonce: "Sujets appropriés pendant une course :", choix: [
        { lettre: "A", texte: "La météo", correct: true },
        { lettre: "B", texte: "La politique" },
        { lettre: "C", texte: "Le trafic", correct: true },
        { lettre: "D", texte: "La religion" },
        { lettre: "E", texte: "Les événements locaux", correct: true },
      ]},
      { id: 92, enonce: "Faut-il tutoyer un client jeune ou décontracté ?", choix: [
        { lettre: "A", texte: "Oui" },
        { lettre: "B", texte: "Non, vouvoyer systématiquement", correct: true },
      ]},
      { id: 93, enonce: "Si le client ne parle pas, le chauffeur doit :", choix: [
        { lettre: "A", texte: "Forcer la conversation" },
        { lettre: "B", texte: "Respecter le silence du client", correct: true },
      ]},
      { id: 94, enonce: "Avec un client étranger :", choix: [
        { lettre: "A", texte: "Parler plus fort" },
        { lettre: "B", texte: "Parler lentement et clairement, éviter l'argot", correct: true },
      ]},
      { id: 95, enonce: "Le chauffeur doit-il donner son avis personnel ?", choix: [
        { lettre: "A", texte: "Oui, toujours" },
        { lettre: "B", texte: "Non, sauf si le client le demande. Rester neutre.", correct: true },
      ]},
      { id: 96, enonce: "Comportements à ÉVITER :", choix: [
        { lettre: "A", texte: "Se plaindre de sa vie personnelle", correct: true },
        { lettre: "B", texte: "Critiquer d'autres clients ou chauffeurs", correct: true },
        { lettre: "C", texte: "Commenter l'apparence du client", correct: true },
        { lettre: "D", texte: "Rester positif et agréable" },
      ]},
      // SECTION 8 — PRENDRE CONGÉ DES CLIENTS
      { id: 97, enonce: "Formule de départ la plus professionnelle :", choix: [
        { lettre: "A", texte: "« Allez, salut ! »" },
        { lettre: "B", texte: "« Merci d'avoir fait appel à nos services. Excellente journée. »", correct: true },
      ]},
      { id: 98, enonce: "Gestes de fin de course recommandés :", choix: [
        { lettre: "A", texte: "Sortir du véhicule et ouvrir la porte", correct: true },
        { lettre: "B", texte: "Aider avec les bagages", correct: true },
        { lettre: "C", texte: "Vérifier les oublis", correct: true },
        { lettre: "D", texte: "Partir le plus vite possible" },
        { lettre: "E", texte: "Remettre sa carte de visite", correct: true },
      ]},
      { id: 99, enonce: "Pourquoi donner PLUSIEURS cartes de visite ?", choix: [
        { lettre: "A", texte: "Pour qu'il les jette" },
        { lettre: "B", texte: "Pour le bouche-à-oreille (le client en donne à son entourage)", correct: true },
      ]},
      { id: 100, enonce: "Client satisfait = combien de personnes informées ?", choix: [
        { lettre: "A", texte: "2", correct: true },
        { lettre: "B", texte: "10" },
      ]},
      { id: 101, enonce: "Client insatisfait = combien de personnes informées ?", choix: [
        { lettre: "A", texte: "2" },
        { lettre: "B", texte: "10", correct: true },
      ]},
      { id: 102, enonce: "Bon moyen de fidélisation :", choix: [
        { lettre: "A", texte: "Ne rien faire" },
        { lettre: "B", texte: "Proposer une réduction fidélité pour la prochaine course", correct: true },
      ]},
      { id: 103, enonce: "La fin de course est :", choix: [
        { lettre: "A", texte: "La fin de la relation avec le client" },
        { lettre: "B", texte: "Le début de la fidélisation", correct: true },
      ]},
    ],
  },
];
