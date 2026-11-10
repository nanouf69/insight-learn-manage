# Commentaires QRC à note inchangée — 10/11/2026 13:45 UTC

## Décision : GO publication (tests critiques PASS, retour arrière prêt)

## Correctif serveur installé (migration 0259, fonctions seules, aucune donnée modifiée)
- `core_commenter_qrc` (V2) : nouvel événement append-only même note, admin seul, CAS note attendue + dernier événement relu, idempotence `core_operations`, double clic = rejeu, audit_journal.
- `qrc_historique_commenter` (anciennes copies) : ligne de journal append-only même note, CAS révision + note, copie `apprenant_quiz_results` intacte, remise non prouvée refusée.
- `qrc_historique_commentaires_eleve` : lecture propriétaire/admin du dernier commentaire.
- SQL installé identique (hors commentaires) au SQL testé `docs/sql-revue/2026-11-10-qrc-commentaire-seul.sql`.
- Retour arrière : `docs/sql-revue/2026-11-10-qrc-commentaire-seul-ROLLBACK.sql` (testé sur base jetable, catalogue restauré, aucune perte) ; interface : restauration de la version précédente de l'historique.

## Production (lecture seule)
- Avant 13:23 / après 13:44 : journal V2 6058 événements (max 6079) inchangé ; journal historique 443 inchangé ; 0 commentaire seul écrit.
- QRC V2 6591→6663 et résultats 2659→2689 : activité élève en cours entre les deux relevés, pas cette intervention.

## Tests
- E2E isolé admin → supabase-js → PostgREST → PostgreSQL → candidat, VTC et TAXI : 2/2 PASS (4 boutons cumulés + texte libre, double clic simultané = 1 écriture, version périmée refusée, rechargement candidat = dernière version, autre élève 0 ligne, élève/anonyme refusés, notes/réponses/résultat identiques).
- E2E isolé révision élève → vrai handler d'enregistrement → lecture admin : 1/1 PASS (deux onglets simultanés, seconde correction, Terminer, rechargement, écriture tardive après gel sans effet). Le gel est posé par la fixture.
- Contrats PostgreSQL jetables : EB3/commentaire V2 14/14, anciennes copies 29/29, retour arrière 1/1.
- Suite applicative complète : 4094 PASS, 13 ignorés, 0 échec. Compilation OK.
- Téléphone 390×844 (lecture seule, écritures bloquées) : section « Questions à refaire » lisible, aucun débordement horizontal.

## Non prouvé
- Clic réel sur une copie de production (interdit : aucune écriture fictive).
- Jour/soir : même serveur et même écran ; seule la présentation par session diffère.
- Anciennes copies non liées restent non notables (inchangé, voulu).
