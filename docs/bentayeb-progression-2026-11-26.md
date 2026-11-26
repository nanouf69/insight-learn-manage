# Progression BENTAYEB — 26 novembre 2026

## Relecture complémentaire — 26/11 15:36 UTC
### Portes tracées et delta en aperçu
1. **Lecture** : `CoursPublic` charge les lignes et `etat_completion_modules`, vérifie identité de module/statut/date via `projeterProgressionConfirmee`, puis attache `preuve_serveur`. Reprise de lecture focus/online/visibilité/Realtime, sans polling ; erreur maintenue jusqu'à réussite, retour d'un module remet aussi propriétaire et erreur à jour.
2. **Carte** : `computeServerCompletedModuleIds` qualifie déjà le parent par la preuve serveur. Le second `.every(completionEvidenceAllowsDone)` sur toutes les sous-lignes était un veto redondant : retiré du caller et du helper d'affichage. Un parent RPC incomplet ne peut plus être remplacé par des enfants terminés ; les lignes à statut explicite restent présentes jusqu'à ce calcul.
3. **Compteurs À faire/Réalisés** : `progressionModulesEleve` recontrôlait séparément détails et registre. Désormais une ligne parent `completed` + `preuve_serveur=true`, déjà reconnue terminée, compte comme terminée sans second veto. Verdict faux/absent : obligations et gel historiques restent contrôlés. Aucun jeu n'est marqué réalisé.
4. **12/15** : `moduleQuizCounter` reste un compteur de détails/remises disponibles ; il n'est pas transformé en 15/15 et ne pilote ni statut ni ouverture après preuve RPC complète. Notes initiales conservées, reprises facultatives exclues de l'autorité de validation.
5. **Accès** : `computeUnlockState` reçoit le même ensemble de modules qualifiés par le serveur ; module 2 terminé ouvre 3, indépendamment du compteur 12/15. Aucune dérogation nominative ajoutée.
6. **CRM** : `useCandidatModules` passe désormais par la même projection stricte que l'apprenant au lieu de `avecEtatServeur` seul ; état absent/statut/date discordants = erreur, pas de repli local. Les compteurs partagent `progressionModulesEleve`.

### Preuves et limites de cette relecture
- **98 tests ciblés PASS** (huit suites) : 839/839 malgré 12/15, ancienne sous-ligne fausse, registre incomplet/indisponible, refus parent et 838/839, identité CRM, dates/statuts périmés, conservation JSON et règles de gel/pratique.
- **Navigateur PC/mobile simulé PASS** : le vrai écran CoursPublic, sous lectures entièrement interceptées et identité fictive, affiche module 2 dans Réalisés, Terminé, 12/15 et 45/842 ; clic Formules ouvre le module 3 à 4 %. Aucune requête de données réelle ni écriture n'a été autorisée par ce contrôle. L'aperçu du document Office affiche « No preview available » : rendu PDF externe non validé par ce test.
- **Build OK** ; aucun SQL, migration, contenu pédagogique, ticket ou envoi modifié.
- **Lecture réelle limitée** : module 2 completed/100, 45/842, updated_at 14:38:11.898323 et empreinte détails 035ab12d9f8518df1c24213e854d87c8 ; module 3 in_progress/4 inchangé. Le rôle SQL de lecture disponible refuse l'exécution du RPC : verdict réel connecté à nouveau NON PROUVÉ. Les 839/839 sont ceux de la lecture précédente et des tests.
- Le dossier n'a actuellement pas de sous-lignes : le veto parent/enfant est une possibilité concrète de code reproduite, pas une nouvelle cause nominative prouvée. Sans session réelle de BENTAYEB, un affichage ancien non rechargé reste aussi possible. L'alignement supprime ces portes de divergence sans modifier ses données.
- Aperçu : Cours en ligne → Vue apprenant → BENTAYEB ; aucune publication.

## Cause précise
Le dossier demandé correspond à **Mohamed BENTAYEB**, et non au prénom Amine du courriel : identifiant a9bbbcc9-f5bf-441d-a534-ac0e1241899c, parcours VTC e-learning.

`etat_completion_modules` était SECURITY INVOKER mais consultait directement `module_admin_audit_log`, visible uniquement aux administrateurs. Les dates historiques d’ajout/suppression étaient donc invisibles côté apprenant. Sur copie des preuves réelles : centre **839/839, completed, 100 %**, apprenant **657/842, in_progress, 78,03 %**. Les trois questions exclues et la couverture entière de certaines soumissions n’étaient plus reconnues.

