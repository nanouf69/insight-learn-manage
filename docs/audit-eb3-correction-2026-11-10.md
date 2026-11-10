# Audit EB3 TAXI/VTC — correction QRC et remontée des notes (10/11/2026 ~11:50 UTC)

Lecture seule en production ; tests d'écriture uniquement sur PostgreSQL jetable. Aucune note réelle, aucune publication.

## 1. Deux circuits EB3
| | VTC (EB3) | TAXI (EB3-TAXI) |
|---|---|---|
| Copies matière historiques (ancien circuit) | 707 / 92 élèves | 125 / 16 élèves |
| Fiches V2 terminées | 295 (292 importées + 3 natives du 10/11) / 54 élèves | 39 importées / 6 élèves |
| Fiches V2 en cours | 3 (aujourd'hui) | 0 |

Le correcteur V2 affiche les fiches V2 dans sa grille ; les copies EB3 historiques sont listées en « EB3 — ANCIEN CIRCUIT » et notées par l'ancien écran (écriture directe de la copie).

## 2. Circuit V2 (là où remontent les notes) — CONFORME
- QRC : VTC 759 corrigées / 12 en attente (7 élèves) ; TAXI 105 corrigées / 0 en attente.
- 327 fiches terminées : 320 résultats définitifs publiés, 7 provisoires = exactement les 7 copies qui ont encore une QRC en attente.
- Incohérence QRC ↔ résultat : 0. Note hors barème sur EB3 : 0.
- Encore à corriger : Razanadramanana Leong et Sow Mamadou (07/11, 1 QRC chacun) ; 5 copies anciennes (mai/juillet : HASANI, n sapu, CAMARA, saandi, soumah — 2 QRC chacune).

## 3. Correctif A+B/B+A et migration 0257 — AUCUN EFFET SUR EB3
Le circuit historique protégé (`qrc_historique_noter/reviser`, preuve de liaison) n'est utilisé que pour EB2 VTC. EB3 n'en dépend pas ; il n'y a donc aucune régression ni aucun déblocage EB3 attendu.

## 4. Anomalies `__tN` / colonne tentative = 1
Sur l'ensemble des remises EB : 95 EB3 VTC (11 élèves) et 9 EB3-TAXI (2 élèves). Comme EB3 n'utilise pas la liaison par remise, **elles ne bloquent aucune correction EB3 aujourd'hui** ; elles deviendraient bloquantes seulement si EB3 historique passait un jour par le circuit protégé.

## 5. Copies EB3 qui n'existent que dans l'ancien circuit (sans fiche V2)
- VTC : 55 copies matière avec QRC, 21 élèves, 194 QRC répondues ; TAXI : 13 copies, 5 élèves, 40 QRC.
- **0 QRC validée par un humain.** 62 de ces 68 copies portent une « Correction déterministe » automatique (mots-clés) non validée ; 60 sont pourtant marquées réussies.
- Exemples prouvés de notes automatiques fausses : « Responsabilité civile professionnelle / Responsabilité civile circulation » noté 0/5 ; « Retrait temporaire… / Retrait définitif » 0/3.
- Récents : SMAIL Sifeddine (VTC, 04–05/11, 5 matières, 16 QRC), CHEMOUN Mourad (TAXI, 01–09/11, 8 QRC), HAMDI, HADDOU, MEMDOUH (TAXI, 30/10).
- Ces copies ne sont pas dans la grille V2 : elles ne sont corrigeables que par l'ancien écran, contraire à la règle du 09/11 (un seul correcteur V2, ancien correcteur refusé).

## 6. Tests
- Nouveau `src/test/eb3_correction_v2_contract.py` (base jetable, fonctions et droits de production du 10/11, sujets EB3 réels VTC Gestion et TAXI, aucune donnée élève) : 4 OK + 1 échec attendu.
  - 1re QRC → note enregistrée, résultat provisoire ; double clic sans nouvelle écriture ; dernière QRC → définitif publié = formule indépendante ; relecture après rechargement ; journal append-only ; réécriture refusée ; révision avec contrôle de l'ancienne note ; élève/anonyme refusés ; isolation entre élèves.
  - Échec attendu : **le serveur V2 accepte une note supérieure au barème** (seuls les boutons de l'écran la limitent).
- Vitest notes/verdicts/correction : 42 fichiers, 424 OK.

## 7. Verdict
- **EB3 V2 (VTC et TAXI) : PRÊT** — les notes remontent, 0 incohérence.
- **EB3 historique sans fiche V2 : NON PRÊT** — 68 copies / 26 élèves / 234 QRC sans correction humaine, hors grille V2, notes automatiques non validées affichées comme acquises.
- Non vérifié : résultat global 7 matières (alerte) non relancé ce jour ; règles éliminatoires vérifiées par les tests applicatifs, pas sur chaque élève réel.

## 8. Corrections nécessaires (accord requis)
1. Afficher les 68 copies EB3 historiques dans la grille V2 en consultation (comme EB2) et les noter par une fonction serveur protégée (identité de copie, barème figé, journal).
2. Décider du sort des notes « Correction déterministe » non validées (afficher « en attente » sans modifier les données).
3. Garde serveur barème/demi-point dans `core_correct_qrc` (migration).
