# Renouvellements → Agréments : dossiers d'agrément TAXI et VTC

Rien de ce qui existe ne sera supprimé ni modifié : le tableau actuel des agréments reste tel quel. On ajoute un bloc en dessous.

## Ce que vous verrez
Dans la section « Agréments préfectoraux », deux colonnes côte à côte (l'une sous l'autre sur téléphone) : **Dossier agrément TAXI** et **Dossier agrément VTC**.

Chaque colonne affiche :
- une barre de progression « X/8 pièces fournies » ;
- un bouton **Télécharger tout le dossier (ZIP)** ;
- la liste des 8 pièces (arrêté du 11 août 2017, art. 3) :
  1. Pièce d'identité du représentant légal *(commune)*
  2. Extrait Kbis de moins de 3 mois *(commune)*
  3. Autorisation de travail, si étranger — facultative *(commune)*
  4. Conditions d'inscription + programme détaillé et durée des formations et examens
  5. Locaux : titre d'occupation, assurance des locaux, conformité ERP *(commune)*
  6. Règlement intérieur
  7. Véhicules : liste, cartes grises, assurances, contrôles techniques
  8. Formateurs : liste, diplômes/attestations, nom du responsable pédagogique

Pour chaque pièce : statut **Manquant / Fourni**, bouton **Ajouter** (PDF, JPG, PNG, plusieurs fichiers), et pour chaque fichier : nom, date d'ajout, date d'expiration (facultative, modifiable), **Télécharger**, **Remplacer**.
- Pièce facultative (3) : comptée comme fournie si absente ou marquée « Non concerné ».
- Pièces communes (1, 2, 3, 5) : un fichier ajouté côté TAXI apparaît aussi côté VTC — c'est le même fichier, enregistré une seule fois.
- **Remplacer** ne supprime jamais l'ancien fichier : il est conservé et marqué « remplacé » (consultable dans un historique replié), conformément à votre règle « rien ne disparaît ».
- Une pièce dont la date d'expiration est dépassée est signalée en rouge.

## Alerte de renouvellement
Pour chaque dossier, un champ « Date de délivrance de l'agrément ». L'échéance est calculée à **+5 ans**. Un bandeau orange apparaît **2 mois avant** l'échéance (rouge si dépassée). Si la date n'est pas saisie, rien n'est calculé.

## À vérifier par vous
- Les libellés des pièces 1, 2 et 5 sont repris de votre message ; à confirmer avec le texte officiel.
- La préfecture du Rhône peut demander des pièces en plus : non ajoutées pour l'instant.

## Détails techniques
- Nouvelle table `agrement_pieces_fichiers` (piece_code, dossiers concernés `taxi|vtc|commun`, chemin de stockage, nom, date d'ajout, date d'expiration, `remplace_par`, `masque`), GRANT + RLS admin uniquement (`has_role admin`), aucune suppression (pas de policy DELETE).
- Nouvelle table `agrement_dossiers` (type taxi/vtc, date_delivrance, pièce 3 « non concerné »), mêmes règles.
- Nouveau stockage privé `agrements`, policies admin ; téléchargement par lien signé.
- ZIP généré dans le navigateur (JSZip, déjà présent ou ajouté).
- Nouveau composant `src/components/renouvellements/DossiersAgrement.tsx`, inséré dans `RenouvellementsPage.tsx` sous la carte « agrement » (ajout de quelques lignes, rien d'autre modifié).

## Fichiers
- Créé : `src/components/renouvellements/DossiersAgrement.tsx`
- Modifié (ajout seulement) : `src/components/renouvellements/RenouvellementsPage.tsx`
- Migration : 2 tables + policies stockage ; bucket `agrements`
- Pas de publication sans votre « publie ».
