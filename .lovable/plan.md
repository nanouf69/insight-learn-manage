# Dossiers agrément : TAXI et VTC synchronisés sur toutes les pièces

## Ce que vous verrez
- **Pièces 1, 2, 3, 5, 6, 7 et 8** : communes à TAXI et VTC dans une même société. Badge « commun TAXI/VTC ». Un seul fichier stocké.
- **Pièce 4** : chaque fichier a une case « Aussi pour VTC » (côté TAXI) ou « Aussi pour TAXI » (côté VTC), décochée par défaut. Cochée : le fichier s'affiche aussi de l'autre côté, avec le badge « commun TAXI/VTC ». Décochée : il ne reste que du côté d'origine.
- Remplacer ou retirer un fichier commun s'applique aux deux côtés. L'ancien est conservé dans « Anciennes versions » ou masqué, jamais supprimé.
- « Non concerné » (pièce 3) compte déjà comme fournie dans X/8. C'est inchangé.
- Les sociétés restent séparées. Seuls les fichiers « Commun aux deux sociétés » (pièce 5) sont partagés.

## Report de l'existant (seule modification de données, à votre demande)
Les 7 fichiers OPTO actuellement côté TAXI passent en commun. Ils ne sont ni copiés ni déplacés dans le stockage :
- pièce 6 : 1 fichier
- pièce 7 : 1 fichier
- pièce 8 : 5 fichiers

Le fichier OPTO de la pièce 4 TAXI reste côté TAXI seulement (case décochée).
Résultat attendu pour OPTO VTC : 7/8. Seule la pièce 4 manque (le devis VTC).

Aucun fichier n'est encore déposé chez SERVICES PRO, donc rien n'y change.

## Détails techniques
- Migration additive : colonne `aussi_autre_dossier boolean default false` sur `agrement_pieces_fichiers` (pièce 4).
- Données : `UPDATE agrement_pieces_fichiers SET dossier='commun' WHERE societe='opto' AND piece_code IN ('p6','p7','p8') AND dossier='taxi'` (7 lignes, valeur avant/après vérifiée).
- `DossiersAgrement.tsx` : `commune: true` sur p6, p7 et p8 ; filtre de la pièce 4 = côté propre + fichiers de l'autre côté avec la case cochée ; case et badge.
- Fichiers : `src/components/renouvellements/DossiersAgrement.tsx` + 1 migration.
- Pas de publication sans votre « publie ».
