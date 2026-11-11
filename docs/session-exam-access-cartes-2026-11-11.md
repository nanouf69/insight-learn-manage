# Précision de placement — cartes examens blancs

## Aperçu
Cours → Examens blancs → chaque carte → après Commencer/Choisir les matières/Mettre en pause (ou dernière action).
Zone **Accès présentiel**, session explicitement choisie, puis état et **Ouvrir l’accès / Fermer l’accès**.

- Réutilise `SessionExamAccess` en mode compact limité à l’ID exact de l’examen ; mêmes RPC admin de contexte/confirmation et même readback que la fiche CRM. Aucun deuxième mécanisme, aucune modification du SQL candidat.
- Commande montée seulement après utilisateur authentifié vérifié avec `getUser` et rôle serveur `has_role`. `isAdmin` seul ne suffit pas. RPC admin conserve sa propre protection serveur.
- Aucune session devinée, première session jamais sélectionnée automatiquement ; dates/nom/ID dans le choix. Catalogue chargé une fois par liste, paginé par ID. Session sélectionnée affichée en clair ; examen incompatible → aucune commande d’ouverture/fermeture.
- Relecture et absence de fonction serveur restent explicites. En serveur actuel non installé, pas de faux état ouvert/fermé ni action modifiante.
- Pause et actions élève inchangées. Confirmation, journal et autres règles du chantier précédent inchangés ; aucun accès réel ouvert/fermé, migration, copie, note ou contenu changé, aucune publication.

## Vérification exécutée
- 13 tests Vitest PASS : 6 tests de la vraie EcranSelection (placement après pause / après dernière action sans pause, pause appelle le même handler, apprenant exclu, prop admin sans droit exclue, déconnecté exclu, session explicite/examen isolé) + 7 tests contrôle partagé (confirmation/readback, annulation, double clic, refus, identité, serveur absent).
- Chromium vrai EcranSelection PC 1280×1800 et mobile 390×844 : zone sous pause vérifiée par positions réelles, choix explicite, état fermé fictif, ouverture du dialogue puis annulation ; parcours apprenant sans zone admin. Captures inspectées, aucun appel modifiant Cloud, zéro erreur JS.
- Build automatique observé OK.

## Limites
UI et rôles en navigateur simulés sur fixture, pas de session admin réelle ; serveur candidat toujours non installé, limites de préactivation du rapport précédent conservées. Aucun test de fermeture réelle ni création de tentative.
Les resynchronisations périodiques préexistantes de la liste et du chronomètre, contraires à la règle zéro polling, sont laissées intactes : aucun changement de pause/temps autorisé ici.