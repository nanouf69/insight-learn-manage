# Modules incomplets dans Réalisés — 29 octobre 2026

## État de livraison
Correction partielle dans l'aperçu uniquement, **non publiée**. Aucun SQL, aucune écriture de dossier, réponse, score, passage, activité, signature, heure ou calcul figé. Aucun mail, SMS ou appel IA.

## Causes établies en lecture seule
1. `computeServerCompletedModuleIds` et le classement acceptaient `status=completed` sans vérifier les réponses absentes dans les détails historiques.
2. `save_module_completion`, lu dans le catalogue réel, exige au plus une réponse pour son garde de nouveau module ; ce n'est pas une preuve de soumission de tous les quiz. Aucune modification de cette fonction dans cette livraison.
3. Les modules dispensés du compteur étaient classés Réalisés par complément de la liste À faire, même sans achèvement.
4. La navigation interne utilisait le drapeau du module comme preuve générale pour chaque quiz.

## Cas des captures
Lecture réelle : les copies TA 31 à 4/5 récentes contiennent une réponse JSON null ; la copie cours TA 40 à 127/203 contient 127 réponses pour 203 éléments historiques, sur six exercices ; le bilan 27 à 191/203 contient 202 réponses pour 203 éléments ; les équipements 64 à 8/10 récents contiennent neuf réponses pour dix éléments. Le score n'est donc pas le nombre de réponses. D'autres copies à 4/5 comportent bien cinq réponses et restent complètes.

## Périmètre corrigé
- `moduleCompletionEvidence.ts` : rejette une obligation historique explicitement vide, indépendamment de la justesse ; relit une soumission serveur entière du même module/exercice, sans utiliser les révisions ou brouillons pour combler artificiellement un passage.
- `moduleQuizCounter.ts` : même traitement des vides ; retourne les identifiants de questions manquantes. Le périmètre reste celui des détails historiques, pas les ajouts courants.
- `moduleUnlockLogic.ts`, `progressionModulesEleve.ts`, `useCandidatModules.ts` : projection effective partagée ; statut enregistré inchangé, lectures paginées des soumissions.
- `CoursPublic.tsx` : cartes rouges À terminer, liste dépliable des questions avec liens directs par exercice, exclusion des faux Réalisés ; clé par compte/module.
- `ModuleDetailView.tsx` : cible directe, preuves quiz individuelles, manques rouges non tronqués ; bouton final ne valide pas un passage historique ayant des obligations explicitement vides non soumises.
- `AGENTS.md` : règle de projection historique documentée.

## Effectifs
Contrôle lecture seule de tous les modules ordinaires : **466 lignes completed sur 214 dossiers** contiennent au moins une question historique sans réponse. Ce sont des **candidats à vérification**, pas 466 erreurs définitivement confirmées : des soumissions complètes ultérieures, dispenses, politiques facultatives ou archives peuvent justifier certaines lignes.
TA : 5/18 Introduction 31, 13/20 Cours 40, 10/32 Équipements 64 avec détails, 7/19 Bilan 27 contiennent des vides. Les totaux enregistrés restent 18,20,34,19 respectivement après intervention. Aucun drapeau en base n'a été changé.

## Vérifications exécutées
- 7 fichiers ciblés : **68 tests PASS** (dont 19 nouveaux), incluant 0/1, 3/6, 1/2, mauvaises réponses complètes, ajouts post-achèvement, drafts, relecture de soumission et isolation module/révision.
- Série élargie avec `quiz-module-validation-serveur.test.ts` : **77 PASS, 1 FAIL**. Échec d'un contrat source qui attend `Promise.race([sequence(), delai])` alors que le circuit actuel utilise `Promise.race([seq, delai])` ; ce circuit n'a pas été modifié ici. Aucun PASS attribué à ce contrôle.
- Compilation la plus récente : build OK à 08:14:20 UTC.
- Navigateur : première reproduction avec réponses fictives interceptées, aperçu administrateur connecté : quatre cartes À faire, Réalisés 0, détail « Quiz 1 — questions 5 », clic ouvre réellement le quiz Introduction TA et ses cinq questions, quatre réponses restaurées. Aucun envoi de réponse. Capture bureau conservée dans `/tmp/browser/module-completion/fixture-desktop.png`.
- La première capture à 375 est masquée par le menu administrateur et **ne prouve pas** le rendu élève mobile. Deux reprises ultérieures ont échoué à retrouver le résultat de recherche ; elles ne sont pas des validations réussies.
- Connexion au compte technique dédié refusée par l'outil (approbation indisponible). L'aperçu administrateur simulé n'est pas un test élève authentifié.

## NON PROUVÉ / reste à traiter
- Parcours élève réel bureau/mobile, enregistrement puis relecture, requêtes lentes et multi-onglets.
- Historique sans détails, ou snapshot tronqué excluant complètement un exercice : les données disponibles ne permettent pas de reconstruire toutes les obligations anciennes. Cette livraison ne rajoute pas de nouvelles questions rétroactivement et conserve ces états hérités au lieu de fabriquer un périmètre.
- Couverture complète des pages/cours/documents requis et de leurs anciennes versions ; liste complète de tous les manques de ces types non encore livrée.
- Modules historiquement facultatifs (3,31,60,62,63,64,90) : politique précise et preuve de consultation à résoudre ; ne pas publier la requalification des vides sans vérifier ces dispenses.
- Alignement du calcul live des jalons pédagogiques et des volumes avec cette projection : non modifié afin de ne pas réduire les heures acquises ; seuls les compteurs de modules CRM/élève sont raccordés.
- Examens blancs conservés sur leur moteur propre, sans renforcement par les détails ordinaires ; bilan migration clos et archives non modifiés.

La demande intégrale n'est donc pas déclarée terminée. Aucune publication globale.