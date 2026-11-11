# Chemoun — EB3 TAXI A/B — contrôle du 11/11 à 12:26–12:32 UTC

## Verdict
Pas de défaut de correction reproduit sur ces formes de copies importées. Aucune note réelle créée ou rattachée, aucun code métier/migration/déploiement modifié. Le statut EB3 A/B reste en attente, car aucune correction persistée sur ces identités n’est retrouvée. Cela ne prouve pas l’absence de saisie dans le navigateur de l’admin.

## État avant/après SELECT
| Copie | Original | QRC reçues/en attente | Note V2/résultat |
|---|---|---:|---|
| A t2 `7f3f3ead-78a3-42c5-80fb-719a5be8351f` | `e0cb84a0-e170-40b2-aef2-6b55174b1bd6` | 1/1 | aucun |
| B t2 `e8f65564-3729-4bb6-809e-edab2a4142a8` | `5fce7f9a-ec18-49a6-bc6c-e08e635323cd` | 2/2 | aucun |
| A t1 `91bce116-6f48-48bc-ad2a-1abe93311b81` | `485503df-2091-43fb-91ed-743af3e339aa` | 5/5 | aucun |

Empreintes snapshot inchangées entre les SELECT : A t2 `9c8bd7622a1f5a5b54c1e6cee607c982`, B t2 `a467a6d01f086d752816c7a4aaaed14f`, A t1 `9dfc46bb7aa30ef89d836c92598b1b12`.

Import journalisé le 11/11 10:18:00.936993 UTC. `source_historique.result_id` et `tentative` identifient chaque source séparément. IDs de questions sont des chaînes locales `1`…`5`, identiques aux QRC ; barème figé 2 points, reconnu directement sans ligne `qrc_bareme_restaure`.

## Traces recherchées
- `qrc_instances_v2`, `core_exam_results`, `core_operations`, `qrc_correction_events`, `audit_journal`, `qrc_historique_corrections`, ancien `qrc_instances`, `audit_logs`, `error_logs`.
- Aucune opération de correction ni événement/note sur les trois passages EB3 ciblés ; anciennes corrections et ancien journal QRC vides pour A/B recherchées.
- Corrections A/B effectivement retrouvées le 09/11 13:18–13:24 UTC : passages `8f33f85f-1bdb-4cb0-b016-36bcacc07c19` et `dd51d1b6-7455-4f1a-97fb-a885480c7715`, **EB2-TAXI**, notes 16/20 et 16/20 définitives. Elles ne sont pas transférables à EB3.
- Les événements D/F/G EB3 du 10/11 sont séparés et ne prouvent pas A/B.
- Journaux d’erreur lus : plantages du correcteur en aperçu le 10/11 sur navigation EB2/EB3 ; aucune association aux trois QRC ciblées ni note/commande refusée A/B retrouvée. Le texte du journal ne prouve pas l’écran utilisé lors de la saisie signalée.

## Circuit testé
- `core_correct_qrc_publish` appelle `core_correct_qrc`, puis `core_recalc_result` dans la même transaction. Le recalcul insère le résultat s’il n’existe pas : l’absence initiale de résultat ne bloque donc pas une première correction.
- Le garde-barème compare `q->>'id'` à `question_id` et lit les points du snapshot exact. Les IDs locaux ciblés ne sont pas incohérents.
- L’écran réel appelle la commande V2 pour ces imports, pas `qrc_historique_noter`. Il relit ensuite la seule copie et vérifie note/état avant navigation ou succès. Un refus conserve la sélection et affiche l’erreur.
- Le rendu élève (`coreExamPublication` / `attacherSourceUnique` / `noteExamenAffichee`) conserve l’identité de la ligne source et tentative, et ne peut afficher les notes EB2 comme notes EB3. Sans résultat V2 et avec drapeau historique pending, A/B restent en attente.

## Tests réellement exécutés
- `python3 src/test/eb3_correction_v2_contract.py` : **15 tests PASS**, PostgreSQL jetable, variables PG de production exclues. Nouveau cas A t2/B t2/A t1 : IDs locaux, résultat absent initialement, correction fictive, première publication provisoire puis définitive, rejeu, snapshots/réponses inchangés, autre élève intact. Définitions de correction et garde-barème comparées au catalogue live lu.
- `bunx vitest run src/test/correction-qrc-navigation-auto.test.tsx src/test/source-unique-publication-nouveau-moteur.test.ts` : **46 tests PASS**, dont grille réelle avec import V2, ID local `1`, aucun résultat initial, bouton actif, bonne copie envoyée, relecture de la note ; refus/isolation existants et affichage partagé.
- Compilation de l’aperçu : **build OK** après ajouts de tests.

## Limites et suite concrète
Vérification visuelle avec session injectée : NON PROUVÉE, session disponible de type élève non exploitable comme admin (« Compte apprenant introuvable »). Aucune correction testée en production. Tous les appels mutateurs Cloud ont été bloqués dans le navigateur de contrôle.

Il manque une trace de l’envoi A/B EB3 : écran exact, tentative choisie, heure de saisie et éventuel message après clic. Le chemin est prouvé sur fixtures ; pour reproduire l’incident réel sans attribuer de points, l’admin doit ouvrir l’une des copies EB3 identifiées et partager l’état/message affiché, ou fournir un contexte d’aperçu admin disponible. Pas de transfert de points ni de correction automatique pour suppléer cette preuve.