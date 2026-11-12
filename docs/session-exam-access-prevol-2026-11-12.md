# Prévol fermeture unitaire EB — 12 novembre 2026

## Verdict : NO-GO installation du candidat actuel

Le blocage visible est réel : les deux commandes serveur, le journal et les trois gardes du candidat sont absents. Le frontend public sait déjà traiter une seule session ; publier l’aperçu ne résoudrait pas l’absence serveur.

Deux défauts supplémentaires du candidat sont reproduits sur PostgreSQL jetable :

1. **Première réponse ancienne / Edge sans chronomètre** : `persist_answer_batch_v2` et `persist_answer_batch_v3` peuvent insérer une première ligne `reponses_apprenants`. Le candidat ne garde pas cette frontière. L’insertion exacte réussit malgré une fermeture fictive. Il ne faut pas confondre le blocage du chronomètre avec une interdiction serveur complète de commencer/répondre.
2. **Import d’une copie historique remise** : `core_import_passage_finalise` insère réellement une tentative `en_cours` munie de `source_historique.result_id`, puis la termine dans la même transaction. L’exception du candidat exige au contraire `NEW.etat <> 'en_cours'`. La forme réellement insérée est donc refusée après fermeture. Retirer simplement la condition serait dangereux : une provenance JSON déclarative ne doit pas autoriser un nouveau départ élève.

Ces échecs sont conservés comme tests `expectedFailure`, explicitement **FAIL pour les garanties concernées**, et non présentés comme protections PASS. Aucune installation n’est prête à approuver aujourd’hui.

## Production : SELECT uniquement

- Session retrouvée exactement : **Session VTC et TAXI - Du 11 au 24 janvier 2027**, ID `f340ce39-0fb2-420e-9f85-b2762441df08`, `type_session=theorique`, `types_apprenant={VTC,TAXI}`, `statut=planifiee`, début `2027-01-11`, fin `2027-01-24`. Deux inscriptions, zéro en liste d’attente. C’est une session **future**, pas « en cours » au 12/11. Aucun dossier individuel n’a été consulté pour ce prévol.
- Catalogue : 24 identifiants exacts ; EB1–EB6 → module 35, EB1–EB6-TAXI → 36, eb1–eb6-ta → 37, eb1–eb6-va → 38. La session est compatible avec les variantes VTC et TAXI. **L’EB de la capture reste inconnu : aucune cible n’est choisie.**
- `admin_session_exam_access_context(uuid)` : absent.
- `admin_set_session_exam_access(uuid,uuid,text,boolean,uuid,text)` : absent.
- `session_exam_access_events` : absent ; aucun `session_exam_%` trigger installé.
- Impossible d’affirmer « ouvert » ou « fermé » : aucun état manuel installé. L’absence de règle conserve le comportement courant.

### Signatures et compatibilité

| Fonction existante | Retour | Frontière réelle |
|---|---|---|
| `core_start_attempt(uuid,uuid,text,text,boolean)` | `exam_attempts_v2` | INSERT V2 seulement après recherche/rejeu de copie existante |
| `start_exam_subject_retake(uuid,uuid,text,text,text,uuid)` | `exam_subject_retakes` | nouveau V2 éventuel, reçu, réponse, chronomètre dans une transaction |
| `start_or_get_exam_timer(uuid,text,integer,integer)` | table chrono/heure serveur/temps restant | INSERT ON CONFLICT, même à la reprise |
| `start_or_get_exam_timer(uuid,text,integer)` | même table | délègue à la précédente, tentative maximale existante |
| `core_import_passage_finalise(uuid)` | jsonb | INSERT historique en_cours puis finalisation |
| `canonical_start_exam_attempt(text,text,integer)` | jsonb | autre table, `canonical_exam_attempts`, sans garde candidat |

Colonnes utilisées présentes avec les types attendus : UUID apprenant/session/attempt, text exam/exercice, integer tentative/modules, jsonb snapshot, boolean liste_attente. Index unique chrono `(apprenant_id, exercice_id, tentative)` présent ; index reçus identités/source présents. Aucun remplacement de fonction de démarrage n’est prévu par le candidat.

Le canal canonique est **inactif et non appelé** dans le code applicatif lu : flag `PILOT_CANONICAL_TEST=false`, zéro tentative et zéro usage canonique ; aucune référence d’appel hors types générés. Ce n’est pas un chemin EB actif démontré. Néanmoins la fonction existe, est exécutable et son INSERT n’est pas couvert : sa restriction aux essais fictifs ou sa garde doit être explicitement décidée/prouvée avant de promettre une couverture de tout canal serveur. Ne pas y deviner un UUID depuis `apprenant_ref` text.

### Droits

