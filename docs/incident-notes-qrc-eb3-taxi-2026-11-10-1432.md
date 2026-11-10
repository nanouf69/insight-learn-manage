# Incident « notes QRC non remontées » — EB3 TAXI, 10/11 15h15 (Paris)

Statut : **STOP / NO-GO refonte**. Diagnostic lecture seule uniquement. Aucune écriture, aucune migration, aucune publication.

## 1. Identification exacte des captures
- Vue candidat (A, B « En attente », C 14, D 9,5, E 9, F(T) 14, G(T) 18) = **CHEMOUN Mourad**, EB3-TAXI, tentative 2.
  - D/E/F(T)/G(T) = copies du nouveau correcteur du 10/11 (13:27, 13:34, 13:43, 13:48 UTC), toutes définitives : 9,5 / 9 / 14 / 18. Identique à l'écran.
  - C 14 = ancienne copie du 09/11 20:28 UTC, sans QRC.
  - A = ancienne copie du 09/11 20:21 UTC (5 QRC), B = ancienne copie du 08/11 18:44 UTC (2 QRC) : notes automatiques jamais validées par un humain → « En attente » est l'état correct.
- Vue admin : SARKISIAN Pogos, BENKHELIL HASSEN, CHEMOUN Mourad, HADDOU MASSINISSA → **pas le même élève** que la vue candidat (sauf CHEMOUN F/G, identiques des deux côtés : 14 et 18).
  - SARKISIAN F(T) « 11, 4 restantes » : copie terminée 14:15:54 UTC, 4 QRC corrigées 14:18:49 → 14:19:11 ; note actuelle 14,5 définitive (11 + 3,5).
  - BENKHELIL G(T) « 10, 2 restantes » : terminée 14:15:04, corrigée 14:19:22 → 14:19:43 ; note actuelle 13,5 définitive (10 + 3,5).
  - À l'heure de la capture, ces QRC n'étaient pas encore corrigées : l'écran admin était exact.

## 2. Chaîne nouveau correcteur (notation → matière → lecture)
- Commande serveur unique déjà en place : `core_correct_qrc_publish` (droits admin, idempotence par opération, barème serveur, verrou de la copie, recalcul `core_recalc_result`, résultat versionné renvoyé). Révision : `core_revise_qrc_publish` (CAS).
- Production, 2 735 copies terminées : 2 530 définitives avec 0 QRC restante, 205 provisoires avec QRC restantes exactes. **0 note définitive avec QRC restante, 0 attente avec toutes QRC corrigées.**
- Base jetable : 14/14 tests PASS (TAXI et VTC, note qui remonte, barème, réécriture refusée, CAS, concurrence, isolation).

## 3. Cause racine réelle
Les copies de l'ancien circuit avec QRC non validées n'ont **aucun chemin de correction** :
- `qrc_historique_noter` refuse toute ancienne copie TAXI (clé de remise non construite pour `-TAXI` → « Remise non prouvée »).
- L'écran admin les affiche en consultation seule (« ancien circuit »), sans bouton de note.
- Elles restent donc « En attente » indéfiniment côté candidat.

Copies concernées (anciennes, QRC non validées, sans copie nouveau correcteur correspondante) :
- TAXI depuis le 01/11 : 8 copies, 2 élèves — CHEMOUN Mourad (EB3 T3P t1, Gestion t2, T3P t2), FERREIRA David (EB3 t2 : T3P, Gestion, Français, Réglementation TAXI, Territoire TAXI).
- VTC depuis le 01/11 : 48 copies, 11 élèves ; antérieures : 207 VTC, 15 TAXI.
- Particularité : remises suffixées `__t2` avec numéro de tentative resté à 1 (même cas que Meriem BENNANI).

## 4. Ce qui n'a pas été fait et pourquoi
- Pas de refonte du nouveau correcteur : il est déjà transactionnel et cohérent sur toutes les copies.
- Pas d'import des anciennes copies dans le nouveau correcteur : c'est une migration, interdite sans accord.
- Pas d'ouverture de la notation des anciennes copies TAXI : il faut une preuve de remise ciblée (comme pour Meriem BENNANI) ; à faire sur accord nominatif.

## 5. Étapes proposées (accord requis)
1. Preuves de remise ciblées, ajout seul, pour les 8 copies TAXI (CHEMOUN, FERREIRA), contrôlées une par une.
2. Ouvrir la commande serveur de notation des anciennes copies aux TAXI prouvées, et afficher les boutons de note pour elles.
3. Note globale EB calculée par le serveur (7 matières, coefficients, éliminatoires), lue à l'identique côté élève et admin.
4. Même traitement pour les 48 copies VTC récentes, après liste nominative.

## Non vérifié
- Mise à jour instantanée de l'écran candidat pendant qu'il est ouvert, après une correction réelle (non provoquée pour ne rien écrire).
- Note globale EB : toujours assemblée à l'écran, pas de calcul serveur unique.
