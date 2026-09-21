# Reprise persistante des examens blancs

## Objectif
Corriger la reprise des examens blancs VTC, TAXI, TA et VA sans modifier, migrer ou recalculer les réponses, notes, corrections QRC, résultats, tentatives ou historiques existants.

## Modifications prévues
1. **Correspondance en lecture seule**
   - Reconnaître les identifiants historiques `EBx_matiere` et actuels `EBx__matiere`, avec leurs suffixes de tentative.
   - Regrouper uniquement pour l’affichage et la reprise les lignes appartenant au même apprenant, examen, matière et tentative.
   - Faire systématiquement primer une ligne contenant des réponses sur une ligne compatible vide, puis utiliser la dernière activité pour départager deux lignes non vides.

2. **Détection du passage à reprendre**
   - Construire l’état du passage depuis les réponses sauvegardées, les matières finalisées, les résultats, la tentative et les dates d’activité.
   - Reprendre la première matière réellement inachevée déjà commencée, ou la matière suivante après les matières finalisées, sans revenir arbitrairement à A.
   - Recharger la dernière question pertinente à partir des réponses retrouvées.

3. **Protection des tentatives**
   - Exiger toutes les matières requises avant de déclarer l’examen terminé; supprimer toute tolérance « N−1 ».
   - Toujours donner priorité à un passage incomplet avant d’autoriser une nouvelle tentative.
   - Afficher « Reprendre l’examen » tant qu’un passage reste incomplet; réserver « Refaire l’examen » à un passage réellement finalisé et à une action explicite.

4. **Séparation sauvegarde/finalisation**
   - Conserver la sauvegarde question par question indépendante du bouton de fin de matière.
   - Supprimer de l’écran de liste toute réparation automatique de note; les lectures de reprise ne feront aucun `UPDATE`, `INSERT` ou `DELETE`.
   - Préserver strictement les corrections QRC et tous les résultats déjà enregistrés.

5. **Contrôles et rapports**
   - Ajouter des tests de non-régression couvrant ancien/nouvel identifiant, ligne vide concurrente, tentative incomplète, F5, déconnexion/reconnexion, fermeture/retour et file hors ligne.
   - Vérifier le dossier VTC N°2 comme test de lecture: 107 réponses reconnues, sans création de note ni changement d’état.
   - Produire en lecture seule le détail des 3 apprenants ayant plusieurs passages ouverts.
   - Classer séparément les 292 zéros suspects: vrai zéro, zéro technique, réponses récupérables, matière vide, doublon, ancien passage ou passage incomplet, sans recalcul.
   - Recompter exactement les 26 apprenants, 114 examens et 771 matières historiques désormais retrouvables par la nouvelle règle.

## Détails techniques
- Centraliser le décodage des identifiants et la sélection déterministe des lignes dans des fonctions pures réutilisées par la liste, le démarrage et le passage d’une matière.
- Les fonctions de lecture retourneront aussi la clé physique réellement trouvée afin que la reprise continue à sauvegarder sur ce même passage, sans recopier ses réponses vers une autre clé.
- Les audits resteront des requêtes `SELECT` et leurs résultats seront présentés sans données pédagogiques modifiées.
