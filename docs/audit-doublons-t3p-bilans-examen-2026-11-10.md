# Audit lecture seule — doublons T3P des Bilans examen VTC/TAXI

Date : 10/11/2026. Périmètre : données courantes des modules 5/500 (VTC) et 11/600 (TAXI), versions figées effectivement distribuées, sources T3P 1/2 et Bilan exercices. Aucune écriture de données, question, corrigé, copie, réponse, note ou progression.

## Conclusion

- **VTC : 114 entrées, 114 IDs numériques distincts, 114 UID distincts, 112 énoncés normalisés distincts.**
- **TAXI : mêmes comptes.**
- Dans chaque filière, **deux paires sont des doublons stricts**, avec énoncé, propositions, ordre des propositions et bonne réponse identiques : **25/43** et **37/47**.
- Les 114 énoncés sont communs VTC/TAXI aux mêmes positions ; 113 jeux de choix sont identiques, seule la question 5 diffère. Cette répétition **entre filières** vient d'une banque commune volontaire et n'est pas comptée comme doublon interne.
- **Treize familles sémantiques supplémentaires** demandent une validation pédagogique ; elles ne justifient aucune fusion automatique.

## Doublons stricts — preuves et identifiants

Normalisation utilisée pour l'énoncé : suppression des balises HTML, réduction des espaces, minuscules. Les propositions et clés ont ensuite été comparées directement en JSON.

| Filière | Positions | ID numériques | UID | Extrait | Choix / clé |
|---|---|---|---|---|---|
| VTC | 25 et 43 | 25 / 43 | `0ba1c6e0-5d95-41fa-b9eb-ed042bc5a718` / `116da9fc-a63d-43dd-9d4f-c268d386e023` | « Quelle est la taille minimum de la commune… » | Mêmes 4 choix ; C correct |
| TAXI | 25 et 43 | 25 / 43 | `2f149a5a-2899-4ae3-957a-d95459ee19f0` / `66389f98-509a-4063-8648-cde85c270d71` | même énoncé | Mêmes 4 choix ; C correct |
| VTC | 37 et 47 | 37 / 47 | `e5801e31-368d-4905-a86a-c1be8fef6ce5` / `ae07ee04-3d14-43b1-af5f-367dcdea7b6f` | « La réglementation du T3P se trouve dans le : » | Mêmes 4 choix ; C correct |
| TAXI | 37 et 47 | 37 / 47 | `2b57c4cf-13e2-4c1c-a61d-a1221353c8bb` / `d9dfafe7-b12a-4f5d-8cf8-6f6b169d9324` | même énoncé | Mêmes 4 choix ; C correct |

Empreintes MD5 des choix : `80c903c32085f5f679c0bab92550f4c9` pour 25/43 et `b20eb5279cc9e0bf66d11b80f5ce68be` pour 37/47, identiques dans les deux occurrences, les deux filières et les deux versions figées contrôlées.

Le TAXI possède aussi `question_id=840dd6b3-cb95-4cc0-8fa9-c6e1af66d078` sur l'ID 43 ; les autres occurrences de ces paires n'ont pas de `question_id`. Aucun rattachement n'a été modifié.

## Rapprochements sémantiques à valider — pas de fusion automatique

Les positions et IDs ci-dessous sont identiques dans les deux filières. La similarité retenue exige le même objectif de question et la même réponse attendue, même si la lettre ou la formulation des choix change.

