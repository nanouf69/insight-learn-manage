# Journal des modifications

Entrées chronologiques conservées : ajouter une nouvelle entrée, ne pas remplacer les précédentes.
Ce journal commence le 7 octobre 2026 ; il ne reconstitue pas les interventions antérieures.

## 2026-10-09 16:11 UTC — Historique de M. Majsak depuis le 5 octobre
- Accord : plan approuvé, affichage initial depuis le 05/10/2026 inclus pour ce dossier uniquement ; « Tout l'historique » conservé, aucune publication.
- Diagnostic et contrôle après en lecture seule : 26 connexions conservées, 15 depuis le 5 octobre (minuit Paris). Aucun enregistrement modifié, aucune date d'accès changée, aucun envoi.
- Fichiers : ApprenantActivityReport.tsx, src/lib/reports/history-defaults.ts, src/test/history-defaults.test.ts, AGENTS.md, roadmap.md, ce journal.
- Préférence par identifiant permanent ; ouverture du dossier verrouillé ou sélection dans le rapport initialise les dates personnalisées. Borne timestamp = minuit local ; dates d'émargement inchangées. Aucun changement du calcul global des heures ni des statuts.
- PASS réellement exécutés : 109 tests (9 filtre/date, 91 ordre des 15 formations et empreintes pédagogiques, 9 cohérence des heures). Compilation automatique : build OK 16:14:07 UTC.
- PASS Chromium local avec données entièrement fictives, requêtes serveur interceptées : 02/10 absent initialement, 06/10 visible, 02/10 réapparaît avec Tout l'historique ; impression contrôlée par interception du HTML, période 05/10 et mêmes lignes ; aucune erreur JavaScript. Captures vérifiées. Aucun compte réel utilisé.
- NON PROUVÉ : appareil réel/mobile et site publié ; aucune publication demandée ni réalisée.

## 2026-10-09 15:23 UTC — Heures réellement faites et cohérence élève/admin
- Demande explicite : afficher ce qui est réellement fait et assurer la cohérence des comptes élève et administrateur.
- Lecture seule préalable : 239 dossiers suivis ; contrats personnalisés différents du standard, types manquants, heures réalisées plafonnées dans le CRM et pourcentage élève limité à 99% à cause de modules restants.
- Fichiers : src/lib/elearningRequiredHours.ts, src/hooks/useStudentEffectiveHours.ts, src/hooks/useApprenantTauxRealisation.ts, src/components/cours-en-ligne/StudentHoursTracker.tsx, src/components/crm/ApprenantDetailPage.tsx, src/components/examens/TauxElearningCell.tsx, src/components/cours-en-ligne/ApprenantActivityReport.tsx, src/test/elearning-required-hours.test.ts, src/test/presentiel-taux-hook.test.tsx, src/test/examen-elearning-relance.test.tsx, AGENTS.md, roadmap.md, ce journal.
- Compteur élève adapté à la même requête de lecture que le CRM : même contrat, preuves, date de fin et taux. Politique de lecture du propre dossier élève vérifiée en base. Heures réalisées non plafonnées au volume requis ; affichage commun en heures/minutes. Taux d'heures limité à 100%, distinct des modules ; mention « Modules à valider » conservée, aucune validation automatique.
- Rapports : heures réelles et référence contractuelle partagée ; repli formation connue uniquement si type absent. Aucun volume TAXI continue inventé, aucun contrat corrigé.
- PASS exécutés : 147 tests fictifs (7 fichiers) : parité élève/CRM, dépassement VA 35h/7h, contrats VTC 66/90 h, 100% heures sans formation terminée, présentiel, 15 parcours et empreintes pédagogiques. Compilation automatique OK. Vérification authentifiée à l'écran NON PROUVÉE (compte technique soumis à approbation). Aucun compte réel utilisé, aucune écriture serveur, aucun envoi ni publication.

