# Feuille de route

## Mail signatures manquantes — 30/10 15:39 UTC
- [x] Bouton Relance signatures ajouté au suivi présentiel, réutilise aperçu/relecture/confirmation CRM ; aucun envoi de test.
- [x] Compte admin : ouverture tableau de bord → relance FIACRE → aperçu mail vérifiée ; 31 tests PASS. Aucun mail envoyé, aucune publication.

## Signatures réelles — 30/10 15:27 UTC
- [x] Audit Ilyes : TA dix créneaux/10 images, aucune pratique réservée/inscrite ; +2 forfait client.22 feuilles futures sans image conservées ; origine exacte du lot12/10 NON PROUVÉE.
- [x] Lecture nominative457 dossiers,3041 feuilles :79 plannings incomplets,45 dossiers hors planning,34 horodatages sans image,0 doublon ; rapport docs/audit-emargements-2026-10-30.md et CSV Files. Empreinte avant/après identique.
- [x] Compteurs partagés selon planning réel, résumé en haut des fiches, taux/Documents/EDOF harmonisés ; aucune écritureCloud ni preuve/calendrier modifié.
- [x] 191 tests/18 fichiers PASS ; aperçu buildOK ; compte admin réel ficheIlyes/Formulaires10/10 et mobile lisible. Aucun mail/SMS/IA/attestation/publication.
- [ ] Publication BLOQUÉE : confirmer horaire27/10 après-midi (agenda13–15=29h contre30h affichées), plannings incomplets et concordance serveur/attestations. Tests SQL et parcours de tous les comptes NON PROUVÉS ; audit détaillé des attestations existantes non terminé (preuves complémentaires requises).

## Livres reçus — 30/10 15:06 UTC
- [x] TAXI113 / VTC87 / TA53 / VA27 pages ; deux fichiers TA byte-identiques ; seuls modules70–73 concernés.
- [x] Visionneuse masquée à l'impression ; PDF original élève toujours refusé côté serveur, aucune modification de questions/données.
- [ ] Préparer les nouvelles versions privées : TAXI113/TA53/VA27 images temporaires ; VTC incomplet (conversion trop lente/ensemble alternatif incomplet). Aucun téléversement ni pointeur changé ; anciens livres conservés.
- [x] Visionneuse actuelle testée isolément avec session admin : navigation TA et média print blanc ; buildOK. Nouvelles versions et parcours élève NON PROUVÉS.
- [ ] Activer seulement après validation globale ; aucune publication dans ce lot.

## Contrôle de connaissances absent — 30/10 12:01 UTC
- [x] Lecture seule session TAXI/TA du 26/10 au 16/11 : module13 absent des listes explicites de Mohktar BEN ALI, Ilyes Dakhlaoui, CIHAN RAYMAN et Harutyun Pndukyan ; ce dernier a une date d’accès expirée. MASSINISSA HADDOU a une liste NULL, distincte d’une exclusion explicite.
- [x] Cause confirmée : listes par défaut TA/TA e-présentiel des formulaires création et modification omettent13, contrairement au catalogue commun ; les listes TAXI le contiennent. ListeNULL bénéficie du parcours par défaut côté élève (pas une absence confirmée).
- [x] Accord « Oui, les trois élèves » : module13 ajouté seul aux trois listes actives sous verrou/comparaison exacte, trois événements audit ; formulaires création/modification TA et TA e-présentiel corrigés. Harutyun et listeNULL inchangés.
- [x] 55 tests PASS ; empreintes des trois dossiers hors modules, réponses, validations et216 snapshots strictement identiques avant/après. Fiche Mohktar relue dans CRM : contrôle coché, aucune sauvegarde UI ni soumission. Build OK ; ajouts d’accès effectifs Cloud, formulaires non publiés.
- [ ] Ouverture autonome du contrôle depuis un compte élève NON PROUVÉE (consultation CRM seule, aucun compte réel connecté pour test) ; formulaires corrigés attendent publication autorisée.

## Objets oubliés TAXI — 30/10 11:31
- [x] Page officielle et scan2024 article6/p5 lus ; vérifier avant éloignement, pas avant descente. Texte2026 article9 fraîchement relu, destinataire divergent.
- [x] Inventaire code + JSON/banques Cloud ; feedbacks locaux20/29 précisés, secours Contrôle57 délai24→72 seulement. Q35, banques et sauvegarde/IA conservés.
- [x] 53tests PASS, lecture copie technique soumise PC/mobile vérifiée, empreintes Cloud identiques ; rapport docs/objets-oublies-taxi-2026-10-30.md, aucune publication/écritureCloud.
- [ ] Harmonisation complète BLOQUÉE : articulation Métropole/Rhône pour ADS hors Métropole à arbitrer ; copies héritées ouvertes sans protection des références prouvée. Exhaustivité des supports binaires NON PROUVÉE.

## Corrigés spécialités Q29/Q35 — 30/10 11:17
- [x] QCM locaux29/35 identifiés ; supports Locale1 pages8–9, livre PDF33 et arrêté2026 art9/10 PDF17 lus.
- [x] Q35D accepté (≥6, tiers arrière, disque/lumineux/2h), feedbackQ29 explicite sans exclusion catégorique ; banques intactes,35 tests PASS, aucune écriture serveur/publication. Rapport docs/qrc-specialites-q29-q35-2026-10-30.md.
- [ ] Nouvelles clésQ29 BLOQUÉES : lieu de dépose du client absent de l’énoncé, texte dit mairie de dépose non prise en charge ; arbitrage utilisateur nécessaire.

## Visibilité prolongation d’accès — 30/10 11:15
- [x] Onglet existant renommé « Ajouter un mois d’accès », raccourci près de Réinscription ouvrant l’onglet et le faisant défiler ; aucune prolongation automatique.
- [x] Aperçu administrateur : raccourci ouvre onglet actif, proposition serveur et action de confirmation visibles, aucune réactivation exécutée ; 4 tests PASS, build OK. Aucune publication.

## Choix dates Examen et Réussite — 30/10
- [x] Masquer dates passées dans les deux sélecteurs théorie, proposer prochaine session selon jour Paris ; garder catalogue et dossiers historiques inchangés.
- [x] 13 tests ciblés PASS ; aperçu administrateur : sept dates futures, choix janvier confirmé ; build OK, aucune publication.

## Sauvegarde durable des deux quiz QRC TAXI — 30/10 10:40 UTC
- [x] Audit : local seulement/finalisation sans preuve ;78/84 champs requis, ancienne copie conservée/import brouillon explicite, facultatifs hors progression.
- [x] 0228 appliquée et vérifiée : propriétaire/RLS, réponses append-only, CAS, idempotence et soumission atomique ; aucun pont vers notes/modules.
- [x] Interface sauvegarde/horodatage/manquants, reprise2appareils et offline→online sous compte technique vérifié ; deux passages complets/relecture dont clic Soumettre spécialités. Sources intactes.
- [x] IA nouvelle soumission correspondante requise ; appels payants facultatifs bloqués402 tant que budget€ non vérifiable, refus réel testé sans fournisseur. Fonction ciblée déployée, aucune publication frontend.
- [x] 40 tests Vitest+8 groupes SQL jetable PASS, build OK ; docs/qrc-durable-2026-10-30.md. Compteur réponses officielles+1 concurrent non attribué, pas de fausse empreinte inchangée.
- [ ] Navigation complète portail depuis étapes8/3 NON PROUVÉE : compte technique formationVTC. Tests appareil physique, conflitUI deux versions et coupure soumission réelle non effectués ; interface NON PUBLIÉE en attente accord.

## Plafonds QRC IA et application — 30/10 10:35 UTC
- [x] Lecture seule : coûts enregistrés, plan Pro actif, recharges automatiques et recherche de limites bloquantes natives.
- [x] Chemin des quiz terminés confirmé dans la source : correction depuis réponse sauvegardée, sans reset ; accès actif et même navigateur nécessaires. Parcours hébergé ancien élève NON PROUVÉ, aucun retraitement automatique.
- [ ] Mise en place plafond global QRC20 €/mois civil Europe/Paris avec réservation atomique et alertes50/80/100 : BLOQUÉE par conversion crédits/euros et financement client non disponibles, à établir avant poursuite IA.
- [ ] Plafond total300 €/mois : BLOQUÉ par factures abonnement/recharges/hébergement et dépenses externes non disponibles, aucun contrôle global en euros prouvé.
- [x] Rapport docs/qrc-budgets-controles-2026-10-30.md : coûts crédits vs euros inconnus, aucune limite native trouvée, recharge auto100cr/mois distincte d’un budget€ ; aucune publication ni test IA payant.

## Choix réinscription et réactivation plateforme — 30/10 10:20 UTC
- [x] Diagnostic lecture seule : badge non éditable ; accès lié aux dates initiales, circuit IA avec garde propre ; règle d’historique séparé retenue.
- [x] Plan approuvé : choix Oui/Non par examen et nouvel onglet, périodes supplémentaires append-only, originaux conservés.
- [x] Commandes admin idempotentes/RLS + historique (0227), relecture, concurrence refusée ; écran et garde IA reconnaissent l’extension sans changer dates ou jalons. Fonction qrc-taxi-ia ciblée déployée, aucun appel IA.
- [x] 27 tests frontend +8 SQL isolés PASS ; fiche Naim lue, deux confirmations/readback navigateur simulés PASS ; build OK. Empreintes dossiers/documents identiques, tables nouvelles vides.
- [ ] Parcours hébergé complet après véritable écriture NON PROUVÉ : aucun dossier réel utilisé pour tester et aucun compte fictif réactivé sur Cloud. Frontend NON PUBLIÉ, attend accord ; journal docs/crm-reinscription-reactivation-2026-10-30.md.

## IA immédiate des quiz QRC TAXI — 30/10 10:07 UTC
- [x] Audit lecture seule : corriger-qrc existant non adapté (références client, pas d’auth/idempotence) ; circuit officiel en file exclu.
- [x] Accord plan : limites dédiées 60/heure +200/jour/compte glissantes, une active/compte ; migration0226 appliquée, reçus privés sans réponses brutes.
- [x] Endpoint immédiat authentifié actif : références serveur exactes, claim atomique, reprises transitoires bornées, résultats inconnus jamais rejoués, pause persistante402/403 ; Q5/Q6/Q13 à arbitrer sans note. Interface préparée, aucune publication.
- [x] 39 tests Vitest PASS +8 contrôles PostgreSQL jetable PASS ; IA réelle deux paraphrases1/1 et réponse incorrecte0, journal Gateway3 succès ; même réponse relue sans nouvel appel. Composants réels sous session technique PC/mobile PASS, sans débordement/erreur console.
- [ ] Navigation complète étapes8TAXI/3TA sous compte technique NON PROUVÉE : compte technique disponible affiche le parcoursVTC et garde multi-session ; aucune attribution/formation/session modifiée pour forcer le test. Emplacement et isolation couverts par tests existants. Rapport docs/qrc-taxi-ia-immediate-2026-10-30.md.

## Arbitrage QRC TAXI — 30/10 10:03 UTC
- [x] Demande : réponses seules, points contradictoires suspendus, copies intactes, aucune publication.
- [x] Feedback intégré complet/spécialités : alertes Q5/Q6 et précision CPAM Q13, énoncés/références/barème/stockage inchangés.
- [ ] Remplacement Q5/Q6 et quatrième équipement universel BLOQUÉ : arbitrage juridique nécessaire ; formulations exactes non validées.
- [ ] Contrôle13 BLOQUÉ : protection des références des copies en cours non prouvée ; aucune écriture Cloud.
- [x] 30 tests ciblés/non-régression PASS ; trois sources pédagogiques strictement identiques aux copies avant audit ; contrôle automatique build OK10:05:33Z. Parcours compte élève hébergé NON PROUVÉ.

## Corrections réglementaires QRC TAXI — 30/10 09:47 UTC
- [x] Localisation texte : intégré25/26/33, fiches TAXI/TA, H44/46/60, Cloud13/13100/212/213/220 ; sources officielles, loi juin2026 article28 relue et arrêté Rhône septembre2026 intégral.
- [ ] Corrections SUSPENDUES à validation : Q5 nouveau délit sans carte3ans/45000€, récidive3000€ non prouvée ; Q6 couleur=disponibilité, gaine universelle non prouvée ; Q13 trousse conventionnelle, quatrième universel non établi. Aucun contenu pédagogique modifié.
- [ ] Contrôle13 futur-only BLOQUÉ : 6 copies principales +1révision non terminées, protection de leurs références initiales non prouvée ; aucun JSON Cloud changé.
- [x] 27 tests existants isolés PASS ; rapport docs/qrc-taxi-corrections-audit-2026-10-30.md. Aucune publication/IA/envoi ; correction des nouvelles formulations et parcours élève NON PROUVÉS faute d'application autorisée.

## Bilans futurs isolés — 29/10 20:10 UTC
- [x] Circuit audité : retour perd le reçu, files anciennes sans identité de version, absence de preuve serveur ne signifie pas jamais commencé ; anciens circuits intacts.
- [x] Candidate commune indépendante 114/200/211/97/194 et provenance préparées,44 SR suspendues ; aucun import écran ni écriture Cloud.
- [x] 27 tests Vitest PASS + suite PostgreSQL jetable permissions/ouverture/correction/reprise PASS ; quatre empreintes Cloud strictement identiques avant/après.
- [ ] Activation/publication BLOQUÉES : éligibilité réelle, transport/interface reçu-scopés et pont de validation non prouvés ; aucune bascule pendant anciennes files actives.
- [x] Transport brouillons reçu+version (serveur prototype + client) testé ; reste : migration Cloud, écran, pont validation, compte technique.
- [x] Rapport docs/bilans-futurs-isoles-2026-10-29.md ; publication aucune, examens blancs et données anciennes inchangés.

