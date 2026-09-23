# Afficher EB3 ancien circuit dans Correction QRC

## Objectif
Faire de l’onglet « Correction QRC » l’écran unique : EB1/EB2 restent servis par V2 et EB3 apparaît dans la même liste avec le libellé « EB3 — ANCIEN CIRCUIT ».

## Mise en œuvre
- Étendre la liste des examens de la session sélectionnée avec les passages EB3 finalisés du circuit historique, sans créer de tentative V2 et sans copier de réponse.
- Rattacher ces passages aux sessions CRM existantes selon les liens apprenant/session déjà enregistrés ; conserver les dates et candidats réels, sans rattachement automatique en cas d’ambiguïté.
- Quand EB3 est sélectionné, afficher le correcteur historique existant dans le même onglet, préfiltré sur EB3 et sur la session choisie.
- N’inclure que les matières normalement finalisées par l’élève ; les matières EB3 ouvertes restent absentes jusqu’à leur finalisation.
- Conserver le mécanisme d’écriture historique pour les corrections EB3. Aucun appel V2 ne sera utilisé pour ces données.

## Contrôles
- Comparer en lecture seule le nombre affiché avec le nombre exact de QRC EB3 finalisées existantes pour la session.
- Vérifier que les 9 matières encore ouvertes ne sont pas proposées à la correction.
- Vérifier visuellement la sélection « EB3 — ANCIEN CIRCUIT » et l’accès aux réponses réelles.
- Exécuter les tests ciblés et contrôler l’absence d’erreur dans l’aperçu.

## Garanties
- Aucune migration, resynchronisation, finalisation ou réinitialisation.
- Aucune modification des réponses, tentatives ou résultats existants.
- EB3 et EB3-TAXI restent intégralement dans l’ancien circuit.
