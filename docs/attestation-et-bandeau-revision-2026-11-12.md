# Attestation visuelle et bannière de reprise — 12/11/2026

## Statut
Préparé en aperçu uniquement. Aucune migration installée, fonction déployée, publication, attestation réelle créée, mail envoyé ou rattrapage réel exécuté.

## Attestation
- Asset officiel retrouvé et inspecté : `src/assets/logo-ftransport.png`, horizontal bleu/noir, emblème F et chapeau, sous-titre officiel. Aucun logo généré.
- Nouveau moteur A4 `pdfPresentation.ts`, indépendant de l’export historique signé ; palette papier déclarée dans les tokens CSS. Logo, coordonnées/NDA exacts, identité/formation/dates, deux zones séparées, filigrane dans une bande vide pour ne pas recouvrir texte et signatures.
- Bouton CRM ouvre maintenant un aperçu PDF tactile avec téléchargement. Aucune durée/heure/compteur dans le nouveau PDF ; les contrôles existants ne changent pas.
- Aucune preuve globale serveur figée de tous les jalons n’étant fournie par le circuit actuel, les vrais brouillons ne disent jamais « tous les jalons ». Le cas complet fictif vérifie cette phrase sur preuve structurée explicite. Léa reste visuellement BROUILLON / NON VALABLE.
- Signature/tampon existants identifiés dans le stockage privé, non chargés ni apposés sur un brouillon. Export final refusé sans preuve complète, autorisations, tampon, signatures et même empreinte. Les documents signés existants et leur circuit public/export restent inchangés.
- Limite : nouveau modèle final non branché sur un contenu serveur figé/versionné comprenant la preuve globale et l’autorisation du tampon. Aucun faux PDF final livré ; ce raccordement reste un chantier distinct avant activation.

### QA PDF
PASS : export navigateur ordinateur 1280×1800 et mobile 390×844 des cas fictifs complet/incomplet ; 1 page A4 595,28×841,89 points. Conversion indépendante via pdftoppm puis inspection visuelle de chaque PDF : logo, caractères français, marges, identité, dates, filigrane, signatures, pied de page. Aucun chevauchement ni texte coupé observé ; aucune correction de mise en page nécessaire après inspection. Texte extrait : aucune mention d’heure/durée. Aperçu canvas mobile non débordant, téléchargement réel réussi, aucune erreur JavaScript.

NON PROUVÉ : ouverture authentifiée du dossier réel Léa — le navigateur de contrôle n’a pas atteint son onglet (timeout). Aucun essai d’écriture réelle n’a été effectué. Documents doublement signés réels non réexportés, car ils doivent rester inchangés.

## Urgence bannière questions fausses
### Audit production SELECT uniquement
- 70 reprises `revision_fausses` en cours et 221 clôturées ; aucune `bilan_revision` enregistrée à cet instant.
- 221 clôtures : 112 avec résultat explicitement lié, 109 sans résultat lié. Les 109 ne sont pas des complétions prouvées : seulement 2 portent une couverture structurée complète avec sources ; 107 restent non prouvées.
- 207 résultats de révision : 112 avec ID de reprise, 93 avec ordre de questions, 48 avec références de copies sources.
- 36 résultats sans sources dans le reçu ont des sources dans leur reprise explicitement liée. Cela ne signifie pas que les 36 satisfont tous les autres contrôles ou concernent la copie actuellement affichée.
- Aucun candidat nommé dans la demande ; aucun rattachement par heure, nom ou proximité temporelle. Aucun état réel modifié.

### Causes et correctif
1. Ancienne bannière vérifiait seulement la présence de `details.sourceResultIds` dans le résultat : une finalisation dont les références existent uniquement dans sa reprise serveur liée restait masquée.
2. Cette vérification ne contrôlait pas la couverture complète : une sous-liste de références aurait pu prouver à tort tout le passage.
3. Finalisation Bilan futur préparée mais OFF : toutes les réponses sauvegardées ne sont pas assimilées à une finalisation serveur absente.

- Lecteur commun `revisionBannierePreuve.ts` : résultats et reprises relus, pagination PK par 100, compte/examen/ID exacts, même ordre complet, réponses non vides/validées, résultat et score de reprise identiques, sources exactes par question. Sources manquantes dans le reçu utilisables seulement depuis sa propre reprise persistée ; sources contradictoires refusées. Zéro écriture.
- Relecture entrée/focus/visibilité/reconnexion, résultats périmés ignorés ; erreur visible avec Réessayer, aucun faux état terminé.
- Les références sources sont conservées dans l’état terminal mis dans la file existante et le reçu, sans toucher les réponses initiales.
- Bandeau partagé agrandi : texte exact « QUESTIONS FAUSSES DÉJÀ EFFECTUÉES ✅ », icône, contraste, graisse, mobile/ordinateur, reprise conservée.
- Bilan futur : `submitted` nécessite aussi toutes réponses/source/date valides ; double clic après confirmation est sans réécriture. Retour de nouvelle reprise explicite possible après résultat confirmé.
- Réconciliation d’une clôture EB complète reste déclenchée volontairement via le bouton Terminer existant, reçu unique et relecture exacte ; aucune réconciliation automatique/massive. Reprises sans preuve complète restent refusées. Finalisation Bilan futur et RPC candidate EB restent OFF/non installées.

## Tests réellement exécutés
- 55 tests dans 9 fichiers : attestation/proof/circuit/date, révisions Bilan/QCM multiples/QRC, réseau/concurrence, EB file/reload/finalisation.
- 63 tests dans 9 autres fichiers : révisions/comportement/retry/questions figées, signatures, jalons et notes historiques.
- 2 tests du lecteur paginé ajoutés et exécutés ; tests modifiés de références terminales exécutés avec les suites ciblées : 25 PASS, dont 23 déjà comptés ci-dessus. Total distinct : **120 tests Vitest PASS**.
- 4 contrats PostgreSQL jetables PASS : concurrence/rejeu et original inchangé, incomplet refusé, version périmée, autre propriétaire. Aucun accès production en écriture.
- Chromium PC/mobile : vrai composant Bilan sur transport fictif, serveur lent 250 ms, multi-choix, refresh/relecture et finalisation OFF honnêtement bloquée ; grand bandeau et bouton de reprise visibles sur fixtures.
- Aperçu : dernier journal `build OK`. Avertissements React act dans les suites anciennes et erreurs simulées de refus réseau attendues ; aucun échec de test.

## NO-GO publication
- Finalisation Bilan futur source/CAS non installée ; schema/triggers complets production non rejoués.
- Nouvelle attestation finale nécessite preuve globale/version figée et autorisation du tampon dans le circuit serveur.
- Matrice authentifiée complète TAXI/VTC/TA/VA × EB1–6 × jour/soir, bandeau réel candidat, deux onglets navigateur de chaque variante : NON PROUVÉE. Tests de logique et transports fictifs ne la remplacent pas.
- Les deux reprises complètes sans reçu ne sont pas rattrapées : identification/autorisation nominative requises avant une action réelle.
- Aucune publication avant validation utilisateur et garanties critiques restantes.