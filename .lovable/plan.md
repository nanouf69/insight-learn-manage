# Préparer les rappels après examen et la priorité pratique

## Diagnostic

- Aucun rappel existant ne correspond à J+1 après le passage réel ; les rappels J+1 des accès et modules à terminer ont d'autres déclencheurs.
- La date CRM est actuellement une date prévue en texte français. Elle doit être rapprochée d'une preuve du passage réel, jamais de la date d'envoi de copie.
- La réservation actuelle n'exige pas tous les modules terminés. Votre mise à jour du 13/11 à 22:59 remplace l'interdiction envisagée par une priorité non bloquante : aucun blocage dur ne sera créé.
- Aucun mail envoyé, aucun dossier modifié, aucun blocage activé, rien publié. Diagnostic détaillé enregistré dans `docs/rappel-modules-j1-theorique-2026-11-13.md`.

## Fonctionnalités à préparer

1. **Date fiable** : identifier une preuve de passage CMA liée au bon dossier et à la bonne occurrence ; à défaut, confirmation administrative auditée. Date inconnue, absent, annulé ou reporté : aucune expédition. Ne pas attendre un résultat d'admission si le passage est déjà prouvé.
2. **Deux modèles, calendrier rectifié à 23:11** : avertissement FERME J−7 avant date prévue confirmée, puis J+1/J+3/J+5 après date réelle vérifiée. Dès J+7/J+9/J+11… : rappel OBLIGATIONS DE FORMATION, objet « IMPORTANT – Modules de formation non terminés : rappel de vos obligations », avec votre texte et conséquences possibles uniquement adaptées au financement CPF et aux engagements France Travail vérifiés du dossier. Aucune sanction automatique, aucun simple retard assimilé à une sanction. Pour les dossiers non concernés, retirer ces mentions ; données inconnues = vérification, aucun envoi présumé. Modèle ferme : deux passages rouges et gras (impossibilité de passer à pratique, non-priorité). Exclure toute la partie pratique/entraînement, les modules non obligatoires et les dispenses. Aucun mail aux élèves complets. Proposition d'heure : 10 h Paris. Aucun rattrapage massif.
3. **Suivi et anti-doublon** : une émission par dossier/passage/échéance/version, contrôle serveur juste avant chaque envoi et arrêt immédiat dès complétion. Annuler les échéances futures sans supprimer le journal. En cas d'issue inconnue, vérification plutôt que renvoi automatique. Respecter les exclusions et l'arrêt des relances après attestation.
4. **Priorité indicative de réservation** : candidats complets prioritaires, incomplets toujours autorisés à réserver. Respecter places et ordre contractuel, dispenses et réservations existantes. Lecture impossible : à vérifier, pas faux module manquant. Aucune mutation de réservation par ce lot.
5. **Exception en cas de bug** : autorisation admin nominative, limitée et auditée, sans modifier les réponses, les notes, les validations de modules ni les présences.

## Tests avant activation

- J−7 date prévue confirmée, annulation/report et nouvelle échéance ; après examen date réelle seule, J+1/J+3/J+5 ferme, J+7/J+9… obligations conditionnelles ; week-end, fin de mois et heure d'été/hiver Paris.
- CPF seul, engagements France Travail seuls, les deux, ni l'un ni l'autre et informations inconnues ; inscription à France Travail seule ne prouve pas les engagements de cette formation.
- VTC/TAXI, absent/reporté, modules terminés/incomplets/facultatifs, dispenses et pratique physique.
- Plusieurs dossiers/passages, doubles imports, double déclenchement simultané, panne de lecture et envoi indéterminé.
- Préparation de la file indicative et de l'exception admin sur environnement distinct : incomplets conservés, ordre contractuel, places, compte élève/admin, ordinateur/mobile, réservations existantes intactes.
- Aucune expédition réelle pendant la préparation. Les tests à venir seront rapportés comme exécutés ou non prouvés, sans prétendre que la fonctionnalité existe déjà en production.

## Activation, ultérieure et séparée

- **Mail et priorité** : préparation et implémentation isolées autorisées ; activation après tests et confirmation. Le mail annonçant une priorité ne partira pas tant que cette priorité n'est pas réellement opérationnelle et compatible avec les engagements CPF.
- **Incohérence à trancher avant activation** : « impossibilité de passer à pratique » n'est pas une règle effective aujourd'hui. Cette phrase du modèle ferme reste en préparation non activable ; confirmer une règle de participation contractuellement valable ou autoriser sa reformulation. La réservation, elle, ne sera jamais bloquée par ce lot.
- **Financements** : les champs CRM `mode_financement` et `inscrit_france_travail` existent, mais ce dernier ne prouve pas un engagement de formation. Vérification des preuves et des clauses applicables indispensable avant mentions de conséquences ; aucune sanction n'est décidée par l'application.
- **Blocage** : abandonné, aucun blocage dur à construire ou activer.
- Aucune publication globale. Avant tout changement serveur à risque : sauvegarde et restauration indépendante prouvées.

## Détails techniques

- Normaliser les libellés de date de façon stricte ; ne pas utiliser `new Date()` sur du texte français ni un calendrier codé en dur comme preuve de passage.
- Réutiliser les attributions/dispenses et la lecture serveur `etat_completion_modules`, avec obligations historiques protégées ; aucune seconde logique de progression ni seuil d'heures ajouté.
- Une projection pure isolée prépare déjà les décisions de cadence, arrêt, exclusions, clé par échéance et priorité sans effet de bord. Les adaptateurs de preuves/progression, journal atomique et branchement réel restent à réaliser après validation du plan.
- Préparer un journal append-only et une réservation atomique d'envoi par événement/échéance ; résultat inconnu mis en revue manuelle. Utiliser le transport existant avec signature commune et lien d'accusé unique.
- Choisir un déclenchement temporel approprié : délai par événement si pris en charge ; sinon une seule vérification quotidienne, sans réactiver l'ancien job pratique ni lancer de scrutation fréquente. Cadence/coût et retard maximal présentés avant activation.
- La file de priorité devra être proposée à l'administrateur sans retrait des incomplets ni nouvelle obligation contractuelle. Aucun appel d'écriture ou d'envoi dans l'audit.