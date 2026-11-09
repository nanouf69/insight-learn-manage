# Audit de tous les bilans d’exercices VTC, TAXI, TA et VA — 09/11/2026

## Verdict et périmètre

- **29 compositions contrôlées** dans les modules 4 (VTC), 9 (TAXI), 27 (TA), 29 (VA) et les héritages de formation continue 81/82.
- **Bilans d’examen et examens blancs exclus** : modules 5, 11, 28 et 30 non projetés, non modifiés et couverts par un test spécifique.
- Correction en **projection d’affichage uniquement** : aucune question, donnée élève ou version serveur n’est réécrite.
- **Aucune migration, aucune publication, aucun mail/SMS/appel IA.**
- Le détail exhaustif des IDs, positions, sources, questions manquantes et questions historiques hors projection est dans `docs/audit-bilans-exercices-2026-11-09.json`.

## Tableau par matière

« Avant affiché » tient compte des projections déjà actives : T3P TAXI à 128 et anciennes réglementations canoniques à 98/105. « Brut » est le nombre d’objets historiques lus dans `module_editor_state` ou, pour VA/FC, dans leur source statique/parent.

| Module | Matière (exercice) | Sources et comptes | Attendu | Avant affiché (brut) | Après | Écart | Composition après |
|---|---|---|---:|---:|---:|---:|---|
| 4 | T3P (100) | 1 (66) + 2 (62) | 128 | 206 (206) | 128 | -78 | 128 historiques ; 78 hors projection |
| 4 | Gestion (101) | 60 (31) + 61 (23) + 62 (40) | 94 | 171 (171) | 94 | -77 | 91 historiques + 3 sources ; 80 hors projection |
| 4 | Sécurité routière (102) | 80 (107) + 81 (40) + 82 (64) | 211 | 241 (241) | 211 | -30 | 211 historiques ; 30 hors projection |
| 4 | Français (103) | 50 (103) | 103 | 103 (103) | 103 | 0 | Déjà conforme |
| 4 | Développement commercial (104) | 7 (66) | 66 | 78 (78) | 66 | -12 | 66 historiques ; 12 hors projection |
| 4 | Anglais (105) | 3 (53) + 4 (32) + 5 (23) + 6 (18) | 126 | 126 (126) | 126 | 0 | Déjà conforme |
| 4 | Réglementation spécifique VTC (106) | 72 (35) | 35 | 53 (53) | 35 | -18 | 35 historiques ; 18 hors projection |
| 9 | T3P (100) | 1 (66) + 2 (62) | 128 | 128 (206) | 128 | 0 | Correctif T3P précédent conservé ; 78 hors projection |
| 9 | Gestion (101) | 60 (31) + 61 (23) + 62 (40) | 94 | 171 (171) | 94 | -77 | 91 historiques + 3 sources ; 80 hors projection |
| 9 | Sécurité routière (102) | 80 (107) + 81 (40) + 82 (64) | 211 | 241 (241) | 211 | -30 | 211 historiques ; 30 hors projection |
| 9 | Français (103) | 50 (103) | 103 | 103 (103) | 103 | 0 | Déjà conforme |
| 9 | Anglais (105) | 3 (53) + 4 (32) + 5 (23) + 6 (18) | 126 | 126 (126) | 126 | 0 | Déjà conforme |
| 9 | Réglementation nationale (203) | 70 (64) + 71 (35) | 99 | 98 (99) | 99 | +1 | 91 historiques + 8 sources ; 8 hors projection |
| 9 | Réglementation locale (204) | 73 (30) + 76 (30) + 74 (29) + 75 (25) | 114 | 105 (112) | 114 | +9 | 112 historiques + 2 sources |
| 27 | Réglementation nationale (250) | 70 (64) + 71 (35) | 99 | 98 (97) | 99 | +1 | 89 historiques + 10 sources ; 8 hors projection |
| 27 | Réglementation locale (251) | 73 (30) + 76 (30) + 74 (29) + 75 (25) | 114 | 105 (152) | 114 | +9 | 111 historiques + 3 sources ; 41 hors projection |
| 29 | Français (103) | 50 (103) | 103 | 103 (103) | 103 | 0 | Déjà conforme |
| 29 | Développement commercial (104) | 7 (66) | 66 | 78 (78) | 66 | -12 | 66 historiques ; 12 hors projection |
| 29 | Anglais (105) | 3 (53) + 4 (32) + 5 (23) + 6 (18) | 126 | 126 (126) | 126 | 0 | Déjà conforme |
| 29 | Réglementation spécifique VTC (106) | 72 (35) | 35 | 53 (53) | 35 | -18 | 35 historiques ; 18 hors projection |
| 81 | T3P (100) | 1 (66) + 2 (62) | 128 | 206 (206) | 128 | -78 | Hérite VTC ; 78 hors projection |
| 81 | Sécurité routière (102) | 80 (107) + 81 (40) + 82 (64) | 211 | 241 (241) | 211 | -30 | Hérite VTC ; 30 hors projection |
| 81 | Développement commercial (104) | 7 (66) | 66 | 78 (78) | 66 | -12 | Hérite VTC ; 12 hors projection |
| 81 | Réglementation spécifique VTC (106) | 72 (35) | 35 | 53 (53) | 35 | -18 | Hérite VTC ; 18 hors projection |
| 82 | T3P (100) | 1 (66) + 2 (62) | 128 | 128 (206) | 128 | 0 | Correctif T3P précédent conservé |
| 82 | Sécurité routière (102) | 80 (107) + 81 (40) + 82 (64) | 211 | 241 (241) | 211 | -30 | Hérite TAXI ; 30 hors projection |
| 82 | Réglementation nationale (203) | 70 (64) + 71 (35) | 99 | 98 (99) | 99 | +1 | 91 historiques + 8 sources ; 8 hors projection |
| 82 | Réglementation locale (204) | 73 (30) + 76 (30) + 74 (29) + 75 (25) | 114 | 105 (112) | 114 | +9 | 112 historiques + 2 sources |
| 82 | Développement commercial (104) | 7 (66) | 66 | 66 (66) | 66 | 0 | Déjà conforme |

