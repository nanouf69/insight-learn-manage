# Annulation reset — reprise 14:06, isolée

## Verdict
**GO pour revue séparée du candidat et des scénarios exécutés ; NO-GO installation/annulation production.** Les trois axes ont avancé mais la cohérence de TOUS les écrans ouverts et les chemins anciens de repassage ne sont pas intégralement prouvés. Aucun bouton dégrisé, aucune migration exécutée, aucune donnée réelle changée, aucune publication.

## Nouveaux tests seulement
Commande : `python3 src/test/exam_reset_cancel_integration_v2_contract.py`, puis `bunx vitest run src/test/exam-reset-cancel-effective-readers.test.ts`.

**5 scénarios PostgreSQL PASS**, cluster socket-only sans PG Cloud hérité, schéma et déclencheurs de fixture capturée ; aucune répétition des 31 contrats acquis :
1. Sept copies TAXI, sept notes définitives et sept QRC humaines fictives ; archivage puis événement d’annulation, relecture authentifiée admin ET propriétaire des résultats ancien/V2 et QRC = sept visibles. Empreinte copies/résultats/QRC originale byte-identique. `core_start_attempt` réel ne consomme ni ne rattache le grant annulé ; il peut démarrer selon les règles habituelles, sans réactiver le grant.
2. Vrai `start_or_get_exam_timer` ancien crée nouveau timer après reset → annulation refusée, résultats originaux intacts.
3. Transaction ancien démarrage maintenue ouverte, annulation attend effectivement le verrou ; commit démarrage → annulation refusée, zéro événement d’annulation.
4. Annulation gagne, puis timer ancien → grant annulé toujours non consommé.
5. Autre propriétaire : zéro événement et zéro QRC visibles ; contexte admin refusé.

**2 tests Vitest PASS** : les données JSON exportées exclusivement depuis le cluster fictif sont relues par `fetchCoreMatiereStates` (partagé élève/CRM), `coreStateScore` et `listerSessions` QRC. Brut = zéro copie visible ; effectif = sept notes de 17/20 et sept identités QRC. Cutoff annulé absent, autorisation annulée absente. Adaptateur de lecture préparé refuse les écritures.

Ces preuves ne sont PAS un E2E navigateur des trois écrans réels. Le test TS exige le fichier temporaire produit par le test PostgreSQL précédent. Le scénario construit le reset par insert de fixture, pas par clic ni RPC reset réelle. La correction humaine est fictive via fonction capturée `core_correct_qrc`, jamais dans Cloud.

Échecs intermédiaires distingués : encoding SQL_ASCII, réponse JSON mal formée, insertion QRC après clôture et absence de colonne consumed_at dans autorisation matière corrigés dans les fixtures/candidat. Le premier test inter-propriétaire QRC a échoué : la fixture omettait RLS QRC. SELECT live policies effectué et règles réelles reproduites sur cluster ; dernier lancement complet PASS. Aucune policy production changée.

## Candidat SQL séparé, non installé
Ordre proposé :
1. `docs/sql-revue/2026-11-11-exam-reset-cancellation.sql` (base existante, SHA256 `56aeaec95fd481e7e0b5f798f68da4bba03ef64d34ed5c02a35e97f4de3d1445`).
2. `docs/sql-revue/2026-11-11-exam-reset-cancellation-integration.sql` (extension ciblée, SHA256 `76911e18fc667131899c3aa1b918f1e99e663e1829f45a5394deecc3b586b157`).

Extension : sélection des vues effectives uniquement sur clauses FROM/JOIN ; INSERT/UPDATE sources et types conservés. Ordre de verrou exam-v2 avant subject-retake pour chemins matière et timer ; triggers INSERT anciens reçus/réponses/timers/résultats ; contexte complémentaire refuse tout timer/réponse/reçu post-reset. Gate couverture FALSE dans le fichier ; seul banc jetable active TRUE. Aucune IA requeue : les lecteurs d’éligibilité IA gardent les exclusions brutes d’archives.

**Attention revue obligatoire** : le DO transforme les définitions installées via pg_get_functiondef ; ceci n’est pas encore un manifest explicite versionné des fonctions fraîches avec empreinte/CAS. Ne pas installer ce candidat directement. Le remplacement de lecture est éprouvé sur le catalogue fixture, pas garanti sur une future modification concurrente.

## Prévol nominatif réellement exécuté (SELECT seulement)
HADDOU MASSINISSA `c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe`, EB3-TAXI, reset `1b345cff-b068-4499-b0d7-76a6578fc74c`, cutoff `2026-11-11 13:16:10.962101+00` :
- Sept copies archivées terminées et sept résultats définitifs conservés.
- Zéro nouveau V2, zéro timer et zéro reçu matière après cutoff.
- Grant `28a308de-a42b-4e29-b314-28b0790e0345` non consommé, non révoqué.
Ce constat n’est PAS une autorisation de restauration. Refaire SELECT frais avant toute future confirmation : identité, dernier reset unique, réponses anciennes post-cutoff, autres grants/consommations, sept liaisons exactes résultats/copies, neutralisations exclusivement liées au reset, absence événement d’annulation.

## Ce qui manque — NO-GO concret
- Brancher l’adaptateur effectif simultanément aux lecteurs bruts inventoriés : CoursPublic, NotesView, ExamensBlancsPage/Liste, ResultatsApprenantTab, ExamensBlancsResetTab, sélection preview, coreExamPublication, pontV2, noyauReel, rapprochement et surveillance. L’adaptateur est préparé NON connecté ; leurs lectures réelles restent brutes.
- Rafraîchissement de tous ces écrans après événement d’annulation : abonnement effectif/doorbell conforme à l’architecture, pas de polling. Actuellement useLearnerResultRefresh ne suit pas l’annulation.
- Exécuter `start_exam_subject_retake` ancien simultané sur même reset ainsi que races consommation/UPDATE réponse existante et preuve stricte aucune première réponse avant cutoff masquée par une réécriture ultérieure. Tests timer seul et guards INSERT ne couvrent pas cela.
- Cas V2 reset/annulation simultanés et répétitions avec fonctions fraîchement capturées, neutralisations indépendantes et anciennes archives abandonnées restent protégés par refus mais pas ajoutés à cette reprise.
- Vérification navigateur des trois écrans avec lecture effective sur API jetable et identité/notes exactes ; test actuel = vrais lecteurs TS sur export SQL fictif, pas rendu complet.

## Plan de déploiement minimal proposé, NON exécuté
1. Fermer les points ci-dessus uniquement sur base jetable ; figer un manifest SQL explicite des fonctions et empreintes fraîches + lot frontend exclusivement effectif.
2. Revue séparée du propriétaire du SQL/manifest/diff frontend ; gate FALSE et confirmation disabled jusqu’à accord.
3. Sur nouvel accord : prévol nominatif lecture seule, installation isolée de dépendance serveur (aucune annulation), tests contexte non mutant et bundle frontend ciblé seulement, vérifier cohérence ancien/V2/QRC.
4. Sur confirmation nominative distincte : annuler CE reset uniquement, journal append-only, readback sept copies/sept notes + contrôle hors périmètre. Aucun EB4/5/6 restauré automatiquement.

Chemin inchangé : fiche apprenant → Examens blancs → Examens archivés → EB3-TAXI. Bouton réel demeure désactivé, contexte serveur absent/non activé. Aucun autre chantier frontend touché.