# Préparer les rappels après examen et la priorité pratique

## Diagnostic

- Aucun rappel existant ne correspond à J+1 après le passage réel ; les rappels J+1 des accès et modules à terminer ont d'autres déclencheurs.
- La date CRM est actuellement une date prévue en texte français. Elle doit être rapprochée d'une preuve du passage réel, jamais de la date d'envoi de copie.
- La réservation actuelle n'exige pas tous les modules terminés. Votre mise à jour du 13/11 à 22:59 remplace l'interdiction envisagée par une priorité non bloquante : aucun blocage dur ne sera créé.
- Aucun mail envoyé, aucun dossier modifié, aucun blocage activé, rien publié. Diagnostic détaillé enregistré dans `docs/rappel-modules-j1-theorique-2026-11-13.md`.

## Fonctionnalités à préparer

1. **Date fiable** : identifier une preuve de passage CMA liée au bon dossier et à la bonne occurrence ; à défaut, confirmation administrative auditée. Date inconnue, absent, annulé ou reporté : aucune expédition. Ne pas attendre un résultat d'admission si le passage est déjà prouvé.
2. **Rappels aux incomplets seulement** : J+1 puis J+3/J+5… en jours calendaires Europe/Paris, avec votre nouvel objet et texte exacts. Exclure toute la partie pratique et entraînement, les modules non obligatoires et les dispenses. Ne jamais envoyer aux élèves complets. Proposition d'heure : 10 h Paris. Aucun rattrapage massif d'anciens examens.
3. **Suivi et anti-doublon** : une émission par dossier/passage/échéance/version, contrôle serveur juste avant chaque envoi et arrêt immédiat dès complétion. Annuler les échéances futures sans supprimer le journal. En cas d'issue inconnue, vérification plutôt que renvoi automatique. Respecter les exclusions et l'arrêt des relances après attestation.
4. **Priorité indicative de réservation** : candidats complets prioritaires, incomplets toujours autorisés à réserver. Respecter places et ordre contractuel, dispenses et réservations existantes. Lecture impossible : à vérifier, pas faux module manquant. Aucune mutation de réservation par ce lot.
5. **Exception en cas de bug** : autorisation admin nominative, limitée et auditée, sans modifier les réponses, les notes, les validations de modules ni les présences.

## Tests avant activation

- Date réelle contre date prévue/envoi de copie ; J+1 week-end, fin de mois, heure d'été/hiver Paris.
- VTC/TAXI, absent/reporté, modules terminés/incomplets/facultatifs, dispenses et pratique physique.
- Plusieurs dossiers/passages, doubles imports, double déclenchement simultané, panne de lecture et envoi indéterminé.
- Préparation de la file indicative et de l'exception admin sur environnement distinct : incomplets conservés, ordre contractuel, places, compte élève/admin, ordinateur/mobile, réservations existantes intactes.
- Aucune expédition réelle pendant la préparation. Les tests à venir seront rapportés comme exécutés ou non prouvés, sans prétendre que la fonctionnalité existe déjà en production.

## Activation, ultérieure et séparée

- **Mail et priorité** : préparation et implémentation isolées autorisées ; activation après tests et confirmation. Le mail annonçant une priorité ne partira pas tant que cette priorité n'est pas réellement opérationnelle et compatible avec les engagements CPF.
- **Blocage** : abandonné, aucun blocage dur à construire ou activer.
- Aucune publication globale. Avant tout changement serveur à risque : sauvegarde et restauration indépendante prouvées.

## Détails techniques

- Normaliser les libellés de date de façon stricte ; ne pas utiliser `new Date()` sur du texte français ni un calendrier codé en dur comme preuve de passage.
- Réutiliser les attributions/dispenses et la lecture serveur `etat_completion_modules`, avec obligations historiques protégées ; aucune seconde logique de progression ni seuil d'heures ajouté.
- Une projection pure isolée prépare déjà les décisions de cadence, arrêt, exclusions, clé par échéance et priorité sans effet de bord. Les adaptateurs de preuves/progression, journal atomique et branchement réel restent à réaliser après validation du plan.
- Préparer un journal append-only et une réservation atomique d'envoi par événement/échéance ; résultat inconnu mis en revue manuelle. Utiliser le transport existant avec signature commune et lien d'accusé unique.
- Choisir un déclenchement temporel approprié : délai par événement si pris en charge ; sinon une seule vérification quotidienne, sans réactiver l'ancien job pratique ni lancer de scrutation fréquente. Cadence/coût et retard maximal présentés avant activation.
- La file de priorité devra être proposée à l'administrateur sans retrait des incomplets ni nouvelle obligation contractuelle. Aucun appel d'écriture ou d'envoi dans l'audit.