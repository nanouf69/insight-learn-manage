# T3P — raccordement activé dans le code d’aperçu, 19/11/2026

## Réalisation

ModuleDetailView monte maintenant la présentation locale uniquement pour les exercices 1/2 des modules 2/VTC et 10/TAXI. P2 Q73/Q74/Q76 apparaissent en P1 ; P1 Q59 apparaît en P2, distincte de Q59 native P2 par libellé et identité composée.

Chaque carte est rendue par le même rendu original de ModuleDetailView sous son exercice source : questions normalisées, snapshot éventuel, réponses/verrous, images, QCM/QRC, corrections, révisions. Aucun second design de quiz. La fonction de rendu extraite conserve le contenu original. Le sélecteur Partie 1/2 rejoint les pages existantes sans modifier leur index historique ni les règles d’accès.

Les commandes au pied restent celles de l’exercice original de la page, désormais explicitement nommées « Valider l’exercice d’origine T3P P1/P2 ». Toutes les questions originales sont exigées pour la remise, même celles affichées dans l’autre partie. Une question manquante ou une relecture depuis le résultat rejoint sa partie affichée. Le tableau source activeExercices, exercicesCorriges, les totaux, clés, files d’envoi, lots submitQuizAttempt, progression et scores n’ont pas été remplacés par les groupes visuels.

## Tests exécutés

- **38 Vitest réussis** : 16 projection, 11 ordre des cours, 6 validation, 2 protection révision, 3 protection T3P/Bilans.
- **12 parcours Playwright réussis** sur le vrai ModuleDetailView avec SDK et stockage serveur fictifs : TAXI/VTC × PC 1280×1800/mobile 390×844 × remise/reprise, question originale manquante dans l’autre partie, refus de remise.
- Parcours remis : clé P1 `1-59=B` et clé native P2 `2-59=A` reprises distinctement ; choix 2-73/74/76 faits en P1 sauvegardés dans module_X_exo_2. Remise P1 : 1/2, 50 %, deux questions originales ; remise P2 : 6/6, 100 %, six questions originales. Aucune clé P1 dans le lot P2 ni inversement. Rechargement : deux lignes submitted et réponses inchangées.
- Réponse originale manquante : retour automatique vers Partie 1, aucun appel de remise.
- Refus 42501 fictif : « Réessayer la validation », aucune note de réussite affichée, deux lignes toujours in_progress.
- Captures conservées temporairement sous `/tmp/browser/t3p-integrated/`, scripts reproductibles dans `src/test/t3p-local-browser/`. Harnais uniquement fictif : aucun JWT d’élève réel, aucune requête Cloud réelle, toutes sorties navigateur externes bloquées. La file d’envoi et les fonctions de remise de l’application sont réellement exercées ; l’autorisation serveur officielle/RLS n’est pas simulée comme preuve de production.

Les premiers essais de script ont rencontré des sélecteurs mobiles absents et une notification interceptant le clic de bas de page ; scripts corrigés pour utiliser le menu Progression existant et le sélecteur de partie, sans force-click ni suppression de notification. Le harnais de progression initialement incomplet a été complété par sa relecture fictive pages_completees ; aucune correction de progression réelle nécessaire.

## Intégrité et limites

Six empreintes des modules 2/10/13/25/32/39 relues, identiques aux contrôles avant cette intervention. Aucune écriture Cloud, donnée élève, question partagée, support, score historique, jalon, accès ou réglage changé. Autres modules, Bilans, examens et quiz indépendants ne consomment pas cette projection.

La banque réelle n’a pas été remaniée ; les comptages 53/69 originaux du contrôle précédent deviennent théoriquement 55/67 à l’affichage local (53−1+3 et 69−3+1), pas de nouveau comptage de comptes individuels revendiqué. Une source partielle ou une collision interne refuse la projection et garde le rendu classique.

**Activation code aperçu uniquement : aucun publish, déploiement de fonction, migration ni email.** Le harnais ne constitue pas une connexion officielle dans un backend séparé ; cette exigence Qualiopi est un chantier distinct, non réouvert ici.

## Fichiers

- `src/components/cours-en-ligne/ModuleDetailView.tsx` : raccordement, rendu original partagé, navigation/missing/review et commandes originales.
- `src/components/cours-en-ligne/T3pLocalQuestionParts.tsx` : commentaire de raccordement.
- `src/lib/AGENTS.md` : frontière architecture actualisée.
- `src/test/t3p-local-browser/module-harness.html`, `module-harness.tsx` : vrai écran avec transports fictifs.
- `src/test/t3p-local-browser/check_flow.py`, `check_refusals.py` : tests navigateur reproductibles.
- `roadmap.md` et ce rapport.

`src/lib/t3pLocalPresentation.ts` reste inchangé ; ModuleDetailView l’utilise désormais sans réécrire ses sources.