## 2026-10-09 — Taux e-learning sans volume contractuel
- Accord explicite : « Oui, corriger l’affichage ». Diagnostic lecture seule : fiche VA e-learning sans heures_elearning/heures_totales/heures_presentiel ; espace élève utilise déjà 7h, CRM calculait 0h et donc 0%. Dix lignes completed et une in_progress : aucune validation automatique.
- Fichiers : src/lib/elearningRequiredHours.ts, src/hooks/useStudentEffectiveHours.ts, src/hooks/useApprenantTauxRealisation.ts, src/test/elearning-required-hours.test.ts, src/test/presentiel-taux-hook.test.tsx, AGENTS.md, roadmap.md, ce journal.
- Les constantes existantes de l'espace élève deviennent une source partagée. CRM : volume explicite prioritaire, sinon déduction total-présentiel, sinon volume existant du parcours connu. Aucun changement de durée de connexion, module, contrat, règle d'accès ou donnée serveur. Valeurs inconnues/présentiel seul restent sans volume e-learning inventé.
- 136 tests isolés PASS : neuf règles de volume, cinq tests de fiche simulée (VA atteint 100% des heures sans valider de module), régression présentiel et relance, 91 contrôles des 15 formations et empreintes pédagogiques + 11 tests d'ordre cours/quiz. Compilation automatique OK.
- Vérification authentifiée de la fiche sur appareil réel NON PROUVÉE : compte technique soumis à approbation. Aucun test sur un compte réel, aucun e-mail, aucune publication.

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

## 2026-10-08 — Corrections de l'audit (accord explicite du propriétaire)
- SMS automatiques : jeton de service transmis par auto-send-pratique-booking et accepté (apikey) par send-sms-ovh. Cause prouvée : 17 refus « anonyme/refuse_auth » du 28/09 au 06/10.
- Accès 06:00 : dossier en réinscription bloqué = « ignoré (décision Admin requise) », plus compté comme échec ni alerte e-mail ; aucun rattachement, compte bloqué intact.
- Adresses invalides : envoi ignoré avant le fournisseur avec motif ADRESSE_INVALIDE (_shared/email-valide.ts) ; aucune fiche modifiée.
- Contrôle de présence / tableaux bancaires : plus d'appel sans session (cause : appels anonymes, 42501). Migration 0130 : 7 politiques admin limitées aux utilisateurs connectés (restriction admin inchangée).
- Écran qui se casse (insertBefore / « object can not be found ») : protection DOM ajoutée dans main.tsx.
- Liens obsolètes /cours-en-ligne et /examens redirigés. Avertissements : Badge et Toaster acceptent une ref.
- Empreintes avant/après identiques : 62 modules, 2 251 questions, 57 versions d'examen, 4 001 QRC, 2 025 factures ; comptes réponses 8 513, notes 5 078, élèves 3 331.

## 2026-10-08 (14:20 UTC) — Validation finale
- Tests : environnement « canvas » réparé pour les tests seulement (src/test/canvas-absent.cjs, vitest.config.ts) ; 142 fichiers / 1 511 tests passent. Test IA QRC mis à jour pour la règle de rattrapage déjà en place.
- Doublons de listes : cause = mêmes dates proposées dans les groupes TAXI et TA (liste des dates de formation) ; non modifié pour ne pas changer les valeurs enregistrées.
- Parcours authentifiés non testés : connexion du compte technique refusée sans accord (approbation indisponible).
- Empreintes contenus/données identiques avant/après.

## 2026-10-08 — Taux e-learning et relance individuelle dans Examens
- Accord : demande explicite du propriétaire, colonne « Taux e-learning » et mail sous le taux.
- Fichiers : ExamenReussitePage.tsx, nouveau TauxElearningCell.tsx, examenElearningRelance.ts, examen-elearning-relance.test.tsx ; roadmap et AGENTS mis à jour.
- Affichage : pourcentage et heures issus du hook CRM existant, uniquement pour les parcours e-learning ; heures contractuelles absentes signalées séparément.
- Mail : préparation individuelle modifiable, envoi uniquement après confirmation ; HTML échappé, adresse invalide désactivée, refus et doublon serveur distingués du succès. Message conservant les heures/modules après réussite et le risque de sanction conditionnel selon le financement.
- Contrôles exécutés : 113/113 tests passent (9 nouveaux), tous les envois simulés ; références des 15 parcours, quatre séquences cours/quiz et empreintes des 68 fichiers pédagogiques vérifiées.
- Aucune écriture de données ni envoi réel exécuté, aucun backend modifié, aucune publication. Aucune nouvelle comparaison de base effectuée dans cette passe frontend ; contrôle navigateur authentifié et livraison réelle non exécutés.

