# Feuilles d'émargement générées automatiquement pour chaque session

## Constat (lecture seule)
Aujourd'hui, une ligne `emargements_fc` n'existe qu'au moment où l'élève signe (fonction serveur `save-emargement-apprenant`, insertion à la première signature). Aucune feuille n'est pré-créée : si l'élève ne signe pas, rien n'existe, et l'écran élève doit deviner les créneaux attendus.

## Objectif
Pour chaque session de formation, chaque élève inscrit dispose d'avance de ses feuilles d'émargement : une ligne par jour de la session et par créneau (matin / après-midi, ou soir_1 / soir_2 pour les cours du soir), avec les bons horaires.

## Proposition
1. **Génération côté serveur uniquement** (jamais depuis le navigateur) :
   - Nouvelle fonction serveur `generer-emargements-session` (service_role) appelée :
     - à l'inscription d'un élève dans une session (trigger sur `session_apprenants`), et
     - à la création/modification des dates ou créneaux d'une session (trigger sur `sessions`).
   - La fonction crée les lignes manquantes dans `emargements_fc` (une par élève inscrit × jour × créneau), avec `signature_data_url` vide et `absent = false` : feuille « à signer ».
2. **Zéro destruction** : génération strictement additive — `INSERT ... ON CONFLICT DO NOTHING` (ou équivalent) ; jamais d'écrasement d'une signature existante, jamais de suppression. Une feuille déjà signée n'est jamais retouchée.
3. **Jours concernés** : jours ouvrés de la session (lun–ven) entre date_debut et date_fin, sauf jours explicitement supprimés du planning ; pour les sessions pratiques, uniquement les jours réservés par l'élève (`reservations_pratique`).
4. **Affichage élève** : la feuille du jour s'affiche en priorité (corrige le cas de M. SILLA, dont les soirées non signées masquaient la feuille pratique du jour) ; les feuilles en retard restent demandées ensuite, rien n'est retiré.
5. **Horaires** : journée = 9h-12h / 13h-16h ; soir = 17h-18h30 / 18h30-21h ; pratique = matin + après-midi.

## Points à trancher
- Génération rétroactive : faut-il créer les feuilles manquantes pour les sessions en cours (ex. session du 6–24 octobre) ? Proposition : oui, en additif, après accord.

## Garanties
- Aucune donnée élève supprimée ni écrasée ; signatures existantes intactes.
- Serveur seul autorisé à générer ; lecture seule avant/après avec compteurs.
- Journal daté des changements ; frontend non publié sans accord.
