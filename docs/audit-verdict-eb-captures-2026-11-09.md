# Audit prioritaire des verdicts EB — 9 novembre 2026, 14:07–14:13 UTC

## Périmètre et garanties
Lecture seule des données réelles et fonctions serveur. Aucun RPC métier exécuté, aucune correction, question, réponse, note, progression, signature, snapshot ou tentative modifiés. Aucun déploiement, publication, migration ou modification de code actif. Chantier QRC global et protections EB3 intacts. Seuls ce rapport et le suivi des tâches sont ajoutés.

## Captures identifiées

### Ilies MEMDOUH — TAXI EB1 et EB2, tentative 1
Identifiant dossier : `7dac2ec5-46f4-46f9-9573-2bf245041601`.
Sessions : TAXI/TA du 26 octobre au 16 novembre ; VTC/TAXI du 2 au 13 novembre.

| Examen | A | B | C | D | E | F | G | Moyenne pondérée |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| EB1-TAXI | 14,5 | 15 | 12 | 15 | 6 | 16,5 | 19 | 251/17 = 14,7647 → 14,8 |
| EB2-TAXI | 17,5 | 17,5 | 13 | 9 | 4 | 14,5 | 12 | 228/17 = 13,4118 → 13,4 |

Les 14 résultats `core_exam_results` sont `definitif`, `qrc_restantes=0`. Les copies QRC et leurs notes serveur correspondent exactement aux captures ; les anciennes lignes ne sont PAS la source finale de certaines notes (ex. EB1 F ancien 15,5 contre serveur corrigé 16,5 ; G ancien 15 contre serveur 19 ; EB2 A ancien 13,5 contre serveur 17,5, D ancien 13,5 contre serveur 9). Ces écarts expliquent pourquoi une recherche limitée aux anciennes notes ne retrouvait pas les captures ; ils ne prouvent pas une perte ou une corruption.

**Résultat mathématique prouvé : aucune matière éliminatoire dans ces deux ensembles.** Sous la règle enregistrée, moyenne ≥10, sept matières définitives et aucune éliminatoire, ces deux ensembles satisfont les critères. Cela n'a donné lieu à aucune écriture ou changement de statut réel.

### Pogos SARKISIAN — identification par les deux autres ensembles
EB1-TAXI : A8,5 B6 C5 D7 E7 F9 G9, sept matières définitives ; somme pondérée 127,5/17 = 7,5. **Échec légitime par moyenne <10 et C=5<6 ; seules les mentions A/B/D/E/F/G éliminatoires sont fausses.**

EB2-TAXI : A13 B10 C11, D4 et E4 au contrôle, F7/G10 provisoires. La capture D « en attente » peut précéder sa correction du 09/11 à 14:02:37 UTC ; la capture n'étant pas datée, ce rattachement chronologique n'est pas affirmé comme certain.

Contrôle direct `qrc_instances_v2` : A5/B2/D3 QRC toutes corrigées ; F4 et G2 QRC toujours `en_attente`, notes et dates de correction absentes. Passage F `5c4b5326-a315-4fd9-8836-ed771f10dbeb`, G `ecdfd479-fb2f-4d3e-8f76-aee7605f43d7`.
**L'affirmation « toutes corrigées » n'est donc pas confirmée pour ces deux copies précises.** Impossible de les déclarer définitives sans preuves ; rechercher une éventuelle correction sur une autre copie/identité relève du chantier distinct, non modifié ici.

