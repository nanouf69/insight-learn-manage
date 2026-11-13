# Rappel modules J+1 après examen théorique — diagnostic et préparation

## État au 13 novembre 2026

Audit effectué en lecture seule sur la base réelle partagée entre aperçu et production. Aucune fonction d'envoi appelée, aucun dossier modifié, aucune programmation installée, aucune réservation bloquée, rien publié. Cette livraison contient un diagnostic et un plan, pas une automatisation opérationnelle.

## Constats vérifiés

### Dates et preuve du passage

- Source centrale : `apprenants.date_examen_theorique`, texte et non date SQL. La procédure `decaler_examen_theorique` la change et conserve l'historique dans `examen_theorique_decalages`.
- Sur 349 dossiers non supprimés de types stricts `vtc`, `vtc-e`, `taxi`, `taxi-e` : 301 ont une valeur, aucune au format ISO ou JJ/MM/AAAA ; 298 sont des libellés de dates françaises et 3 portent `pas_encore_choisi`. Les types hybrides ne sont pas inclus dans ces chiffres.
- Répartition des résultats : 126 `oui`, 37 `non`, 26 `absent`, 9 `annule`, 6 `reporte`, 145 sans résultat.
- La date centrale est une date d'inscription prévue, pas à elle seule une preuve de participation réelle. Le résultat peut être saisi manuellement et n'apporte pas un horodatage de passage à J+1. La date d'envoi de copie ne doit jamais servir de référence.
- Il faut une preuve de passage rattachée au dossier et à cette occurrence d'examen (preuve CMA ou confirmation administrative auditée). Sans preuve disponible à J+1 : signalement administratif, aucun envoi présumé. Les imports/documents CMA et leur association nominative restent à examiner avant implémentation ; leur capacité à fournir cette preuve n'est pas établie par cet audit.

### Déclencheurs existants

- Le catalogue réel `cron.job` ne contient aucun rappel modules J+1 après examen théorique. Aucun marqueur `rappel_modules_j1_theorique:%` dans `emails`.
- `relance-non-connexion-jour1` concerne J+1 après l'envoi des accès, pas après l'examen.
- `relance-examens-proches` concerne l'approche de l'examen, pas son lendemain.
- `relance-modules-a-terminer` tourne quotidiennement et applique une fenêtre anti-relance de trois jours, avec heures requises atteintes et modules restants ; il exclut les réussis. Il ne répond pas à la présente demande.
- `auto-send-pratique-booking` existe dans le code mais son ancien job n'est pas dans le catalogue actif. Il sélectionne les candidats admis ayant terminé le module pratique 6/8 (option historique `ignoreModule`) ; ce n'est ni J+1 ni un contrôle de tous les modules. Ne pas le réactiver.
- Seuls les noms, cadences et états des jobs ont été lus : aucun job n'a été exécuté manuellement. Cet audit ne prouve pas à lui seul la conformité du code déployé de chaque ancienne fonction.

### Modules et réservation

- Source des attributions : `modules_autorises`, à rapprocher du programme du dossier et des dispenses existantes. Source de progression commune : `etat_completion_modules` (statut effectif, date, preuves), sans recalculer les notes ni rouvrir les modules achevés.
- Les modules pratiques physiques 6/8 ne doivent pas devenir un préalable circulaire à la réservation de leur propre séance. Les activités réellement obligatoires en ligne dans ces modules doivent être distinguées de la présence pratique.
- `ReservationPratique.tsx` et `confirm-reservation-pratique` ne contrôlent pas l'achèvement de tous les modules avant réservation. La fonction contrôle notamment la capacité journalière.
- Les trois déclencheurs réels de `reservations_pratique` concernent capacité, feuilles et inscription à la session ; aucun n'impose tous les modules. La fonction de capacité réelle a été lue : aucun contrôle de progression.
- Les politiques réelles autorisent la gestion admin et les lectures des dossiers liés ; pas d'écriture directe élève. Le portail utilise néanmoins une fonction privilégiée acceptant un identifiant de dossier : le contrôle d'identité et du lien doit être renforcé avant d'y greffer une nouvelle règle. Aucun appel de réservation n'a été effectué, car il modifierait les dossiers et peut expédier un mail.
- Le code historique de modification de réservation contient une suppression de rattachement à l'ancienne session. Cette voie n'a pas été utilisée ; le nouveau lot ne doit ni la déclencher ni s'en servir pour migrer des réservations.

