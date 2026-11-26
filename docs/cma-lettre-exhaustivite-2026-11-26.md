# Lettre CMA : exhaustivité — 26 novembre 2026

## Règle
Chaque personne affichée dans « Candidats à former » de la session doit apparaître dans la préparation de la lettre CMA, une seule fois, sans être déclarée inscrite faute de preuve. Les lettres déjà envoyées restent intactes.

## Constat réel
Ayoub **BENAKKI** (bba53239-a98d-4de6-b64c-d4e8aee74b7f) : théorie du 17 novembre 2026, résultat oui, pratique enregistrée au 26 novembre, aucun résultat pratique. Aucun planning CMA nominatif trouvé. La configuration 17 novembre / 16–23 décembre contient déjà son ID comme ajout CMA : cet ajout a été conservé, aucune mutation réalisée. On ne peut donc pas affirmer qu'il manque encore dans la session réelle au moment de cette relecture.

## Cause de code et correction
- La lettre était rendue avant le bloc « Candidats à former » qui remplissait une ref ; un effet ne déclenchait une nouvelle lecture que sur changement de la chaîne des IDs. Cela créait un rendu retardé, des notes/types périmés et un premier rendu utilisant la liste précédente.
- Le calcul existant de `tousAFormer` est déplacé avant les deux sections, sans changement de ses exclusions. Lettre et liste lisent désormais le même tableau dans le même rendu.
- L'union de lettre utilise `candidatsLettreAvecFormation`, dédoublonnée par ID. Les candidats sélectionnés viennent directement de la source CMA, pas d'un second chargement de recherche.
- La catégorie locale omettait VA ; elle réutilise désormais `categorieCma`. Filière inconnue : affichée dans « Filière à vérifier », génération bloquée au lieu d'une omission silencieuse.
- Le compteur 46 de la capture ne prouve pas l'exhaustivité : test 46 sélectionnés + 50 à former => 50 IDs conservés.

## Inventaire des chemins vérifiés par lecture
| Chemin | Résultat |
|---|---|
| Examen et Réussite → Candidats à former | Source identique partagée, exclusions enregistrées inchangées |
| Lettre CMA → listes VTC/TAXI/inconnue et compteurs | Corrigés : union sans filtre destructif ; inconnu visible |
| Impression de lettre et envoi manuel | Même `generateLettreHTML`, union commune ; contrôles de preuve/relecture et notes conservés |
| Chargement `useCmaLettreSources` | Lecture paginée, pas d'écriture ; sélection d'inscription distincte de la liste à former, conservée |
| `selectionLettreCma` | Ne considère pas une réussite théorique/ajout comme inscription confirmée ; règles inchangées |
| Page autonome Candidats à former | Liste globale des réussites, différente du périmètre session ; aucun export lettre ni envoi, inchangée |
| Service Outlook d'envoi | Transport du contenu fourni, pas de sélection nominative CMA ; inchangé |
| Configuration planning et notes | Enregistre réglages/notes uniquement ; aucun historique réécrit par ce lot |
| Tâche automatique/fonction SQL de lettre | Aucun sélecteur/générateur de lettre CMA trouvé dans les sources consultées ; pas de modification serveur |

## Vérification
- 33 tests Vitest ciblés PASS : union/exhaustivité, sélection de preuves, notes et signatures pratiques.
- PC/mobile simulés : vrai écran monté avec 50 identités fictives et toutes requêtes de données interceptées ; 50/50 noms présents dans les deux sections, aucune erreur JavaScript. Aucun faux dossier créé.
- Build OK. Aucun envoi, publication, SQL, modification de résultat, date, inscription ou lettre envoyée.
- Consultation réelle des deux listes **NON PROUVÉE** : session du demandeur redirigée vers cours-public, vérification d'accès refusée. Aucune permission élargie.
- La capture indique un territoire/passage à vérifier : le blocage de génération reste conservé, ce correctif ne fabrique pas ces preuves.

Aperçu : Examen et Réussite → 17 novembre 2026 → Lettre CMA / Candidats à former.