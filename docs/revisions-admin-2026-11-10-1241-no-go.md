# Révisions admin — 10/11/2026, reprise 12:41 UTC

## Décision : NO-GO publication
Le code est disponible dans l’aperçu. Aucune migration, aucun déploiement serveur, aucune publication ni écriture de réponse/note n’ont été effectués pour ce chantier. Le parcours complet élève → API réelle isolée → lecture admin, avec concurrence et Terminer matière, n’est pas encore prouvé. Une répétition navigateur du rapprochement a expiré après 120 secondes : ne pas considérer les lectures comme infaillibles.

## Implémenté
- Fiche CRM, onglet Résultats : réponses initiales et dernière révision persistée, EB, matière, question, tentative source et numéro de révision distincts.
- Lectures serveur par élève, pagination déterministe, aucune reprise du cache ou de la file locale. Relecture sur ouverture, bouton actualiser, focus et événement de réponse ; réponses tardives d’un autre dossier ignorées.
- Identité initiale uniquement via sourceResultIds et résultat du même élève/EB/matière, question unique du snapshot. Sinon « À VÉRIFIER », sans tentative ou réponse initiale inventée.
- L’heure individuelle n’est présentée que si le dernier événement serveur avant l’état persisté porte exactement la même valeur. Conflit d’horodatage ou valeur différente : heure individuelle non prouvée, heure de l’état distincte.
- Le correcteur V2 ne monte plus CorrectionQRCTab pour les anciennes copies : consultation locale au correcteur, sans bouton de note, barème/identité non attestés signalés. Il ne fabrique pas une correction humaine à partir des anciens points automatiques.

## Production : lectures seules
- 204 révisions, 46 avec revisionState, 34 avec sourceResultIds. Les 170 autres ne sont pas automatiquement reliées.
- Empreinte des réponses et write_seq avant et après : `e4ee699cfb858750831ccc1abb3ac099`, inchangée ; 204 lignes avant/après.
- Paquet public `index-BbbW5qxX.js`, SHA-256 `f645014e91af5bc9e44e17991f4f4720fccd8314fb722e78bfafab555989dea3` : fonction minifiée `lur` vérifiée, clé matière:question prioritaire et ancien numéro seul accepté uniquement si univoque. Le nouvel affichage admin n’est pas dans ce paquet.
- Compteur aperçu : 4325/4325 puis 4326/4326, zéro manquante. Site publié authentifié : **4326 attendues / 4326 visibles / 0 manquante**, capture réalisée. L’ancien 4321 est un instantané, pas une valeur à figer. Aucun audit individuel des nouvelles copies n’est revendiqué.
- Une nouvelle répétition a expiré sur le compteur ; la capture précédente reste une preuve ponctuelle, pas une garantie permanente.

## Tests exécutés
- Nouveaux tests projection/lecture/inventaire : **32/32 PASS** (24 projection, 2 transport simulé, 6 inventaire).
- Suite révision/clôture : **79/79 PASS** sur 10 fichiers. Les scénarios complets utilisent un serveur simulé ; certains activent le candidat de finalisation, ce qui ne prouve pas le chemin publié.
- Tri/navigation/notes : **46/46 PASS**. Les mocks de navigation émettent des erreurs getSession non implémenté pendant la lecture des définitions ; les assertions ciblées passent, pas une preuve exhaustive de cette dépendance.
- PostgreSQL jetable, fixtures de production du 10/11 : **6/6 PASS**, barème, correction/relecture TAXI/VTC, idempotence, isolation, révision. Ne couvre pas la nouvelle lecture admin jointe à la sauvegarde élève.
- Compilation de l’aperçu : dernière entrée build OK ; erreur Object.hasOwn corrigée sans changer le niveau TypeScript.
- Navigateur admin réel en lecture seule : dossier Hassen BENKHELIL, 55 réponses projetées ; initiale/révision/heure vérifiées ; rechargement identique. Aucun clic de note ni réponse élève envoyé.
- Mobile 390×844 : absence de dépassement horizontal mesurée, mais la barre de navigation globale continue de recouvrir le bord gauche après réduction ; validation visuelle mobile complète **NON PROUVÉE**.

## Sauvegarde et retour arrière
- Aucun changement de données : pas de restauration DB nécessaire et aucun rollback SQL à appliquer.
- Copies avant modifications des deux surfaces d’intégration et manifeste SHA256 vérifiés dans `/tmp/qrc-admin-before/`. Ces copies temporaires ne sont pas une sauvegarde durable ou gérée ; elles peuvent disparaître à la pause.
- Retour arrière de présentation : restaurer les deux imports/montages de ResultatsApprenantTab et AdminCorrectionQrcV2Reel depuis ces copies, puis vérifier compilation et tests. Les nouveaux modules deviennent inutilisés ; ne pas supprimer de données ni retirer les protections serveur existantes.
- Restauration source exacte et sommes vérifiées, **pas de restauration d’application déployée répétée**. Pour une publication ultérieure, conserver un instantané durable de la version source et répéter son déploiement sur environnement isolé.

## Blocages à lever avant publication
1. E2E isolé du chemin publié complet sauvegarde élève → admin, plusieurs corrections, concurrence, rechargement et Terminer matière ; aucune écriture fictive en production.
2. Validation mobile sans recouvrement de la navigation globale et consultation ancienne complète avec captures/rechargement.
3. Sauvegarde source durable et rollback de déploiement réellement répété.
4. Finalisation atomique publiée reste désactivée : le chantier antérieur exige une source serveur de score/identité compatible. Ne pas l’activer implicitement.
5. Anciennes copies restent non notables dans cette consultation ; l’intégration d’une notation humaine sûre requiert identité, barème figé et transport serveur prouvés, sans migration automatique.

Les questions, bonnes réponses, notes, passages en cours et signatures n’ont pas été écrits par cette intervention. Leurs empreintes exhaustives n’ont pas été recalculées ; seule l’empreinte des révisions a été comparée.