- `has_role(uuid,app_role)` : SECURITY DEFINER, chemin public ; EXECUTE authenticated/service_role, pas anon/PUBLIC.
- Retake et timer 3 arguments : authenticated/service_role autorisés, contrôle propriétaire au serveur. Timer 4 arguments et core_start ont encore EXECUTE PUBLIC/anon, mais le corps vérifie propriétaire/admin. Ce prévol ne change aucun droit existant.
- Tables tentatives/chronos/reçus/sessions : RLS active ; chrono SELECT propriétaire/admin ; reçus SELECT propriétaire/admin ; V2 INSERT/UPDATE propriétaire/admin. Pas de politique d’écriture directe chrono/reçus pour apprenant dans le catalogue lu.
- Candidat : journal SELECT authenticated avec politique admin, ALL service_role ; aucune politique INSERT utilisateur ; mutation uniquement via fonction admin. Helpers privés révoqués PUBLIC/anon/authenticated. Auteur, CAS, reçu et relecture correspondent au transport existant.
- Aucun appel à une RPC mutatrice en production, même pour « tester » un refus.

## Front public sans compte

GET `https://gestion.ftransport.fr` : HTTP 200. HTML : commit `e2fa69ca50e9db04a9e6eb61ea4e2f25d2c53ee8`, asset `/assets/index-qnEtuiVp.js`, également HTTP 200.

Le bundle contient les deux RPC attendues et le branchement `une session → SessionExamAccess`, avec les boutons « Ouvrir cette session » / « Fermer cette session » ; la commande groupée désactivée est dans l’autre branche. La capture n’est donc pas expliquée par un frontend public exclusivement groupé. Aucun écran admin authentifié n’a été ouvert : **affichage de la session dans le navigateur réel non vérifié**.

## Chemins audités et preuves exécutées

| Chemin | Résultat isolé | Limite |
|---|---|---|
| Nouveau V2, vraie fonction courante | fermeture → P0551 ; aucune opération de start persistée | effets extérieurs non reproduits |
| Rejeu / reprise V2 | même attempt_id et snapshot après fermeture | aucun compte réel |
| Ancien timer, deux surcharges réelles | nouveau timer refusé ; reprise même ligne inchangée | premiers envois Edge sans timer non gardés |
| Repassage ciblé, vraie fonction courante | refus ; autorisation intacte, zéro reçu ; après ouverture fictive, rejeu exact après fermeture | autres combinaisons TA/VA pas exécutées bout-en-bout |
| Sauvegarde/finalisation V2 après fermeture | réussite, tentative terminée | QRC/IA externes non testées |
| Inscription croisée / e-learning / attente | fermeture applicable prioritaire ; hors filière, attente et e-learning préservés | règle de mode inconnu permissive existante conservée |
| Concurrence fermeture/démarrage | verrou partagé retient fermeture jusqu’au commit ; CAS concurrent un seul gagnant | charge production non mesurée |
| Première réponse Edge sans timer | **FAIL : INSERT accepté** | frontière exacte exécutée, pas requête HTTP Edge fictive complète |
| Import historique réel en_cours | **FAIL : INSERT refusé** | forme exacte exécutée, pas import complet avec QRC |
| Pilote canonique | non couvert, inactif et vide | aucune activation implicite autorisée |

- Baseline : **16 contrats PostgreSQL PASS**.
- Suite prévol finale : **22 scénarios exécutés : 20 PASS, 2 échecs attendus reproduisant les blocages**. Les 16 baseline sont inclus, pas additionnés artificiellement.
- **43 tests Vitest PASS**, sept fichiers : cas simple/multiple, absent serveur, droits, confirmations, CAS/relecture, invalidation et absence de repli vers l’ancien après P0551.
- Compilation automatique observée : build OK. Aucun code frontend modifié.
- Fonctions de démarrage/retake copiées par SELECT uniquement dans la fixture locale ; empreintes confirmées par une seconde lecture :
  - core_start : `bd51c7d4a794bcf9ea9255d9f20b764b`.
  - retake : `c389f555209e4fd5fd2ace757127e919`.
  - import : `53db2a13a98ea971469dc3c8c922ca51`.
  - timers : `b46db09d14021d24b436906245b5a30b` / `d97f44edd0f201554b2469910a24884c`.
- Les triggers de contexte/réponses/immutabilité et fonctions save/finalize du catalogue archivé sont utilisés. **L’ensemble des triggers et effets secondaires courants n’est pas entièrement rejoué** : ne pas annoncer une certification exhaustive de tous les effets.

Rejouer sans production :

```text
python3 src/test/session_exam_access_contract.py
python3 src/test/session_exam_access_preflight_contract.py
bunx vitest run src/components/sessions/acces-examens/*.test.ts* src/test/session-exam-access-routing.test.ts
```

## Corrections nécessaires avant GO

