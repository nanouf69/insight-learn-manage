# Corrections ciblées — 7 novembre 2026, 21 h UTC

## 1. Export nocturne du 07/11

- **Cause confirmée** : `canceling statement due to statement timeout` dans `reponses_apprenants_journal` à la position OFFSET 928 000. Le marqueur historique `_incomplet.json` du 07/11 est daté de 02:48:21 UTC ; les 1 232 fichiers et ce marqueur sont conservés.
- **Capacité avant réparation** : base et pool disponibles, 30/90 connexions, disque 29 %, aucune alerte d’épuisement récente. L’ancien fragment du journal occupait 403 527 021 octets ; l’estimation du volume complet est d’environ 0,7 Go. Aucune infrastructure nouvelle et aucun coût IA.
- **Action autorisée** : réexport indépendant dans `2026-11-07/_reparation-1/`, lecture par clé, paquets de 10 000 lignes pour cette seule table, reprise bornée. Aucun fichier historique supprimé ou écrasé, aucune rotation déclenchée.
- **Durcissement livré** : le manifeste de réparation contient maintenant `table_names`, obligatoire pour le restaurateur ; une restauration sans tables est refusée au lieu de produire une réussite vide. Fonction déployée, SHA source `c2e932179abb7b1e7a87794e990ae1ee84d9cbcc442ff1eff356d25852a1e46f`.
- **Restauration** : contrat exécuté uniquement sur PostgreSQL jetable avec export fictif : restauration réussie et refus des paquets manquants, clés dupliquées, JSON tronqué, références orphelines, manifeste sans tables et cible distante. Ceci ne prouve pas la restauration du réexport réel et ne constitue jamais un instantané cohérent du 07/11.
- **État final du réexport réel** : **231 fichiers, 815 630 954 octets**, parcours terminé avec **1 777 363 lignes**, mais comptes divergents sous activité concurrente : 1 777 132 au début et 1 777 383 à la fin (+231 au début/fin ; 20 lignes supplémentaires après le curseur final). Le manifeste `_incomplet.json` de la réparation signale cet écart ; il ne s’agit pas d’un instantané cohérent et la restauration réelle reste non prouvée. Les clés ont été lues dans l’ordre croissant par le curseur, sans erreur de clé détectée ; aucune validation indépendante de tous les contenus n’est revendiquée.

## 2. Émargements

- Les 216 lignes datées sans image ont toutes `signed_at = created_at`, sans agent, confirmation, justificatif ou régularisation : `signed_at` a la valeur par défaut `now()` et ne prouve pas une signature. 166 sont futures et 50 passées. Aucune perte d’image n’est démontrée.
- Les lecteurs/PDF utilisent l’image réelle comme preuve. Les 1 348 images ont été comparées à `emargement_creneaux_reels` : 131 images chez 8 apprenants ne correspondent plus à un créneau actuel, sans régularisation ni dossier lié. Les dossiers concernés comprennent notamment d’anciens e-learning/listes d’attente ; le créneau actuel ne peut pas invalider ces preuves historiques.
- **Aucune signature créée, copiée, masquée, déplacée, antidatée ou effacée.** Aucun `signed_at` modifié.
- Vérifications : 40 tests Vitest de preuves/PDF/créneaux pratiques et 25 contrats PostgreSQL jetables, tous réussis. Le banc a été complété avec l’exception novembre 0236 déjà appliquée en production ; aucune règle métier changée.

## 3. Planning CMA

- Les quatre lignes créées le 16/10 restent sans rattachement : DESCOLAS (aucune fiche), OUERFELLI (deux fiches), NAFFATI (orthographe différente), MESBAHI Cérine (fiche unique exacte).
- L’algorithme actuel gère déjà les prénoms multiples et ces quatre cas : 10 tests CMA et 9 tests d’attente passent. Aucune modification de contenu, fiche ou compte.
- Le rattachement MESBAHI a été tenté uniquement via `rattacher_attente_cma`. Le compte du responsable possède le rôle `user`, pas `admin` : refus 403/42501 sans écriture. La création d’une session pour l’unique administrateur technique exige une autorisation interactive indisponible ici. **La ligne reste donc en attente** ; prérequis unique : une session administrateur habilitée.

## 4. Paiements

- Défaut confirmé : l’ancien repli dédupliquait seulement par date et montant, sans identité stable du virement.
- Migration **0247** appliquée : colonne nullable `transaction_bancaire_id`, référence au virement et unicité globale lorsqu’elle est renseignée. Aucun backfill : 18 paiements existants, 18 conservés, 0 liaison historique inventée.
- Le nouvel ajout explicite depuis un virement conserve son identifiant ; une modification du montant/date empêche la liaison. Un virement lié à un autre dossier est exclu du calcul de la session courante. Deux vrais virements égaux avec deux identifiants restent additionnés.
- Un paiement existant de 200 € correspond exactement à un virement de même date ; il restait déjà dédupliqué par le repli historique.
- Tests : 14 Vitest et un contrat PostgreSQL jetable (dates différentes, virements égaux, refus de double liaison dans un autre dossier) réussis.
- Publication frontend confirmée à 21:18 UTC sur `insight-learn-manage.lovable.app` et `gestion.ftransport.fr` : paquet `index-Dl3wEx4I.js`, SHA-256 `7a6251ce909e45eceebac962ddde67428af48034d6c8cf97c5f276a2c14c5a6e`, contenant la liaison `transaction_bancaire_id`.

## 5. Synchronisation des questions

- Défaut reproduit sur PostgreSQL jetable : une propagation pouvait réintroduire Q40/Q41 dans TAXI 10/62 après leur retrait local.
- Migration **0248** appliquée : seules les questions réellement nouvelles dans la source peuvent être ajoutées ; les questions absentes de la cible mais présentes dans l’ancienne source ne reviennent plus. Les nouvelles questions et modifications de texte continuent à se propager ; aucune suppression automatique ajoutée.
- Empreintes des modules 2 et 10 identiques avant/après. Q40/Q41 restent présentes dans les deux modules et Q49 dans TAXI : aucun contenu existant modifié.
- Les 210 liens sécurité ont leurs deux questions, les mêmes identifiants, énoncés et choix. 119 différences de position ; les autres écarts sont des métadonnées/images (`uid`, références canoniques, dates, type, image). Aucun alignement automatique et aucune publication de variante.
- Contrat de réintroduction : 2 scénarios PostgreSQL jetables réussis.

## Vérifications transverses et coûts

- **3 695 tests globaux réussis**, 13 ignorés, 0 échec ; compilation `build OK` après les modifications.
- Deux scans frais : **0 critique, 6 avertissements, 2 informations**. L’avertissement critique renvoyé par le connecteur de publication sur `bilan_future_opening` est contredit par la règle active relue : lecture `authenticated` limitée à `has_role(auth.uid(), 'admin')`.
- Aucun mail/SMS, aucun nouvel appel de notation IA, aucune dépense IA. Aucun coût d’infrastructure nouveau ; le prix exact du stockage additionnel n’est pas disponible dans les outils.
- Aucune réponse, note validée, signature, question, bonne réponse, tentative ou historique élève modifié.

## Limites restantes

1. Rattachement MESBAHI : session administrateur habilitée indispensable ; les trois autres lignes exigent un choix humain ou une fiche supplémentaire.
2. Restauration du réexport réel non exécutée ; seule la restauration fictive sur base jetable est prouvée.
