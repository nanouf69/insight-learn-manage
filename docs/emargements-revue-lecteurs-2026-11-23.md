# Émargements — revue des autres lecteurs, 23 novembre 2026

> Rectification prioritaire 15:37 UTC : la vraie formation de Thomas est uniquement les 17–18 novembre. Les dates d’octobre mentionnées ci-dessous sont des valeurs stockées potentiellement erronées, jamais des journées réellement suivies. Deux signatures novembre annoncées restent introuvables après recherche numérique/papier/documents ; voir `emargement-thomas-rectification-2026-11-23-1537.md`.

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

## Nouvelle relecture transversale après rectification (23/11, après 15:37 UTC)

La règle en termes utilisateur : **les deux vues doivent montrer la vraie session et les mêmes signatures prouvées à la même date/créneau, jamais une image d’une autre période**.

Les points de l’inventaire écrans/flux ci-dessus ont été recherchés à nouveau dans le code courant : 60 fichiers sources ouverts pour extraction des lectures, des clés de date/créneau et des contrôles d’image. Relecture ciblée approfondie des listes apprenants, tableaux de bord, PDF hebdomadaire, signatures papier, relance manuelle, ancien lien de régularisation et deux relances automatiques. Il s’agit d’une **lecture de code, pas d’une exécution utilisateur ou de ces tâches**.

### Résultats confirmés / réserves

- **Vue commune (cours, remboursement FC, CRM Documents/Formations/Dossier)** : même ID et mêmes images/date de cours ; ne convertit pas signed_at en date suivie. Toutefois elle réunit toutes les images du dossier avec ses attentes, sans séparation explicite « hors session » ; les preuves papier restent absentes. Elle ne peut pas résoudre le dossier connecté erroné de Thomas ni inventer les deux preuves manquantes.
- **Signature d’entrée dans les cours et formulaire de signature** : date ciblée transmise au serveur et droits exacts ; pas de déduction de présence à partir de l’heure de saisie. Réserve : consultation et ouverture n’ont pas le même périmètre pratique ; erreur de lecture peut être ignorée sur certains chemins.
- **CRM manquants/planning/heures, papier Session/Dossier, export rassemblé et ZIP signatures, taux présentiel/jalons, absents QRC et pratique EDOF** : clés dossier/date/créneau ou inscription exactes ; non-emprunt des images entre périodes. **Parité totale non prouvée** : attentes locales/serveur différentes, papier non visible partout, exports préparés et sources d’archive distinctes. Présence administrative n’est pas une signature.
- **Liste apprenants, tableaux de bord manquants et fin de formation** : écart confirmé, existence de ligne assimilée à preuve sans lire l’image/signed_at. **Suivi en cours** : compteur brut des images du dossier, sans borne à la session active ; le helper `suiviFormationIndicateurs.ts` est plus strict mais cet écran ne l’utilise pas dans le calcul relu ; horaires FC encore 13–16 dans l’écran.
- **PDF hebdomadaire / branches Documents complétés, rapport d’activité, Contrôle qualité, téléchargement groupé et dossier individuel** : cinq jours et cases par défaut, première version par créneau ; faux manques hors session possibles. Les erreurs ignorées dans certains lecteurs ne doivent pas être interprétées comme une absence. Feuilles personnalisées/collectives/individuelles vierges restent un autre usage, pas des preuves signées.
- **Qualiopi** : libellé basé sur created_at, pas date_emargement, donc date de saisie tardive susceptible d’être prise pour date suivie.
- **Ancien lien de régularisation** : retiré sans écriture mais texte contredit les signatures passées autorisées dans le circuit normal ; relance manuelle actuelle distingue correctement date du cours et heure réelle.
- **Attestations** : contrôle FC exige image datée ou preuve papier exacte ; périmètre dernière session reste distinct des fenêtres d’émargement. Adaptateurs d’aperçu convertissent date du cours en heure technique, pas heure de signature réelle. Aucun document existant régénéré.
- **Sauvegardes/restauration** : sources relues, aucune opération appelée ; restauration indépendante toujours NON PROUVÉE. Ne pas modifier des archives pour « corriger » un affichage courant.

### Fonctions et tâches réellement relues maintenant

Définitions actives lues : `emargement_creneaux_reels`, `emargement_theorie_inscrite`, `emargement_fenetres_eleve`, `emargement_controle_creneau`, `garde_emargement_fenetre`, `fc_papier_creneaux`, `attestation_fc_controle`, `generer_emargements_session`, `generer_emargements_planning_pratique`, `presentiel_signature_valide`, `releve_sources_apprenant`, `geler_releves_fin_acces`. Aucune appelée pour écrire. Le corps du gel a cette fois été lu : archive par dossier, appelle la source figée, ne transfère aucune signature ; **jamais exécuté manuellement**.

Écarts maintenus : insert-only de feuilles vides incompatible avec les lecteurs « ligne = signé » ; contrôle attestation sur dernière session seulement ; source figée transmet un marqueur d’image et toutes les sessions ; exception de régularisation dans le garde conservée. Les droits/protections n’ont pas été modifiés. Les fonctions `presentiel_bilan_jour` et `presentiel_valider_creneau`, ainsi que le trigger anti-DELETE, ont été lues dans la revue précédente, **pas relues dans cette nouvelle passe** ; leur conformité actuelle n’est pas certifiée ici.

Sources locales relues : `save-emargement-apprenant`, `send-document-email`, `send-regularisation-emargement`, les deux relances, sauvegarde quotidienne/manifeste et backup-export/restore. Déploiements et résultats d’exécution NON VÉRIFIÉS. Horaires/états des tâches relus : relances quotidiennes 18h et 08h UTC, gel chaque heure à :07, sauvegarde 01h30 et reprises 01h–05h ; actives, aucun déclenchement effectué.

### Limites et décision requise

La demande demeure limitée au module des feuilles : **aucun correctif hors module appliqué**. Les deux signatures novembre et le rattachement autorisé du compte Thomas restent non retrouvés ; parcours réel Thomas/admin, PDF de ses images réelles et parité générale de l’application NON PROUVÉS. Aucun nouveau test navigateur ni signature réelle exécuté pendant cette passe.

Accord ciblé nécessaire avant correction prospective des listes/tableaux de bord, relances, PDF hebdomadaires/ZIP, papier visible et libellés Qualiopi/régularisation ; conservation intégrale des feuilles, pièces signées/envoyées, paiements, archives, droits et réglages. Le cas Thomas nécessite séparément les deux preuves exactes, sans transfert automatique depuis octobre.