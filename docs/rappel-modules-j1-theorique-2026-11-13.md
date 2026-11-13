# Rappel modules J+1 après examen théorique — diagnostic et préparation

## Rectification finale — 23:11 UTC (prime sur les versions ci-dessous)

J−7/J+1/J+3/J+5 : modèle ferme inchangé, réserve contractuelle sur « impossibilité de passer à pratique » maintenue. Dès J+7/J+9/J+11 : **modèle obligations de formation**, remplaçant le rappel neutre. Objet exact : « IMPORTANT – Modules de formation non terminés : rappel de vos obligations ».

Texte utilisateur intégré avec variantes : CPF seul → conséquences possibles CPF uniquement ; engagements de formation France Travail seuls → conséquences France Travail uniquement ; les deux → formulation combinée demandée ; ni l'un ni l'autre → aucune mention des financeurs/sanctions. Information non vérifiée → décision à vérifier, pas d'envoi. Une précision évite toute assimilation du simple retard à une sanction automatique ; seuls les organismes compétents décident après examen de la situation.

Audit agrégé réel : 277 dossiers CPF, dont 8 marqués inscrits France Travail ; 67 personnels, dont 1 inscrit France Travail ; 5 organismes. Le booléen d'inscription France Travail ne prouve PAS les engagements concernant cette formation. Ces chiffres ne sont pas une liste de destinataires autorisés.

**63 tests isolés exécutés avec succès** (56 calendrier/progression/priorité + 7 conditions financement). Modèles et décisions sont préparés, non raccordés aux envois ou réservations. Dates/preuves et progression sont encore injectées dans les tests, pas lues via un circuit opérationnel. Le contrôle de financement vérifié doit être relié aux preuves du dossier avant activation.

**Production : aucun changement pour ce lot. Aucun email réel, aucune campagne, aucune activation, aucune publication, aucune sanction ou restriction de réservation.** Restent à valider/réaliser les preuves CMA et contrats, adaptateurs canoniques/financements, journal atomique, file admin/exception, tests authentifiés et accord d'activation. Les textes proposés ci-dessous datant de 23:06/22:59 sont supersédés par cette section.

## Mise à jour prioritaire — 23:06 UTC (remplace le calendrier et le texte de 22:59 ci-dessous)

- **FERME** : J−7 selon date prévue confirmée ; J+1/J+3/J+5 selon date réelle prouvée. Deux passages rouges et gras préparés : impossibilité de passer à pratique et non-priorité. Copie proposée, jamais envoyée.
- **NORMAL** : dès J+7 puis J+9/J+11… jusqu'à achèvement, sans rouge ni menace, simple invitation à terminer les modules hors pratique.
- **Incohérence bloquante pour activation** : l'impossibilité de passer à pratique n'est pas une règle effective vérifiée ; le modèle ferme porte explicitement cette réserve. Validation contractuelle et règle effective, ou reformulation autorisée, nécessaires avant tout envoi. Aucun blocage dur de réservation créé.
- Dates prévues annulées/reportées ignorées, nouvelle occurrence confirmée évaluée séparément ; après examen, date réelle seule. Aucun rattrapage d'échéance manquée ou massif des anciens dossiers.
- Modules/dispenses/exclusions/arrêt et priorité non destructive conservés. Les modèles sont dans `modelesRappelTheorique.ts`, le calendrier isolé dans `rappelTheoriquePriorite.ts` ; aucun import par un circuit actif.
- **56 tests exécutés avec succès** après cette mise à jour : J−7/report/annulation, J+1/3/5 ferme, J+7/9/11 normal, arrêt aux complets, calendrier Paris et protections précédentes. Ce sont des tests isolés, pas un envoi ni un test authentifié du circuit déployé.
- Reste à réaliser : preuve datée CMA/admin, adaptateur canonique complet, journal atomique et concurrence, file admin/exception auditée, vérification contractuelle, branchement et tests bout-en-bout. Activation et publication non autorisées ; aucun mail réel expédié.

## État au 13 novembre 2026

Audit effectué en lecture seule sur la base réelle partagée entre aperçu et production. Aucune fonction d'envoi appelée, aucun dossier modifié, aucune programmation installée, aucune réservation bloquée, rien publié. Mise à jour utilisateur 22:59 intégrée : projection pure isolée implémentée et 40 tests Vitest exécutés avec succès ; pas encore d'automatisation opérationnelle.

## Constats vérifiés

### Dates et preuve du passage

