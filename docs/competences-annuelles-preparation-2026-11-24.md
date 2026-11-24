# Compétences annuelles — préparation du 24 novembre 2026

## Livré dans l’aperçu
- Formateurs → **Suivi annuel** : demandes existantes, envois réellement enregistrés, remises, décisions du responsable et échéance 12 mois après validation. Lectures paginées, erreurs explicites, aucune écriture depuis cet écran. La remise ne vaut jamais validation.
- Moteur réutilisable et modèle mail individuel : tous contrats, activité explicite requise, première demande sans validation, 12 mois calendaires après dernière preuve, conservation des anciennes demandes, un cycle stable par validation.
- Transport injecté, clé anti-doublon par demande ; activation vérifiée avant réservation et avant envoi, issue inconnue mise à vérifier sans renvoi automatique.
- SQL candidat non appliqué : décisions d’activité/activation append-only, réservations atomiques verrouillées par formateur, unicité formateur/cycle, historiques immuables, droits admin/service uniquement. Aucune migration, nouveau job ni nouvel envoi réel.
- Le formulaire individuel existant reste inchangé : expiration contrôlée à chaque accès. Nouveau modèle préparé valable 30 jours ; révocation manuelle proposée par événement séparé, non raccordée au service actuel. Aucun ancien token ni preuve remplacé.

## Constats réels
- Trois formateurs : Albert AKONO externe, Naoufal GUENICHI interne, Rim TOUIL externe. La table n’a **aucun champ actif/inactif**. Le type de contrat et les dates d’intervention ne suffisent pas à qualifier l’activité actuelle.
- Déclaration du dirigeant : Rim ancienne intervenante ; conservée, aucun envoi programmé. Naoufal principal actif ; Albert occasionnel concerné par la demande du dirigeant. Ces classifications doivent devenir des décisions administratives enregistrées lors de l’installation, sans modifier les historiques.
- Une seule invitation Albert, sans remise ni avis responsable : GET réel 200 le 24/11, échéance 25/12/2026 00h Paris. Les champs sont vides, aucune compétence validée.
- Le dispositif évite de créer une seconde première demande pour Albert puisqu’un formulaire existe déjà. Il restera à examiner/traiter explicitement avant tout envoi.
- Aucun domaine Lovable Emails configuré. Les anciens mails du projet utilisent un transport déjà existant ; aucun changement de fournisseur ni réinstallation de messagerie exécutés. Raccordement annuel au transport reste à installer/vérifier avec anti-doublon réel et suivi des issues incertaines.

## Contrôles exécutés
- 13 tests Vitest PASS : 12 mois, 29 février, tous contrats, inactifs/inconnus, première demande, dernier avis, réponses distinctes, expiration/révocation, zéro envoi désactivé, concurrence et issue inconnue.
- 8 tests PostgreSQL jetable PASS : SQL candidat appliqué seulement au cluster local, activation désactivée, exclusions, double réservation concurrente, invitation Albert existante, droits anon/apprenant/admin/service, protection activation et historiques immuables.
- Deux parcours navigateur fictifs PC/mobile : lecture et actualisation sans écriture ni appel d’envoi. Pas de validation admin réelle ou soumission réelle de formateur.
- Service Albert relu en réel sans soumission : HTTP 200, brouillon, expiration correcte.

## Non installé / conditions avant activation
1. Installation des tables/RPC candidates après restauration indépendante et contrôle des dépendances/triggers réels ; les tests jetables utilisent une table documents simplifiée, pas tous les triggers réels. Activation reste absente/désactivée.
2. Décisions explicites des formateurs actifs/inactifs, puis vue CRM persistante de ces décisions. Aucun classement automatique à partir d’une dernière intervention.
3. Adaptateur serveur de réservation + email existant et journaux append-only, raccordement de révocation aux accès individuels, preuve de validation responsable vérifiée sur tout lecteur. Les contrats et tests seuls ne prouvent pas la chaîne live.
4. Planification future : **une vérification quotidienne** consolidée (maximum 24 h après échéance), aucune tâche installée pour l’instant. Elle devra être activée seulement après accord et authentification gérée de la tâche ; pas de polling navigateur ni plusieurs balayages séparés.
5. Publication contrôlée de la page individuelle puis activation explicite. Aucun mail de test réel demandé/exécuté, aucun mail aux formateurs envoyé.

Lien Albert dans l’aperçu :
https://id-preview--73b74fa5-8a35-42ae-87cf-970f3567b973.lovable.app/competences-intervenant/5d83b5538be616e918387f8231b7cc5e497856eed07498ce48f35fd8e09f3ec2

Lien personnel à ne pas diffuser publiquement ; même chemin sur gestion.ftransport.fr nécessitera publication.