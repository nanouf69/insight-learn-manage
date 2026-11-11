# Détail des premières réponses — 11/11/2026

## Identification et limites
Composant : QuestionFirstPassageRate, fourni par FirstPassageProvider dans ExamensBlancsEditor (AdminExamQuestionCard pour le panneau) et les exercices de ModuleDetailView.
La capture décrite ne donne ni examen ni matière ni énoncé. Position 8 n'est pas une identité : plusieurs examens/matières ont une huitième question. Les 9/9 et 17/17 ne sont donc pas attribués arbitrairement à une question. Aucun recalcul nominatif de ces deux taux n'est déclaré prouvé.

## Contrôle réel SELECT et lecteur applicatif administrateur
Question choisie explicitement pour la vérification, PAS identifiée comme celle de la capture : EB1 / Gestion / gestion:8, « Les montants figurant dans le compte de résultat sont : ». Corrigé figé A = HT (B TTC, C BIC), barème 1. Périmètre partagé préexistant EB1 + EB1-TAXI, une première observation par candidat dans chaque session active ; TA n'est pas transformé en TAXI. Dates Europe/Paris inclusives et inscriptions effectives/liste d'attente conservées.

| Session | Éligibles | Erreurs / évaluées | Taux arrondi | Non évaluées hors taux | Lignes détail |
|---|---:|---:|---:|---:|---:|
| TAXI et TA 26/10–16/11 journée |12|2/6|33 %|1|7|
| VTC et TAXI 02/11–13/11 journée |16|8/14|57 %|2|16|
| VTC 02/11–13/11 soir |18|10/18|56 %|0|18|

Ces taux sont identiques avant/après sur cette question. Les éligibles sans réponse ne composent pas le dénominateur. Les inscriptions croisées peuvent afficher un candidat dans chacune de ses sessions, sans addition des taux. Détail réel rendu sous compte administrateur : 14 observations évaluées + 2 exclues = 16 lignes sur la session journée, clic vérifié sans écriture. Le lecteur original et le composant réel ont été montés dans un hôte de contrôle navigateur ; la navigation complète vers la carte de l'éditeur n'a pas été rejouée.

## Défauts et correctif ciblé
Le calcul QCM natif acceptait une première révision même lorsque la tentative était `en_cours`. SELECT réel confirme deux tentatives de sessions actives avec premier événement : EB1 Gestion et eb6-ta Réglementation TAXI. Le nombre de questions/taux touchés n'est pas extrapolé à partir de ces deux tentatives. Le calcul exige désormais une remise terminée datée et un événement antérieur à la remise ; ces réponses sont séparées hors taux. Tentative explicitement supérieure à 1 exclue comme premier essai, aucun résultat renoté.
Les miroirs complets utilisent la preuve partagée stricte identité/contenu/réponses/tentative un-à-un ; une simple égalité heure + réponse QRC ne supprime plus une source. Un miroir incomplet reste non prouvé, pas fusionné.

## Formule et détail
Erreur = incorrect / total évalué, arrondi à l'entier. QCM : ensemble exact des bonnes lettres, ordre indifférent, lettres inconnues/dupliquées non prouvées. QRC : copie soumise et note validée sur son barème figé ; totalité des points = réussite statistique, partielle/zéro = erreur ; attente hors total. Le corrigé actuel n'est jamais substitué au corrigé figé. Les événements d'entraînement et modules ne sont pas mélangés aux EB.
Chaque ligne ouvre un détail intégré (aucun portail/confirmation native) dont les observations viennent du calcul même : candidat, réponse, attendu figé, verdict, date Paris, identité du passage, examen/matière, version, tentative si consignée. Filtre erreurs facultatif ne change pas le total. Réponses non évaluées et raisons séparées. Aucun nouveau SELECT approximatif au clic. Anciennes preuves insuffisantes restent visibles comme telles ; numéro de tentative ou version manquants ne sont pas inventés.

## Droits et vérifications
`has_role(admin)` avant lectures existantes ; vérification du même compte après lecture. Policies réelles SELECT vérifiées sur tentatives, états, événements, QRC et journal : propriétaire ou admin ; détails réutilisent uniquement les preuves déjà autorisées, aucun élargissement/RPC/migration/droit modifié.
87 tests PASS : statistiques modules/examens/TA, panel détail et couleur ; doublon, tentative suivante, QRC en attente, absence réponse, première révision/provenance, QCM multiple et total du détail.
Chromium fictif 1280×1800 et 390×844 : clic ligne, toutes observations, filtre erreurs, fermeture ; document.fullscreenElement présent avant/pendant/après, console sans erreur. Contraste/défilement de l'hôte fullscreen contrôlés. Build harness OK.
Aucune réponse/note/contenu/source réelle modifiée ; aucun reset, mail, IA, migration production ou publication.