## Décision de périmètre

L'ancienne règle permet la réservation sans module pratique préalable. La demande actuelle envisage un nouveau préalable de tous les modules obligatoires en ligne, mais exige une confirmation distincte avant activation. Le plan prépare ce changement sans remplacer aujourd'hui la règle existante. Le mail contenant cette affirmation ne doit pas être activé tant que le préalable n'est pas effectivement en vigueur et compatible avec les contrats ; sinon il annoncerait un blocage inexistant.

## Contenu demandé, conservé sans envoi

> Bonjour,
>
> À la suite de votre examen théorique, nous vous rappelons qu'il est nécessaire de terminer l'ensemble des modules obligatoires de votre formation sur notre plateforme e-learning.
>
> Nous vous invitons à vérifier votre progression et à finaliser les modules encore en attente.
>
> La réservation d'une date d'entraînement pratique sera accessible uniquement après validation de l'ensemble des modules obligatoires.
>
> Si vous avez déjà terminé tous vos modules, aucune action supplémentaire n'est nécessaire.
>
> En cas de difficulté technique ou de problème de validation, merci de contacter notre centre de formation.
>
> Cordialement,
> L'équipe Ftransport

Le transport existant ajoutera la signature commune sans doublon et l'accusé explicite par message. Aucun lien de réservation, donnée d'examen, réponse ou note dans ce rappel.

## Acceptation à vérifier avant activation

- J+1 calendaire Europe/Paris de la date réelle confirmée ; heure proposée : 10 h Paris, non encore validée. Tester week-end, changement de mois/année et heure d'été/hiver.
- Types VTC/TAXI avec parcours en ligne attribué, hybride inclus après classification ; FC, TA, VA, pratique seule exclus sauf autre instruction.
- Absents, annulés, reportés, date inconnue et passage non prouvé exclus. Un échec théorique prouvé ne signifie pas une absence.
- Un rappel par dossier + identifiant immuable du passage + version du modèle. Deux passages différents ne sont pas fusionnés ; deux imports du même passage ne créent pas deux envois.
- Envoi atomiquement réservé, résultat accepté/remis/rejet/ouvert/confirmé distingué ; délai réseau inconnu = à vérifier, jamais un renvoi aveugle.
- Pas de rattrapage automatique d'anciens examens à l'activation. Preuve tardive au-delà de J+1 : décision administrative, pas d'envoi automatiquement décalé.
- Comptes techniques, désinscrits/archivés, adresses bloquées, attestation déjà envoyée et accès terminés exclus ; erreur de lecture = aucune expédition. Aucun prolongement automatique d'accès.
- Modules tous terminés : rappel unique conservé selon le texte demandé, pas de relance répétée. Une erreur de progression n'est pas une preuve de module manquant.
- Contrats CPF et réservations existants inchangés. Le nouveau préalable nécessite périmètre d'application explicite et vérification contractuelle, sans sanction CPF ni ajout d'obligation rétroactive.
- Exception admin nominative et limitée à une réservation/période en cas de bug : journal d'auteur/date/justification, sans fabriquer de module terminé ou de présence.
- Tests avec données fictives : doublons et concurrence, report, plusieurs dossiers, modules facultatifs, pratique physique, lecture en panne, issue d'envoi inconnue, dérogation admin, liens directs, PC/mobile.

## Limites et dépendances

Les tests fonctionnels authentifiés, le transport réel, les contrats individuels et la preuve automatique de passage CMA ne sont pas encore vérifiés pour ce nouveau lot. Les travaux serveur éventuels restent soumis à sauvegarde et restauration indépendante vérifiées. Le diagnostic ne constitue ni avis juridique ni preuve d'autorisation contractuelle d'un nouveau blocage.