# MEMDOUH Ilies — EB6 TAXI — audit lecture seule

## Conclusion
**Aucune QRC restante et aucune erreur du calcul enregistré.** Sept matières définitives, moyenne affichée **14/20 — Réussi**. Le 14/20 de la capture admin est la colonne « EB6 TAXI — général /20 », le 9,5/20 est A/T3P : ils ne divergent pas.

Le compte exact est `7dac2ec5-46f4-46f9-9573-2bf245041601`, MEMDOUH Ilies, TAXI. Aucun rattachement basé sur le surnom Elias. Deux inscriptions exactes : TAXI/TA du 26 octobre au 16 novembre et VTC/TAXI du 2 au 13 novembre. Le relevé administrateur de la première session a été lu dans le navigateur authentifié : sept notes et moyenne confirmées, sans écriture.

## Sept matières — 13 novembre 2026, UTC
| Matière | Passage natif | Remise | Publication définitive | QCM + QRC | Note /20 | QRC restantes |
|---|---|---|---|---|---|---|
| A/T3P | 916e7ca5-be83-48a1-aa16-50d1f3a0bcff | 09:08:24 | 09:30:54 | 5 + 4,5 | 9,5 | 0 |
| B/Gestion | 72306eec-7c25-4fba-b3b3-d0aff13b35c1 | 09:19:09 | 09:31:26 | 11 + 1,5 | 12,5 | 0 |
| C/Sécurité | 7c82df2f-3a2a-4813-94db-9f343f7d257c | 09:22:33 | 09:22:33 | 17 + 0 | 17 | 0 |
| D/Français | adb306c0-16a2-4b76-8324-6130c9f2487c | 09:36:33 | 10:23:41 | 6 + 5 | 11 | 0 |
| E/Anglais | 8152a46c-67f8-4b52-8ccf-ba7095db517c | 09:40:15 | 09:40:19 | 13 + 0 | 13 | 0 |
| F(T)/Nationale | d49822fa-3af5-4c4b-967a-d44ab5b8dd70 | 09:48:32 | 10:24:59 | 9 + 7 | 16 | 0 |
| G(T)/Locale, dernière copie | 3f9f1d62-2b4d-4abf-a24d-0305af877040 | 10:11:31 | 10:25:42 | 10 + 7 | 17 | 0 |

La formule du catalogue live `core_note_attempt` a été lue, puis reproduite uniquement en SELECT sur les choix figés, réponses serveur et notes QRC : les huit scores (deux G inclus) sont identiques aux scores enregistrés. Aucun appel de recalcul/RPC de notation.

Coefficients [3,2,3,2,1,3,3] : 238,5 / 17 = 14,0294, arrondi affiché 14/20. Toutes les matières dépassent leur seuil éliminatoire. La moyenne n'est pas une nouvelle note enregistrée.

## G(T) : deux copies distinctes, aucune fusion
- Première : `9bff4312-98e8-4dc9-8008-a1b7e2f3bd2f`, remise 09:59:09, résultat `0598fcba-6885-45d1-a8e0-86fbbb9e6693`, publication 10:25:47, 17/20.
- Dernière : `3f9f1d62-2b4d-4abf-a24d-0305af877040`, commencée 10:11:27, remise 10:11:31, résultat `94f2218a-b857-489f-be87-b9fdefed9512`, publication 10:25:42, 17/20.
- Huit questions et huit réponses pour chaque copie. Même empreinte du snapshot `7c22e943a776e1df08fa89478f8939d9` et réponses `3108262483fea65cbda24fc8af34c961` ; cela ne prouve pas qu'une copie doit être supprimée ou fusionnée.
- Deux QRC par G, notes 4 et 3, toutes corrigées ; dernier événement de commentaire/révision le 10:26:32 pour la seconde QRC de la dernière copie. Une publication peut précéder un événement ultérieur à note inchangée.
- 18 instances QRC sur les huit passages, toutes corrigées ; 20 événements de correction enregistrés avec auteur formateur (dont révisions). Aucun événement attribué `auto_exact_match` dans ce périmètre. Pas d'IA exécutée par l'audit.
- 251 événements réponses pour le premier G, 9 pour le second ; deux opérations `attempt_finalize` persistées. L'origine exacte du second démarrage n'est pas prouvée par ces seules traces.

