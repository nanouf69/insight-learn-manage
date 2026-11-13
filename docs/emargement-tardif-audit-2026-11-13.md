# Émargement tardif — audit et préparation du 13/11/2026

## Décision
**APERÇU SEULEMENT / ACTIVATION NO-GO.** Aucun émargement, compte, inscription, autorisation, mail ou calendrier réel modifié ; aucun SQL installé ni fonction déployée ni publication. Le nouvel indicateur `EMARGEMENT_TARDIF_ACTIF` reste `false`. Ne pas exécuter manuellement `geler_releves_fin_acces()`.

## Cause prouvée, incident individuel non prouvé
- Catalogue live lu : `emargement_controle_creneau` et `emargement_fenetres_eleve` imposent `date_cours = date Paris courante`, même pour un créneau prévu. L’ouverture est trente minutes avant le début réel, **sans fermeture à 12 h**. Le 30/10 matin 09–12 était normalement ouvert dès 08:30 Paris le 30/10, pas par ce circuit le 13/11.
- `EmargementsSignesViewer.tsx` propose des dates passées et « Re-signer », mais la modale n’envoyait aucun `regularisation_id`. `save-emargement-apprenant/index.ts` contrôle les horaires **avant** l’anti-doublon : une ancienne signature peut donc susciter un refus de date avant d’être reconnue comme conservée.
- Le déclencheur live `garde_emargement_fenetre` protège signature, absence, identité, date, créneau, `signed_at` et autorisation déjà enregistrés. Il fixe `signed_at = clock_timestamp()` pour une nouvelle signature autorisée. Ce verrou ne doit pas être contourné.
- Index unique live `(apprenant_id,date_emargement,demi_journee)` ; RLS propriétaire/admin, liens explicites en lecture ; aucune règle RLS générique de date trouvée. Les écritures Edge utilisent un compte de service : identité/éligibilité doivent rester vérifiées côté serveur.
- Les logs récents de `save-emargement-apprenant` ne montrent que démarrages/arrêts, sans refus contextualisé. Aucune trace réseau utilisateur exploitable disponible. **Impossible d’attribuer l’erreur de la capture à une personne, un jeton expiré ou un refus précis.** Aucune identité déduite de la date.

## Cas 30/10/2026 matin, contrôle anonyme
Lecture agrégée : 12 lignes matin, 12 après-midi ; les 24 ont une signature, aucune absence ni ligne masquée ni ligne vide. **Cela ne prouve pas que tous les inscrits ont signé**, car une feuille peut ne pas encore exister. Zéro autorisation de régularisation listant exactement le 30/10 matin. Aucun nom ni réponse personnelle extrait.
Empreinte contrôle des 24 lignes : `49af82c50011f92ccc09c59a6f4b0e9e` ; contrôle final prévu avant conclusion. Le compte de la capture et son inscription restent inconnus.

## Liens, session et accès
La page `/emargements-regularisation/:id` exige la connexion ; connaître son adresse ne donne aucun droit. L’Edge valide le jeton par `auth.getUser`. L’autorisation contient sa propre expiration, distincte de celle du jeton et de la fin des cours. Reconnexion ≠ renouvellement d’autorisation. La fin de session ne doit pas, seule, interdire une présence passée autorisée ; annulation, exclusion, attente et absence restent opposables.
Durées hébergées des liens de connexion/récupération **NON VÉRIFIÉES** : pas de configuration hébergée lue. Révocation/archivage du compte réel et accès effectif d’un élève non identifié **NON PROUVÉS**. Le candidat prend uniquement l’identité déjà vérifiée par l’Edge, jamais celle envoyée par le navigateur.

## Autres défauts identifiés dans la régularisation existante
`regularisation.ts` est inspecté, non modifié/non déployé :
- contrôle regex PNG, mais pas de décodage : une image vierge/illisible pouvait franchir ce niveau ;
- `confirme_identite: true` enregistré sans confirmation explicite envoyée ;
- pas de revalidation de l’inscription/session dans ce handler ;
- lecture puis UPDATE d’une ligne vide sans transaction ; le déclencheur live protège toutefois une signature devenue remplie contre l’écrasement, donc la course peut produire un refus plutôt qu’une perte ;
- conflit unique d’une ligne masquée traduit abusivement en « duplicate success » ;
- relecture de liste qui absorbe son erreur et peut confondre absence/signature.
La base timestamptz empêche ordinairement une date d’expiration invalide ; le test JavaScript seul échoue ouvert sur NaN. Ce constat ne prouve pas une autorisation invalide en production.

