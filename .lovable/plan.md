# Vérification lecture seule — 6 QRC Aba-Bakre interrompues (22/10)

Rien n'a été modifié : aucun code, aucune donnée, aucun appel IA, aucun mail, aucun déploiement.

## Résultat par appel (journal AI Gateway, heure de Paris = UTC+2)

| QRC | Début (Paris) | Journal fournisseur | Statut | Durée | Jetons entrée/sortie |
|---|---|---|---|---|---|
| 4814bf89 | 17:25:03 | 01a16437-3a60 (fin 17:26:03) | annulé 499 | 59,96 s | 208 / 0 |
| 6f0e5f81 | 17:36:02 | 01a16441-47e4 (fin 17:37:02) | annulé 499 | 59,97 s | 230 / 0 |
| 972083aa | 17:41:01 | 01a16445-d9e2 (fin 17:42:01) | annulé 499 | 59,93 s | 167 / 0 |
| 8161a9b6 | 17:43:01 | 01a16447-aed9 (fin 17:44:01) | annulé 499 | 59,97 s | 193 / 0 |
| b64b7b6f | 17:45:01 | 01a16449-8349 (fin 17:46:01) | annulé 499 | 59,90 s | 212 / 0 |
| 58229778 | 17:53:01 | 01a16450-d5e6 (fin 17:54:01) | annulé 499 | 59,97 s | 193 / 0 |

Modèle : google/gemini-3.8-flash pour les 6. Coût : inconnu (pas zéro prouvé).

## Ce qui est prouvé

- Corrélation unique : entre 17:20 et 18:00, il y a 19 appels. Seuls ces 6 sont annulés. Chacun se termine à la même seconde que la fin locale enregistrée.
- Catégorie : abandon local à 60 s. Le fournisseur n'a renvoyé aucun jeton de réponse (0 en sortie) et aucun code d'erreur. Le 499 veut dire que c'est notre fonction qui a coupé, pas le fournisseur.
- Aucune réponse IA ne s'est perdue : le fournisseur n'a rien produit, donc il n'y avait aucune note à publier.
- Aucun 429 ni 5xx : le fournisseur n'a jamais répondu.
- Les appels voisins réussissent en 2 à 25 s. Ce n'est donc pas une panne générale du service.
- Le journal n'affiche aucun appel postérieur pour ces 6 QRC jusqu'à 18:00. Cela concorde avec leur statut « à vérifier » sans relance.

## Cause probable (non prouvée)

- Les 6 copies ont un point commun : la réponse de l'élève est très courte et identique pour les 6. Je ne la cite pas ici.
- Le modèle n'a émis aucun jeton pendant 60 s, alors qu'il répond normalement en quelques secondes. L'hypothèse la plus probable est un blocage du fournisseur sur ce type d'entrée très courte, en mode flux.
- Ce n'est pas prouvé : le journal ne contient ni le corps de réponse du fournisseur ni ses en-têtes.

## Limites

- Coût inconnu : le journal ne dit pas si le fournisseur a facturé les jetons d'entrée.
- Il n'y a pas d'identifiant d'exécution côté file (`dernier_run_id` est NULL). La correspondance repose seulement sur l'heure à la seconde près. Elle est unique dans la fenêtre, mais ce n'est pas un identifiant partagé.
- Le journal ne permet pas de distinguer un blocage du modèle d'un blocage réseau entre la passerelle et le fournisseur.

## Une reprise limitée serait-elle sûre ?

- Sur le risque : oui. Aucun résultat n'a été produit, donc il n'y a aucune note à écraser ni aucune double publication possible. Le seul risque est un coût d'entrée éventuel, d'environ 0,003 crédit par appel.
- Sur l'efficacité : elle a de fortes chances de bloquer de nouveau, car la même entrée donne probablement le même comportement.
- Option plus fiable : une correction manuelle par l'admin de ces 6 QRC, ou une règle explicite pour les réponses très courtes, à décider par vous. Rien n'est relancé sans votre accord.

## Ce qui permettrait une preuve complète

- Enregistrer le `run_id` du journal IA dans chaque tentative, pour relier les deux sans dépendre de l'heure.
- Mettre en place une alerte quand aucun jeton n'arrive après 20 à 30 s.

Ces deux points ne sont pas appliqués : ils nécessitent votre accord.
