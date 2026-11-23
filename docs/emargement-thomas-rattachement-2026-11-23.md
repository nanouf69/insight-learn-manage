# Thomas — rattachement autorisé au dossier novembre

## Accord et cause

Accord explicite du demandeur le 23/11/2026 à 16:18 UTC : rattacher le compte existant au dossier des 17–18 novembre, sans déplacer les signatures d’octobre.

Le compte `875b9d15-660b-4912-b92d-68d9962054f4` ouvrait le dossier `14f4bb0c-fcd7-4719-8222-d8959fc96172`, aux dates enregistrées 28–29 octobre. Le dossier réel novembre `5b9d205a-11cc-4005-b264-26a4023d961a` avait une inscription non exclue à la session `254199ae-cc7e-4d66-9281-d1c9fc80d624`, mais aucun compte lié. Le lecteur connecté utilise `auth_user_id` avec `maybeSingle` ; la contrainte unique interdit deux dossiers principaux pour le même compte.

## Changement réel ciblé

- Transaction conditionnelle : vérification des deux dossiers, même adresse e-mail, dates 17–18 novembre, inscription exacte, verrouillage des lignes.
- Liaison append-only `emargement_dossiers_lies` vers l’ancien dossier pour préserver la lecture autorisée des preuves anciennes.
- Déplacement du seul `apprenants.auth_user_id` du dossier octobre vers le dossier novembre, sans modifier dates, inscriptions, contenu pédagogique ou signatures.
- Journal `audit_journal` avec les deux dossiers avant/après et l’accord explicite.
- Aucun compte créé, aucun message envoyé, aucun déploiement/publication ; aucun appel de gel des relevés.
- Les déclencheurs ont été relus : l’ancien dossier sans compte a une fin passée, donc aucune invitation automatique n’est déclenchée ; le nouveau dossier lié est exclu de cette invitation.

La première transaction a refusé avant écriture une comparaison texte/date ; la seconde, avec conversion explicite, a abouti. Aucun état intermédiaire n’a été conservé.

## Contrôles réellement exécutés

- PASS : relecture du compte principal = dossier novembre uniquement.
- PASS : les quatre signatures octobre sont intactes ; empreinte agrégée avant/après `10af6a6b155a83e8029bda788a69e1fa`.
- PASS : dossier novembre toujours sans signature ; aucune image octobre réutilisée.
- PASS : compte réel Thomas ouvert dans le navigateur, confirmation d’identité, fermeture de la demande par « Plus tard » sans signature, ouverture « Feuilles d’émargement ».
- PASS : ordinateur 1621×1125 et téléphone 390×844 affichent « Du 17/11/2026 au 18/11/2026 », les deux journées novembre, aucune journée octobre ; bouton Actualiser conserve ce résultat.
- La session de contrôle précédente, reconnue comme celle du test Linux/Chrome, a été fermée via le contrôle existant de session unique ; session finale déconnectée depuis l’écran d’accueil.

## Limites

Le compteur réel affiche encore quatre créneaux sans preuve sur novembre. Les deux signatures annoncées par le demandeur ne sont pas retrouvées : ne pas les inventer ni choisir deux images octobre. Vue administrateur réelle et téléchargement PDF non testés pendant ce rattachement. L’ancien dossier reste disponible comme historique, mais n’est pas la session suivie par Thomas. Aucune correction générale du périmètre émargements.