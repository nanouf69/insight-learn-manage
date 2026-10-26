# Bilan exercices = somme des questions du cours — 26/10/2026

## Demande
Chaque matière du « Bilan exercices » (TAXI module 9, TA module 27) doit afficher exactement l'addition des questions des sections correspondantes de « Cours et exercices ». Décisions utilisateur : bilan = somme exacte des cours (les questions historiques en plus ne s'affichent plus mais restent en base) ; la Réglementation locale reçoit la même méthode que la nationale.

## Audit préalable (lecture seule)
| Matière TAXI | Cours (module 10) | Bilan avant | Écart |
|---|---|---|---|
| T3P | 133 (53+80) | 206 | 70 énoncés bilan hors cours, 10 répétitions |
| Gestion | 150 (45+59+46) | 171 | 21 énoncés bilan hors cours |
| Sécurité routière | 241 | 241 | conforme (répétitions = panneaux illustrés, identiques des deux côtés) |
| Français | 103 | 103 | conforme |
| Anglais | 126 | 126 | conforme |
| Réglementation nationale | 98 (64+34) | 195 canoniques | déjà corrigée (projection 98) |
| Réglementation locale | 105 (29+29+22+25) | 242 canoniques | 104 groupes de doublons, 33 sans équivalent cours |

TA : deux matières seulement (nationale 250, locale 251), sections partagées 203/204 avec TAXI.

## Correctif (affichage seul, zéro écriture Cloud)
- `src/lib/bilanTaxiNationaleSelection.ts` : ajout de `selectBilanTaxiLocaleRows` (sections 73/76/74/75 → 105 questions, identités historiques section×1000+legacy conservées, refus strict si source incomplète) et composition `selectBilanTaxiDisplayRows` (nationale + locale, chaque projection appliquée seulement si sa source est chargée). `canonicalQuizIdsForDisplay(9)` lit aussi `reglementation-locale`. TA (module 27) passe par le même wrapper display-only.
- `src/lib/bilanCoursSommeProjection.ts` (nouveau) : projection JSON pour les matières sans quiz canonique — module 9 ← module 10 : T3P 100 ← [1,2], Gestion 101 ← [60,61,62]. Identité historique préservée via `source_exercice_id`/`source_question_id` (secours : énoncé normalisé) ; nouvelle question du cours = identifiant d'affichage déterministe ≥ 900000. `retablirExercicesProjetesDuServeur` rétablit la version serveur avant toute sauvegarde.
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : chargement lecture seule du module 10 à l'hydratation, projection appliquée au chargement initial et au rafraîchissement de visibilité, protection d'enregistrement dans `performDbSave`, relecture canonique post-sauvegarde via la sélection composée.

## Vérifications
- 30 tests projection (nationale, locale, T3P/Gestion, protections) + 72 tests voisins (persistance bilans, conflits canoniques, passages figés) : PASS.
- `tsgo --noEmit` : OK ; build automatique : OK.
- Aperçu admin réel (session injectée) : TAXI = 133 / 150 / 241 / 103 / 126 / 98 / 105 ; TA = 98 / 105.
- `module_editor_state` modules 9 et 27 : `updated_at` inchangés (29/09) — aucune écriture Cloud ; les 242 lignes historiques de la section 204 et les questions bilan 100/101 sont intactes en base.

## Limites
- Relecture individuelle des réponses élèves existantes non effectuée (les identités historiques sont conservées par construction et testées).
- Sécurité routière, Français, Anglais : déjà conformes, aucun changement.
- Bilan VTC (module 4) : hors périmètre de la demande, inchangé.
- NON PUBLIÉ : en attente d'accord explicite.
