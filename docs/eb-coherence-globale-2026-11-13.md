# Cohérence globale EB1–6 TAXI/VTC — 13 novembre 2026

## Décision
**NO-GO publication.** Adaptateur commun et contrôle administratif préparés en aperçu. Audit SQL d’inventaire effectué sur tous les IDs EB1–6 VTC/TAXI, sans filtre nominatif ni période. Aucun reset, migration, recalcul, correction, publication ou écriture réelle exécuté. Aucune réponse personnelle dans ce rapport.

Les lectures ont échoué temporairement avant de reprendre. Les métriques ci-dessous proviennent de SELECT globaux réussis, pas d’une extrapolation des deux incidents. Elles décrivent des structures à risque ; elles ne signifient pas que chaque utilisateur a effectivement vu une erreur. La comparaison complète de tous les lecteurs sur tous les comptes, la restauration et le parcours élève réel restent NON PROUVÉS.

## Inventaire exact
- 3 392 passages V2, 159 comptes ; 3 337 remis, 45 ouverts, 10 abandonnés. Inventaire relu en fin de travail : mêmes totaux.
- Passages remis : 1 850 natifs et 1 487 importés historiques ; 38 neutralisés, 36 archivés par reset, 6 marqués test, 24 rattachés à un compte technique. Ces catégories se recoupent : ne pas les additionner/soustraire sans intersection.
- 7 003 résultats secondaires, 193 comptes ; 209 résultats sans matière. Union candidats natifs/secondaires : 193 comptes.
- 8 034 instances QRC sur les passages remis, 386 non corrigées brutes ; après exclusion des comptes techniques, neutralisations et archives explicites : 329 QRC restantes. Ce dernier nombre concerne tous les passages, pas uniquement la dernière copie par matière.

| Examen | Passages | Comptes | Remis |
|---|---:|---:|---:|
| EB1 VTC | 693 | 98 | 674 |
| EB1 TAXI | 83 | 15 | 79 |
| EB2 VTC | 446 | 79 | 445 |
| EB2 TAXI | 111 | 14 | 109 |
| EB3 VTC | 498 | 82 | 497 |
| EB3 TAXI | 82 | 12 | 82 |
| EB4 VTC | 551 | 88 | 542 |
| EB4 TAXI | 85 | 11 | 84 |
| EB5 VTC | 429 | 64 | 420 |
| EB5 TAXI | 83 | 9 | 82 |
| EB6 VTC | 252 | 41 | 245 |
| EB6 TAXI | 79 | 13 | 78 |

## Constats quantifiés — périmètres distincts
| Type | Nombre exact | Signification / limite |
|---|---:|---|
| Résultat définitif avec QRC réellement non corrigée | 0 | Vérifié par état+note de chaque instance, relu en fin de travail |
| Compteur résultat différent des QRC restantes | 0 | Toutes les copies V2 du périmètre, relu |
| QRC toutes corrigées mais résultat existant non définitif | 0 | Un résultat absent n’est pas compris dans ce zéro |
| Copie remise sans aucun reçu de sa matière | 9 | 7 définitives, 2 provisoires ; inclut tests/techniques |
| Copie remise sans résultat officiel | 1 | Compte technique DEMO, EB5/Sécurité ; distinct des 9 précédentes, intersection possible |
| Copie native définitive avec reçu aux mêmes réponses mais ancien drapeau QRC en attente | 979 | Risque de source périmée ; ordre des tableaux QCM neutralisé, textes QRC conservés. La présence d’un reçu concordant n’autorise pas une fusion |
| Sauvegardes anciennes exactes non terminées déjà remises | 1 381, 65 comptes | Clés canoniques `EBx__matiere`, réponses exactes, sauvegarde antérieure à remise. Le compteur n’inclut pas toutes les anciennes générations de clés ni les suffixes tN ; risque de fausse reprise, pas preuve de 1 381 boutons affichés |
| Groupes natifs compte/examen/matière avec plusieurs copies remises | 118 groupes, 137 copies supplémentaires | Multitentatives normales ou doublons possibles ; aucune suppression/fusion |
| Reçus égaux aux réponses de plusieurs copies natives | 42 reçus, 85 correspondances, 8 comptes | Comparaison conservant texte, ordre QCM indifférent ; collisions, pas preuve d’une identité unique |
| Copies remises sans aucune question figée accessible | 0 hors comptes techniques | Test de présence seulement ; ne prouve pas le barème/identité de chaque question |

