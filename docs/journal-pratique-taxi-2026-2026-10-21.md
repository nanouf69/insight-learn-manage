# Pratique TAXI — ajout autorisé, 21 octobre 2026

## Périmètre réel
Module 6 : SELECT 10 cours/1 exercice. Ajout séparé de trois activités ; rien dans module_editor_state ni contenus préexistants. Nouveaux IDs immuables `jeu_taxi_2026_feries_v1`, `jeu_taxi_2026_tarifs_v1`, `jeu_taxi_2026_rtst_v1`. Registre daté depuis `now()` serveur 16:35:40.331 UTC, pas heure tablette. Identités concernent tous les parcours contenant réellement module 6 (dont TAXI/TA), jamais module 8.

## Modifications
- `src/components/cours-en-ligne/pratique-taxi-2026/donnees.ts` : 11 dates, 30 QCM, 13 scénarios complets, quatre saisies, fonctions de calcul sourcées, hypothèses sans pénalité.
- `ExercicesTaxi2026.tsx` : trois entrées, calendrier sélectionnable, QCM par cases, étapes RTST, corrigés rouges et commandes adaptatives ; pas de note.
- `persistance.ts`, `useActiviteTaxi.ts` : journal de saisie isolé compte/activité/version, pas suppression d’ancienne file ; queue existante, succès après accusé ET relecture exacte ; garde contre réponse asynchrone ancien compte ; lecture impossible affichée distinctement ; réalisation serveur figée en lecture seule.
- `src/lib/jeuxPedagogiques.ts` : trois entrées additives ; `ModuleDetailView.tsx` : lazy mount seulement module 6 ; aucun objet cours/question changé.
- Protection SQL additive dans le brouillon, non appliquée : vérifie 11/30/52 réponses présentes, score nul, version/revision ; terminal immuable, autres IDs passent inchangés. Contrôle disponible par RPC avant toute nouvelle saisie réelle, pas faux backend opérationnel dans le brouillon.
- Tests `pratique-taxi-2026.test.ts`, `pratique-taxi-2026-persistance.test.tsx`, `taxi-2026-server-guard.sql`, `taxi2026BrowserHarness.tsx` ; test `jeux-lyon-jalons.test.ts` adapté à l’ajout demandé pour TAXI/TA (ancien test supposait zéro activité module 6).
- AGENTS root/local et roadmap ajoutés sans remplacement historique ; preuves réglementaires dans `docs/preuves/taxi-rhone-2026/sources.md`.

## Tests réellement exécutés
1. Vitest : 8 fichiers / 90 tests PASS (règles nouvelles, gel, horloges 2025/2030, compteur 125→100%, lecture indisponible, isolement/persistance fictive, files existantes).
2. Travaux préexistants : 5 fichiers / 32 tests (convocations, Lyon, grilles). Premier passage 31 PASS/1 FAIL attendu car ancien test « TAXI sans activité » ; cible adaptée explicitement aux trois nouveaux IDs et rejouée.
3. PostgreSQL local sur socket /tmp et port 55439, base jetable sans variables connexion production : protection préparée exécutée ; pour chacun des trois IDs incomplet refusé, complet accepté, écriture terminale refusée ; score refusé et ligne legacy 88 intacte (11 assertions). Serveur local arrêté. Ne prouve pas la combinaison de tous les triggers/RLS de production.
4. Playwright harness séparé, aucune route ajoutée à l’application ; HTML injecté à `http://localhost:8080/__taxi_test`, toutes requêtes externes interrompues. Ordinateur 1280×1800, tablette portrait 800×1280, paysage 1280×800, mobile 390×844. Sur chaque : RTST saisie/corrigé rouge/enregistrer/fermer/rouvrir/recharger/autre compte/panne, calendrier sélection + correction et QCM cases + correction. Aucun débordement horizontal ni erreur JS. Les 13 étapes complétées jusqu’à confirmation par transport **fictif**, sans écriture Cloud. Captures `/tmp/browser/taxi-2026/screenshots`, sorties `resultats.log`.
5. Compilation/types automatiques : erreurs initiales TypeScript (VolumeModule et generic RPC) corrigées ; dernier résultat harness build OK 16:43:39 UTC. Aucun build/typecheck manuel.
6. Arrondi initial 45 min 30,97 détecté par test : calcul en centimes 4130×45/60 évite l’artefact binaire ; tests exacts 10,33/30,98/6,88 PASS.

## Intégrité lecture seule avant/après
Empreintes reproductibles de ce tour (pas comparables aux anciennes méthodes sans leur requête) :
- module_editor_state : count 62, MD5 de concat module_id + module_data ordonnée = `bbb6f08b16f0d4f4ef29e3d9db32edbd`, identique.
- exam_content_versions : count 57, MD5 concat id + row_to_json ordonnée = `d4971facecd63dca241b9007da361b36`, identique.
- releve_jalons_gels : 0 lignes, MD5 NULL avant/après ; ne prouve pas l’ancienne baseline « relevés22 ».
- Sept fichiers protégés SHA256 inchangés (cartes VTC, grille, file centrale, ancien cas pratique TAXI, helpers convocation existants). Baseline sous /tmp/taxi-2026/integrite-source.json.
- Aucune mutation Cloud, aucun compte TEST créé, aucune invocation d’envoi/correction IA, aucune donnée Ismail AMAR lue individuellement/modifiée. Aucun document/signature/score/heure/date de validation touché.

## Limites et état
**NON PUBLIÉ, brouillon non accepté.** La protection des nouvelles activités s’appliquera uniquement lors d’une acceptation future du brouillon : elle n’a pas été installée maintenant. En l’absence de cette protection, le suivi réel indique indisponible et n’autorise pas de saisie/validation serveur ; aperçu/calculs contrôlés dans un harness explicitement fictif.

Blocages centraux restant : vraie sauvegarde/validation Cloud et combinaison des triggers/RLS non vérifiées sans protection appliquée et contexte de test isolé ; appareil tablette réel non disponible. Provenance PDF préfectoral indirecte (site maintenance), ZUPC actuele non prouvée par annexe de 2018, texte exact fauteuil et refus sécurité ivresse non obtenus. Ces scénarios restent conditionnels sans pénalité. Voir dossier de preuves pour écarts bagages/retour et sources exactes.

Les travaux antérieurs (convocations, cartes VTC, grilles brouillon et autres entrées roadmap) restent présents, sans nouvelle publication ni intervention sur leurs fonctionnalités.