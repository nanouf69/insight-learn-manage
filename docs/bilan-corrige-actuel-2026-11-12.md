# Corrigé actuel générique — Bilan examen (candidat, NON activé)
- Lecture serveur candidate : docs/sql-revue/2026-11-12-bilan-corrige-actuel.sql (non installée, retrait = DROP FUNCTION).
- Interrupteur client : BILAN_CORRIGE_ACTUEL_ACTIF=false ; hotfix BILAN_SR_TRAINING_ACTIF=false conservé.
- Couverture prouvée par SELECT 12/11 : copies figées anciennes module 5 : 26 173/26 221 questions rattachables par uid (48 absentes) ; module 11 : 8 463/8 465.
- Non couvert : nouveau Bilan A–E (87 remises) — versions sans uid ; 18/1 741 questions seulement identiques au texte près ; aucun rapprochement deviné.
- QRC (48 dans les copies figées, sans barème) : « à revérifier », jamais notées.
- Note recalculée affichée à côté de la note d'origine, jamais écrite ; entraînement local.
- Tests : src/test/bilan-corrige-actuel.test.ts (12), src/test/bilan_corrige_actuel_sql_contract.py (5, base jetable).

## Suite 12/11 13:41
- Client : relecture à l'entrée, au retour d'onglet et toutes les 30 s tant que visible ; « Commencer »/« Vérifier » attendent une lecture fraîche ; réponses périmées ignorées ; choix locaux liés à uid + texte/options affichés.
- Note : pondérée seulement si chaque question porte un barème numérique dans la copie ; sinon nombre de réponses correctes + « note recalculée indisponible ». Copies figées actuelles : barème null partout → toujours indisponible.
- Admin : même composant en `lectureSeule` (aucun entraînement), via le même lecteur ; non branché dans l'écran admin.
- A–E : docs/sql-revue/2026-11-12-bilan-future-uid-liens.sql — table de liens append-only vide (pas de backfill), candidats admin en lecture, confirmation admin re-prouvée côté serveur et idempotente, lecteur qui ne rapproche qu'avec lien confirmé. SELECT 12/11 : 2 022 occurrences, 1 930 candidates, 84 ambiguës, 8 absentes de l'éditeur.
- Tests : bilan-corrige-actuel.test.ts (14), bilan-corrige-actuel-ui.test.tsx (5, transport simulé), bilan_corrige_actuel_sql_contract.py (5), bilan_future_uid_liens_sql_contract.py (4).
