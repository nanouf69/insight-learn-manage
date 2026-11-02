# Réinitialisation du mot de passe — 02/11/2026

Demande : liens de récupération valables trois heures, raisons de refus en français, œil pour révéler/masquer la saisie.

## Modifications
- `src/pages/ResetPassword.tsx` : œil indépendant dans chaque champ, explications françaises persistantes dans le formulaire, confirmation différente et mot de passe trop court refusés. L'appel serveur `updateUser({ password })` reste inchangé, sans mot de passe actuel en récupération.
- `src/lib/passwordResetError.ts` : traduction des motifs serveur (longueur, caractères requis, mot de passe compromis, même mot de passe, session expirée, limites de demandes), erreur inconnue remplacée par un message français sans exposer le message brut.
- `src/test/reset-password-flow.test.tsx` : deux scénarios de la page réelle avec service de connexion entièrement simulé.
- `AGENTS.md`, `roadmap.md` : règle technique et suivi ; préférence enregistrée en mémoire projet.

## Vérification
Commande exécutée : `bunx vitest run src/test/reset-password-flow.test.tsx src/test/changement-mdp-obligatoire.test.ts` : **14 tests PASS**. Le refus serveur empêche le succès et la déconnexion, puis une nouvelle saisie passe par le même appel serveur. Affichage/masquage indépendant vérifié. Contrôles automatiques : build OK à 09:42:33 UTC.

Email/password était déjà activé : appel idempotent `enable_email_auth`, statut « was already enabled ». Aucun changement de force du mot de passe, de compte ou de données pédagogiques. Aucun envoi réel, lien consommé, migration ni publication.

## Limites
Les 10800 secondes de validité **ne sont pas appliquées ni vérifiées** : aucun outil agent ne modifie cette option hébergée. Action minimale du propriétaire : **Plus → Users → Auth settings → Email → Email OTP expiration (seconds) : 10800**, enregistrer. Cette option est commune aux liens/codes e-mail, pas exclusivement à la réinitialisation ; ne pas remplacer cette autorité par un délai local.

Les changements de page sont disponibles dans l’aperçu seulement ; le site publié reste inchangé. Parcours avec lien réel et compte apprenant hébergé : **NON PROUVÉ**, aucun compte réel employé pour tester.