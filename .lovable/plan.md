# Retirer le préalable du module PRATIQUE

## Résultat
- Tous les candidats reçoivent le lien de choix de date lors des envois manuels, sans condition liée au module PRATIQUE.
- Retirer les mentions « avant de réserver » dans la page, les e-mails, SMS et confirmations administrateur.
- Conserver les liens de révision et le rappel des heures e-learning CPF / France Travail.
- Aucun e-mail envoyé pendant cette modification ; aucune réservation ni donnée élève modifiée.

## Fichiers à modifier
- `src/components/examens/ExamenReussitePage.tsx`
- `src/pages/ReservationPratique.tsx`
- Test de non-régression ciblé dans `src/test/`.
- `roadmap.md` pour le suivi.

## Vérification
Contrôler les parcours VTC et TAXI (envoi, relance, SMS), exécuter les tests sans envoyer de messages et vérifier l’absence de cette condition.