# Émargements — revue des autres lecteurs, 23 novembre 2026

## Règle vérifiée

Pour **le même dossier et la même période**, administration et apprenant doivent voir les mêmes feuilles et états : signé, non signé, absence ou preuve papier. Une date de signature tardive ne change jamais la date du cours. Aucune preuve d’un autre dossier ne doit être empruntée. Une erreur de lecture n’est ni une signature manquante ni une présence prouvée. Les historiques et les droits restent inchangés.

Cette revue complète et nuance le rapport Thomas précédent. **Aucune modification fonctionnelle supplémentaire** : la demande initiale limitait les corrections au module des feuilles. Les écarts hors périmètre sont soumis à accord. Les lignes ci-dessous sont déclarées **LUES**, pas testées en production ; seules les huit comparaisons fictives et les 31 tests du rapport précédent ont été exécutés.

## Résultat principal conservé

Thomas a deux dossiers distincts : octobre `14f4bb0c-fcd7-4719-8222-d8959fc96172`, quatre signatures des 28–29/10 horodatées le 17/11 ; novembre `5b9d205a-11cc-4005-b264-26a4023d961a`, inscription 17–18/11 sans signature ni compte rattaché. Aucun lien explicite entre eux. Leur réunion reste non autorisée/non effectuée, sans transfert de présence.

## Inventaire des écrans et flux — code lu

Légende : **aligné sur l’identité** = lecteur par ID/date conservant les preuves, pas garantie de parité complète ; **écart** = logique différente démontrée ; **distinct** = document vierge/archivé, ne doit pas être présenté comme preuve signée.

