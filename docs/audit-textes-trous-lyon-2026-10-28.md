# Audit fonctionnel des textes à trous Lyon — 28 octobre 2026

## Projet propriétaire et état de livraison

Le jeu est **Lyon Explorer Map**, projet `921b4a90-2fa6-49e1-8f2f-66b3ac0959c2`, publié à https://lyon-explorer-map.lovable.app.
Le projet actuellement ouvert est FTRANSPORT : il contient des liens vers ce jeu, pas son moteur de textes à trous. Ses jeux cartographiques internes ne sont pas concernés par ce moteur.

Une copie **en lecture seule** du jeu, révision `b66f6529`, a été obtenue. Les outils disponibles depuis ce projet ne permettent pas d'appliquer une correction dans l'autre projet. Aucune copie temporaire n'a été présentée comme une correction livrée.

**Correction non appliquée. Aucun déploiement ni publication. Aucun historique, jalon, compte, note ou réponse serveur modifié.** Les interactions publiques ont uniquement enregistré des états anonymes fictifs dans des navigateurs jetables.

## Inventaire complet identifié

| Exercice | Phrases | Trous | Réponses distinctes | Distracteurs | Instances initiales de banque | Réponses initialement manquantes |
|---|---:|---:|---:|---:|---:|---:|
| Nationale | 25 | 31 | 30 | 15 | 46 | 0 |
| Locale | 25 | 28 | 26 | 17 | 45 | 0 |

Les 50 phrases respectent `parts.length = answers.length + 1`. Les deux définitions viennent du code `src/data/reglementationTrousData.ts`, pas d'une lecture de questions en base. Le moteur utilise uniquement le stockage du navigateur pour ces activités. Aucun autre texte à trous n'a été identifié dans les deux codes inspectés ; les contenus exclusivement stockés en base n'ont pas été exhaustivement audités.

### Occurrences concernées exactement

- Nationale : **ADS ×2**, trous actuels `1-0` et `11-0`.
- Locale : **Rhône ×2**, trous `14-0` et `23-0` ; **Saône ×2**, trous `14-1` et `23-1`.
- Les autres réponses ont une occurrence chacune.

La liste fournie par l'utilisateur ne correspond pas à la banque initiale actuelle complète. Elle omet notamment carte professionnelle, préfecture, taximètre, refus de prise en charge, Le.Taxi, formation, permis de conduire, admission, verte, chien guide, incessible et maraude. L'origine exacte de sa banque — sauvegarde ancienne, mélange d'onglets ou autre état — n'est pas prouvée, faute de lecture de son appareil.

## Causes prouvées

### 1. Une chaîne de texte représente plusieurs instances

`src/components/ReglementationTrousGame.tsx:101-117,263-270` :

- La banque retire **toutes** les chaînes égales à un mot déjà placé (`placedWords.includes(w)`).
- Le placement supprime toute autre affectation contenant le même texte.
- La sélection et la clé React sont le texte du mot, sans identité d'occurrence.

Résultat reproductible : impossible de conserver simultanément les deux ADS, ou les deux Rhône et les deux Saône. **30/31** placements maximum en nationale ; **26/28** en locale. Ce n'est pas un problème de CSS ni de hasard pédagogique.

### 2. Le passage directe nationale → locale conserve les états

`src/pages/Index.tsx:136-146` rend le même composant au même emplacement, sans clé de montage par exercice. Les états initiaux du moteur ne sont pas rechargés lors du changement d'exercice, mais son enregistrement écrit sous le nouveau préfixe.

Reproduction sur le site publié : ouverture nationale puis locale ; **la banque locale enregistrée devient exactement la banque nationale, sans ZUPC**. Cela explique fonctionnellement une banque inadaptée au texte affiché.

### 3. Ancienne sauvegarde acceptée sans version ni contrôle

`ReglementationTrousGame.tsx:25-32,63-91` : JSON simplement converti en type, sans validation à l'exécution. La banque ancienne est conservée telle quelle ; absence de version, d'empreinte de contenu et d'identifiants stables de trous.

Reproduction fictive : ancienne banque contenant seulement `minimum` et `ADS`, puis rechargement ; le texte à 31 trous conserve cette banque de deux mots. La permutation initiale n'enlève aucune réponse, mais une restauration peut maintenir une banque incomplète indéfiniment.

### 4. Comptage de validation incorrect

