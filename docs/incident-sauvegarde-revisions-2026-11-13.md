# Incident sauvegarde « Refaire les questions fausses » / bilans — 13/11/2026

## Cause exacte (prouvée)
1. Deux coupures d'environ 1 min (17:56 et 18:10 UTC) : 106 envois abandonnés côté élève après 15 s, chez 12 élèves au même moment. Le serveur a souvent appliqué l'écriture, mais l'accusé est perdu.
2. Une révision est stockée sous une seule clé (`revisionState`). Après un accusé perdu, l'appareil garde un numéro de version périmé. Le serveur ignore alors chaque nouvelle version (`skipped_questions`) et le navigateur la classe comme « conflit », donc bandeau « non confirmées ». HABLANIS EB5 r2 : 546 écritures ignorées entre 17:56 et 18:17.
3. Défaut serveur : `persist_answer_batch_v2/v3` appliquent `completed = true` et la note même quand le contenu du lot est ignoré. La copie est figée avec l'état ancien, et la relecture affiche « La révision conservée ne prouve pas toutes les réponses ».

## Fréquence
- 18 révisions terminées ont été figées incomplètes (16 élèves, 06/11–13/11).
- Les réponses manquantes de l'état figé sont présentes dans le journal serveur `reponses_apprenants_journal` pour 15 copies sur 16. WADOOD : 7 réponses absentes du journal aussi, à vérifier.
- Modules, bilans et EB : 0 copie bloquée en boucle (écart write_seq/meta ≥ 20 = 0 sur 2 756 copies en 7 jours). Leurs bandeaux viennent des deux coupures et disparaissent au renvoi.

## Correctifs préparés (aperçu, NON publiés, NON appliqués en base)
- Navigateur (`src/lib/answerPersistence.ts`) : chaque état de révision porte l'identifiant de l'onglet et un compteur. Si la version serveur ignorée vient de ce même onglet, qu'elle est plus ancienne, qu'elle a le même examen et le même ordre, et que la version locale ne retire aucune réponse ni validation, la version locale est rebasée et renvoyée. Un autre appareil garde la protection anti-écrasement.
- Serveur : candidats `docs/candidats-sql/persist_answer_batch_v{2,3}_cloture_sure.sql`, qui refusent de clôturer ou noter quand une réponse du lot est ignorée. Le client rebase puis renvoie la clôture.

## Tests
- `python3 src/test/cloture_sure_sql_contract.py` : PostgreSQL jetable avec le schéma réel. L'incident est reproduit avec les fonctions actuelles (clôture d'un état à 2 validations au lieu de 3), puis corrigé avec les candidats. Le rebase clôture à 3/3, et une copie close n'est jamais réécrite. PASS.
- Vitest : 30 fichiers, 214 tests de sauvegarde et de révision réussis, dont `revision-ecrivain-onglet.test.ts`.
- Non faits : smoke test authentifié contre un backend de test (il n'en existe pas d'isolé), appareils iOS/Android réels.

## Copies déjà figées
Aucune modification. Une récupération ne pourra se faire que par une nouvelle révision autorisée, ou une projection en lecture depuis le journal, après accord.
