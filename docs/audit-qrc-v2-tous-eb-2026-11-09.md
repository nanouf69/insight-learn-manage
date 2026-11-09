# Audit global QRC EB1–EB6 dans Correction QRC V2 — 09/11 13:52 UTC

Lecture seule. Aucune écriture, migration, publication ou modification de code fonctionnel.

## Constat
- Le correcteur V2 n'affiche et ne note que les copies présentes dans le nouveau système (tentatives V2 + une fiche par QRC). La notation (`core_correct_qrc`) refuse toute QRC sans fiche V2.
- 4 591 résultats matière historiques EB1–EB6 (toutes filières) n'ont aucune copie V2 liée par result_id. Parmi eux : 2 374 avec remise prouvée même tentative, 1 079 avec questions figées complètes, 545 depuis le 01/11. Ces chiffres incluent d'éventuelles écritures techniques multiples d'un même passage : ce ne sont pas des copies uniques.
- Dans la version publique, EB3 (et EB2 depuis le tour précédent) passent par l'ancien correcteur intégré ; l'aperçu a retiré EB2 seulement. Retirer EB3 maintenant ferait disparaître ses QRC historiques : non fait.

## Par examen (résultats historiques non liés / QRC dedans / élèves ; tentatives V2 / QRC V2 / QRC V2 en attente)
| Examen | Hist. non liés | QRC | Élèves | V2 tent. | V2 QRC | V2 attente |
|---|---:|---:|---:|---:|---:|---:|
| EB1 | 1429 | 919 | 140 | 687 | 1583 | 127 |
| EB1-TAXI | 169 | 110 | 24 | 80 | 192 | 17 |
| eb1-ta | 77 | 82 | 18 | 31 | 94 | 40 |
| eb1-va | 16 | 0 | 2 | 3 | 8 | 0 |
| EB2 | 635 | 208 | 81 | 432 | 1099 | 28 |
| EB2-TAXI | 164 | 150 | 20 | 111 | 254 | 38 |
| eb2-ta | 39 | 54 | 13 | 28 | 83 | 29 |
| eb2-va | 6 | 0 | 2 | 0 | 0 | 0 |
| EB3 | 412 | 221 | 67 | 292 | 759 | 12 |
| EB3-TAXI | 84 | 39 | 14 | 39 | 105 | 0 |
| eb3-ta | 28 | 40 | 11 | 22 (2 tests) | 58 | 30 |
| eb3-va | 2 | 6 | 1 | 4 | 12 | 0 |
| EB4 | 427 | 416 | 49 | 354 (4 tests) | 838 | 69 |
| EB4-TAXI | 80 | 50 | 11 | 47 | 120 | 20 |
| eb4-ta | 21 | 30 | 10 | 13 | 40 | 24 |
| eb4-va | 2 | 6 | 1 | 4 | 10 | 0 |
| EB5 | 444 | 345 | 48 | 240 (3 tests) | 527 | 46 |
| EB5-TAXI | 78 | 56 | 12 | 38 | 94 | 18 |
| eb5-ta | 24 | 24 | 10 | 11 | 32 | 18 |
| eb5-va | 4 | 6 | 2 | 2 | 6 | 0 |
| EB6 | 367 | 278 | 48 | 179 (1 test) | 419 | 48 |
| EB6-TAXI | 50 | 43 | 7 | 42 | 107 | 12 |
| eb6-ta | 29 | 26 | 10 | 11 | 26 | 21 |
| eb6-va | 3 | 8 | 1 | 6 | 18 | 0 |

## Pourquoi STOP
Rendre ces QRC corrigeables dans le même workflow V2 exige, côté serveur :
1. une lecture serveur unifiée (V2 natif + historique non lié) avec identité immuable résultat + matière + question + tentative, remise prouvée, questions/barème figés ; refus explicite si preuve insuffisante ;
2. une fonction de notation admin pour ces identités historiques : append-only, idempotente, verrouillée, barème figé, résultat révisé séparément, relecture.

C'est une migration et, à l'usage, une écriture de corrections sur des copies élèves : hors autorisation selon la consigne. L'alternative « importer en V2 » (fonction existante `core_import_passage_finalise`) crée des copies/fiches : refusée aussi sans accord explicite.

## Proposé après accord
Prototype sur PostgreSQL jetable (lecture unifiée + notation historique), tests par examen/filière (24 identités ci-dessus), pagination >1 000, double clic, concurrence, relecture ; puis écran V2 unique, retrait de l'ancien correcteur intégré pour EB2/EB3 seulement quand tout est visible ; puis revue du diff et publication.