### Reçus absents : comptes et matières
- **DIANE Mohamed**, EB5 VTC Anglais : 4/20 définitif, copie `49b620d5-6068-4cb4-a432-226bfef63de3`.
- **SAIDI Aymen**, EB5 VTC G/réglementation_vtc2 : deux copies définitives 8/20 (`3dfb8756-4e3b-404e-8e60-e94dbb8a50a3`, `fffa4959-30b0-4a98-980c-1ea8baa34ac3`). Conservées séparément.
- **SARKISIAN Pogos**, EB6 TAXI Sécurité : 12/20 définitif, `0f01165d-f7a9-42f1-abf4-76fa463d7fe5`.
- **Berhane Gebremedhin Samson**, EB3 VTC T3P : 0/20 provisoire, copie remise, pas une note définitive.
- **FICTIF ESSAI IA**, non inscrit au registre technique : EB4 TAXI G provisoire et EB6 VTC G définitif 0. Ne pas exclure ce compte sur son nom seul.
- **DEMO Test VTC**, compte technique : EB5 et EB6 Sécurité, et un résultat EB5 absent ; exclus des comptes opérationnels par preuve du registre technique.

### Collisions de reçus, ordre QCM indifférent
| Compte | Examens | Reçus ambigus |
|---|---|---:|
| Mfouemo Rodrigue Rodrigue Etienne | EB1 VTC | 8 |
| BENKHELIL HASSEN | EB1 TAXI / EB2 TAXI | 2 / 4 |
| CHEMOUN Mourad | EB2 TAXI | 2 |
| HADDOU MASSINISSA | EB2 / EB4 / EB5 / EB6 TAXI | 10 / 4 / 2 / 6 |
| HAMDI Mohamed | EB3 TAXI | 1 |
| HABLANIS Anis | EB4 VTC | 1 |
| Berhane Gebremedhin Samson | EB5 VTC | 1 |
| MEMDOUH Ilies | EB6 TAXI | 1 |
| DEMO Test VTC (technique) | EB4 VTC | 1 |

Correction du total : cette liste contient **9 comptes, 43 reçus et 87 correspondances** (dont DEMO : 1 reçu / 3 correspondances). Hors compte technique DEMO : **8 comptes, 42 reçus, 84 correspondances**. Les correspondances sont des liens potentiels, jamais des liaisons enregistrées. Le tableau synthétique brut précédent indiquait 42/85/8 : utiliser ce détail recompté, pas cette ligne pour un total opérationnel.

## Causes racines et correctifs d’aperçu
1. Les lecteurs construisaient la liste des matières depuis les seuls reçus secondaires : une copie native sans reçu disparaissait. `lignesCanoniquesEB` sélectionne désormais une copie indépendante par compte/examen/matière et l’affiche sans créer de reçu.
2. Plusieurs passages concordants rendent le rattachement au reçu ambigu. La copie native conserve son propre attempt_id, snapshot, réponses et résultat ; un reçu ultérieur divergent porte une revue explicite, jamais une liaison fabriquée.
3. Les restes de sauvegarde `completed=false` n’attestent pas une tentative encore ouverte. L’exclusion des autosaves exacts antérieurs à une remise est conservée ; un passage natif ouvert reste prioritaire. Les chemins parent de restauration/reprise utilisent encore des décisions legacy distinctes : **parité complète NON PROUVÉE** et aucune autorisation de démarrage changée.
4. L’attente de publication ou de preuve était appelée attente QRC. `statutCopieEB` et les libellés communs distinguent correction, publication, revue et lecture impossible.
5. Une erreur supplémentaire a été trouvée dans la vérification PC/mobile : des alias F(T)/G(T) pouvaient sélectionner F pour G. `findScoreForMatiere` privilégie désormais l’ID exact ; repli par alias seulement si unique. Test concret 16 F / 17 G ajouté, puis écran relu 14 global / 17 G.
6. Mises à jour de tentative/reset ajoutées aux signaux de notes existants. Lectures tardives des écrans CRM/liste ignorées après remplacement du contexte ; erreurs de lecture affichées, pas converties en réussite.

