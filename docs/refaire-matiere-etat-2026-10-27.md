# Refaire une matière — état concret, non activé

## Périmètre
Le bouton et le raccordement ciblé sont préparés dans `ExamensBlancsPage.tsx`, `ExamenBlancsPassage.tsx`, `ExamenBlancsResultats.tsx`, `RefaireMatiereButton.tsx` et `src/lib/examSubjectRetake.ts`.
L'extension additive est dans `docs/subject-retake.sql`. **Elle n'a pas été appliquée** : le backend est partagé avec la production et aucune publication/déploiement global n'est autorisé. Le bouton ne peut donc pas encore créer de reprise sur ce backend.

## Protections préparées
- Autorité serveur, propriété du compte, délai 48 h conservateur sur l'examen ou autorisation admin consommée atomiquement.
- Nouvelle clé de réponse et nouvel `attempt_id` V2 ; aucun UPDATE/DELETE des anciennes copies, corrections ou résultats.
- Reçu immuable, sérialisation et unicité source pour double clic/réessai ; restauration par lecture serveur du même compte.
- Aucune neutralisation via `core_restart_matiere`, aucun remappage des anciennes files à l'ouverture d'une reprise.
- Identité V2 prouvée par reçu ou lien explicite `details.attempt_id` ; numéro de tentative seul insuffisant, ambiguïté refusée.
- Aucune question officielle modifiée ; différences de sujet refusées.

## Vérifications exécutées
- 13 tests SQL sur PostgreSQL jetable : délai, autorisation, droits/sortie de session, idempotence, expiration, conservation, nouveau passage, V2, refus ambiguïté, immutabilité. Fonctions de propriété/délai/immutabilité copiées du catalogue live en lecture seule ; schémas simplifiés, pas tous les triggers de production.
- 36 tests Vitest : six nouveaux tests reçu/bouton/files, plus clôture, délai, sauvegarde partielle, snapshot, résultats existants.
- Bouton réel chargé dans une fixture navigateur : 1280×1800 et mobile 390×844, pas de débordement ; refus session absente observé. Aucun compte élève ni correction IA utilisée.
- Compilation automatique : build OK.

## NON PROUVÉ / restant
- Circuit complet apprenant : cliquer, sauvegarder, terminer, recharger et relire le nouveau passage sur un backend isolé comportant **tous** les triggers/RLS. Le test fixture n'est pas un test de compte élève.
- Consultation explicite de toutes les anciennes copies : les lignes restent intactes, mais l'écran existant sélectionne les dernières ; sélecteur historique ciblé encore à terminer.
- Reprise directement sur la transition entre matières et restauration du filtre global après sortie à compléter.
- Concurrence réelle de deux connexions et autorisations RLS du schéma complet non exécutées.
- Copies V2 sans lien explicite : refus volontaire, aucun rattachement automatique.

Aucun mail, SMS, appel de correction IA, écriture élève, migration ou publication exécuté. La fonctionnalité n'est **pas livrée comme opérationnelle**.