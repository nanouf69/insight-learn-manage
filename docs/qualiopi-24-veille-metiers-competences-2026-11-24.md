# Qualiopi — indicateur 24, veille métiers et compétences TAXI/VTC

Revue et enregistrement du 24 novembre 2026, après déclaration du dirigeant.

## Exigence et méthode

L’indicateur 24 est applicable : le prestataire doit réaliser une veille sur les évolutions des compétences, des métiers et des emplois et en tirer les conséquences éventuelles sur ses prestations. Le guide donne des exemples non exhaustifs ; aucun registre, formulaire ou export particulier n’est exigé arbitrairement.

Travail réalisé en lecture sur les preuves existantes, les contenus serveur et leurs journaux, les historiques Git et la source officielle du programme. Écritures limitées au dossier Qualiopi : fiches de preuve, liens et état de l’indicateur. Aucun contenu pédagogique, examen, QCM ou élève modifié ; aucun envoi ni publication.

## Déclaration formalisée, non requalifiée en preuve indépendante

Le dirigeant confirme :

- un suivi quotidien ChatGPT des programmes et examens CMA ;
- le suivi des informations CMA, des évolutions des pratiques professionnelles et des plateformes Uber/Bolt/Heetch ;
- une attention aux attentes des clients et au marché ;
- l’analyse des évolutions pertinentes et leur traduction, selon le besoin, dans les PowerPoint, QCM, exercices et examens blancs.

Cette déclaration est enregistrée comme **déclarative / non vérifiée indépendamment**. La fréquence effective des consultations CMA, plateformes, clients et marché n’est pas démontrée par des journaux ou originaux. Les rapports ChatGPT n’ont pas été rouverts ; aucun contenu de rapport n’est inventé.

## Exemples réels retrouvés

### 1. Évolution du programme officiel et QCM correspondants

L’arrêté du 20 mars 2024, en vigueur le 1er avril 2024, ajoute au programme TAXI/VTC la prévention des discriminations et des violences sexuelles et sexistes. Son annexe vise notamment les infractions, les discriminations de l’article 225-1 du Code pénal, les acteurs mobilisables et les bons réflexes : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049331579 .

Dans les modules serveur 2, 10, 25 et 39, les QCM actuels portent précisément sur l’outrage sexiste, le harcèlement et l’agression sexuelle, les critères de discrimination, les numéros d’aide et les bons réflexes VSS. Leur métadonnée `_editedAt` est datée du 05/11/2026.

**Portée :** rapprochement daté entre une évolution officielle des compétences exigées et une adaptation réelle des QCM. La date enregistrée ne prétend pas être la création initiale de chaque question ; l’intention de l’auteur n’est pas inventée.

### 2. Pratiques professionnelles liées aux plateformes

Les mêmes modules contiennent des QCM sur les obligations de l’intermédiaire/plateforme et la liberté du conducteur VTC ou TAXI de refuser une course, édités le 05/11/2026. Le journal confirme aussi l’élargissement de l’énoncé VTC à VTC ou TAXI dans plusieurs modules ce jour-là.

**Portée :** adaptation datée à des compétences et pratiques professionnelles liées aux plateformes. Elle ne démontre pas une consultation spécifique d’Uber, Bolt ou Heetch.

### 3. Bilan examen TAXI

Le journal `module_admin_audit_log` atteste l’ajout des questions 112 à 114 au module 11 « 6.BILAN EXAMEN TAXI », exercice 600, le 08/11/2026 : tronc commun TAXI/VTC et obligations des plateformes, commission locale T3P et conditions d’accès à la profession.

**Portée :** adaptation datée du Bilan à des thèmes métiers et d’accès à la profession. La date prouve l’ajout au Bilan, pas la rédaction initiale des questions.

### 4. Examen blanc EB6-TAXI

Le journal `examens_blancs_audit_log` conserve 20 modifications de 2 questions de G(T) — Connaissance du territoire et réglementation locale TAXI le 13/11/2026. Pour la question 2 sur les tarifs B/C, les versions intermédiaires et la réponse finale sont conservées.

**Portée :** adaptation effective et historisée d’un examen blanc. La source ayant motivé chaque correction n’est pas jointe ; la fiche ne certifie pas les valeurs tarifaires.

### 5. Références antérieures réutilisées

Les comparaisons avant/après Gestion — seuils 2026, Sécurité routière — amendes 2025 et T3P — registre VTC, déjà enregistrées pour I23, sont également rattachées à I24 sans créer de doublon de fiche.

Les 7 liens déjà présents sur I24 sont conservés, notamment les déclarations de veille, le processus PowerPoint, l’historique des supports, les équipements TAXI et la mise à jour de réglementation locale.

## Réévaluation et statut

**Statut créé : Conforme.**

Le faisceau démontre une procédure de veille métiers/compétences et plusieurs impacts réels sur les prestations : QCM, Bilan et examen blanc. Il n’est pas nécessaire d’exiger un registre formel supplémentaire pour reconnaître ces éléments.

**Réserve conservée, non bloquante :** les consultations effectives des informations CMA, d’Uber/Bolt/Heetch, des attentes clients et du marché restent déclaratives ; tous les liens source → modification ne sont pas historisés. Ces limites ne sont pas effacées par le statut.

## Contrôles en base

- Avant : 7 liens I24, aucune ligne d’état I24.
- Après : 16 liens I24, 16 preuves distinctes ; 6 nouvelles fiches `q24-*` et 3 références `q23-*` réutilisées, en plus des 7 liens initiaux.
- I23 conservé à 16 liens.
- Deux premières tentatives SQL refusées par la base ; lecture de contrôle confirmant zéro écriture partielle avant la troisième tentative corrigée.
- Aucune suppression, fusion, mise à jour de contenu pédagogique ou modification d’une donnée élève.
- Aucun email, aucune publication, aucune exécution de `geler_releves_fin_acces()`.
