# Étape 2 — indicateur de sauvegarde, sans déploiement

## Objectif
Préparer un indicateur purement informatif à partir des états déjà exposés, sans changer la file locale, ses clés, son format, ni le mécanisme d’envoi.

## Modifications prévues
- Afficher un état permanent et exact :
  - vert uniquement après confirmation serveur et file active vide ;
  - orange avec le nombre exact d’opérations encore synchronisables ;
  - rouge uniquement pour une indisponibilité temporaire réseau/serveur ;
  - refus fonctionnel définitif affiché séparément avec sa vraie raison.
- Brancher cet indicateur sur les écrans apprenant concernés, notamment le passage d’un examen blanc, sans toucher à la sauvegarde.
- Conserver l’état correct après F5 grâce à la lecture de la file existante au montage.

## Tests
- Ajouter des tests ciblés pour les transitions orange → vert, le compteur, le hors-ligne, la reprise, le refus 48 h et le rechargement avec file en attente.
- Rejouer les 20 tests critiques et toute la suite actuellement exécutable.
- Comparer les empreintes des fichiers protégés et confirmer qu’aucune clé ni structure de file n’a changé.

## Limites
- Aucun déploiement.
- Aucune donnée réelle utilisée ou modifiée.
- Aucune modification de réponse, tentative, examen EB3, note, snapshot ou historique.