- Source centrale : `apprenants.date_examen_theorique`, texte et non date SQL. La procédure `decaler_examen_theorique` la change et conserve l'historique dans `examen_theorique_decalages`.
- Sur 349 dossiers non supprimés de types stricts `vtc`, `vtc-e`, `taxi`, `taxi-e` : 301 ont une valeur, aucune au format ISO ou JJ/MM/AAAA ; 298 sont des libellés de dates françaises et 3 portent `pas_encore_choisi`. Les types hybrides ne sont pas inclus dans ces chiffres.
- Répartition des résultats : 126 `oui`, 37 `non`, 26 `absent`, 9 `annule`, 6 `reporte`, 145 sans résultat.
- La date centrale est une date d'inscription prévue, pas à elle seule une preuve de participation réelle. Le résultat peut être saisi manuellement et n'apporte pas un horodatage de passage à J+1. La date d'envoi de copie ne doit jamais servir de référence.
- Il faut une preuve de passage rattachée au dossier et à cette occurrence d'examen (preuve CMA ou confirmation administrative auditée). Sans preuve : signalement administratif, aucun envoi présumé. `parse-exam-results` extrait noms/dossier/résultat et ne stocke pas de date réelle de passage vérifiée ; il ne fournit donc pas la preuve nécessaire. Les tables `cma_planning_lignes`/`cma_planning_attente` stockent dates de planning, fichier et rapprochement, pas preuve de présence à l'examen. Adaptateur de preuve datée encore requis.

### Déclencheurs existants

- Le catalogue réel `cron.job` ne contient aucun rappel modules J+1 après examen théorique. Aucun marqueur `rappel_modules_j1_theorique:%` dans `emails`.
- `relance-non-connexion-jour1` concerne J+1 après l'envoi des accès, pas après l'examen.
- `relance-examens-proches` concerne l'approche de l'examen, pas son lendemain.
- `relance-modules-a-terminer` tourne quotidiennement et applique une fenêtre anti-relance de trois jours, avec heures requises atteintes et modules restants ; il exclut les réussis. Il ne répond pas à la présente demande.
- `auto-send-pratique-booking` existe dans le code mais son ancien job n'est pas dans le catalogue actif. Il sélectionne les candidats admis ayant terminé le module pratique 6/8 (option historique `ignoreModule`) ; ce n'est ni J+1 ni un contrôle de tous les modules. Ne pas le réactiver.
- Seuls les noms, cadences et états des jobs ont été lus : aucun job n'a été exécuté manuellement. Cet audit ne prouve pas à lui seul la conformité du code déployé de chaque ancienne fonction.

### Modules et réservation

- Source des attributions : `modules_autorises`, à rapprocher du programme du dossier et des dispenses existantes. Source de progression commune : `etat_completion_modules` (statut effectif, date, preuves), sans recalculer les notes ni rouvrir les modules achevés.
- Pour CE rappel et CE classement, toute la partie pratique/entraînement est exclue, y compris les activités pratiques en ligne des modules 6/8. Les obligations des autres usages de progression restent inchangées.
- `ReservationPratique.tsx` et `confirm-reservation-pratique` ne contrôlent pas l'achèvement de tous les modules avant réservation. La fonction contrôle notamment la capacité journalière.
- Les trois déclencheurs réels de `reservations_pratique` concernent capacité, feuilles et inscription à la session ; aucun n'impose tous les modules. La fonction de capacité réelle a été lue : aucun contrôle de progression.
- Les politiques réelles autorisent la gestion admin et les lectures des dossiers liés ; pas d'écriture directe élève. Le portail utilise néanmoins une fonction privilégiée acceptant un identifiant de dossier : point de sécurité existant à traiter séparément. Aucun appel de réservation n'a été effectué, car il modifierait les dossiers et peut expédier un mail. Aucun contrôle dur de modules ne sera ajouté.
- Le code historique de modification de réservation contient une suppression de rattachement à l'ancienne session. Cette voie n'a pas été utilisée ; le nouveau lot ne doit ni la déclencher ni s'en servir pour migrer des réservations.

## Décision de périmètre

La mise à jour impérative de 22:59 remplace le plan précédent : priorité aux candidats ayant terminé les modules obligatoires non pratiques, sans interdiction de réserver pour les autres. Rappels uniquement aux incomplets à J+1/J+3/J+5… ; arrêt dès complétion. Le nouveau texte ne doit pas être envoyé avant que la priorité annoncée soit réellement applicable et compatible avec les contrats. Pas de campagne activée ni de publication.

## Contenu demandé, conservé sans envoi