`ReglementationTrousGame.tsx:179-181,317` additionne affectations et verrous alors que les réponses correctes figurent dans les deux collections. Les verrous sont donc comptés deux fois. À zéro verrou, le bouton exige tous les trous remplis ; le défaut de doublons empêche de les remplir correctement. Avec au moins un verrou, le bouton est activé même si des trous restent vides. Une réussite restaurée est affichée sans être recalculée.

### 5. Isolation insuffisante

Le suffixe de sauvegarde dépend de prénom/nom minuscules dans `lyon-legend-player`, ou `anonyme`. Pas d'identifiant joueur immuable ni de version d'exercice. Deux homonymes partagent une clé ; la concaténation avec tirets peut également entrer en collision. Changer d'identité ne force pas une restauration propre avant enregistrement. Conséquences exactes sur un compte réel non testées.

## Vérifications réellement exécutées

| Vérification | Résultat |
|---|---|
| Inventaire mécanique des deux banques, multiplicité et segments | PASS : initialement 0 réponse manquante ; défauts d'instances identifiés |
| Site publié, 1280 ×1800, deux exercices | PASS reproduction : nationale 30/31, locale 26/28, validation désactivée |
| Site publié, tactile simulé 768 ×1800, deux exercices | PASS reproduction des mêmes blocages |
| Site publié, tactile simulé 375 ×1800, deux exercices | PASS reproduction des mêmes blocages |
| Sélection visuelle d'un mot puis premier placement tactile | PASS : changement visuel et placement |
| Retrait d'une réponse non verrouillée, retour en banque | PASS dans le cas simple à mot unique |
| Rechargement de la progression fictive | PASS : mêmes affectations restaurées, blocage conservé |
| Changement direct nationale → locale | PASS reproduction : banque nationale écrite sous locale |
| Restauration ancienne banque fictive | PASS reproduction : banque incomplète acceptée |
| Compte technique dédié authentifié, changement de joueur | NON PROUVÉ : tests anonymes seulement ; correction exige le projet propriétaire |
| Anciennes sauvegardes d'élèves réels | NON PROUVÉ : aucun appareil ni état réel inspecté |
| Navigation clavier complète, déplacement, remplacement, erreurs corrigées | NON PROUVÉ par navigateur dans cet audit |
| Écran après correction / conformité finale | NON PROUVÉ : aucune correction applicable depuis ce projet |
| Tablette ou téléphone physique | NON PROUVÉ : émulation tactile uniquement |

Le moteur n'offre pas de glisser-déposer ; il utilise des boutons et leurs clics. Pas de spinner dans ce circuit. Les boutons natifs permettent l'activation clavier ordinaire, mais manquent de labels contextuels pour les trous et de `aria-pressed` pour la sélection. Aucune panne d'overlay ou de clic global n'a été observée dans les essais ; cela n'exclut pas un problème sur un appareil particulier.

## Preuves de capture et scripts

Conservés dans `/tmp/browser/lyon-trous/` :

- `public-nationale.png` : banque initiale actuelle et texte 31 trous.
- `nationale-375-blocked.png`, `nationale-768-blocked.png`, `nationale-1280-blocked.png`.
- `locale-375-blocked.png`, `locale-768-blocked.png`, `locale-1280-blocked.png`.
- `local-contaminated.png` : titre locale avec banque nationale.
- `stale-bank.png` : 31 trous avec seulement deux mots restaurés.
- `audit_public.py`, `check_mechanics.py`, `check_switch.py`, `exercises.json`.

Ces preuves sont des reproductions **avant correction**, pas une preuve de livraison. Aucun test n'a soumis de réponse au serveur ni créé de joueur.

## Correction à appliquer dans Lyon Explorer Map

Fichiers concernés : `src/data/reglementationTrousData.ts`, `src/components/ReglementationTrousGame.tsx`, `src/pages/Index.tsx`, tests mécaniques et d'interaction dédiés.

