# Conformité du noyau sécurisé aux principes LMS/assessment matures

Document de vérification LECTURE SEULE — aucune donnée modifiée, étape 2 non lancée.
Date : 22/09/2026.

## Chaîne cible retenue

```text
EXAM_CONTENT_VERSION (publiée, immuable)
        │
        ▼
   ATTEMPT_ID (1 apprenant, 1 version)
        │
        ├── SNAPSHOT des questions (figé, empreinte)
        │
        ├── ANSWER_EVENTS (journal append-only, 1 event par changement)
        │        │
        │        ▼
        │   ANSWER_STATE (réponse courante + revision)
        │
        └── QRC_INSTANCE_V2 (attempt_id + question_id, état monotone)

REALTIME : signal « nouvelle donnée serveur » uniquement → l'app relit le serveur.
```

Équivalences Moodle : `question_usage` = tentative, `question_attempt` = question dans la tentative,
`question_attempt_step` = chaque interaction conservée (jamais écrasée), l'état de la question
étant déduit des steps et non réécrit sur place.

## Vérification des 12 exigences (contrôlé en base)

| # | Exigence | État | Preuve en base |
|---|---|---|---|
| 1 | `exam_version_id` immuable après publication | ✅ | trigger `enforce_exam_version_immutability` (P0472) : contenu, empreinte, examen, numéro de version non modifiables dès `statut='publiee'` ; suppression interdite ; version retirée non réactivable. Index unique `exam_content_versions_one_active` = une seule version active par examen. |
| 2 | `attempt_id` unique, propriétaire unique | ⚠️ partiel | PK `attempt_id`, `apprenant_id NOT NULL` et immuable (`enforce_attempt_v2_immutability`). Manque : contrôle serveur que `answer_state.apprenant_id` / `qrc_instances_v2.apprenant_id` = propriétaire de la tentative. |
| 3 | Snapshot rattaché à `attempt_id` | ✅ | `snapshot jsonb NOT NULL` + `snapshot_fingerprint NOT NULL` sur `exam_attempts_v2`, figés par trigger. FK `exam_version_id → exam_content_versions`. |
| 4 | `response_event_id` par changement | ✅ | `answer_events` (`event_id` bigint PK, valeur précédente/nouvelle, révisions, origine, session, auteur) alimentée automatiquement par `log_answer_event` ; UPDATE/DELETE bloqués (`forbid_mutation_append_only`). |
| 5 | Réponse courante avec révision | ✅ | `answer_state` : unique `(attempt_id, question_id)`, colonne `revision NOT NULL`, suppression interdite. |
| 6 | Rejet serveur d'une révision périmée | ✅ | `enforce_answer_revision` : `NEW.revision <= OLD.revision` → erreur P0409 ; identité de la réponse immuable (P0475). |
| 7 | `qrc_instance_id` unique = attempt + question | ✅ | `qrc_instances_v2` : PK `qrc_instance_id`, index unique `(attempt_id, question_id)`, FK vers la tentative. |
| 8 | État QRC monotone | ✅ | CHECK `etat in ('en_attente','corrigee')` + `enforce_qrc_v2_finality` : `corrigee → en_attente` interdit (P0476), suppression interdite, identité définitive. |
| 9 | Aucune modification d'une version publiée | ✅ | idem #1, garanti par trigger (pas par le frontend). |
| 10 | Aucune modification d'une tentative terminée | ⚠️ partiel | Tentative elle-même : contenu figé et réouverture interdite (P0473). Manque : refus d'écrire une réponse ou une QRC sur une tentative `etat='terminee'`. |
| 11 | Aucune propagation sans relation déclarée | ⚠️ partiel | `exam_content_shares` (relation explicite, unique source→cible, révocable, traçée) existe et l'ancien mécanisme de propagation automatique n'a aucune prise sur le nouveau noyau. Manque : l'écran de publication (étape 3) qui refuse d'écrire une cible non déclarée et demande confirmation. |
| 12 | Realtime = notification seule | ✅ (à maintenir) | Aucune table du noyau (`exam_content_versions`, `exam_attempts_v2`, `answer_state`, `answer_events`, `qrc_instances_v2`, `exam_content_shares`) n'est dans la publication realtime : aucune vérité métier ne peut transiter par le canal temps réel. |

