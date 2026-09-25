# Afficher la date réelle de dépôt du dossier de bienvenue

## Modification ciblée

- Dans le dossier administratif de l’élève, onglet **Formulaires**, ajouter une ligne clairement visible consacrée au dossier de bienvenue.
- Afficher :
  - `Dossier de bienvenue : ✅ Déposé le … à …` lorsque le dossier signé contient sa date de finalisation fiable ;
  - `Dossier de bienvenue : Non déposé` lorsqu’aucun dossier n’existe ;
  - `Dossier de bienvenue : Date de dépôt non disponible` lorsqu’un dossier existe mais qu’aucune date fiable n’est enregistrée.
- Formater la date en français et en heure de Paris.

## Source de vérité et garanties

- Utiliser uniquement `donnees.date_completion`, enregistrée au moment où l’élève finalise et signe son dossier de bienvenue.
- Ne pas utiliser `updated_at`, `completed_at`, la date de consultation ni celle d’un téléchargement : ces valeurs peuvent évoluer après le premier dépôt.
- Ne prévoir aucun repli vers une date approximative et ne fabriquer aucune ancienne date.
- Ne modifier aucune donnée existante, aucun document, aucun statut et aucun autre élément du dossier administratif.

## Test de non-régression

- Vérifier les trois états : dépôt signé avec date fiable, dossier absent, dossier présent sans date fiable.
- Vérifier qu’une date de modification ou de téléchargement plus récente ne remplace jamais la date de dépôt affichée.
- Relancer le test ciblé et contrôler que l’application se construit sans erreur.