Adaptateur branché en aperçu : liste EB élève, résultats sauvegardés, ouverture de résultats, Mes notes, CRM Résultats, CRM onglet Examens, Notes par session. Les consultations historiques/correcteurs et les commandes de reset restent liés à leurs identités existantes, non convertis en permission par l’adaptateur.

Priorité : dernière copie remise par matière, après exclusions serveur, puis ID stable en cas d’égalité. Pas de substitution par date de correction, pas de note définitive ancienne si nouvelle copie en attente. Le diagnostic historique d’un examen complet conserve ses sept matières dans la même tentative enregistrée : pas de tentative inventée par proximité temporelle.

## Contrôle administratif réexécutable
`Contrôle de cohérence EB` ajouté à l’onglet « Notes non remontées ». Bouton explicite, lectures déterministes par clé de 100, union comptes natifs+legacy, comptes techniques exclus par registre, archives/reset exclus, aucune mutation RPC (contrôle de rôle en lecture uniquement). Le rapport ne contient ni réponses, ni questions, ni commentaires, ni coordonnées.

Une seconde lecture confirme les constats ; les changements pendant le contrôle imposent une nouvelle vérification. Annulation/génération et événements correction/finalisation/reset/reconnexion, aucun polling ajouté. **Le parcours global réel de ce nouveau panneau n’a pas été exécuté jusqu’à un rapport complet dans le navigateur** ; les métriques ci-dessus proviennent des SELECT d’audit. Le panneau ne compare pas encore tous les chemins legacy-only et ne prouve pas la sécurité/restauration de bout en bout.

## Tests réellement exécutés
- Matrice canonique : 12 examens × 7 matières, absence de reçu, publication/QRC distinctes, vrai zéro, copies multiples, reçu divergent, owner/reset exclu, snapshots, pagination/erreur/annulation. 95 tests puis ajout du mapping exact F/G (96 cas).
- Premier passage suite complète : **4 916 PASS, 4 FAIL, 13 SKIP**. Régression mock CRM et assertion statique null corrigées, puis leurs tests repassés.
- Dernier passage suite complète : **4 918 PASS, 3 FAIL, 13 SKIP** sur 4 934 tests. Deux délais d’exécution (éditeur média, jeu comptable) puis PASS au rejeu ciblé. La file de réponses multionglets a un échec intermittent de fermeture après commit et un second échec au dernier rejeu : **FAIL, aucune modification de pontV2**, NO-GO.
- Dernier rejeu ciblé : **173 PASS, 2 FAIL** sur 175, deux échecs dans pont-v2-stockage-onglets ; six fichiers ciblés PASS, le fichier queue FAIL. Les tests de notes canoniques/CRM/media/jeu de ce lot passent.
- Navigateur élève fictif sans écritures réseau : PC 1280×1800/mobile 390×844, A9,5/B12,5/C17/D11/E13/F16/G17, global14, aucune fausse reprise ni attente, pas de débordement mobile. Images inspectées après le correctif F/G. Une version intermédiaire affichait G16, détectée et corrigée ; ne pas présenter cette version comme PASS.
- Compte élève réel, révision de toutes les copies, concurrence live réelle, panneau global et restauration complète : **NON PROUVÉS**.
- Compilation observée **build OK 14:02:39 UTC**. Aucun build/typecheck manuel.

## Limites / prochaine décision
**NO-GO** : suite complète non verte, file multionglets intermittente, restauration non prouvée, reprise parent encore legacy, panneau réel global non exercé, lectures non transactionnelles exposées aux corrections concomitantes. Les chiffres opérationnels exacts de candidats à corriger ne doivent pas être déduits des 329 QRC de tout l’historique.

Le parent examens garde son polling de 8 s, et la surveillance incidents un intervalle existant ; inchangés conformément au périmètre approuvé. Aucun nouveau polling. La suppression reste un chantier séparé. Aucune promesse de zéro bug.