| Famille | Positions / IDs | Réponse commune constatée |
|---|---|---|
| Texte contenant la réglementation T3P | 27/27, 37/37, 47/47, 88/89 | Code des transports ; 37/47 est aussi le doublon strict ci-dessus |
| Autorité organisatrice de l'examen T3P | 10/10, 81/82 | Chambre des métiers et de l'artisanat |
| Ancienneté maximale d'un véhicule hybride | 29/29, 41/41 | Aucune |
| Recours après condamnation pour délit de fuite | 31/31, 44/44 | Cour d'appel |
| Visite médicale d'une personne née le 12 mai 1950 | 26/26, 91/92 | 1 an |
| Agrément des centres de formation | 8/8, 40/40 | Préfet(s) / préfecture(s) |
| Autorité vérifiant le casier judiciaire | 45/45, 100/101 | Préfet ou préfet de police |
| Circulation des taxis dans les couloirs de bus | 17/17, 58/58 | Taxis, y compris hors zone de rattachement |
| Périodicité de la formation continue | 13/13, 80/81 | Tous les cinq ans |
| Validité de l'attestation de formation continue | 71/72, 89/90 | Cinq ans |
| Condition obligatoire pour devenir conducteur T3P | 101/102, 113/114 | Réussir l'examen |
| Sanction de l'exercice sans carte professionnelle | 69/70, 92/93 | Contravention de 5e classe / 1 500 € |
| Obligation de détenir une carte professionnelle valide | 74/75, 86/87 | Oui, carte en cours de validité |

Ces familles contiennent 28 occurrences supplémentaires. Leur existence ne signifie pas que 15 entrées doivent être retirées : certaines variantes peuvent être pédagogiquement intentionnelles. Une décision nominative est nécessaire pour chaque famille.

### Questions voisines volontairement non comptées comme doublons certains

- **20/20 et 64/65 — location à la place** : sujets proches mais clés divergentes. La première marque taxis **et VTC** interdits ; la seconde indique taxi interdit et VTC autorisé. Ne pas masquer cette divergence par une fusion.
- **84/85 et 99/100 — attente/service immédiat sur voie publique** : la première marque TAXI correct ; la seconde marque « Aucune » correct et ne marque pas Taxi. À examiner comme divergence de corrigé, pas comme doublon à supprimer.
- **85/86 et 90/91 — justificatifs d'assurance** : nombre d'assurances contre type de justificatif ; objets différents.
- **28/28 et 42/42 — hybride contre électrique** : catégories de véhicules différentes.
- Les sanctions pour agression sexuelle, outrage, harcèlement et discrimination partagent une formulation mais pas le même fait ni la même réponse.

## Origine et mécanisme

1. La banque embarquée `src/components/cours-en-ligne/bilan-questions-t3p.ts` contient **111 entrées et déjà 109 énoncés normalisés uniques**. Les deux répétitions 25/43 et 37/47 y sont donc déjà présentes ; elles ne sont pas créées par le navigateur.
2. Cette banque est référencée par `bilan_t3p_taxi` dans `examens-blancs-data.ts`, puis le même objet matière est utilisé dans `bilanExamenTaxi` et `bilanExamenVTC`. Cela explique les répétitions **entre** filières, sans duplication supplémentaire à l'intérieur d'une filière.
3. Les données admin courantes ont ensuite été enrichies/réordonnées jusqu'à 114 entrées. Les IDs et UID restent uniques ; copier une banque ne crée donc pas de doublon d'ID, mais conserve les doublons de contenu.
4. **Pas de concaténation avec T3P 1/2** : la source statique des cours contient 66 + 62 = 128 questions, toutes d'énoncés uniques, et **zéro correspondance exacte normalisée** avec les 111 questions de la banque d'examen embarquée.
5. Les lignes serveur courantes T3P 1/2 contiennent 53 + 80 questions VTC et 53 + 69 TAXI. Aucune correspondance exacte normalisée avec les 114 questions d'examen n'a été trouvée. Le brut historique du Bilan exercices (206 objets) ne présente pas non plus de correspondance exacte avec ces 114 énoncés.
6. `shouldSyncVtcBilanFromCours` est `false`. La resynchronisation du Bilan examen ne réinjecte qu'un exercice absent ou des images absentes ; elle conserve les questions admin et ne déduplique pas.
7. Les versions figées sont des **copies** de la banque : elles propagent les deux paires, sans mécanisme de déduplication à la lecture.

## Ordre et correspondance Bilan exercice / Bilan examen

