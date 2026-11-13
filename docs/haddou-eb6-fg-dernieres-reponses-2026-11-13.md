# HADDOU — EB6 TAXI F/G : audit et correctif aperçu

## Statut
**NO-GO publication.** Aucune écriture réelle, réinitialisation, migration, fusion, suppression, mail ou publication. Les commandes de contrôle de base ont été exclusivement des SELECT. Les tests utilisent des données fictives.

## Identité et résultat de l’audit
Compte CRM confirmé : MASSINISSA HADDOU, TAXI, `c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe`.

| Matière | Passage V2 exact | Début → fin UTC | Version | Résultat V2 directement lié |
|---|---|---|---|---|
| F national, ancien | `df96660f-c572-4c97-83d7-bb55f0792ea2` | 30/10 14:35:34.576356 → 14:38:58.414322 | `7ca50bd2-0f8b-43d0-80cd-992e39a77794`, v2 retirée | `64b7ec91-aee8-4498-839a-6f580cb5ccb3`, 10/20 provisoire, 4 QRC en attente |
| F national, récent | `432554e4-dc4a-4817-af69-49ccb8d30438` | 13/11 09:25:53.419161 → 09:25:56.262393 | `42611560-2f03-4100-b04e-80377faa8fb5`, v5 retirée | `69ff307d-3e0b-4a65-a328-99ce910a6b7a`, 17/20 définitif, révision résultat 5, 4 QRC corrigées |
| G local, ancien | `a6a1dac0-24d9-4be1-a1ca-dcae695e49a2` | 30/10 14:39:02.208695 → 14:44:45.206057 | v2 ci-dessus | `24d803bd-8818-4546-a0ca-2af72e886e88`, 6/20 provisoire, 2 QRC en attente |
| G local, récent | `c604391d-c19d-4b84-87bd-faf41418d9e0` | 13/11 09:25:58.755361 → 09:26:00.733392 | v5 ci-dessus | `9d4234ed-93b3-4076-8c68-e425ced70f0e`, 6/20 provisoire, 2 QRC en attente |

Il ne s’agit pas d’imports historiques : **0 snapshot source_historique** et **0 reçu exam_subject_retakes** pour cet EB/compte. Les deux passages par matière sont natifs, avec leurs propres answer_state : F 16 lignes chacun, G 8 lignes chacun. Les 24 réponses récentes ont toutes une révision serveur 1. Ancien F : 290 événements ; récent F : 16. Ancien G : 307 ; récent G : 8. Ces nombres ne prouvent pas un geste volontaire de l’élève : aucune intention n’est déduite de leur vitesse.

### Résultats legacy conservés, mais non rattachables de manière univoque
- F t1 : `2a0db781-cc00-4d2a-8733-e8f83675ac61`, 30/10 14:38:59.169138 UTC, 15/20.
- F t2 : `1d43ef03-c71d-4d32-8c51-86d92da6f046`, 13/11 09:25:57.024748 UTC, 15/20.
- G t1 : `1e3f7917-de93-4a11-bd93-e07e550f8f15`, 30/10 14:44:47.601244 UTC, 8/20.
- G t2 : `f523a8d3-98d8-45f0-8fc7-8fb6da9d9c4d`, 13/11 09:26:01.615728 UTC, 8/20.

Aucun de ces quatre résultats ne porte source_exercice_id/attempt_id explicite. Leurs réponses et questions legacy sont identiques entre t1 et t2 pour chaque matière. La comparaison typée conserve les QRC exactes et ignore seulement l’ordre des cases QCM : les réponses des deux résultats correspondent aux deux passages concurrents de leur matière. **L’égalité des réponses et la proximité horaire ne prouvent donc pas une liaison unique.** La première comparaison JSON brute F était négative à cause de l’ordre des cases ; le contrôle typé confirme l’égalité. Aucune liaison n’a été créée.

### Projections de réponses anciennes
- F `8bb9e49e-fcf1-4266-8602-1849187000d9`, clé `EB6-TAXI__reglementation_taxi`, tentative 1, write_seq 61, dernière mise à jour 30/10 14:38:57.000520 UTC.
- G `6e2b0ce5-5719-4c1c-ab0c-95acc6dbdeed`, clé `EB6-TAXI__reglementation_taxi2`, tentative 1, write_seq 95, dernière mise à jour 30/10 14:44:43.549064 UTC.

Les deux lignes restent completed=false/status=in_progress/submitted_at=NULL. Aucun remplacement ni effacement exécuté.

Chronomètres : F ancien `fab851a2-9140-4238-b6d1-f7158b7bb5d1`, F récent `23e4c400-4b81-4de0-a436-1b9a9f501c0c` ; G ancien `9bc0585e-739a-49b3-97f2-17ca19dc5a83`, G récent `e1467786-3c2b-41f2-ab18-4ce81ab0486f`. Les chronomètres récents portent tentative 2 mais encore les mêmes clés sans suffixe.