## Cause précise du faux échec : prouvée et reproduite
1. `src/lib/coreExamPublication.ts:131–153` lit `note_eliminatoire` depuis la matière du snapshot V2. Les snapshots des 14 passages de MEMDOUH contiennent coefficient et `note_sur=20`, mais aucun seuil éliminatoire : lecture = `null`.
2. `src/components/cours-en-ligne/ExamenBlancsListe.tsx:623–631` appelle `computeMatiereScoreForAttempt` avec note, maximum et `__core`, **sans `reussi`**. Même omission dans l'affichage matière `:720–729`.
3. `src/components/cours-en-ligne/examens-blancs-scoring.ts:329–337` : note serveur définitive disponible, seuil figé absent ⇒ `Boolean(row.reussi)` ⇒ `Boolean(undefined)` ⇒ `false`. Le seuil matière pourtant disponible n'est pas utilisé dans cette branche.
4. `:439–455` : la moyenne utilise correctement les notes et coefficients, mais tout `admis=false` devient une éliminatoire ; cela force l'échec global. La carte `ExamenBlancsListe.tsx:634–655` affiche ce faux verdict.

**Reproduction avec les fonctions réelles, appel exactement construit comme la carte :**
```
14.8, eliminatoires=[A,B,C,D,E,F,G], admisGlobal=false
13.4, eliminatoires=[A,B,C,D,E,F,G], admisGlobal=false
```
L'appel détaillé `computeResultatMatiereScore` avec la matière et ses seuils numériques donne, pour ces mêmes notes, zéro éliminatoire et `admisGlobal=true`. Les deux chemins ne sont donc pas alignés malgré le commentaire du code.

Le fichier public observé `index-BbNPGt9M.js` contient exactement l'omission et le repli `!!t.reussi` du helper ; ce n'est pas seulement un défaut de l'aperçu. Une capture d'une carte n'autorise pas à affirmer le même défaut de seuil dans chaque écran détaillé.

## Barème et seuils
Coefficients A/B/C/D/E/F/G = **3/2/3/2/1/3/3**, somme **17**. Éliminatoire strictement **<6/20**, anglais **<4/20** ; égalités 6 et 4 admises. Tous les seuils administratifs actuels VTC/TAXI EB1–EB6 sont numériques et conformes. Les 14 snapshots V2 de MEMDOUH attestent les coefficients correspondants.

