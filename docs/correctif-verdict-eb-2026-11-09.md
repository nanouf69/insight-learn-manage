# Correctif faux verdicts « EXAMEN ÉCHOUÉ » — 9 novembre 2026, 14:21–14:35 UTC

## Cause (prouvée, voir audit-verdict-eb-captures-2026-11-09.md)
Note serveur V2 définitive + snapshot sans seuil + carte sans `reussi` ⇒ `Boolean(undefined)` = faux ⇒ chaque matière comptée éliminatoire.

## Correctif (calcul/affichage uniquement)
- `examens-blancs-scoring.ts` : seuil = snapshot du passage → seuil configuré de la matière (barème existant 6/20, anglais 4/20) → statut enregistré explicite ; sinon `seuilInconnu`, jamais éliminatoire. Nouveau `verdict` partagé : `reussi`, `echoue` (éliminatoire prouvée, ou toutes matières et moyenne < 10), `incomplet`, `indetermine`.
- `ExamenBlancsListe.tsx` : carte « Résultat incomplet » / « Verdict à vérifier » au lieu d’« échoué » sans preuve ; couleur matière neutre si seuil inconnu.
- `ExamenBlancsResultats.tsx` : en-tête, liste des éliminatoires, badge ADMIS et bilan texte alignés sur ce verdict.
- Inchangés : notes, copies, attentes QRC, règle d’arrondi de la moyenne (risque distinct non autorisé), base de données.

## Tests
- `src/test/verdict-eb-faux-echec.test.ts` : 17 PASS (Ilies EB1 14,8 et EB2 13,4 réussis sans éliminatoire, carte et détail ; Pogos EB1 7,5 échoué C seule ; EB2 F/G en attente ; frontières 6/5,9 et 4/3,9 ; seuil introuvable ; statut explicite ; incomplet ; 24 examens VTC/TAXI/TA/VA ; relectures).
- 8 fichiers existants examens blancs : 48 PASS.
- Suite complète : 3 863 PASS, 13 ignorés, 2 échecs préexistants hors périmètre (heures de présence, `fcSignaturesPapier`).
- Navigateur (Chromium, harnais test-only `src/test/verdict-eb-browser/`) : vraie liste élève, copies réelles des deux élèves lues en lecture seule et servies localement, ordinateur 1280, tablette tactile 820, téléphone 390, chargement + rechargement : Ilies 2 × RÉUSSI (14,8 / 13,4), Pogos EB1 ÉCHOUÉ « C » seule, EB2 « En attente de correction des QRC ». 0 écriture réseau.

## Publication
Diff application vs version publique (`index-BbNPGt9M.js`) : ces 3 fichiers uniquement ; le reste est test/documentation. Publication demandée à 14:34 UTC.
Contrôle public 14:35:50 UTC : index-B5unSckE.js contient le correctif.