## Publication en bloc et cohérence Bilan 5/11 — 29/10 19:24 UTC
- [x] Autorisation explicite de publier la version courante en bloc ; aucune nouvelle intervention sur les examens blancs.
- [x] Contrôle sécurité effectué ; trois alertes critiques de lecture de paramètres signalées, aucun changement de permissions.
- [x] 20 tests de protection des passages et projection exécutés ; publication demandée vers gestion.ftransport.fr.
- [x] Version servie confirmée HTTP200 : index-tGd3fqJR.js, empreinte cf64d6f7… ; navigateur public Connexion, aucune erreur JavaScript ; expression snapshot stricte retrouvée dans le fichier publié.
- [x] Contrôles isolés :20 tests avant publication,27/28 tests sauvegarde/reprise (1 ancien contrat de chaîne source FAIL),12 assertions PostgreSQL jetable et11 tests après publication PASS ; deux tests nouveaux prouvent le risque sans snapshot.
- [ ] Circuit cinq matières complet sous compte technique hébergé NON PROUVÉ : suspendu avant écriture, copies héritées sans snapshot ni preuve de contenu initial toujours présentes.
- [ ] Q104/Q48/Q206/Q73 suspendues : respectivement4/18/3/5 copies sans snapshot ; clés, texte ou liste pourraient changer. Q53 déjàC, aucun changement. Rapport docs/publication-coherence-bilans-2026-10-29-1924.md ; aucune donnée ni code applicatif modifié après publication.


## Onze questions validées — cohérence ciblée 29/10 17:58 UTC
- [x] Audit avant écriture : sections600/601/602 non partagées avec TA28 ; affichage snapshots5/11 remplacé par contenu actuel via questionsSnapshotCorrigees ; futurs600–602 figés depuisJSON, pas canonique.
- [x] RisqueQ104 prouvé :15 snapshots TAXI600,9 ancienne cléC/6 cléB ; copies non terminées600/601/602=10/8/4. STOP : aucune donnée pédagogique modifiée.
- [x] Trois tests fictifs réellement exécutés PASS : reproduction du remplacement rétroactif, snapshot source inchangé ; compilation automatique OK18:01:19Z. Aucun test compte hébergé ni envoi.
- [ ] Q104, typographie48, Q206 et libellé73 suspendus : protection affichage/barème des passages commencés et copies héritées non garantie ; accord distinct pour préparer futur-only requis. Q53 conserveC ; aucun ajout des exclusives59/112–114/198–199.
- [ ] Compte technique/UI/publication suspendus : aucune correction livrée avant protection prouvée ; rapport docs/onze-questions-coherence-2026-10-29.md et test diagnostic fictif conservés.

## Sauvegarde Admin 57014 — Q2 « prise en charge » — 29/10 14:12 UTC
- [x] Q2 identifiée : TAXI 11 / Bilan examen Réglementation locale (606) Q2, ligne officielle partagée TAXI 11/606 + TA 28/701 ; base déjà « 3,10€ » (module 14:11:32, liste officielle 14:11:41), journal humain 4 € → "? € → 3, € → 3,10€.
- [x] Cause prouvée sur copie jetable : contrôle de liaison Bilans VTC↔TAXI (290 liens) ≈4 s sur ≈5 s par sauvegarde du module 11 ; limite serveur 8 s → 57014 sous charge.
- [x] Correctif 0220 appliqué : même contrat en une passe, 12/12 cas équivalents (résultat, module, journal, liens), sauvegarde ≈1 s ; persistance/répétition/ancien onglet vérifiés sur copie jetable.
- [x] Éditeur : succès seulement après relecture module + liste officielle ; refus = bandeau « NON enregistrée », Réessayer explicite, alerte avant fermeture ; 50 tests PASS. Non publié.
- [ ] Clic réel Admin/élève sur Q2 en production NON fait (écrirait des valeurs intermédiaires dans le contenu réel pendant des bilans en cours).

## Protection futurs bilans TAXI/TA — accord 29/10 13:49 UTC
- [x] Prototype futur-only TA testé PostgreSQL jetable : nouvelles listes84/40, copies existantes non migrées et toujours saisissables, réouverture figée, accès refusé hors propriétaire. NON activé.
- [x] Corrigé les fausses intentions d’édition dans bilans11/28 : ID explicite, ensemble d’édition propre à l’instance ; ouverture réelle Q68 sans écriture +2 tests composant réel isolé PASS. Q68 rétablie A seule14:01:18Z après réécriture concurrente13:57:03Z, origine exacte NON PROUVÉE.
- [x] Rapport docs/bilan-ta-future-only-2026-10-29.md ;214 snapshots inchangés. Aucun mail/publication ni compte élève réel utilisé.
- [ ] Protection complète TA puis ajouts47/48/49 : bloqués,7 copies locales TA encore en cours, sans contenu initial complet ni garantie des brouillons navigateur ; aucune reconstruction effectuée. Six incertaines restent suspendues.
- [ ] Q73 masquage et renotation : ne pas toucher, la liste affichée participe aux calculs. Tests soumission de bout en bout sous compte technique hébergé NON PROUVÉS.
- [ ] Contrôle global :90/91 PASS, écart empreinte ancien module connaissances-ville hors périmètre non modifié. Cause concurrente Q68 et protection serveur durable nécessitent preuve de l’origine avant nouvelle modification.

## Cohérence bilans examen TAXI/TA nationale et locale — 29/10 13:35 UTC
- [x] Neuf absences locales auditées :47/48/49 valides,45/51 mauvaises clés,53 aucune bonne option,52 ambiguë/doublon de notion,46/54 procédure non prouvée.
- [x] Migration0219 appliquée : futurs TAXI11/606=40 canoniques, réouvertures intactes ;214 snapshots empreinte identique. Nationale84, sept ajouts antérieurs conservés, Q73 inactive.
- [x] 12 assertions SQL jetables +132 tests exhaustifs +23 tests existants PASS ; aperçu local TAXI/TA40 confirmé, national TA ouvert. Rapport docs/bilan-examen-coherence-2026-10-29.md. Aucun mail/publication.
- [ ] Ajouts47/48/49 et circuit futur-only TA : STOP,8 copies locales TA actuellement en cours sans snapshot ; ajouts modifieraient leur liste. Autorisation de préparation sûre/arbitrage requis.
- [ ] Q45/51/52/53 formulations/clés et46/54 suspendues : confirmation utilisateur nécessaire. Q73 historique non neutralisée : accord distinct requis.
- [ ] Incident lecture : première ouverture éditeur réécritQ68 enA+D ; A seule rétablie avecCAS, suivantes protégées sans écritures. Cause exacte et correctif NON PROUVÉS. Parcours élève autonome/soumission réelle non vérifiés.

## QCM document TAXI Bilan examen nationale — 29/10 10:31 UTC
- [x] Module11/605 confirmé, 9 manquants ; Q2 équivalent605/40, Q12 équivalent605/65, Q4 suspendue et DGFiP déjà dans605/18 ; QRC exclues, clés B+C/C+D/B+D contrôlées. Rapport docs/qcm-taxi-bilan-national-2026-10-29.md.
- [x] Accord explicite 29/10 10:56 UTC : neuf QCM1/3/5/7/10/11/13/14/16 insérés seuls dans la section605 partagée TAXI11/605 + TA28/700 (IDs89–97). 68→77 actifs ;2 301 anciennes questions,62 modules et64 bindings strictement identiques. QRC exclues,2/12 non dupliquées, DGFiP conservée.29 tests PASS ; copie navigateur TAXI/TA77 questions, clics/corrections/reload/Admin PASS, zéro écriture élève. Aucun code applicatif ni publication. Rapport exact mis à jour ; compte élève hébergé/soumission Cloud/temps réel production NON PROUVÉS, nécessitent compte technique et contrôle distinct sans données réelles.

## Intégrité montants Cas pratique — 29/10 10:19 UTC
- [x] Module12/exercice306/question4/A identifié ; JSON/canonique 8€ déjà enregistré, journal humain €/_€/8€ ; 31 848 choix JSON et 2 261 questions canoniques actifs inspectés, zéro € seul actuel. Rapport docs/integrite-montants-2026-10-29.md.
- [x] Révision locale pour accusés JSON/canoniques, € seul gardé localement, minuteur annulé à Enregistrer ; 79 tests distincts PASS, navigateur composants réels isolés/sauvegarde lente/clic/reload et coche module13 préservée, build OK ; aucun écrasement Cloud ni renotation.
- [ ] Compte technique hébergé, notation monétaire ouverte, historique complet et temps réel réel NON PROUVÉS ; publication ciblée non disponible sans embarquer travaux inachevés.

## Contrôle connaissances questions retirées — 29/10 10:04
- [x] Lecture : retraits Admin 199/201/204/207, tombstone antérieur69 ; 221 questions actuelles, IDs226/227 de la capture conservés. Cause navigateur Ahlem NON PROUVÉE.
- [x] Préparé module13 seul : membership/tombstones avant canonique, aucun fallback de liste ni prune concurrent, compteur écran courant, relecture événement/reconnexion sans polling ; aucun contenu Cloud modifié.
- [ ] 20 tests PASS et page ouverte fictive TAXI/TA 3→2 ; saisie TA, vrais comptes autonomes et événement realtime/reload restent NON PROUVÉS. Publication ciblée bloquée par travaux inachevés globaux ; rapport docs/controle-connaissances-sync-2026-10-29.md.

## Quiz jours fériés Cas pratique — 29/10
- [x] Quiz complémentaire de 11 dates 2026 en haut du module 12, identité distincte ; anciens quiz serveur empreinte identique, aucune obligation/jalon ajouté.
- [x] Protection serveur 0216 appliquée, 41 tests PASS et ouverture visuelle fictive 11 questions, compilation OK ; interface non publiée.
- [ ] Enregistrement complet avec compte élève autonome NON PROUVÉ ; aucun test d’écriture sur données réelles.

## Cas pratique TAXI absent — 29/10 09:12 UTC
- [x] Lecture seule : module 12 absent des affectations de 12 dossiers théoriques avec accès actif ou session actuelle, dont 7 en session TAXI/TA 26/10–16/11 ; aucune validation module 12 enregistrée pour ces dossiers.
- [x] Cause repérée : formulaire de création omet 12 dans les six listes TAXI/TA ; modification omet 12 dans les trois listes TA. Catalogue correct, dashboard respecte les listes explicites. Pratique seule [6] exclue.
- [x] Accord « Oui, les 12 dossiers » : module 12 ajouté seul aux douze listes avec comparaison exacte avant écriture et douze événements audit ; formulaires création TAXI/TA et modification TA corrigés.
- [x] Empreintes dossiers hors modules, réponses, validations et relevés figés identiques pour les 12 ; 39 tests PASS, ouverture module fictif avec 11 quiz/62 questions, compilation OK. Accès enregistrés en production ; formulaires non publiés.
- [ ] Connexion élève autonome NON PROUVÉE ; Salem Rachid reste abandonné et Pndukyan Harutyun garde sa date d’accès expirée, aucune réactivation. Les dénominateurs live peuvent inclure le module rétabli, sans modification des jalons historiques.

## Quiz non réalisés en rouge — 29/10
- [x] Cartes communes/équipements/pratique et listes d’activités : non réalisé en rouge, même facultatif ; dispense distincte de réalisation, jalons et preuves inchangés.
- [x] 74 tests fictifs PASS, clics parties 32/33 et cartes rouges 58/24 vérifiés dans l’aperçu Admin fictif, téléphone et compilation OK ; aucune publication.
- [ ] Connexion autonome élève et contrôle de chaque quiz historique masqué NON PROUVÉS ; limites du chantier Réalisés conservées.

## Pratique signée à valider EDOF — 29/10
- [x] Demande 09:51 : tri dernière date pratique décroissante, en-tête « Dates de formation pratique », retrait confirmé réversible par compte/navigateur uniquement ; 14 tests PASS, navigateur Admin réel annuler/retirer/recharger/réafficher vérifiés, compilation OK. Aucun dossier/signature modifié ; non publié.
- [x] Financements personnels exclus : 12 tests PASS, liste Admin 25 personnes vérifiée ; non publié.
- [x] Badge E = dernière validation EDOF ; liste de pratiques réellement signées, excluant E, absents/masqués/attente/théorie ; aucune écriture de dossier ou preuve.
- [x] 8 tests PASS et tableau de bord Admin connecté : 38 personnes avec dates, capture vérifiée, compilation OK ; rafraîchissement du badge après sauvegarde CRM corrigé. Non publié.

## Quiz communes session TAXI/TA — 29/10
- [x] SOUICI Ahlem identifiée ; onze élèves comparés, anciennes séries 7020/7021 10/6 vs activités 58/24, snapshots 241/282 expliqués. Rapport docs/quiz-communes-session-2026-10-29.md.
- [x] Module 7 : second filtrage concurrent d'ouverture désactivé, accès directs par IDs et distinction historique ; aucune écriture de preuve/affectation/contenu.
- [x] 72 tests PASS ; aperçu Admin fictif TA/TAXI, clics réels parties32/33→58/24, téléphone vérifié, compilation OK. Preuves entières couvrent vides Ahlem/CIHAN/Pogos ; tests Réalisés/émargement repassés.
- [ ] Connexion compte technique autonome et reproduction réseau dans deux ordres restent NON PROUVÉES ; production frontend non publiée pour ne pas embarquer les travaux globaux inachevés.

