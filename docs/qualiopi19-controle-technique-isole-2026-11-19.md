# Qualiopi 19 — contrôle technique isolé du 19/11/2026

## Conclusion

**Contrôle partiel exécuté, parcours complet authentifié NON PROUVÉ.** Aucune identité réelle usurpée, aucun mot de passe récupéré, aucun compte fictif de production créé, aucune donnée apprenant réelle modifiée, aucun mail ni publication.

L’identité officielle de test a été demandée par `lovable auth-session --json --create-test-user`. Résultat : approbation utilisateur nécessaire et indisponible dans ce contexte. Aucun compte ni session créés par cet appel. Pas de contournement avec un compte réel ou des droits administrateur.

## Moyen sûr utilisé et conservé

- Tests existants de connexion, sauvegarde des pages, progression, jalons et chargement : données fictives, aucun transport vers le backend réel.
- Deux nouveaux fichiers réutilisables : `src/test/qualiopi19-assistance.test.tsx` (vrai formulaire d’assistance avec stockage fictif et refus simulé), `src/test/qualiopi19-heures.test.ts` (vrai calcul d’heures sur intervalles fictifs).
- Contrat SQL existant exécuté sur PostgreSQL jetable, variables PG de production supprimées. Instantané historique + migrations 0197/0230/0232 ; **pas le catalogue actuel complet**. Connexions locales explicitement ciblées, serveur arrêté après tests.
- Écran réel `ModuleDetailView` ouvert avec le harnais fictif existant, ordinateur 1280×1800 et mobile 390×844. Tous les appels externes bloqués. Authentification simulée par le harnais, **pas mécanisme de connexion officiel**. Ce harnais est un test d’interface existant, pas un environnement élève complet.

## Résultats exécutés

| Domaine | Preuve exécutée | Limite |
|---|---|---|
| Connexion/reprise | 9 tests de lecture session, identité constante, révocation, réseau et retour d’onglet | SDK simulé ; connexion réelle non testée |
| Cours/quiz | Écran réel, navigation cours → question fictive et choix B, PC/mobile sans erreur JS | Sous-ensemble Bilan VTC, pas tous les cours/parcours |
| PPT/PDF | T3P P1 actuel : PPTX HTTP 200, ZIP valide, 49 slides ; PDF HTTP 200 et en-tête valide | Disponibilité technique locale, pas lecture PPT intégrale sous identité élève |
| Sauvegarde | Tests file persistante, compte constant, refus, relecture et concurrence ; contrat SQL local | Sauvegarde réelle bout-en-bout non prouvée |
| Progression/jalons | Tests preuves serveur et attribution, pas réussite déduite d’un score ou d’un simple 100 % navigateur | Scénarios fictifs, pas nouvelle preuve de progression réelle |
| Heures | Nouvelle suite : connexion seule = 0 ; ouverture pédagogique dans intervalle 20 min = 20 ; accueil = 0 ; sources immuables | Durée déterministe, pas séance réelle de 20 min exécutée |
| Assistance | Vrai widget : demande fictive enregistrée et relue ; refus 42501 simulé conserve le texte et n’annonce pas réussite | Stockage simulé ; aucun message réel au centre |

**111 tests existants + 5 nouveaux = 116 Vitest réussis** (10 fichiers/82 tests, 3 fichiers/29 tests, 2 fichiers/5 tests). Contrat SQL : 25 cas recensés, **17 exécutés réussis, 8 ignorés** car candidat non chargé. Ils ne sont pas comptés PASS. Pas de tests de styles/copie ajoutés.

### Constat navigateur à ne pas masquer

Après clic B, le harnais incomplet affiche « Enregistrement impossible » sur PC et mobile : il n’implémente pas les preuves et transports complets requis. **Aucune validation réussie n’est revendiquée.** Ce constat ne prouve pas une panne de production ; aucun correctif pédagogique, Bilan ou examen réalisé. Captures anonymes sous `/tmp/browser/qualiopi19-isolation/`, journaux sous `/tmp/qualiopi19-*.log` : fichiers temporaires, non prétendus pièces durables jointes à Qualiopi.