- Bilan exercices T3P : projection de 128 questions issues des exercices 1 et 2 ; brut historique conservé à 206 objets.
- Bilan examen T3P : banque distincte de 114 objets courants. Il ne doit donc pas être comparé par simple égalité de nombre avec le Bilan exercices.
- Dans le Bilan examen courant, positions 1–58 : ID = position. L'ancien ID 59 est déplacé en fin ; positions 59–110 : IDs 60–111. Les IDs 112, 113, 114 occupent les positions 111–113.
- Position 114 : ID 59 en TAXI, ID 145 en VTC, avec le même énoncé de contrôle technique. Les IDs restent uniques ; aucun renumérotage n'a été effectué pendant cet audit.

## Les questions sont-elles réellement affichées deux fois ?

**Oui dans le circuit versionné actuel.**

- Version initiale active `7eed15ad-5cb2-433a-b17a-811c680b1490` : 114 questions, 112 énoncés normalisés uniques, mêmes deux paires.
- Version commune actuellement distribuée `9aade9f5-24a8-4eb1-8bcd-0643f5eacad8` : mêmes comptes et mêmes paires.
- 22 passages VTC existent : 3 sur l'ancienne version et 19 sur la version commune. **20 remises enregistrent `question_count=114` ; 2 passages restent ouverts.**
- Aucun reçu TAXI versionné n'existait au moment de la lecture. Un nouveau passage TAXI utiliserait la version commune contenant aussi les deux paires.
- La fonction `bilan_future_questions` retourne toutes les entrées dans leur ordre, sans déduplication. `BilanFutureExam.tsx` exécute ensuite `visibles.map(...)` sur cette liste. Les positions 25/43 et 37/47 sont donc bien rendues comme deux cartes distinctes.

Preuve obtenue sans ouvrir de nouveau passage et sans créer de réponse. Aucune capture d'un compte personnel n'a été réalisée ; la preuve repose sur les versions réellement rattachées aux reçus, les remises enregistrées et le chemin de rendu. Les très anciennes copies figées hors ces deux versions ne sont pas prétendues exhaustivement auditées.

## Correctif minimal proposé — accord requis

1. **Ne toucher à aucune version existante ni aux 22 passages VTC.**
2. Préparer une **nouvelle version T3P de 112 entrées**, en conservant la première occurrence de chaque paire et en excluant seulement les secondes occurrences **ID 43 et ID 47**. Tous les autres IDs, énoncés, choix, clés, images et leur ordre restent identiques ; aucun renumérotage des IDs.
3. Activer cette version uniquement pour les **nouveaux passages**, après tests du calcul de score sur 112 questions. Les copies déjà ouvertes ou remises restent sur leur version figée à 114 questions, sans recalcul rétroactif.
4. Conserver les objets admin actuels et toutes les preuves. Une éventuelle projection pour les anciens parcours non figés exige une preuve serveur supplémentaire qu'aucune copie commencée ne sera affectée.
5. Traiter les treize familles sémantiques dans une décision séparée, nominative, sans déduplication par similarité automatique.

Effet attendu du seul correctif strict : **114 → 112 questions pour les nouveaux passages**, deux répétitions exactes en moins, aucune modification des réponses, notes ou copies existantes. Les questions proches mais non strictement identiques restent présentes.

## Empreintes de lecture et limites

- Module 5 : `e01a7ccf92f6ee2564dce927921351b9`, mis à jour le 09/11/2026 16:47:52 UTC.
- Module 11 : `ec1ce49237e8b6a4d50723b5b6ec7276`, mis à jour le 08/11/2026 14:48:24 UTC.
- Exercice 500 : `b1fd82fcc8c42f8968a50796669cd15d` ; exercice 600 : `70a2d311d22b4e168f50e17c977756cd`.
- Sources T3P serveur lues : modules 2/10 ; Bilan exercices bruts : modules 4/9.
- La classification sémantique est une revue humaine des énoncés, choix et réponses ; elle n'est pas une décision de suppression. Les divergences de corrigé signalées n'ont pas été corrigées.
