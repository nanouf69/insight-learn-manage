# Audit émargements — 30 octobre 2026

## Résultat Ilyes Dakhlaoui
Formation enregistrée : TA / passerelle-taxi. Inscription retenue dans « Session TAXI et TA – du 26 octobre au 16 novembre 2026 ». La règle TA limite la théorie à la première semaine en l'absence de fin personnalisée. Aucun calendrier détaillé session_calendrier_jours enregistré pour cette session. Aucun rendez-vous pratique réservé, aucune inscription pratique pour cet apprenant. presence_pratique=present sur l'inscription théorique ne constitue ni une séance pratique ni une signature.

Planning agenda consulté : 26–30 octobre, matin et après-midi, dix créneaux. Les dix images de signatures sont présentes, non masquées, non absentes. Huit signatures portent une date de cours antérieure à leur horodatage réel du 30 octobre : signalement historique, pas une réattribution ni une suppression.

Les deux attentes pratiques du 10/12 ne correspondaient à aucune date : objectifPratique=2 était un forfait du calcul EDOF. Ce n'était pas une réservation, une duplication de signature, ni une séance ajoutée par ce compteur. Le compteur corrigé dans l'aperçu indique 10 attendues / 10 recueillies, présentiel 10/10, pratique 0/0.

Autre anomalie distincte : 22 feuilles non signées existent pour les 2–16 novembre, créées le 12 octobre à 06:30:20 UTC avec signed_at identique, mais aucune image. Elles restent intactes et ne comptent pas. signed_at a un DEFAULT now() NOT NULL : un horodatage automatique n'est donc pas une preuve. Les générateurs historiques créent des feuilles vides ; l'auteur/commande exact du lot du 12 octobre n'est pas prouvé.

## Écart d'heures non corrigé
Le 27 octobre après-midi est inscrit 13h–15h à l'agenda, et non 13h–16h. Les dix créneaux représentent donc 29 h selon cet agenda, alors que l'affichage signalé indique 30 h et le volume TA nominal est 30 h. Aucune heure, date ou preuve n'a été modifiée. Il faut confirmer l'horaire réel du 27 octobre avant tout changement.
Les cinq blocs du 28 après-midi, 29 et 30 octobre ont été créés le 30 octobre à 13:50:27 UTC dans l'intervention précédente. Leur existence en base est prouvée, leur contenu/matière historique réel n'est pas certifié par ce présent audit.

## Audit nominatif global
457 dossiers non archivés correspondant aux types VTC/TAXI/TA/VA (y compris variantes e-learning et types PA VTC). Lecture de 783 inscriptions, 143 réservations, 324 blocs d'agenda, 16 configurations pratiques et 3 041 feuilles. Le CSV joint liste chaque dossier signalé. Les catégories se chevauchent et sont des éléments à examiner, pas des absences certifiées ni une preuve de fraude.

- 79 dossiers : au moins un planning incomplet / horaires indéterminés.
- 45 dossiers : au moins une signature hors du planning actuellement retrouvé.
- 34 dossiers : horodatages sans image de signature.
- 106 dossiers : au moins une signature horodatée un autre jour que la date du cours (régularisation possible, à examiner).
- 0 doublon de paire apprenant/date/créneau dans la lecture des feuilles.
- 278 dossiers sans pratique planifiée, pour lesquels appliquer un forfait pratique universel serait injustifié ; cela inclut des dossiers sans session, pas 278 incidents actifs démontrés.
- 387 dossiers avec au moins un de ces indicateurs ; aucune modification automatique de configuration ni de données.

### Session du 26 octobre — dossiers à examiner
| Apprenant | Présentiel retrouvé | Pratique retrouvée | Recueillies dans le planning | Statut du planning |
|---|---:|---:|---:|---|
| Mourad CHEMOUN | 10 | 0 | 10 | Incomplet : total non confirmé |
| HASSEN BENKHELIL | 10 | 0 | 10 | Incomplet : total non confirmé |
| CIHAN RAYMAN | 10 | 0 | 10 | Déterminé dans les données lues |
| Ilies MEMDOUH | 10 | 0 | 10 | Incomplet : total non confirmé |
| Ahlem SOUICI | 10 | 0 | 10 | Déterminé dans les données lues |
| Mohamed HAMDI | 10 | 0 | 10 | Incomplet : total non confirmé |
| Ilyes Dakhlaoui | 10 | 0 | 10 | Déterminé dans les données lues |
| MASSINISSA HADDOU | 10 | 0 | 10 | Incomplet : total non confirmé |
| Rachida CHALA | 10 | 0 | 10 | Déterminé dans les données lues |
| Mohktar BEN ALI | 10 | 0 | 10 | Déterminé dans les données lues |
| Harutyun Pndukyan | 20 | 2 | 12 | Déterminé dans les données lues |
| Pogos SARKISIAN | 10 | 0 | 10 | Incomplet : total non confirmé |

