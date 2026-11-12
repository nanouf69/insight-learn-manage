# Notes apprenant — aperçu, lecture seule

## Résultat
- NotesView partagé CRM Vue apprenant / compte apprenant : six EB officiels de sa filière, dernier reçu remis par matière et projection V2 prouvée. Anciennes copies conservées ; plus aucune révision dans les cartes/graphiques officiels.
- Notes /20 pondérées via computeMoyenneExamen, avec coefficient figé si présent, sinon référentiel actif. Publication complète requise ; zéro technique interdit, matière manquante/provisoire => Note en attente.
- Graphique EB1 à EB6, axe 0–20, connectNulls=false ; détail des matières, coefficients/date/statut.
- Bilans : nouvelles remises A–E sur reçus/submissions propriétaires avec barème EB1 existant. Historique soumis consultable séparément par tentative, total laissé en attente si barème global non vérifié. Aucun open, submit, nouvelle table, migration ou calcul enregistré.
- Révisions des questions fausses dans leur propre onglet ; Examens à revoir toujours en bas avec règles de seuil existantes.
- Lecture erreurs/Réessayer ; ancien résultat confirmé conservé lors d’une erreur ; réponse ancienne d’un autre apprenant ignorée.

## Contrôles
- Vitest : pondération 3/1 = 16 pour notes 20/4 (pas 12), absence, QRC provisoire, coefficient inconnu, dernière remise, propriétaire, révisions, vrai Bilan A–E 14,3, historique non noté, six numéros toutes filières.
- Chromium fictif PC 1280×1800/mobile 390×844 : six cartes, détail et graphique sans liaison au-dessus des absences, aucun débordement ni erreur JS.
- CRM Vue apprenant réelle Rodrigue Rodrigue Etienne Mfouemo : EB1 7,7 ; EB2 11,9 ; EB3 11,1 ; EB4 15,1 ; EB5/6 Non réalisé ; un Bilan A–E en attente, révisions séparées. Notes issues du même lecteur officiel, pas des anciens champs bruts.
- Panne GET résultats simulée dans cette consultation réelle : erreur visible, bouton Réessayer, six cartes revenues après restauration réseau. Aucun envoi ni écriture de résultats.
- Mobile réel CRM : changement de taille remonte le parent aperçu et ouvre/perd l’état du menu/sélection ; validation complète mobile réelle NON PROUVÉE. Composant mobile fictif vérifié. Compte apprenant direct non utilisé ; aucune usurpation de session ni mutation de rôle.

## Limites
- Certains Bilans historiques restent Note en attente : aucun barème global reconstruit.
- Validation directe compte apprenant, historique complet TA/VA et remount mobile CRM restent non prouvés : aucune publication avant confirmation.