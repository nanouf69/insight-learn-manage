# Nesar — prolongation ciblée du 02/11/2026

## Autorisation et changement réellement appliqué
Propriétaire : deux semaines après le 31/10/2026, jusqu'au 14/11/2026 inclus, Nesar uniquement. Mohamed RHAIMA et son parcours restent inchangés.

Identité : nom NESAR, prénom Abdullbaset, dossier `8a62baa1-8187-420e-aa03-d1205228052b`, compte `73e595c7-2b83-4dcb-b8d5-d82a8643b792`. Compte confirmé, non banni/non archivé, liaison et email vérifiés.

Écriture ciblée réussie à 07:54:07 UTC sur une ligne de `public.apprenants` : `date_fin_cours_en_ligne` passe de `2026-10-31` à `2026-11-14`. Conditions simultanées : dossier, compte, email enregistré, anciennes dates et non-archivage. `updated_at` seul autre champ changé par le déclencheur existant. Pas de modification de fonction ni de règle partagée.

Début des cours maintenu au 14/09/2026 ; dates de formation maintenues au 14/09–31/10/2026 ; examen et parcours inchangés. La réactivation existante propose un mois et exige des modules explicitement attribués (ici NULL, parcours standard) : elle ne correspond pas à cette autorisation de 14 jours. Aucune extension mensuelle ajoutée. Le déclencheur après modification retourne immédiatement si `auth_user_id` existe : aucun envoi automatique déclenché par cette écriture.

## Bornes et contrôles exécutés
- PASS : `calculerAccesCours` compare à midi et autorise `now <= fin`, donc le 14 novembre entier est inclus ; refus dès le 15 novembre.
- PASS : 9 tests Vitest exécutés à 07:53:58 UTC (`convocation-acces-cours` 7 dont un nouveau test avec dates concrètes Nesar ; `vtc-novembre-acces` 2). Test de l'accès au 02/11, au 14/11 23:59:59, refus au 15/11 00:00:00 et données d'entrée non modifiées.
- PASS : relecture de la ligne après écriture : fin effective `2026-11-14`, autres champs métier identiques.
- PASS : empreintes avant/après identiques :
  - 67 réponses : `6666eab8dfe3864545e5c1d9f60dbef9`.
  - 31 résultats quiz : `bb7966142549289bf99fde6cecfcb0af`.
  - 10 complétions : `66df2bf499670ec337be4130f5ca95a5`.
  - 22 émargements : `5e6ead1ffa49761305a0cc6f661eed00`.
  - Tous autres dossiers apprenants, dont Mohamed : `2dcbf4bba5f0b4fa18218da3fced2b00`.

## Limite et déploiement
NON PROUVÉ : connexion et ouverture des cours en session réelle de Nesar. La demande de session nominative a été refusée car l'approbation n'est pas disponible dans ce contexte ; aucun contournement, lien consommé, mot de passe changé ou connexion simulée. Les tests de la règle et la relecture des droits ne remplacent pas un test connecté.

Changement de donnée actif dans la base partagée utilisée par le site publié, aucune publication requise pour cette date. Aucun code applicatif, migration SQL ni fonction déployée ; seul un test de borne et les documents de suivi ont été ajoutés/modifiés. Aucun nouvel email/SMS/IA envoyé dans cette instruction. Aucune action sur modules, progression, notes, signatures ou dates de Mohamed.