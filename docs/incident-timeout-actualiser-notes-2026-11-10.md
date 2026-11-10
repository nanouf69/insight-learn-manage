# Incident « Vérification impossible : canceling statement due to statement timeout » — 10/11/2026

## Cause racine (mesurée en lecture seule)
- Plafond de la base pour les comptes connectés : **8 s par requête**.
- `eb_notes_diagnostic_ancien` (anciennes copies) : pour chacune des 6 085 anciennes copies, la recherche « déjà importée ? »
  n'avait pas le prédicat de l'index partiel `ux_exam_attempts_v2_source_result` ⇒ parcours complet des 2 811 sujets figés
  décompressés : **823 ms par ancienne copie** (EXPLAIN ANALYZE, 8 912 blocs) contre **0,03 ms** avec le prédicat.
  Une page de 800 copies ≈ 11 minutes ⇒ délai dépassé dès la 1re page (reproduit sur base jetable : arrêt à 8,0 s ; en
  production : aucune réponse en 120 s pour 20 copies).
- `eb_notes_diagnostic` (nouveau correcteur) : relisait le sujet figé pour chaque QRC et traitait 300 copies par appel :
  **7,0 s / 12,8 s / 7,7 s** mesurés par page, à la limite du plafond.

## Correctif (migration 0263, lecture seule)
- Prédicat d'index ajouté ; identifiants QRC du sujet extraits une seule fois par copie ; index partiel
  `idx_aqr_eb_termines_id` pour parcourir les anciennes copies.
- Lots bornés : 50 (max 100) copies nouveau correcteur, 200 anciennes copies ; **budget de 3 s par lot** (arrêt avant une
  copie, curseur `suivant`, drapeau `fini`, `total` pour la progression).
- Écran : progression « x / y copies lues », bouton Annuler, nouvelle tentative du même lot uniquement pour les erreurs
  transitoires (délai, réseau, surcharge ; 3 fois au plus), erreur détaillée (lot, circuit, copies lues, code),
  refus d'un doublon ou d'un curseur qui recule, contrôle final **lues = total** (sinon une relecture complète, puis erreur).
  Aucun résultat n'est affiché avant la fin complète.
- Règles de classement, droits admin et actualisation (`eb_notes_actualiser`) inchangés.

## Mesures en production après installation (compte administrateur, lecture seule)
| Circuit | Copies lues | Lots | Lot le plus long (serveur) | Durée totale |
|---|---|---|---|---|
| Nouveau correcteur | 2 798 / 2 798 | 56 | 91 ms | 11,3 s |
| Anciennes copies | 6 085 / 6 085 | 31 | 130 ms | 5,2 s |
- 3 vérifications simultanées : 3 × 2 798/2 798, aucune erreur.
- Écran admin (aperçu, vrai compte administrateur) : lecture complète en 20,8 s, 87 appels tous réussis, annulation = aucun résultat affiché.
- Empreinte des 2 752 résultats et 6 781 QRC identique avant/après ; journal d'actualisation : 0 écriture.

## Constats (identiques à l'audit précédent)
- 56 notes différentes du calcul serveur (vérification humaine, jamais réparées).
- 36 copies importées sans barème avec QRC restantes ; 1 copie importée sans note (Diallo Thierno, EB3, 21/09).
- 159 attentes normales, 0 attente fantôme, 0 note définitive avec QRC restantes, 0 résultat absent, 0 identité incohérente.
- Anciennes copies : 91 sans correction humaine et sans copie nouveau correcteur ; 613 avec copie nouveau correcteur même matière.

## Tests
- Base jetable, volumétrie supérieure à la production (5 800 copies, 6 100 anciennes) : `src/test/eb_notes_diagnostic_lots_contract.py`
  — 23/23 (reproduction du délai, exhaustivité sans doublon ni oubli, budget forcé 1 ms/30 ms, équivalence exacte avec
  l'ancienne version, droits élève/anonyme refusés, lecture seule, corrections concurrentes, rollback).
- Vitest : `src/test/synchronisation-notes-lots.test.ts` (10) + tests existants (68 au total, tous PASS).

## Retour arrière
`docs/sql-revue/2026-11-10-eb-notes-diagnostic-lots-ROLLBACK.sql` (rétablit les définitions 0261/0262, retire l'index) — testé sur base jetable.