## Cause exacte et références de revue
`exam_subject_reset_context` choisit indépendamment le dernier résultat (tentative 2), la réponse legacy (tentative 1, clé sans suffixe), et le chronomètre (tentative 2). Son contrôle compare la tentative du résultat au suffixe de la clé de réponse, donc **2 > 1** et refuse avec le message signalé. Relire reproduit forcément ce refus tant que les preuves sont identiques.

Références prioritaires à comparer sans afficher de réponses privées :
- F : résultat legacy récent `1d43ef03-c71d-4d32-8c51-86d92da6f046` versus passage `432554e4-dc4a-4817-af69-49ccb8d30438` / résultat V2 `69ff307d-3e0b-4a65-a328-99ce910a6b7a` ; projection ancienne `8bb9e49e-fcf1-4266-8602-1849187000d9`.
- G : résultat legacy récent `f523a8d3-98d8-45f0-8fc7-8fb6da9d9c4d` versus passage `c604391d-c19d-4b84-87bd-faf41418d9e0` / résultat V2 `9d4234ed-93b3-4076-8c68-e425ced70f0e` ; projection ancienne `6e2b0ce5-5719-4c1c-ab0c-95acc6dbdeed`.

Les paires V2 passage/résultat sont prouvées par attempt_id. Les paires legacy/V2 ne le sont pas. **Le bouton reste verrouillé ; aucune correction du serveur de reset n’a été préparée en contournant ce manque de preuve.**

## Correctifs en aperçu
1. Entrée dans PassageMatiere : après routage V2, lecture des answer_state du seul attempt_id/compte/snapshot ; restauration uniquement de ces valeurs et de la file non confirmée du même attempt_id. Une projection legacy ancienne ne peut plus être envoyée en masse dans un nouveau passage. Le remappage implicite des files de copies clôturées est retiré de ce chemin, sans supprimer les anciennes files.
2. Révision : projection distincte ebRevisionSource de la dernière copie native remise par matière, avec réponses propres et preuves QRC propres. Jamais de note historique modifiée. Une remise legacy réellement postérieure sans liaison immuable déclenche une revue, même si les réponses sont égales.
3. Brouillon de révision : sourceResultIds contrôlés ; même nombre de questions et mêmes numéros ne suffisent plus à reprendre les réponses d’une autre copie. Changement de contexte invalide la lecture en cours. Les brouillons sans provenance restent bloqués si la cible exige une preuve ; aucun backfill inventé.
4. Corrigé administrateur courant réutilisé uniquement quand questionActuelleRapprochee prouve ID/type/énoncé/propositions ; texte modifié ou propositions déplacées ne sont pas rapprochés. Les notes d’examen restent celles de leur copie. Les lecteurs et finalisations candidats restent OFF.

Les dernières valeurs serveur et les saisies locales sont distinctes : la file locale reste une reprise non confirmée, pas une preuve de soumission. L’indicateur existant annonce uniquement les confirmations serveur. Le correctif ne transforme pas la progression de révision en une nouvelle note d’examen.

## Tests et contrôles exécutés
- 135 tests ciblés dans 11 fichiers : identité multi-tentatives EB1–EB6 TAXI/VTC, nouveau passage vide, doublons/questions étrangères, preuve de source changée, QCM multiples, corrigé modifié, refus de brouillon ancien, vraie file avec serveur simulé, reconnexion/rechargement/double finalisation, reset F/G.
- Suite complète : **4 754 PASS, 13 ignorés, 0 FAIL**, 554 fichiers réussis, 2 ignorés.
- Chromium ordinateur 1280×1800 et mobile 390×844 : vrais écrans RevisionFausses, appels backend tous interceptés ; ancien brouillon refusé, réponse du même contexte relue et visible, zéro appel mutateur et zéro erreur JavaScript. Captures inspectées. Ce n’est pas un essai sur le vrai compte élève.
- Journal automatique : build OK.
- Empreintes SELECT avant/après identiques pour les quatre snapshots, leurs 48 réponses/version et les quatre résultats legacy. Résultats legacy hash `3b941bcb69b70b09080cf44fe6a53d56`.
- Aucun fichier de migration, droit, banque, note ou donnée réelle modifié. Le lot aperçu concerne passage/reprise/révision, tests et documentation ; aucun lot concurrent publié.

## Non prouvé / encore bloqué
- Résolution de provenance des quatre résultats legacy, et déblocage sûr de la commande serveur de reset : **non réalisés**, manque de liaison immuable.
- Demande complète « dernière révision par question » sur plusieurs rounds déjà terminés, récupération automatique d’un brouillon d’ancien round dont la source est absente, et reprise avec preuves suffisantes plutôt qu’un refus : **non entièrement livrées**. Le correctif préfère un refus explicite à un emprunt.
- Version serveur par question disponible dans answer_state, mais panne réelle longue et deux appareils avec le compte HADDOU non exercés ; les tests utilisent le serveur simulé.
- Restauration complète des sauvegardes et isolement du lot public restent non prouvés : **aucune publication**.
- Écart préexistant à arbitrer séparément : ExamensBlancsPage contient encore un rafraîchissement périodique 8 s malgré la règle permanente zéro polling. Il n’est pas changé dans ce correctif de provenance ; aucun nouveau polling ajouté.