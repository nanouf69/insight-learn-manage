# Audit de non-régression — correctif QRC « choix QCM permutés »

Objectif : décider GO / NO-GO avant toute activation. Rien n'est déployé, aucune migration appliquée, rien publié. Production en lecture seule ; tous les tests d'écriture sur une base PostgreSQL jetable.

## 1. Périmètre de l'équivalence A+B = B+A
- Relire `memesReponsesRemise` et le SQL candidat ligne à ligne.
- Vérifier sur les snapshots figés réels (lecture seule) la liste des types de questions : QCM multichoix, QCM simple, QRC, questions ordonnées / classement / appariement s'il en existe.
- Exiger : permutation acceptée seulement si la question est un QCM multichoix identifié de façon unique dans le snapshot, lettres A–E sans doublon ; tout le reste comparé à l'identique (QRC texte exact, sans trim ni casse).
- Tests ajoutés : doublons [A,A] vs [A], lettres hors A–E, QRC permutée refusée, question à ordre significatif refusée, question absente ou ambiguë dans le snapshot refusée, clé en plus/en moins refusée.

## 2. Identité de la copie
- Vérifier que élève, matière, examen, numéro de tentative enregistré, attempt_id et empreinte de snapshot restent tous obligatoires côté serveur ; la permutation n'élargit aucune autre clé.
- Tests : même réponses mais autre élève / autre tentative / autre matière / autre snapshot → refus sans écriture.

## 3. Notes et calculs
- Corrections déjà notées : aucune relecture/re-notation ; vérifier que le correctif n'est appelé qu'au moment d'une nouvelle note.
- Note matière /20, note finale, éliminatoires (< 6), règle ≥ 10, QRC en attente jamais comptée en échec, `core_exam_results.score` jamais redivisé.
- Publication des 7 matières et alerte note globale : cas legacy, V2, mixte.
- Tests : copie permutée notée → note matière et finale correctes ; éliminatoire conservée ; QRC en attente reste « en attente ».

## 4. Concurrence, idempotence, sécurité
- Deux clics simultanés / deux admins : une seule correction, append-only, operation_id rejoué sans doublon.
- RPC : SECURITY DEFINER, search_path fixé, contrôle rôle admin, refus élève/anon ; RLS inchangée (comparaison catalogue avant/après sur base jetable).
- `resultat_seul` toujours refusé.

## 5. Intégrité hors périmètre
- Empreintes lecture seule (comptes + md5 agrégés) : modules/questions (`module_editor_state`), réponses élèves, tentatives en cours, snapshots, corrections QRC, résultats, émargements/signatures.
- Prouver que la migration candidate ne touche que les deux fonctions de liaison (diff du catalogue sur la base jetable).

## 6. Couverture des 57 + 27 tests existants
- Tableau cas exigé → test existant / manquant. Ajouter les manquants (sections 1–4) dans `src/test/` et le jeu PostgreSQL jetable ; relancer tout.

## 7. Plan de sauvegarde et rollback (préparé, non exécuté)
- Avant : export de la définition actuelle des deux fonctions (`pg_get_functiondef`) dans `docs/sql-revue/`, empreintes de la section 5.
- Activation (sur accord seulement) : migration ne remplaçant que ces deux fonctions.
- Après : mêmes empreintes, doivent être identiques ; contrôle lecture des trois copies réelles connues.
- Rollback : migration de restauration prête, qui réinstalle exactement la définition sauvegardée ; testée sur la base jetable (aller-retour, catalogue identique).
- Frontend : retour au bundle précédent si anomalie.

## 8. Livrable
Rapport `docs/audit-non-regression-qrc-permutation-2026-11-10.md` : preuves, tableau de couverture, empreintes, résultats PASS/FAIL/NON PROUVÉ, risques résiduels, décision GO/NO-GO motivée. NO-GO automatique si un seul cas des sections 1–4 n'est pas prouvé. Aucune activation ni publication sans votre accord explicite.
