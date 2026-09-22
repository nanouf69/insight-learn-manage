# Snapshot de référence — état figé AVANT Phase 1 du plan anti-panne
Date : 22/09/2026, 21h40 Paris. Relevé en lecture seule. Aucune donnée réelle modifiée.

## 1. Empreintes des fichiers de protection (référence contractuelle)

| Fichier | md5 |
| --- | --- |
| src/lib/answerPersistence.ts | 80a556a6f1376e4e4d8bdd95e0834c1a |
| src/lib/examFinalizationGuard.ts | 7d343ca730e96f256b0635d536bd9e85 |
| src/features/noyau-passage/pontV2.ts | 7e535d822e3f77ee6fbab10e3c4cc3ad |
| src/hooks/useAutoSaveReponses.ts | b3e49764a4eb7a3e74a66db84bf95882 |
| src/components/cours-en-ligne/ExamenBlancsPassage.tsx | 47829a0864ccb5beb4c4d02f4de0c685 |

## 2. Mécanismes figés

- **File locale** : clé `answer_save_queue_v1` (localStorage), persistante ; file V2 séparée `noyau_v2_answer_queue_v1`. Un élément ne sort de la file qu'après confirmation serveur. Les éléments refusés (403) sont CONSERVÉS en file, jamais supprimés, mais ne sont plus renvoyés.
- **Accusé de réception serveur** : la suppression de l'élément est conditionnée à la réponse OK de `upsert-reponse-apprenant` / `persist_answer_batch_v2`.
- **Numéro d'ordre** : compteur `answer_write_seq_v1` côté client, `write_seq` renvoyé par le serveur ; une écriture au numéro inférieur est refusée côté serveur.
- **Anti-écrasement** : une réponse plus ancienne ne peut pas remplacer une plus récente (contrôle de `write_seq`).
- **Idempotence des réponses** : identifiants d'opération déterministes (`p_operation_id`, UUID calculé depuis une clé métier stable) ; N renvois = 1 seule réponse.
- **Idempotence de finalisation** : `examFinalizationGuard.ts` — double-clic / F5 ne créent pas deux passages ; finalisation refusée si la file n'est pas vide.
- **Snapshots V2** : sujet figé au démarrage d'une tentative, immuable (triggers `enforce_attempt_v2_immutability`, `core_snapshot_has_question`).
- **Journaux append-only** : `reponses_apprenants_journal`, `audit_journal`, `core_operations`.
- **Réessais actuels** : backoff exponentiel `min(30 000 ms, 1000 × 2^n)`, sans jitter. 403 = arrêt. Toute autre erreur (y compris refus fonctionnel 500 / P0471, cas SAWADOGO) = réessai sans fin.

## 3. Résultat des tests automatiques AVANT modification

Commande : `bunx vitest run`.

- Fichiers de tests : 88 au total.
- Exécutés : 38 → **36 réussis, 2 en échec**.
- Tests : **449 réussis, 5 en échec** (454 exécutés).
- Non exécutés : 50 fichiers, bloqués à l'ouverture par une dépendance système absente (module natif `canvas` de jsdom). Problème d'environnement, antérieur et sans rapport avec la sauvegarde.

Échecs préexistants (hors périmètre Phase 1, non corrigés) :
1. `email-sender-branding.test.ts` — affichage du mot de passe dans le renvoi des identifiants (1).
2. `matiere-partagee-derniere-modification.test.ts` — dernière modification réelle gagnante (4).

Tests des mécanismes protégés, rejoués isolément : **20/20 réussis**
- `answer-persistence.test.ts` 9/9
- `answer-ordre-serveur.test.ts` 3/3
- `answer-owner-mismatch.test.ts` 8/8

## 4. Critère de non-régression pour la Phase 1

Après modification, doivent rester strictement identiques : les 20 tests ci-dessus au vert, le total 449 réussis / 5 échecs préexistants, les clés de file locale (`answer_save_queue_v1`, `answer_write_seq_v1`, `noyau_v2_answer_queue_v1`) et leur format. Toute divergence = pas de déploiement.
