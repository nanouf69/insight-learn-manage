# Dossiers d'agrément : un lien PDF pour chaque document

Rien d'existant n'est supprimé ni modifié : les fichiers déjà déposés restent tels quels et gardent leurs boutons actuels.

## Ce que vous verrez
- À côté du nom de chaque pièce (pièces 1 à 8 et pièces ajoutées) : une **icône PDF par fichier**. Un clic l'ouvre dans un nouvel onglet.
- Tant qu'aucun fichier n'est déposé : **icône grisée + « Manquant »**.
- Pour chaque PDF, un bouton **« Copier le lien »**. Ce lien ouvre une page de l'application qui demande d'être connecté en administrateur, puis affiche le PDF. Une personne non connectée ne voit rien.
- **Conversion automatique en PDF** au dépôt :
  - JPG / PNG : converti en PDF (une page, image entière).
  - Word (.docx) : maintenant accepté au dépôt, converti en PDF (texte, titres, listes, tableaux simples, images ; une mise en page Word complexe peut différer légèrement).
  - L'original reste téléchargeable (bouton Télécharger actuel).
  - Pour les fichiers JPG/PNG déjà déposés (ex. pièce d'identité), le PDF est fabriqué à l'ouverture, sans modifier le fichier stocké.
- Un bouton **« PDF complet du dossier »** à côté de « Télécharger tout le dossier » : un seul PDF, pièces dans l'ordre 1 à 8 puis pièces ajoutées, par société et par type (ex. `Dossier_agrement_OPTO_TAXI.pdf`). Les pièces communes et le bail partagé y sont inclus.

## Détails techniques
- Migration additive : colonne `pdf_storage_path` (texte, NULL) sur `agrement_pieces_fichiers`. Aucune ligne existante modifiée.
- Conversion dans le navigateur : images via `pdf-lib` (déjà installé) ; .docx via `mammoth` (nouvelle dépendance) → HTML → PDF avec `jspdf` (déjà installé). Le PDF est déposé dans le même bucket privé `agrements`, à côté de l'original.
- Fusion du dossier complet : `pdf-lib` (PDF + images ; un .docx sans PDF converti est signalé et ignoré dans la fusion).
- Lien sécurisé : nouvelle route `/agrement-document/:id` (connexion admin requise, puis lien signé de 5 minutes généré à l'ouverture). Aucun lien public permanent.
- Fichiers :
  - `src/components/renouvellements/DossiersAgrement.tsx` (modifié)
  - `src/lib/agrementPdf.ts` (nouveau : conversion + fusion)
  - `src/pages/AgrementDocument.tsx` (nouveau : page du lien sécurisé)
  - `src/App.tsx` (ajout de la route)
  - `package.json` (ajout de `mammoth`)
  - 1 migration
- Pas de publication sans votre « publie ».
