# Qualiopi 9/10/11 — rapprochement complémentaire du 18/11/2026

## Écritures effectives et relecture

- **1 667 références enrichies** : 578 mails, 566 formulaires, 523 quiz.
- **231 convocations** ont désormais leur inscription/session exacte dans l’annotation complémentaire. Les 231 rapprochements préexistants ont été validés contre les inscriptions actuelles (IDs apprenant/inscription/session, début/fin et destinataire), sans nouvelle preuve dupliquée.
- **409 nouveaux liens vers l’indicateur 10** : remises de quiz du même compte authentifié que le dossier, module effectivement attribué et date dans la fenêtre d’accès CRM. Ils documentent le suivi individuel, pas une adaptation réalisée ou une acquisition réussie.
- Parmi ces 409, **97** appartiennent à un dossier au libellé e-learning explicite et non mixte ; les 312 autres ne reçoivent aucune modalité supposée. Aucune session présentielle n’est créée ou déduite.

| Indicateur | Avant | Nouveaux liens | Après |
|---|---:|---:|---:|
| 9 | 802 | 0 | 802 |
| 10 | 348 | 409 | 757 |
| 11 | 734 | 0 | 734 |

1 986 preuves totales inchangées ; zéro doublon de source, zéro doublon de lien, zéro référence orpheline. Relecture SQL après écriture effectuée. Les cinq empreintes sources sont strictement identiques avant/après : mails, formulaires, réponses quiz, notes, inscriptions.

## Exceptions et limites exactes

Sur les **1 667 références rapprochées au dossier**, **1 436 n’ont pas de session pédagogique prouvée** : 347 mails, 566 formulaires et 523 quiz. Ce ne sont pas 1 436 élèves sans preuve : ces références ont leur dossier exact et plusieurs concernent légitimement l’e-learning.

- **10 convocations ambiguës** : deux inscriptions candidates, conservées sans choisir une session principale. Incluses dans les 347 mails sans session attribuée.
- **114 quiz** : identité du dossier connue mais attribution/fenêtre actuelle insuffisante pour ajouter un lien de suivi 10 ; ils restent référencés en 11 avec leurs limites. Inclus dans les 523 quiz sans session pédagogique.
- **566 formulaires** : aucun `session_id`/`inscription_id` enregistré. `onboarding_session_id` est un identifiant de parcours navigateur (`session_<timestamp>…`), jamais une session CRM : il n’est pas utilisé pour attribuer une formation.
- **2 dossiers de bienvenue e-learning** : leurs dates d’accès archivées diffèrent du CRM actuel. Les deux jeux de dates sont conservés distincts ; aucune substitution rétroactive ni correction des dates source.
- Les **2 questions/réponses pédagogiques** déjà liées à 10 ne sont pas retraitées par ce lot, qui porte sur mails/formulaires/quiz.
- Les **1 163 remises historiques** non rapprochées à la banque actuelle lors de l’audit précédent ne sont pas résolues par ce lot ; aucune nouvelle association de version/question n’est fabriquée.

Les 578 mails référencés ont un apprenant explicite ou un destinataire unique vérifié ; zéro cas d’identité inconnue dans ce lot. Zéro pièce jointe signalée dans ces mails ; une identité Outlook reste une référence d’archive, pas une pièce jointe lue. Zéro confirmation de réception enregistrée ; l’envoi n’est jamais présenté comme réception.

Les objectifs/titres de quiz restent ceux des références existantes. Aucun score recalculé, verdict, admission, date d’évaluation ou attribution historique inventé. Les fenêtres et modules CRM actuels documentent le rapprochement actuel, pas une reconstruction du passé.

## Contrôles

- Page admin connectée `/?section=qualiopi` rechargée : compteurs **802 / 757 / 734**, états manuels inchangés (« Sans preuve »).
- Fiche 10, onglet « Nos preuves (757) » ouvert : 749 annotations complémentaires présentes et capture de la fiche inspectée ; références dossier, quiz et limites visibles. Aucun bouton d’enregistrement ou d’envoi utilisé.
- Deux tests de lecture exhaustive exécutés et réussis (`qualiopi-lecture-complete.test.ts`).
- Script idempotent : `docs/qualiopi-rapprochements-2026-11-18.sql`. Il enrichit seulement `qualiopi_preuves.remarque_interne` sous une nouvelle clé datée et ajoute les liens manquants ; anciennes annotations conservées.
- Aucune nouvelle pièce, aucun envoi, aucune publication et aucune conformité automatique.