# Bilans d’exercices — synchronisation dynamique des sources (09/11/2026)

## Verdict et périmètre

- **Défaut reproduit** : après suppression de la question source 1:1 et modification de 1:2 sur une copie fictive, l’ancien chemin affiche toujours 128 questions, conserve 1:1 et montre l’ancien texte de 1:2. La projection attendue en affiche 126, sans 1:1 et avec le texte modifié.
- **Correctif appliqué en aperçu uniquement** : les bilans d’exercices lisent les versions enregistrées des modules sources 2 (VTC) et 10 (TAXI), puis projettent leurs questions actives. Aucun `INSERT`, `UPDATE`, `DELETE`, déploiement ou publication n’a été exécuté.
- **Aucune mutation des historiques** : le JSON brut des bilans reste en base ; les IDs historiques sont conservés ; les copies figées continuent d’utiliser leurs snapshots ; les réponses, notes, progressions et jalons ne sont pas recalculés.
- **Exclusions inchangées** : bilans d’examen 5/11/28/30, examens blancs et exercices indépendants ne sont pas référencés par la projection.

## Cause racine vérifiable

1. `ModuleDetailView.tsx` alimentait `coursSommeExercicesRef` directement depuis `VTC_COURS_DATA` / `TAXI_COURS_DATA`, donc depuis des listes figées dans le paquet applicatif, et non depuis `module_editor_state` des modules 2/10.
2. La projection était appelée avec `{ preserverContenuExistant: true }`. Même avec une source à jour, elle conservait donc l’ancien énoncé, les anciens choix et l’ancienne image de l’objet Bilan.
3. Plusieurs chemins de relecture (`Realtime`, banque canonique, parent FC, confirmation de sauvegarde) réécrivaient `moduleData` sans réappliquer la projection. Le résultat dépendait du chemin de chargement.
4. La restauration avant sauvegarde, elle, protégeait correctement le JSON brut : elle n’était pas la cause de la réapparition. La question réapparaissait parce que la projection suivante utilisait de nouveau la source statique qui la contenait encore.

## Correction appliquée

- Nouveau résolveur `bilanCoursSources.ts` : état serveur des exercices sources prioritaire, suppressions explicites `deletedQuestionIds` et suppressions d’exercices respectées, source embarquée seulement comme repli structurel si aucun état serveur n’existe.
- Contenu actif de la vue = contenu de la source serveur ; identité numérique historique du Bilan conservée. Les entrées legacy sans référence directe sont rapprochées de leur ancienne référence pour ne pas changer d’ID après édition du texte.
- Lecture des sources à l’ouverture, sur événement `module_editor_state`, notification locale inter-onglets, focus, retour de visibilité et reconnexion. Le rafraîchisseur mutualise les lectures et borne les reprises ; aucun nouvel intervalle de polling n’est ajouté.
- Projection réappliquée après les lectures canoniques, les retours Realtime, les parents FC, la visibilité et la confirmation de sauvegarde.
- Une source entièrement vidée est acceptée seulement avec des suppressions explicites ; une liste vide sans preuve reste refusée pour éviter un effacement accidentel de l’affichage.

## Compositions réelles lues en production — attente affichée dans l’aperçu

« Ancienne projection » rappelle la composition statique précédente ; certains chemins canoniques pouvaient encore afficher une autre valeur. « Sources serveur » est la somme actuellement enregistrée dans les modules 2/10, et donc la composition que le correctif doit afficher.