| Point rencontré | Fichiers lus | Constat |
|---|---|---|
| Feuilles dans les cours | `EmargementsSignesViewer.tsx`, `ModuleDetailView.tsx`, `emargementLecture.ts`, `emargementFenetres.ts` | Vue commune, dossier exact, dates de cours distinctes des signed_at ; tests fictifs précédents PASS. **Réserve** : vue numérique seulement, ne fusionne pas les preuves papier ; attentes théorie seulement (`fenetresDues(windows,false)`). |
| Documents de remboursement FC VTC/TAXI | `RemboursementFCViewer.tsx` | Réutilise la même vue depuis la correction ; programme, factures et attestations restent distincts. |
| Consultation CRM Formations / Dossier | `DocumentsFormation.tsx`, `DocumentsDossier.tsx` | Vue commune explicitement en lecture seule, même ID. |
| Signature à l’ouverture de l’espace cours | `CoursPublic.tsx`, `EmargementFCModal.tsx`, `agendaSlots.ts`, `emargementDu.ts` via appels lus | Attentes serveur, propriétaire et liens explicites ; théorie/pratique réunies à l’ouverture, liens supplémentaires pratiques seulement. **Écart** : périmètre plus large que la vue de consultation, qui exclut les attentes pratiques ; comparaison aux anciennes images limitée au dossier. |
| Rattrapage ancien lien | `EmargementsRegularisation.tsx` | Aucun formulaire ni écriture. **Écart de texte** : « Les dates passées ne peuvent plus être signées », alors que les créneaux passés non signés inscrits sont autorisés dans le circuit normal. Ne pas réactiver l’ancien lien. |
| Signatures manquantes CRM + relance manuelle | `SignaturesManquantesTab.tsx`, `signaturesManquantes.ts`, `signaturesPlanningReel.ts`, `emargementSessionSlots.ts` | ID exact, erreurs explicites et relecture avant envoi ; intègre papier et classe hors-session sans effacer. **Écarts** : calcul local des attentes vs fenêtres serveur ; dates du jour non filtrées par ouverture dans le calcul pur. |
| Résumé signatures du planning | `SignaturesPlanningResume.tsx` | Même bilan CRM/EDOF, papier inclus, hors planning signalé ; pas le même lecteur que les feuilles numériques. |
| Heures non signées / justifications | `CompteurHeuresNonSignees.tsx` | Appelle les manquants partagés ; présence administrative distincte de signature, lecture en erreur explicite. Hérite des écarts d’attentes/papier. |
| Toutes les signatures / session + pratique / Voir | `SignaturesRassembleesExport.tsx`, `signaturesRassemblees.ts` | Admin vérifié, toutes les versions numériques conservées ; export session/pratique intentionnellement filtre les dates du planning. **Écarts** : sans session, les signatures historiques peuvent être absentes de ce seul export ; attentes non exportées, papier non intégré ; un PDF préparé peut être téléchargé sans nouvelle relecture. |
| PDF manquants à imprimer | `SignaturesRassembleesExport.tsx`, `signaturesManquantes.ts` | Feuilles vierges séparées des preuves, mais calcul et PDF préparé héritent des réserves ci-dessus. |
| PDF personnalisé | `EmargementPersonnaliseExport.tsx`, `emargement-personnalise-pdf.ts` | Outil de feuille à remplir, pas lecteur de signatures existantes ; ne prouve pas la présence. |
| Signatures papier dans Session et CRM | `SignaturesPapierFC.tsx`, `SignaturesPapierDossier.tsx`, `fcSignaturesPapier.ts` | Identité inscription/session/document exacte, append-only, relecture des créneaux après insertion, sans image ou horodatage fictif. **Écart avec vue commune** : preuves reconnues ici, mais non affichées dans les feuilles numériques. |
| Présence retenue / heures CRM | `TauxPresenceSessionsCard.tsx` | Lecture paginée exacte ; images/masques filtrés dans le calcul ; même chargeur réutilisé. Différent du compteur de feuilles : présence administrative ≠ signature. |
| Taux apprenant et jalons live | `useApprenantTauxRealisation.ts`, `jalonsPedagogiques.ts`, `preuvesJalons.ts` | ID exact, classification partagée et preuves conservées ; historiques figés séparés. Différences de source/limites selon lecteur, pas garantie générale de parité. |
| Liste Apprenants : alerte signature du jour | `ApprenantsList.tsx` | **Écart** : existence d’une ligne suffit sans image/signed_at ; utilise encore l’agenda et ignore des erreurs au lieu des fenêtres serveur. |
| Tableau de bord : émargements manquants | `EmargementsManquants.tsx` | **Écart** : existence de ligne assimilée à signé, absence de preuve/papier dans la requête ; horaires appareil fixes (après-midi 13h30) ; inscriptions exclues/attente non sélectionnées pour filtrage. |
| Tableau de bord : fin de formation | `EmargementsFinFormation.tsx` | **Écart** : chaque ligne devient une clé signée, attentes reconstruites par jours ouvrés et non dédupliquées entre inscriptions ; exclusions non lues. |
| Tableau de bord : suivi en cours | `SuiviFormationEnCours.tsx`, `suiviFormationIndicateurs.ts` | Images présentes et absences exclues, mais compteur brut de lignes non borné à la session active dans l’extrait ; horaires jour 13–16 au lieu de FC 13–17 ; réserves sur total/période. |
| Tableau de bord : pratique signée EDOF en attente | `PratiqueEdofEnAttente.tsx` | Lectures paginées, classement dates/inscriptions et bilan partagé, EDOF retiré visuellement sans effacer ; pas consultation des feuilles. |
| Correction QRC : absents session/jour | `absenceSessionJour.ts` | Session/jour/admin exacts, papier/présence administrative séparés ; erreur = état non déterminé. Aucun examen modifié. |
| Session : heures des participants | `SessionDetail.tsx` | Images et signed_at contrôlés, lecture bornée aux dates de session ; compte par ID, option FC. Pas lecteur commun des feuilles/papier dans cette requête. |
| Session : télécharger/imprimer feuilles vierges | `SessionDetail.tsx`, `EmargementGenerator.tsx`, `EmargementIndividuelGenerator.ts` | **Distinct** : cases laissées vides, ne restitue pas les signatures existantes. **Écarts** : format différent ; collectif inventorie jours ouvrés de session ; individuel imprime affirmation de case cochée sans donnée de confirmation reçue. |
| CRM : Générer feuille d’émargement | `DocumentsFormation.tsx` | **Distinct** : autre bouton que Voir, produit une feuille vierge ; fallback depuis dates globales si aucune session. Archive nouvelle ligne sans reprendre les preuves existantes ; résultat du dépôt non utilisé pour le toast. |
| Dépôt feuille générée dans le dossier | `saveEmargementToCRM.ts` | Nouvelle ligne et chemin daté conservant l’ancien ; **écart** : URL publique obtenue sans lien privé signé/readback, « idempotent » du commentaire non démontré par le chemin daté. Aucun stockage/réglage changé. |
| Formulaires / Documents complétés | `DocumentsCompletes.tsx` | ID exact, masque et erreurs contrôlés ; classification et notifications. Différent de la vue feuille ; papier géré ailleurs. |
| Activité apprenant / relevés hors formation | `ApprenantActivityReport.tsx`, `ReleveHeuresHorsFormationTab.tsx` | ID exact, filtre période explicite. **Écarts** : rapport activité ignore erreur de lecture des émargements à la mise en état ; relevé hors formation ne lit pas l’image dans sa requête. |
| Contrôle qualité / ZIP individuel / téléchargement groupé | `ControleQualiteTab.tsx`, `BulkDownloadDialog.tsx`, `build-dossier-apprenant.ts`, `controleZipSignatures.ts` | Export signatures session/pratique partagé interrompt sur erreur ; **autres branches hebdomadaires** ignorent l’erreur et prennent `data || []`, distinctes du nouveau lecteur. |
| PDF hebdomadaire | `emargement-semaine.ts` | **Écart** : affiche toujours lundi–vendredi, crée deux cases/jour hors période réelle, première version seulement par créneau et image illisible ignorée. Peut présenter de faux « Non signé ». Horodatage non affiché, preuve numérique conservée dans la base. |
| Journées présentiel dans documents | `journees-presentiel.ts` | **Écart** : ligne non absente suffit à ajouter une date, sans vérifier l’image ; un calcul de pratique par inscription n’est pas une preuve de signature. |
| Aperçu attestation fin | `useApercuAttestation.ts`, `_shared/attestationFinDeps.ts` | ID exact, masques/absences filtrés ; transforme date de cours en 11h UTC pour l’adaptateur de connexion. Pas un vrai signed_at ; flux hors scope, aucune attestation ancienne régénérée. |
| Sources Qualiopi | `qualiopi/crm-sources.ts` | **Écart** : intitulé « Émargement du… » utilise created_at plutôt que date_emargement ; peut afficher novembre pour une feuille d’octobre tardive. |
| Pratique : lecteur images | `pratiqueEmargements.ts` | ID/date exacts, masque exclu ; **écart** : erreur ignorée et dernière ligne remplace la précédente dans la projection sans priorité preuve. |

