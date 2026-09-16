# Empêcher la désynchronisation des mots de passe apprenants

## Cause confirmée
- Le compte de Yasin n'était ni bloqué, ni désactivé, ni expiré.
- Le mot de passe réellement utilisé par la connexion pouvait être modifié depuis l'espace élève ou depuis le lien « mot de passe oublié ».
- Ces deux parcours modifient actuellement le mot de passe du compte, mais pas celui mémorisé dans la fiche apprenant.
- Ensuite, « Renvoyer identifiants » renvoie la valeur ancienne de la fiche sans la réappliquer au compte. L'élève reçoit donc un mot de passe qui ne fonctionne plus.
- Le bouton « Réinitialiser le mot de passe et renvoyer » a corrigé Yasin en mettant les deux valeurs à jour ensemble. Sa connexion a réussi à 10 h 23 depuis `gestion.ftransport.fr`.

## Correction prévue
- Faire passer tous les changements de mot de passe apprenant par une seule fonction sécurisée.
- Vérifier l'identité de l'apprenant côté serveur avant tout changement.
- Mettre à jour ensemble le mot de passe de connexion et celui affiché dans la fiche.
- Utiliser ce même parcours pour le changement depuis l'espace élève et le lien « mot de passe oublié ».
- Conserver « Renvoyer identifiants » comme simple renvoi du mot de passe courant mémorisé, sans réinitialisation implicite.
- Afficher une erreur claire si l'une des deux mises à jour échoue, sans toucher aux exercices, réponses, notes, tentatives, résultats ou progression.

## Vérifications
- Tester : changement depuis l'espace élève, oubli du mot de passe, renvoi simple et réinitialisation administrateur.
- Vérifier qu'un apprenant ne peut jamais changer le mot de passe d'un autre.
- Vérifier reconnexion sur iPhone/tablette et conservation intégrale des données pédagogiques.
- L'opération n°5 et le système de tablette partagée restent inchangés.

## Détails techniques
- Ajouter une fonction backend authentifiée dédiée au changement du propre mot de passe.
- Remplacer les appels directs actuels dans les deux écrans concernés.
- Déployer la fonction, lancer le contrôle TypeScript et les tests ciblés.
