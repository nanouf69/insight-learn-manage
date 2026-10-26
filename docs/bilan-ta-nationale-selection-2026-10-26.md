# Sélection nationale TA — 26 octobre 2026

## Cause et isolement
L'écran du module TA 27 lit `bilan-exercices-taxi`, section 203, via son rattachement existant à l'exercice 250. Les 195 questions actives de cette section partagée étaient affichées sans la projection actuelle 64 Partie 1 + 34 Partie 2 déjà appliquée à TAXI.

Une ancienne liste `bilan-exercices-ta` existe (98 questions nationales, 95 identiques aux sources actuelles et 3 anciennes versions). Elle n'a aucun rattachement dans `quiz_question_bindings`. Elle n'est ni lue par ce correctif, ni modifiée. Aucune source n'est altérée.

## Diff fonctionnel
- `src/lib/bilanTaxiNationaleSelection.ts` : deux wrappers de lecture uniquement pour module 27, réutilisant la projection TAXI sans modifier aucune fonction TAXI existante.
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : import des wrappers et remplacement de deux appels dans le chargement canonique uniquement.
- Enregistrement et relecture après sauvegarde : inchangés ; comportement de snapshots inchangé ; aucune modification de fonction Cloud ou migration.
- `src/test/bilan-taxi-nationale-selection.test.ts` : cinq nouveaux tests ; douze tests TAXI antérieurs conservés.
- Documentation uniquement : `AGENTS.md`, `roadmap.md`, présent rapport et mémoire du périmètre autorisé.

## Vérifications exécutées
- PASS : 32 tests dans quatre fichiers (sélection TAXI/TA, passages figés, anciennes QRC et accès aux anciens passages).
- PASS : projection TA égale intégralement à TAXI, 98 identités uniques, ordre 64 + 34, ancienne Q15 exclue, Q7 à 30,55 €, Q10 actuelle.
- PASS : chaque ligne hors section nationale reste la même référence ; données d'entrée non mutées ; comportements des modules 1 à 100 hors 27 identiques aux anciens helpers.
- PASS : source incomplète, doublon canonique ou identité historique absente refusés.
- PASS : aperçu admin authentifié réel, TAXI nationale 98 / locale 242 ; TA nationale 98 / locale 242. Onglets Résultats élèves accessibles dans les deux modules. Aucun enregistrement ni soumission.
- PASS : compilation automatique, dernier signal `build OK` du 26/10 à 14:55:58 UTC. Aucune compilation manuelle exécutée.
- PASS : comparaison du diff à `42438866bf78df081a0873abc7ce6973c7e93622` : seules les deux lectures et leur import changent dans la page ; aucune modification de ses chemins d'écriture ou snapshots.
- Les requêtes potentiellement écrivantes navigateur ont été bloquées ; seule la vérification de rôle `has_role` a été autorisée en POST (lecture). Trois appels de surveillance/journalisation bloqués. Aucune erreur JavaScript observée dans le parcours final.

## Empreintes Cloud avant/après identiques
| Ensemble | Lignes | MD5 avant = après |
|---|---:|---|
| bilan-exercices-ta | 253 | 8275bb1c0180b17c521131fba8769e4c |
| bilan-exercices-taxi | 456 | a9a529baa2ac05debe99d024242eabe6 |
| reglementation-nationale | 102 | 62ff89094440ad69be449964412c0d10 |
| module_editor_state 9 | 1 | 95b7f94842846dd57dfbeba11e60c87f |
| module_editor_state 10 | 1 | 3e10b4e3aca401c54a5a90d0ebb5a826 |
| module_editor_state 27 | 1 | 933ace34d56b645886d25198c161aa22 |

## Limites
Chaque résultat individuel élève n'a pas été rouvert : NON PROUVÉ. Aucun test sur un élève réel, aucune réponse, note, signature, progression ou jalon écrits ; aucune suppression, migration, modification Cloud ou publication.