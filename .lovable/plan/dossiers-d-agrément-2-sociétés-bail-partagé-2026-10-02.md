# Dossiers d'agrément : 2 sociétés + bail partagé

Aucune pièce n'a encore été déposée : rien d'existant à déplacer ni à modifier. Le tableau des agréments au-dessus ne change pas.

## Ce que vous verrez
- En haut du bloc, un choix de société : **SERVICES PRO** / **OPTO**.
- Pour chaque société, les deux colonnes **Dossier agrément TAXI** et **Dossier agrément VTC** (8 pièces, progression, ZIP, date de délivrance et alerte à 5 ans), propres à cette société.
- Tout est cloisonné par société : un fichier déposé chez SERVICES PRO n'apparaît jamais chez OPTO.
- À l'intérieur d'une même société, les pièces 1, 2, 3 et 5 restent communes à TAXI et VTC (comme aujourd'hui).

## Seule exception : pièce 5 (Locaux)
- Au moment d'ajouter un fichier en pièce 5, une case **« Commun aux deux sociétés »**.
- Cochée : le fichier est déposé une seule fois et apparaît dans les 4 dossiers (TAXI et VTC de SERVICES PRO et d'OPTO), avec un badge **« Partagé »**.
- Usage prévu : bail du 86 route de Genas et avenant de co-titularité du 01/10/2026.
- Remplacer un fichier partagé le remplace dans les 4 dossiers ; l'ancien reste dans « Anciennes versions » (rien n'est supprimé).
- La case n'existe que sur la pièce 5.

## Détails techniques
- Migration additive : colonne `societe` (texte, NULL = partagé entre sociétés) sur `agrement_pieces_fichiers` ; colonne `societe` sur `agrement_dossiers` avec clé (societe, type). Contrainte : `societe` NULL autorisé seulement pour `piece_code = 'p5'`. Pas de policy DELETE ajoutée.
- `DossiersAgrement.tsx` : sélecteur de société, filtres par société (+ fichiers p5 partagés), badge, case à cocher, chemins de stockage préfixés par société.
- Fichiers : `src/components/renouvellements/DossiersAgrement.tsx` (modifié) + 1 migration. Aucun autre fichier.
- Pas de publication sans votre « publie ».