## Automatismes, fonctions et base — sources lues, aucun appel d’écriture

| Point | Constat |
|---|---|
| `relance-emargements-manquants/index.ts` | **Écart** : nombre de lignes et dates agenda, sans masque/image/absent/signed_at, `count || 0` ignore l’erreur. Ne suit pas les clés de preuves des feuilles. Tâche `relance-emargements-quotidienne` active, 18h UTC. Définition de tâche lue (nom/horaire/active), ni exécution ni contenu déployé de fonction vérifiés. |
| `relance-signatures-fin-session/index.ts` | Même écart de comptage ; tâche quotidienne active à 08h UTC. Aucun mail envoyé ni tâche modifiée. |
| `save-emargement-apprenant/index.ts` | Identité propriétaire/admin/lien explicite, contrôle central date/créneau, preuve existante conservée. **Réserve** : recherche `limit(1)` sans ordre/masque ; réponse succès après write sans relecture retournée. Non exécuté et déploiement non relu. |
| `send-regularisation-emargement/index.ts` | Circuit retiré, refus sans envoi ni écriture ; texte parle de liens rétroactifs interdits, pas du nouveau circuit normal. |
| `send-document-email/index.ts` | Contrôle attestation FC serveur avant envoi, refus si contrôle indisponible ; aucun envoi exécuté. |
| `emargement_theorie_inscrite` + `emargement_creneaux_reels` (définitions actives lues) | Identité dossier/inscription exacte, bornes effectives, exclusions, théorie/pratique, sans emprunt d’images. Horaire fin par défaut 16h : FC sans heure fin explicite peut rester limité à 16h malgré borne FC 17h. Non appelé avec les dossiers Thomas, droits refusés lors du test précédent. |
| `emargement_fenetres_eleve` + `emargement_controle_creneau` | Fenêtres Paris et contrôle du créneau exact ; autorisations owner/admin/liens conservées ; passé inscrit autorisé, futur refusé. Définitions actives lues. |
| Trigger `garde_emargement_fenetre` | Remplacement des anciennes images/dates/IDs/signed_at refusé, nouvelle heure serveur. **Réserve héritée** : exception regularisation_id encore dans la définition active ; aucune suppression/activation faite. |
| Trigger `trg_zz_garde_donnee_eleve` | Trigger de refus DELETE présent sur emargements_fc ; aucun test destructif. |
| `generer_emargements_session`, `generer_emargements_planning_pratique` | Insert-only pour feuilles futures et `ON CONFLICT DO NOTHING` ; donc une ligne existe avant toute signature. Cela rend les compteurs basés uniquement sur l’existence d’une ligne incorrects. Non exécutées. |
| `fc_papier_creneaux` | Lecture owner/admin, document lié non refusé et URL présente ; pas de fausse image. Pas preuve d’accès inter-dossier ; aucun droit élargi. |
| `attestation_fc_controle` | Images + date + non-absence/non-masque, OU preuve papier liée à session ; **écart de périmètre** : dernière session FC seulement, dates globales session ; ne filtre pas emargements_exclus/statut_suivi/session annulée comme les fenêtres. Aucun changement. |
| `presentiel_bilan_jour`, `presentiel_valider_creneau`, `presentiel_signature_valide` | Identité inscription/jour exacte, preuve distincte, refus si déjà signé/protégé. Papier reconnu dans bilan par existence, plus large que la validation document/heures des attestations ; lecture seulement. |
| `releve_sources_apprenant` | Préserve ID/date/signed_at/masque mais projette image en marqueur « signee » ; sessions projetées sans toutes les bornes/exclusions de l’inscription. Source d’archive, pas cible de correction rétroactive. |
| `backup-export/index.ts` | Inclut signatures ; pagination non ordonnée et erreurs interrompent sans refuser la réponse globale. Restauration indépendante non prouvée. |
| `backup-restore/index.ts` | UPSERT par ID et stockage `upsert:true` : ne constitue pas une garantie de conservation des preuves sans contrat de restauration. Jamais appelé pendant cette revue. |
| `sauvegarde-quotidienne-eleves/{index.ts,manifest.ts}` | Signatures dans manifeste, pages par clé, erreurs/incomplet explicites ; code dit intégrité/restauration non prouvées. Tâches actives 01h30 et reprises ; ni sauvegarde ni restauration déclenchée. |
| Gel des relevés | Tâche `geler-releves-fin-acces` active (horaire lu seulement). **`geler_releves_fin_acces()` jamais exécutée manuellement** ; archives non modifiées. Le corps de cette fonction n’a pas été relu dans cette revue : NON VÉRIFIÉ. |