## Correctif préparé
1. **Écran réel en aperçu** : « Re-signer » ouvre une confirmation expliquant que signature/absence, identité et horodatage existants restent intacts ; aucun remplacement, aucune duplication. Une rectification exige revue administrative séparée, pas de nouveau tracé silencieux.
2. Pour une date passée non signée, recherche fraîche uniquement des autorisations du compte/dossier/créneau exacts ; zéro autorisation, erreur ou ambiguïté = aucun envoi. L’enregistrement reste désactivé avant validation. Date de formation et signature tardive sont affichées séparément en heure Paris.
3. **Candidat SQL de revue non installé** : `docs/sql-revue/2026-11-13-emargement-tardif.sql`. RPC de service uniquement, inscription/session/compte et créneau réel revérifiés ; autorisation existante nominative avec motif/auteur/expiration. Verrou transactionnel par compte/date/créneau ; reçu et journal atomiques ; rejeu identique seulement ; conflit de requête refusé. Lignes signées/absentes conservées, masquées en revue, lignes vides remplies sans changer leur ID. Horodatage serveur et journal append-only/RLS propriétaire, aucun octroi automatique.
4. **Adaptateur Edge candidat non branché** : `tardif-candidat.ts`, PNG décodé et vierge/illisible refusé ; présence passée et identité explicitement requises ; aucun `user_id` navigateur utilisé comme identité.
5. Envoi isolé single-flight préparé et testé, sans rejeu automatique après livraison inconnue. Aucun mail de test ni faux émargement créé en production.

## Tests réellement exécutés
- 26 Vitest PASS : choix compte/dossier/date/créneau, passé/futur, label tardif Paris, horodatage absent, double clic, erreur sans rejeu, fenêtres −30 min et anciennes autorisations.
- 25 tests PostgreSQL existants PASS sur cluster jetable : droits d’inscription, dates, pratique, matin/soir, historique protégé et refus passé sans autorisation.
- 26 tests PostgreSQL candidat PASS : cas 30/10 matin, après-midi indépendant, compte/dossier/créneau faux, futur, expiration, présence/identité manquantes, signature invalide, attente/exclusion/annulation, e-learning, bonne session, ligne masquée, signature/absence existante intacte, RLS/journal, concurrence réelle deux connexions = une seule preuve et un seul journal.
- 6 Deno PASS : PNG réellement tracé, vierge, illisible, absence, identité/presence manquantes. `deno check` PASS.
- Chromium PC 1280×1800 et mobile 390×844 PASS : confirmation existante sans canvas, OFF/absence de droit bloqués, cases explicites, dessin canvas et double clic donnant un reçu **simulé** unique, pas de dépassement horizontal. Captures inspectées. Ce n’est pas une signature réelle ni le parcours hébergé authentifié complet.
- Aperçu : dernière entrée `build OK`. Aucun PASS revendiqué pour déploiement, réception serveur réel ou présence passée d’un vrai apprenant.

## Limites et conditions d’activation
- La signature tardive est une déclaration datée du jour de signature, **pas une preuve automatique de présence au jour du cours**. Aucun antidatage, aucun certificat/attestation ou relevé historique automatiquement régularisé.
- Le centre doit vérifier la présence passée (feuille papier, relevé du formateur ou justificatif probant), la session/créneau exacts, et conserver le motif ainsi que l’autorisation. La recevabilité dépend du financeur/dispositif et des exigences d’audit ; aucune conformité Qualiopi/CPF garantie par une signature tardive seule.
- Nouveau journal non installé, page de régularisation existante pas encore convertie au RPC atomique : elle ne doit pas être présentée comme corrigée en production. Le candidat ne ferme pas à lui seul les anciens chemins d’INSERT/RPC ; la même vérification doit être portée au déclencheur avant activation pour empêcher un chemin concurrent plus permissif.
- Les horaires d’un créneau doivent être confirmés dans **la session de l’autorisation**, notamment pratique et inscriptions croisées ; le candidat vérifie session/dates et créneau central, mais l’égalité des horaires avec cette seule session reste à certifier.
- Restent nécessaires : sauvegarde/restauration complète prouvée, identité/dossier volontairement fournis, compte de test isolé autorisé, authentification/révocation, intégration liste/confirmation/reçu/readback/PDF, et essais bout-en-bout sur le vrai circuit sans donnée de production. Activation uniquement après accord explicite ; aucun accès ni autorisation réel accordé ici.