## Causes des écarts

- **T3P** : 78 entrées historiques en trop, déjà masquées par le correctif précédent en TAXI ; la même composition est maintenant appliquée au VTC et à son héritage FC.
- **Gestion** : 171 objets historiques contre 94 questions sources. La projection conserve 91 historiques, ajoute les 3 sources sans historique et laisse 80 objets hors affichage, sans suppression.
- **Sécurité routière** : 30 objets historiques hors sources. Les 211 sources ont des références directes et leur ordre source est conservé.
- **Développement commercial** : 12 doublons textuels historiques hors composition.
- **Réglementation spécifique VTC** : 18 doublons textuels historiques hors composition.
- **Réglementation nationale** : l’ancienne sélection canonique affichait 98 questions actives alors que les deux sources embarquées en contiennent 99. Des historiques divergents existent aussi dans le brut TAXI/TA.
- **Réglementation locale** : l’ancienne sélection canonique active affichait 105 questions alors que les quatre sources embarquées en contiennent 114. Le brut TA contenait en outre 41 objets hors sources.
- **Français, Anglais et développement commercial FC TAXI** : aucune correction de composition nécessaire.

Les sources enregistrées dans les modules de cours 2/10 ne reproduisent pas toujours les sources embarquées : comme pour T3P précédemment, la règle demandée utilise la composition statique réellement définie dans `VTC_COURS_DATA` / `TAXI_COURS_DATA`, sans modifier les modules de cours enregistrés.

## Questions sources sans identité historique

Une identité déterministe est utilisée uniquement pour afficher ces sources : `900000 + 1000 × exercice_source + id_question_source`. La projection refuse toute collision avec un ID historique. Les IDs restent stables si les questions sont réordonnées.

- **Gestion modules 4 et 9** : `62:38→962038`, `62:42→962042`, `62:43→962043`.
- **Nationale modules 9 et 82** : `70:1→970001`, `70:8→970008`, `70:62→970062`, `70:63→970063`, `70:65→970065`, `70:66→970066`, `70:68→970068`, `70:70→970070`.
- **Nationale module 27** : les huit précédentes, plus `71:7→971007` et `71:15→971015`.
- **Locale modules 9 et 82** : `74:20→974020`, `74:24→974024`.
- **Locale module 27** : `74:16→974016`, `74:18→974018`, `74:21→974021`.

Cela représente 29 identités nouvelles dans les modules principaux et 10 reprises dans l’héritage FC 82, soit 39 occurrences contrôlées sans collision. Les contenus de ces questions viennent directement de la source ; aucun historique n’est fabriqué ou réécrit.

## Contenu, doublons et ordre

Le rapprochement utilise d’abord le couple `source_exercice_id + source_question_id`, puis l’énoncé normalisé pour les anciens objets sans référence. Les différences ci-dessous sont constatées entre l’objet historique conservé et la source embarquée. **Elles ne sont pas corrigées par ce chantier**, conformément à l’interdiction de modifier énoncés et bonnes réponses.

