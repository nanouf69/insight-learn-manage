# Activation initiale : demande du 04/11/2026

## Diagnostic et limite bloquante
Le compte élève est créé par `supabase/functions/create-apprenant-account/index.ts` avec un mot de passe aléatoire non communiqué et `email_confirm: true`. Son lien initial est produit par `generateSetPasswordLink` dans `supabase/functions/_shared/credential-secrets.ts` avec `type: recovery` et `/reset-password` : le fournisseur traite donc l'activation initiale comme une réinitialisation, pas comme une invitation distincte.

La durée réelle est un réglage hébergé commun aux codes/liens email. Les capacités documentées Lovable Cloud donnent un maximum de **24 heures (86400 secondes)** et aucun outil agent pour modifier ce réglage. Les **48 heures (172800 secondes)** ne sont donc pas réalisables par le réglage natif documenté. Modifier ce réglage changerait aussi la réinitialisation ordinaire, qui doit rester trois heures. Aucun réglage actuel n'a été lu avec un outil de configuration : valeur effective NON VÉRIFIÉE.

L'email existant annonce une heure depuis réception ; cette constante n'applique aucune expiration serveur. Elle ne doit pas être remplacée par « 48 heures » sans garantie réelle. Aucune modification de cet email effectuée.

Un renvoi public fondé sur `recovery` pourrait également permettre le changement de mot de passe d'un compte déjà activé. `email_confirm: true` ne prouve pas que le stagiaire a déjà défini son mot de passe. Aucun statut d'activation sûre ne doit être inventé depuis ce champ, depuis une première connexion ou depuis le navigateur.

## Résultat de ce tour
- Demande conservée dans la mémoire et la feuille de route.
- Lecture seule des fonctions d'émission, page `/reset-password`, règles du projet et documentation des capacités fournisseur.
- **Aucun changement de code applicatif, de template, de configuration, de fonction hébergée, de table ou de compte.**
- Aucun email/SMS envoyé, aucun mot de passe ni accès modifié ; aucune publication.
- Ne pas ajouter un bouton de renvoi fonctionnel tant que le serveur ne peut pas distinguer initial/activé et garantir la durée exacte.
- Ne pas créer de générateur OTP, table de jetons ou fonction d'expiration parallèle pour contourner le réglage du fournisseur : ce contournement est interdit par les règles de la plateforme.

## Vérifications
Les quatre parcours demandés (valide, expiré, renvoi, déjà activé) sont **NON PROUVÉS** : aucune implémentation compatible n'a pu être mise en place, aucun test de vraie activation n'est exécuté. Ne pas annoncer une durée effective ou un jeton invalidé sur la seule base du texte email.

## Décision nécessaire
Il faut une capacité fournisseur supportant une expiration d'activation initiale indépendante de la récupération et de 48 heures. Tant qu'elle n'est pas disponible, le délai exact demandé ne peut pas être garanti dans ce circuit. Une version adaptée aux capacités natives exige de décider séparément la durée acceptée et la séparation initial/activé ; aucune réduction de délai ou modification globale n'est appliquée sans accord.