Support T3P P1 SHA256 PPTX : `20de1c2ce40c6ad4db811b83789a841a941e501b03ae3ff14ebc61e8937797ae`. Références actuelles VTC/TAXI lues, module 2 : 15 cours/15 exercices ; module 10 : 18 cours/19 exercices. Originaux et données module inchangés.

## Permissions/RLS et isolation

Lecture du catalogue réel : RLS activée sur apprenants, réponses, connexions, activités, questions. Politiques propriétaires limitent à `auth.uid()` et dossier ; réponses/progression exigent également une session active selon l’opération. Les GRANT larges de table ne neutralisent pas à eux seuls la RLS.

Comptes techniques : neuf inscriptions au registre existant. Politiques restrictives de lecture sur apprenants/réponses/quiz/progression, propriétaire conservé ; registre réservé administrateur. **Tag technique ≠ sandbox** : il autorise encore les écritures et n’exclut pas automatiquement les traitements privilégiés/statistiques.

Exclusions vérifiées dans relance-inactifs et relance-modules-a-terminer (lecture des exclusions échouée = arrêt), correction IA QRC. Exclusion exhaustive des autres automatismes **NON PROUVÉE**. Création Auth : déclencheurs réels créent profil et rôle user, pas admin ; dossier créé/modifié peut déclencher des flux distincts. Aucun changement de rôle, politique, trigger, configuration ou serveur réel.

Contrat SQL exécuté teste des permissions avec identités et fonction auth.uid locales simulées : **pas une preuve de connexion officielle GoTrue ni de couverture actuelle intégrale de toutes les politiques**. Aucun JWT réel d’élève fourni à ce harnais.

## Traces historiques distinctes

Les deux mails existants du 22/09/2026 (18:54:09 prise en charge ; 18:55:35 retour élève cité sur résolution) sont toujours présents. Les 12 références antérieures du 19 demeurent ; aucun nouveau message envoyé. Usages historiques ne prouvent pas qu’une session officielle de test a été réalisée aujourd’hui.

## Étapes nécessaires au contrôle complet

1. Autoriser la création officielle d’une identité fictive dédiée ; l’appel est bloqué par l’approbation indisponible. Ne pas fournir le mot de passe d’un vrai élève ni utiliser le compte du dirigeant comme preuve élève.
2. Pour les écritures, fournir un **backend de test séparé**, sans données personnelles, sans jobs/messagerie sortants, conservant auth officielle/RLS/triggers et supports de test ; ou établir préalablement une exclusion exhaustive et atomique du compte technique (non prouvée aujourd’hui). Le backend actuel est partagé avec la production ; un simple aperçu ne suffit pas.
3. Dans cette isolation : créer dossier fictif propriétaire, période et modules de test, connexion réelle, ouverture PPT/PDF, répondre/remettre/recharger, lire résultats et progression, durée réelle/événements, jalons, question assistance et réponse fictive, refus croisé autre identité. Ne pas altérer ni masquer les refus pour obtenir un PASS.
4. Pour contrôler l’enregistrement dans l’interface Qualiopi réelle : connexion au compte administrateur dans l’aperçu. Aucun élargissement de droits automatique.

## Conformité

**À compléter maintenu.** Restent parcours authentifié complet et sauvegarde/relecture en environnement isolé, modalités FOAD accessibles et contacts techniques/pédagogiques identifiés, issues des demandes ouvertes, liste exhaustive intervenants par formation et référent si condition remplie. Les tests techniques partiels n’inventent pas ces preuves organisationnelles ni le seuil réglementaire non relu directement.

Relecture base exécutée après ajout de trois références d’audit : **15 preuves actives distinctes, statut `a_completer`**, zéro doublon. Six empreintes avant/après identiques : emails 15970 `5815daaa4ca1e6398f7e7856ca40bf68`, modules 62 `121ddbffb48ab1d23f26d949247297ba`, apprenants 3382 `06961a1d210de4e0da66e67bb7ab70aa`, questions 21 `271da4a3e85f9ff7721957e6519900a7`, quiz 7740 `f29d0e57e35d6e2ff493ba3c4cbeeda0`, complétions 1657 `d80edbbc1a8eb286b65fcf6759dcef53`. Aucun mail/publication ni appel de gel des relevés. Interface Qualiopi actuelle non vérifiée faute de session administrateur autorisée.