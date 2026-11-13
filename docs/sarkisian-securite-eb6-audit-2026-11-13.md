# Pogos SARKISIAN — Sécurité routière EB6 TAXI

Audit du 13/11/2026, lecture seule de la base ; correctif d’affichage en aperçu uniquement. Aucun recalcul enregistré, résultat/compte/tentative/réponse/statut/progression/signature modifié, aucune publication.

## Conclusion
**La matière a bien été passée ; sa note officielle est 12/20, définitive.** Le tableau initial ne construisait ses lignes que depuis `apprenant_quiz_results`. La fiche secondaire Sécurité EB6 manque, tandis que le passage natif V2 et son résultat existent. L’enrichissement V2 ne travaillait que sur des lignes déjà présentes : il ne pouvait donc pas ajouter la septième matière. Conséquence : « Non passé » et « Incomplet (6/7) » malgré une publication serveur complète.

## Colonnes précisément vérifiées
Définition actuelle du module éditeur `90011`, mise à jour 13/11 12:49:37.671410 UTC ; version officielle actuelle EB6 TAXI n°27, publiée 12:49:32.238377 UTC. La version figée du passage n°5 conserve le même ordre :

| Position matière | Identité | En-tête | Note définitive |
|---|---|---|---:|
| A | t3p | Transport Public Particulier de Personnes (T3P) | 8,5/20 |
| B | gestion | Gestion | 10/20 |
| **C** | **securite** | **Sécurité routière** | **12/20** |
| D | francais | Capacité d’expression et de compréhension en langue française | 6/20 |
| E | anglais | Capacité d’expression et de compréhension en langue anglaise | 11/20 |
| F(T) | reglementation_taxi | Réglementation nationale TAXI | 14,5/20 |
| G(T) | reglementation_taxi2 | Connaissance du territoire et réglementation locale TAXI | 11,5/20 |

La ligne comporte avant ces matières « Apprenant », « Filière », « EB6 TAXI — général /20 ». Les six notes de la demande concordent exactement avec EB6 TAXI. C est donc la cellule manquante, pas F/G. En-têtes relus dans le vrai écran administrateur après correctif. La capture originale de cette demande n’est pas jointe : la concordance repose sur les six valeurs, le référentiel enregistré et la reproduction du chemin de lecture, pas une supposition sur la position visuelle.

## Preuves minimales
- Dossier unique Pogos SARKISIAN TAXI : `144ca7f4-6623-4063-861b-e139a4a0108b`. Aucun homonyme Pogos retourné ; autres SARKISSIAN non utilisés.
- Inscrit TAXI/TA 26/10–16/11, session `82b3a426-39d1-44f9-bfaa-d750c4575e8d`, et session croisée VTC/TAXI 02–13/11 `91f00853-2ac2-4da6-996b-4832fc132b6b`. Pas de liste d’attente. La session filtre les candidats, pas les dates de leurs notes ; le sélecteur TAXI utilise `type_apprenant=taxi`.
- Identité logique : **EB6-TAXI / securite / tentative initiale** ; un seul passage natif pour cette matière : `0f01165d-f7a9-42f1-abf4-76fa463d7fe5`.
- Début **13/11 09:28:41.260394 UTC** ; remise **09:37:59.635544 UTC** (10:37:59 Paris), état `terminee`.
- Résultat `33804629-6074-40a2-b20c-c9df39ce00ba`, révision 1, **score 12/20**, `definitif`, publication **09:38:02.969141 UTC**, zéro QRC restante.
- Snapshot `42611560-2f03-4100-b04e-80377faa8fb5` (version 5) : 20 QCM, aucune QRC, coefficient 3, seuil éliminatoire 6, barème 20. 20 réponses serveur ; somme en SELECT avec ensembles de lettres triés = **12 réponses exactes /20**, concordante avec le résultat. Une première comparaison brute non triée donnait 11, abandonnée : l’ordre des cases cochées ne change pas la correction.
- 41 événements de réponse, 42 entrées de journal secondaire. Timer `3d3d6c85-29d4-4450-91c8-d1330729448a` démarré 09:28:41.940390 UTC. Opération serveur `attempt_finalize` à l’instant de remise. Aucun reset global ni neutralisation de ce passage.
- Fiche secondaire d’entraînement/synchronisation `68a38c58-0322-49dd-960d-ae087f0ea210`, `EB6-TAXI__securite`, reste `in_progress`, 20 réponses, dernière sauvegarde 09:37:54.828267 UTC. Ce statut secondaire **n’annule pas** la vraie remise V2.
- **Zéro** résultat secondaire `apprenant_quiz_results` pour EB6/securite, confirmé après consultation. Les six autres résultats secondaires existent ; leurs notes parfois anciennes sont supplantées à l’affichage par leurs propres résultats V2.
- Trace `b178ed79-05b2-4cde-8873-602e13566a5a`, 09:38:26.596549 UTC, code `SYNCHRONISATION_REFUSEE`, même attempt_id : « [NoyauV2] synchronisation refusée — réponses conservées localement ». Elle prouve un refus de synchronisation à cet instant, **pas à elle seule la cause de l’absence de fiche secondaire**. Aucun POST réparateur lancé.
- Historique Sécurité distinct : EB1 5/20, EB2 11/20, EB3 16/20, EB4 13/20, EB5 17/20. Aucune note empruntée à ces examens.

