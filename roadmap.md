# Feuille de route — bilan du 21/10

## 1. ErrorBoundary — rechargement sans effacement ✅
- handleHardReload ne vide plus aucun stockage ; cache-bust `_t` en conservant l'URL.
- Textes honnêtes (plus de « 90 % des cas » ni promesse de sauvegarde).
- Tests `src/test/error-boundary-reload.test.ts` : 4/4 PASS.

## 2. Ancien chunk 404 (Riyad, JeuxCartesLyon) ✅
- `src/lib/chunkVersionGuard.ts` : détection chunk obsolète, notification avec action « Recharger », jamais de boucle ni de rechargement automatique, aucune file touchée.
- Installé dans `src/main.tsx`. Tests inclus au point 1.

## 3. Rattrapage IA Aba-Bakre (64 QRC, EB1/4/5/6 du 18–19/10) — EN COURS
- Fonction `qrc-ia-correction` : période 17–19/10 restreinte à son dossier ; continuations de suite autorisées dans ces périodes seulement. Déployée (SHA 80be14e1…).
- 20 suites créées (une par tentative), cron `qrc-ia-suites-bornees` actif.
- Progression : 5/64 à 08h35. À vérifier jusqu'à 64/64 + notes finales.

## 4. Belarbi — incident résorbé ✅
- Révision `module_3_revision_exo_404` persistée à 21:42:24 par la file de fond ; original submitted intact. L'échec affiché à 20 s était seulement l'attente écran. Aucune action donnée.

## 5. Smail — incident résorbé ✅
- Révision `module_2_revision_exo_1` persistée à 21:29:54 après la coupure réseau de 21:28. Aucune action donnée.

## 6. Finalisation — EN COURS
- Types OK, build OK, tests 12/12, publication demandée (gestion.ftransport.fr).
- Reste : fin du rattrapage 64/64, empreintes APRÈS, journal docs/.
