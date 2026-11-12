# Fermeture après envoi : préparation, non active

Règle : envoi confirmé du lien de signature ⇒ fermeture du compte cours, sans suppression ni modification des dates, notes, réponses, connexions ou signatures. Signature publique par token conservée.

Audit réel SELECT : `check_apprenant_session` n'examine pas le statut d'archivage, `core_assert_session_owner` vérifie uniquement l'identité, `is_current_user_apprenant` vérifie une connexion ouverte mais pas l'archivage. La fonction existante `delete-apprenant-account` bannit les futurs logins et archive le dossier ; cela ne démontre pas le refus des requêtes avec un JWT déjà émis. Ne pas prétendre qu'un simple ban garantit une fermeture immédiate.

Préparé : orchestrateur isolé à dépendances injectées, exige document envoyé et dossier unique/non administrateur, refuse l'accès serveur avant ban, journalise les erreurs, autorise un rejeu sans transporter de mail. Non branché, aucune implémentation des dépendances d'écriture réelle ni migration.

Blocage d'activation : protection des JWT encore valides à couvrir dans les lecteurs, RPC et écritures concernés, notification de révocation sans polling puis test authentifié sur compte fictif autorisé. Aucun compte réel désactivé. Aucun déploiement ni publication.