# Journal des modifications

Entrées chronologiques conservées : ajouter une nouvelle entrée, ne pas remplacer les précédentes.
Ce journal commence le 7 octobre 2026 ; il ne reconstitue pas les interventions antérieures.

## 2026-10-07 — Numérotation administrateur des quiz

- **Accord** : « Autoriser ce périmètre » — correction de la numérotation administrateur, contrôles et journal uniquement.
- **Pourquoi** : l'éditeur calculait encore les parties cours/quiz par position après filtrage des quiz inactifs ; la vue apprenant utilisait déjà les identifiants.
- **Changement** : extraction de la fonction de numérotation, qui utilise désormais `orderedCoursePages` pour les mêmes modules concernés. Les autres règles de numérotation sont conservées.
- **Impact autorisé** : libellés de partie des quiz dans l'éditeur administrateur ; aucun changement de l'ordre apprenant, du contenu ou de la progression.
- **Fichiers** : `src/components/cours-en-ligne/ModuleDetailView.tsx`, `src/lib/exercicePartNumbers.ts`, `src/test/formation-order-regression.test.ts`, `src/test/fixtures/formation-order-baseline-20261007.json`, `AGENTS.md`, `roadmap.md`, ce journal.
- **Référence** : ordre complet des 15 formations dans `FORMATION_MODULES`, séquences des quatre jeux de cours VTC/TAXI/TA/VA, empreintes SHA-256 des 68 fichiers pédagogiques `*-data.ts`. Référence figée avant modification.
- **PASS exécutés** : 102/102 tests (11 existants + 91 nouveaux) ; comparaison des 15 configurations, des quatre séquences cours/quiz, des 68 fichiers ; quiz Gestion et Anglais avec parties inactives ; série supplémentaire TA ; associations VA ; conservation des objets ; aller-retour des coordonnées historiques.
- **PASS comparaison indépendante** : toute la partie de `ModuleDetailView.tsx` après l'ancienne fonction de numérotation est identique octet pour octet ; moteur d'ordre apprenant inchangé. Vérification des empreintes avant/après exécutée.
- **PASS serveur en lecture seule** : 62 états de modules ; empreinte globale avant/après identique `6f6b6cd4233b5623487b9b21b531c4bb` (contenus et exercices masqués compris).
- **PASS compilation** : journal automatique « build OK », 2026-10-07 18:24:27 UTC.
- **NON PROUVÉ** : parcours complets à l'écran sur ordinateur et téléphone, Safari iPhone réel ; configurations individuelles apprenants et contenus générés à l'ouverture non parcourus. Les tests de référence ne certifient pas la justesse juridique des questions.
- **Aucune écriture serveur**, aucun envoi, aucune activation de quiz ; aucune donnée de véritable apprenant utilisée pour un test. Aucun déploiement demandé ni exécuté.

### Procédure pour les prochains changements autorisés

1. Diagnostic en lecture seule, annonce du périmètre et des impacts possibles, accord explicite.
2. Conserver la référence avant modification et les anciens contenus ; ne jamais actualiser une référence uniquement pour faire passer un test.
3. Exécuter les contrôles d'ordre de toutes les formations et les tests ciblés ; comparer les contenus serveur si concernés.
4. Vérifier les écrans concernés avec des données fictives, sans écrire sur un élève réel ; signaler chaque contrôle non exécuté.
5. Ajouter une entrée datée avec fichiers, raison, impacts, preuves et limites ; ne pas déclarer « rien d'autre n'a changé » au-delà des comparaisons réellement exécutées.

## 2026-10-07 18:25 UTC — T3P, accord reçu mais écriture suspendue

- **Demandé/autorisé** : P1 Q29/Q42 et P2 Q36/Q60/Q79 selon formulations approuvées ; réactivation des quiz 1/2 VTC seulement ; textes TPMR/sanctions sans modification.
- **Diagnostic avant écriture** : les quiz partagés sont présents dans les modules 2/10/13/25/32/39. Le déclencheur existant conserve l'activation propre à chaque module. Aucun conflit de contenu entre copies, mais des métadonnées divergent.
- **Blocage hors périmètre** : toute sauvegarde du module 2 déclenche `sync_bilan_from_cours(2,4,false)` ; la propagation vers le module 10 peut déclencher `(10,9,false)`. Simulation en lecture seule de la logique existante : 21 objets questions remplacés côté VTC et 852 côté TAXI avant même les corrections autorisées (différences incluant les métadonnées). La fonction reconstruit les blocs complets et ne limite pas ses effets aux cinq questions.
- **Décision de sécurité** : aucune écriture de contenus ni activation ; aucun déclencheur désactivé/contourné, aucune réparation du mécanisme sans accord supplémentaire. Aucune donnée apprenant écrite ni test réel effectué.
- **Conservation** : les 62 états pédagogiques avant intervention sont conservés en référence temporaire pour comparaison ; aucune donnée personnelle exportée dans le document de questions.
- **Fichiers touchés** : `roadmap.md`, ce journal, mémoire des formulations autorisées ; rapport autonome `Questions-T3P-TPMR-et-sanctions-07-10-2026.md`. Aucun fichier de l'application modifié.
- **Livrable** : questions TPMR, viol et autres sanctions, avec choix et lettres marquées correctes telles qu'enregistrées, sans interprétation juridique.
- **NON PROUVÉ** : corrections et réactivation non exécutées ; affichage après réactivation non testable tant que le blocage demeure. Prochain périmètre à autoriser : empêcher la reconstruction hors périmètre des bilans sans changer les bilans ni les données apprenants.
## 2026-10-07 18:34 UTC — Corrections T3P autorisées et protection des bilans

