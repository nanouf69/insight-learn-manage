# Qualiopi 19 — audit ciblé FTRANSPORT SERVICES PRO

## Enregistrement vérifié
- Avant : zéro référence, aucun état 19.
- Après : **10 références actives**, six nouvelles fiches et quatre fiches réutilisées (plateforme, cours/quiz VTC, cours/quiz TAXI, réponse pédagogique).
- État **À compléter**, applicable, vérifié le **19/11/2026** ; base et interface connectée relues. Aucun Conforme forcé.
- Zéro doublon de lien ; aucun fichier joint ou source modifiée.

## RNQ effectivement lu
Décret 2026-728, applicable 01/11/2026, critère 4 indicateur 19 p.7 : ressources et appropriation, vérification effective du suivi distant, référent pédagogique par formation au-delà du seuil fixé par arrêté. Source https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509 ; PDF relu, SHA256 `f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783`.

Guide V10 p.26 lu et OCR : ressources cohérentes/disponibles, appropriation facilitée ; assistance technique/pédagogique FOAD. Copie secondaire précédemment téléchargée SHA256 `835ca0ff8310dc5ebf47bdcec955d24187af3662ae71a0feee6bbae0558becf5`, authenticité auprès ministère non certifiée. Arrêté 28/10/2026 identifié https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000055041105 : seuil « plus de huit » trouvé dans sources secondaires, pas directement dans le texte officiel détaillé ; vérification de condition restant non concluante. Trois formateurs au catalogue/agenda, un ou deux par libellé : pas liste exhaustive par formation/session. Libellé actuel interface 19 ancien/incomplet, complément exact enregistré dans preuves/remarques, code inchangé.

## Mails, usages et données
Périmètre ciblé : objets accès/identifiants/activation, type `sent`, `sent_at` renseigné, dossier actif : **378 envois, 291 dossiers** ; **369** corps avec lien/portail/instructions/contact, **9 incomplets** à inspecter sans les assimiler à un défaut réel d'accès ; aucune variable non résolue détectée. **225 dossiers** ont au moins une activité pédagogique après envoi : corrélation datée, pas réception ni causalité.

Catalogue d'objets plus large (accès/connexion/cours) : 7002 sent, 195 received ; inclut relances. Journal ciblé distinct `email_accuses` : 145 traces dont 19 seulement envoyées et 126 indices techniques d'ouverture, **0 remise provider**. Populations non additionnables. Modèle préparé ≠ envoi, pixel ouverture ≠ réception confirmée.

Exemple A anonymisé, VTC e-learning sans session présentielle : mail accès du 26/06/2026 06:00 UTC, HTML 3233 caractères réellement inspecté sans divulguer identifiants/liens. Ouverture cours du 15/11/2026 ; 81 lignes quiz du même compte authentifié et sept statuts completed datés. Les 81 lignes ne sont pas 81 tentatives uniques, agrégats/mirrors possibles. Une réponse pédagogique effective du 06/07/2026 porte sur progression/validation des modules. Catalogue assistance : **21 questions, 10 réponses datées, 11 ouvertes**, sans audit de chaque délai.

Catalogue ressources serveur : module 2 VTC **15 cours / 15 exercices-quiz** ; module 10 TAXI **18 cours / 19 exercices-quiz** ; module 13 Contrôle TAXI **1 cours / 5 quiz**. Catalogue résultats brut **7740 lignes / 216 dossiers** ; complétions **1657 lignes / 297 dossiers**, dont **1406 completed datés**. Comprend historiques/techniques : pas autant de réussites certifiées.

## Suivi réellement observé
CRM du dossier A : Jalons et Contrôle, puis Vue apprenant intégrée, sous admin avec requêtes mutantes bloquées :
- **62h47** réalisées pour cible **60h**, concordantes CRM/vue apprenant.
- **5/7 modules réalisés**, 71 % ; jalons pondérés **90,4 %**.
- Première activité affichée 26/06, dernière 16/11/2026.
- CPF **66h** et couverture **59h39** explicitement **prévisionnels**, pas heures effectuées.
- Pondération provisoire signalée : pages modules 2/5 non recomptées depuis changement des supports.
- Modules, quiz et possibilité Revoir réellement visibles. Vue admin intégrée n'est pas un test de connexion sous identité élève ; usage passé prouvé séparément en base.

Code lu : `elearningHoursEvidence.ts` (intervalles avec activité, bornes formation, exclusion pratique/accueil), `moduleCompletionEvidence.ts` (preuves serveur), `progressionModulesEleve.ts`, `affichageJalons.ts` (pondérations indicatives), hooks CRM, canal `ApprenantChatWidget`. Aucune attention continue ni durée par module déduite des connexions. Statuts historiques/relevés figés inchangés.

## Limites empêchant la conclusion globale
1. Vérification effective de l'accès sous une session propre élève non exécutée : Vue apprenant admin et traces historiques seulement.
2. Assistance pédagogique exécutée prouvée ; assistance technique concrètement traitée et modalités FOAD à corroborer.
3. Seuil réglementaire et liste exhaustive des intervenants par formation à établir pour la condition de référent ; agenda seul ne suffit pas à conclure.

Neuf corps accès incomplets et pondération provisoire sont réserves de l'échantillon/métriques, pas déclaration d'absence d'accès ni de suivi, pas modification de notes.

## Contrôles exécutés
- PASS : six fiches, dix liens, état À compléter/date ; relectures SQL.
- PASS : zéro doublon ; interface Qualiopi ligne 19 et fiche avec Nos preuves (10).
- PASS : cinq empreintes sources identiques avant/après : emails 15970 `127c30f28e3da5f9a344459428e1fd6a` ; modules 62 `88f1007fe6718990591a71820096bdbc` ; quiz 7740 `4fca6965b51be8ce072ea7b1f5c5007b` ; complétions 1657 `327d416c92a9aac30197263a03a47136` ; questions 21 `058450675e22d0adcba162b2eef45a37`.
- PASS : parcours CRM/Jalons/Contrôle/Vue apprenant vérifié ; chiffres lus, pas mock.
- NON PROUVÉ : accès authentifié sous identité élève ; aucun compte créé, accès automatique ou envoi déclenché.
- Premier lot SQL erreur syntaxe avant écriture ; repris avec six fiches puis dix liens réussis. Diagnostic hérité du script affiche « 20 » mais assertion réelle/capture constatent bien **10**.
- Aucun code applicatif, mail, note, réponse, progression ou document source modifié ; aucun envoi/publication. Captures nominatives gardées uniquement en temporaire privé, pas pièces jointes Qualiopi.