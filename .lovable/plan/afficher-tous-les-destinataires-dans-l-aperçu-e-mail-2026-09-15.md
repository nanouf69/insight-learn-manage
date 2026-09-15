# Afficher tous les destinataires dans l'aperçu e-mail

## Problème constaté

Dans la fenêtre « Aperçu — Carte Pro VTC (Admis) », le compteur indique bien 13 destinataires, mais la liste n'en montre que 6 et ne défile pas correctement. Les 7 autres sont donc invisibles et impossibles à cocher un par un.

## Cause

La liste est placée dans une zone de défilement dont la hauteur est limitée, mais cette zone ne reçoit pas la hauteur nécessaire pour faire apparaître la barre de défilement : le contenu est simplement coupé.

## Correction proposée

- Remplacer cette zone par une liste à défilement simple et fiable, avec une hauteur maximale plus généreuse (environ 15 lignes visibles avant défilement).
- Garder exactement le même affichage : cases à cocher, nom, e-mail, clic sur la ligne pour cocher/décocher, bouton « Tout sélectionner / Tout désélectionner ».
- Aucun changement sur l'envoi des e-mails, les modèles, les résultats d'examen ou les données apprenants.

## Détail technique

Dans `src/components/examens/ExamenReussitePage.tsx`, dans le dialogue d'aperçu : remplacer le composant `ScrollArea` (classe `max-h-48` / `max-h-24`) par un `div` avec `overflow-y-auto` et une hauteur maximale explicite (`max-h-64` pour le mode Carte Pro, `max-h-24` sinon), en conservant le contenu de la boucle `previewRecipients.map` inchangé. Vérification : typecheck puis contrôle visuel que les 13 destinataires sont accessibles.
