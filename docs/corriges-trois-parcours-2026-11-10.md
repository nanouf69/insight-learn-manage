# Synchronisation des trois parcours — 10/11/2026 17:00 UTC

## Verdict : NO-GO, aucune publication ni installation serveur

La demande complète n'est pas livrée. Le candidat est préparé et **désactivé** par `CORRIGES_TROIS_SURFACES_ACTIFS=false`. Le SQL est dans `docs/sql-revue/2026-11-10-corriges-trois-surfaces.sql`, pas dans une migration active. Aucune écriture sur notes, réponses, copies, questions, signatures ou contenu publié. Aucun appel IA.

## Les trois surfaces

| Parcours | Preuve obtenue | Statut |
|---|---|---|
| Éditeur / version officielle | Lecture réelle : EB3 VTC version 23, publiée 15:59:36 UTC ; TAXI version 10, 15:59:38 UTC ; Français `francais:4`, A+C | A+C publié confirmé ; édition→CAS→publication sur deux onglets non rejouée |
| Correction examen élève / admin | Nouveau panneau séparant corrigé actuel versionné et notation historique, prévu également dans la branche QRC en attente | Code préparé, non activé ; parcours positif réel A+C non prouvé |
| Questions fausses / admin des réponses refaites | Source commune par ID copie + matière + question ; ajout du corrigé à côté de l'initiale et de la dernière réponse persistée ; Français inclus après activation | Tests de projection PASS ; révision serveur versionnée/concurrente complète non prouvée |

## Causes et couverture

- L'ancien RPC ne couvre que les QCM des passages V2 terminés et ne prouve que les IDs, pas la correspondance des propositions. Il ne couvre ni les anciennes copies autonomes ni les QRC ni les Bilans.
- L'écran QRC en attente cache les corrections même des matières terminées. Reproduction réelle via l'administrateur, vue de Mourad CHEMOUN, EB3 TAXI : capture `/tmp/browser/qcm-titiller/controle.png`, zéro encadré actuel. Ceci vérifie l'ancien comportement et la désactivation, **pas** la réussite du candidat.
- Les deux listes de révision excluent explicitement Français ; le candidat l'inclut seulement après activation.
- Le nouveau candidat exige même copie autorisée, même examen, ID question unique, type, énoncé exact et propositions lettre+texte identiques. Ordre des propositions ignoré ; changement de texte/identité = non rapproché. Il lit par lots de 50 sans troncature.
- Catalogue réel : 23 examens publiés actifs sur les 24 EB1–EB6 VTC/TAXI/TA/VA. EB2 VTC n'a pas de publication active. Une réponse officielle publiée ne peut pas y être inventée.
- 6 382 résultats EB terminés ; 1 651 ont un tableau snapshot de questions, 4 731 n'en ont pas. Ces 4 731 ne sont **pas** tous irrécupérables : un lien V2 peut exister, mais la couverture exacte n'a pas été calculée. Le nouveau résolveur ne devine jamais une liaison.

## Tests réellement exécutés

- 76 Vitest PASS : égalité A+C/C+A, A/C/A+B+C/B/vide faux ; changement juste→faux et faux→juste pédagogiques ; snapshot/note inchangés ; dernière révision admin distincte de l'initiale ; 121 sources lues en trois lots ; erreurs et doublons refusés ; régression des sauvegardes/finalisation publiée ; relecture du panneau avec une autre version.
- 7 tests PostgreSQL jetables PASS : propriétaire native+legacy, admin, autre élève refusé, anon refusé, copie en cours exclue, changement de proposition refusé, limite 50.
- 1 contrat PostgreSQL tout-ou-rien PASS, boucle de 14 cas A+C puis snapshot C historique.
- Dernier signal compilation automatique : `build OK` 16:59:30 UTC (avant le dernier petit garde d'activation, à recontrôler).
- Aucun E2E modification réelle→révision persistée→admin sur les trois surfaces ; aucun scénario mobile positif ; aucune concurrence à deux onglets de publication/reprise du nouveau chemin.

## Blocages obligatoires avant activation

1. **Version de validation de révision** : les révisions enregistrent actuellement `correctedQuestions`/score sans attacher la version officielle évaluée. Après un changement du corrigé, réutiliser cette validation pourrait créer un compteur obsolète. Il faut un contrat serveur versionné, lecture après sauvegarde, conflit sûr et preuve de finalisation — sans changer les anciens résultats.
2. **Bilans** : futur circuit = `bilan_future_correction`, clés figées et entraînement local non persisté. Anciens Bilans et autres quiz = sources distinctes. Le résolveur EB candidat ne les couvre pas. Ne pas présenter ces parcours comme synchronisés.
3. **Historique sans snapshot / publication absente** : établir les preuves de correspondance via identités permanentes ou déclarer le corrigé non rapproché ; jamais reconstruction par position/texte seul.
4. **Éditeur concurrent** : CAS/publication/readback complet, puis E2E isolé réunissant vraie interface et serveur, TAXI/VTC jour/soir, TA/VA, QCM/QRC, changements de version pendant révision.
5. **Production et retour arrière** : SQL non installé ; vérifier temps réel/reconnexion, navigateur PC/mobile et retour arrière avant activation. Retour arrière actuel = laisser le garde désactivé ; aucune nouvelle fonction en production à retirer.

## Invariance et limites du contrôle

Lecture de référence 16:56 UTC : 6 527 résultats, empreinte `bf928c4d489d612305d05811f63e236c` ; 6 797 QRC, empreinte `a491f9ca05fefb83b70922e4e29e0ac4`. Il s'agit d'une référence, pas d'une preuve avant/après figée : des élèves continuent à travailler. Aucun outil d'écriture production n'a été appelé dans ce chantier.

Écart permanent déjà signalé par le contrôle mémoire : `ExamensBlancsPage.tsx` conserve un polling toutes les 8 secondes, contraire au zéro polling demandé. Il n'a pas été changé dans ce chantier ; arbitrage séparé nécessaire.