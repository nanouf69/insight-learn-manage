# Activation correctif QRC liaison (A+B/B+A + preuve ciblée Meriem) — 10/11/2026 11:15 UTC

Suite de `activation-qrc-2026-11-10-1017-no-go.md`. Décision : **GO**, tous les contrôles critiques étant verts.

## 1. Sauvegarde et empreintes (avant)
Dossier privé `/mnt/documents/.lovable/qrc-2026-11-10-1049/` (SHA256SUMS) :
- `sauvegarde-5-resultats.jsonl` : les 5 copies EB2 t3 de Meriem BENNANI ; md5 de chaque ligne = md5 production (5/5 identiques, sauvegarde vérifiée octet pour octet).
- `sauvegarde-remises-eb2.jsonl` (13 remises EB2 de l'élève), `sauvegarde-qrc-historique-corrections.jsonl` (373 corrections).
- `lignes-avant.txt` : md5 par ligne de 11 583 copies EB + remises EB1–EB6.
- `live_qrc_historique_*.sql` : définitions des RPC avant activation (rollback).

## 2. Preuve de liaison des 5 copies
Table append-only `qrc_historique_liaisons_remise` (UPDATE/DELETE/TRUNCATE refusés, lecture admin seule, aucune écriture client).
Chaque ligne n'est insérée que si : remise `EB2__<matière>__t3` unique, `completed/submitted`, colonne tentative = 1 (défaut historique), résultat unique tentative 3, réponses identiques (seules permutations de lettres QCM figées admises, QRC texte exact), journal présent **exclusivement** en tentative 3, aucun lien V2. Une assertion annulait toute la migration si une seule preuve manquait.
Résultat : 5/5 prouvées — journal : français 219, gestion 70, réglementation VTC 226, réglementation VTC2 151, T3P 211.
La preuve est revérifiée à chaque appel (empreintes réponses/snapshot, unicité, même élève) : toute divergence future la neutralise.
Aucune autre copie n'est concernée (710 autres remises au même défaut non traitées, sans autorisation).

## 3. Tests (tous verts avant activation)
- PostgreSQL jetable `contrat_liaison_v2.py` : 87/87 OK (append-only, RLS, revalidation, rollback, refus non-admin, idempotence, concurrence, pas d'assouplissement global, QRC exacte, copies V2/TAXI/en cours).
- `contrat_audit_permutation.py` : 86/86 OK.
- Vitest élargi QRC/correction/EB2/notes/alerte : 48 fichiers, 458/458 OK (dont 20 navigation, mocks `channel/removeChannel` ajoutés sans masquer d'erreur).
- Répétition jetable avec copie des données réelles + fonctions de calcul exactes de production : 5/5 `liaison_prouvee`, révision possible sur chacune (dans une transaction annulée), notes inchangées (8,5 / 18 / 12,5 / 15 / 17,5).

## 4. Activation (migration 0257) et contrôles après
- Preuves : 5 lignes. RPC `noter/reviser/preuve_remise` installées ; constraint provenance étendue à `liaison_prouvee`.
- Corrections : 373 (inchangé). 5 copies de Meriem : md5 identiques à la sauvegarde.
- 11 583 lignes EB : 0 disparue, 0 nouvelle ; 1 modifiée = remise EB3 gestion `in_progress` d'un élève en train de composer (activité normale, 11:12 UTC).
- Admin connecté, lecture seule : `qrc_historique_preuve_remise` → `liaison_prouvee` 5/5 ; anonyme → 401 ; table de preuves invisible à l'anonyme.
- Correcteur V2 : chargé, case « Je confirme… » et encadré absents, 0 écriture REST. Tri : fin réelle décroissante (la colonne « Passage » affiche l'heure de **début** ; l'ordre suit la fin).

## 5. Publication
Publication de l'interface effectuée après activation ; le site public (bundle `index-DSRzIv6V.js`) contient le nouveau code de liaison (`liaison_a_prouver`), vérifié vers 11:38 UTC.

## 6. Non testé / risques résiduels
- Aucune vraie note enregistrée en production (interdit : pas de note fictive). La persistance réelle d'un clic est prouvée en base jetable seulement.
- 710 autres remises `__tN`/tentative=1 (46 élèves) restent non prouvables tant que non traitées nominativement.
- Rollback : `docs/sql-revue/2026-11-10-qrc-liaison-v2-ROLLBACK.sql` (restaure les RPC live, conserve preuves et notes).