- **Accord** : protéger contre la reconstruction hors périmètre, appliquer P1 Q29/Q42 et P2 Q36/Q60/Q79, réactiver uniquement les quiz 1/2 du module VTC 2.
- **Pourquoi** : une sauvegarde déclenchait la reconstruction globale des bilans 4/9 ; le partage d'un exercice pouvait aussi remplacer les métadonnées de questions non modifiées.
- **Protection serveur** : migration `0128_protect_bilan_saves_and_shared_question_deltas.sql` ; déclencheur de reconstruction conservé mais sans reconstruction automatique ; propagation des seuls objets questions modifiés lors d'une correction de contenu ; objets inchangés conservés par le garde des éditions manuelles. La fonction explicite de synchronisation reste présente. Aucune suppression ni restauration.
- **Contenus** : cinq questions corrigées ; réponses correctes et identifiants conservés ; seuls les quiz 1/2 de module 2 activés. Les mêmes cinq corrections sont partagées selon les copies existantes dans 10/13/25/32/39, sans réactivation de ces copies. Les questions TPMR/sanctions ne sont pas modifiées.
- **Ordre** : Réglementation 1 → Quiz 1 → Réglementation 2 → Quiz 2, associations par identifiants existantes.
- **Rectification du diagnostic runtime** : les trois appels `loadSyncedVtcBilanFromCours` sont déjà sous `shouldSyncVtcBilanFromCours`, qui retourne toujours `false`. Aucun changement frontend nécessaire ; contrairement au diagnostic précédent, ces appels ne reconstruisent donc pas actuellement l'affichage.
- **PASS isolé** : PGlite, comparaison des 62 modules avec les seuls deltas autorisés ; sauvegarde d'activation seule sans propagation ; test contre le SQL réellement appliqué.
- **PASS serveur** : comparaison JSON intégrale avant/après des 62 modules avec résultat attendu isolé : seuls 2/10/13/25/32/39 changent ; bilans 4/9 et autres contenus, listes masquées, activations des copies strictement inchangés. Sauvegarde module 2 protégée par version et empreinte attendues.
- **Historique** : anciens/nouveaux textes présents dans les journaux serveur `module_admin_audit_log` et `question_change_log`. Le journal QCL enregistre aussi les autres questions lors de la réactivation, sans que leur contenu ait changé (comparaison intégrale effectuée).
- **PASS régression** : 102/102 contrôles existants sur les 15 formations, les séquences et les 68 fichiers pédagogiques. Test de garde runtime/SQL ajouté séparément.
- **Fichiers** : migration 0128 ; types Supabase régénérés automatiquement ; `src/test/t3p-bilan-protection.test.ts` ; ce journal ; `AGENTS.md` ; `roadmap.md` ; archive des définitions antérieures `docs/audits/t3p-functions-before-20261007.json`.
- **Données apprenants** : aucune requête de modification sur notes, réponses, tentatives, snapshots ou acquis ; aucun test avec un élève réel ; aucun mail/SMS/Gemini ; aucun déploiement demandé.
- **NON PROUVÉ** : contrôle complet des parcours à l'écran et Safari iPhone réel ; version publiée et absence de toute écriture indirecte sur les données élèves non mesurées par une empreinte dédiée. Ne pas confondre les contrôles d'ordre par tests avec une visite de chaque écran.

## 2026-10-07 — Réactivation ciblée après l’incident du 28 septembre

