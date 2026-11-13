# EB5 VTC Q3 — corrigé visible, aperçu seulement

## Cause prouvée par lectures seules
- Éditeur `module_editor_state` 90004, enregistré le 13/11 à 08:25:47 UTC : Sécurité routière question 3, C = **4 minutes**.
- Publication EB5 VTC v10, 08:25:49 UTC : `securite:3`, même C = **4 minutes**.
- 53 snapshots EB5 portent cette question avec C = **8 minutes**. Les autres copies ne contiennent pas forcément cette matière.
- Ce n’est pas une modification de lettre : le corrigé reste C. `corrige_officiel_actuel` ne retourne que les différences de lettres, pas de textes.
- L’écran conserve volontairement le sujet de la tentative ; la publication `exam_content_versions` n’appartient pas au Realtime actuel. `module_editor_state` y appartient.

## Changement livré en aperçu
- `src/lib/examCurrentCorrection.ts` : projection pédagogique distincte, identité exacte examen/matière/question/type, doublons refusés. Texte substantiellement modifié = aucune réinterprétation de la réponse initiale.
- `src/hooks/useExamCurrentCorrection.ts` : lecture ciblée directe du JSON réellement enregistré + `updated_at`, aucun repli statique. Realtime ciblé sur le module, événement local/inter-onglets existant, focus/visibilité/retour réseau, single-flight, lectures périmées ignorées, abonnement nettoyé. Aucun nouveau polling.
- `src/components/cours-en-ligne/ExamCurrentCorrectionNotice.tsx` : document distinct « Corrigé administrateur actuel », date réelle, bonnes propositions actuelles et avertissement historique.
- `src/components/cours-en-ligne/ExamenBlancsResultats.tsx` : branchement dans les corrections QCM élève et leur vue admin partagée, pas dans le passage interactif.
- `src/features/correction-qrc-v2/CopieNativeLecture.tsx` : même notice en consultation native admin après remise uniquement.
- Tests et harness isolé dans `src/test/exam-current-correction*`; règle d’architecture dans AGENTS.md, suivi dans roadmap.md.

## Garanties
Les snapshots, réponses, scores, verdicts, barèmes, reprises et finalisations ne sont pas remplacés ni recalculés. Aucune migration, écriture réelle ou publication. La notice est un corrigé **administrateur enregistré**, pas une affirmation que cette édition est publiée dans chaque circuit. Pour Q3, les deux états ont été vérifiés séparément et concordent.

L’identité sert à désigner le document actuel de la question, pas à établir la continuité sémantique des options. Une ancienne sélection C « 8 minutes » n’est jamais transformée en sélection C « 4 minutes ». Les correcteurs QRC/IA et les flags d’activation existants restent inchangés.

## Tests exécutés
- 46 tests ciblés PASS : Q3 8→4 sans changement de clé, EB1–6, isolation filière/matière/ID, clés multiples, doublons, lecture invalide, stale response, panne/retour réseau, compte changé, sortie et épreuve sans lecteur.
- Suite entière : **4 727 PASS**, **13 ignorés**, **0 échec**, 552 fichiers réussis/2 ignorés.
- Compilation automatique observée : **build OK** (dernier signal 08:57:43 UTC).
- Chromium fictif avec requêtes interceptées avant navigation : PC 1280×1800 et mobile 390×844, événement local → C 4 minutes visible sans reload ; C 8 minutes et 13/20 historiques conservés ; notice absente en mode épreuve ; zéro erreur JS/débordement et zéro requête réelle d’écriture. Captures examinées.

## Limites / NO-GO
- Le parcours complet sur un vrai compte apprenant et la réception Realtime inter-appareils réelle n’ont pas été exécutés ; les fixtures testent le handler et l’affichage, pas la livraison du service.
- Les tentatives commencées conservent leur texte et leur barème initial, même après édition. Les futures doivent utiliser la publication serveur confirmée : pas de remplacement silencieux.
- Le polling préexistant de la page générale n’a pas été modifié dans ce lot, conformément au plan approuvé.
- Sauvegarde intégrale comptes/base/fichiers et restauration isolée toujours NON PROUVÉES : **publication NO-GO**, correctif non publié.
- Les contrôles SELECT agrégés de snapshots/notes sont des observations à des instants distincts pendant l’activité réelle, pas une preuve avant/après sur un périmètre immuable ; aucune conservation globale non mesurée n’est revendiquée.