# Architecture de sécurisation — diagnostic et plan (aucune migration)

Rien n'est modifié ici : ni question, ni réponse, ni QRC, ni note, ni tentative, ni historique. Ce document est un plan à valider avant toute écriture.

## A. Comment ça fonctionne aujourd'hui

- Le contenu pédagogique (questions, propositions, bonnes réponses, barèmes, images) vit dans **une seule ligne par module** (`module_editor_state`), écrasée à chaque enregistrement Admin. Il n'existe pas de « version publiée » : enregistrer = publier immédiatement.
- Le partage entre modules est assuré par des **déclencheurs automatiques en base** (propagation d'une matière identique). C'est ce mécanisme, appliqué autrefois sans tenir compte du numéro d'examen, qui a fait entrer du contenu Examen Blanc N°1 dans le N°2.
- Les tentatives d'Examen Blanc prennent bien une photo figée du contenu depuis la refonte récente, mais cette photo est stockée **dans la ligne de résultat**, sans identifiant de version publiée auquel se rattacher.
- Les réponses apprenants sont **écrasées en place** (une ligne par apprenant/question, mise à jour successive). Un journal existe en parallèle, mais l'état courant n'est protégé par aucun numéro de révision : la dernière requête arrivée gagne.
- Les QRC sont partiellement rattachées à un identifiant propre (pilote limité à l'Examen Blanc VTC N°2) ; ailleurs, la liste formateur est reconstruite par rapprochement de texte/date, d'où les doublons et disparitions.
- L'indicateur « Enregistré » côté apprenant s'appuie sur la file locale, pas systématiquement sur une confirmation serveur.

Conclusion : les trois incidents ne sont pas trois bugs, mais trois conséquences du même défaut — **le contenu et les réponses sont modifiables en place, sans version, et la protection dépend du navigateur.**

## B. Architecture proposée

Quatre domaines strictement séparés, le serveur étant seul juge :

```text
A. CONTENU (brouillon)      ->  B. VERSIONS PUBLIÉES (immuables)
   modifiable librement          V12, V13, V14 ... une seule ACTIVE
            |                              |
            | PUBLIER (explicite)          | lue au démarrage
            v                              v
                            C. TENTATIVES (attempt_id + version figée)
                                           |
                                           v
                            D. RÉPONSES / QRC (identité + révision + journal)
```

Deux règles fondatrices :
1. On ne modifie plus un examen : on crée une nouvelle version, puis on la publie.
2. On n'écrase plus une réponse : on ajoute une version de cette réponse.

## C. Ce qui serait créé

- **Versions de contenu** : une ligne par version (numéro, statut brouillon/publiée/retirée, contenu complet, empreinte, auteur, date, motif). Une seule version active par examen. Une version publiée n'est jamais réécrite.
- **Identité de contenu** : filière + numéro d'examen + matière + identifiant de question immuable. Une question du N°1 ne peut pas, techniquement, atteindre le N°2.
- **Partage déclaré** : lorsqu'une matière est réellement commune (VTC/VA, TAXI/TA), le lien est déclaré explicitement et la publication affiche « Cette modification affectera également VA N°2. Continuer ? ». Plus aucune propagation automatique.
- **Tentatives** : attempt_id immuable + référence à la version publiée utilisée + photo complète. Interdiction d'écriture après démarrage, y compris pour l'Admin.
- **Réponses** : identifiant propre, numéro de révision, historique complet (valeur avant/après, date serveur, session à l'origine). Contrôle de révision : une écriture basée sur une version périmée est refusée, jamais appliquée.
- **QRC** : identifiant définitif lié à tentative + question, unique, avec état en attente/corrigée. Nouvelle tentative = nouvelles QRC.
- **Journal d'audit inaltérable** : qui, quand, quoi, avant, après, origine, version — pour publication, modification de question ou de bonne réponse, suppression, partage, réponse apprenant, correction QRC, note manuelle, autorisation de repassage. Écriture seule, aucune suppression possible depuis l'application.

## D. Mécanismes actuels à retirer

- Enregistrement Admin qui publie immédiatement.
- Déclencheurs de propagation automatique entre modules.
- Toute reconstruction de QRC par texte, date ou lignes jumelles.
- Tout « dernier arrivé gagne » sur les réponses.
- Tout indicateur « Enregistré » non confirmé par le serveur.
- Toute réparation, restauration ou recalcul automatique : en cas d'incohérence, le système **bloque et alerte**, sans jamais corriger seul.

## E. Migration par étapes (chacune validée par vous avant la suivante)

1. Mise en place des nouvelles structures, vides, en parallèle des actuelles. Aucune lecture par l'application.
2. Copie en lecture seule du contenu actuel de chaque examen comme « version initiale publiée », vérifiée par empreinte. Les données existantes restent en place et inchangées.
3. Passage de l'éditeur Admin en mode brouillon + bouton PUBLIER avec aperçu des écarts (questions modifiées/ajoutées/supprimées, bonnes réponses modifiées) et confirmation.
4. Les nouvelles tentatives lisent la version publiée. Les tentatives en cours et passées restent strictement inchangées.
5. Réponses : écriture avec numéro de révision et journal, indicateur de sauvegarde à trois états (en cours / enregistré / non enregistré).
6. QRC : identifiant définitif généralisé, après contrôle en lecture seule que chaque QRC existante est rattachée sans doublon.
7. Retrait des anciens mécanismes, une fois les nouveaux en service et vérifiés.

Les anciens champs ne sont jamais supprimés : ils sont marqués comme retirés et conservés comme preuve.

## F. Retour en arrière

Chaque étape est additive : les anciennes structures continuent de fonctionner tant que l'étape suivante n'est pas validée. En cas de problème, on repasse à l'ancienne lecture sans perte, puisque aucune donnée historique n'est déplacée ni réécrite. Une sauvegarde complète est prise avant chaque étape.

## G. Risques

- Étape 3 (brouillon/publication) change vos habitudes de travail : un enregistrement ne sera plus visible par les apprenants sans publication explicite. C'est l'objectif, mais cela demande une vigilance nouvelle.
- Étape 6 (QRC) est la plus sensible : des QRC existantes mal rattachées pourraient apparaître en double. Elle sera précédée d'un contrôle en lecture seule et, en cas de doute, la QRC est marquée « À VÉRIFIER » plutôt que rattachée d'office.
- Le retrait de la propagation automatique rendra visibles des divergences existantes entre modules partageant une matière. Elles seront listées, jamais corrigées automatiquement.

## Tests bloquant le déploiement

Le N°1 ne peut pas modifier le N°2 ; une version publiée ne peut pas être réécrite ; une tentative commencée ne peut pas être modifiée ; une réponse ancienne ne peut pas écraser une récente ; double clic = une seule réponse ; une QRC corrigée ne revient jamais ; nouvelle tentative = nouvelles QRC ; après publication, F5 apprenant = même version que l'Admin ; coupure réseau = aucune perte ; tablette A vers B = aucune fuite de réponses ; échec serveur = jamais de faux « Enregistré ». Un seul échec critique = déploiement interdit.

## Décision attendue

Validez l'architecture, puis dites-moi si je peux lancer **l'étape 1 uniquement** (structures vides, aucune donnée touchée).
