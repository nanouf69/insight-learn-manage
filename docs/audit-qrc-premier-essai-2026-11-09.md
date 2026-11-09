# Audit QRC — erreur au premier essai, 09/11/2026

## Résultat
Correctif préparé et contrôlé en aperçu, NON PUBLIÉ. Aucune migration, correction de note, réponse, historique, inscription, progression ou question. Tous les appels d’écriture applicatifs ont été bloqués pendant les parcours navigateur ; seules les lectures et la vérification des droits ont été autorisées.

La question est `t3p:1`, EB1 / EB1-TAXI : « Je me fais contrôler sur la route quels documents communs aux trois professions dois-je présenter aux forces de l'ordre ? (QRC) ». Barème figé 2 points. EB2 comporte un énoncé semblable sous `t3p:5`, expressément non agrégé.

## Définition conservée
Précision explicite utilisateur 09/11 à 17:13 UTC : QCM réussi seulement avec toutes les bonnes propositions et aucune mauvaise ; QRC réussie seulement avec la totalité des points. 0/2 et 1/2 = chacun un échec statistique, 2/2 = zéro échec ; non corrigée exclue jusqu’à correction. Le calcul préparé respectait déjà cette définition : aucun changement des notes, barèmes ou verdicts n’est nécessaire.

Contrôle complémentaire : 86 tests exécutés PASS (cinq fichiers), dont six cas explicites supplémentaires A+B partiel/exact/avec mauvaise proposition et QRC 0/2, 1/2, 2/2, avec conservation intégrale des preuves. En attente, correction tardive et essais suivants sont également testés. Rejeu des lectures réelles conservées de l’audit : mêmes taux 3/5, 7/14, 8/18 ; pas de nouvel écart induit par cette précision. Aucun nouveau parcours public n’a été exécuté pour ce complément ; les preuves publiques et aperçu du premier audit restent celles décrites ci-dessous. Publication séparée NON EFFECTUÉE, attend validation.

Une observation par apprenant et question dans le périmètre d’examen existant. QRC : réponse de la première copie soumise, note humaine prioritaire ou reçu IA appliqué à la même instance/note/barème ; 2/2 = correcte, toute note partielle = erreur. Jamais la première lettre tapée. Non corrigée, non soumise, ambiguë ou ancienne non prouvée : hors dénominateur, jamais fausse. QCM : premier choix journalisé prouvé, selon la règle existante, inchangé.

Les groupes représentent les inscrits actuellement éligibles des sessions CRM ; une inscription croisée apparaît dans chaque session concernée mais une seule fois au global. L’audit ne remplace pas cette règle par une règle de date de passage dans la session.

## Avant/après prouvé
| Session | Site public observé | Aperçu corrigé, mêmes dossiers réels |
|---|---:|---:|
| TAXI et TA, 26/10–16/11, journée | 50 % (2/4) | 60 % (3/5) |
| VTC et TAXI, 02/11–13/11, journée | 42 % (5/12) | 50 % (7/14) |
| VTC soir, 02/11–13/11 | 38 % (6/16) | 44 % (8/18) |

Les trois anciennes valeurs ont été reproduites dans le panneau PUBLIC, puis dans le calcul sur ses lectures exactes. Le panneau en aperçu affiche les trois nouvelles valeurs sur les mêmes données réelles. Les pourcentages utilisent l’arrondi existant : 8/18 = 44,44 %, affiché 44 %.

## Causes prouvées
1. Un brouillon historique `in_progress` avec `submitted_at=NULL` pouvait marquer toute la question de l’élève comme incertaine, même si sa copie native soumise était corrigée. BENKHELIL Hassen et MALKI Ahmed étaient retirés malgré une note humaine 1,5/2 de leur première copie.
2. Une reprise native suivante munie d’un reçu de reprise mettait également toute la question en incertitude. SAIDI Aymen et DIANE Mohamed perdaient leur première note humaine 1,5/2 alors que la reprise ne doit jamais remplacer le premier passage.
3. La lecture QRC ne demandait pas `finished_at`/`etat` de la tentative. Le correctif exige maintenant une tentative `terminee` avec date de fin valide avant de compter la correction.
4. Le chargement des reçus IA ne supprimait pas les espaces autour du marqueur `ia:` contrairement au calcul. Alignement effectué ; aucun cas réel de ce défaut démontré pour Q1, toutes les notes comptées ici sont humaines.

Les brouillons QRC ne sont plus des observations statistiques. Un résultat historique soumis n’est neutralisé comme miroir que si examen, élève, question, réponse et instant de soumission correspondent exactement à la copie native. Une ancienne soumission non prouvée reste inconnue et bloque toute attribution opportuniste d’une note ultérieure. Les reprises suivantes sont ignorées, pas fusionnées.

