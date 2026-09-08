# Audit et correction globale de la persistance des questions

## Objectif
Faire de la ligne canonique en base la seule version active d’une question liée à un quiz, pour toutes les vues Admin/Formateur, Fournisseur et Apprenant. La dernière sauvegarde validée gagne pour le texte, les choix, la bonne réponse, l’ajout, la suppression et l’ordre, sans modifier aucune donnée apprenant.

## Cause racine à éliminer
Le système conserve encore plusieurs représentations concurrentes : questions canoniques, copies JSON dans les modules, anciennes surcharges fournisseur et modèles statiques. Les chargements, rafraîchissements et synchronisations fusionnent parfois ces copies selon leur date ou leur couverture, puis une sauvegarde peut recopier ce résultat dans la base. Cette architecture permet donc à une ancienne copie de redevenir officielle après une modification récente.

## Mise en œuvre
1. **Écriture canonique unique et atomique**
   - Remplacer la synchronisation d’un snapshot complet par une commande de sauvegarde canonique explicite pour chaque action : ajouter, modifier, déplacer, désactiver.
   - Conserver l’UUID `question_id`; utiliser l’ancien numéro uniquement comme alias d’affichage/compatibilité.
   - Faire attribuer l’heure et la version par la base, avec contrôle de concurrence afin qu’un écran ouvert sur une ancienne version ne puisse pas écraser une écriture plus récente.
   - Après succès, relire les lignes enregistrées avant de confirmer la sauvegarde dans l’interface.

2. **Lecture canonique unique**
   - Pour chaque exercice possédant un rattachement canonique, remplacer entièrement ses questions par les lignes canoniques actives, triées par `position`.
   - Une section vide ou entièrement désactivée reste vide : aucun retour vers un modèle, une copie JSON ou une ancienne surcharge.
   - Appliquer cette même lecture aux vues Admin/Formateur, Fournisseur et Apprenant.

3. **Neutraliser les sources concurrentes**
   - Empêcher `module_editor_state`, les synchronisations inter-modules, les modèles statiques, les anciennes surcharges et les états locaux de réécrire les questions déjà canoniques.
   - Garder les copies historiques uniquement pour compatibilité/traçabilité, jamais comme source active.
   - Retirer le rafraîchissement périodique inutile et conserver la mise à jour immédiate par événements de base, avec relecture complète après chaque événement.

4. **Compatibilité et sécurité**
   - Ne toucher à aucune réponse, tentative, note, progression, validation, jalon, statut ou résultat apprenant.
   - Préserver les identifiants historiques utilisés par les réponses déjà enregistrées.
   - Garder les droits Admin/Formateur/Fournisseur existants et empêcher toute écriture anonyme non validée.

## Vérifications réelles
Sur des questions de test existantes, noter puis restaurer exactement les valeurs initiales :
- modifier l’énoncé, sauvegarder, contrôler la base, actualiser et contrôler les trois vues ;
- modifier un choix puis la bonne réponse et refaire le même contrôle ;
- changer l’ordre et vérifier la position après actualisation ;
- ajouter puis supprimer une question et vérifier que l’état reste identique après sortie/retour et déconnexion/reconnexion ;
- observer les écritures en base pendant le scénario pour confirmer qu’aucun autre mécanisme ne réécrit une ancienne valeur ;
- comparer avant/après les tables de réponses, résultats, tentatives, progression et validation afin de confirmer qu’elles sont strictement inchangées.

## Résultat attendu
Une seule ligne canonique par `question_id`, une seule version active, et aucune fusion susceptible de restaurer une ancienne question ou réponse. Toute vue recharge exactement la dernière version validée en base.
