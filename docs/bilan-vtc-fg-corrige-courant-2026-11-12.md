# F(V) : corrigé courant lors de l'entraînement

## Diagnostic SELECT et code
- Question retrouvée par énoncé : module 5, exercice 505 F(V), question locale 18, UID `1cac4575-76c3-46c2-adb5-dffd1b3c2ebb`. A « donner des repères pendant le trajet » et C « me présenter » corrects dans l'éditeur sauvegardé.
- Question 19 suivante : « Le prix de vente d'une prestation doit être égal au : », UID `3b5dab19-fda7-4dec-bdf6-1c4f54ebe9aa`, B « Coût de revient + Marge + TVA » correct.
- Module 30/505 a encore A seule pour Q18 : variante distincte, non modifiée et non fusionnée. 32/32 snapshots VTC 505 contiennent l'UID Q18 ; 28 snapshots 506. Aucun compte individuel utilisé.
- Le nouveau circuit possède uniquement reçus A–E 500–504. F/G restent dans le même renderer legacy avec snapshots, même pour un compte orienté futur.
- Sauvegarde éditeur : save_module_editor_state avec CAS, signal de modification puis relecture existante. Révision legacy : questionsSafe du snapshot et justePourRefaire, donc une modification admin ne modifie pas ce corrigé figé. Aucune modification de cette sauvegarde ou du contenu.
- Lecteur installé corrige_officiel_actuel : exam_attempts_v2 terminées et banque EB publiée, pas bilan_passage_snapshots ni éditeur module 5. Lecteurs corrige_sources et training précédents non installés. Publier une banque EB ne résout donc pas ce cas.

## Correctif préparé uniquement
- SQL de revue indépendant `2026-11-12-bilan-vtc-fg-training.sql` : lecture propriétaire + original remis/date + snapshot exact 5/505 ou 5/506. Corrigé depuis module_editor_state sauvegardé, sans publication d'une banque.
- UID unique, type QCM, même énoncé et association lettre/texte exacte. Numéro remappé autorisé par UID ; ordre de rendu des options conservé, simple réordonnancement serveur accepté, échange de texte/lettre refusé. Ambiguïté exclue, aucune clé figée utilisée en secours.
- Dernière révision enregistrée : même dossier/exercice/tentative, postérieure à la remise. Dernier choix local, même vide, prioritaire si UID/énoncé/options compatibles. Identités distinctes exclues.
- BilanSrTraining relit à chaque clic/retour, commencement, vérification ou fausses restantes. Les résultats et compteurs restent purement locaux ; aucune sauvegarde/remise/historique modifié. La branche F/G appelle le nouveau lecteur, pas le pilote 502. Sans lecteur : suspension explicite.
- Pas de snapshot identifiable : message explicite, pas de repli périmé. Admin ne monte pas cet entraînement. TAXI/module 30 et nouveaux reçus A–E inchangés.
- SQL préparé avec droit d'exécution propriétaire soumis uniquement ; aucune modification des droits existants en production, ni accès direct élargi à l'éditeur ou aux banques. Installation ciblée du candidat nécessaire avant usage, revue requise ; aucun fichier auto-migration.

## Validation exécutée
- 16 tests Vitest PASS : entraînement 7, accès compléments 4, remises F/G 5. Changement A→A+C dans onglet ouvert, Q19, dernier choix, retour, erreur réseau (suspension), copies immuables.
- 16 contrats PostgreSQL jetables PASS : 6 F/G et 10 historiques 502. Identité remappée, ordre/options, doublons, autre propriétaire/anonymous, avant remise, TAXI, autre tentative, choix vide, empreintes avant/après inchangées. Deux premières exécutions ont échoué dans le parseur du test (lignes de transaction/JWT), corrigé puis suite rejouée sans expectedFailure.
- Deux parcours Playwright PC/mobile PASS sur renderer entraînement réel, transport remplacé : A seule devient fausse à l'entrée après modification simulée, A+C et Q19 B donnent zéro faux résiduel, retour conserve dernier choix, erreur masque ancien résultat ; appels lecteur seulement. Screenshots examinés.
- Build aperçu OK. Aucun déploiement, compte réel, écriture réelle, migration exécutée ni envoi.

## Non prouvé / hors périmètre
- Fonction non installée : résultat utilisateur réel non corrigé en production. Sans snapshot, aucun entraînement actuel possible avec ce paquet.
- Simulations UI entraînement vérifiées ; parcours authentifié réel/module complet et sauvegarde réelle admin→lecture réelle non exécutés. RLS/effective grants de la production ne sont pas certifiés par ces fixtures.
- Mise à jour de l'éditeur module 30 ou autres matières : non demandée, non faite. Autres lecteurs/pilotes et chantiers SQL non modifiés.