1. Garde de création de première preuve ancienne (`reponses_apprenants`) couvrant les deux persist RPC/Edge. Autoriser seulement la continuation avec une identité de passage réellement enregistrée (timer/reçu/V2), jamais un simple objet JSON ou numéro voisin. Ne pas bloquer les sauvegardes tardives d’une copie commencée ; pas de garde globale sur les UPDATE de réponses ou notes.
2. Exception historique prouvée par source remise/identité et contexte autorisé, compatible avec l’import réel en_cours. Tester faux `result_id`, provenance fabriquée, mauvais propriétaire/matière/tentative et import autorisé sans créer de droit de démarrage.
3. Décider/documenter le canal canonique existant et vérifier sa non-utilisation publique ou son contrôle indépendant ; pas de raccordement automatique.
4. Rejouer les fonctions complètes de persistance et import, tous les déclencheurs courants avec effets externes neutralisés, reprises anciennes (timer ou réponse préexistante), retake VTC/TAXI/TA/VA et concurrence fermeture/reprise/première réponse. Les deux tests bloquants devront passer sans `expectedFailure`.

Le candidat SQL est laissé **inchangé**, plutôt que d’introduire une exemption non prouvée. Aucun fichier de migration automatique ajouté. Les ajouts de ce prévol sont uniquement tests, fixture de définitions et documentation.

## Procédure ciblée préparée — à ne pas exécuter avant GO et accord

### Préparation

1. Relire les signatures, colonnes, droits, index, triggers et empreintes depuis le catalogue courant (SELECT), puis rejouer la suite avec le candidat corrigé. STOP si divergence ou objet `session_exam_*` déjà présent : aucun `CREATE OR REPLACE` aveugle.
2. Accord séparé **installation uniquement**, sans événement d’ouverture/fermeture. L’accord doit identifier la version/empreinte exacte du SQL revu. La cible EB de la capture doit être explicitement fournie avant toute fermeture ultérieure.
3. Fenêtre courte ; opérateur autorisé, transaction unique, `lock_timeout='2s'`, `statement_timeout='15s'`. Les CREATE TRIGGER prennent des verrous sur tables actives : si timeout, ROLLBACK, pas de boucle automatique ni d’attente indéfinie.

### Installation future

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
-- SQL unitaire COMPLET corrigé et validé, jamais le batch ni les RPC seules.
-- Vérifications dans cette même transaction : objets/signatures exacts,
-- RLS/droits attendus, triggers actifs sur toutes les frontières validées,
-- zéro événement dans le journal fraîchement créé, aucune donnée initiale.
-- Si une assertion manque ou échoue : ROLLBACK, ne pas COMMIT.
NOTIFY pgrst, 'reload schema';
COMMIT;
```

Le fichier candidat actuel ne doit pas être inséré dans ce protocole tant que les deux défauts sont présents. Pas de remplacement des fonctions de notes, pas de seed, cron, backfill, import ou mise à jour de dossier.

### Contrôles après installation future

- SELECT catalogue : signatures exactes, SECURITY DEFINER/search_path, révocations et GRANT, journal RLS, triggers actifs, nombre événements = 0.
- Admin : lecture de la session sélectionnée, variant exam_id exact ; état habituel/null, jamais succès « fermé » sans événement ; relire après rafraîchissement du cache API. Aucun test de fermeture réel automatique.
- Comparaison ciblée avant/après des IDs et empreintes des copies commencées, réponses, résultats et chronos **sélectionnés avant l’installation**, séparant l’activité élève légitime ; aucune mutation par installation. Pas de scan massif pendant l’activité.
- Nouvelle décision nominative session + EB pour une éventuelle fermeture ; commande unitaire existante avec CAS et reçu/relecture. Le groupé reste désactivé.

### Retrait possible sans perte

- Avant COMMIT : **ROLLBACK** annule toute installation partielle.
- Après COMMIT : retrait nécessite un accord distinct car retirer une garde peut élargir l’accès. Dans une transaction courte, révoquer EXECUTE sur la commande admin, désactiver uniquement les nouveaux triggers `session_exam_new_*` si le retour au comportement antérieur est décidé, puis recharger le cache API. Vérifier que les autres triggers restent actifs.
- **Conserver le journal et toutes ses lignes**, RLS et garde d’immutabilité ; pas de DROP TABLE, DELETE, TRUNCATE ou suppression d’événement. Conserver aussi les fonctions pour investigation/réactivation ciblée. Toute fermeture réelle déjà journalisée doit être signalée avant retrait ; ne jamais transformer silencieusement les événements.
- Aucun script de retrait n’a été exécuté ni livré comme une opération automatique.

## État final

Contrôle toujours non installé ; aucune fermeture/ouverture, publication, migration réelle, compte créé/utilisé, import, modification de copie/note/réponse ou envoi tiers. Le dernier correctif d’énoncé et les autres chantiers en aperçu sont préservés. L’installation attend les protections manquantes et leur preuve, pas simplement une autorisation de publier.