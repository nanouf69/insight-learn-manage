# Dossiers agrément : une ligne par document

Rien n'est supprimé. Les fichiers déjà déposés sont seulement rattachés à leur nouvelle sous-ligne, sans copie ni déplacement dans le stockage.

## Ce que vous verrez
Chaque pièce (1 à 8) s'ouvre sur des sous-lignes numérotées, comme dans votre message (1.1 recto, 1.2 verso, 2.1 Kbis... 8.3 diplômes). Chaque sous-ligne a :
- son bouton d'ajout de fichier ;
- son statut : Fourni, Manquant, ou Non concerné quand c'est prévu (3.1, 7.4, 7.5) ;
- sa date d'expiration ;
- son icône PDF et « Copier le lien » ;
- son partage TAXI/VTC, réglé ligne par ligne :
  - communes par défaut : 1, 2, 3, 5, 6, 7, 8 ;
  - pièce 4 : case « Aussi pour VTC/TAXI », décochée par défaut.

Autres comportements :
- **2.1 Kbis** : alerte « Kbis de plus de 3 mois », calculée à partir de la date d'ajout du fichier.
- **7. Véhicules** : un bloc par véhicule (7.2 à 7.6) et un bouton « + Ajouter un véhicule ». La ligne 7.1 (liste des véhicules) est unique.
- **8. Formateurs** : un bloc par formateur (8.2 et 8.3, plusieurs fichiers possibles) et un bouton « + Ajouter un formateur ». La ligne 8.1 (liste et responsable pédagogique) est unique. Chaque bloc porte un nom modifiable (ex. « Kia », « Akono Albert »).
- **Progression** : X sous-lignes fournies sur le total. « Non concerné » compte comme fourni. Le total augmente avec chaque véhicule ou formateur ajouté.
- **ZIP et PDF complet** : dans l'ordre 1.1, 1.2, 2.1... 8.3.
- Les pièces que vous avez ajoutées vous-même restent en bas, inchangées (il n'y en a aucune pour l'instant).

## Rattachement des fichiers existants (OPTO)
| Fichier | Nouvelle ligne |
|---|---|
| pi rayan.jpg | 1.1 recto |
| pi veso rayan.jpg | 1.2 verso |
| KBIS_2026-07-07 | 2.1 |
| Devis_VTC_complet_OPTO (1).pdf (actuellement côté TAXI) | 4.1, côté TAXI |
| 03_Etat_descriptif_locaux | 5.5 |
| 07_Reglement_interieur | 6.1 |
| carte grise kia.pdf | 7.2, véhicule 1 « Kia » |
| 04_Liste_formateurs | 8.1 |
| CV_Akono_Albert + akono diplôme.jpg | formateur 1 « Akono Albert » : 8.2 + 8.3 |
| CV_Guenichi_Naoufal + bachelor.jpg | formateur 2 « Guenichi Naoufal » : 8.2 + 8.3 |

Points à confirmer :
- **bachelor.jpg** : je le rattache à Guenichi Naoufal. Dites-moi si c'est faux.
- **Devis VTC** : il est déposé côté TAXI. Il semble destiné à VTC 4.1. Je ne le déplace pas sans votre accord.
- **Doublon pièce 1** : 2 copies de la pièce d'identité marquées « commun aux deux sociétés » (invisibles aujourd'hui). Je n'y touche pas.

## Détails techniques
- Migration additive :
  - colonnes `sous_ligne` (texte, ex. `1.1`, `7.2`) et `bloc_id` (uuid, NULL hors véhicules/formateurs) sur `agrement_pieces_fichiers` ;
  - nouvelle table `agrement_blocs` (id, societe, type `vehicule|formateur`, nom, ordre, masque), RLS admin, sans DELETE ;
  - nouvelle table `agrement_sous_lignes_etat` (societe, dossier, sous_ligne, bloc_id, non_concerne) pour « Non concerné ».
- Données : `UPDATE` de `sous_ligne` et `bloc_id` sur les 13 lignes OPTO listées, plus `INSERT` de 3 blocs (Kia, Akono, Guenichi). `piece_code` est gardé tel quel, pour compatibilité.
- L'ancienne case « Non concerné » de la pièce 3 (`piece3_non_concerne`) reste lue comme valeur de 3.1.
- Fichiers :
  - `src/components/renouvellements/DossiersAgrement.tsx` (modifié) ;
  - 1 migration.
- Pas de publication sans votre « publie ».