1. Définir des IDs permanents de phrases/trous et des tokens `{id, text}` : chaque ADS/Rhône/Saône possède son instance indépendante. Sélection, affectation et clé React utilisent les IDs, pas les chaînes ni les indices après mélange.
2. Construire la banque complète de la version courante ; mélanger seulement son ordre. Retirer/rendre/déplacer une seule instance et conserver les autres.
3. Clé et restauration par jeu + joueur immuable + exercice + version ; montage indépendant à chaque changement, aucune écriture sous la nouvelle identité avec l'ancien état.
4. Préserver les anciennes sauvegardes dans leur version historique. Reprise compatible uniquement avec preuve de correspondance stable ; ne jamais réinterpréter automatiquement des indices anciens ni remettre à zéro globalement.
5. Valider chaque trou une seule fois, recomputer la réussite depuis ses réponses vérifiées, ne pas faire confiance à un booléen ancien. Mauvais placement corrigible ; lecture invalide signalée, jamais transformée en réussite.
6. Tests de toutes les banques et de leurs occurrences, puis vrais clics/touches/clavier, doublons, retrait/remplacement, changement d'onglet/joueur, ancienne sauvegarde, 375/768/bureau et compte dédié. Publication isolée uniquement après vérification.

La justesse juridique de chaque phrase n'a pas été certifiée par cet audit fonctionnel. Les énoncés parfois maladroits ne doivent pas être modifiés sans version distincte et revue pédagogique.

## Complément identité/résultats — demande 28/10 14:41 UTC

Exigence ajoutée au même périmètre : redemander l'identification **à 24 heures exactement après la fin réelle du quiz**, sans prolongation lors d'une navigation/recharge. Empêcher toute lecture de résultats d'un autre joueur avant comme après ce délai ; proposer Changer joueur/Déconnecter dans le jeu seul. Les comptes formation et leurs permissions restent indépendants.

### Reproductions sur le jeu publié, données exclusivement fictives

Script `/tmp/browser/lyon-identite/repro_resultats.py`, navigateur jetable, aucun joueur créé ni résultat serveur écrit :

1. Injection locale d'une sauvegarde historique fictive nationale marquée terminée et datée de 48 heures : **résultat affiché sans réidentification**. Le champ fictif `finishedAt` est ignoré puis omis lors de l'enregistrement du moteur existant ; il ne constitue pas une preuve de fin serveur.
2. Navigation nationale → locale : **écran « locale — terminé ! » hérité de la sauvegarde nationale**. Une sauvegarde incohérente `gameComplete: true`, un seul verrou, suffit même à afficher « Bravo » avec **1/28**, car la réussite restaurée n'est pas contrôlée.
3. Un second onglet remplace l'identité locale fictive A par B : **le premier onglet continue d'afficher le résultat précédent**. Aucun bouton Changer joueur n'est présent sur cet écran. Il s'agit d'une simulation du changement de la clé existante, pas d'une connexion réelle B via un service d'authentification.

Captures observées : `resultat-a-48h.png`, `resultat-local-herite.png`, `resultat-apres-changement-b.png` sous `/tmp/browser/lyon-identite/`.

### État des protections

- Le moteur textes à trous n'enregistre aucun horodatage fiable de fin ; pas de règle 24 h actuellement implémentée.
- Il lit une identité nominative globale au navigateur, pas une identité vérifiée par jeu. Les états/sauvegardes ne contiennent ni tentative immuable ni version.
- Le résultat reste visible pendant un changement d'identité inter-onglets ; absence de réaction au changement de stockage dans le moteur inspecté.
- Pas de requête de résultats serveur ni de cache de requêtes dans ce moteur : inventer une correction de requête serveur ici ne traiterait pas la cause prouvée. Les autres jeux et leurs éventuels appels doivent être revus dans le projet propriétaire.

### Tests restant obligatoires après correction

NON PROUVÉS : vrai parcours fictif A termine quiz1 → quiz2, identification B via l'interface, seuils 24 h−1/24 h exact/24 h+1 depuis une vraie fin enregistrée, recharge sans prolongation, plusieurs onglets synchronisés, réponse asynchrone A tardive après B, ACL et historique autorisé. Les essais présents démontrent les défauts **avant correction**, pas la livraison ni une authentification sûre.

Une date historique absente ou non fiable ne doit pas être inventée à la recharge : préserver la copie, exiger une nouvelle identification avant l'accès, et ne pas fabriquer une nouvelle preuve de fin. La politique d'expiration doit protéger chaque jeu/quiz indépendamment ; le changement d'identité retire uniquement l'état actif concerné et laisse les historiques conservés, avec lectures conditionnées au propriétaire autorisé.

**Blocage inchangé : ouvrir Lyon Explorer Map pour appliquer la correction ; ce projet n'offre qu'une copie lecture seule de l'autre application. Aucun correctif fonctionnel ni publication effectué ici.**