## Correctif aperçu
`notesSession.ts` complète les lignes du relevé avec `ajouterCopiesNativesSession` dans `copieRecenteSession.ts` : uniquement matière exacte absente, compte/examen/matière/remise serveur exacts, snapshot et réponses propres au passage, note/publication V2. Identité de ligne = attempt_id, **aucun résultat secondaire créé**, aucune liaison historique inventée. Pas de doublon avec une matière déjà reconnue ; neutralisé ou hors filière exclu ; contenu/preuve incertains = indisponible ; publication en attente = attente, jamais zéro.
Le correctif porte uniquement sur Notes par session, pas sur la sauvegarde de copies ni une migration. Les autres lecteurs partant des seules fiches secondaires devront être audités séparément si un incident les concerne.

## Vérifications
- **54 tests Vitest PASS**, 7 fichiers, dont 12 nouveaux cas anonymisés : six fiches + une matière native, 12/20 et moyenne pondérée 10,7/20 ; aucun passage, autres identités/filières, neutralisation, attente, preuve absente/non fiable, doublon, zéro réel ; anciennes sélections et source unique conservées.
- **Écran réel administrateur PC PASS** : `/?section=cours-en-ligne&onglet=notes-session&notes_session=crm:82b3a426-39d1-44f9-bfaa-d750c4575e8d`, choix EB6 TAXI, ligne Pogos **12/20 Sécurité**, général **10,7/20 définitif — Réussi**. Aucune donnée enregistrée pour produire cette moyenne affichée. Sept notes lues dans le DOM.
- Mobile : DOM réel lu, mais captures masquées par le menu latéral ; **PASS visuel mobile NON PROUVÉ**, aucune retouche hors périmètre. Compte élève direct non exercé ; consultation admin seule autorisée.
- Build actuel **OK** après correction d’un problème de type du nouveau helper.
- Empreintes avant/après identiques : passage `32a88277fb99d224315c1f18e78e2e0e`, résultat `75370d03c98aabc409b0f26205626a38`, réponses serveur `49b23f7fba2514c8c604a3fdaaac8d1d`.

## Limites
La cause d’affichage est prouvée ; la panne originale de création de fiche secondaire reste à approfondir séparément si demandé, sans tenter de la recréer. Ni recalcul massif, ni réparation réelle, ni publication réalisés. Le site publié reste inchangé ; diffusion du correctif uniquement après accord.