# Corriger à la source la réapparition des réponses supprimées

## Diagnostic confirmé

- Le clic de suppression retire bien D du tableau `choix` dans l’éditeur.
- La sauvegarde écrit le tableau complet dans `module_editor_state.module_data`, puis dans `quiz_questions.choix` via `apply_admin_canonical_quiz_actions`.
- L’historique de base montre le scénario exact sur le module 10, exercice 75, question 25 : passage de 4 à 3 choix, puis réécriture de 3 à 4 choix quelques secondes plus tard, puis retour à 3.
- La réécriture parasite vient d’une sauvegarde navigateur obsolète. Dans `performDbSave`, l’application relit d’abord la ligne canonique actuelle puis utilise cette date fraîche comme `expected_updated_at` pour envoyer le vieux tableau. Le contrôle de concurrence accepte donc à tort A/B/C/D.
- Les anciennes copies existent encore dans `module_editor_state` de modules liés et contiennent effectivement D. Elles ne doivent jamais pouvoir gagner contre la ligne canonique.

## Correction ciblée

1. Conserver sur chaque question la version canonique réellement chargée par l’éditeur, séparément de la date de modification locale.
2. Envoyer cette version chargée comme `expected_updated_at` lors de la sauvegarde, au lieu de la date fraîche relue juste avant l’écriture.
3. Si une sauvegarde obsolète contient encore D, la base la refusera avec le conflit prévu au lieu de réécrire D.
4. Après une sauvegarde réussie, relire la ligne canonique complète et remplacer l’état affiché par son contenu exact.
5. Ne modifier ni les scores, ni les réponses apprenants, ni les tentatives, ni la progression.

## Preuve obligatoire

- Utiliser une question de test canonique avec A/B/C/D.
- Supprimer D depuis l’interface et sauvegarder.
- Vérifier directement `quiz_questions.choix = [A,B,C]`.
- Forcer une ancienne sauvegarde A/B/C/D et vérifier qu’elle est refusée, sans changement en base.
- Actualiser complètement, sortir/revenir, puis vérifier les vues Formateur/Fournisseur et Apprenant.
- Confirmer que D reste absente à chaque étape et que les tables apprenants restent inchangées.
