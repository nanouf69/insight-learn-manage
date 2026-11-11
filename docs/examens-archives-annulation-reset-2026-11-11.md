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

## Reprise 13:48 — vrai profil admin et contrôle intégré

### Visibilité réelle, lecture seule
Session gérée restaurée dans localhost et rôle **admin** confirmé par getUser + has_role réel (aucune simulation de rôle). Fiche réelle HADDOU ouverte via `/?section=apprenants&apprenant=c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe`, clic sur onglet **Examens blancs**, puis **Examens archivés**. Région EB3-TAXI et texte exact du reset 1b345cff-b068-4499-b0d7-76a6578fc74c vus à l'écran : 7 copies, 7 résultats, annulation désactivée. Capture PC inspectée.

Lien d'aperçu : https://id-preview--73b74fa5-8a35-42ae-87cf-970f3567b973.lovable.app/?section=apprenants&apprenant=c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe
Le parcours s'ouvre d'abord sur Infos : cliquer **Examens blancs** puis **Examens archivés**. Ne pas cliquer l'onglet principal **Remise à zéro**, qui concerne les cours et non les examens blancs. Aucun changement de navigation nécessaire ni onglet dupliqué.

Les appels mutateurs ont été bloqués par instrumentation, fonctions externes également ; seules lectures et RPC de lecture autorisées. La RPC candidate de contexte, autorisée lors du second contrôle, reste absente : la liste réelle ne dépend pas de son installation. Quelques RPC de lecture de sections adjacentes ont été bloquées conservativement, sans incidence sur les archives. Aucun reset, consommation, notation ou annulation exécutés.

Le bundle principal publié observé `/assets/index-kHiznWSy.js` contient également « Examens archivés » et la clé `exam-reset-archives`. Cela ne prouve pas que l'onglet est affiché dans l'ancien onglet navigateur du propriétaire ; absence rapportée non reproduite en aperçu. Pas de publication effectuée. Le lien d'aperçu a été validé fonctionnellement par son même chemin localhost avec profil réel, pas par authentification directe sur l'origine distante.

Mobile réel : les éléments sont présents et désactivés mais la barre latérale est restée ouverte après redimensionnement ; capture partiellement masquée, ne pas compter ceci comme validation visuelle mobile complète. Mobile fixture de la livraison précédente reste prouvé.

### Tests supplémentaires réellement exécutés
- `exam_reset_cancel_sql_contract.py` : **31 tests PASS**, dont trois nouveaux cas : compte/reset discordants refusés, resets de même instant ambigus refusés, deux annulations concurrentes = un événement. Comprend 20 exécutions des 10 contrats hérités/originaux, pas 31 règles nouvelles.
- `exam_reset_cancel_live_contract.py` : **1 scénario intégré PASS avec assertions multiples**, cluster jetable chargé du schéma et des déclencheurs réels capturés 11/11, HTTP/cron remplacés par journal local. Copie QCM fictive 17/20, résultat V2 et historique conservés byte-identiques ; événement admin+rejeu, vues effectives font réapparaître les deux lectures de résultats ; utilisateur d'un autre dossier lit zéro événement et RPC admin refusée ; aucune sortie HTTP/cron.
- Vrai `core_start_attempt` testé après annulation sur ce cluster : refuse **CANCELLED_RESET_GRANT**, rollback sans nouvelle copie. Blocage concret reproduit : il lit encore l'autorisation brute annulée au lieu de sa projection effective. Pas de faux PASS du parcours complet.
- Vrai `start_exam_subject_retake` ancien : première matière crée reçu et timer, moteur **ancien**, sans copie V2. Fonctionne normalement sur l'examen fictif distinct. Le chemin ancien de démarrage n'est pas encore sérialisé globalement avec l'annulation ; ce test ne prouve pas le conflit simultané legacy/reset.
- **17 tests Vitest PASS** rejoués et build automatique OK. Message de chargement du rôle admin clarifié seulement, logique d'annulation inchangée.
- Les premières exécutions du scénario intégré ont échoué (format numérique, bridge fictif non activé/clé sans contrainte, fixture matière incomplète puis nom moteur attendu incorrect) ; corrections des fixtures, exécution finale complète PASS. Aucun garde-fou métier désactivé hors cluster jetable.

### Couverture et blocages restant avant toute activation mutante
Inventaire frontend élargi : CoursPublic, NotesView, ExamensBlancsPage, ExamenBlancsListe, ResultatsApprenantTab, ExamensBlancsResetTab, SelectionCopieMoyennePreview, coreExamPublication, pontV2, noyauReel, lectureRapprochement et surveillance lisent encore les journaux bruts. Leur adaptation commune aux projections effectives et aux événements de rafraîchissement reste requise. Aucun changement global apporté à ces écrans dans cette reprise.

Catalogue réel relu : neuf fonctions référencent resets/neutralisations, notamment core_start_attempt, start_exam_subject_retake, core_restart_matiere, core_finalize_attempt, admin_authorize_exam_subject_reset, exam_subject_reset_expired_empty et deux contrôles IA (qui doivent rester inactifs). Les deux overloads start_or_get_exam_timer utilisent encore un chemin séparé. La garde de consommation du candidat protège V2, mais refuse un démarrage qui choisirait à tort le grant annulé : sélectionner la projection effective doit précéder l'activation.

**NO-GO annulation production maintenu** : un événement+vues est testé, mais la restauration affichée simultanément par vrais écrans élève/CRM/QRC, et les conflits des deux chemins legacy/V2 ne sont pas intégralement couverts. Pas de migration proposée à exécuter, gate false maintenue, zéro RPC admin_cancel_exam_reset installée. Une consultation des archives est déjà disponible en lecture seule et ne demande aucune migration.

SELECT final HADDOU EB3 : toujours 7 copies, 7 notes définitives, 0 démarrage post-reset, autorisation non consommée. EB4/5/6 et tout autre dossier inchangés par cette intervention.