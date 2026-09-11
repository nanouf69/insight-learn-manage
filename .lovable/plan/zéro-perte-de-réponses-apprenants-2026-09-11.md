# Zéro perte de réponses apprenants

## Objectif
Garantir qu’une réponse cochée dans un quiz, un bilan ou un examen blanc reste conservée jusqu’à confirmation en base, y compris après coupure Internet, actualisation, fermeture ou reconnexion.

## Correctifs
1. **Unifier la sauvegarde**
   - Faire passer tous les clics de réponse par une seule file persistante.
   - Supprimer les sauvegardes parallèles qui peuvent se dépasser ou écraser une réponse plus récente.
   - Conserver la dernière valeur choisie par question, tout en gardant le journal chronologique.

2. **Rattachement stable et déduplication**
   - Ajouter à chaque événement un identifiant unique et les références stables : apprenant, tentative, quiz/exercice, question et heure du clic.
   - Rendre les renvois idempotents : un même événement rejoué après reconnexion ne crée pas de doublon.
   - Refuser côté serveur toute écriture plus ancienne qui tenterait d’écraser une réponse plus récente.

3. **Reprise fiable hors-ligne**
   - Conserver les réponses non confirmées dans un stockage persistant adapté aux examens.
   - Restaurer immédiatement ces réponses à l’écran après actualisation ou réouverture, puis les fusionner avec la base sans perdre la version la plus récente.
   - Relancer automatiquement l’envoi au retour du réseau et après reconnexion.
   - Ne retirer un élément de la file qu’après accusé de réception explicite du serveur.

4. **Finalisation protégée**
   - Avant « Terminer la matière » ou « Valider », vider la file de la tentative concernée.
   - Lire ensuite la tentative en base et comparer toutes les réponses attendues.
   - Enregistrer le résultat seulement si la vérification est exacte.
   - Si le serveur reste indisponible, conserver la file et bloquer la finalisation avec un message clair.

5. **Application à tous les parcours**
   - Examens blancs complets et matières au choix.
   - Bilans.
   - Quiz intégrés aux modules et exercices.
   - Révision ou nouvelle tentative, sans modifier les anciennes tentatives.

## Sécurité des données existantes
- Aucune modification des questions, réponses pédagogiques, modules, scores, progressions ou anciennes tentatives.
- Aucune réinitialisation apprenant.
- Les changements de base sont uniquement additifs et concernent la fiabilité/idempotence des nouvelles sauvegardes.

## Vérifications obligatoires
- Tests automatisés : hors-ligne, fermeture/rechargement, reconnexion, ordre des écritures, dernière réponse, déduplication et échec de finalisation.
- Test réel : répondre en ligne, couper Internet, continuer, recharger/rouvrir, rétablir Internet, contrôler la base, puis terminer la matière.
- Répéter sur un examen blanc et un quiz de module, sur ordinateur et mobile.

## Détails techniques
- Remplacer les sauvegardes directes concurrentes par une API unique de file persistante, avec opérations `enqueue`, `flushAndWait`, `restorePending` et `verifyAttempt`.
- Ajouter un identifiant d’événement unique avec contrainte d’unicité au journal append-only.
- Faire retourner par le serveur un accusé contenant l’événement confirmé, la tentative et l’état enregistré.
- Effectuer l’écriture courante et la journalisation dans une opération atomique côté serveur.
