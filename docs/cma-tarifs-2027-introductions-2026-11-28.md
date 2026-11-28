# Tarifs CMA 2027 — introductions TAXI/VTC et passerelles

## Décision appliquée

Demande Naoufal GUENICHI du 28/11/2026 : dans les modules Introduction concernés, conserver les montants 2026 et afficher les tarifs applicables à partir du **1er janvier 2027** :

- examen complet TAXI/VTC : **241 € en 2026 ; 246 € à partir du 1er janvier 2027** ;
- examen passerelle TA/VA : **168 € en 2026 ; 171 € à partir du 1er janvier 2027** ;
- épreuve pratique seule : **118 € en 2026 ; 120 € à partir du 1er janvier 2027**.

Aucun autre tarif, calcul CRM, paiement, document signé, réponse, note ou élément de progression n'a été modifié. Aucune migration et aucune publication web.

## Occurrences modifiées

Les textes partagés sont définis dans `src/lib/fraisExamenCma.ts` et utilisés par le cours de bienvenue des six introductions dans `ModuleDetailView.tsx`.

| Module | Introduction | Source affichée | Modification |
| --- | --- | --- | --- |
| 1 | Présentiel TAXI/VTC | Code + ligne Cloud autoritaire | Texte existant complété : 246 € et 120 €, date du 01/01/2027 |
| 26 | E-learning TAXI/VTC | Code, aucune ligne Cloud existante | Même texte partagé : 246 € et 120 €, date du 01/01/2027 |
| 31 | Passerelle TA présentiel | Code, aucune ligne Cloud existante | Ajout : 171 € et 120 €, date du 01/01/2027 |
| 32 | Passerelle TA e-learning | Code + ligne Cloud autoritaire | Ajout : 171 € et 120 €, date du 01/01/2027 |
| 33 | Passerelle VA présentiel | Code, aucune ligne Cloud existante | Ajout : 171 € et 120 €, date du 01/01/2027 |
| 34 | Passerelle VA e-learning | Code, aucune ligne Cloud existante | Ajout : 171 € et 120 €, date du 01/01/2027 |

Deux lignes Cloud seulement ont été enregistrées, modules **1 et 32**, avec contrôle de la version lue et du texte ancien exact. Les quatre autres modules utilisent la source code, faute de ligne Cloud existante ; aucune ligne n'a été créée.

## Quiz et corrigés associés

Recherche dans les exercices des six modules, `quiz_questions`, `canonical_questions` et `quiz_questions_overrides` :

- aucune question ou correction ne contient les anciens tarifs **241 €, 168 € ou 118 €** ;
- le quiz Introduction du module 1, exercice 1, question 5, porte sur le **repassage théorique après échec**, avec la réponse B « 240€ » : il ne s'agit pas de l'examen complet 2027 ; question, choix et bonne réponse sont inchangés ;
- les mentions de repassage pratique « environ 200€ » et de location « environ 80€ » sont également distinctes et inchangées ;
- aucun corrigé n'a été inventé et aucune réponse apprenant n'a été modifiée.

## Vérification Cloud avant/après

- Module 1 : empreinte du contenu `1e8974f4cfdbee45b93997fb9deccabe` → `d8ff3af1d9363852a7e65369b55e629f`.
- Module 32 : `671798ac966dbede2c996d2575644869` → `f773d5fc0259b71db67dd21d07a2679a`.
- En rétablissant uniquement les deux anciennes descriptions dans une requête de contrôle, les deux empreintes précédentes sont retrouvées exactement : seules ces descriptions ont changé.
- Empreinte globale reconstituée des 62 modules : `105f747ccb17e426c9c32e79b496ce37`, identique à la mesure avant écriture ; aucun autre module n'a changé.
- Les 383 versions d'examen conservent la même empreinte globale `5f1d8bb0d3544ee83f75972701c4d34e`.
- Les versions figées antérieures des modules 1 et 32 restent présentes et inchangées, y compris le texte 2026 du 25/11.
- Compteurs avant/après identiques : 1 693 lignes de complétion, 7 787 remises de quiz et 57 529 états de réponse ; dates maxima également identiques. Aucune écriture apprenant effectuée.

## Tests et limites

- **PASS : 17/17 tests ciblés** `frais-examen-cma.test.ts`, dont les trois nouveaux montants, la date d'application et la distinction avec le repassage.
- **PASS : typecheck TypeScript**.
- **PASS : build de production** ; seuls avertissements existants de taille de lots et dépendances navigateur.
- **NON PROUVÉ : écran élève réel**. Le compte existant ouvre « Accès non disponible », accès expiré le 30/04/2026. Aucun compte ni droit n'a été créé pour contourner cette limite. La source d'affichage et les deux contenus Cloud autoritaires ont néanmoins été relus.

Les autres écrans et calculs tarifaires hors modules Introduction n'ont pas été modifiés. Aucune publication automatique.
