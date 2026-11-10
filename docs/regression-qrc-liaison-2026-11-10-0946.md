# Régression correction QRC — 10 novembre 2026, signalement 09:46 UTC

## Identification : preuve et limites

Le texte signalé provient exactement de `reconnaissanceRemise`, appelée avant la RPC de notation dans `AdminCorrectionQrcV2Reel`. Ce chemin concerne les copies **EB2 VTC historiques projetées dans la grille V2**, identifiées `consultation:<result_id>`, pas une QRC native V2.

Les fichiers de télémétrie console/réseau/runtime de cette demande ne sont pas présents. Les recherches bornées 09:40–09:47 dans les journaux réseau et PostgreSQL, ainsi que dans `error_logs` et le journal de correction, n’ont pas permis de retrouver le clic. Ce refus intervient avant tout appel de notation ; il ne produit donc pas nécessairement un événement serveur.

**Le candidat, la question et l’identité du clic exact de 09:45 sont NON PROUVÉS.** Ne pas attribuer ce clic à l’un des candidats ci-dessous. Le défaut a néanmoins été reproduit sur trois copies authentiques, relues avec la session administrateur et sans écriture.

| Candidat | Copie / attempt_id affiché | Matière | Tentative | Fin de la copie UTC | Remise serveur | Fin remise UTC |
|---|---|---|---|---|---|---|
| MOHAMMED ABDELHAK | consultation:42408cb0-bdfd-47ba-afce-e6e4b1471823 | gestion | 1 | 09/11 18:51:42.313923 | d6f9487e-e2a5-4418-80c2-70ffa66234be | 09/11 18:51:41.386412 |
| Mohamed DIANE | consultation:83e2142c-b3cd-4981-ae6b-4f8cb4e63d5a | gestion | 1 | 09/11 18:53:12.042999 | 188a90b0-5e4a-44d0-9d31-4b959b9357a5 | 09/11 18:53:11.128650 |
| SAMI AIT BALLAGH | consultation:19f90b70-c62f-4734-860b-20e57ce41ea8 | reglementation_vtc | 1 | 09/11 19:55:14.268060 | e78c6b5a-e6e7-4dc0-a5af-88d7e59fb0b7 | 09/11 19:55:13.366702 |

## Cause confirmée

La liaison élève/exercice/matière/tentative existe. Les remises sont `completed=true`, `status=submitted`, avec une date de remise. Les clés de réponses sont les mêmes, les réponses QRC sont identiques.

La comparaison de l’ensemble JSON exigeait aussi **l’ordre des choix des QCM** :

- Gestion, question 18 : résultat `[A,B]`, remise `[B,A]`.
- Réglementation VTC, question 10 : résultat `[B,C]`, remise `[C,B]`.

Sur les trois copies, aucune autre différence de réponses n’a été retrouvée. Les deux premières ont deux QRC, la troisième quatre. Le refus « aucune remise » est donc une fausse absence de preuve pour ce cas précis, pas une absence de remise, une migration manquante ou une mauvaise clé.

Le serveur historique installé utilise également l’égalité JSON stricte. Il permet en outre `resultat_seul` avec un texte de reconnaissance. **Cette reconnaissance n’est pas une réparation de liaison fiable** : le correctif préparé refuse toujours `resultat_seul`, même avec une confirmation fournie.

## Modifications préparées, non publiées

1. Comparaison complète des clés et réponses. Seules les permutations d’un tableau de lettres A–E d’une question QCM identifiée univoquement dans le snapshot sont équivalentes. Aucun tri de texte QRC, aucune normalisation des signes/unités/négations, aucun mélange de matières ou tentative.
2. Copie originale relue avant l’enregistrement : son propriétaire, sa question et sa provenance doivent toujours être confirmés.
3. Pour une permutation QCM, un contrôle **serveur en lecture seule** est exigé avant toute notation. Tant que le correctif serveur n’est pas installé, l’aperçu refuse clairement ces commandes au lieu de contourner l’ancienne règle avec une reconnaissance automatique.
4. Candidat SQL hors migrations actives : `docs/sql-revue/2026-11-10-qrc-liaison-choix-ordre.sql`. Il reprend les deux RPC réellement installées et ne change que la comparaison de provenance et le refus des remises non prouvées ; propriétaire admin, verrou, CAS score, question figée, barème, ancienne correction, preuve de score, journal append-only et relecture restent en place. Un précontrôle admin dérive l’identité depuis le result_id enregistré, jamais depuis un apprenant fourni par le navigateur.
5. Après notation, le résultat matière relu est désormais incorporé dans la grille avec la QRC relue ; auparavant seules les tentatives et les QRC étaient actualisées, laissant le résultat de la grille ancien.

**Aucune fonction serveur installée ou déployée, aucune migration appliquée, aucune note/réponse/question/copie/tentative réelle modifiée.** Aucune fusion, import, suppression ou réparation de donnée historique. La preuve est obtenue à la lecture, sans réécrire les tableaux existants.

## Tests réellement exécutés

**PASS — 57 tests applicatifs** sur cinq fichiers : liaison, comparaisons strictes QRC, permutations QCM, propriétaire/matière/tentative/brouillon, clés manquantes, serveur indisponible, serveur renvoyant un autre propriétaire, projection et publication, reprise et sources uniques existantes.

**PASS — 27 tests PostgreSQL jetable** : RPC candidates issues du catalogue réel, notation avec permutation, relecture persistante, intégrité réponses/snapshot/questions, dernière QRC et note matière, corrections existantes protégées, révisions append-only, concurrence, idempotence, mauvais score, accès refusé, V2 déjà lié, réponse QRC différente, autre tentative et refus même avec une reconnaissance inventée.

Le scénario fictif note `1/2` retrouve la correction après relecture, conserve les autres réponses et remonte dans le résultat matière ; un test applicatif vérifie aussi le global partagé sur sept matières. Ce n’est pas une correction réelle hébergée.

**PASS — lecture navigateur authentifiée** des trois copies réelles ci-dessus : provenance désormais `remise_horodatage_divergent`, `preuveServeurRequise=true`, zéro tentative d’écriture de test. Notes source relues intactes : 19,5 ; 18 ; 16 points bruts, respectivement. Compilation automatique : build OK.

## État opérationnel et blocages

- **Le blocage n’est pas annoncé comme résolu en production** : publication interdite par la demande ; le correctif de comparaison doit aussi être installé côté serveur avant de rendre ces nouvelles preuves notables.
- Le clic exact 09:45 reste non identifié, faute de télémétrie portant l’identité de cette sélection. Un nom ou la copie visible permettra une vérification nominative sans supposition.
- E2E réel notation→persistance→global hébergé NON PROUVÉ : aucune note fictive n’a été écrite en production ; notation isolée et projection applicative ont été testées, pas une correction élève réelle.
- Cas sans remise correspondante même après comparaison corrigée : refus maintenu ; pas de recours à une simple case ou confirmation admin.