# Refus admin P0520 — 26 octobre 2026

## Cause prouvée / limite de preuve

La sauvegarde n'effectue pas de DELETE/reinsert : `save_module_editor_state` met à jour le JSON complet avec verrou/CAS. Le trigger `garde_retrait_massif_questions` compte les paires exercice/question retirées, seuil manuel 2.

La projection canonique de l'exercice 71 contient **34 questions actives** ; sa copie historique JSON contient **35 questions**, dont 15 absent de la projection. Le module JSON complet contient **964 questions**, 19 exercices. La partie 1 conserve 64 questions.

Le défaut exact du merge pré-sauvegarde : `appliquerSeulementQuestionsModifiees` réinterprétait `deletedQuestionIds` hérité comme suppression actuelle de toute question serveur absente de la projection locale, même si l'admin ne modifiait qu'une proposition. Les marqueurs réellement lus du serveur et les absences canoniques se croisent exactement sur **sept** paires :

| Exercice | IDs présents en JSON mais absents de la projection et marqués supprimés | Nombre |
|---|---|---:|
| 73 | 6 | 1 |
| 74 | 14, 15, 16, 18, 19 | 5 |
| 76 | 28 | 1 |

71:15 est absent de la projection, mais pas dans les marqueurs de suppression lus (900001/900002) : il ne contribue pas aux sept. Le refus P0520 est donc justifié et protège des données que l'utilisateur ne voulait pas retirer.

**Preuve :** logique exacte reproduite avec ces sept paires et données fictives ; inventaire serveur concordant. Le corps HTTP du clic original n'est pas disponible dans la télémétrie : corrélation avec ce clic précis **non prouvée**, sans prétendre avoir intercepté son lot.

## Correctif réellement réalisé, non publié

- Repartir d'une lecture complète réussie du JSON serveur, remplacer seulement les questions explicitement modifiées par identifiant stable. Préserver intégralement les autres questions, même invisibles dans la projection.
- Les anciennes tombstones ne sont plus des commandes. Une suppression n'est transmise que si demandée explicitement dans l'éditeur actuellement monté, jamais par omission ou ancien marqueur. Aucune suppression réalisée pendant cette réparation.
- Les questions historiques JSON-only conservées ne deviennent pas des upserts canoniques implicites. Seuls les IDs explicitement modifiés/ajoutés passent dans les actions canoniques existantes ; conserver la position canonique d'une question existante, sans renumérotation.
- Erreur de lecture pré-sauvegarde ⇒ arrêt sans lot partiel. Erreur de relecture de confirmation ⇒ pas de confirmation de réussite.
- RPC, contraintes, triggers, CAS et seuil P0520 inchangés. Aucun SQL/schema/migration déployé.

## Fichiers

Code : `src/components/cours-en-ligne/ModuleDetailView.tsx`, `src/lib/adminQuestionSaveIntent.ts`.

Tests : `src/test/admin-question-save-intent.test.ts`, `src/test/admin_question_save_sql_contract.py`.

Règles/journal : `AGENTS.md`, `roadmap.md`, ce rapport ; mémoire de contrainte sans suppression implicite.

## Vérifications

- **167/167 tests Vitest PASS**, six fichiers : huit cas d'intention de sauvegarde, réouverture JSON, choix correct D « 1,30 € », explication, absence d'autres changements, tombstones historiques, absence serveur, identifiant inconnu, suppression explicitement demandée ; conflits canoniques, source unique, absence de réinjection, Partie 1 et 91 cas d'ordre des formations.
- **3/3 contrôles PostgreSQL jetable PASS** : sept retraits ⇒ P0520 et transaction inchangée ; modification d'une réponse/explication ⇒ relecture par nouvelle connexion avec IDs et Partie 1 intacts ; trois retraits encore refusés après sauvegarde, maximum 2 inchangé. Fonction SQL testée identique à la définition Cloud actuelle (comparaison intégrale, hors point-virgule terminal). Table minimale isolée : pas de reconstitution de tout le catalogue/RLS/RPC, qui ne sont pas modifiés.
- **PASS navigateur isolé** : véritable fonction importée depuis Vite, JSON fictif, choix/explication relus et ID historique conservé. Aucun compte apprenant ni sauvegarde Cloud.
- **Compilation automatique OK** (11:24:29 UTC). Typecheck/build manuel non exécutés : interdits par l'environnement.
- **Avant/après module 10 PASS**, JSON complet strictement identique, 964 questions et ordre/IDs inchangés. Empreinte module 10 `46b211c8cbfc63a9019d663225667b16`. Partie 1 64 et Partie 2 34 actives, mêmes listes ordonnées d'IDs après. Inventaires détaillés capturés en lecture seule sous `/tmp/admin-save-audit`.
- **Autres modules :** aucune écriture par l'agent ; empreinte globale de départ non restituée dans le premier SELECT multiple par l'outil, donc égalité globale avant/après NON PROUVÉE. Fin : 62 modules, empreinte `af39329ba1e847cb755b52561a4b94a6` ; ne pas la comparer à une valeur prise un autre jour.
- **Fermeture/réouverture complète du vrai éditeur avec sauvegarde Cloud : NON PROUVÉE**, car interdit de modifier les questions réelles et aucune publication autorisée. Les tests couvrent le contrat ciblé et la relecture SQL isolée, pas toute la navigation authentifiée.

Aucune question réelle, proposition, corrigé, réponse élève, note, validation, signature, durée ou historique modifié. Aucun envoi, appel IA ni publication.