# Incident accès — 02/11/2026, 07:36 UTC

## Périmètre autorisé et actions
Lecture ciblée des deux dossiers, comptes, inscriptions, prolongations et logs. Un seul appel public de récupération réellement envoyé pour chaque adresse enregistrée, redirection vers https://gestion.ftransport.fr/reset-password. Aucun lien personnel lu, conservé ou ouvert. Aucun mot de passe changé, aucune permission, date, question, réponse, note, progression ou signature modifiée. Aucun SQL actif/migration, fonction déployée ou site publié. Seuls ce rapport et roadmap.md sont modifiés.

## Mohamed RHAIMA
- Dossier 34566caa-7f2c-4a38-8c79-ce8d2e347aca, compte 358bff89-1dbe-467e-acc1-bec25c02d326 ; lien unique, même email rhaima.pro@gmail.com, compte confirmé non banni/non archivé.
- Inscription enregistrée : ta-e / passerelle-taxi-elearning, accès 02/11/2026–31/05/2027, examen enregistré 26 janvier 2027, aucune inscription session retrouvée. La direction annoncée « VTC vers TAXI » diverge du libellé TA employé par le flux existant (TAXI vers VTC) : ne pas convertir ni modifier les modules sans confirmation du bon parcours.
- Ancien accès envoyé à 06:00 UTC ; lien utilisé après 07:29 refusé comme expiré. Demandes oubli de mot de passe à 07:26 et 07:29 refusées 429 over_email_send_rate_limit : blocage réel d'envoi, pas absence de compte.
- Nouveau lien : récupération HTTP200 à 07:38:58 UTC, auth recovery_sent_at 07:38:58.033247 UTC ; hook d'envoi réussi dans les logs. Demande et prise en charge de l'envoi prouvées, livraison finale en boîte/réception/clic non prouvés. Aucune modification du plafond global : valeurs complètes hébergées inconnues ; ne pas écraser confirmation/signup/HIBP pour modifier un seul paramètre.

## Abdullbaset NESAR
- Identité base : nom NESAR, prénom Abdullbaset ; dossier 8a62baa1-8187-420e-aa03-d1205228052b, compte 73e595c7-2b83-4dcb-b8d5-d82a8643b792, email abdulbaset0744@gmail.com, lien unique, compte confirmé non banni/non archivé.
- Connexion réussie à 06:41:41 UTC ce matin : le compte auth fonctionne. Expiration des cours enregistrée 31/10/2026 (début 14/09). Session VTC soir 14–27/09 ; dates fiche formation 14/09–31/10 ; aucune extension CRM, nouvelle inscription, choix réinscription ou report examen retrouvé.
- Examen dossier : 29 septembre 2026, résultat non. Le 17 novembre déclaré par le propriétaire n'est pas enregistré dans les sources consultées. Aucune prolongation inventée ni réécriture de l'ancienne période. Réouverture reste bloquée sur confirmation de l'étendue autorisée jusqu'au 17/11 et du parcours exact.
- Nouveau lien au compte existant : HTTP200 à 07:39:48 UTC, recovery_sent_at 07:39:47.889228 UTC, hook réussi. Cet envoi ne réouvre pas les cours ; livraison finale en boîte/réception/clic non prouvés.

## Contrôles exécutés
- PASS : page publiée /reset-password?error_code=otp_expired montre « Lien expiré ou déjà utilisé », zéro champ mot de passe ; capture /tmp/browser/access-incident/expired-published.png. Aucun vrai lien consommé.
- PASS : 8 tests existants (convocation-acces-cours 6, vtc-novembre-acces 2), exécutés 07:39:49 UTC. Pas de test sur compte élève réel.
- PASS : empreintes lecture avant/après récupération Nesar (07:39–07:40) : réponses 67 / 916074ec29b6886aa707f3ab0950a3d6 ; quiz 31 / 7e27bb3cce3cb3ad1e1a60bb1b42dad5 ; complétions 10 / 1452f5aacf8bb8e9f0b8c8515578ee59 ; feuilles 22 / 6b4deeba2cb72f21eaafa0f085c83b9b. Identiques. Première empreinte prise après l'appel RHAIMA (celui-ci n'effectue aucune écriture applicative).
- Dernier contrôle automatique : build OK 07:38:10 UTC. Aucun code applicatif modifié.
- NON PROUVÉ : livraison finale des deux emails, définition effective du mot de passe, connexion et ouverture autonome des cours après clic ; ne jamais utiliser le lien d'un élève à sa place.

## Suite nécessitant décision
Confirmer la réouverture de NESAR du 02 au 17/11/2026 inclus (ou autre fin exacte) et la direction correcte de la mobilité RHAIMA. Ne pas étendre automatiquement l'accès d'autres dossiers ni modifier les acquis.