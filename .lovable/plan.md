# Corrections ciblées des bilans TAXI/TA

## Périmètre autorisé
- Corriger les intentions d’édition par identifiant explicite : une ouverture ou une modification voisine ne doit jamais autoriser la réécriture de Q68.
- Préparer et tester une ouverture TA réservée aux futurs passages, avec contenu canonique figé et retour inchangé pour toute copie déjà enregistrée.
- Ne pas activer les ajouts locaux tant que les copies TA en cours, y compris leurs contenus, ne sont pas protégées de façon démontrée.
- Conserver Q73 historique : son retrait de la liste commune d’affichage et de notation n’est pas démontré sans effet sur la note.

## Protection des passages existants
Les copies TA en cours n’ont pas de contenu intégral figé. Les réponses seules ne prouvent pas l’énoncé et les clés vus à l’ouverture. Aucune reconstruction historique ne sera présentée comme une preuve. Les trois ajouts vérifiés47/48/49 restent donc suspendus ; les six questions incertaines restent inchangées.

## Détails techniques
- `ModuleDetailView.tsx` : transmettre l’ID de la seule question éditée ; intentions isolées par éditeur pour les bilans11/28 ; ne pas déduire d’intention des différences de représentation.
- `adminQuestionSaveIntent.ts` et tests voisins : autorisation explicite, contrôle d’une modification voisine deQ68, réouverture sans commande.
- Prototype SQL testé sur PostgreSQL jetable uniquement : mêmes IDs/ordre/champs canoniques TAXI/TA ; copies existantes non migrées ; tests accès, idempotence, conservation et notation.
- Rapport et feuille de route : distinguer aperçu, serveur actif, préparation non activée et parcours réel non vérifié. Aucun mail ni publication.