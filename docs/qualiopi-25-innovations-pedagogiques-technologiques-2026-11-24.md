# Qualiopi — indicateur 25, innovations pédagogiques et technologiques

Revue et enregistrement du 24 novembre 2026.

## Exigence exacte retenue

Guide de lecture V10, page 32 : démontrer la mise en place d’une veille sur les innovations pédagogiques et technologiques et son impact éventuel sur les prestations. Les exemples comprennent les évolutions des contenus, modalités ou outils pédagogiques et l’analyse d’opportunité/faisabilité. Aucun registre ou webinaire particulier n’est imposé.

La non-conformité mineure décrite est l’absence d’exploitation de la veille mise en place. La revue distingue donc la déclaration de veille, les réalisations réellement utilisées, les fonctionnalités seulement intégrées et les projets non publiés.

## Déclaration formalisée

Le dirigeant confirme une démarche de veille via ChatGPT et Lovable sur les innovations pédagogiques et technologiques, avec analyse de leur intérêt et exploitation pour améliorer la formation, les modalités et les outils.

Cette fiche est enregistrée comme **déclarative / non vérifiée indépendamment**. Les recherches et échanges ne sont pas tous conservés sous forme de rapports ; aucun historique de conversation ou résultat n’est inventé.

## Innovations avec preuves d’usage ou de déploiement

| Innovation | Traces retrouvées | Portée et limites |
|---|---|---|
| Correction QRC assistée par IA | Configuration active depuis le 10/10/2026 ; 2 714 enregistrements au statut `appliquee` entre le 24/09 et le 18/11, sur 22 identifiants d’examen. Rapport et commit `bb2182b37` du 23/10 : six QRC effectivement corrigées avec identifiants d’exécution. | Déploiement et usage tracés. Les statuts ne prouvent pas la qualité de chaque note ni une validation humaine systématique ; l’historique peut inclure des essais. Le commit `dc5f652bb` du 12/11 n’est pas assimilé à une nouvelle IA sémantique. |
| E-learning et progression | 52 522 ouvertures de cours, 19 550 ouvertures de modules et 19 149 ouvertures de sections ; 1 488 complétions datées au contrôle du 24/11. Rapport Qualiopi 19 du 20/11 : 302 dossiers avec activité pédagogique après communication d’accès. | Usage réel, pas simple existence d’une plateforme. Les volumes ne démontrent pas l’efficacité pédagogique ; progression, score et temps restent distincts. |
| Examens et questions chronométrés | Commit `b7bfe19b6` du 16/09 ; minuteur lié à la tentative, reprise et resynchronisation dans `ExamenBlancsPassage.tsx`. Base : 3 793 minuteurs et 330 712 temps de question enregistrés jusqu’au 24/11. | Mécanisme intégré et traces d’usage. Les enregistrements ne valident pas chaque durée ou résultat. |
| Supports multimédias | 19 modules avec fichiers de cours, 1 305 questions avec image ; 10 PowerPoint et 7 PDF recensés dans le bucket `cours-fichiers`. Commits de supports TAXI `124844b8d` du 27/10 et `9d2158c31` du 24/11. | Intégration effective de fichiers et illustrations. Leur actualisation réglementaire relève surtout d’I23 ; aucune consultation ou pertinence individuelle n’est déduite. |
| Relances modules automatisées | Commit `5f2d680e4` du 10/10 ; tâche `relance-modules-a-terminer-daily` active à 08:30 chaque jour, anti-relance de trois jours. 184 emails « Votre formation : les modules à terminer » entre le 15/10 et le 23/11. | Automatisation active et envois enregistrés. Ni réception, ni lecture, ni effet pédagogique n’est présumé ; aucun envoi déclenché pendant cette revue. |

## Fonctionnalité intégrée, usage public non prouvé isolément

### Refaire uniquement les questions fausses

- Commit `ae98b0ae1` du 19/03/2026 : ajout du bouton.
- Commit `3fc05b320` du 25/03/2026 : révision persistée.
- Bouton et parcours dans `ExamenBlancsResultats.tsx` et `ExamensBlancsPage.tsx`.
- `revisionQuestionsFigees.ts` : réponses du passage concerné, corrigé actuel, QRC sans note définitive laissées en attente, copies et notes non réécrites.

Cette remédiation est une fonctionnalité intégrée, pas une maquette. Le code et Git ne prouvent pas à eux seuls sa publication actuelle ou son usage individuel ; elle n’est pas le fondement unique du statut. Elle n’est pas confondue avec « refaire une matière ».

## Projets et essais conservés, non comptés comme déploiements

- **Liens et vidéos dans les cours** : commit `07e9cfad0` du 11/11 ; aperçu, essais fictifs/fournisseurs simulés, aucune publication ni modification de contenu réel.
- **IA immédiate des quiz TAXI** : commit `4c07f75c1` du 30/10 ; endpoint actif et appels réels sur compte technique, mais interface non publiée et parcours complet non prouvé.
- **Relances après examen J+1/J+7** : modèles testés le 13/11, non raccordés aux envois, aucune activation/publication.
- **Arrêt des relances après signature** : préparé/testé mais non déployé selon le rapport final du 12/11, malgré le titre affirmatif du commit.
- **Dates d’activité dans le taux e-learning** : implémentation/test du 23/10 sans publication prouvée ; non retenue comme preuve de mise en production.

Ces éléments documentent une démarche d’expérimentation, mais ne sont pas présentés comme usages généralisés.

## Indices de veille déjà présents

Les quatre références initiales sont conservées sans changement : invitations/replay Formdev, Qualiopieasy et HeyGen/Seedance reçus en février, avril et juin 2026. Elles prouvent la réception d’éléments de veille, pas la participation, l’analyse d’opportunité ou l’effet sur les prestations.

## Réévaluation

**Statut créé : Conforme.**

Le niveau attendu est rempli par la combinaison d’une veille formalisée et de plusieurs exploitations effectivement tracées : IA QRC, e-learning/progression, chronométrage, multimédia et relances. La conformité ne repose pas sur les seuls commits, les invitations ou les projets non publiés.

**Réserves conservées :** caractère déclaratif de la veille ChatGPT/Lovable, participation aux webinaires non prouvée, lien causal source de veille → décision → déploiement pas toujours conservé, efficacité pédagogique non mesurée par les seuls volumes, réception/lecture des emails non démontrée.

## Contrôles en base

- Avant : 4 liens I25, aucun statut.
- Après : 13 liens, 13 preuves distinctes ; 4 références initiales + 9 nouvelles fiches.
- Statut I25 relu : `Conforme`, applicable, responsable Naoufal Guenichi, vérification datée du 24/11/2026.
- Aucun doublon de lien ni preuve orpheline ; aucune suppression ou fusion.
- Aucun cours, QCM, examen, minuteur, progression, élève ou paramètre opérationnel modifié.
- Aucun email, aucune publication, aucune exécution de `geler_releves_fin_acces()`.
