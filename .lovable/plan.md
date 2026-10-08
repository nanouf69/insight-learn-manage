# Check-up complet de la plateforme (audit en lecture seule)

## Principe
- Aucune modification du code, des données ou de la configuration. Rien n'est publié.
- Aucun e-mail ni SMS envoyé à un vrai élève. Aucune restauration réelle. Aucun appel à l'IA payante.
- Seuls des contrôles qui ne changent rien : lecture du code, des journaux et de la base, tests automatiques existants, navigation dans l'aperçu avec un compte de test.
- Chaque constat sera classé en trois catégories : **confirmé**, **risque potentiel** ou **non vérifiable** (avec la raison).

## Périmètre contrôlé
1. **Erreurs écran et serveur** : journaux de l'aperçu (erreurs, console, réseau), journaux des fonctions serveur (7 derniers jours), table des erreurs, alertes système.
2. **Connexion et droits d'accès** : analyse de sécurité, règles d'accès de chaque table, comptes de test exclus, isolation entre CRM et portail élève.
3. **Base de données** : cohérence du schéma, contrôle automatique de la base, colonnes utilisées par le code mais absentes de la base, santé du serveur (mémoire, disque, connexions).
4. **Parcours élève** (compte de test, ordinateur, tablette, téléphone) : connexion, tableau de bord, modules, sauvegarde de progression, quiz, QRC, examens blancs, règle des 48 h, CGV.
5. **Parcours administrateur** : fiches élèves, sessions, inscriptions, Examens/Résultats avec les sessions 2027, planning pratique, agréments.
6. **Facturation, documents et exports** : factures, paiements (doublons d'affichage), PDF/ZIP, liens sécurisés.
7. **Tâches planifiées et messages automatiques** : liste des tâches, dernière exécution et résultat, e-mails et SMS (journaux uniquement).

## Anciens incidents à revérifier (sans les supposer actuels)
- Envoi des accès à 6 h pour les comptes déjà existants : résultats des passages depuis le 30/09.
- Sauvegarde quotidienne : date du dernier marqueur « terminée », présence d'erreurs sur des colonnes inexistantes, contrôle à blanc de la possibilité de restaurer (lecture des fichiers, comptage comparé à la base, sans écriture).
- Progression des modules refusée (« permission denied ») : journaux base et réseau.
- SMS OVH et expéditeur FTRANSPORT : journaux d'envoi récents, sans envoi.
- Crédits Cloud/IA : solde et refus récents liés aux crédits.

## Rapport livré (en français)
- Classement **critique / majeur / mineur**.
- Pour chaque anomalie : preuve datée (journal, fichier et ligne, ou étapes pour la reproduire), cause, impact pour les élèves ou le personnel, correction proposée, test pour vérifier la correction.
- Liste des contrôles réellement faits et de ceux qui restent à faire (par exemple Safari sur un vrai iPhone).
- Les 5 actions prioritaires.
- Une compilation réussie ne sera jamais présentée comme une preuve que tout fonctionne.
- Le rapport sera aussi déposé dans les Files : `audit-plateforme-20261008.md`. Aucune autre écriture.

## Détails techniques
- Sources : /tmp/observability/*, supabase--edge_function_logs, supabase--analytics_query (postgres, auth, function edge logs), supabase--linter, security--run_security_scan (lecture), supabase--db_health, read_query sur cron.job / cron.job_run_details, error_logs, alertes_systeme, sms_envois, emails.
- Stockage « sauvegardes-eleves » : lecture de `_etat.json`, `_termine.json`, `_incomplet.json` pour les 7 derniers jours ; comptages comparés à count(*) des 23 tables.
- Tests existants via vitest (aucun nouveau fichier de test).
- Playwright sur localhost avec un compte de la table comptes_test_techniques ; formats 1280, 820 et 390 px de large ; aucune soumission qui écrit en base.
- credits--get_credit_balance, ai_gateway_logs (statut 402/429).
