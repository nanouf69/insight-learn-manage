# Audit des oublis de candidats — Correction QRC (10/11/2026, lecture seule)

Aucune écriture, aucune publication. Comptes techniques (`comptes_test_techniques`), EB99 et tentatives neutralisées exclus.
Détail nominatif : `/mnt/documents/audit-oublis-candidats-qrc-2026-11-10.csv` (1 684 copies matière ayant au moins une QRC écrite, hors nouveau correcteur ou en ancien circuit).

## 1. Nouveau correcteur V2 (exam_attempts_v2) — complet et cohérent
| Filière | Passages terminés | QRC | Corrigées | En attente | dont non répondues | Élèves en attente |
|---|---|---|---|---|---|---|
| VTC | 2 128 | 5 204 | 4 915 | 289 | 39 | 33 |
| TAXI | 337 | 841 | 769 | 72 | 6 | 8 |
| TA | 111 | 337 | 171 | 166 | 10 | 10 |
| VA | 19 | 54 | 54 | 0 | 0 | 0 |

- Tous affichés (lecture paginée, journée/soir/e-learning/non déterminée), aucun résultat manquant.
- 0 passage « toutes QRC corrigées » non définitif ; 0 définitif avec QRC en attente ; `qrc_restantes` exact partout.
- 0 note hors barème, 0 négative, 0 QRC sans barème figé (le serveur n'empêche pourtant pas une note hors barème : défaut connu de `core_correct_qrc`).
- En cours (non affichés à corriger, normal) : VTC 38 (26 élèves), TAXI 6, TA 5.

## 2. EB2 VTC historique (consultation V2) — visible
784 copies, 99 élèves ; 373 corrections humaines sur 121 copies : 121/121 dernières corrections concordent avec la note enregistrée.

## 3. EB3 ancien circuit (visible seulement sous « ANCIEN CIRCUIT »)
525 copies hors V2 ; avec QRC écrites : VTC 261 (56 élèves), TAXI 58 (13), TA 26 (12), VA 2. Sans passage V2 équivalent : VTC 258, TAXI 58, TA 12.
Les 68 copies de l'audit précédent sont un sous-ensemble (périmètre « récentes, QRC répondues »).
Récents : SMAIL Sifeddine (VTC, 04–05/11), CHEMOUN Mourad (TAXI, 01–09/11), MEMDOUH, HAMDI, HADDOU (TAXI 30/10), WADOOD Abdul (VTC soir 15/10), NESAR, SAWADOGO, Benoit Jean (VTC), BELARBI, RAYMAN, SOUICI, Dakhlaoui, Pndukyan (TA).
Doublon d'affichage : les copies EB3 déjà migrées V2 (338) apparaissent aussi dans la liste « ancien circuit ».

## 4. OUBLI MAJEUR : copies absentes de la grille (recherche par nom seulement)
2 138 copies matière (mars → 23/09/2026), dont **1 312 avec QRC écrites (4 380 QRC)**, jamais migrées, aucune correction humaine (correction IA par mots-clés seulement) :
- VTC : EB1 572 copies/1 813 QRC (92 élèves), EB4 133/525, EB5 133/426, EB6 148/486 ;
- TAXI : EB1-TAXI 82/261, EB2-TAXI 71/236, EB4-TAXI 39/147, EB5-TAXI 39/123, EB6-TAXI 18/57 ;
- TA : 87 copies/266 QRC ; VA : 15/40.
- Par créneau (copies avec QRC) : VTC soir 384, VTC journée 239, VTC journée+soir 15, VTC sans session 348 ; TAXI journée 130, sans session 119.
Cause : `listerGroupesCrm` ne lit que `exam_attempts_v2`, EB2 VTC (consultation) et `eb3%` ; tous les autres résultats historiques non migrés n'ont aucune entrée.
Leurs questions ne sont pas stockées dans la copie (`details.questions` vide) : QRC identifiables seulement par réponse texte ; énoncé/barème à rattacher au contenu figé, sinon NON PROUVÉ.

## 5. Inscrits sans aucune copie (sessions théoriques depuis 01/09)
Sept 2026 : DALI Azouz, EL HAJI Salem (TAXI/TA), OUERFELLI Isam (VTC soir), GARNAUD Jeremy, Hendi Philippe, MOUWANOU BIAHMBA Glen Christofer, toure mohamed lamine (VTC journée). Sessions de novembre et 26/10 TAXI/TA : 0. Formations continues : normal (pas d'EB).

## Plan correctif (accord requis à chaque étape)
1. Afficher dans la même grille V2, en consultation lecture seule (modèle EB2), les copies EB1/EB4/EB5/EB6 VTC, EB*-TAXI, TA/VA non migrées, et EB3 ancien circuit ; dédoublonner EB3 migrés.
2. Notation uniquement via RPC protégée type `qrc_historique_noter` (verrou copie, identité prouvée, append-only), généralisée par examen avec barème figé prouvé ; copies sans preuve = « À VÉRIFIER », jamais notées.
3. Garde serveur refusant toute note hors barème dans `core_correct_qrc` (migration).
4. Décider si les notes IA non validées s'affichent « en attente » (affichage seul).

## Limites
- Créneau journée/soir déduit des inscriptions couvrant la date ; « sans session » = élève hors session à cette date (e-learning, ancien dossier).
- Rapprochement « miroir V2 natif » par élève+examen+matière : indicatif, pas une preuve d'identité.
- QRC des copies historiques détectées par réponse texte non vide ; une QRC non répondue n'y est pas comptée.
- Pas de rejeu d'écran pour chaque élève ; pas de recalcul élève par élève des 7 matières/éliminatoires historiques.