## Émargement trente minutes avant — 29/10
- [x] Règle centrale réelle −30 min, contrôles serveur et sélection théorie/pratique ; migration et fonction ciblées déployées, 2 996 lignes historiques empreinte identique.
- [x] Minuteur prochaine ouverture + retour fenêtre, priorité identité/conflit/présence/inactivité, date et heures réelles dans la feuille.
- [x] 11 tests SQL jetables + 36 frontend + 7 attestations PASS ; modal fictive vérifiée sans envoi, compilation OK. Rapport docs/emargement-trente-minutes-2026-10-29.md.
- [ ] Parcours réel compte fictif et popup à la frontière bureau/mobile : session technique refusée (approbation indisponible). Un test historique de classification hors périmètre échoue.
- [ ] Publication frontend ciblée bloquée : outil capture tout le projet, travaux Réalisés/autres inachevés ; aucune publication globale.

## Modules réellement complets — 29/10
- [x] Diagnostic lecture seule : drapeau completed insuffisant, réponses null réelles, faux Réalisés des modules dispensés ; 466 copies candidates/214 dossiers, pas de mutation.
- [x] Projection des vides historiques, compteurs CRM/élève, liens par quiz et cartes rouges ; 68 tests ciblés PASS, série élargie 77 PASS/1 FAIL contrat source ancien ; build OK. Rapport docs/modules-realises-preuves-2026-10-29.md.
- [ ] Connexion compte technique et contrôle mobile réel bloqués par approbation indisponible ; premier aperçu simulé bureau concluant, mobile masqué et nouvelles recherches échouées.
- [ ] Périmètre historique complet pages/archives tronquées et règles facultatives à vérifier avant publication ; aucun calcul d'heures ni jalon historique modifié. Non publié.

## Support PDF Pratique TAXI — 28/10 16:52 UTC
- [x] Support consultable uniquement module 6, 19 images sans PDF original, sans activité ni callback de fin ; acquis et jalons inchangés.
- [x] 22 tests PASS, compilation OK ; aperçu administrateur bureau/mobile : ouverture et navigation 19/19 vérifiées avec les images exactes interceptées localement. Non publié.
- [ ] Chargement CDN réel et compte élève NON PROUVÉS : même limitation d’accès hébergé que VTC ; aucune donnée ni droit modifié.

## Support PDF Pratique VTC — 28/10 16:44 UTC
- [x] Consultation complémentaire module 8 uniquement, 19 images hébergées ; aucun PDF original mis en ligne, bouton télécharger/imprimer absent.
- [x] Aucun cours/page/activité/jalon ajouté ; 19 tests PASS, compilation OK. Aperçu admin connecté bureau/375 : ouverture et navigation jusqu'à 19/19, pages rendues visuellement vérifiées avec images exactes interceptées (médias CDN absents du serveur local).
- [x] Non publié ; captures d'écran techniquement possibles. Journal docs/support-pratique-vtc-lyon-2026-10-28.md.
- [ ] Chargement CDN et parcours compte élève réel NON PROUVÉS : accès aux domaines hébergés refusé 403 depuis le sandbox ; aucun droit ni donnée élève modifié.

## Régression affichage quiz module 7 — 28/10 14:44 UTC
- [x] Cause lecture et aperçu réel : panneau communes inséré dans l'en-tête de toutes les pages, avant le quiz sélectionné ; pas de remplacement des données.
- [x] Panneaux limités aux quiz 7020/7021 correspondants ; bandeau jeux global retiré des autres étapes du module 7, validation/données inchangées.
- [x] Aperçu administrateur connecté bureau/375 : Consulats29/Hôpitaux30/Musées41, communes 58/24 ouvertes, lien Légende propre ; 17 tests PASS, compilation OK. Rapport docs/correction-affichage-module7-2026-10-28.md ; non publié.
- [ ] Parcours élève technique module 7 et validation/navigation Précédent/Suivant : aucun compte technique autorisé module 7 disponible ; aucun droit ajouté ni faux quiz validé pour tester.

## Textes à trous jeu Lyon — 28/10 14:37 UTC
- [ ] Complément 14:41 : isoler résultats par joueur/jeu/quiz/tentative/version ; réidentifier à finishedAt + 24 h exactement, sans prolongation au reload ; changement joueur avant 24 h sans fuite ni déconnexion formation.
- [ ] Tests fictifs requis : A quiz1→quiz2, B même appareil, 24 h−1/exact/+1, reload/multi-onglets, réponse lente A après B ; blocage identique : projet propriétaire lecture seule ici.
- [x] Reproductions supplémentaires par sauvegardes fictives sur site publié : résultat national transféré vers locale ; identité B modifiée dans second onglet sans masquer le résultat A ; champ de fin 48 h ignoré. Ce ne sont pas des connexions/completions réelles ; détails et captures dans le rapport commun.
- [x] Projet propriétaire Lyon Explorer Map identifié ; audit des deux textes (31/28 trous, banques 46/45), aucune réponse absente initialement.
- [x] Reproductions publiques anonymes bureau/375/768 : doublons limitent à 30/31 et 26/28 ; banque nationale copiée vers locale ; ancienne banque incomplète restaurée. Rapport docs/audit-textes-trous-lyon-2026-10-28.md.
- [ ] Correction bloquée : l'autre projet est accessible uniquement en copie lecture seule depuis cette conversation ; ouvrir Lyon Explorer Map pour appliquer les correctifs, sans toucher historiques/jalons.
- [ ] Après correction dans le projet propriétaire : preuve finale avec compte technique, clavier, changement joueur, remplacement/doublons, ancienne sauvegarde ; aucune publication globale ni correction livrée ici.

## Quiz communes visibles — 28/10 14:31 UTC
- [x] Lecture seule : deux quiz déjà présents en aperçu module 7 ; absents de la liste admin Édition, source code indépendante du JSON serveur.
- [x] Affichage ajouté aussi sous Exercices dans Édition, sans duplication de questions ni écriture élève.
- [x] Ouverture réelle admin des deux quiz (58/24 questions) dans Édition et présence en Aperçu ; aucune réponse soumise. 25 tests PASS dont exigences et volume nuls pour modules terminés avant ajout ; compilation OK. Nouvelle visibilité Édition non publiée, aucun déploiement global.

## Livres de formation 70–73 — suite 28/10 13:20 UTC
- [x] Audit fiches/définitions/QRC contre les 4 livres ; 2 corrections justifiées (définition honorabilité VTC/TAXI en nouvelle version, réponse ADS du cours TA) ; rapport docs/livres-formation-audit-2026-10-28.md.
- [x] Accès testés (admin, anonyme, jeton invalide, page hors livre, expiration, stockage public) ; 2 erreurs serveur corrigées et déployées ; aperçu bureau/tablette/mobile 4 livres.
- [x] Anciens livres archivés en privé ; références actives supprimées.
- [ ] Anciennes adresses publiques encore valides : suppression en attente de la résolution du calcul figé.
- [ ] Réponse attendue « Les mairies. » aux examens blancs TAXI/TA : nouvelle version + publication explicite, à valider.
- [ ] Tests élèves réels TAXI/TA/VA et clics de connexion : bloqués (approbation de connexion indisponible, aucun compte technique de ces formations).
- [ ] Publication des fiches/du correctif Imprimer : en attente d'accord.

## Kevin FERNANDES — « attente » sur EB4/EB5 — 28/10 09:10 UTC
- [x] Cause prouvée : 0 QRC en attente côté serveur (toutes corrigées IA, notes définitives) ; l'écran rejetait le passage serveur car l'ancienne fiche ne garde qu'un résumé des questions, puis affichait l'ancienne copie jamais corrigée.
- [x] Correctif d'affichage seul (matières à QRC, mêmes réponses, passage définitif) + 6 tests ; même cause chez 13 élèves / 61 matières, corrigée par le même affichage ; aucune IA relancée.
- [ ] Publication en attente d'accord (embarquerait Quiz 20 questions, PDF, émargement).

## Feuilles d’émargement invisibles après connexion — 28/10 09:00 UTC
- [x] Cause prouvée : la lecture de l’agenda est réservée Admin ; côté élève elle revenait vide sans erreur → aucune feuille due (11/11 élèves session TAXI/TA, 0 signature depuis le 26/10).
- [x] Lecture serveur dédiée (horaires des semaines de ses sessions seulement), refus = bandeau « vérification impossible » ; feuille contrôlée aussi en ouvrant un module directement (bandeau, fenêtre en revenant à l’accueil) ; TA = première semaine comme l’Admin.
- [x] 6 tests nouveaux PASS ; calcul réel lecture seule : 55 feuilles dues (5 × 11) au 28/10 ~10h Paris ; navigateur isolé élève fictif : fenêtre + bandeau, panne, module direct, mobile.
- [ ] Publication du site : en attente d’accord, car elle embarquerait aussi le travail Quiz Équipements 20 questions et le téléchargement PDF de ce matin.

## Refaire une matière d’examen blanc — 27/10 22:52 UTC, autorisation ciblée
- [x] Relire les circuits actuels et protections Kevin/QRC ; ne pas réutiliser la reprise neutralisante.
- [x] Préparer bouton résultat/temps écoulé, reçu serveur idempotent, copies/files conservées ; SQL non appliqué au backend partagé.
- [x] Tests isolés SQL et 36 tests frontend, bouton PC/mobile fictif, compilation OK ; aucun IA/mail/publication.
- [x] Ajouter historique par ID/snapshot lecture seule, bouton transition et retour/navigation par compte ; 38 tests frontend + 14 SQL simplifiés PASS, build OK.
- [ ] Extension ciblée NON APPLIQUÉE : test catalogue réel FAIL (clôture T2 modifie détails T1 via ensure_quiz_result_on_matiere_completion). Mapping V2 initial et consommation admin multi-entrées à sécuriser avant parcours complet fictif/déploiement ; aucun front global publié. Rapport `docs/refaire-matiere-etat-2026-10-27.md`.

## Questions ambiguës TAXI/TA vérifiées — 27/10 15:56 UTC, accord explicite
- [x] Appliquer seulement 70-11, 71-47 (explication), 71-10 (choix B DGFiP/TVA), 73-27 (énoncé le.taxi suspendu), 75-19 (exception ALD) si réponses/notes/terminés intacts ; journal avant/après.
- [x] Bloqués et signalés : 70-73 B, 74-6 D, 73-25 relettrage (réponses déjà enregistrées sur ces lettres) ; 70-19/65/78/87 et 74-17 inchangées.
- [x] Contrôle avant/après : 305 lignes de réponses identiques, 5 questions modifiées, 5 entrées de journal ; affichage écran élève NON PROUVÉ ; pas de publication.

## Rectification attestation Documents de formation — 26/10 17:16 UTC
- [x] Présentiel : premier jour des cours, dernier jour incluant la pratique ; supprimer les heures e-learning du PDF, total présentiel seul.
- [x] Signature et tampon privés de Documents dans la nouvelle attestation ; originaux préservés, aucun envoi/publication.
- [x] 25 tests PASS ; deux PDF téléchargés depuis Documents Formation admin et inspectés sur toutes leurs pages. Hakim ZAOUI : 14 septembre–21 octobre 2026, théorie 40 h + pratique 6 h = 46 h, aucune ligne e-learning. Hedy Khalfoun : jalons 41,7 %, aucune heure. Mise en page corrigée (total sorti du cadre et seconde page inutile), signature/tampon visibles sur une page ; compilation automatique OK. Contrôle exhaustif de tous les dossiers NON PROUVÉ.

## Signature et tampon séparés — 26/10
- [x] Extraction fidèle du PDF fourni, PNG transparents ajoutés comme nouveaux objets privés admin uniquement, sans remplacement.
- [x] Onglet adjacent à « À remplir / signer », téléchargement séparé, insertion/déplacement/taille dans une nouvelle version PDF locale ; circuit destinataire et originaux inchangés.
- [x] Aperçu admin connecté : deux images privées chargées, insertion indépendante et nouvelle copie PDF téléchargée ; page PDF inspectée, chevauchement initial corrigé. Compilation automatique OK ; aucun envoi/enregistrement de document, aucune publication. Téléphone et déplacement tactile NON PROUVÉS.

## Attestation fin de formation — 26/10
- [x] Présentiel : dates en toutes lettres françaises + durée totale ; e-learning : uniquement le taux total de jalons détaillé (relevé figé prioritaire, erreur de lecture = « indisponible », jamais de chiffre fabriqué).
- [x] 5 tests PASS, tsgo OK ; PDF réels vérifiés dans l'aperçu : Yasin LAIDAOUI (présentiel, dates longues + 61h48) et Hedy Khalfoun (e-learning, taux 41,7 % + détail par jalon, sans dates ni heures).
- [x] Publié 26/10 17:05 UTC (demande explicite « tout publier »), site attendu https://gestion.ftransport.fr.

## Bilan = somme des cours par matière — 26/10, accord explicite
- [x] Locale TAXI+TA : projection canonique 73/76/74/75 (29+29+22+25=105) vers section 204, identités historiques conservées, 242 lignes intactes en base.
- [x] T3P (133) et Gestion (150) : projection JSON depuis module 10 vers module 9, identités par source_exercice_id/source_question_id, protection d'enregistrement (version serveur rétablie avant toute sauvegarde).
- [x] 30 tests projection + 72 tests voisins PASS, tsgo OK, build OK ; aperçu admin vérifié : TAXI 133/150/241/103/126/98/105, TA 98/105 ; module_editor_state 9/27 inchangés (aucune écriture Cloud).
- Publié 26/10 17:05 UTC (accord explicite) ; réponses élèves individuelles relues non prouvées. Rapport docs/bilan-somme-cours-2026-10-26.md.

