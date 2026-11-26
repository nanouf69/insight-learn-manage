# Incident Bentayeb — résultat du contrôle du 26/11/2026

## Résultat partiel, non résolu

- Compte exact identifié par le dossier déjà demandé et son adresse ; un autre dossier homonyme a été exclu. Aucune identité modifiée.
- Aucun ticket retrouvé : le registre `signalements_apprenants` contient zéro ligne. La session SQL de lecture dispose de BYPASSRLS ; le résultat vide n’est pas imputé à un filtre apprenant.
- Aucun mail du 26/11 ou du fil « Accès à vos modules de formation » retrouvé dans `emails`, après recherche par dossier, sujet, expéditeur et destinataire. Des mails antérieurs du dossier sont bien présents.
- Aucune connexion Outlook accessible. Aucun original, en-tête, horaire ni pièce jointe récupéré.

## Archivage limité autorisé par la demande

Une preuve privée unique a été enregistrée dans `qualiopi_preuves` et liée à l’indicateur 31, sans créer de ticket :

- ID : `a9db30ed-0fd3-4422-bb73-9c81ca209119`.
- Clé : `incident-bentayeb-20261126-declaration-dirigeant-v1`.
- Source : déclaration de Naoufal Guenichi du 26/11, non import Outlook.
- L’extrait entrant est explicitement tronqué ; la réponse contient le texte complet fourni, avec envoi déclaré mais original non vérifié.
- Seule la date déclarée est utilisée ; aucune heure de mail. L’heure d’archivage n’est pas une heure d’envoi ou réception.
- Expéditeur/destinataire déclarés distingués des en-têtes manquants ; adresse CRM vérifiée distincte du destinataire effectif non vérifié.
- Ordre relatif fourni (entrant puis dernière réponse), pas une chronologie exhaustive reconstituée.
- Pièces jointes non vérifiées, liste de fichiers vide, aucun fichier fabriqué.
- « En attente de confirmation apprenant — Non résolu », sans certification de publication, de réception ou de conformité.

Les textes privés restent dans la preuve protégée, pas dans ce rapport source.

## Permissions et non-régression

- Preuves et liens Qualiopi : accès réservé aux administrateurs par `has_role`; règles inchangées.
- Tickets : lecture propre apprenant / admin ; suivi interne caché ; envois consultables par l’apprenant seulement si envoyés. Règles inchangées.
- Relecture : une preuve et un lien I31, réserves et textes présents, fichiers vides.
- Empreintes avant/après identiques des 4 lignes de complétion et 2 signatures du dossier ; registre tickets vide inchangé.
- 6 tests exécutés et réussis : `signalement-resolution.test.ts`, `signalement-image.test.ts`.
- Aucun changement d’interface ou serveur, aucune migration, aucun envoi, aucune publication.
- Vue admin réelle **NON PROUVÉE** : session demandeur restaurée mais redirigée vers `/cours-public`, pas accès Qualiopi. Aucun rôle accordé pour contourner ce refus.

## Blocages restants

L’affichage dans l’onglet Bugs signalés / remarques et le rattachement à un ticket existant ne sont pas réalisés : sa référence/source doit être retrouvée. Les originaux et pièces jointes nécessitent une connexion Outlook autorisée ou des exports du fil. La preuve I31 ne remplace pas un ticket existant et ne prétend pas le faire.