Chaîne : `etatCompletionServeur` → `projeterProgressionConfirmee` → `completionEvidenceAllowsDone` → `computeServerCompletedModuleIds` → classement À faire/Réalisés et verrouillage séquentiel dans `CoursPublic`. Le CRM utilise le même verdict, mais sous des droits différents. Le compteur **12/15** vient de `moduleQuizCounter` ; il ne doit ni devenir artificiellement 15/15 ni annuler une validation serveur prouvée. Les corrections facultatives ne sont pas la cause.

## Correction
- Migration `drizzle/migrations/0295_module_history_role_parity.sql` **appliquée au service partagé**, sans écriture de données : helper borné aux clés de questions du dossier propriétaire, administrateur ou service interne ; seuls identifiants/dates historiques sont retournés. Le journal admin reste privé et le RPC principal reste invoker.
- `src/pages/CoursPublic.tsx` : une erreur de relecture reste visible même après un premier chargement réussi ; réussite suivante efface l’erreur. Les lectures focus/online/visibilité et événements déjà présents sont conservées, sans polling ni écriture.
- `src/test/module-progression-parite.test.ts` : tests 839/839 malgré 12/15 → Terminé et module 3 accessible ; 838/839 → blocage conservé ; nouvelle lecture remplace le verdict obsolète.
- `src/test/module_history_role_parity_sql_contract.py` : reproduction sur copie jetable des preuves réelles, isolation autres comptes/anon et conservation du dossier.
- `src/test/module_completion_sql_contract.py` : dépendances actuelles Lyon et option de candidat de lecture, sans activer les anciens candidats de validation.
- Candidats SQL archivés dans `docs/sql-revue/2026-11-26-module-history-role-parity*.sql`, règle technique dans `docs/sql-revue/AGENTS.md` et tâches dans `roadmap.md`. Types/journal de migration générés automatiquement.

## Contrôles exécutés
- **79 tests Vitest PASS** sur huit fichiers.
- **Parité PostgreSQL jetable PASS** : après correction, centre et apprenant 839/839, completed, 100 ; journal admin invisible à l’élève, autres comptes et anon refusés ; vrai manque toujours bloquant ; empreinte de la copie intacte.
- Contrat complet : **25 scénarios, 17 exécutés PASS, 8 ignorés** car réservés à un ancien candidat non activé. Aucune modification de save_module_completion.
- **Build OK**, dernier signal observé 15:24:57 UTC.
- Relecture réelle du dossier : module 2 toujours completed/100, score 45/842, updated_at 14:38:11.898323 UTC ; module 3 toujours in_progress/4, updated_at 29/10 11:10:01.389187 UTC. Aucune réponse, note, date ou complétion modifiée par ce lot ; aucun ticket ou mail touché.

## Aperçu et limites
Chemin : **Cours en ligne → Vue apprenant → BENTAYEB**. La projection testée affiche module 2 Terminé/Réalisé et ouvre module 3 sans modifier sa progression 4 %.

**Parcours connecté réel NON PROUVÉ** : la session disponible du demandeur est rôle user, pas administrateur ; le contrôle navigateur en lecture seule affiche un refus de vérification d’accès. La connexion SQL disponible ne peut pas assumer authenticated. Aucune élévation de droits ni écriture de test n’a été faite. La parité des droits est prouvée sur PostgreSQL jetable, pas par une connexion réelle de BENTAYEB.

Le correctif serveur est actif sur le service partagé ; le changement d’interface reste en aperçu, sans publication frontend.
## Suivi 26/11 20:40 UTC — antériorité par question (Seydou)
- Défaut 0297 (date de création de ligne globale) reproduit sur lignes réelles anonymisées : 0 exemption.
- 0299 (soumissions datées) puis 0300 (journal par question, horodatage client antérieur = refus) : 144 (exo 101) + 7 (exo 100) exemptions.
- Contrôle réel lecture seule du texte de la fonction en ligne : Seydou 144+7 ; M. Arga 0 ; M. Bentayeb 0. Premier journal 101-60001 : 18/09 22:12 UTC > remise 16/09 19:17 UTC.
- Aucune donnée apprenant écrite. Compte réel non ouvert.
- Lecture réelle 26/11 20:45 UTC (copies temporaires de session des fonctions en ligne, aucune écriture) : avec la règle 0297 → module 4 Seydou 374/525, incomplet ; avec la règle en ligne 0300 → 374/374, complet (exo 100 : 7, exo 101 : 144). Empreinte du dossier inchangée.