## Bilan TA nationale — périmètre exclusif 26/10 14:54 UTC
- [x] Affichage national TA seul : mêmes 64 + 34 questions actuelles ; ancienne liste TA non rattachée et 195 lignes partagées conservées, TAXI et enregistrement inchangés.
- [x] 32 tests PASS, diff avant/après, aperçu admin TAXI98/TA98 et sections locales à 242 identiques ; empreintes Cloud identiques, zéro écriture Cloud ; publié 26/10 17:05 UTC. Rapport docs/bilan-ta-nationale-selection-2026-10-26.md ; chaque résultat individuel NON PROUVÉ.

## Bilan TAXI nationale — autorisation ciblée 26/10
- [x] Sélection seule : 64 Partie 1 + 34 Partie 2 actuelles, sans l'ancienne question 15 ; identités Bilan existantes conservées, TA et les 195 lignes intacts.
- [x] 50 tests PASS ; aperçu admin réel TAXI98 / TA195, résultats accessibles ; compilation automatique OK, empreintes Cloud identiques. Rapport docs/bilan-taxi-nationale-selection-2026-10-26.md.
- Publié 26/10 17:05 UTC (accord explicite) ; lecture de chaque résultat individuel côté élève NON PROUVÉE, aucune donnée écrite.

## Refus P0520 éditeur TAXI — 26/10
- [x] Cause reproductible : sept anciennes tombstones absentes de la projection (73:6, 74:14/15/16/18/19, 76:28) retransformées en suppressions ; 964 questions JSON, 34 Partie 2 actives.
- [x] Copie serveur complète + intentions ID explicites, arrêt sur erreur de lecture, pas d'upsert canonique historique/renumérotation implicite ; P0520/CAS inchangés.
- [x] 167 Vitest + 3 PostgreSQL jetable PASS ; navigateur fonction isolée PASS, module10 JSON strictement identique avant/après ; compilation automatique OK ; rapport docs/repair-admin-save-p0520-2026-10-26.md.
- [ ] Vraie sauvegarde et réouverture Cloud de l'éditeur NON PROUVÉES : attend publication autorisée et protocole sans modification de questions réelles ; aucune publication effectuée.

## Nationale TAXI Partie 1 — rectification 26/10 : enrichir le COURS, pas les questions
- [x] Proposition 25 questions 99–123 retirée de l’interface ; anciens fichiers de travail non connectés, aucune suppression Cloud.
- [x] Audit 64 positions/IDs/UUID versus PowerPoint reçu, 17 notions absentes et 11 insuffisantes ; docs/audit-cours-nationale-partie1-2026-10-26.md.
- [x] PowerPoint/PDF 30 diapositives, 16 textes/images originaux identiques + 14 compléments avant conclusion ; relecture admin module10/cours10014 seulement, Partie2 et suivi élèves inchangés.
- [x] 28 tests PASS, validation PPTX PASS, chevauchements corrigés puis 14 diapositives réinspectées ; compilation automatique OK, liens visibles ordinateur/téléphone. Fichiers publics valides ; téléchargement localhost renvoie HTML (assets non servis localement), donc téléchargement complet via aperçu NON PROUVÉ.
- Activation élève/publication en attente d’accord ; actualité exhaustive des durées juridiques citées depuis le recueil officiel 2022 NON PROUVÉE. Aucun changement Cloud ni données élèves.

## Revue 8beeefc1 — délais français, 24/10
- [x] Corriger uniquement la classification délai/48h et codes SQL temporaires ; conserver les anciennes files bloquées.
- [x] Tests réels avant/après (16 échecs avant, 54/54 réussites après), journal ciblé ; aucune requête production/publication. Compilation automatique OK ; typecheck manuel NON EXÉCUTÉ (interdit par l’environnement).

## EB2 Khalfoun et chargement examens — 24/10, accord explicite
- [x] Corréler logs disponibles : traces navigateur présentes, logs serveur 22/23 absents ; HTTP400 exact NON PROUVÉ. Empreintes de référence exactes identiques avant/après.
- [x] Corriger refus persistants, reprise session et lectures bornées sans modifier données pédagogiques ; diagnostics sans réponses/secrets et 503 temporaire dans la fonction ciblée déployée.
- [x] Tests fictifs avant/après (4 échecs reproduits puis réussis), 244 tests, navigateur file conservée/refus non confirmé ; journal. Aucune publication frontend globale.
- Limites : appareil de Khalfoun inaccessible, cause historique 400/401 non prouvée ; version EB2 VTC V2 non publiée réellement, aucune version créée. Interface corrigée seulement dans aperçu, publication ciblée à décider sans autres brouillons.

## Dossier de bienvenue e-learning — 24/10
- [x] Afficher les dates réelles d’accès à l’étape 12 par lecture sécurisée du dossier, sans repli sur les dates de formation.
- [x] Ajouter deux confirmations obligatoires avant génération : accès non reçus/contact centre ; journée pratique dans les trois semaines à compter du lendemain de l’examen théorique.
- [x] Conserver les confirmations et dates dans les futurs dossiers/PDF uniquement ; contrôle complet sur données fictives, sans mail ni modification des documents existants.
- Fonction de lecture sécurisée déployée seule ; interface non publiée. Contrôles ordinateur/téléphone avec transports interceptés, tests ciblés et compilation automatique réussis. Enregistrement réel volontairement non testé ; journal : docs/journal-bienvenue-engagements-2026-10-24.md.