> Bonjour,
>
> À la suite de votre examen théorique, nous vous invitons à terminer l'ensemble des modules de votre formation sur notre plateforme e-learning, à l'exception de la partie pratique.
>
> Les candidats ayant terminé l'ensemble de leurs modules seront prioritaires pour le choix d'une date d'entraînement pratique.
>
> Si vos modules ne sont pas encore terminés, vous ne serez donc pas prioritaire dans l'attribution des créneaux disponibles.
>
> Nous vous invitons à finaliser votre parcours dès que possible afin de bénéficier de cette priorité.
>
> En cas de difficulté technique ou de problème de validation d'un module, merci de contacter notre centre de formation.
>
> Cordialement,
> L'équipe Ftransport

Objet exact : « Rappel important – Finalisez vos modules pour votre entraînement pratique ». Texte/objet conservés dans `supabase/functions/_shared/rappelTheoriquePriorite.ts`. Le futur transport devra ajouter la signature commune sans doublon et l'accusé explicite par message. Aucun lien de réservation, donnée d'examen, réponse ou note dans ce rappel.

## Acceptation à vérifier avant activation

- J+1 calendaire Europe/Paris de la date réelle confirmée ; heure proposée : 10 h Paris, non encore validée. Tester week-end, changement de mois/année et heure d'été/hiver.
- Types VTC/TAXI avec parcours en ligne attribué, hybride inclus après classification ; FC, TA, VA, pratique seule exclus sauf autre instruction.
- Absents, annulés, reportés, date inconnue et passage non prouvé exclus. Un échec théorique prouvé ne signifie pas une absence.
- Un rappel par dossier + identifiant immuable du passage + échéance calendaire + version du modèle. Deux passages différents ne sont pas fusionnés ; deux imports du même passage ne créent pas deux envois.
- Envoi atomiquement réservé, résultat accepté/remis/rejet/ouvert/confirmé distingué ; délai réseau inconnu = à vérifier, jamais un renvoi aveugle.
- Pas de rattrapage automatique d'anciens examens à l'activation : borne explicite sur date réelle de passage. Une échéance manquée n'est pas rattrapée ; seules les échéances J+1/J+3/J+5 suivantes sont préparées si la preuve existe et les modules restent incomplets.
- Comptes techniques, désinscrits/archivés, adresses bloquées, attestation déjà envoyée et accès terminés exclus ; erreur de lecture = aucune expédition. Aucun prolongement automatique d'accès.
- Modules non pratiques tous terminés : aucun mail, arrêt de la séquence, échéances futures neutralisées sans effacer le journal. Une erreur de progression n'est pas une preuve de module manquant.
- Contrats CPF et réservations existants inchangés. Priorité indicative uniquement, sans sanction CPF ni ajout d'obligation rétroactive. Les incomplets restent dans la file, jamais refusés par ce lot.
- Exception admin nominative et limitée à une réservation/période en cas de bug : journal d'auteur/date/justification, sans fabriquer de module terminé ou de présence.
- Tests avec données fictives : doublons et concurrence, report, plusieurs dossiers, modules facultatifs, pratique physique, lecture en panne, issue d'envoi inconnue, dérogation admin, liens directs, PC/mobile.

## Limites et dépendances

Implémenté isolément : décision pure J+1/J+3/J+5, clé stable par échéance, exclusions, lecture fraîche injectée et classement indicatif (réservations préservées, ordre contractuel, exception admin). **40 tests Vitest réussis**, couvrant VTC/TAXI, calendrier Paris/hiver/été/mois/année, complets/pratique/facultatifs/dispenses, erreurs, identité, doublons de projection, arrêt après relecture et priorité non destructive.

Non implémenté en production : preuve datée CMA/admin, adaptateur complet obligations/dispenses/activités canoniques, verrou atomique concurrent et journal d'envoi, annulation des échéances futures, file admin affichée, exception auditée persistée et transport. La clé pure ne constitue PAS un verrou contre deux envois concurrents. Aucun module isolé n'est importé par une fonction active ni par la réservation.

Les tests authentifiés, l'envoi, l'allocation réelle des places, les contrats individuels et le branchement bout-en-bout ne sont pas prouvés. Aucun avis juridique n'est fourni. Activation attend tests complets et confirmation ; travaux serveur à risque soumis à restauration indépendante vérifiée. Une vérification quotidienne à heure Paris est proposée pour servir les échéances un jour sur deux, aucun job créé ; l'heure et la fenêtre de livraison doivent être validées avant activation.