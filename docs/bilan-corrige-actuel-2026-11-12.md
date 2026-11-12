# Corrigé actuel générique — Bilan examen (candidat, NON activé)
- Lecture serveur candidate : docs/sql-revue/2026-11-12-bilan-corrige-actuel.sql (non installée, retrait = DROP FUNCTION).
- Interrupteur client : BILAN_CORRIGE_ACTUEL_ACTIF=false ; hotfix BILAN_SR_TRAINING_ACTIF=false conservé.
- Couverture prouvée par SELECT 12/11 : copies figées anciennes module 5 : 26 173/26 221 questions rattachables par uid (48 absentes) ; module 11 : 8 463/8 465.
- Non couvert : nouveau Bilan A–E (87 remises) — versions sans uid ; 18/1 741 questions seulement identiques au texte près ; aucun rapprochement deviné.
- QRC (48 dans les copies figées, sans barème) : « à revérifier », jamais notées.
- Note recalculée affichée à côté de la note d'origine, jamais écrite ; entraînement local.
- Tests : src/test/bilan-corrige-actuel.test.ts (12), src/test/bilan_corrige_actuel_sql_contract.py (5, base jetable).