## Heures des sessions — 23/10 15:38 UTC
- [x] Corriger le double comptage des sessions théoriques communes chevauchantes dans la présence CRM ; TAXI 90 h + pratique 6 h, filières VTC/TA et sessions distinctes conservées.
- [x] 55 tests ciblés PASS ; compilation automatique OK ; fiche réelle admin Yasin contrôlée en lecture seule : 90 h théorie / 6 h pratique / 96 h total, taux total 100 %. Aucun changement de données ni publication.
- [x] Même contrôle pour Mohamed ISSAOUNE (23/10) : mêmes deux sessions de septembre chevauchantes ; fiche lue en lecture seule : session 72 h signées / 90 h (80 %), pratique 6/6 (100 %), total 78/96 = 81,3 %, dernière signature 23/10/2026. Aucun changement de code ni de données.
- Limite : un test annexe existant sur l'anomalie d'une feuille masquée échoue (attend une anomalie absente) ; code de classification non modifié. Contrôle individuel de tous les autres dossiers non exécuté. Journal : docs/journal-heures-sessions-2026-10-23.md. Correctif NON PUBLIÉ (en attente d'accord).

## Dates des activités e-learning — 23/10
- [x] Afficher première/dernière activité réelle dans TAUX E-LEARNING pour tous les dossiers, connexions seules exclues ; heures et données inchangées.
- [x] 39 tests ciblés réussis (4 fichiers), compilation automatique OK. Vérification CRM authentifiée non prouvée : session injectée reconnue comme apprenant introuvable, fiche admin inaccessible. Aucune publication ni écriture Cloud.

## IA QRC : traçabilité et reprise des 6 QRC Aba — 23/10 09:05 UTC
- [x] Trace par appel, budget de 140 s, migration 0199, fonction déployée, reprise unique des 6 : toutes corrigées, empreintes identiques. Journal : docs/journal-qrc-ia-trace-reprise-6-2026-10-23.md

## Pratique TAXI — exactement 3 exercices Rhône 2026 — 21/10 16:34 UTC
- [x] Recherche indépendante : copie de l’arrêté 69-2026-02-19-00002 lue, extraits articles/pages et limites dans docs/preuves/taxi-rhone-2026/sources.md ; site préfectoral en maintenance.
- [x] Ajout module 6 uniquement : calendrier/QCM 11 dates, quiz unique 30 questions, un exercice RTST 13 étapes/52 saisies. Les 10 cours et 1 quiz préexistants inchangés.
- [x] Gel prouvé fictivement : 100 %, date initiale, activités facultatives visibles ; VTC/VA inchangés ; TAXI/TA utilisent leur module 6 réel.
- [x] Backend explicitement partagé : configuration même instance ; aucune écriture élève/test droits. Garde serveur additive préparée uniquement, pas appliquée ; suivi réel indisponible tant que protection absente, aucun faux succès.
- [x] 90 tests unitaires/persistance/gel/files + 32 tests travaux antérieurs après adaptation cible TAXI ; PostgreSQL local jetable (11 assertions) ; Playwright quatre dimensions, trois exercices, réouverture/rechargement/isolement/panne et 13 étapes terminées avec transport fictif. Compilation automatique OK.
- [x] Empreintes avant/après : 62 modules bbb6f08b16f0d4f4ef29e3d9db32edbd ; 57 versions d4971facecd63dca241b9007da361b36 ; releve_jalons_gels 0 lignes ; 7 fichiers protégés inchangés. Journal détaillé conservé.
- [ ] NON PROUVÉ : sauvegarde/validation sur Cloud avec vraie session et tous triggers existants (protection non appliquée) ; vraie tablette physique ; annexe ZUPC actuelle, fauteuil, refus sécurité ivresse. Aucun chantier antérieur abandonné ni publié.
- NON PUBLIÉ ; aucune acceptation du brouillon, aucun envoi ni correction IA élève.

## Carte des jeux Lyon agrandie — 21/10 12:45 UTC
- [x] Jeux MONUMENTS et QUARTIERS (module 8 PRATIQUE VTC uniquement ; module 6 TAXI sans jeu, vérifié en base) : carte nettement plus grande, largeur disponible, hauteur confortable tablette, responsive ordinateur/mobile, panneaux sans écraser la carte, mode plein écran, zoom/déplacement faciles, recentrage.
- [x] Aucune modification de monuments, quartiers, questions, réponses, corrections, progressions ou signatures ; règles et scores préservés ; aucun message aux apprenants.
- [x] Vérifier rendu tablette portrait/paysage et fonctionnement du jeu après agrandissement ; indiquer si publié ou non.
- Fait 21/10 12:57 UTC : fenêtre du jeu ouverte d'office en mode agrandi (bouton Réduire/Agrandir conservé) ; carte en pleine largeur, hauteur ~72 % de l'écran (plein écran : tout l'écran moins les consignes) ; zoom molette/pincement proportionnel au geste et ancré sous le doigt/le curseur (plus de saut brutal), boutons +/−/recentrage inchangés ; étiquettes et retours au-dessus de la carte sans l'écraser.
- Preuves : 25 tests PASS (10 jeux Lyon dont 2 nouveaux sur le zoom : point sous le curseur fixe, bornes, amplitude proportionnelle ; 8 activités module ; 7 horloge appareil). Contrôle visuel Playwright sur page temporaire (supprimée après) : tablette portrait 800×1280 (carte 766×1040), tablette paysage 1280×800 (1246×560), ordinateur 1280×1800, mobile 390×844 ; jeu joué (étiquette + toucher + retour « Encore un essai »), zoom molette, recentrage, réduire/agrandir — captures /tmp/browser/jeux-carte/screenshots.
- Aucune écriture base : uniquement 3 fichiers frontend (CarteLyon.tsx, JeuxCartesLyon.tsx, jeuxLyonLogic.ts) + tests. Avertissements console forwardRef préexistants (TooltipProvider/Toaster), sans rapport.
- Limites NON PROUVÉES : pas testé sur une vraie tablette physique ; pas testé avec un compte élève réel connecté (mentaillage de session refusé sans accord) ; NON PUBLIÉ.

## Onglet signatures manquantes — 20/10 15:49 UTC

## Onglet signatures manquantes — 20/10 15:49 UTC
- [x] Onglet individuel avec liste lecture seule, aperçu, relecture et confirmation ; circuit mail existant sans envoi collectif ni modification des preuves.
- [x] 23 tests fictifs PASS ; navigateur CRM connecté : deux créneaux, aperçu et confirmation puis annulation, zéro erreur JS, écritures bloquées ; compilation automatique OK. 25 émargements et empreinte identiques avant/après ; journal ; aucune publication. Envoi réel NON PROUVÉ, volontairement non exécuté.

## Changement présentiel vers e-learning — 20/10 15:44 UTC
- [x] Identité de lecture liée au mode/heures + invalidation après modification ; total e-learning bleu, jalons rouges, présence session/pratique visible sur les deux modes et taux présentiel basé sur leurs heures prévues.
- [x] 35 tests PASS dont bascule fictive sur la même fiche montée avec signatures intactes ; compilation automatique OK. CRM Aba-Bakre lu sans écriture : total 75 % bleu, pratique 6/6 = 100 %, session non inscrite, présentiel 6/6 = 100 %. Aucune publication ; pas de changement réel de dossier pour le test.

## Total présence session + pratique — 20/10 15:39 UTC
- [x] Total live commun corrigé : heures prévues session + pratique, sans imposer 66 h au soir ; surplus théorie ne compense pas pratique manquante. Preuves et relevés inchangés.
- [x] 43 tests PASS (journée, soir, TAXI/TA, pratique absente, lecture impossible), compilation automatique OK. Deux fiches connectées lecture seule vérifiées : 46/46 = 100 %, 60/66 = 90,9 %. Non publié ; audit individuel de tous les dossiers NON PROUVÉ.

## Cohérence signatures — 20/10 15:35 UTC
- [x] Diagnostic : signed_at automatique à la création ; deux feuilles du 20/10 créées le 09/10 sans image. Compteurs harmonisés et anomalies signalées, données conservées.
- [x] 78 tests PASS ; compilation automatique OK ; CRM et PDF vérifiés 20/22, pratique 0/2, mention EDOF absente ; empreinte des 25 lignes inchangée. Pas de publication ni envoi.

## Mode formation et jalons — 20/10 15:30 UTC
- [x] Afficher présentiel/e-learning/mixte sur la fiche ; mettre en rouge le taux de jalons e-learning sans changer les calculs.
- [x] Trois tests classification PASS ; compilation automatique OK ; fiche ouverte contrôlée en lecture seule (Présentiel). Couleur sur une fiche e-learning réelle NON PROUVÉE ; aucune publication.

## Indicateur réinscription — 20/10 15:26 UTC
- [x] Badges dans Examen et Réussite et panneau mails : réponse signée, attente, inconnu ou lecture indisponible ; aucune inscription déduite, écriture ou publication.
- [x] 12 tests PASS ; compilation automatique OK ; huit badges Non renseigné contrôlés dans les deux vues connectées, aperçu accessible, zéro appel fonction.

## Panneau mail échec — 20/10 15:17 UTC
- [x] Aperçu et statut des documents existants de même examen, toutes versions ; aucun double envoi, écriture ou publication.
- [x] 50 tests PASS, compilation automatique OK ; contrôle CRM connecté : aperçu visible sans appel fonction, six mails envoyés et deux signés affichés, cases protégées. Journal conservé.

## Prévention générale QRC — 20/10 09:53 UTC
- [x] Diagnostic frais, réservation atomique, un item streamé par invocation, continuation bornée nouveaux passages seulement ; aucun traitement historique.
- [x] 180 tests Vitest + 8 SQL locaux + 2 flux fictifs PASS ; Deno types PASS, compilation plateforme OK ; fonction déployée et mauvais token refusé 403, empreintes identiques.
- [x] Publication publique vérifiée en navigateur : index-BcmV7BPt.js HTTP200 SHA2567ebe759489f176e708d50842e58c627d85e150d0ac5bedc1a41430ab93211325 ; connexion visible, zéro erreur JS, sans maintenance.
- [ ] Chaîne automatique réelle NON PROUVÉE : aucun autre appel IA élève autorisé ; reconnexion tablette Jean inaccessible, baseline historique4fcc… source exacte requise.

## Dossier bienvenue vert — 20/10 09:50 UTC
- [x] Dossier bienvenue vert pour Payé, Dossier complet ou Inscription validée ; affichage uniquement, 17 tests PASS, compilation OK. Non publié ; contrôle CRM connecté NON PROUVÉ.

## Affichage questions / publication — 20/10 08:53 UTC
- [x] Preuves SELECT Kevin et protections Jean ; limites tablette réelle conservées.
- [x] Cartes agrandies, comparaison présentation uniquement et écran synthétique vérifiés.
- [x] Bandeau temporaire publié puis retiré du code final.
- [x] 93 tests/12 fichiers, compilation automatique OK, empreintes actuelles identiques avant/après, publication finale demandée.
- [x] Déploiement final vérifié : index-P4KrySsp.js, sans bandeau, design présent.
- [ ] Baseline historique 4fcc… NON REPRODUITE : ancien releve_jalons_gels vide ; source exacte requise.

## Kevin / Jean — 20/10, reprise ciblée autorisée
- [x] Diagnostic frais : 503 upstream_stall 180 s, appel suivant annulé 70 s, trois QRC encore en attente ; Jean PGRST303 non capturé.
- [x] Reprise IA atomique bornée, trois QRC uniquement corrigées 20/10 08:50–08:51 UTC ; Q17 intacte, résultat définitif 12.
- [x] Expiration PGRST303 et rejet lecture jeux corrigés ; 75 tests PASS, compilation OK ; aucune publication frontend.
- [x] Trace Q3 conservée en base, affichée remplacée uniquement avec preuve finale serveur ; tests PASS.
- [ ] Reconnexion réelle et files de la tablette Jean : NON PROUVÉES, appareil inaccessible.

## Avertissement e-learning 50 % — 19/10 15:43 UTC
- [x] Périmètre présenté et plan approuvé avant code.
- [x] Bandeau accueil élève + rappel dernier jalon, indicateur TAUX E-LEARNING et filtre admin, sources horaires inchangées.
- [x] 97 tests fictifs PASS, 12 fichiers ; rappel et fermeture inspectés ordinateur/téléphone, compilation automatique OK ; journal, aucun blocage ni écriture pédagogique.
- Limites : parcours authentifié complet et filtre CRM à l'écran NON PROUVÉS ; aucun test réel élève, aucune publication demandée.

## Écarts émargements — 17/10 12:52 UTC
- [x] Horaires planning pratique prioritaires, journée et demi-journée ; générateur futur sans reprise rétroactive.
- [x] Signatures listes d’attente et historique masqué classés à examiner, sans faux présentiel ni fausse absence.
- [x] 104 tests et compilation OK ; fonctions SQL appliquées, publication frontend demandée 13:05 UTC (asset public à confirmer).
- [ ] Preuves humaines : attentes septembre Fiacre / statuts des trois listes attente / inscription théorie Aba-Bakre.

## Durées des devis e-learning — 17/10 11:01 UTC
- [x] Durées partagées VTC 66/TAXI 96/TA 36, Word/PDF et affichages correspondants ; anciens devis inchangés.
- [ ] VA : total présentiel non prouvé ; programme source 7 h sans ventilation pratique, confirmation centre nécessaire.
- [x] 16 tests fictifs PASS, comparaison des 12 DOCX (seules trois mentions durée changées), PDF/Word inspectés, navigateur PC/mobile, compilation OK ; aucun envoi ni publication.

## Contrat de formation individuel — 17/10 09:02 UTC
- [x] Intégrer près du devis et dans Documents formation, formulaire personnel, modèle et annexes, aperçu/PDF communs.
- [x] Contrôler jour Paris, 14 jours/prolongation distance, financement, identité, champs manquants, TVA/durées/échéancier et rôle admin serveur ; aucune ouverture pédagogique.
- [x] 40 tests PASS, téléchargement PDF complet et régularisation sur données fictives, 12 pages inspectées, ordinateur/mobile et non-admin ; compilation OK. Journal sans envoi/publication.
- Limites : saisie temporaire non enregistrée ; pas de service de conclusion/signature ni de contrôle serveur d’ouverture ; références légales du centre contradictoires à confirmer avant utilisation définitive. PDF complet non signé seulement, aucune conformité prétendue.

## Source des dates du devis — 17/10 08:54 UTC
- [x] Retirer le repli sur la fiche élève dans l’aperçu et les deux générations DOCX ; utiliser seulement le choix du devis, sans toucher aux historiques.
- [x] 10 tests PASS ; aperçu vide malgré date de fiche, sélection 22 octobre identique au DOCX téléchargé et à la page de signature ; envoi/signature simulés, zéro erreur JS, compilation OK 08:55:28 UTC. Aucun envoi réel ni publication.

## Date et signature des devis — 17/10
- [x] Date DOCX éditable, dates enregistrées et lien de signature explicite ; originaux UUID sans remplacement.
- [x] 9 tests PASS ; date 16/10, envoi intercepté, dates conservées et signature dessinée jusqu’à confirmation fictive ; compilation OK. Aucun envoi réel ni publication, réception réelle NON PROUVÉE.

## Dates pratiques dans les devis — 17/10
- [x] Proposer les journées explicitement typées du planning dans les devis pratiques, sans changer prix, réservations ou documents existants.
- [x] Cinq tests fictifs PASS, sélection navigateur 22 octobre confirmée parmi les 17/22/23 octobre TAXI, écritures bloquées ; compilation OK. Aperçu PDF et devis réel NON PROUVÉS ; aucun envoi ni publication.

## Corrections techniques autorisées — 17/10
- [x] Sessions fraîches, progression isolée, origine canonique manuelle, examens sans faux vide ; frontend publié le 17/10 à 09:16 UTC.
- [x] Documents 4 Mo, erreurs lisibles, reprise idempotente et conservation des versions ; mocks seulement.
- [x] Export append des trois tables CMA, manifeste versionné et reprise compatible ; fonction déployée sans invocation.
- [x] Diagnostic Bilan non activé ; aucune QRC modifiée, trois corruptions restent hors correction.
- [x] Tests isolés et trois empreintes strictement identiques ; journal détaillé, aucune donnée élève modifiée.
- [x] Finalisation « Continue » : revue indépendante version 6e0157ad, contrats incomplets bloqués, 100 tests PASS + navigateur ancien receipt sans renvoi, trois empreintes identiques.
- [x] Mise en service coordonnée : frontend validé 6e0157ad réellement servi à 09:16:23 UTC (index-CZVWE7Y1.js), puis upload-document-inscription déployé aussitôt ; OPTIONS 200 et GET 405 à 09:16:40 UTC, sans fichier réel.
- Limites : reprise totale Nika, ordre serveur d’écritures autosave concurrentes et prochaine sauvegarde réelle NON PROUVÉS ; authentification du déclencheur nocturne historique non migrable automatiquement sur ce projet.

## Compteurs validés et preuves QRC — 16/10
- [x] Revue formats legacy/snapshots : harness SELECT réel avant/après, compatibilité stricte et 93 tests PASS ; EB5/6 débloqués, EB4 tronqué conservé ; 7/83/86 empreintes inchangées, sans publication.
- [x] Corriger le compteur accueil depuis les identités du relevé validé, score et heures inchangés.
- [x] Rapprocher strictement le même passage et ses réponses pour la source QRC commune élève/admin ; ambiguïtés et erreurs non vérifiables.
- [x] Tests fictifs, lectures production SELECT uniquement et compilation ; aucune publication. Limite : QRC tronquée sans validation équivalente reste en attente.

## Cohérence signatures VTC journée — 15/10
- [x] Diagnostic lecture seule : objectif erroné 40 + 2 ; nouvelle règle utilisateur 20 + 2 = 22, heures inchangées.
- [x] Plan approuvé ; objectif VTC journée/soir 20 + 2 = 22, TAXI/TA inchangés. Lecture seule : 22 dates signées dont 20 images PDF et 2 sans image ; mention explicite. 172 tests PASS, bouton réel isolé → PDF fictif téléchargé, aucune erreur JS ; compilation OK ; journal, aucune écriture élève ni publication. Parcours réel complet NON PROUVÉ.

## ZIP Contrôle — signatures présentiel (15/10)
- [x] Diagnostic lecture seule : raccorder le PDF « Signatures session + pratique » existant au ZIP des formations présentielles.
- [x] Plan approuvé, raccordement réalisé ; 131 tests PASS, bouton réel avec sources fictives → ZIP téléchargé → PDF inspecté (3 signatures, versions session + pratique), build automatique OK ; journal ajouté. Aucune donnée élève modifiée, aucune publication ; parcours réel NON PROUVÉ.

## Base de présence VTC journée — 15/10
- [x] Accord : corriger les bases communes par filière, sans modifier heures ni signatures enregistrées.
- [x] 46 tests fictifs réussis ; carte VTC isolée 60/60 et pratique 0/6 vérifiées, aucune erreur JS ; compilation automatique OK ; journal ; aucune publication. Parcours réel élève non testé.

## Indicateurs à compter du 01/07/2026
- [ ] Affichage uniquement : objectifs présentiels VTC 66/TAXI 96/TA 36 ; total = signatures apprenant valides / créneaux attendus du planning, sans connexion/quiz.
- [ ] Rouge pour jalons e-learning et total présentiel ; tests fictifs, anciennes formations conservées, contrôle et publication autorisée.
- Fichiers : nouveau calcul/lecteur `suiviFormationIndicateurs.ts`, `useApprenantTauxRealisation.ts`, `ApprenantDetailPage.tsx`, `JalonsPonderesCard.tsx`, tests et règles `AGENTS.md` ; aucune écriture élève.

## Gestion partie 2 — cadrage 38 et 40 (13/10)
- [x] Corriger uniquement la géométrie des deux encadrés droits du support actuel ; originaux, textes et styles intégralement conservés (comparaison XML hors géométrie).
- [x] PDF/PPTX CDN téléchargés, validation PPTX et 52 tests ciblés réussis ; rendu isolé ordinateur/tablette/mobile sans compte élève ni erreur JS. Défaut de centrage au zoom détecté puis corrigé pour rendre les deux bords accessibles.
- [ ] Publication frontend : non effectuée, nécessite « Publier → Mettre à jour » ; les nouveaux médias CDN seuls ne prouvent pas la publication du correctif.

## Formulaires — PDF de toutes les signatures
- [x] Export lecture seule des signatures réelles (théorie/pratique), dates et horaires séparés de l'instant de signature ; toutes versions conservées. Horaires absents/ambigus explicitement non déterminés.
- [x] Tests fictifs, téléchargement du bouton Formulaires et inspection des 6 pages ; ajustement ordre matin/après-midi, aucune coupure/image manquante. Bouton ordinateur/téléphone sans débordement, aucune erreur JS ni écriture élève. Pas de publication demandée ; dossiers réels non testés.

## Dispenses Lyon dans la fiche CRM — 13/10
- [x] Partager les dispenses avec le compteur CRM et les jalons actuels ; exception deux jeux Thierno BAH, aucun faux module terminé, gels inchangés.
- [x] 37 tests fictifs, compilation OK 15:32:20 UTC et rendu ordinateur/mobile sans exigences des jeux ; aucune écriture élève ni publication demandée. Fiche réelle complète non testée ; limites gel/pages/questions précédentes conservées.
 
## Planning pratique — ouvrir fiche CRM (13/10)
- [x] Noms VTC/TAXI cliquables via navigation CRM existante ; horaires/réservations/signatures inchangés.
- [x] 11 tests fictifs passés ; compilation automatique OK 15:28:40 UTC ; clic et identifiant transmis confirmés sur ordinateur/mobile, aucune erreur JS. Fiche CRM complète réelle non testée, aucun dossier élève modifié ; pas de publication demandée.
 
## Parcours terminés avant les jeux Lyon — 13/10
- [x] Dispense automatique des deux jeux seulement sur preuve serveur datée de tous les modules pédagogiques avant leur ajout ; compteurs élève et candidats partagés, données/gels inchangés.
- [x] 49 tests fictifs passés ; compilation automatique OK à 15:26:13 UTC ; compteur 10/10 confirmé sur ordinateur/mobile pour un compte fictif sans exception nominative, aucun débordement ni erreur JS. Aucune publication demandée.
 
## Exception individuelle Zekkour — 13/10
- [x] Exclure les deux jeux Lyon et la rubrique d'archives émargement du compteur individuel ; dix validations serveur, aucune réponse/signature/statut fabriqué, gels inchangés.
- [x] 132 tests fictifs, compilation OK, compteur 10/10 vérifié en Chromium ordinateur/téléphone ; aucune publication demandée.

## Candidats examens — modules et rappel individuel (13/10)
- [x] Colonne modules terminés/total selon le parcours partagé avec l’élève ; rappel de terminer tous les modules, aucune connexion faible alléguée ni envoi réel.
- [x] 125 tests fictifs, compilation OK, compteur 2/3 + 1 restant et mail vérifiés en Chromium 1280/390 ; aucune erreur JS ni débordement. Publication non demandée ce tour.

## Cohérence affichage élève — finalisation autorisée 05e1c399
- [x] Un seul calcul pour bandeau, bloc modules, listes et état secondaire des heures ; présence physique identifiée par jalon, jamais par nom.
- [x] 29 tests fictifs : jeux restants, 100 % sans validation, changement de compte, erreurs, gels ; captures vrai dashboard ordinateur 1280 et mobile 390, aucun débordement ni erreur JS.
- [x] Publication confirmée 13/10/2026 13:09:00 UTC : index-BLUB7gmc.js servi HTTP 200 sur gestion.ftransport.fr, marqueurs bandeau canonique et activités en ligne présents.
- Limites antérieures conservées hors ce correctif : recomptage fiable des pages de supports et exigences de nouvelles questions après validation non prouvées ; gels et suivi mails inchangés.

## Clarification pourcentages et heures — 12/10 19:55 UTC
- [x] Tableau partagé Contrôle/PDF : poids, progression, contribution, heures CPF et couverture prévisionnelle ; heures enregistrées séparées, calculs inchangés.
- [x] 18 tests ciblés quatre filières, 38 pages PDF inspectées, Contrôle et téléchargement Amar admin lecture seule ; objectifs et annexes conservés.
- [x] Compilation automatique OK ; publication confirmée le 12/10 à 20:04:37 UTC, bundle index-1Ewywis7.js contenant tableaux, rappel chiffré et objectifs ; journalisé.

## Objectifs pédagogiques des jalons — 12/10 18:56 UTC
- [x] Ajouter les textes approuvés via un mapping partagé, limité aux modules existants des quatre parcours e-learning, dans Contrôle et le PDF.
- [x] Tester les quatre parcours et l'absence de modification des calculs ; inspecter toutes les pages PDF fictives et l'affichage.
- [x] Compilation et publication confirmées ; objectifs toujours présents dans index-1Ewywis7.js au contrôle du 12/10 à 20:04:37 UTC.

## Relevé des jalons pédagogiques PDF — 12/10 14:32 UTC
- [x] Étendre la source commune carte/PDF avec un jalon virtuel « Entraînement pratique — 6 h » valant 360 points pour les quatre parcours e-learning visés.
- [x] Calculer sa progression uniquement depuis les minutes pratiques justifiées par Planning pratique + émargements signés : 0/180/360 min = 0/50/100 %, indisponible distinct de 0.
- [x] Recalculer tous les poids sur points e-learning + 360, sans pourcentage figé, double comptage, écriture de module ni assimilation du module en ligne 6/8 à la présence physique.
- [x] Ajouter dans Contrôle, pour VTC/TAXI/TA/VA e-learning uniquement, un téléchargement admin en lecture seule près du relevé de connexions.
- [x] Réutiliser la source dynamique des Jalons pondérés pour points, poids, progression et statuts, sans grille parallèle ni écriture élève.
- [x] Générer un PDF factuel paginé : identité/dates disponibles, tableau des jalons, méthode, preuves réellement disponibles, limites et références CPOF/CG V15.
- [x] Vérifier sur données fictives : calculs, zéro/incomplet, informations absentes, filtrage e-learning/admin, pagination et rendu visuel de toutes les pages.
- [x] Compilation et contrôles ciblés ; première phase sans publication.

## Blocage vue apprenant — 09/10 16:26 UTC
- [x] Diagnostic lecture seule et plan approuvé : canal de suivi des heures partagé déjà abonné.
- [x] Canal unique par montage, calculs et données inchangés.
- [x] 157/157 tests fictifs PASS (7 fichiers) : affichages simultanés, doubles montages, réouverture, signatures, lecture seule et ordre des 15 parcours. Compilation automatique OK 16:28:14 UTC ; journal ajouté. Vue complète authentifiée/appareil réel NON PROUVÉS ; aucune écriture serveur ni publication.

## Heures de M. Majsak depuis le 6 octobre — 09/10 16:16 UTC
- [x] Diagnostic lecture seule et plan approuvé : fenêtre de calcul distincte du filtre historique.
- [x] Calcul e-learning élève/admin/rapports depuis le 06/10/2026 inclus à minuit Paris ; connexion chevauchante tronquée sans réinitialiser le plafond de session.
- [x] 151 tests PASS (7 fichiers), build OK ; Chromium fictif écran/impression : 1h depuis le 6 reste 1h avec Tout l’historique. Avant/après : 26 connexions, même empreinte. Journal ajouté ; aucune écriture serveur ni publication. Appareil réel/mobile et site publié NON PROUVÉS.

## Historique de M. Majsak — 09/10 16:11 UTC
- [x] Diagnostic lecture seule : début d'accès 05/10/2026 ; 26 connexions conservées, dont 15 depuis le 5 octobre.
- [x] Plan approuvé : filtre initial depuis le 05/10/2026 pour ce dossier uniquement, « Tout l'historique » accessible et heures globales inchangées.
- [x] 109 tests PASS, compilation OK ; filtre et impression vérifiés en Chromium avec données fictives ; contrôle après : 26 connexions conservées dont 15 depuis le 5 octobre. Journal ajouté, aucune écriture serveur ni publication. Appareil réel/mobile et site publié NON PROUVÉS.

## Heures réellement faites et cohérence élève/admin — 09/10 15:23 UTC
- [x] Même requête de lecture élève/CRM pour heures réalisées, contrat et taux ; heures réalisées non plafonnées et format commun heures/minutes. Rapports et candidats harmonisés.
- [x] Taux d'heures borné à 100 %, indépendant des modules restant à valider ; aucune validation ni écriture serveur, aucun volume contractuel inconnu inventé.
- [x] 147 tests fictifs PASS (7 fichiers), dont parité VA/VTC, contrats 66/90 h, 100% heures avec modules restants, ordre des 15 parcours et contenus ; compilation automatique OK, journal ajouté. Aucun envoi ni publication.
- [ ] Vérification authentifiée à l'écran NON PROUVÉE : nécessite compte technique autorisé ; aucun test sur vrai élève.

## Vérification des taux des autres élèves — 09/10 15:19 UTC
- [x] Audit lecture seule de 239 dossiers suivis, hors comptes techniques, archivés et abandonnés ; 41 dossiers bénéficient du repli corrigé.
- [x] 125 tests fictifs PASS (5 fichiers) ; compilation automatique OK. Divergence prouvée : 6 VTC-e avec contrats 66/90 h mais compteur élève standard 60 h ; 4 dossiers sans type malgré formation continue VTC ; 3 continue-taxi sans référence horaire. 1 contrat VTC à vérifier : 20+34 h contre total 60 h, aucune valeur corrigée.
- [x] Accord 15:23 : cohérence des volumes contractuels et repli formation connue implémentés, heures réelles non plafonnées ; aucune donnée corrigée.
- [ ] Volume de référence continue-taxi et incohérence du contrat 20+34/60 : à confirmer avant toute modification des valeurs. Vérification authentifiée des écrans NON PROUVÉE, compte technique soumis à approbation.
- Aucun changement de l'application, aucune écriture élève, aucun envoi ni publication ; corrections soumises à accord.

## Taux e-learning vide — 09/10
- [x] Réutiliser les heures requises du parcours si aucun volume contractuel n'est renseigné, sans changer les heures réalisées ni les modules.
- [x] 136 tests isolés PASS : VTC/TAXI/VA/TA, priorité contrat, séparation heures/modules et ordre pédagogique ; compilation automatique OK.
- [x] Journaliser ; aucune écriture élève ni publication.
- [ ] Vérification authentifiée sur appareil réel NON PROUVÉE : compte technique soumis à approbation.

## Pratique signée et taux présentiel — 09/10 15:07 UTC
- [x] Compter uniquement les signatures présentes aux horaires du planning ; conserver les heures prouvées même sans volume contractuel présentiel.
- [x] Actualiser le taux CRM sur événement de signature, sans écriture de progression ni modification du contrat ; corriger également les lectures des rapports.
- [x] 41 tests fictifs PASS, dont fiche 0→50→100 %, 11 contrôles ordre cours/quiz ; compilation automatique OK ; aucun envoi ni publication.
- [ ] Vérification du compte technique sur appareil réel : NON PROUVÉE, approbation de connexion nécessaire ; aucun test sur vrai apprenant.

## Horaires des feuilles pratiques — 09/10
- [x] Lire le circuit PDF et le planning sans écriture serveur.
- [x] Afficher les horaires pratiques par date et demi-journée, sans modifier les signatures.
- [x] 15 tests isolés réussis, dont génération réelle du PDF ; compilation automatique OK ; aucune écriture serveur ni publication.
- [ ] Vérification sur le compte élève technique : NON PROUVÉE, nécessite une approbation de connexion ; aucun essai sur élève réel.

## Taux e-learning candidats examens — 08/10
- [x] Afficher le taux depuis le suivi existant, uniquement pour les e-learning, sans écriture de progression.
- [x] Ajouter sous le taux une préparation de mail individuel modifiable et un envoi manuel confirmé.
- [x] 113 tests isolés réussis, sans envoi réel ; ordre/contenus des 15 formations et 68 fichiers pédagogiques inchangés ; journal ajouté, aucune publication.

## Réactivations après incident du 28/09 — demande 07/10 18:40 UTC
- [ ] Présenter le périmètre exact : 13 quiz dans modules 2,10,17,23,25,32,39 ; corrections T3P toutes copies ; module 13 et Bilans Français intacts.
- [ ] Vérifier l'origine du Bilan Français 4/9 en lecture seule, annoncer les limites de preuve.
- [ ] Appliquer uniquement les bascules autorisées avec contrôle de version et historique conservé ; contrôler avant/après les contenus et les protections des données élèves.
- [ ] Vérifier l'ordre complet de toutes les formations, l'aperçu sur données fictives sans écritures élèves, puis journaliser les résultats.
- [ ] Publier sur demande explicite, après contrôles réussis et vérification des conditions de publication.

## T3P — corrections et réactivation autorisées (07/10, 18:25 UTC)
- [x] Lire les questions exactes, protections serveur et périmètre de partage avant écriture.
- [ ] Accord 18:29 : protéger contre la reconstruction automatique intégrale des bilans ; limiter la propagation aux questions réellement modifiées, préserver les métadonnées des autres questions.
- [ ] Corriger P1 Q29/Q42 et P2 Q36/Q60/Q79, avec sauvegarde avant/après et refus d'écriture périmée.
- [ ] Réactiver uniquement les deux quiz du parcours VTC ; vérifier bilans, autres activations, historiques et ordre complet inchangés hors ajouts autorisés.
- [x] Textes exacts TPMR/sanctions livrés, aucune question modifiée ; journal de diagnostic ajouté. Correction du déclenchement des bilans nécessite un périmètre distinct explicitement autorisé.

## Numérotation administrateur et non-régression globale (07/10, périmètre autorisé)
- [x] Audit lecture seule et accord : numérotation admin uniquement, contrôles et journal ; aucun quiz réactivé.
- [x] Aligner la numérotation administrateur sur les associations permanentes existantes sans modifier l'affichage apprenant.
- [x] 102/102 tests PASS : 15 parcours configurés, quatre séquences cours/quiz, 68 fichiers pédagogiques inchangés ; quiz inactifs et coordonnées historiques vérifiés. Empreinte serveur des 62 modules identique avant/après ; compilation automatique OK.
- [x] Journal daté ajouté dans `docs/journal-modifications.md` ; aucun élève réel, aucune écriture serveur, aucun quiz réactivé.
- [ ] Parcours complets à l'écran ordinateur/téléphone et Safari réel : NON PROUVÉS ; nécessitent une vérification isolée sur données fictives, aucun déploiement demandé.

## VTC — encadrés et ordre cours/quiz (07/10, plan approuvé)
- [x] Diagnostic lecture seule : dépassements présents dans PowerPoint/PDF ; quiz désactivés entraînant un décalage par position.
- [x] Nouvelle version intégrale du support partie 2 : 43 slides, textes et numéros inchangés, originaux conservés ; PDF correspondant et liens d’affichage dédiés.
- [x] Association cours/quiz par identifiants permanents ; adaptation lecture/écriture des positions historiques sans migration ; aucun quiz réactivé.
- [x] 46/46 tests ciblés PASS ; 39/39 pages interactives parcourues et défilement contrôlé en Chromium et WebKit, largeurs 1280/390 ; PDF 43 pages ouvert et TPMR visible. Aucun élève réel ni écriture serveur ; Safari/appareil réel et livraison distante des nouveaux médias NON PROUVÉS.

## Mise en valeur des sessions (07/10)
- [x] Encadré identique (même couleur) pour session en cours, sessions TAXI/TA et sessions VTC en cours du soir ; aucune donnée modifiée.
- [x] Vérifié à l’écran : toutes les cartes concernées ont la même bordure et le même fond.


## Formats des documents d’agrément (07/10)
- [x] Supprimer les restrictions de format pour Ajouter et Remplacer dans TAXI/VTC ; conserver les originaux, reconnaître JFIF pour la conversion PDF.
- [x] 10/10 tests ciblés PASS : sélecteurs sans restriction, conversion JFIF et original intact, ordre commun TAXI/VTC ; build OK. Stockage sans restriction MIME, limite existante 20 Mo. Aucun document réel modifié ; envoi réel non testé.

## Lettre masquée remise visible (07/10)
- [x] Lecture avant modification : ligne masquée, PDF original toujours présent et non masqué ; remettre uniquement la ligne visible sur demande explicite, sans remplacer le document.

## Lettre commune TAXI/VTC (07/10)
- [x] Partager la lecture de la même lettre et de ses fichiers dans les deux dossiers et exports, sans modifier les données existantes.
- [x] 6 tests PASS (en environnement node), affichage isolé TAXI/VTC vérifié avec le même fichier fictif en position 1 ; build OK ; aucune écriture réelle. Export ZIP/PDF branché sur la même lecture, téléchargement non exécuté.

## Lettre de présentation en position 1 (07/10)
- [x] Classement d’affichage et exports ZIP/PDF : lettre en tête, identifiants et ordre enregistrés inchangés.
- [x] 4 tests PASS ; écran TAXI/VTC vérifié avec pièces fictives et écritures bloquées ; build OK. Aucun document réel modifié.

## Inscrits théorique : une session ou toutes les dates (06/10)
- [x] Ajouter « Toutes les dates » au filtre du tableau, avec lecture paginée, sans changer le planning.
- [x] Vérifier à l’écran la vue globale (2 candidats fictifs de sessions différentes) puis une seule session ; 20/20 tests ciblés réussis, build OK ; écritures et envois bloqués.

## Sessions d’examen manquantes dans le filtre (06/10)
- [x] Diagnostic lecture seule : « Toutes les dates » est construit uniquement depuis les élèves de la session déjà sélectionnée.
- [x] Correctif approuvé : les deux sélecteurs proposent les 12 sessions et partagent la même sélection ; filtre local trompeur retiré.
- [x] 19/19 contrôles ciblés réussis ; sélection 2026/2027 et synchronisation vérifiées à l’écran avec listes fictives ; toutes les demandes d’écriture interceptées, aucun mail ni donnée réelle modifiée ; build OK.
- [x] Session sans période pratique publiée : ne plus affecter une valeur indéfinie, pour éviter le plantage lors du choix d’une date 2027.

## Notes individuelles pratique (06/10)
- [x] Champ par candidat dans les listes CMA et formation ; historique conservé avec refus des versions périmées.
- [x] Note personnelle dans les sept mails pratiques ; CMA, impression et aperçus depuis la même note ; aucune date modifiée, aucun mail envoyé.
- [x] 9/9 tests ciblés ; champ vérifié sur ordinateur/téléphone avec données fictives simulées ; build OK ; empreinte des 12 plannings inchangée, 0 note élève écrite.
- [ ] Enregistrement serveur et refus d’une version périmée de bout en bout : NON PROUVÉS, nécessitent un contexte de test isolé autorisé ; aucun test sur vrai élève.

## Réservation pratique — retrait du préalable module (06/10)
- [x] Retirer la condition module PRATIQUE des envois manuels VTC/TAXI et les formulations correspondantes ; conserver les conseils et les heures e-learning.
- [x] Vérifier sans envoi de mail ni modification de données élèves : 5 tests réussis, dix messages individuels/groupés contrôlés, build OK. Test navigateur non exécuté.

## Chantier global affichage apprenant (25/09)
- [x] Règle unique d'affichage + tableau de bord/déblocage branchés dessus + tests de cohérence.
- [ ] Tests navigateur F5/reconnexion : NON PROUVÉS (portes identité/émargement/session unique).
- [x] Réparation automatique des statuts par le tableau de bord supprimée (lecture seule).

## Incident prioritaire — GOUEPO Stéphane, modules terminés affichés non faits (25/09/2026)
- [x] État logique figé et parcours reconstitué depuis les données serveur et l’activité.
- [x] Cause d’affichage identifiée : le tableau recalculait après Terminé à partir des compteurs de contenu actuels et pouvait appliquer une ancienne réponse de rechargement arrivée en retard.
- [x] Correctif général non destructif : état serveur Terminé prioritaire et réponses de chargement périmées ignorées.
- [x] Garde serveur contre une rétrogradation obsolète vérifiée avec le compte TEST ; test visuel fermeture/F5 limité par son rattrapage d’émargement obligatoire.
- [x] Compteurs avant/après relevés ; rapport unique à remettre.

## Terminé — écran unique Correction QRC (23/09/2026)
- EB3 finalisé apparaît dans le menu sous « EB3 — ANCIEN CIRCUIT », sans migration ni copie.
- Les 9 matières EB3 ouvertes sont exclues ; les 50 QRC finalisées uniques de la session sont affichées (50/50 avec le contrôle en base).

## Bloqué — en attente de la fin de la session EB3 et des 15 resynchronisations
Aucun déploiement tant que des élèves passent EB3. Surveillance lecture seule uniquement.

Pré-requis avant Phase 1 (demande du 22/09, 21h22) :
- Snapshot/état de référence du système actuel à figer AVANT Phase 1 : file locale, accusé de réception serveur, numéro d'ordre, idempotence réponses, idempotence finalisation, snapshots V2, journaux append-only, résultats actuels des tests automatiques.
- Phase 1 ne reconstruit PAS la file locale ; périmètre : indicateur 🟢/🟠/🔴, arrêt définitif des retries sur erreurs fonctionnelles non récupérables (règle 48 h), backoff avec jitter, durcissement du contrôle serveur avant « Terminer la matière », message clair du mode dégradé.
- Après Phase 1 : tests existants + tests spécifiques panne/récupération ; si un seul mécanisme existant régresse → pas de déploiement.
- Aucune modification des réponses, tentatives, notes, corrections ou historiques existants.

1. Réparer l'écriture des alertes (`alertes_systeme` : RLS refuse toute insertion).
2. Distinguer « identifiants incorrects » et « service temporairement indisponible » sur l'écran de connexion.
3. Corriger `permission denied for function check_apprenant_session` (et `start_or_get_exam_timer`).
4. Règle 48 h : message explicite « Nouveau passage non autorisé avant 48 h » + arrêt immédiat des réessais automatiques (pas de requête chaque seconde sur un refus définitif P0471).
5. Monitoring externe de la base (indépendant de la base elle-même) + health checks + alerte automatique si authentification ou sauvegarde indisponible.
6. Conservation des journaux au-delà d'un redémarrage (export périodique hors base) pour permettre une vraie analyse de cause racine.
7. Test de charge sur données fictives : charge du 22/09 puis ×2 et ×3 ; dimensionnement de l'instance décidé APRÈS ce test.

## Suivi en cours (lecture seule, sans modification)
- Point 21h28 : MTIMET Chokri 🟢 (matière EB3 complète envoyée et finalisée à 21h12 Paris). SAWADOGO : 1 seule écriture réussie à 21h23 Paris, plus aucune boucle détectée. Les 15 élèves restent 🟠 — dernière écriture serveur toujours 19h35–19h45 Paris, aucun retour depuis le rétablissement. MTIMET prouve que la chaîne fonctionne ; il ne valide pas les files locales des 15.

## Décisions utilisateur en attente
- Affichage des QRC corrigées automatiquement (2 333) en orange plutôt qu'en vert.
- 2 divergences de contenu EB3 (longueur minimale VTC hybride, prix psychologique).
- Reprise de la copie incrémentale des matières finalisées (corriger `core_import_passage_finalise` / `audit_journal`).

## Plan anti-panne (cahier des charges du 22/09, 21h18) — GELÉ jusqu'à la fin d'EB3 et des 15 resynchronisations
État relevé en lecture seule le 22/09 (aucune modification) :
- EXISTANT : file locale durable + accusé serveur (answerPersistence.ts, answer_save_queue_v1), numéro d'ordre serveur anti-écrasement, idempotence des envois, finalisation idempotente (examFinalizationGuard.ts), snapshot immuable V2, journal append-only (reponses_apprenants_journal, audit_journal), 83 fichiers de tests de non-régression.
- PARTIEL : indicateur de sauvegarde côté élève (états internes idle/saving/saved/error, pas d'affichage permanent 🟢/🟠/🔴) ; arrêt des réessais (403 stoppe, 500 fonctionnel type P0471 continue de réessayer) ; backoff exponentiel (plafond 30 s, sans jitter) ; blocage de la finalisation tant que la file n'est pas vide ; journalisation d'erreurs (error_logs, dans la base) ; mode dégradé (réponses conservées mais pas de message explicite).
- ABSENT : monitoring externe indépendant de la base ; canal d'alerte hors base ; alertes_systeme (RLS refuse toute insertion) ; health checks liveness/readiness/DB/auth/exam-save ; conservation des journaux après redémarrage ; distinction panne / mauvais mot de passe (Login.tsx, StudentLogin.tsx) ; test de charge ; test de panne provoquée ; test de restauration.

Phases (ordre imposé) : 1 données → 2 observabilité → 3 corrections → 4 infrastructure → 5 résilience → 6 capacité → 7 production.

## Étape 0 — Snapshot de référence figé (22/09, 21h40)
Voir `docs/snapshot-reference-avant-phase1.md` : empreintes md5 des 5 fichiers de protection, description figée des mécanismes (file locale, accusé serveur, write_seq, anti-écrasement, idempotences, snapshots V2, journaux), et résultats des tests AVANT modification (449 réussis / 5 échecs préexistants / 50 fichiers non collectés faute du module natif canvas ; 20/20 sur les tests de sauvegarde).
Étapes 1 à 5 de la Phase 1 : EN ATTENTE de l'accord explicite de l'utilisateur après lecture du snapshot.

## Étape 1 — Politique de réessai (faite, EN ATTENTE D'ACCORD pour déploiement)
- `src/lib/answerPersistence.ts` : ajout de `classifyAnswerSaveFailure()` (définitif vs temporaire) et `computeRetryDelay()` (backoff existant + jitter ±30 %, plafond 30 s). Le bloc 403 est remplacé par la classification ; un refus définitif marque l'élément « blocked » (conservé, jamais supprimé) et affiche la vraie raison. Nouvelle empreinte : df05119856fc6c6ba7dff21daaa489b4.
- `src/components/cours-en-ligne/AnswerSaveIndicator.tsx` : affiche le message réel du refus.
- `src/test/retry-classification-etape1.test.ts` : 7 tests (48 h, droits, passage fermé, 5xx/timeout temporaires, jitter, 100 réessais → 1 seul envoi).
- Non-régression : 456 réussis / 5 échecs préexistants (449+7) ; 20/20 sur les tests critiques ; clés de file locale et format inchangés ; examFinalizationGuard.ts, pontV2.ts, useAutoSaveReponses.ts, ExamenBlancsPassage.tsx : empreintes identiques au snapshot.

## Étape 2 — Indicateur de sauvegarde (préparée, NON DÉPLOYÉE)
- Indicateur informatif branché sur les états existants : vert après accusé serveur et file vide, orange avec compteur de réponses, rouge sur panne temporaire, refus fonctionnel séparé.
- Ajout sur le passage des examens blancs ; aucune modification des clés ou du format des files locales.
- Tests ciblés : 7/7. Tests sauvegarde + ordre + propriété + retries + indicateur : 34/34, dont les 20/20 critiques historiques inchangés.
- Suite exécutable complète : 463 réussis / 5 échecs préexistants ; 50 fichiers restent non collectés à cause de `canvas`, comme au snapshot. Aucun nouvel échec.
- Empreintes protégées inchangées pour `examFinalizationGuard.ts`, `pontV2.ts` et `useAutoSaveReponses.ts`. `answerPersistence.ts` change uniquement pour exposer le compteur informatif ; `ExamenBlancsPassage.tsx` change uniquement pour afficher l'indicateur commun.
- Statut : EN ATTENTE D'ACCORD, aucun déploiement.

## Verrouillage moteur d'examen — 23/09/2026
- Terminé : suite de non-régression bloquante `src/test/verrouillage-moteur-examen.test.ts` (41 tests critiques, 8 axes) + `npm run test:critique` (96 tests, bloquant avant déploiement du moteur d'examen).
- Terminé : surveillance production `supabase/functions/surveillance-moteur-examen` — détection seule, lecture seule, alertes e-mail/webhook, journaux anonymisés.

## Plan de stabilisation validé (23/09, 19h36) — une phase à la fois : TEST → rapport → accord → production → contrôle
- [ ] Phase 1a — C2+C3 isolation stricte entre candidats (serveur/base) — EN ATTENTE : choix d'un environnement TEST isolé
  - Étape C inclut désormais le **retrait physique des corrigés V2 de `examens-blancs-data.ts` et du bundle public compilé** ; écrans Admin/Correction QRC V2 alimentés par une fonction serveur protégée ; contrôle post-compilation : 0 corrigé V2 dans le JavaScript servi (23/09, 20h10). Détail : `phase1-c2c3-plan-deploiement-2026-09-23.md`.
  - A n'est PAS lancé : accord explicite + créneau vérifié sans examen en cours requis. Premier travail = A uniquement, puis test et arrêt avant B.
- [ ] Phase 1b — C1 unicité OPEN en base (audit préalable, aucune suppression)
  - Cas de test de référence : BOUDJORF DOUBAA Kamel, EB2 T3P, 2 passages créés à 19 ms d'écart le 22/09 09:16:32 (ancien circuit, ne pas corriger individuellement) — la protection doit rendre ce cas impossible.
- [ ] Plus tard — règle propre pour tentatives abandonnées encore ouvertes (HOMAWOO eb3-ta, VALENTIN EB5/EB6-TAXI) ; ne pas les fermer manuellement.
- [ ] Phase 1a étape A — en attente : ne lancer que si 0 élève en train de composer (activité < 30 min).
- [ ] Phase 1c — C5 publication interdite si test critique échoue
- [ ] Phase 2 — serveur d'abord au chargement/F5 + double-clic Commencer ; V2 seule source d'état
- [ ] Phase 3 — C4 chrono serveur, tolérance 30 s transmission uniquement (arrêt si non garantissable)
- [ ] Phase 4 — 7 scénarios manquants (serveur/intégration/navigateur réel), alerte double OPEN, 4 alertes hautes
- Ne pas nettoyer l'ancien circuit.

## Chantiers séparés — après stabilisation V2 uniquement (23/09, 20h10), hors A→B→C→D
- [ ] S1 — Sécurisation EB3 / EB3-TAXI : retrait des corrigés du code servi au navigateur + correction QCM côté serveur ; hors session EB3, sauvegarde + tests fictifs préalables.
- [ ] S2 — Sécurisation des Bilans e-learning : même logique, corrigés exposés dans le code du site ; traitement séparé.
- Aucun diagnostic supplémentaire : cartographie jugée suffisante (23/09).

## Stabilisation moteur EB (après pause — pas avant, sauf bug critique ; TEST → validation → production)
- [ ] Serveur interrogé avant toute reprise locale (le navigateur ne choisit jamais la tentative)
- [ ] V2 seule source du statut / progression / Commencer-Reprendre pour les EB V2
- [ ] Déploiement bloqué si un test critique échoue
- [ ] Test + alerte tableau de bord « 2 tentatives OPEN même candidat/examen » (vu transitoirement le 23/09, candidat non identifié)

## Après C1/C2/C3/C5 — fonctionnement type Formative (exigence 23/09, 19h56, à NE PAS développer maintenant)
Supprimer la nécessité de publier manuellement chaque modification pédagogique :
- [ ] Enregistrement d'une modification d'un examen blanc → création/publication AUTOMATIQUE d'une nouvelle version pour les futurs passages uniquement (plus de bouton « Publier » pour les modifications ordinaires)
- [ ] Passage déjà commencé → snapshot inchangé
- [ ] Passage terminé → inchangé
- [ ] Notes/corrections existantes → jamais recalculées
- [ ] Nouveau passage → dernière version enregistrée
- [ ] Conserver l'historique / version précédente pour audit et retour arrière
- Invariant : une modification ne doit jamais changer le sujet d'un élève en cours d'examen.

## Garanties permanentes anti-récidive (exigence 23/09, 21h01) — à intégrer à A/B/C/D + C1/C5, RIEN développé pendant que des élèves composent
Règle : chaque incident réel (Kevin, Thierno, Léa, Seydou, BOUDJORF) = protection permanente + test bloquant avant publication, reproduit de façon anonymisée.
- Sauvegarde (Phase 2/4) : aucune réponse perdue ; coupure réseau → conservation locale → renvoi auto ; F5/reconnexion → reprise correcte ; une réponse en erreur ne bloque jamais les suivantes ; P0409/ancienne révision ne bloque jamais la file.
- Terminer (Phase 2/3 + B) : clôture refusée avec 0 réponse serveur si l'élève a répondu ; attente des réponses en transit ; double-clic = une seule finalisation ; coupure pendant Terminer = reprise idempotente ; jamais de note 0 due à une panne.
- Tentatives (C1 + Phase 2) : une seule OPEN par élève/examen/matière (contrainte base) ; double-clic Commencer impossible ; tentative CLOSED jamais réactivée par le navigateur ; après reset/réouverture l'ancienne session locale est rejetée ; serveur interrogé avant toute reprise locale.
- Chrono (Phase 3) : F5 ne remet jamais à zéro ; réouverture admin = nouveau chrono complet ; 00:00 = gel → envoi → confirmation serveur → finalisation ; panne serveur à 00:00 = « finalisation en attente », jamais 0 technique.
- 48 h : uniquement pour une vraie nouvelle tentative ; jamais entre matières d'un même examen ; jamais pendant sauvegarde/reprise/finalisation.
- Affichage (Phase 2) : statut, progression, Commencer/Reprendre, tentative active = V2 uniquement ; aucune ancienne session navigateur ne réaffiche un examen avant reset ; date examen CRM = même info côté apprenant.
- Surveillance (FAIT 23/09, à maintenir) : aucun comptage limité à 500/1 000 ; agrégat serveur ; erreur de lecture = alerte technique, jamais « 0 réponse » ; distinguer abandon / import ancien circuit / vrai incident V2.
- Tests de non-régression (Phase 4) : 2 onglets ; double-clic ; réseau coupé/rétabli ; F5 ; fermeture navigateur ; réponse à 00:00 ; 20 réponses simultanées ; CLOSED + nouvelle OPEN ; reset administratif ; 10 000 réponses en surveillance.
- C5 (Phase 1c) : publication du moteur IMPOSSIBLE si un seul test critique échoue (pas seulement « tests verts conseillés »).
- Démonstration attendue après stabilisation : perte de réponse impossible (scénarios couverts) — 0 technique impossible — double tentative impossible — ancienne tentative après reset impossible — blocage Terminer récupérable automatiquement — faux incident surveillance protégé — tests critiques obligatoires avant publication : OUI.
- Priorité : ces barrières avant toute nouvelle fonction d'examen.

## Terminé — EB2 G(V) Q5 clé unique C (24/09/2026)
- Source code corrigée (B n'est plus correcte), contrôle générique + 4 tests de non-régression. Historique intact.

## En attente de décision
- Déblocage EB2 / Kevin FERNANDES (version V2 incomplète) — traité séparément.
- 8 passages EB2 G(V) sous-notés de 2 points (Q5) — correction contrôlée ultérieure.
- 11 divergences de correction détectées dans les versions actives (liste dans le bilan du 24/09).

- [x] 24/09 : 17 passages Bilan Sécurité routière figés à l affichage + garde serveur (aucune nouvelle réponse)

- [x] 24/09 : 44 questions Q1-Q49 réparées (Bilans VTC/TAXI) depuis Partie 1

## Lot du 27/09 (étapes 1 à 7)
- [x] Étape 1 — 5 notes EB3 Gestion créées + correction automatique des questions ouvertes
- [x] Étape 2 — Passages non fiables : note ancien système + mention ; texte complet dans Correction QRC
- [x] Étape 3 — Fonction commune note/statut (Mes notes = écran admin) — recomptage des 220 écarts NON FAIT
- [x] Étape 4 — Statut modules serveur (règle 6/6 automatique, « Validation en cours »)
- [x] Étape 5 — Contenu indisponible élève + bandeau brouillon local admin
- [ ] Étape 6 — 8 questions en double des Bilans : définition du « 8 » non retrouvée (attente utilisateur)
- [ ] Étape 7 — Essais écran TEST/admin + publication : bloquée, élèves actifs (dernière activité 11:33 UTC)

- [x] 27/09 Contrôle de connaissances TAXI (module 13) : exercice 13100 créé (1 237 questions), exercices 1–5 désactivés.
- [ ] Publication du lot : en attente (examen blanc en cours à 20:49 UTC) ; essais écran du module 13 à faire.
- [x] Date examen : réponse du dossier de bienvenue toujours prioritaire ; date la plus proche seulement si vide (ApprenantEditForm + dateExamenDossierBienvenue, 4 tests PASS)

- [x] 07/10 18:34 UTC T3P : cinq corrections autorisées, quiz 1/2 VTC réactivés ; protection serveur contre reconstruction des bilans ; 62 contenus comparés, bilans 4/9 intacts, 102 tests ordre PASS. Runtime déjà protégé, aucune modification frontend requise. Écrans complets/Safari iPhone et publication non vérifiés ; aucun déploiement.

- [x] 08/10 15:45 UTC Annulation d'inscription : « INSCRIPTION ANNULÉE » en grand et en rouge sur la fiche apprenant (avec date) + badge rouge « ANNULÉ » sur la carte de la liste des apprenants et dans la table Apprenants ; masquage Examens/Réussite/sessions conservé ; aucune donnée supprimée ; vérifié à l'écran sur David FERREIRA ; frontend non publié.

- [x] 08/10 16:05 UTC Convocation TA : la ligne « Horaires de la première semaine » affiche désormais la semaine d'entrée ({{semaine_entree}}, calculée de la date de début au vendredi de la même semaine, bornée par la fin de formation) ; modèle convocation-ta mis à jour en base (sauvegarde docs/backups/convocation-ta-avant-semaine-entree-2026-10-08.html), variable ajoutée à replaceTemplateVars ; session TAXI/TA du 26/10 → « du 26 octobre au 30 octobre 2026 ». Frontend non publié.

- [x] 09/10 08:30 UTC Note générale pour la lettre CMA : colonne additive planning_pratique_config.note_lettre_cma (migration 0132) ; champ de saisie dans la carte Lettre CMA, enregistré par session + période pratique avec les mêmes garde-fous que le planning ; note incluse dans la lettre (aperçu, impression, e-mail CMA), omise si vide ; notes par candidat inchangées ; frontend non publié.

- [x] 09/10 08:45 UTC Lettre CMA : retrait réversible des candidats sans résultat (bouton « Retirer de la lettre » / « Rétablir », colonne additive lettre_exclus_ids, migration 0133) ; débloque l'envoi du mail ; testé à l'écran, base relue vide ; frontend non publié.

## 18/10 « Oui règle les pb »
- [ ] P3 TA : objectif 10 théorie + 2 pratique = 12 (Fiacre 12 attendues, 2 rattachées, historique à régulariser)
- [ ] P1 persistance/auth (Ferreira, Benjelloun) : diagnostic + correctif ciblé
- [ ] P2 Riyad LABIOD EB2 t3 / délai 48 h : distinguer refus attendu et perte
- [ ] Diagnostics lecture seule : 500 liens bilan_sync, 7 QRC vtc-e, mails identifiants

## 21/10 — Bilan sécurité (rechargement, chunk 404, rattrapage Aba-Bakre, Belarbi, Smail)
- handleHardReload ne vide plus aucun stockage ; cache-bust `_t` en conservant l'URL.
- Textes honnêtes (plus de « 90 % des cas » ni promesse de sauvegarde).
- Tests `src/test/error-boundary-reload.test.ts` : 4/4 PASS.

## 2. Ancien chunk 404 (Riyad, JeuxCartesLyon) ✅
- `src/lib/chunkVersionGuard.ts` : détection chunk obsolète, notification avec action « Recharger », jamais de boucle ni de rechargement automatique, aucune file touchée.
- Installé dans `src/main.tsx`. Tests inclus au point 1.

## 3. Rattrapage IA Aba-Bakre (64 QRC, EB1/4/5/6 du 18–19/10) — EN COURS
- Fonction `qrc-ia-correction` : période 17–19/10 restreinte à son dossier ; continuations de suite autorisées dans ces périodes seulement. Déployée (SHA 80be14e1…).
- 20 suites créées (une par tentative), cron `qrc-ia-suites-bornees` actif.
- Progression : 5/64 à 08h35. À vérifier jusqu'à 64/64 + notes finales.

## 4. Belarbi — incident résorbé ✅
- Révision `module_3_revision_exo_404` persistée à 21:42:24 par la file de fond ; original submitted intact. L'échec affiché à 20 s était seulement l'attente écran. Aucune action donnée.

## 5. Smail — incident résorbé ✅
- Révision `module_2_revision_exo_1` persistée à 21:29:54 après la coupure réseau de 21:28. Aucune action donnée.

## 6. Finalisation — EN COURS
- Types OK, build OK, tests 12/12, publication demandée (gestion.ftransport.fr).
- Reste : fin du rattrapage 64/64, empreintes APRÈS, journal docs/.

## 21/10 — Finalisation sécurité correctif 21ee53d
- [x] roadmap.md restauré depuis le parent, historique conservé
- [x] Rattrapage Aba-Bakre limité à l'allowlist figée 64 QRC / 20 passages (direct + suite)
- [x] Tests hors allowlist refusés
- [x] Fonction qrc-ia-correction déployée, état des 64 et empreintes relus

- 21/10 09h: tablettes — jeux et contenu module indépendants de la date appareil, compteur pages borné 100 %; file QRC: suites sans passage → à vérifier (fait).

## Verrou attestations formation continue — 27/10 17:34 UTC
- [x] Aucune génération/téléchargement/envoi d'attestation FC (VTC, TAXI si même processus) sans les 4 signatures serveur (matin+après-midi × 2 jours) ; vérification serveur, refus par défaut, message des créneaux manquants ; tests 0–4 signatures, envois auto/manuels, accès directs ; aucun mail réel.
