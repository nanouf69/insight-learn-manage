# Émargements lundi 02/11/2026 — contrôle du 01/11

## Résultat prouvé
- Migration 0235 appliquée à la base partagée à 14:28 UTC ; aucun site publié. Le site déjà publié appelle les mêmes fenêtres et garde serveur, signatures inchangées.
- 46 inscriptions / 40 personnes, six TAXI croisés dédupliqués. 33 personnes éligibles lundi, 66 créneaux : 15 avec compte (30 créneaux), 18 sans compte (36 créneaux). Six TA n'ont plus de théorie lundi après leurs cinq premiers jours ouvrés ; SMAIL Sifeddine est en ligne et n'a pas de droit théorie.
- 12 feuilles vides insérées pour CHEMOUN Mourad, HAMDI Mohamed, MEMDOUH Ilies, HADDOU MASSINISSA, SARKISIAN Pogos, Alpha Barry. Deuxième exécution identique : 0 insertion.
- Feuilles lundi : 24 → 36, toutes sans image et sans absence. Six feuilles préexistantes de Pndukyan, RAYMAN, Dakhlaoui sont conservées mais n'ouvrent pas un droit lundi. Aucune régularisation créée.
- Empreinte des 3 041 feuilles préexistantes avant/après : `54194fe51af9044c12e92e6d2eb57a64`, strictement identique. Les feuilles vides conservent le défaut historique signed_at NOT NULL ; ce timestamp n'est pas une preuve de signature sans image.

## Règles
Théorie fondée sur inscription et intersection dates, jamais agenda. Journée 09–12 /13–16 ; soir17–18:30 /18:30–21 ; lundi–vendredi. TA cinq premiers jours ouvrés, date de fin personnalisée explicite prioritaire. Exception FC existante 13–17 conservée. Pratique inscrite/réservée indépendante, aucun forfait +2. Ouverture −30 min propre à chaque début, écriture ordinaire aujourd'hui seulement ; passé exige régularisation. Propriété et identité restent vérifiées.

## Tests réellement exécutés
- PostgreSQL isolé :22/22 PASS sur fichier exact0235, frontières, DST, TA, dates personnalisées, croisement, weekend, attente/exclusion, propriétaire, passé/régularisation, conservation images/identité/signed_at, génération idempotente et sans compte.
- Vitest155/155 PASS sur17 fichiers émargements/signatures.
- Contrôle application : build OK14:30 UTC.
- SELECT nominatif droits reproduit en lecture seule :66 droits /33 personnes. Appel direct fonction restreinte refusé42501 : aucun élargissement de droits d'audit.

## Fichiers
`drizzle/migrations/0235_attendance_enrollment_rights.sql`, `src/lib/emargementSessionSlots.ts`, `src/lib/signaturesPlanningReel.ts`, `src/lib/signaturesManquantes.ts`, `src/lib/buildSessionAgendaDays.ts`, `src/components/crm/apprenant-sections/DocumentsFormation.tsx`, trois fichiers tests, `AGENTS.md`, `roadmap.md`.

## Limites explicites
- Aucun test de signature réelle ni connexion apprenant en production ; tests SQL utilisent schéma catalogue et garde, pas toutes les RLS/triggers de production. Aucune signature fictive créée.
- Les18 comptes absents ne sont pas créés : interdit par périmètre ; leurs créneaux sont planifiés mais connexion autonome non prouvée.
- Calendrier explicite session_calendrier_jours :aucune exception dans les trois sessions cibles. Exceptions d'autres sessions, collectifs PDF et relance serveur agenda non harmonisés dans ce correctif ciblé ; aucun mail envoyé.
- Compteurs/feuilles PDF locaux corrigés, pas servis au site tant que publication non autorisée. Pratique PDF exige horaires effectivement inscrits et refuse source inconnue.
- Pratique dans inventaire :dates de sessions/réservations réellement enregistrées, pas nouveau quota ni présence ; chevauchement théorie/pratique garde la même identité feuille.
- Chantier global sauvegardes/EB/corrigés reste ouvert, interrompu par cette priorité, aucun correctif pédagogique appliqué ici.

## Audit nominatif40 personnes
|Nom|Prénom|Parcours|Compte|Créneaux lundi|Théorie cible|Feuilles avant→après|Pratique enregistrée|Anomalie|
|---|---|---|---|---|---|---|---|---|
|ABDELHAK|MOHAMMED|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|ADYAHYA|Kamal|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|AIT BALLAGH|SAMI|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|Alpha|Barry|vtc|oui|matin,apres_midi|20|0→2|aucune||
|Bekkis|Abdessamad|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|BEN ALI|Mohktar|ta|oui|aucun|10|0→0|aucune|TA première semaine finie|
|BENAKKI|Ayoub|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|BENCHAKR|ANISS|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|BENKHELIL|HASSEN|taxi|oui|matin,apres_midi|32|2→2|aucune||
|BENNANI|Meriem|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|Berhane Gebremedhin|Samson|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|CABRAL DE SOUSA FURTADO|José|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|CHALA|Rachida|ta|oui|aucun|10|0→0|aucune|TA première semaine finie|
|CHEMOUN|Mourad|taxi|oui|matin,apres_midi|32|0→2|aucune||
|Dakhlaoui|Ilyes|ta|oui|aucun|10|2→2|aucune|TA : première semaine finie, feuilles lundi existantes conservées hors droit|
|DAKHLI|Zine|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|DIABY|Mohamed|vtc|oui|matin,apres_midi|20|2→2|aucune||
|DIALLO|Kama|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|DIANE|Mohamed|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|HABLANIS|Anis|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|HADDOU|MASSINISSA|taxi|oui|matin,apres_midi|32|0→2|aucune||
|Haddouche|Djamel|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|HADJ ALI|Arezki|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|HAMDI|Mohamed|taxi|oui|matin,apres_midi|32|0→2|aucune||
|HASNAT|MEHDI|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|KOUGBE TE BIBANGA|Vianney|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|MAHROUG|Mohamed Amin|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|MALKI|Ahmed|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|MEMDOUH|Ilies|taxi|oui|matin,apres_midi|32|0→2|aucune||
|Mfouemo|Rodrigue Rodrigue Etienne|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|MLIKI|Mohamed|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|NAZARYAN|KAREN|vtc|oui|soir_1,soir_2|20|2→2|aucune||
|Pndukyan|Harutyun|ta|oui|aucun|10|2→2|2026-06-15|TA : première semaine finie, feuilles lundi existantes conservées hors droit|
|RAYMAN|CIHAN|ta|oui|aucun|10|2→2|aucune|TA : première semaine finie, feuilles lundi existantes conservées hors droit|
|SAIDI|Aymen|vtc|non|soir_1,soir_2|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|SARKISIAN|Pogos|taxi|oui|matin,apres_midi|32|0→2|aucune||
|SELMI|KAIS|vtc|non|matin,apres_midi|20|0→0|aucune|Compte absent : droit planifié mais aucune feuille liée à un compte créée|
|SENE|Mamadou|vtc|oui|matin,apres_midi|20|2→2|aucune||
|SMAIL|Sifeddine|vtc|oui|aucun|0|0→0|aucune|Théorie e-learning exclue|
|SOUICI|Ahlem|ta|oui|aucun|10|0→0|aucune|TA première semaine finie|
