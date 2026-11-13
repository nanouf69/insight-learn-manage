# Progression admin / apprenant — 13 novembre 2026

## Décision : NO-GO publication
Correctif partiel en aperçu uniquement. Aucun résultat, réponse, progression, droit ou signature modifié. Aucun déploiement.

## Identité et preuves
- La combinaison exacte module 2, score 102/819 correspond à une seule ligne : Emmanuel NIBITANGA, dossier `3b28099a-f6b7-4477-b73d-4e5c35cc5c0a`, auth `250b8918-bcc4-4f57-b260-efea6f95128b`, VTC e-learning. Attribution : 26, 2, 3, 4, 35, 5, 8.
- L'ancienne ligne completion est `completed`, datée du 17/09 à 10:36:23 UTC ; elle contient 819 détails, seuls les exercices 1 et 2 ont leurs réponses (118). Le score historique 102/819 n'est pas recalculé.
- Quinze reçus `module_2_exo_*` sont réellement `submitted`, avec leurs dates serveur et réponses. Les treize autres remises vont du 04/11 au 13/11 ; la dernière, exercice 82, date du 13/11 à 10:11:28 UTC.
- RPC authentifiée `etat_completion_modules` : 627 questions requises, 627 prouvées, `preuve_complete=true`, statut effectif completed. Le statut actuel Terminé n'est donc PAS déduit de la dernière consultation : il repose sur les preuves serveur et leurs exclusions historiques.
- Connexions iPhone enregistrées pour ce dossier à 15:03–15:09 UTC. Cela corrobore le contexte mais ne prouve pas l'identité ni les réponses réseau de l'onglet de la capture iPhone.

## Cause prouvée / cause non prouvée
Le compteur lit seulement les détails de la vieille completion, tandis que le verdict serveur inclut les reçus d'exercices remis séparément et les exclusions de questions supprimées/ajoutées après validation. D'où le compteur incorrect 2/15 en admin malgré le verdict positif.

Admin Vue apprenant et élève utilisent le même CoursPublic. La production observée sert le commit `6bdc7ed09f43da873000e81b5fbef51a195fc61b`, l'aperçu avant correctif `7c8dd4f3fefe7a96c554c102048a97f0a8193d26`. La production contient déjà le lecteur du verdict serveur. Le bundle réellement chargé dans l'iPhone et son identité restent NON PROUVÉS ; ni cache ancien ni erreur RLS ne sont déclarés cause certaine. Aucun service worker d'application trouvé.

## Correctif préparé
- moduleProgressionReadModel : lecture paginée authentifiée des remises de base de CE dossier ; brouillons, révisions et autres dossiers exclus. Projection seulement, scores/dates/détails originaux conservés.
- Dashboard admin/élève et compteur du détail utilisent cette projection de remises. Verdict serveur demeure autoritaire ; verdict manquant/déphasé refuse le repli silencieux vers un faux Terminé.
- Notification enfant ne marque plus optimistement le module terminé : elle demande une relecture.
- Realtime scoppé, relecture à SUBSCRIBED, focus, retour visible et reconnexion ; aucun polling ajouté. Les deux tables de preuves sont effectivement publiées dans Realtime.

## Limite explicite du compteur
L'aperçu réel passe de 2/15 à 14/15. L'exercice 82 contient dans son ancien détail les questions 66, 68 et 78 absentes de la remise actuelle ; le journal confirme leur suppression les 15–16/09. Le serveur les exclut mais le compteur historique les exige encore. Aucune réponse n'a été inventée pour forcer 15/15. La projection du périmètre historique question par question doit encore être raccordée pour une cohérence exhaustive, sous contrôle lecture seule.

## Vérifications
- 73 tests PASS / 8 fichiers : 0/15, 2/15, 15/15, faux completed avec verdict négatif, ajouts historiques, même projection admin/élève, isolation autres comptes/révisions, verdict manquant/périmé, progression, accès/dispenses.
- Parcours admin authentifié réel : recherche Emmanuel → Vue apprenant → compteur réel 14/15 et Terminé, score 102/819 intact. Ordinateur puis largeur mobile contrôlés.
- L'autorisation de session spécifique au compte Emmanuel n'est pas disponible dans ce contexte ; aucun contournement ni session artificielle. Vrai parcours élève et vrai iOS Safari NON PROUVÉS. Tests de parité simulée ne les remplacent pas.
- Pas de changement RPC/schema : contrat SQL module_completion non nécessaire ici. Aucun événement distant provoqué en production pour tester Realtime.
- Empreintes initiales : completion détails `2790ef0d56aa704714b7e25285b172c0`, réponses `cea69bec0ce5bf2982c833367971906e`.

## Conditions restantes
1. Identifier le compte/bundle exact de la capture iPhone et autoriser sa consultation authentifiée sans écriture.
2. Raccorder le périmètre historique des questions supprimées aux compteurs sans altérer copies/résultats ni jalons figés.
3. Vérifier reprise/réouverture/refresh/reconnexion sur vrai élève et admin, iOS Safari réel et PC, puis isoler le paquet publié des chantiers concurrents.