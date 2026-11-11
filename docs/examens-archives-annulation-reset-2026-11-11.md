# Examens archivés — annulation ciblée, préparation uniquement

## Chemin et état
CRM → fiche apprenant → Examen blanc / Remise à zéro → **Examens archivés**.
Chaque reset est identifié par son ID immuable, examen et date UTC. Lecture paginée ; contrôle admin via utilisateur authentifié et rôle serveur. Bouton « Annuler la remise à zéro », dialogue nom/examen/date/ID et fermeture sans enregistrement. Confirmation persistante toujours désactivée : aucune fonction mutante appelée par le frontend.

En environnement réel, la dépendance de contexte n'étant pas installée, le bouton est désactivé avec message explicite, jamais un succès fictif. Aucun changement du bouton global, des matières ou du calcul des notes.

## SELECT réel avant et après
HADDOU MASSINISSA, c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe :
- EB3-TAXI reset 1b345cff-b068-4499-b0d7-76a6578fc74c, 11/11 13:16:10.962101 UTC : 7 copies terminées, 7 résultats définitifs (17 ; 17,5 ; 17,5 ; 17 ; 14 ; 14 ; 16), 7 neutralisations dont le motif désigne exactement ce reset. Autorisation 28a308de-a42b-4e29-b314-28b0790e0345 non consommée/non révoquée. Zéro démarrage après reset dans le SELECT final.
- EB4-TAXI : autorisation consommée à 13:16:30.819495 UTC, cinq démarrages après reset au dernier SELECT, dont une copie encore en cours à la première lecture. Refus obligatoire, même si ces copies terminent ensuite.
- EB5/6 : resets conservés, aucune restauration examinée ou exécutée. EB2 conservé.
Lectures uniquement ; aucune mutation réelle, migration, publication, email ou IA.

## Candidat SQL séparé, non installé
`docs/sql-revue/2026-11-11-exam-reset-cancellation.sql` : événement append-only unique par reset/opération, RLS et GRANT, audit, validation admin/identité/date/examen, reset dernier non ambigu, refus copie commencée ou grant consommé, verrou partagé exam-v2 + subject-retake, verrou du grant et rejeu.
Trois projections proposées : resets effectifs (cutoff sans événement annulé), neutralisations effectives (retire uniquement le motif exact appartenant au reset annulé, conserve les indépendantes), autorisations effectives (exclut seulement reset_id annulé). Aucun UPDATE/DELETE des sources, résultats ou journaux.

## Blocage concret / NO-GO
Le candidat **refuse toute annulation** via `exam_reset_cancellation_coverage_ready() = false`. Les tests qui l'activent le font uniquement sur la base jetable.
1. Lecteurs réels restent sur tables brutes : ExamenBlancsListe, ResultatsApprenantTab, ExamensBlancsResetTab, coreExamPublication, pontV2, noyauReel, lectureRapprochement et surveillance. Les convertir ensemble avec rafraîchissement cohérent reste à faire ; sinon l'événement ne réaffiche pas les notes partout.
2. Fonctions réelles core_start_attempt, start_exam_subject_retake, core_restart_matiere, core_finalize_attempt, admin_authorize_exam_subject_reset et contrôles QRC utilisent encore resets/neutralisations bruts. Ne pas remplacer les gardes au hasard.
3. Chemins anciens de timer/réponse et consommation d'autorisation matière ne partagent pas tous le verrou d'annulation. Pas de couverture exhaustive des tentatives legacy après cutoff. L'éligibilité du contexte est une préparation V2, **pas une permission de production**.
4. Refus conservateur des anciennes copies abandonnées : réaffichage sûr de copies terminées seulement. Aucune restauration d'état d'une copie abandonnée.
5. Catalogue complet des déclencheurs et bout-en-bout avec véritables chemins ancien/V2 + élève/CRM/QRC non prouvés ; pas de session CRM réelle utilisée pour les tests UI.
Ce blocage n'exige ni suppression ni reset réel ; l'installation reste interdite dans cette livraison.

## Tests réellement exécutés
- PostgreSQL jetable : 28 tests PASS au total, dont 8 nouveaux scénarios et 20 exécutions des contrats préexistants (10 hérités + 10 originaux). Premier lancement en erreur de nettoyage FK fixture, corrigé puis relancé intégralement.
- Événement/rejeu, snapshots sources inchangés, neutralisation indépendante conservée, grants effectifs, append-only, refus non admin/nouvelle copie/consommation/reset suivant, isolation EB4 et concurrence démarrage gagnant. Le démarrage utilise core_start_attempt de migration 0242, pas tous les déclencheurs du catalogue réel.
- Vitest : 17 tests PASS (3 archives, 5 identités, 1 moyenne CRM, 8 moyenne deux copies).
- Chromium : PC 1280×1800, mobile 390×844, dialogue exact, confirmation désactivée, EB4 bloqué, fermeture sans enregistrement, apprenant exclu, pas de débordement ni erreur JS. API fictive locale ; aucun appel Cloud.
- Compilation automatique : build OK après changements.

Repère de code fonctionnel observé : `9e209b8c3` avant ajout de ce rapport ; commit final donné dans la réponse après lecture.