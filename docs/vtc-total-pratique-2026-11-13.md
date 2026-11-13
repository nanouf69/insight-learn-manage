# TOTAL VTC présentiel — 13 novembre 2026

## Livré dans l’aperçu, non publié
- La projection partagée prévoit six heures pratiques pour le VTC initial présentiel, même sans inscription pratique : théorie soir 40 + 6 = 46 ; journée 60 + 6 = 66.
- La théorie garde son propre dénominateur et son taux. La pratique n’est créditée que sur les signatures/validations retenues, jamais sur une réservation seule. Les heures supplémentaires de théorie ne remplacent pas la pratique.
- Pratique inscrite/doublons : six heures du programme comptées une seule fois. Plusieurs journées ne donnent pas douze heures d’obligation. Horaires nominatifs enregistrés + signature réelle peuvent prouver une pratique sans inscription distincte ; absence/feuille vide ne prouvent rien.
- CRM, résumé Documents et liste des taux complets utilisent la projection ; le chargeur de réalisation VTC réutilise cette même source au lieu du ratio de nombre de signatures. Ajout d’un affichage présence élève distinct du compteur e-learning.
- Pourcentages affichés à une décimale, calculs internes non arrondis. FC, pratique seule, e-learning et autres filières ne reçoivent pas la nouvelle obligation VTC initiale. Heures configurées des sessions conservées.
- Les attestations présentielles ne reprennent pas de pourcentage de présence actuellement ; leurs durées ne sont pas remplacées par des heures prétendument effectuées. Les attestations signées et relevés figés restent inchangés. Aucun appel manuel de gel.

## Avant / après à preuves identiques
| Cas | Théorie (inchangée) | TOTAL avant | TOTAL après |
|---|---|---|---|
| Capture CHERNI 37h30 sans pratique | 37,5/40 = 93,8 % | 37,5/40 = 93,8 % | 37,5/46 = 81,5 % |
| Journée complète sans pratique | 60/60 = 100 % | 60/60 = 100 % | 60/66 = 90,9 % |
| Soir théorie et pratique complètes | 40/40 = 100 % | dépendait de l’inscription | 46/46 = 100 % |
| Journée théorie et pratique complètes | 60/60 = 100 % | dépendait de l’inscription | 66/66 = 100 % |

## Tests et lecture réelle
- Suite ciblée : 113 tests PASS dans neuf fichiers avant ajout du dernier cas FC (résultat final consigné dans le retour).
- Quatre parcours Chromium fictifs : soir/journée × ordinateur 1280×1800/téléphone 390×844 ; pratique 0, 3, 6 ; événements et rechargement ; calcul visible admin/élève identique, aucune erreur JS/débordement. Tous les appels externes des fixtures interceptés.
- Lecture authentifiée réelle CHERNI via chargeur de présence, PC/mobile et rechargement : données actuelles lues 37 h théorie, 0 pratique, TOTAL 37/46 = 80,4 %. Ce n’est plus l’état de la capture 37h30.
- Catalogue VTC des sessions examiné en lecture seule : journée/soir/pratique/FC, valeurs configurées conservées. Tous les dossiers n’ont pas été ouverts individuellement.
- Aucun INSERT/UPDATE/DELETE/migration/envoi/publication exécuté par ce lot. Calculs sauvegardés avant dans `/tmp/vtc-total-before`.

## Changements concurrents et limites réelles
La base a changé pendant les contrôles : annulations des anciennes 4 h et 1h30 à 16:50:50/53 UTC ; trois nouvelles validations 2h30 le 17/09 et 1h30 + 2h30 le 18/09. Ces actions ne viennent pas de ce lot et sont conservées. L’ancien rapprochement administratif date seule garde le maximum par jour : les deux nouvelles lignes du 18/09 ne sont pas additionnées sans preuve de créneaux distincts. D’où 37 h actuellement projetées au lieu de 38h30 que donnerait une addition brute. Aucun ajustement silencieux de ces heures.

Les validations administratives et leur journal sont toujours admin-only en base. Une lecture non-admin peut recevoir une liste vide plutôt qu’une erreur : le TOTAL propriétaire élève avec ajouts administratifs n’est pas certifié bout en bout. Le nouveau panneau réutilise la même source, mais un lecteur propriétaire sécurisé des validations effectives reste nécessaire pour une parité hébergée garantie. Aucune permission élargie dans ce lot.

Pas de garantie globale d’absence de variation avant/après sur une base active : les empreintes validations/journal ont changé du fait des actions concurrentes ; aucune restauration ni suppression effectuée. Aucun taux EDOF ni document figé réécrit. Publication attend l’accord utilisateur et qualification des deux limites ci-dessus.