## Conclusions et limites

- **PASS maintenu uniquement pour le même dossier dans les parcours fictifs de la vue commune** : 31 tests + huit comparaisons PC/mobile, PDF imprimés identiques, signatures Thomas inchangées avant/après au contrôle précédent.
- **Parité complète de toute l’application : NON PROUVÉE et écarts identifiés** (tableau de bord, relances, hebdomadaires, papier, sources Qualiopi, rattrapage texte).
- **Accès réel Thomas et administrateur : NON PROUVÉ**. Le compte disponible connecté n’est pas admin ; les deux dossiers lui sont refusés. Aucun compte Thomas emprunté, test de signature réelle, paiement, mail ou téléchargement de preuve réelle réalisé.
- Les tâches étaient actives à la lecture ; aucune assertion sur leurs derniers résultats ni leurs fonctions effectivement déployées.
- Tous les documents signés/envoyés, factures payées, relevés figés, réglages, permissions et exemples existants restent inchangés.

## Demande d’accord ciblée

Autoriser un lot supplémentaire pour aligner les **nouveaux affichages et calculs** : tableaux de bord et relances sur clés dossier/date/créneau avec preuve réelle ; feuilles hebdomadaires/ZIP sur périmètre réel et erreurs explicites ; visibilité des preuves papier sans créer d’image ; intitulés Qualiopi/rattrapage fidèles à date de cours et règle actuelle. Sans reclasser rétroactivement les historiques, fusionner Thomas, modifier les droits, envoyer un mail ni publier.

La réunion des deux dossiers Thomas demeure une décision distincte ; les signatures d’octobre ne pourront jamais certifier novembre par simple rattachement.