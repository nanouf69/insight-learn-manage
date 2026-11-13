# Préparer le rappel J+1 après examen théorique

## Diagnostic

- Aucun rappel existant ne correspond à J+1 après le passage réel ; les rappels J+1 des accès et modules à terminer ont d'autres déclencheurs.
- La date CRM est actuellement une date prévue en texte français. Elle doit être rapprochée d'une preuve du passage réel, jamais de la date d'envoi de copie.
- La réservation actuelle n'exige pas tous les modules terminés. Ce nouveau préalable reste désactivé et nécessite votre confirmation distincte.
- Aucun mail envoyé, aucun dossier modifié, aucun blocage activé, rien publié. Diagnostic détaillé enregistré dans `docs/rappel-modules-j1-theorique-2026-11-13.md`.

## Fonctionnalités à préparer

1. **Date fiable** : identifier une preuve de passage CMA liée au bon dossier et à la bonne occurrence ; à défaut, confirmation administrative auditée. Date inconnue, absent, annulé ou reporté : aucune expédition. Ne pas attendre un résultat d'admission si le passage est déjà prouvé.
2. **Rappel unique** : conserver exactement votre texte, pour les parcours VTC/TAXI avec modules en ligne attribués, J+1 calendaire Europe/Paris. Proposition d'heure : 10 h Paris. Aucune relance répétée ni rattrapage automatique d'anciens examens.
3. **Suivi et anti-doublon** : une émission par dossier/passage/version, avec état de livraison et accusé explicite distincts. En cas d'issue inconnue, vérification plutôt que renvoi automatique. Respecter les exclusions et l'arrêt des relances après attestation.
4. **Préparer séparément le préalable de réservation** : obligations contractuelles en ligne uniquement, dispenses conservées, pratique physique exclue pour éviter un blocage circulaire ; lecture impossible = incident explicite, pas faux module manquant. Réservations et contrats CPF existants inchangés.
5. **Exception en cas de bug** : autorisation admin nominative, limitée et auditée, sans modifier les réponses, les notes, les validations de modules ni les présences.

## Tests avant activation

- Date réelle contre date prévue/envoi de copie ; J+1 week-end, fin de mois, heure d'été/hiver Paris.
- VTC/TAXI, absent/reporté, modules terminés/incomplets/facultatifs, dispenses et pratique physique.
- Plusieurs dossiers/passages, doubles imports, double déclenchement simultané, panne de lecture et envoi indéterminé.
- Préparation du contrôle de réservation et de l'exception admin sur environnement distinct : lien direct, compte élève/admin, ordinateur/mobile, réservations existantes intactes.
- Aucune expédition réelle pendant la préparation. Les tests à venir seront rapportés comme exécutés ou non prouvés, sans prétendre que la fonctionnalité existe déjà en production.

## Activation, ultérieure et séparée

- **Mail** : votre demande actuelle autorise sa préparation, pas son envoi. Son activation exigera un accord ultérieur.
- **Blocage** : accord distinct obligatoire après vérification des contrats et du périmètre des nouveaux dossiers. Le mail ne peut pas annoncer ce blocage tant qu'il n'est pas réel ; si vous souhaitez activer le mail seul, cette phrase devra être validée dans une autre formulation.
- Aucune publication globale. Avant tout changement serveur à risque : sauvegarde et restauration indépendante prouvées.

## Détails techniques

- Normaliser les libellés de date de façon stricte ; ne pas utiliser `new Date()` sur du texte français ni un calendrier codé en dur comme preuve de passage.
- Réutiliser les attributions/dispenses et la lecture serveur `etat_completion_modules`, avec obligations historiques protégées ; aucune seconde logique de progression ni seuil d'heures ajouté.
- Préparer un journal append-only et une réservation atomique d'envoi par événement ; résultat inconnu mis en revue manuelle. Utiliser le transport existant avec signature commune et lien d'accusé unique.
- Choisir un déclenchement temporel approprié : délai par événement si pris en charge ; sinon une seule vérification quotidienne, sans réactiver l'ancien job pratique ni lancer de scrutation fréquente. Cadence/coût et retard maximal présentés avant activation.
- Sécuriser identité et contrôle serveur sur toutes les voies de réservation avant toute activation du préalable. Aucun appel d'écriture ou d'envoi dans l'audit.