## Écarts à traiter avant/pendant les étapes suivantes (aucune action prise)

1. **Propriété de la réponse** : ajouter un contrôle serveur `answer_state.apprenant_id` et
   `qrc_instances_v2.apprenant_id` = `exam_attempts_v2.apprenant_id` (empêche techniquement
   qu'une tablette A écrive sous la tentative de B).
2. **Tentative terminée close en écriture** : refuser tout INSERT/UPDATE de `answer_state` et
   toute création de QRC lorsque la tentative est `terminee` ou `abandonnee`.
3. **Question appartenant au snapshot** : refuser une réponse dont `question_id` n'existe pas dans
   le snapshot de la tentative (empêche une question d'un autre examen d'entrer dans une tentative).
4. **Publication avec diff + partages déclarés** (étape 3) : la publication doit lister les cibles
   `exam_content_shares` concernées et exiger une confirmation explicite.

Ces quatre points sont additifs, se posent en base (triggers/contraintes) et ne touchent aucune
donnée existante. Ils restent en attente d'accord, comme l'étape 2.

## Inventaire (lecture seule) des écritures directes encore possibles dans l'ancien système

Classement par risque. Aucun de ces chemins n'a été modifié.

### Risque élevé
1. `src/components/cours-en-ligne/CorrectionQRCTab.tsx` (1511-1541, 1596-1605, 1638-1652) — `.update()` direct de
   `apprenant_quiz_results.details.correctionsIA`. Aucune protection en base n'empêche de réécrire une QRC déjà
   `validatedByAdmin`. C'est le chemin de correction réellement utilisé en production (le moteur `qrc_instances`
   n'est actif que si `qrc_engine_flags.enabled` est vrai pour le quiz).
2. `CorrectionQCMTab.tsx:327-335` et `CorrectionQRCTab.tsx:1511-1541` — `.update()` direct de `score_obtenu`,
   `note_sur_20`, `reussi`. Seule protection : `protect_nonzero_quiz_score_on_update` (empêche seulement le retour à 0).
   Pas de compare-and-swap : deux corrections concurrentes s'écrasent silencieusement.
3. `ExamensBlancsResetTab.tsx` (117, 266-345) — suite de `.delete()`/`.update()` non transactionnels sur
   `reponses_apprenants` puis `apprenant_quiz_results`. Un échec partiel laisse un état incohérent.

### Risque moyen
4. `CorrectionQCMTab.tsx:306-314` — `.update()` direct des réponses QCM dans `reponses_apprenants`, y compris sur une
   ligne `completed=true`. Garde d'antériorité sur `updated_at`, mais pas de journal dédié.
5. `ExamenBlancsResultats.tsx` (330, 508, 1271, 1395, 1412, 1453) — `.update()/.upsert()/.insert()/.delete()` côté
   apprenant en fin d'examen. Les triggers `protect_reponses_apprenants_terminal` et
   `prevent_duplicate_quiz_result_insert_for_learners` corrigent silencieusement au lieu de rejeter.

### Risque faible
6. `ModuleDetailView.tsx`, `ExamensBlancsEditor.tsx` sur `module_editor_state` / `quiz_questions_overrides` :
   RLS admin stricte + trigger `enforce_exam_content_integrity` (refuse notamment la propagation d'une même matière
   entre deux numéros d'examen différents) + compare-and-swap de `save_module_editor_state`.
7. `canonical_update_question`, `canonical_exam_attempts`, `qrc_instances` : bien protégés (verrou de version,
   snapshot immuable, correction finale) mais pilotes non branchés au parcours réel — protection non effective
   aujourd'hui en production.
8. `supabase/functions/backup-restore/index.ts`, `delete-apprenant-account` : écritures en masse en service_role,
   hors parcours normal.

### Conclusion
Les trois chemins « risque élevé » sont exactement ceux que le nouveau noyau neutralise par construction
(correction QRC finale en base, réponse versionnée avec refus de révision périmée, tentative immuable).
Tant que l'application n'est pas basculée, ils restent ouverts : c'est une raison de continuer la migration,
pas de la précipiter.
