# Progression BENTAYEB — 26 novembre 2026

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