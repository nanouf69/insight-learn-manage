# Onglet « Attestations » dans la fiche session

## Ce qui existe déjà
La fiche session sait déjà fabriquer l'attestation de formation continue (bouton par apprenant, téléchargement groupé, envoi groupé par e-mail avec dépôt dans le dossier de l'élève). Mais elle ne filtre pas : tout le monde y a droit.

## Ce qui sera ajouté
Un 5e onglet **« Attestations (X) »** à côté de Apprenants / Formateurs / Factures / Absents.

Il liste seulement les apprenants qui remplissent les 2 conditions :
- **Présent** : pas dans la liste des absents, et au moins une feuille d'émargement signée (feuilles masquées ignorées).
- **A payé** : facture de la session marquée « acquittée ».

Pour chaque personne : nom, e-mail, présence, paiement, et 3 boutons : **Télécharger**, **Envoyer par mail**, date du dernier envoi.
En haut : **Tout envoyer par mail** et **Tout télécharger** (seulement pour les personnes de cette liste).

Les personnes exclues sont affichées en dessous, en gris, avec la raison (« absent », « facture non acquittée », « pas de facture »), sans bouton d'envoi.

## Ce qui ne change pas
Aucune donnée d'élève modifiée ou supprimée. Même attestation et même e-mail qu'aujourd'hui. Les boutons existants restent.

## Fichier modifié
- `src/components/sessions/SessionDetail.tsx` (affichage uniquement, réutilise les fonctions existantes)

Mise en ligne à la prochaine publication.