- **Accord** : réactiver les copies désactivées par erreur, conserver les anciens quiz du module 13 et le Bilan Français désactivés ; vérifier l’aperçu puis publier.
- **Changement serveur** : 13 réglages d’activation uniquement : module 2 exercices 3/4 ; module 10 exercices 1/2/3/4 ; modules 17 et 23 exercices 3/4 ; modules 25 et 39 exercice 2 ; module 32 exercice 1. Les cinq corrections T3P étaient déjà identiques dans toutes les copies : aucune réécriture supplémentaire.
- **Protection et historique** : transaction REPEATABLE READ avec garde de version ; 13 entrées dans `module_admin_audit_log`, origine `Lovable:accord-explicite-20261007-1840-reactivation-28sept`. Snapshots avant/après conservés dans `/tmp/t3p-approved/` et `/tmp/quiz-reactivation/`.
- **PASS** : 105 contrôles ; comparaison intégrale de 62 états pédagogiques ; empreintes de 20 tables élèves identiques avant/après ; bilans 4/9 et module 13 inchangés. Aucun test sur un véritable apprenant.
- **Ordre** : configurations des 15 formations identiques à la référence ; 62 séquences d’affichage conformes au résultat attendu ; 14 contrôles de succession directe des chapitres T3P/Anglais et de leurs quiz. Exception existante : dans l’Introduction TA (32), aucun chapitre T3P n’existe ; le quiz réactivé reste après « Contact ». Aucun déplacement non autorisé.
- **Aperçu** : composant réel `ModuleDetailView` rendu dans Chromium à `http://localhost:8080` avec états pédagogiques sauvegardés et données élèves fictives/vierges ; modules 2/10/17/23/25/32/39 consultés ; captures conservées dans `/tmp/browser/quiz-reactivation/`. Toutes les requêtes d’écriture bloquées ; aucune erreur JavaScript non interceptée. Les appels de journalisation d’erreur ont été bloqués et les médias externes n’ont pas été chargés : ce contrôle n’est pas une validation réseau complète du site publié.
- **Bilan Français** : désactivé dans la sauvegarde du 28 septembre ; aucune preuve de décision volontaire établie. Inchangé, aucune réactivation.
- **Publication** : non effectuée par l’assistant ; le bouton Publish appartient à l’éditeur Lovable, absent de l’application locale et aucun outil de publication disponible. L’utilisateur doit cliquer Publish / Update. Les activations en base sont déjà enregistrées côté serveur.
- **Fichiers de clôture** : ce journal uniquement ; aucun changement supplémentaire de code, contenu pédagogique ou données élèves.
- **Limites** : parcours complets de toutes les formations à l’écran, téléphone et Safari iPhone réel non prouvés ; publication frontend non confirmée. Vérification serveur récente : aucune activité examen enregistrée dans les 30 dernières minutes, sans garantie sur une activité non encore enregistrée.

## 2026-10-07 (soir) — Corrections autorisées B2, B11, A9 ; listes B11/B12 ; A1 non appliqué

- **Accord** : message de Naoufal GUENICHI, 21 h 50 heure de Paris ; ordre suivi : export, B2, B11, B12, A1, A9.
- **Export manuel préalable** : 23 tables exportées (CSV + empreintes SHA-256), nombre de lignes identique à la base pour chaque table ; archive `sauvegarde-manuelle-eleves-20261007.zip` dans les Files du projet (114 Mo, intégrité vérifiée).
- **B2 sauvegarde** : cause prouvée = dépassement de la limite de calcul / chaîne trop longue ; la sauvegarde s'arrêtait après 6 tables sur 23 et n'avait jamais écrit de marqueur de fin. Nouvelle fonction `sauvegarde-quotidienne-eleves` : paquets de 2 000 lignes triés par clé, état `_etat.json`, chaîne limitée à 40 paquets, tâche de reprise nocturne toutes les 2 min (01h–05h59 UTC), `_termine.json` avec comptage des 23 tables seulement si aucune erreur, sinon `_incomplet.json` + alerte. Rotation 30 jours inchangée (copies de sauvegarde uniquement).
- **B11 CGV** : `CGVAcceptanceForm.tsx` et `CGVReglementForm.tsx` — si l'enregistrement échoue après deux essais, message d'erreur, aucun « CGV signées », parcours bloqué jusqu'au nouvel essai réussi. Liste des élèves sans CGV : `eleves-sans-cgv-20261007.csv` (8 élèves réels ; le chiffre de 84 annoncé plus tôt venait d'une mauvaise table et est faux). Aucun dossier modifié.
- **B12** : 28 références partagées listées ; chaque groupe porte le même titre (même matière). Aucune correction.
- **A1 NON APPLIQUÉ (arrêt)** : les bonnes réponses sont aussi présentes dans les états pédagogiques lisibles par les élèves et dans le code de l'application, et la correction des quiz se fait dans le navigateur. Masquer `quiz_questions` seul ne protégerait pas et casserait la correction. Nécessite un plan dédié (correction côté serveur).
- **A9** : migration `0129_a9_devis_upload_connexion_obligatoire.sql` — règle d'envoi sans connexion retirée ; les 2 fichiers signés existants sont conservés ; la signature publique passe par la fonction serveur `upload-devis-signe`.
- **Contrôles** : 110 tests PASS ; build OK ; comptages des 23 tables élèves comparés à l'export (voir résumé).

## 2026-10-07 22:40 (Paris) — B2 terminé, liste B11 détaillée, plan A1 (non appliqué)
- B2 : découpage plus fin des tables lourdes dans la sauvegarde nocturne (accord explicite). Sauvegarde 2026-10-07 relancée : `_termine.json` écrit à 20:51 UTC, 0 fichier d'erreur, pas de `_incomplet.json` (23/23 tables).
- B11 : lecture seule de la progression des 8 élèves sans CGV ; aucun dossier modifié.
- A1 : plan de correction des quiz par le serveur préparé, rien appliqué.
- Aucune donnée élève modifiée.