## 08/10/2026 — Livres de formation à la place des fiches de synthèse
- Modules Fiches Révisions 70 (VTC), 71 (TAXI), 72 (TA), 73 (VA) : les liens « Fiche Synthèse » pointent vers Livre_VTC/TAXI/TA/VA_FINAL.pdf (stockage durable du projet, fichiers identiques octet par octet aux pièces jointes).
- Pourquoi : demande de naoufal guenichi. Identifiants des éléments conservés, Définitions/Bilan QRC inchangés, anciennes fiches conservées dans le stockage, aucune donnée élève touchée.

## 08/10/2026 — Semaine d'entrée dans la convocation TA
- Demande : naoufal guenichi — à côté des horaires 8h45-12h / 13h-16h, afficher toujours la semaine d'entrée en formation.
- Modèle email_templates `convocation-ta` : « Horaires de la première semaine ({{semaine_entree}}) : de 8h45 à 12h et de 13h à 16h. » — sauvegarde avant modification : docs/backups/convocation-ta-avant-semaine-entree-2026-10-08.html.
- SessionDetail.tsx : nouvelle variable {{semaine_entree}} = du jour de début au vendredi de la même semaine (bornée par date_fin) ; ajoutée à la liste des variables affichée dans l'éditeur.
- Vérification : modèle en base relu après écriture ; calcul testé (26/10 → « du 26 octobre au 30 octobre 2026 » ; début en cours de semaine borné au vendredi ; fin de session plus courte bornée). Aucune autre phrase modifiée, aucune donnée élève touchée, frontend non publié.

## 09/10/2026 — Note générale pour la lettre CMA
- Nouvelle colonne additive planning_pratique_config.note_lettre_cma (texte, nullable) — migration 0132, aucune donnée touchée.
- src/components/examens/ExamenReussitePage.tsx : champ « Note pour la lettre à la CMA » dans la carte Lettre CMA ; enregistré par session d'examen + période pratique (mêmes garde-fous que le planning : écriture refusée tant que la clé n'est pas chargée) ; note incluse dans la lettre générée (aperçu, impression, e-mail CMA) sous la ligne « Important », jamais si vide.
- Notes par candidat inchangées ; rien publié.

## 09/10/2026 — Retrait réversible des candidats sans résultat de la lettre CMA
- Demande : naoufal guenichi — pouvoir retirer les élèves sans résultat d'examen pour débloquer l'envoi du mail CMA.
- Nouvelle colonne additive planning_pratique_config.lettre_exclus_ids (texte[], nullable) — migration 0133, aucune donnée touchée.
- src/components/examens/ExamenReussitePage.tsx : bouton « Retirer de la lettre » sur chaque candidat sans résultat dans le bandeau rouge ; les candidats retirés apparaissent dans un encadré gris avec bouton « Rétablir » ; le blocage d'envoi/impression ne tient compte que des candidats non retirés ; liste enregistrée par session d'examen + période pratique (mêmes garde-fous que le planning).
- Aucune donnée élève supprimée ni modifiée : l'exclusion est une simple liste d'identifiants dans la configuration, réversible en un clic.
- Vérifié à l'écran (session injectée) : 4 boutons présents, retrait 4→3 + apparition « Rétablir », rétablissement 3→4, base relue vide après le test. Rien publié.

