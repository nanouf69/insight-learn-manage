# Correctif ciblé : menu historique EB2 VTC

Autorisation 09/11/2026 13:33 UTC. Aucun changement serveur ni migration, aucune écriture de données réelles par les vérifications. Publication autorisée seulement pour ce correctif.

## Diff fonctionnel
- `src/features/correction-qrc-v2/eb2Historique.ts` : frontière exacte EB2, exclusion par identifiant original prouvé dans un snapshot V2 ; identité par résultat/tentative, jamais par date/texte.
- `src/features/correction-qrc-v2/noyauReel.ts` : lecture historique EB2 + EB3 existant, pagination et ordre stable completed_at/id ; lecture des liens V2 par pages, exclusion des 432 fiches EB2 déjà copiées.
- `src/pages/AdminCorrectionQrcV2Reel.tsx` : libellé « EB2 — VTC — ancien circuit », lecteur historique existant par IDs originaux ; filtre candidat EB2 et dates conservés. Autres circuits inchangés.
- `src/components/cours-en-ligne/CorrectionQRCTab.tsx` : uniquement dans la vue historique EB2 autorisée, T1/T2 non fusionnées par texte identique ; barème/corrigé figés préférés, correction déjà enregistrée affichée sans nouveau calcul mots-clés courant. Preuve historique insuffisante explicitement signalée. Aucune modification aux actions d'écriture.
- Deux nouveaux tests : `correction-qrc-eb2-legacy-menu.test.ts`, `correction-qrc-eb2-legacy-scope.test.tsx`.
- Documentation : AGENTS, roadmap, rapport et plan approuvé.

## Périmètre public vérifié
Site public lu avant changement : `/assets/index-BbNPGt9M.js`, métadonnée de commit `724e6abf3474d902eba3255baee7ce53bdba0e12`. Comparaison Git de cette référence aux fichiers actifs : seuls les quatre fichiers fonctionnels ci-dessus et deux tests changent sous src ; aucun fichier supabase, auth, verdict, moteur EB, protection EB2/EB3 ou contenu pédagogique ne change. Les autres écarts sont le rapport d'audit précédent, roadmap et plans/documents. Les prototypes jetables étaient déjà dans la référence publique et restent sans import applicatif ni migration active. Auth `previewAuthStorage.ts` identique à la référence examinée ; non modifié.

## Tests et vérifications exécutés
- 62/62 PASS sur sept fichiers, exécution finale 13:43:49 UTC ; cinq tests frontière/pagination/identité, deux écran IDs/date/reload, 55 non-régression existants.
- Premier essai : erreur syntaxique dans le filtre, corrigée ; dernières suites et compilation réussies.
- Compilation automatique : build OK 13:42:46 UTC ; `git diff --check` sans erreur.
- Navigateur authentifié réel, localhost, toutes les écritures bloquées sauf RPC de lecture `has_role` : menu ouvre les QRC historiques des sessions novembre journée et soirée. À l'instant observé : 34 résultats matière journée, 3 soir ; nombres évolutifs pendant les compositions. Soir : lecteur 7 QRC en attente, réponse et corrigé présents, aucune note cliquée.
- Filtre date 03/11 exécuté, URL conservée, rechargement conservant session/EB/date exécuté ; toutes dates restaurées.
- Les menus EB1, EB1-TAXI, EB2-TAXI, EB3–EB6 restent présents ; EB2 historique et V2 séparés.
- 432 liens V2 EB2 inchangés ; empreinte du catalogue versions EB2/TAXI avant/après identique `223711e3128dd7833bca587b87e6175c`. Aucune version retirée réactivée.
- Scan backend 13:37:56 : aucun critique, six avertissements existants et deux informations ; aucune permission modifiée. Connecteur de scan non configuré ; analyse approfondie non lancée dans ce périmètre.

## Limites et publication
Vérifications du lecteur admin réalisées sur données réelles mais sans action de correction, conformément à l'autorisation. Pas de test sur appareil physique ; aucun changement de validation élève. Les anciennes fiches sans preuve complète restent signalées, jamais reconstituées depuis un nouveau sujet.

Demande de publication à lancer après cette revue. Un retour de l'outil indiquera une demande programmée, pas encore une preuve du site déployé ; contrôle HTTP et parcours public restent requis avant de dire « en ligne ».