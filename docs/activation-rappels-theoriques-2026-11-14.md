# Activation des rappels théoriques — contrôle du 14 novembre 2026

## Résultat

Autorisation d'activation reçue à 00:18 UTC. **Activation non effectuée : les prérequis métier et techniques ne sont pas prouvés.** Aucun e-mail envoyé par l'agent, aucune modification des données, des fonctions actives, des tâches planifiées ou publication de l'aperçu. Aucun ancien examen rattrapé.

## Preuves réelles lues à 00:19 UTC

- `cron.job` : aucun nouveau calendrier J−7/J+1/J+3/J+5/J+7/J+9 n'est installé. La tâche historique `relance-suspension-cpf-daily` reste active à 09:00 UTC chaque jour ; dernière exécution enregistrée le 13/11, 09:00:00.334522–09:00:00.341882 UTC, statut `succeeded`. Ce statut prouve la réussite de la tâche SQL, pas une livraison ni même une réussite du transport HTTP.
- `relance-modules-a-terminer-daily` reste active à 08:30 UTC ; dernière tâche SQL réussie le 13/11. Elle n'est pas la nouvelle séquence.
- Catalogue : `apprenants.date_examen_theorique` est un texte ; `cma_planning_lignes.date_examen` est une date prévue. Aucun champ nommé passage réel/examen réel/preuve CMA ou table dédiée aux rappels théoriques trouvé par la recherche du catalogue. Cette recherche de noms ne prouve pas l'absence de preuves dans des documents ; **aucun adaptateur vérifié reliant ces documents à une occurrence de passage réel n'est disponible**.
- Fonction réelle `enforce_reservations_pratique_capacity()` : empreinte MD5 `215708534f3248b33f9f122ea4f15655`. Elle contrôle la capacité journalière et le planning, pas l'achèvement des modules ni une priorité de progression. Ce contrôle ne démontre pas toutes les règles de pratique, mais ne justifie pas l'interdiction annoncée.

## Modèle historique conservé

Identifiant : `relance_suspension_cpf`. Source locale : `supabase/functions/relance-suspension-cpf/index.ts`. Objet personnalisé : « 🚨 [Prénom], risque de suspension de votre compte – Connectez-vous à votre formation ! ».

Le HTML déclare « vous ne vous êtes toujours pas connecté(e) » et rappelle l'envoi des identifiants il y a plus d'une semaine ; le pied de mail confirme que le message concerne les non-connectés. Le circuit local sélectionne les comptes sans connexion dont l'accès a commencé depuis 7–14 jours, puis applique une fenêtre anti-relance de sept jours. Il ne fournit ni la preuve de passage ni le contrôle canonique de modules hors pratique requis pour la nouvelle séquence.

Le contenu/format du modèle historique n'a pas été modifié ni copié dans un second modèle. **Le code déployé exact n'a pas pu être téléchargé par les outils de lecture disponibles ; source locale et catalogue de tâches ne doivent pas être présentés comme une preuve d'identité du déploiement.**

## Blocages empêchant un envoi justifié

1. Modèle ferme : l'interdiction de passer à l'entraînement pratique et la non-priorité ne sont pas des règles opérationnelles/contractuelles vérifiées. Ne pas créer un blocage dur ou annoncer une restriction inexistante pour permettre l'envoi.
2. Modèle historique : l'envoyer tel quel à un élève déjà connecté serait factuellement erroné. La simple incomplétude des modules n'est pas équivalente à « jamais connecté ». Sans changement de contenu autorisé, seuls les dossiers où toutes les affirmations historiques sont vraies pourraient être considérés ; ils ne sont pas actuellement établis.
3. Dates : preuve datée du passage réel rattachée à une occurrence immuable et au bon dossier non raccordée ; date prévue et date d'envoi de copie insuffisantes.
4. Obligations/dispenses : le moteur pur accepte une projection injectée ; l'adaptateur complet de lecture canonique immédiatement avant l'envoi n'est pas opérationnel.
5. Anti-doublon : une clé stable testée n'est pas une réservation atomique en base. Transport, journal et contrôle de concurrence restent à implémenter et tester sur environnement distinct avant activation.
6. Contrats/financement : `inscrit_france_travail` ne prouve pas des engagements sur cette formation ; éligibilité et validité des affirmations doivent être établies par dossier. Aucun coût de nouvelle tâche ou d'envoi ajouté ; aucun appel IA.

## Tests réellement exécutés

Commande : `bunx vitest run src/test/rappel-theorique-priorite.test.ts src/test/rappel-theorique-financement.test.ts`.

**66/66 réussis** (59 calendrier/progression/priorité, 7 financement). Données synthétiques, aucune expédition. Pas de test authentifié du nouveau circuit de production : il n'existe pas encore. Ces tests ne prouvent ni un verrou atomique, ni un envoi, ni une restauration indépendante.

## Étape nécessaire avant activation

- Établir la preuve de passage réelle et les engagements contractuels depuis des documents CMA/admin fiables, sans demander à l'utilisateur une manipulation de programmation.
- Arbitrer les deux incohérences de contenu : conserver le modèle historique inchangé implique de ne pas l'envoyer aux élèves déjà connectés ; l'interdiction de pratique ne peut être annoncée sans règle effective et valable. Ce n'est pas une nouvelle demande d'autorisation générale : c'est une condition de véracité.
- Raccorder progression, exclusions (y compris arrêt après attestation), réservation atomique et transport, puis tests de concurrence, arrêt à complétion, dates, pannes et issues indéterminées sur environnement indépendant.
- Si une migration est nécessaire, disposer de sauvegarde vérifiée et restauration indépendante avant toute modification de la base partagée. Ne pas invoquer manuellement une fonction d'envoi pour tester.
- Activation isolée seulement après réussite de ces conditions ; borne explicite pour nouveaux examens, aucune reprise massive. Aucun changement aux campagnes historiques hors périmètre.