## 09/10/2026 — Feuilles d'émargement générées automatiquement pour chaque session
- Demande : naoufal guenichi — « à chaque session il faut une feuille d'émargement » ; cas déclencheur : la feuille du jour ne s'affichait pas pour M. SILLA (anciennes soirées non signées passaient avant).
- Base (migration 0134) : fonction serveur `generer_emargements_session(session_id)` + déclencheurs sur `session_apprenants` (inscription), `sessions` (dates/créneaux) et `reservations_pratique` (jour pratique réservé). Création strictement additive (ON CONFLICT DO NOTHING) : une ligne par élève inscrit × jour × créneau, signature vide ; jamais d'écrasement ni de suppression.
- Jours : lun–ven entre début et fin de session ; cours du soir = soir_1 + soir_2, journée = matin + après-midi ; sessions pratiques = uniquement les jours réservés par l'élève. Élèves annulés, supprimés ou en liste d'attente exclus.
- Rétroactif (sessions en cours/à venir) : 312 feuilles « à signer » créées ; contrôle avant/après : 2 391 feuilles signées intactes, 0 modifiée, 0 supprimée.
- Frontend `src/pages/CoursPublic.tsx` : la feuille du jour est désormais proposée en priorité ; les créneaux passés non signés restent demandés ensuite (rien n'est retiré).
- Frontend non publié.

## 2026-10-09 — Accès automatiques à chaque modification de fiche
- Migration 0135 : déclencheur trg_zz_acces_auto_apres_modification sur apprenants (sans compte, période d’accès en cours) → auto-send-credentials ciblé ; non bloquant.
- ApprenantEditForm.tsx : appel navigateur retiré (évite les doublons), message informatif.

## 2026-10-09 — Sécurité lecture questions (migration 0136)
- quiz_questions, quiz_question_sets, quiz_question_bindings, examens_blancs_parcours : lecture réservée admin/modérateur + apprenant inscrit non supprimé (fonction peut_lire_contenu_pedagogique). Aucune donnée modifiée. Tests : VTC/TAXI/VA/TA/admin = lecture complète ; utilisateur inconnu = 0 ligne.

## 2026-10-09 — Horaires du planning sur la feuille pratique signée
- Demande : afficher sur la feuille individuelle les horaires du planning, notamment l'après-midi de M. SILLA.
- DocumentsCompletes.tsx : lecture des créneaux pratiques de l'apprenant par le circuit existant ; ajout d'horaires à l'affichage et aux données du PDF uniquement, correspondance exacte date + demi-journée. Aucun horaire pratique ajouté aux signatures de soirée.
- pratiqueDocumentHours.ts : résolution pure pour l'affichage ; document-individuel.ts : libellé « Horaires de formation » dans le PDF. Inscription, planning, signatures et anciens fichiers non modifiés ; aucune écriture serveur, aucun envoi, aucune publication.
- Tests réellement exécutés : 15/15 PASS (6 horaires/PDF, 4 notes, 5 réservation sans préalable) ; PDF fictif généré et contenu contrôlé, VTC/TAXI matin/après-midi, horaires personnalisés, refus de correspondance soirée/autre date et non-mutation. Compilation automatique OK après le premier correctif.
- Vérification sur compte élève technique et affichage sur appareil réel : NON PROUVÉS, connexion soumise à approbation ; aucun compte réel utilisé. Contenus pédagogiques et ordre des modules hors périmètre, non modifiés.

## 2026-10-09 — Pratique signée dans le taux présentiel
- Demande : les heures pratiques sont toujours du présentiel et doivent alimenter le bloc présentiel quand les créneaux sont signés.
- Cause : taux CRM plafonné à zéro lorsque heures_presentiel = 0 ; lectures sans preuve de signature, devenues incorrectes avec les feuilles vierges créées automatiquement.
- presentielHours.ts : preuve de signature non vide obligatoire, absences/feuilles masquées exclues, aucun double comptage date/créneau ; soirée théorique conservée même le jour de la pratique. Cible d'affichage = contrat si renseigné, sinon heures planifiées (au moins heures signées), sans modifier le contrat.
- useApprenantTauxRealisation.ts : signatures lues, heures pratiques conservées même sans contrat, actualisation par événement d'émargement. ControleQualiteTab.tsx, build-dossier-apprenant.ts et ApprenantActivityReport.tsx : lectures de signatures cohérentes ; releve-connexions.ts : aucune heure présentielle prouvée ramenée à zéro. pratiqueSlots.ts : sessions pratiques sans réservation utilisent aussi les créneaux explicites du planning.
- Aucune donnée serveur modifiée, aucun module pédagogique validé, aucun e-mail ni publication ; calcul e-learning inchangé.
- Tests : 41/41 PASS sur données fictives (fiche et événements 0→50→100 %, VTC/TAXI, cas affichage VA/TA, feuilles vierges, absence, horaires personnalisés, doublons, soirées, PDF horaires, relance e-learning et ordre cours/quiz). Compilation automatique OK. Vérification sur appareil réel avec compte technique : NON PROUVÉE, nécessite approbation de connexion ; aucun compte réel utilisé.


## 2026-10-09 16:16 UTC — Heures de M. Majsak depuis le 6 octobre (plan approuvé)
- Fenêtre de calcul uniquement pour l’identifiant permanent c048754d-9045-4ab6-b89f-a5ab26de314c : 06/10/2026 minuit Paris = 05/10/2026 22:00 UTC. Filtre historique depuis le 5 octobre inchangé, activités antérieures conservées.
- Fichiers : learning-hours-window.ts, useApprenantTauxRealisation.ts, ApprenantActivityReport.tsx, build-dossier-apprenant.ts, ControleQualiteTab.tsx, rapport-activite-html.ts, releve-connexions.ts, tests learning-hours-window/learning-hours-export/presentiel-taux-hook, AGENTS.md et roadmap.md.
- Même borne dans calcul élève/admin/rapports/PDF ; connexion chevauchante ne compte que sa partie postérieure avec preuve pédagogique dans cette fenêtre, plafond 7h calculé depuis le début original. Présentiel, objectifs contractuels, accès, notes et validations inchangés.
- PASS réellement exécutés : 151 tests sur 7 fichiers, dont 102 ordre des formations/cours/quiz, bornes Paris, autres dossiers, parité élève/admin et export HTML. Compilation automatique : build OK 16:21:13 UTC.
- PASS Chromium local, toutes données entièrement fictives et appels serveur interceptés : 06/10 compte 1h, 02/10 exclu du total puis redevient visible avec Tout l’historique sans augmenter le total ; impression 1h, aucune erreur JavaScript, captures vérifiées. Premiers essais du script incomplets corrigés avant cette vérification finale.
- Contrôle serveur en lecture seule avant/après : 26 connexions, empreinte identique a2ce802a227e9b39ec976b6314b51d03. Aucune écriture serveur, aucun compte réel utilisé, aucun envoi, aucune publication.
- NON PROUVÉS : appareil réel/mobile, site publié et téléchargement réel de l’archive complète ; contrôles des règles d’export exécutés sur données fictives.

## 2026-10-09 16:28 UTC — Blocage de la vue apprenant (plan approuvé)
- Diagnostic lecture seule : erreur `cannot add postgres_changes callbacks after subscribe()` dans useApprenantTauxRealisation ; la fiche et StudentHoursTracker réutilisaient un canal déjà abonné pour le même apprenant, également exposé aux doubles montages React.
- Correction : nom de canal unique par exécution d’effet (UUID), fermeture du seul canal appartenant à cet effet ; aucune modification des calculs d’heures, contrats, réponses, notes, signatures, accès ou contenus pédagogiques.
- Fichiers : src/hooks/useApprenantTauxRealisation.ts, src/test/presentiel-taux-hook.test.tsx, AGENTS.md, roadmap.md et ce journal.
- PASS exécutés : 157/157 tests, 7 fichiers. Le faux client reproduit la réutilisation réelle des canaux et leur retrait asynchrone ; deux vues simultanées sous StrictMode, fermeture/réouverture, huit canaux distincts correctement retirés et événement de signature reflété dans les deux vues. Contrôles des heures depuis le 6 octobre, présentiel, verrou lecture seule, ordre des 15 parcours et empreintes pédagogiques.
- Compilation automatique OK 16:28:14 UTC. Aucune écriture serveur, aucun compte réel utilisé, aucun envoi ni publication.
- NON PROUVÉS : vue complète authentifiée dans le navigateur, appareil réel/mobile et site publié. La reproduction et la vérification du défaut sont exécutées dans les tests React isolés, pas sur un élève réel.

## 2026-10-10 06:30 UTC — Bilan du 10/10
- Migration 0137 : trigger trg_regulariser_alerte_exam_result_missing (annotation lu + preuve résultat_id, aucune suppression).
- ExamensBlancsEditor : lecture sans session = refus propre, plus de fausse alerte « Aucune version active ».
- ModuleDetailView (CanonicalQuiz) : JWT expiré → un renouvellement + une relecture, sans boucle.
- Diagnostics sans écriture : sauvegarde 05:51 renvoyée 05:52:51 ; 3 alertes EB2 déjà notées (<1 s) ; Issam Ouerfelli bloqué volontairement ; 10 suppressions = remplacements par l'élève.

## 2026-10-10 07:12 UTC — Déconnexions M. BOUDJORF DOUBAA
Cause : renouvellements de connexion forcés en rafale (6 en 1 s, 07:07:53) depuis les examens blancs, qui invalident la session sur mobile. Correction : ExamenBlancsListe.tsx et ExamensBlancsPage.tsx passent par assurerSessionFraiche (un seul renouvellement, seulement si proche de l expiration). Aucune donnée modifiée. Non publié.

## 2026-10-10 08:00 UTC — Tests non-régression émargements pratique
- 10/10 PASS (transaction annulée, données fictives). Signatures 2399, empreinte identique avant/après.
- Anomalie signalée, non modifiée : 14 feuilles du 17/11 (7 élèves inscrits seulement à la session d’examen), créées le 09/10 11:23 par l’ancienne règle.

## 2026-10-10 08:05 UTC — Pratique VTC/TAXI : après-midi strict 13h-16h
- Affichage signature élève, liste des feuilles, feuille téléchargée, PDF pratique : 9h-12h / 13h-16h (théorie inchangée).
- Planning pratique : option 13h-17h retirée ; migration 0139 trigger trg_a_planning_pratique_horaires_stricts (jours nouveaux/modifiés normalisés, saisie d’origine conservée dans *_saisi_origine).
- confirm-reservation-pratique : nouvelles sessions pratiques heure_fin 16:00.
- Signatures 2399 inchangées ; 2 jours historiques d’avril 2026 (13h-17h30) conservés en base, imprimés 13h-16h.
- Tests : 4/4 nouveaux + 1371 PASS ; test serveur annulé PASS.

## 2026-10-10 08:12 UTC — Réponses non envoyées (M. BOUDJORF DOUBAA, module 8 « Quizz Ville De Lyon »)
- Constat lecture seule : 23/99 réponses enregistrées et journalisées (25 écritures 07:49–07:52:55), plus aucune écriture ensuite ; 08:04:54 validation échouée « délai dépassé 20 s pendant envoi » (Android).
- Cause : la file d’envoi attendait sans limite le renouvellement de connexion (verrou de session bloqué) et l’envoi réseau ; la file restait figée, réponses gardées seulement sur le téléphone.
- Correction : sessionExpiree.ts (renouvellement abandonné après 8 s, jeton actuel conservé) ; answerPersistence.ts (envoi abandonné après 15 s puis réessai, rien retiré de la file).
- Tests : answer-queue-no-freeze.test.ts 4/4 + suite complète. Aucune donnée réelle modifiée.

## 2026-10-10 08:18 UTC — Faux échec « serveur ne valide pas » sur quiz déjà validés (dont Ville de Lyon)
- Cause prouvée : élève refaisant un quiz déjà validé (status submitted) sous l’identifiant validé ; le serveur fige cette ligne (réponses journalisées, non appliquées) ; la relecture différait → message d’échec. 9 élèves sur 3 jours (+ M. Boudjorf, cause distincte : file d’envoi bloquée).
- Correction ModuleDetailView.tsx : quiz validé ⇒ sauvegardes sous module_X_revision_exo_Y ; à la validation, relecture du statut serveur et bascule en révision. Ligne validée, note et module jamais touchés.
- Tests : quiz-deja-valide-revision.test.ts + suite complète. Aucune donnée réelle modifiée.

## 10/10/2026 — Tablettes partagées (quiz Ville de Lyon)
- Contrôle : file locale des réponses rattachée à l élève (apprenant + compte) et au quiz ; jamais envoyée ni montrée sous un autre compte ; jamais vidée (déconnexion, écran de secours).
- Ajout test src/test/tablette-partagee-file-reponses.test.ts (2 PASS) ; aucune modification du code ni des données.

## 10/10/2026 — Régression tablette partagée (changement d élève pendant un envoi)
- Cause : commit 22c0a5563 (29/09) — renouvellement de connexion avant chaque envoi ; le jeton obtenu pouvait être celui de l élève précédent et remplacer celui du nouvel élève, sans revérifier la propriété.
- Correction : answerPersistence.ts — jeton gardé seulement s il appartient au compte toujours connecté ; propriété revérifiée avant envoi ; sinon réessai, rien retiré.
- Test src/test/tablette-changement-eleve-pendant-envoi.test.ts : FAIL avant, PASS après ; suite complète 1600 PASS.

## 10/10/2026 — Analyse « serveur ne valide pas » quiz Ville de Lyon (lecture seule)
- Module 8 : 3 élèves (BOUDJORF 10/10 envoi bloqué ; BAH 10/10 et ABRAR 09/10 relecture sur quiz déjà validé). Message introduit par commits 0d0753f50/7e761d1f4 (25-26/09), premiers journaux le 27/09. Aucune donnée modifiée.
