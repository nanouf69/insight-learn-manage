# Léa CATANIA — période pédagogique, lecture seule 13/11 15:38 UTC

## Cause confirmée
Dossier `3dee8826-7bd9-4fbf-9481-4d3e5d201a0c`, VTC e-learning. Attestation signée `da5fdc1e-d026-4a25-a930-87fea06ce421`, enregistrée le 12/11 à 19:03 UTC et signée à 21:01:57 UTC.
Le texte figé dit 14/09–19/10 et « FORMATION TERMINÉE ». Sa source figée est la connexion `ec64c58f-e6b2-4fcb-9370-76a8e7b26ffa` du 19/10 à 08:15:32 UTC (10:15:32 Paris), terminée à 08:15:34 UTC : accueil/liste des modules seulement. Ce n’est ni une lecture effective ni une fin contractuelle.

## Activité et heures prouvées
- Dernière remise confirmée : `25e690ad-2f5e-4b3a-9c1d-6991330295ea`, `module_8_exo_1785332774763`, `status=submitted`, `completed=true`, 99 entrées de réponse, `submitted_at=2026-10-13 08:21:57.414361 UTC` (10:21:57 Paris).
- 39 remises avec timestamp et identité Auth concordante, première 14/09 à 07:23 UTC, dernière 13/10. Révision en cours 13/10 à 08:28 exclue de la preuve de remise.
- Dernière ouverture de cours 13/10 08:28:12 UTC ; le suivi contrôle la session avant insertion mais aucun événement de lecture effective/durée de lecture n’est enregistré. Les dates de création/occurred_at des ouvertures ont le défaut serveur `now()`, les politiques exigent identité utilisateur/dossier. Cela ne suffit pas à certifier une lecture ; ces ouvertures ne sont pas retenues par le nouveau lecteur strict.
- Lecture authentifiée du chargeur commun : **38h11 / 60h**, dernière date par remises **13/10**, fin administrative actuelle **31/10**, pas 19/10. La première activité CRM affichée 14/09 et les 38h11 restent inchangées.
- L’heure de remise est un timestamp stocké relu, non une date inventée navigateur. Audit complet de tous les chemins d’écriture de timestamps de remise encore NON PROUVÉ ; aucune garantie générale ajoutée au serveur.

## Correction en aperçu
- Nouveau lecteur paginé et scoppé au dossier/auth_user_id : remises non vides et submitted_at, sans connexion/navigation, sans plafonner une activité réelle à une date administrative. Erreur/absence d’identité = date non vérifiée.
- Dates « Dernière activité pédagogique » et « Fin administrative prévue » séparées dans le panneau et les nouveaux PDF de période. Déduplique événements identiques, refuse événements contradictoires, affichage Europe/Paris.
- Nouveau PDF de période e-learning : titre « Relevé de période e-learning », temps enregistré seulement, aucune affirmation de formation achevée ou durée cible effectuée. La preview est non signée/non valable. Achèvement n’est jamais inféré du dernier événement ; tests de fin effective exigent durée et preuve d’achèvement.
- Les exports d’attestations déjà enregistrées/signées gardent leur chemin historique, leur texte et leurs dates ; aucune donnée signée réécrite. Les heures/progressions et dates CRM ne sont pas changées.

## Couverture et limites
TAXI/VTC/TA/VA partagent la preview et la classification e-learning ; trace des générateurs effectuée. L’ancien PDF « Documents de formation » e-learning imprime un taux de jalons sans dates : pas modifié. Inscription/France Travail/pré­sentiel/FC hors périmètre.
Le serveur de préparation/envoi conserve encore sa version connexion et son texte historique : **ne pas considérer l’envoi réel corrigé**. Nouvelle provenance figée et modèle serveur versionné à qualifier avant activation ; aucune fonction déployée ni migration. Les quiz avec reçu distinct sans remise exploitable, la lecture effective de cours et le recalcul commun CRM/relevé à partir de ces preuves strictes restent à intégrer : la nouvelle date est actuellement la dernière remise prouvée, pas une garantie d’exhaustivité de toutes les activités.

## Vérifications
- 26 tests PASS / 3 fichiers : dates Paris été/hiver, lecture qualifiante simulée, navigation exclue, reprise/activité tardive, doublons/conflits, identité, 38h11/60h sans achèvement, preuve absente.
- Lecture authentifiée réelle du dossier via useApercuAttestation, sans écriture ; 13/10, 31/10 et 38h11/60h confirmés.
- PDF A4 fictif généré avec 13/10, 19/10 comme date fictive distincte et 38h11 ; texte extrait et page inspectée, aucune certification de fin. Ce 19/10 de fixture n’est pas la date administrative réelle de Léa.
- Build OK 15:40:58 UTC. NO-GO publication/envoi corrigé : circuit serveur/date figée non adapté, événements lecture effectifs manquants, changements concurrents non isolés. Aucun document réel ni aucune date dossier modifiés.