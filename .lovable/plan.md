# Ajouter l’accès « Confirmation formation continue »

## Fichier concerné
- `src/components/sessions/SessionDetail.tsx`

## Modification
- Ajouter dans la ligne d’actions de chaque apprenant un bouton visible « Confirmation formation continue ».
- Afficher ce bouton uniquement dans les sessions de formation continue.
- Au clic, ouvrir l’aperçu du modèle existant `confirmation-formation-continue` avant tout envoi.
- Conserver le menu « Mail » et tous les autres modèles inchangés.

## Vérification
- Vérifier que le bouton apparaît sur une session de formation continue et pas sur les autres sessions.
- Vérifier que le clic ouvre le bon e-mail, prérempli avec l’apprenant et les dates.
- Aucun e-mail ne sera envoyé pendant le test.
