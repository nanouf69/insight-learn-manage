# Audit QRC → note matière → score global → admission — 06/11/2026

## Périmètre et interdictions respectées

- Lecture seule de la production : EB1–EB6 VTC, TAXI et TA.
- Exclusion des tentatives de test, comptes techniques, neutralisées et non terminées.
- Calcul à blanc par `core_note_attempt`, sur le snapshot de chaque tentative ; aucune lecture du sujet courant pour remplacer le snapshot.
- Aucune écriture de réponse, copie, correction, note, progression ou résultat ; aucune migration de régularisation ; aucune publication.

## Résultat exhaustif

| Contrôle | Résultat |
|---|---:|
| Examens contrôlés | 18 |
| Tentatives terminées éligibles | 2 278 |
| Tentatives natives | 824 |
| QRC corrigées dans le périmètre | 5 160 |
| Tentatives avec QRC corrigées | 1 592 |
| Tentatives recalculables sur snapshot avec barème | 1 211 |
| Anciens snapshots sans barème recalculable (`total = 0`) | 1 067 — note historique conservée |
| Corrections validées postérieures au dernier résultat recalculé | **0** |
| Écarts numériques sur tentatives natives | **0** |
| Passages depuis le 01/10 avec écart de score | **0 / 691** |
| Anciennes copies importées avec écart numérique | **11** |
| Résultat terminé sans ligne `core_exam_results` | **1, encore provisoire avec 2 QRC en attente** |

Les 1 447 notes QRC supérieures à un barème nul appartiennent uniquement aux snapshots historiques non recalculables. Aucun dépassement de barème n'existe parmi les 1 211 tentatives recalculables.

## Cas demandés : notes officielles et calcul global à blanc

Coefficients du snapshot EB1 : T3P 3, Gestion 2, Sécurité 3, Français 2, Anglais 1, Réglementation VTC 3, Réglementation VTC 2 = 3 ; total 17.

| Élève | Identifiant apprenant | Matières définitives | Note serveur à régulariser | Moyenne officielle | Décision officielle |
|---|---|---:|---:|---:|---|
| BENNANI Meriem | `63940579-542d-48f7-ab1e-fd0ee8101a6b` | 7/7 | **0** | **9,6/20** (162,5/17) | **NON ADMIS**, moyenne < 10 |
| MALKI Ahmed | `10c15d2c-221f-428d-8076-fe9b1f43f7ab` | 7/7 | **0** | **9,1/20** (155,5/17) | **NON ADMIS**, moyenne < 10 et T3P 3,5 |
| SELMI Kais | `e912ca30-7d7f-4fa9-87ba-e4755fcad023` | 7/7 | **0** | **6,0/20** (102/17) | **NON ADMIS** |

BENNANI Gestion : tentative `86f51f2d-e79d-4fef-9fd0-69073587066d`, Q1 validée 2/2 et Q2 0/2 ; 9 points QCM + 2 points QRC = **11/20**, identique au résultat persisté. Aucun point du correcteur ne manque.

Divergence distincte, déjà connue : les anciennes fiches Sécurité affichent BENNANI 11 au lieu de 9, MALKI 11 au lieu de 8 et SELMI 8 au lieu de 6. Il s'agit d'un conflit de corrigé QCM, pas d'une omission de correction QRC. Les moyennes des anciennes fiches seraient respectivement 9,9, 9,7 et 6,4, contre 9,6, 9,1 et 6,0 avec les résultats officiels du snapshot. La décision reste NON ADMIS dans les deux lectures. Aucun choix de corrigé n'a été modifié.

## Onze écarts anciens : aucun ne justifie une régularisation automatique

Tous proviennent de copies importées avec `source_historique.result_id`. Les valeurs « après » sont seulement un calcul à blanc, jamais une écriture proposée en masse.

