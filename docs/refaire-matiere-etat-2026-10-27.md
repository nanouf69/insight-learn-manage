# Refaire une matière — état concret, non activé

## Périmètre
Le bouton et le raccordement ciblé sont préparés dans `ExamensBlancsPage.tsx`, `ExamenBlancsPassage.tsx`, `ExamenBlancsResultats.tsx`, `RefaireMatiereButton.tsx` et `src/lib/examSubjectRetake.ts`.
L'extension additive est dans `docs/subject-retake.sql`. **Elle n'a pas été appliquée** : le contrat reproduisant les vrais déclencheurs échoue sur la conservation d'une ancienne copie. Le partage du backend n'est pas le motif d'arrêt. Le bouton ne peut pas encore créer de reprise sur ce backend.
Finalisation du 27/10 après 23:04 UTC : nouveaux fichiers `SubjectCopyHistory.tsx`, `subjectRetakeNavigation.ts`, `subject_retake_live_catalog_contract.py` ; modifications navigation/transition et tests. Aucune publication globale.

## Protections préparées
- Autorité serveur, propriété du compte, délai 48 h conservateur sur l'examen ou autorisation admin consommée atomiquement.
- Nouvelle clé de réponse et nouvel `attempt_id` V2 ; aucun UPDATE/DELETE des anciennes copies, corrections ou résultats.
- Reçu immuable, sérialisation et unicité source pour double clic/réessai ; restauration par lecture serveur du même compte.
- Aucune neutralisation via `core_restart_matiere`, aucun remappage des anciennes files à l'ouverture d'une reprise.
- Identité V2 autorisée uniquement par reçu détenu par le serveur ; `details.attempt_id` et snapshot initial insérables par l'élève ne sont pas une autorité. Les passages V2 initiaux sans mapping serveur restent refusés.
- Aucune question officielle modifiée ; différences de sujet refusées.

## Vérifications exécutées
- 14 tests SQL simplifiés PASS, dont deux connexions concurrentes pour une seule source ; ces tests ne valent pas validation du schéma complet.
- 38 tests Vitest PASS : reçus/bouton/files, restauration filtre isolée, identité historique, clôture, délai, sauvegarde partielle, snapshot et résultats.
- Contrat schéma réel : export public **sans données**, restauration jetable des tables/fonctions/triggers/politiques. Auth fictive locale, aucune session réelle. Deux tests PASS (déclencheurs réponses byte-identiques au catalogue ; INSERT direct du reçu refusé sous rôle authenticated), **un test FAIL** : `test_production_completion_preserves_other_tentative`.
- FAIL reproduit : `ensure_quiz_result_on_matiere_completion()` ajoute à la ligne T1 `source_tentative:2`, `source_exercice_id:EB1__gestion__t2`, `last_raw_reponses` lors de la clôture de T2. Le JSON historique T1 n'est donc plus identique. Aucune donnée réelle n'a subi ce scénario.
- Le dump local a des erreurs de GRANT pour des rôles d'administration propres à l'hébergement non présents localement ; l'inventaire des triggers `reponses_apprenants` est vérifié identique. Ce test ne certifie pas toutes les dépendances du moteur V2.
- Bouton réel chargé dans une fixture navigateur : 1280×1800 et mobile 390×844, pas de débordement ; refus session absente observé. Aucun compte élève ni correction IA utilisée.
- Compilation automatique : build OK.

## NON PROUVÉ / restant
- Circuit complet apprenant : cliquer, sauvegarder, terminer, recharger et relire le nouveau passage sur un backend isolé comportant **tous** les triggers/RLS. Le test fixture n'est pas un test de compte élève.
- Sélecteur ajouté : lecture par ID résultat/attempt, snapshots historiques seulement, énoncés absents signalés sans reconstruction ; aucun bouton d'écriture dans cette consultation. Vérification fonctionnelle en compte fictif complet NON PROUVÉE.
- Transition : bouton pour la matière terminée et retour liste ajoutés. Retour aux autres matières relit les résultats du numéro original, conserve le filtre et les files ; restauration du reçu exact avant le démarrage standard. Aucun passage ancien utilisé en repli si la lecture du reçu échoue.
- À corriger/tester avant déploiement : protéger le hook de clôture **uniquement pour les reprises à reçu** afin qu'il ne cible jamais une autre tentative ; harmoniser consommation d'autorisation RPC/trigger ; mapping serveur des premières copies V2 et preuve du contenu initial ; contrat save/finalize avec tous les guards/événements/QRC, droits croisés et concurrence de consommation admin.
- Parcours navigateur complet avec compte fictif isolé, historique après clôture et rechargement : NON PROUVÉ, bloqué par le FAIL de conservation et les garanties serveur restantes. Aucun PASS global annoncé.

Aucun mail, SMS, appel de correction IA, écriture élève, migration ou publication exécuté. La fonctionnalité n'est **pas livrée comme opérationnelle**.
## 27/10 23:23 UTC
Migration 0212 appliquée : reçus, start_exam_subject_retake, branche de clôture par reçu. Empreintes copies/réponses/passages V2 identiques avant/après. 19 tests SQL + 5 tests catalogue réel + 8 Vitest PASS.
