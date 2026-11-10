# Synchronisation des trois parcours — 10/11/2026 17:00 UTC

## Reprise du 10/11 17:04 — état à 17:17 UTC

**NO-GO maintenu, chantier non terminé et non livré.** Le contrat EB transactionnel nouveau est préparé dans `docs/sql-revue/2026-11-10-revision-corrige-versionnee.sql`, avec tables séparées append-only, propriété/copie/question, verrou par session, CAS séquence + empreinte de corrigé, idempotence exacte, reprise sur la même source et horodatage serveur. Le garde global reste `false`. Les deux RPC candidats sont absents du serveur réel (lecture du catalogue confirmée). Aucun appel de migration/écriture/publication n'a été fait.

### Preuves nouvelles

- 15 contrats PostgreSQL jetables PASS, dont boucle sur les 24 identités EB1–6 VTC/TAXI/TA/VA, QCM A+C/C+A parfaits et A/C/A+B+C/B faux, choix inconnus/doublons refusés, deux commandes concurrentes une seule acceptée, rechargement, opération identique rejouée sans ajout, clôture et réponses immuables, changement de corrigé conservant la dernière réponse mais refusant une validation périmée, autre élève/anon/droits directs refusés, QRC `−10 €` littérale seule reconnue (`10 €`, `-10 euros` à vérifier). 24 identités = fixtures, pas 24 parcours réels validés.
- 52 Vitest de régression/projection/panneau PASS après branchement désactivé du nouveau composant aux deux entrées EB. Le chemin publié ancien reste inchangé.
- Deux parcours navigateur **avec vrai PostgreSQL jetable** (1280×1800 et 390×844) : cocher A+C, enregistrer, lire après réponse serveur, recharger, modifier la version officielle jetable C seule, refus CAS, relire sans perdre A+C, corriger en C, sauvegarder/remettre. Snapshot historique avant/après identique et aucune erreur navigateur. Captures contrôlées. Ce test ne couvre pas l'éditeur officiel réel, l'admin réel, les Bilans, ni deux onglets navigateur ; la concurrence est testée au niveau SQL.
- Le retour arrière testé est une révocation transactionnelle annulée par ROLLBACK, pas une répétition d'un déploiement complet. Les effets d'une publication concurrente avec le vrai workflow d'éditeur et le Realtime ne sont pas prouvés.
- Nouveau lecteur admin par curseur de sessions (50), dernière réponse par question et heure serveur préparé, pas activé. Il n'affiche pas encore tout le rapprochement initiale/examen/tentative/corrigé sur cette nouvelle table.

### Inventaire réel à cette reprise (lecture seule)

| Circuit | Inventaire | Couverture de synchronisation réellement activée par ce chantier |
|---|---:|---:|
| EB résultats enregistrés | 6 382 terminés | 0 |
| EB résultats avec questions figées | 1 651 | candidat strict seulement |
| EB résultats sans questions figées | 4 731 | non rapprochés par le candidat |
| Passages V2 hors tests | 2 805, dont 2 749 terminés | candidat strict seulement, ne pas additionner aux résultats (miroirs possibles) |
| Publications EB actives | 23/24 (EB2 VTC absent) | aucun changement de publication |
| Bilans historiques | 233 snapshots, 15 exercices : 5/500–507 et 11/600–606 | non intégrés au nouveau résolveur |
| Bilans futurs | 76 reçus, 44 soumissions ; 5/500–504 et 11/600–602 présents | corrigé de version figée existant seulement ; nouveau corrigé courant/révision persistée non intégrés |
| Révisions anciennes | 148 résultats | historiques inchangés |

Les 4 731 résultats sans snapshot n'ont aucun lien explicite **dans `snapshot.result_id`** d'un passage V2 terminé. Cette requête ne prouve pas l'absence d'autres liaisons sûres (imports, anciennes clés, journaux) ; aucun rapprochement automatique effectué. Les comptes techniques EB99/EB99TEST apparaissaient dans l'inventaire précédent mais ne sont pas des examens de formation à publier.

Modules éditeur Bilan/exercices réellement enregistrés : 4=7 exercices, 5=8, 9=7, 11=7, 27=2, 28=2, 29=2, 30=4, 87=1. Il n'existe pas de lignes de résultats d'autres `quiz_type` que `examen_blanc` et `revision_fausses` dans `apprenant_quiz_results`; les autres activités ont des preuves dans d'autres tables. Donc l'inventaire de cette table ne permet pas de prétendre qu'elles n'existent pas.

### Blocages restant à résoudre sans intervention utilisateur requise

1. Bilan futur et legacy : adaptateurs lecture seule avec sources/UID/tombstones et version editor/release explicite, nouvelle révision séparée et persistée, lecture admin. **Non réalisés.** Ne pas altérer `bilan_future_correction` ni les copies figées.
2. Historiques sans snapshot et EB2 VTC : qualifier les autres preuves immuables ou afficher non rapproché ; absence de publication ne doit jamais inventer A/C ou un corrigé. **Pas de qualification complète par copie.**
3. Nouvelle ouverture limitée à 50 questions ; il faut le protocole borné pour une révision exhaustive >50. Provenance de tentative native à compléter dans le lecteur admin, rafraîchissement direct de l'admin et trois surfaces ensemble non prouvé.
4. Nouveau composant conserve les brouillons dans l'état local uniquement : une réponse non confirmée lors d'une fermeture n'a pas encore de journal durable multi-appareil ; relire/annulation doivent protéger les nouvelles saisies pendant requête. Ce n'est pas prêt à remplacer la file durable existante.
5. E2E éditeur→correcteur élève/admin→révision→admin, deux onglets navigateur, véritables sessions jour/soir, Bilans/autres quiz, déploiement/rollback et site live **NON PROUVÉS**.

Une lecture d'empreinte agrégée complète de production a dépassé le délai : aucune empreinte finale fiable produite, aucune comparaison avant/après revendiquée. Aucun outil d'écriture production utilisé. Budgets IA consommés par ce chantier : aucune correction IA appelée.

Écart zéro polling signalé à l'utilisateur avant modification des écrans EB : le fallback 8 s préexistant est conservé en attendant sa réponse, aucun polling ajouté.

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