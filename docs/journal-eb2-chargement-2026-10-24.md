# EB2 Khalfoun / chargement examens — 24/10/2026

## Accord et périmètre
Réparation ciblée autorisée : file legacy, session/relecture, erreurs techniques. Aucun contenu/question/réponse/score/signature/heure/gel modifié. Aucun rejeu de production, appel IA/mail/SMS, migration SQL ou publication frontend globale.

## Lecture seule / cause historique
- error_logs confirme les refus HTTP400 de l’opération legacy fournie, et les délais réseau ExamensEditor / Version active indisponible ; les traces n’incluent pas le corps du refus.
- Journaux Edge/PostgREST/Postgres du 22/23 octobre absents du service consulté. Les sources accessibles commencent le 24 octobre vers 09:35. Cause exacte 400 et cause précise 401 NON PROUVÉES ; pas d’attribution certaine à une contrainte, un format, une session expirée ou un passage figé.
- Deux lignes réglementation EB2 et EB2 t2 submitted contiennent chacune 16 réponses enregistrées le 22 octobre ; aucun rapprochement automatique de la file locale, aucun passage legacy converti en V2. Ni perte ni complétude déduite.
- EB2 VTC : versions V2 brouillon/retirée mais pas publiée ; EB3 VTC/TAXI non publiés aussi. Aucune nouvelle version créée. Le loader courant lit module_editor_state, registre distinct de exam_content_versions : ne pas confondre l’alerte de lecture avec la publication V2.
- NESAR : 42501 d’ouverture présent dans les traces navigateur ; session réellement absente vs refus de propriété non établi historiquement.

## Causes reproduites avec données fictives (avant : 4/4 FAIL)
1. Un refus HTTP400 définitivement bloqué était déverrouillé à chaque reconnexion.
2. HTTP401 sans renouvellement réussi était renvoyé périodiquement avec le même jeton rejeté.
3. flushAnswerSavesAndWait retournait true dès que l’opération était bloquée, sans accusé serveur.
4. Le polling de flush court-circuitait le backoff et renvoyait HTTP500 toutes les 100 ms.

## Corrections
- Refus persisté dans la file, anciens refus aussi conservés sans déverrouillage/rejeu à la reconnexion ; aucun payload modifié/effacé.
- Jeton rejeté suspendu jusqu’à remplacement, identité compte/dossier recontrôlée après attente réseau ; réponse d’un ancien compte ne débloque pas le suivant.
- Délais par opération respectés même par flush ; refus ne signifie jamais sauvegarde confirmée.
- Examens : toutes les relectures via garde de session identique et délais bornés ; une reprise réseau lecture seule avec délai plus long, aucune reprise de contenu vide confirmé comme s’il s’agissait d’une panne.
- Bilans : ouverture via garde session existante, lecture protégée, session absente distincte de lecture indisponible / snapshot attendu absent.
- Edge : diagnostics request_id/operation_id/stage/status/code uniquement, aucun SQL detail/payload/JWT. Erreurs SQL temporaires (connexion, timeout, verrou, concurrence) 503 ; contraintes définitives 400. Aucune répétition interne de la persistance.
- Déploiement unique upsert-reponse-apprenant : source SHA256 70508404c4f747c5f117056203540cef7bc985339144325d1e2253e4568c3c05. Aucun frontend publié.

## Preuves
- 140 tests ciblés et régressions (13 fichiers) + 104 protections centrales (6 fichiers) exécutés PASS ; avertissements act existants, aucune assertion en échec.
- Handler Edge réellement exécuté en environnement isolé avec service fictif : 401 sans RPC, 400 contrainte, 503 timeout, succès à un appel. SQL inchangé ; aucune prétention de test des contraintes/RLS réelles pour cette fonction.
- Navigateur localhost, appels interceptés : refus EB2 affichable, file 1 opération conservée, blocked true, attempts 1 après reconnexion, confirmed false.
- Compilation automatique build OK ; typecheck confié au contrôle automatique de plateforme, aucune exécution manuelle.
- Avant/après empreintes exactes : modules 62 `6dcdf347cd039743c67774ed064fbbb6` ; versions 57 `614b47fc7749ae2f0130745ce042e8c8` ; releve_jalons_calcul_fige 22 `4fcc0d041f89b4770fef79f95129e01a` (tri to_jsonb texte et md5 par ligne pour gel).
- Lectures transversales Khalfoun/NESAR/Belarbi uniquement ; comptes fictifs pour scénarios session A/B. Aucun test d’écriture sur dossier réel. Isam/AMAR exclus.

## Non résolu
- Appareil/queue locale et corps des anciennes erreurs inaccessibles : pas de récupération ni rejeu aveugle.
- Rechargement du frontend corrigé nécessitera une publication séparément autorisée ; le site public conserve l’ancien code. La fonction ciblée est déjà déployée pour diagnostiquer les prochaines demandes naturelles.
- Absence publication EB2 V2 ne sera pas corrigée en fabriquant/publiant des questions ; décision séparée nécessaire.