## Vérification individuelle
### TAXI/TA journée
- Erreurs 3/5 : BENKHELIL Hassen (1,5), HAMDI Mohamed (1,5), SARKISIAN Pogos (1).
- Correctes : CHEMOUN Mourad (2), MEMDOUH Ilies (2).
- Hors dénominateur : HADDOU Massinissa, QRC en attente ; Pndukyan Harutyun, preuve historique insuffisante.
- Sans observation exploitable : RAYMAN Cihan, Dakhlaoui Ilyes, BEN ALI Mohktar, SOUICI Ahlem, CHALA Rachida.

### VTC/TAXI journée
- Erreurs 7/14 : SELMI Kais, SENE Mamadou, DIABY Mohamed, BENKHELIL Hassen, HAMDI Mohamed, MALKI Ahmed, SARKISIAN Pogos.
- Correctes : BENCHAKR Aniss, Alpha Barry, CHEMOUN Mourad, MEMDOUH Ilies, ADYAHYA Kamal, BENNANI Meriem, HADJ ALI Arezki.
- Hors dénominateur : HADDOU Massinissa et SMAIL Sifeddine, QRC non corrigées.

### VTC soirée
- Erreurs 8/18 : SAIDI Aymen, Berhane Gebremedhin Samson, BENAKKI Ayoub, NAZARYAN Karen, DIANE Mohamed, DIALLO Kama, Haddouche Djamel, Mfouemo Rodrigue Rodrigue Etienne.
- Correctes 10 : HASNAT Mehdi, AIT BALLAGH Sami, ABDELHAK Mohammed, Bekkis Abdessamad, DAKHLI Zine, CABRAL DE SOUSA FURTADO José, KOUGBE TE BIBANGA Vianney, MAHROUG Mohamed Amin, HABLANIS Anis, MLIKI Mohamed.

### Copies réintégrées
| Apprenant | Première copie native | Correction humaine | Reprise exclue |
|---|---|---|---|
| BENKHELIL Hassen | d2a15c50-62e9-4690-aa6a-89a6726e6fbb | 06/11 10:59:50 UTC, 1,5/2 | Brouillon historique ignoré |
| MALKI Ahmed | 32e5790b-f054-461d-bee6-405ec7200a29 | 06/11 09:50:04 UTC, 1,5/2 | Brouillon historique ignoré |
| SAIDI Aymen | 16b7ec57-06fd-40a8-8c04-cfd577068aa6 | 06/11 19:10:42 UTC, 1,5/2 | ab8c1b47-fd75-4788-b1f8-fb21bf5dc639 |
| DIANE Mohamed | 2cde8e58-15f6-4b44-8741-7c4fe4c2d6ed | 06/11 19:09:55 UTC, 1,5/2 | bef0e5fb-334c-40fe-b908-92059aa048b8 |

Les événements de correction humains ont été relus pour BENKHELIL/MALKI/SAIDI ; la copie et sa note, sa date et le correcteur ont été relus pour DIANE. Aucune correction n’a été réexécutée.

## Tests exécutés
- PASS : 80 tests ciblés, 5 fichiers (QRC en attente/correction tardive/partielle, copie non soumise, miroir exact, ancien résultat non prouvé, reprise suivante, QCM multiples, isolation examens/questions, sessions, comptes tests et pagination).
- PASS : 123 tests critiques examens, 8 fichiers.
- PASS : lecture paginée de 1 237 preuves, pages 0–499 / 500–999 / 1000–1499 ; échec d’une page refuse un résultat partiel.
- PASS : compilation automatique `build OK` après modifications.
- PASS : navigateur administrateur public puis aperçu, panneau réel Q1 capturé et lu. Aucun clic de notation/sauvegarde/soumission.

## Portée et limites
Le correctif agit dans le calcul QRC commun EB1–EB6 VTC/TAXI et TA déjà activés ; aucune liste spécifique à Q1 ni correction nominative. Les règles QCM restent intactes et passent les tests, mais leur éventuel défaut de traces de reprises à portée globale n’a pas été corrigé sans cas réel prouvé.

VA est exclu du périmètre statistique actuel (`firstPassageExamIds` et activation éditeur) : pas d’extension implicite ni de mélange avec TA. Les taux VA et les copies anciennes dépourvues de preuves sont NON PROUVÉS. Pagination testée, mais les lectures concurrentes ne forment pas un snapshot transactionnel ; aucune garantie générale de cohérence instantanée inventée. Le panneau se réactualise via son bouton existant ; aucun polling ni nouveau mécanisme de publication.

Les fichiers de preuve et scripts de consultation restent sous `/tmp/browser/qrc-stats/`. Ce rapport ne conserve pas les réponses textuelles des élèves. Le site public reste sur les anciennes statistiques : aucune publication faite dans ce tour.