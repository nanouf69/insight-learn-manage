# Bilan Français VTC (5/503) et TAXI (11/603) — correction préparée, NON appliquée — 05/11/2026

Aucune écriture en base, aucune publication, aucun email. Les 97 questions sont identiques entre VTC et TAXI.

## Classement des 33 questions fragmentées (mêmes numéros dans 503 et 603)
- **Source certaine, format QCM → correction préparée (2)** : Q5 (EB TAXI n°2 Français q8), Q85 (EB n°3 Français q9). Propositions et bonne réponse reprises de l'examen blanc (majuscule initiale et apostrophe droite comme le reste du Bilan). id, uid, type, énoncé conservés.
- **Source certaine, format QRC → bloquée (5)** : Q8, Q9, Q10 (EB2 q1–q3), Q87, Q89 (EB3 q1, q3). La base refuse toute QRC dans les Bilans (garde P0490, règle « Bilan = QCM uniquement »). Décision requise.
- **Source probable (1)** : Q88 (EB3 q2, énoncé différent) → non touchée.
- **Sans source vérifiable (25)** : Q15, 17, 18, 19, 20, 28, 29, 30, 34, 38, 39, 42, 48, 49, 53, 58, 59, 60, 64, 66, 68, 69, 70, 79, 91 → non touchées (aucun examen blanc ni document du projet ne les contient).

## Textes supports
Les Bilans n'ont ni champ ni affichage de texte support (élève, admin, nouveau circuit Bilan). Sources certaines pour les questions des EB2/EB3 seulement. Ajout = nouvelle fonctionnalité d'affichage → décision requise.

## Points hors périmètre signalés
- Q86 : B et C identiques, C marquée juste ; l'examen blanc a une autre proposition C. Non touchée.
- Nouveau circuit Bilan : version figée a2d4892a (1 passage). Corriger la base ne change pas ce que ce circuit affiche ; une nouvelle version serait nécessaire.

## Fichiers
- `avant_module5_ex503.json`, `avant_module11_ex603.json` : sauvegarde complète (empreintes 9e07d40a…, 9c3892b6…).
- `apres_prepare_*.json` : version préparée, 95/97 strictement identiques.
- Test : `src/test/bilan-francais-correction-preparee.test.ts` — 6/6 PASS.
- Rendu élève/admin : NON PROUVÉ (rien appliqué).

## Application — 05/11/2026 11:13 UTC (accord explicite)
- Avant : base live = sauvegarde, 97/97 questions identiques (empreintes par question) dans 5/503 et 11/603.
- Écriture : 2 lignes `module_editor_state` (modules 5 et 11), seuls les éléments Q5 et Q85 remplacés, garde par empreinte du contenu.
- Après : 97/97 = version préparée ; diff vs sauvegarde = Q5, Q85 uniquement ; reste des modules 5/11 et tous les autres modules : empreintes inchangées.
- Non touchés : QRC Q8/9/10/87/89, Q88, 25 sans source, Q86, textes supports, notes, réponses, progressions, EB, version figée a2d4892a.
- Publication du site non nécessaire (contenu lu depuis la base) ; non publié.