## Causes d'affichage
1. **Source différente** : Notes par session choisit la dernière copie native remise. La liste élève et les résultats détaillés partaient des reçus secondaires et cherchaient un lien univoque. Le reçu G `a48a152a-84e1-46c5-924e-6f151571d6c8` porte encore `qrc_pending_correction=true` et une note secondaire 18, non autoritaire. Deux passages natifs aux réponses identiques rendent le lien reçu/passage ambigu : le verrou de provenance reste nécessaire. Refaire les lectures en direct ne résout pas ce choix de source.
2. **Fausse reprise** : zéro passage `en_cours` dans tous les EB du candidat ; sept anciennes lignes `reponses_apprenants` restent `completed=false`, `in_progress`. Leurs réponses exactes égalent celles des copies remises et leur dernière sauvegarde précède la remise. L'écran interprétait ces restes de sauvegarde comme une tentative ouverte. Aucune ligne n'a été finalisée/modifiée par l'audit.
3. **Live** : les quatre tables notes/QRC/résultats/tentatives figurent dans la publication Realtime live. Le lecteur élève suivait notes et QRC mais pas les changements des seules tentatives ; ajout local de ce signal. Aucun changement de publication/RLS.
4. Aucun error_log retrouvé dans le périmètre compte/IDs G depuis le 13/11. Cela n'établit pas l'absence de tout incident réseau de l'appareil ; les logs Edge fournis ne sont pas identifiables à ce candidat.

Versions figées : A–E version 5 `42611560-2f03-4100-b04e-80377faa8fb5` publiée 12/11 12:08:18 ; F/G version 18 `12b41a02-efd4-4ccb-a9e5-6693834f9bab` publiée 13/11 09:40:25. Différence réelle conservée, aucune banque actuelle superposée aux copies.

## Correctif préparé, aperçu seulement
- `ebNativeDisplay` réutilise le choix de copie indépendante de Notes par session pour la liste élève et les résultats sauvegardés. L'ID de la copie, ses réponses et sa publication restent ensemble ; les deux G et le reçu secondaire restent en base, aucune liaison fictive créée.
- Une sauvegarde ancienne n'offre plus de reprise si ses réponses complètes exactes sont déjà remises dans le même compte/examen/matière, tentative compatible et sauvegarde antérieure. Une réponse différente, sauvegarde ultérieure, autre compte/matière/tentative ou lecture impossible ne déclenche pas cette exclusion. Les vrais passages ouverts restent prioritaires.
- Ajout des événements `exam_attempts_v2` au rafraîchissement élève partagé, avec regroupement existant, sans nouvel intervalle ni écriture.
- Aucune correction de calcul serveur : les notes enregistrées étaient exactes.

## Vérifications réellement exécutées
- 40 tests existants avant correctif PASS.
- 78 tests ciblés après correctif PASS, 9 fichiers : EB1–6 TAXI/VTC avec collisions de provenance, dernière copie publiée/en attente, reçu divergent, identité, sauvegarde ancienne, coalescence et isolation des événements, notes session et matière native absente.
- Navigateur admin réel authentifié PC : colonne général 14 définitif/réussi et sept notes exactes, G 17. Capture mobile réelle masquée par menu : **NON PROUVÉ**, pas présentée comme réussite.
- Navigateur élève fictif, écritures réseau interdites : PC 1280×1800 et mobile 390×844, G 17, général 14, pas de bannière attente ni fausse reprise, pas de débordement mobile. Images inspectées. Ce test n'est pas une connexion au compte élève réel et ne prouve pas le rendu de toutes les questions historiques ni une correction live réelle de bout en bout.
- Dernière compilation observée : build OK 13:29:40 UTC.
- EB1–5 TAXI de ce compte : sept passages chacun, tous définitifs, zéro ouvert ; EB6 : huit passages, tous définitifs, zéro ouvert. TAXI/VTC EB1–6 couverts par tests fictifs, pas par des comptes réels VTC.

## Intégrité avant/après
Empreintes scoped à ce compte, identiques avant et après :
| Source | MD5 |
|---|---|
| Tentatives | 009a8f7562d655637595ccf77dd9a957 |
| Résultats natifs | 78246e4bbc1ceff6a2941ef5d37c5c68 |
| QRC | db1aa4066cf7da88014a844ddd77f950 |
| Reçus historiques | 3edecdca89b644ee002be3bcd65cc877 |
| Réponses natives | ee0a98d2af1f3452830dc11d6807827c |

**Zéro reset, écriture réelle, migration, envoi, recalcul enregistré ou publication.** Signatures/progression hors périmètre de mutation. Installation publique conditionnée à accord et garde-fous ; le correctif reste en aperçu.

Lien admin de lecture : `/?section=cours-en-ligne&onglet=notes-session&notes_session=crm:82b3a426-39d1-44f9-bfaa-d750c4575e8d`, choisir EB6 TAXI. Aucune QRC à corriger restante sur ce compte.

### Limites et chantier distinct
Le fichier parent `ExamensBlancsPage.tsx` conserve un polling de 8 s, contraire à la préférence historique « zéro polling » ; il n'a pas été modifié pour cet audit. Le signal de notes ajouté est événementiel. Décision utilisateur requise pour le chantier séparé de suppression de ce polling.