| Bilan | Énoncés exacts différents | Choix JSON différents | Bonnes réponses différentes | Images différentes | Explications différentes |
|---|---:|---:|---:|---:|---:|
| T3P 4/9 | 55 | 128 | 30 | 33 | 0 |
| Gestion 4/9 | 40 | 91 | 24 | 52 | 0 |
| Sécurité 4/9 | 40 | 211 | 37 | 78 | 0 |
| Français 4/9 | 46 | 103 | 0 | 36 | 0 |
| Développement commercial 4/29 | 2 | 66 | 6 | 0 | 0 |
| Anglais 4/9 | 5 | 126 | 0 | 0 | 0 |
| Réglementation VTC 4/29 | 18 | 35 | 2 | 0 | 0 |
| Nationale 9 | 2 | 91 | 2 | 0 | 0 |
| Locale 9 | 0 | 112 | 13 | 0 | 0 |
| Nationale 27 | 2 | 89 | 2 | 0 | 0 |
| Locale 27 | 0 | 111 | 11 | 0 | 0 |

- Aucun doublon d’ID numérique dans les objets historiques audités.
- La Sécurité contient **46 doublons d’énoncés dans les sources elles-mêmes** : les 211 entrées sont tout de même conservées car leurs clés source sont distinctes. Il ne faut pas dédupliquer au seul texte.
- L’ordre après projection est exactement celui des exercices sources indiqués dans le tableau, puis celui des questions dans chaque exercice.
- Les IDs et positions de chaque entrée exclue sont détaillés dans le JSON, avec la cause `doublon_texte_source` ou `hors_sources_actuelles`.

## Protection des données et des historiques

- Les objets historiques conservent leurs IDs, énoncés, choix, bonnes réponses, images et explications.
- Les objets hors projection restent dans le JSON serveur.
- Avant toute sauvegarde admin, chaque exercice projeté reprend exactement sa version serveur ; seule une intention explicite peut ensuite modifier une question.
- Les copies figées continuent d’utiliser leur snapshot. Aucun examen blanc ou bilan d’examen n’est activé par la configuration.
- Empreintes relues après le correctif, identiques aux lectures initiales :

| Module | Empreinte |
|---|---|
| 2 | `0e2a131d7cccd0dab4a601058b873627` |
| 4 | `b889cc1e8863bf60be78127c8b29f657` |
| 5 — examen | `1b8c95f260badc17d218c6e8159eeade` |
| 9 | `95b7f94842846dd57dfbeba11e60c87f` |
| 10 | `537c2a7ec9498ac310088cfee0b6bc81` |
| 11 — examen | `ec1ce49237e8b6a4d50723b5b6ec7276` |
| 24 | `8fcf2470032ddce050d6bd9b89abcbdf` |
| 27 | `933ace34d56b645886d25198c161aa22` |
| 28 — examen | `62254a42335c63446cb4cc5d75b05423` |
| 29 | `c42fba875d45d8bded8b118fb2c21f19` |
| 30 — examen | `0f8368e981f5c7c15f01f189b4d1f2c6` |

Lecture seule des données liées : **785 réponses** et **203 complétions** sur les modules concernés. Aucune écriture n’a été exécutée sur ces données.

## Tests et limites

- **398 tests ciblés réussis, zéro échec**, dont 33 tests exhaustifs de composition, identité, ordre, contenu, sauvegarde et exclusion des examens.
- Projection rejouée sur une copie en lecture seule des vrais modules : **29 compositions, zéro collision d’ID, zéro omission après projection**.
- **Suite complète : 427 fichiers réussis, 2 ignorés ; 3 743 tests réussis, 13 ignorés, zéro échec**, en 336,68 s.
- Compilation de l’aperçu : **build OK**.
- Affichage navigateur admin non revérifié : la session disponible lors du chantier T3P n’avait pas le rôle admin. Aucun droit n’a été modifié.

## Fichiers du correctif

- `src/lib/bilanCoursSommeProjection.ts` : registre des sources des seuls bilans d’exercices, composition exacte, identités déterministes et restauration serveur.
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : sources statiques VTC/TAXI appliquées en mémoire après hydratation.
- `src/test/bilans-exercices-composition-sources.test.ts` : matrice exhaustive des modules/matières et protections.
- Tests T3P, projection et passages figés coordonnés avec la demande précédente.
