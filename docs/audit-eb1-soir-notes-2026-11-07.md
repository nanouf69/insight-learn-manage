# EB1 VTC soirée 2–13 novembre — 07/11/2026

## Audit confirmé
18 inscrits ; 119 matières actives terminées ; 118 notes définitives ; 59 flags legacy pending obsolètes chez 13 élèves. Seule Kama DIALLO F(V) attend 4 QRC. Mfouemo : 7 passages archivés exclus ; 7 nouveaux passages définitifs.

## Cause
La correction V2 publie core_exam_results sans recopier le flag legacy. Le filtre d’affichage pouvait rejeter cette source à cause de différences de contenu entre fiche legacy et snapshot ; NotesView ne surveillait pas les publications V2 et pouvait fusionner les identités de résultats avant leur vérification.

## Correctif aperçu
- src/lib/nativeExamResultIdentity.ts : preuve unique par réponses figées et ensemble exact QRC, aucun rapprochement temporel pour cette preuve.
- src/lib/coreExamPublication.ts : lecture réponses et archives, liaison un-à-un, note persistée uniquement.
- src/lib/noteExamenAffichee.ts : source V2 prouvée prioritaire, snapshot incomplet/conflit refusés.
- src/components/cours-en-ligne/NotesView.tsx : événements V2, exclusion archives, conservation identités EB.
- Tests : eb1-session-soir-notes-historiques, native-exam-result-identity, qrc-meme-passage-chargeur ; fixture anonymisée.

## Vérifications
112 tests de régression PASS puis 35 tests ciblés PASS après derniers ajouts. Build OK. Tests des 119 matières : 118 notes persistées, 1 vraie attente, 59 faux pending résolus, aucune mutation des données de test. Consultation des 18 vues CRM élève via navigateur, requêtes d’écriture bloquées : notes visibles ; anciennes attentes Mfouemo éliminées. Les tableaux montrent aussi des verdicts legacy incohérents, hors périmètre du correctif notes. Mobile vérifié seulement dans la vue CRM (menu admin chevauchant), parcours élève mobile autonome NON PROUVÉ.

Aucune donnée réelle modifiée, aucun recalcul, aucune migration appliquée, aucun déploiement/publication. Protection globale legacy avant clôture et candidats SQL de snapshots : non activés, pas de garantie complète. Publication globale reste bloquée sans contrôle de sécurité et accord explicite.
