# Fiabiliser les enregistrements et validations après l’audit global

Autorisation de préparer les correctifs reçue. Aucune publication ; confirmation distincte avant tout déploiement en production.

## 1. Sauvegardes et soumissions
- Corriger les défauts reproduits de concurrence et de confirmation : une réponse récente ne doit pas être remplacée par un ancien brouillon ; une sauvegarde locale ou une requête acceptée ne vaut pas preuve de soumission.
- Conserver les saisies en cas d’erreur, vérifier le même compte et la même copie avant confirmation, rendre les échecs explicites et les reprises idempotentes.
- Vérifier les transactions existantes avant d’ajouter une protection ; éviter toute seconde voie de validation contournant un refus serveur.

## 2. Examens blancs
- Remplacer le critère insuffisant « une matière V2 terminée ou un nombre de notes » par une preuve de remise des matières réellement requises, par identité de copie.
- Un import historique isolé ne valide jamais un examen. Les anciennes copies authentiquement soumises restent utilisables sans exiger une conversion V2.
- Ne pas rouvrir ni réécrire les validations, réponses, notes ou tentatives historiques. Les cas sans preuve suffisante restent à vérifier ; accès et reprise ne doivent pas être confondus avec achèvement.

## 3. QRC et anomalies historiques
- Distinguer correction réellement manquante, ancienne trace déjà supersédée, copie vide et conflit d’identité.
- Ne déclencher aucune IA payante, correction fictive ou relance massive.
- Recontrôler en lecture seule les quatre dossiers à compte divergent, les 353 modules à preuve incomplète et les 74 feuilles passées sans image ; produire les cas nécessitant une vérification humaine, sans rattachement ni signature automatique.

## Vérifications et livraison
- Reproductions avant/après sur données fictives : deux écritures concurrentes, réponse lente, double soumission, coupure/reprise, changement de compte, refus serveur, copie vide et import isolé.
- Tests des parcours VTC/TAXI/TA/VA, historiques et en cours ; simulations téléphone/tablette, puis suite globale et contrôles de compilation disponibles.
- Rapport : fichiers changés, résultats réellement exécutés, limites et anomalies non résolues. Aucune certification globale si un contrôle essentiel manque.

## Détails techniques et fichiers concernés
- Sauvegardes : `src/hooks/useAutoSaveReponses.ts`, `src/lib/answerPersistence.ts`, `src/lib/quizAttempts.ts` et, si le défaut est reproduit, `src/hooks/useAutoSave.tsx` et leurs contrôles serveur.
- Examens : fonction serveur `examens_blancs_preuve_soumission`, ses appelants et la projection commune de complétion ; modification minimale, test sur PostgreSQL jetable avec le contrat `src/test/module_completion_sql_contract.py` si ses RPC sont touchées.
- Tests : fichiers ciblés sous `src/test`, scénarios mobiles temporaires sous `/tmp/browser` ; décisions dans `AGENTS.md`, avancement dans `roadmap.md`, rapport sous `docs`.
- Toute protection serveur préparée sera testée hors production avant application ; la base Cloud est partagée avec le site publié. Pas de changement actif de règle serveur avant confirmation du déploiement.