Attention : Mourad CHEMOUN est enregistré TAXI (et non TA). BENKHELIL, CHEMOUN, MEMDOUH, HAMDI, HADDOU et SARKISIAN ont une inscription croisée à la session du 2–13 novembre dont les créneaux ne sont pas encore déterminés : leur total ne doit pas être confirmé à 10. Harutyun Pndukyan a plusieurs anciennes inscriptions/pratiques conservées : son total cumulé 22 n'est pas celui de la seule session d'octobre ; aucun rattachement historique n'a été réécrit.

## Correction réalisée, non publiée
- Calcul partagé planningSignaturesReel : dates/créneaux d'agenda compatibles avec inscription/parcours, bornes et horaires personnels, déduplication, pratique réellement inscrite/réservée, configurations demi-journée.
- Aucun forfait +2 ; aucun défaut 9h–16h pour compléter un planning inconnu. Une session attribuée ayant des horaires explicites reste une source de planning lorsque l'agenda est absent ; cette approximation historique doit être examinée avant certification.
- Résumé tout en haut de chaque fiche : signatures attendues, recueillies, ventilation théorie/pratique. Formulaires, Infos EDOF, compteurs du taux et lectures de signatures manquantes utilisent le même planning vivant. E-learning exclut les cours théoriques mais conserve une pratique réellement prévue.
- Planning incomplet : total non confirmé, pas de complétude EDOF déduite et pas de total PDF inventé. Une fenêtre de signature, un rendez-vous ou un horodatage sans image ne constitue jamais une présence.
- Aucun changement des fonctions serveur, RLS, garde-fous d'attestation, horaires d'ouverture ou génération de feuilles. Aucun mail/SMS/IA, aucune attestation créée.

## Contrôles exécutés et statut réel
PASS : 191 tests sur 18 fichiers, dont dix attendues Ilyes, absence de +2 tous parcours, pratique réelle/samedi/demi-journée, exclusion/attente/annulation, horaires inconnus, données inchangées, preuves/attestation et fenêtre d'ouverture.
PASS : aperçu build OK ; compte admin réel, fiche Ilyes et onglet Formulaires : 10/10, pratique0/0. Lecture sur PC et téléphone 390 px vérifiée après fermeture/déplacement du menu ; aucun débordement du résumé.
PASS : empreinte de toutes les 3 041 feuilles avant/après identique : 41ef55d631d3bcdd777dac1846fde80d. Aucune écriture Cloud dans cette intervention, aucune signature supprimée/masquée/altérée.
NON PROUVÉ : parcours authentifié de chaque apprenant, délivrance/refus réel d'une attestation, tests SQL de garde-fous sur PostgreSQL jetable, comparaison nominative complète de toutes les attestations existantes et toutes les heures. Les tests SQL existants lisent le catalogue via psql ; ils n'ont pas été exécutés ici afin de respecter la lecture via les outils Cloud. Les tests applicatifs ne prouvent pas à eux seuls les permissions serveur.
NON PROUVÉ : concordance stricte de toutes les variantes des calculs client avec le serveur. Audit du serveur montre notamment un possible repli après-midi pour une pratique matin seule, et sa fenêtre de lecture ne couvre que jusqu'à demain. Aucun changement serveur sans diagnostic/test isolé.

## Publication
Aucune publication. Le correctif est visible dans l'aperçu, pas encore sur le site publié. La validation globale reste bloquée par les écarts de planning/horaires et les contrôles serveur/attestations non prouvés ; les autres chantiers précédemment ouverts restent indépendants. Ne pas déclarer que toutes les formations sont exemptes d'anomalies.
