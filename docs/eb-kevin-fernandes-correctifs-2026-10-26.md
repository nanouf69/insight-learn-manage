# Examens blancs VTC — Kevin FERNANDES — correctifs du 26/10/2026 (aperçu, non publié)

## Appliqué (code uniquement, aucune écriture de données)
- `selectLatestAttemptRows` : les matières d'un EB sont regroupées par numéro de tentative enregistré, plus par fenêtre de 8 h. Les matières d'une tentative précédente ne complètent que les matières absentes.
- Test : `src/test/eb-selection-tentative.test.ts` (3) + 22 fichiers voisins = 315 PASS.

## Kevin avant → après (lecture des lignes enregistrées)
| EB | Tentative retenue | Matières avant | Après |
|---|---|---|---|
| EB1 | 4 (+ matières des tentatives 1–3) | inchangé | inchangé ; divergences historiques/moteur = arbitrage admin |
| EB2 | 2 | partiel | 5/7 — F et G jamais enregistrées : restent à faire |
| EB3 | 1 (29/09→12/10) | 2/7 | 7/7 |
| EB4 | 1 (19→20/10) | 1/7 | 7/7 |
| EB5 | 1 (20→21/10) | 5/7 | 7/7 |
| EB6 | 1 | 7/7 | 7/7 |

## Non modifié volontairement
- Refus P0530 « clôture vide » : protection serveur correcte (refuse de clôturer une matière sans réponse). Aucune copie EB2 F/G n'existe côté serveur : rien à récupérer ; Kevin doit les passer.
- Module 35 / Bilan module 5 : non forcés. La validation reste celle du serveur (6/6 EB remis) ; EB2 incomplet ⇒ toujours verrouillé jusqu'à F/G.
- QRC historiques EB2/EB3 et EB1 divergent : aucune note attribuée automatiquement ; correction manuelle admin requise.

## Reste à faire
- Élève : passer EB2 matières F(V) et G(V).
- Admin : corriger les QRC en attente EB2 (A, B, D) et EB3 (A, B, D, F, G) ; arbitrer les copies EB1.
- Non vérifié : affichage sur l'écran élève de Kevin (aucune connexion à son compte).