Référence institutionnelle actuelle : [CMA, modalités d'évaluation](https://www.cma-hautsdefrance.fr/examen-taxi-et-vtc/) et [règlement national CMA](https://www.artisanat.fr/media/2426/download). Ce contrôle ne modifie ni l'ordre ni les intitulés F/G de l'application.

`computeAdmisForMatiere`, utils `:471–479`, compare correctement une note ramenée /20. Aucun échange max/seuil ni double division établi ici. `core_exam_results.score` est déjà /20, correctement lu sans renormalisation par `coreExamPublication.ts:123–127`.

Attention : la moyenne globale est arrondie au dixième AVANT la comparaison à 10 (`scoring.ts:449–453`). Une moyenne exacte légèrement sous 10 peut donc satisfaire le test arrondi : risque distinct de faux positif, non impliqué dans les deux captures >13, aucun changement autorisé ou appliqué. À tester et soumettre séparément avant toute correction de cette règle.

## Étendue
Contrôle agrégé serveur, 24 identités EB1–EB6 VTC/TAXI/TA/VA : **2 616 passages V2 non techniques, 173 élèves distincts ; 2 413 définitifs ; aucun des 2 616 snapshots ne contient `note_eliminatoire` ou `noteEliminatoire` dans sa première matière.**
Cela établit une exposition au repli défectueux, PAS 2 616 faux échecs vus en interface : rapprochement exact, disponibilité du résultat, tentatives sélectionnées et éventuelles exclusions doivent être respectés.

| Identité | Passages | Définitifs |
|---|---:|---:|
| EB1 VTC / TAXI | 668 / 76 | 625 / 70 |
| EB2 VTC / TAXI | 432 / 109 | 418 / 101 |
| EB3 VTC / TAXI | 292 / 39 | 285 / 39 |
| EB4 VTC / TAXI | 342 / 46 | 319 / 39 |
| EB5 VTC / TAXI | 231 / 37 | 217 / 31 |
| EB6 VTC / TAXI | 174 / 41 | 159 / 37 |

Les autres identités TA/VA sont également auditées ; ne pas leur imposer automatiquement le dénominateur sept matières/17.

## Corrections, recalcul, caches et attente
Fonctions réelles lues : `core_correct_qrc_publish` appelle `core_correct_qrc` puis `core_recalc_result` pour le même `attempt_id`. Le recalcul lit `core_note_attempt`, monte `result_revision`, définit `definitif` seulement si aucune QRC ne reste, sinon `provisoire`. La lecture choisit la révision maximale et compte aussi les QRC non corrigées : `coreExamPublication.ts:100–129`.

Le cache IA indexé par matière dans `ExamenBlancsResultats.tsx:118–128,525` ne s'exécute pas comme source de note lorsque le résultat V2 définitif est retenu par le helper : **pas de preuve qu'il cause les faux éliminatoires observés**. Realtime hébergé, navigateur réel du stagiaire et réception d'une correction en onglet déjà ouvert NON PROUVÉS dans cet audit. Aucun compte utilisé pour provoquer une correction réelle.

Le code assimile toujours `!admisGlobal` à échec dans des écrans détaillés, même si les matières sont incomplètes, et collecte des `!admis` sans distinguer inconnu/absent ; risque d'affichage distinct déjà identifié. Ne pas transformer pending en réussite ni recalculer des questions anciennes pour lever une attente.

## Tests exécutés
**32/32 PASS** :
- `statut-reussi-regle-unique.test.ts` : 7
- `source-unique-publication-nouveau-moteur.test.ts` : 15
- `eb-pending-mixte-core-ancien.test.ts` : 4
- `qrc-publication-note-bloquee.test.ts` : 6

**Deux reproductions du défaut exécutées** avec le helper actif : captures 14,8 et 13,4 reproduites exactement, sept éliminatoires et faux échec. Ce sont des preuves du bug, PAS des tests d'une correction livrée.
Calcul détaillé avec seuils 6/4 exécuté : les deux ensembles satisfont la règle, sans mutation.
Scripts temporaires : `/tmp/eb-verdict-audit/`. Aucune vérification bout-en-bout connectée ni appareil physique : NON PROUVÉ ; source et code public établissent le chemin fautif mais ne remplacent pas une validation navigateur après correction.

## Plan minimal proposé — non appliqué
1. Dans le helper partagé de score d'une tentative, résoudre le seuil depuis le snapshot si valide, sinon depuis la règle numérique vérifiée de la matière ; ne jamais convertir l'absence du champ `reussi` en échec. Pas de changement de points, questions, copies ou notes.
2. Si aucun seuil fiable n'est disponible, exposer un verdict indéterminé, jamais une réussite ou une éliminatoire inventée. Les cartes et écrans détaillés utilisent le même verdict de lecture.
3. Afficher une éliminatoire uniquement pour une note définitive prouvée sous son seuil ; distinguer non terminé/attente/lecture impossible. Un passage V2 en attente ne se débloque jamais avec une vieille note.
4. Ajouter les régressions : les deux ensembles MEMDOUH ; SARKISIAN EB1 reste échoué avec C seule ; EB2 reste en attente avec six QRC F/G ; frontières 6/4, matière absente, seuil absent/chaîne/invalide, vieux `reussi=false`, lecture refusée, révision serveur, rechargement, sélection même copie, 24 identités et parcours adaptés TA/VA. Test séparé de la frontière moyenne exacte/arrondie à soumettre avant changement de règle.
5. Valider PC/tablette/téléphone avec lectures réelles sans notation, rechargement et correction synthétique isolée ; contrôler le diff puis attendre autorisation explicite avant publication. Aucun correcteur historique ni protection EB3 touchés.

**Aucune migration nécessaire pour le faux échec de carte prouvé.** Toute nouvelle adaptation des identités de correction QRC reste hors de cette correction et requiert son propre accord.