| Élève | Apprenant | Tentative | Examen / matière | Persisté | Calcul à blanc | Analyse |
|---|---|---|---|---:|---:|---|
| Diallo Thierno | `8313311b-3d05-4057-a8f8-3b4f7d64db46` | `3752df88-3cee-45e3-854a-69853f07a183` | EB1 / T3P | 8,4 | 8,42 | arrondi historique |
| CHERNI Tarek | `8fc60874-fa5d-4fed-aced-da946fbf1cca` | `6cd7784a-5ffa-4c6a-b977-0cdce8c6185b` | EB2 / Gestion | 8,4 | 8,42 | arrondi historique |
| DIOP Bernard | `6814e194-68c6-4997-808c-1082fa0b633f` | `4cd9230b-9597-4d7f-aa97-b7691bbeec8c` | EB2 / Gestion | 11,6 | 11,58 | arrondi historique ; coefficient snapshot absent |
| DREID Naim | `150ea9ee-c972-462d-a65c-c53c21584880` | `18f833af-6142-4e18-8140-7bda260f3cba` | EB2 / Gestion | 11,6 | 11,58 | arrondi historique |
| SAWADOGO Moumouni | `0760af63-eb39-4102-811f-96d09adedffa` | `1fe578c8-ae23-4197-97c7-69f051ee62cd` | EB2 / T3P | 7,9 | 7,89 | arrondi historique |
| SAWADOGO Moumouni | identique | `37c5283c-ab4a-4261-9ae4-49a33dec968f` | EB2 / Gestion | 9,5 | 9,47 | arrondi historique |
| BAISSA Meryem | `8eb330f2-41b9-4d87-be8b-448dcc801894` | `b74b8bae-7b5c-487b-9a41-6f1cdfc2e7da` | EB4 / Réglementation VTC | 6,3 | 6,32 | arrondi historique |
| BAISSA Meryem | identique | `7dbce4df-803c-4031-ae2f-893dd4472445` | EB4 / Réglementation VTC 2 | 4,4 | 4,44 | arrondi historique |
| LALEYE Fiacre | `1c0a1e21-429a-4913-a08d-8d75b230a4cb` | `65fba65b-147a-4595-b466-6a3b400aae51` | EB4-TA / Réglementation TAXI 2 | 13,3 | 13,33 | arrondi historique |
| DAGHARI Yanis | `84fface7-0a3e-4186-9561-5c52ecf07fbf` | `454eb2db-6724-4589-90e3-35a3b3db524e` | EB6 / T3P | 0,5 | 0,53 | arrondi historique ; passage incomplet |
| BAISSA Meryem | `8eb330f2-41b9-4d87-be8b-448dcc801894` | `bcdc3d9b-437a-47ad-9e97-e4b6e6cbb85e` | EB4 / Français | 4 | 0 | **à arbitrer**, ancienne copie importée ; les 7 QCM du snapshot ont des réponses enregistrées différentes des clés figées, sans correction manuelle QRC expliquant l'écart |

Effet théorique des seuls arrondis sur le global : inférieur à 0,01 point pour Diallo, CHERNI, DIOP, DREID et DAGHARI ; environ −0,01 pour SAWADOGO ; +0,02 pour LALEYE. Aucun changement d'admission démontré. Pour BAISSA, les trois écarts représentent environ −0,46 point pondéré sur le barème VTC, mais les doublons historiques et l'arbitrage Français interdisent d'en déduire une régularisation sûre ; sa décision reste non admis. DIOP ne doit pas recevoir de moyenne recalculée sans coefficient figé.

Autre cas : FERREIRA David, apprenant `26268690-95aa-438a-a577-17e04113c95f`, tentative EB3-TAXI `af1448cd-ad00-4c5a-98fd-0d89e005cdda`, matière Réglementation TAXI 2. Le calcul à blanc donne 10/20 provisoire avec 2 QRC en attente et aucune ligne de résultat officiel. Ce n'est pas une note définitive à publier ou régulariser.

**Tableau des notes réellement validées pour régularisation : 0 ligne.**

## Correctif minimal préparé dans l'aperçu

`core_exam_results.score` contient déjà la note sur 20. Le lecteur `src/lib/coreExamPublication.ts` la divisait encore par `total`, barème brut du snapshot. Le correctif conserve directement `score` après validation des nombres et du barème positif.

Exemple : serveur `score = 12`, `total = 25` ; ancien lecteur 9,6/20, lecteur corrigé 12/20. Le défaut était invisible quand `total = 20`, ce qui est le cas des trois cas nommés.

La note officielle reste prioritaire dans `computeResultatMatiereScore` et alimente `computeMoyenneExamen` : coefficients, matières manquantes et seuils éliminatoires demeurent appliqués. Aucun recalcul déterministe ne remplace le correcteur.

## Procédure conditionnelle si une future ligne est prouvée erronée

Aucune migration n'est créée tant que le tableau validé est vide. Si une ligne native précise est ensuite confirmée :

1. figer la liste exacte des `attempt_id` avec élève, examen, matière, version, empreinte, révision du résultat et justification question par question ;
2. exclure tests, neutralisées, copies importées non recalculables, examens en cours et toute identité ambiguë ;
3. recalculer uniquement avec `core_note_attempt` sur le même snapshot et les mêmes corrections validées, jamais avec le corrigé actuel ou déterministe ;
4. contrôler en transaction que la révision lue est inchangée, écrire une nouvelle révision de résultat avec l'ancien et le nouveau score, la provenance QCM/QRC et l'identifiant de l'opération ;
5. journaliser avant/après dans l'audit, rendre l'opération idempotente et conserver l'ancien résultat pour retour arrière ;
6. recalculer le global à blanc avec les coefficients figés et faire valider séparément tout changement d'admission avant écriture ;
7. relire chaque ligne après transaction et vérifier qu'aucune réponse, copie, QRC ou autre tentative n'a changé.

Toute exécution sur des notes réelles exige une confirmation distincte après remise de cette liste.

## Vérifications

- 54 tests ciblés initiaux, puis **406 tests QRC/notes/scores/source unique réussis** dans la série élargie.
- Cas BENNANI, MALKI, SELMI, notes partielles, coefficients, transitions admis/non admis, matière manquante et historique couverts.
- TypeScript : réussi.
- Aperçu : build OK.
- Publication : **non effectuée**. Les autres changements de l'aperçu n'ont pas été validés pour une publication globale.