| Module | Matière | Ancienne projection | Sources serveur | Détail des sources actives |
|---|---|---:|---:|---|
| 4 VTC | T3P | 128 | **133** | 53 + 80 |
| 4 VTC | Gestion | 94 | **148** | 45 + 58 + 45 |
| 4 VTC | Sécurité routière | 211 | **240** | 111 + 50 + 79 |
| 4 VTC | Français | 103 | **103** | 103 |
| 4 VTC | Développement commercial | 66 | **66** | 66 |
| 4 VTC | Anglais | 126 | **126** | 53 + 32 + 23 + 18 |
| 4 VTC | Réglementation spécifique VTC | 35 | **34** | 34 |
| 9 TAXI | T3P | 128 | **122** | 53 + 69 |
| 9 TAXI | Gestion | 94 | **149** | 45 + 58 + 46 |
| 9 TAXI | Sécurité routière | 211 | **241** | 111 + 50 + 80 |
| 9 TAXI | Français | 103 | **103** | 103 |
| 9 TAXI | Anglais | 126 | **126** | 53 + 32 + 23 + 18 |
| 9 TAXI | Réglementation nationale | 99 | **99** | 64 + 35 |
| 9 TAXI | Réglementation locale | 114 | **112** | 30 + 30 + 27 + 25 |
| 27 TA | Réglementation nationale | 99 | **99** | mêmes sources module 10 |
| 27 TA | Réglementation locale | 114 | **112** | mêmes sources module 10 |
| 29 VA | Français | 103 | **103** | même source module 2 |
| 29 VA | Développement commercial | 66 | **66** | même source module 2 |
| 29 VA | Anglais | 126 | **126** | même source module 2 |
| 29 VA | Réglementation spécifique VTC | 35 | **34** | même source module 2 |
| 81 FC VTC | T3P | 128 | **133** | hérite de la projection VTC |
| 81 FC VTC | Sécurité routière | 211 | **240** | hérite de la projection VTC |
| 81 FC VTC | Développement commercial | 66 | **66** | hérite de la projection VTC |
| 81 FC VTC | Réglementation spécifique VTC | 35 | **34** | hérite de la projection VTC |
| 82 FC TAXI | T3P | 128 | **122** | hérite de la projection TAXI |
| 82 FC TAXI | Sécurité routière | 211 | **241** | hérite de la projection TAXI |
| 82 FC TAXI | Réglementation nationale | 99 | **99** | hérite de la projection TAXI |
| 82 FC TAXI | Réglementation locale | 114 | **112** | hérite de la projection TAXI |

Ces valeurs ne sont pas écrites dans les modules : elles découlent de la lecture seule des sources actives au 09/11.

## Tests

- Matrice dynamique : **29 compositions**, chacune avec suppression + ajout + modification + réordonnancement, puis restauration du JSON brut avant sauvegarde et nouvelle projection. Vérifications : clés et ordre exacts, question supprimée absente, contenu modifié visible, ajout visible, ID historique stable, exercice indépendant inchangé.
- Identité legacy sans référence directe conservée après réécriture du texte source.
- Suppression de toutes les questions avec preuves explicites = vue vide ; source vide sans preuve = refus sûr.
- Transport local fictif : événement puis sonde de reprise en ligne ; la suppression apparaît, puis la modification et l’ajout sont relus. **Ce test ne prouve pas le Realtime hébergé.**
- Tests ciblés initiaux : **122 réussis, zéro échec** ; nouveau test de transport : **32/32** dans le fichier dynamique.
- Sauvegarde admin, banque nationale et snapshots figés : **28/28**.
- Suite globale : résultat final à consigner après la fin du processus détaché.

## Données et production

- Empreintes des modules 2, 4, 5, 9, 10, 11, 27, 28, 29 et 30 relues : strictement identiques au rapport précédent. Les modules 81/82 n’ont pas de ligne propre et continuent d’hériter de leur parent.
- Volumes relus : 788 réponses et 203 complétions sur les modules concernés. Le précédent audit comptait 785 réponses : trois réponses ont donc été ajoutées par une activité concurrente ; aucune écriture de ce chantier ne les a produites.
- Compte admin disponible : accès élève expiré au 30/04/2026, donc **affichage navigateur admin non vérifié**. Aucun rôle ni accès n’a été modifié.
- Production publique inchangée : `assets/index-Cv2PoEkg.js`, SHA256 `cae9f493d365e32955cdddbf37b4f7e28a780669510cb998005d29aa47a8b157` ; la nouvelle lecture des sources y est absente.
- Aucune publication, migration, écriture réelle, notification, IA ou appel payant.
