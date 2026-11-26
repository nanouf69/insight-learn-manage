# Lot du 26/11 — suite technique terminée pour revue

Suite du commit `40e185670`, sans reprise de l'audit, sans sous-agent et sans écrasement des correctifs précédents. Aucun déploiement, migration, publication, email, signature officielle, réponse historique ni remise réelle créée. Les anciens constats de production restent ceux du rapport initial ; seules des lectures de catalogue de schéma ont été effectuées cette fois.

## Delta supplémentaire réellement corrigé

### Worker/file/auth — quatre régressions reproduites puis corrigées
- Une erreur JSON dans l'ancien tableau ou une entrée `null` masquait toutes les opérations indépendantes : `readQueue` renvoyait une file vide.
- Une saturation pendant le stockage d'un successeur posait l'ACK de l'ancienne opération **avant** que le successeur soit durable : après fermeture, les deux pouvaient être invisibles.
- Un enregistrement par opération corrompu pouvait être réécrit par son miroir ancien.
- **Correction** `src/lib/answerPersistence.ts` : lecture isolée par entrée, récupération des autres opérations lisibles, conservation des octets illisibles, état erreur et finalisation refusée si lecture incertaine ; stockage de tous les successeurs avant les marqueurs ACK. Aucun effacement de file. La mémoire seule en saturation reste signalée : ne pas recharger tant que la réponse récente n'est pas durable.
- Tests `answer-persistence-26nov.test.ts` : **11/11 PASS**, dont quatre nouveaux ; suite file/régressions : **32/32 PASS**. Expiration/reconnexion, propriétaire, corps HTTP différé, refus figé et backoff préexistants conservés. Deux vrais onglets Chromium rejoués : deux opérations exactes, maximum une requête en parallèle, ACK conservé après reload ; HTTP fictif, aucune écriture Cloud.

### Sauvegarde/restauration jetable fidèle aux types
- Ancien test : schéma simplifié en texte, insuffisant pour prouver une restauration typée.
- `sauvegarde-restauration-26nov.test.ts` utilise maintenant le catalogue capturé par SELECT : **39 tables, 478 colonnes**, types réels, NULL/NOT NULL, clés primaires. `module_editor_state.module_id` est un vrai index UNIQUE NOT NULL, distinct du PK `id` : index capturé et reproduit, curseur inchangé.
- Source PostgreSQL jetable → exporter applicatif réel via transport/stockage fictifs → autre base PostgreSQL jetable : **4 501 lignes journal**, **2 501 révisions à clé composée**, Unicode/apostrophe/JSON/nuls/dates/nombres ; tous les SHA-256 des lots vérifiés avant restauration, comptes et empreintes de lignes complets comparés après restauration. Reprise après deux erreurs fictives 57014 incluse.
- **16/16 PASS**. Fiabilité des types/valeurs restaurés prouvée pour ce jeu fictif ; **pas** un export de production complet, ni restauration des fichiers binaires privés, ni snapshot transactionnel cohérent, ni restauration avec toutes les FK/RLS/trigger de toutes les 39 tables. Ces limites restent explicites et aucun marqueur réel de succès n'est posé.

### Six RPC — usages légitimes également parcourus
- Candidat serveur précédent conservé, non appliqué.
- `core-six-functions-contract.py` : **7/7 PASS**. Matrice anon/autre élève/propriétaire/admin/service ; finalisation et rejeu exacts ; publication/purge uniquement sur copie jetable et transaction annulée.
- Nouveau test : import admin/service parcourt réellement une copie fictive avec QCM/QRC ; preuve tentative 1 ne permet pas d'importer tentative 2, puis preuve exacte permet l'import ; second appel idempotent, une tentative créée, réponses exactes et source intacte, transaction annulée.
- Les tests n'utilisent pas les privilèges d'un compte réel. La faille reste présente en production jusqu'à revue et activation des gardes/ACL.

### Quatre copies 505 — candidat avec catalogue et déclencheurs capturés
- `lot505-catalogue-26nov-contract.py` : **2/2 PASS** sur le catalogue existant (fonctions, RLS et déclencheurs capturés), paramètres/empreintes remplacés par des fictifs uniquement.
- Le bloc du 26/11 ajoute exactement quatre autorisations (deux récupération), rejouable sans doublon ; toutes les réponses/statuts/notes/remises inchangés ; interrupteur **off** ; séquence divergente sur la dernière copie = annulation entière sans autorisations partielles ; client incapable d'installer le lot.
- `bilan_505_catalogue_prod_contract.py` **9/9 PASS**, `bilan_505_activation_contract.py` **8/8 PASS** rejoués. Parcours navigateur A–F 6/6 : résultat du tour précédent, **non rejoué ce tour**.
- Aucune des quatre vraies copies soumise ou modifiée. Q7 non corrigée dans deux snapshots reste non notée ; aucune bonne réponse rétroactive choisie. Activation nominative et revue/clic de l'élève obligatoires, après relecture des empreintes exactes.

### Synchronisation identité — vrais gardes et historique append-only
- `sync-identite-catalogue-26nov-contract.py` : **3/3 PASS**. Colonnes du module capturées, contraintes réelles des liens/journaux, gardes `bilan_sync_liens_guard` et `forbid_mutation_append_only` capturés et exécutés.
- Réconciliation des deux références sur questions fictives : deux exécutions, deux nouveaux journaux seulement, preuve antérieure strictement intacte, identités/JSON/dates des modules inchangés. Réécriture d'identité et modification de journal refusées. Propagation du corrigé sur la paire exacte puis mauvais ID refusé, sans nouvelle écriture.
- `bilan-sync-26nov-contract.py` : **11/11 PASS**, dont **7 hérités des six RPC** et **4 spécifiques** (ne pas doubler les comptes).
- Aucun nouveau lien réel ; 167 attentes équivalentes ne deviennent pas automatiquement liées, 43 différences TAXI/VTC ne sont pas fusionnées.

### null.nonPassee et I21 PC/mobile
- Correctifs des slots nuls conservés ; relecture finale navigateur : **18 vues** EB1/3/5 × remis/non passé/QRC × PC/mobile, aucun crash, aucune note zéro inventée ni débordement de page.
- I21 : vrai tracé souris puis toucher simulé Chromium, pixels non vides, consentement obligatoire ; HTTP fictif sans preuve refuse le succès et conserve le tracé ; réessai avec **même operation_id** et même tracé, puis relecture confirmée et disparition du formulaire automatique. PDF reçu/affiché et téléchargement SHA-256 identique. Les deux évaluations Albert historiques restent intactes.
- Ce contrôle a reproduit un **débordement mobile du PDF** : le lecteur observait une référence pas encore montée lors de l'ouverture de la fenêtre et conservait sa largeur initiale de 640 px. **Correction** `PdfPriveActions.tsx` : observer aussi au montage du blob, réserver l'espace du bouton fermer dans le titre. PC/mobile rejoués, largeur canvas contrôlée et images inspectées ; aucune régénération de contrat/PDF signé.
- Test durable `src/test/incident26-browser/i21-pc-mobile.py`, exécuté sous `/tmp/browser/incident26-suite/` ; toute sortie externe non fictive bloquée. Il ne prouve pas un accès admin officiel ni un vrai iPhone/Safari.

## Résultats finaux exécutés

| Suite | Résultat |
|---|---:|
| Vitest lot complet, 17 fichiers | **148/148 PASS** |
| Six RPC isolés | **7/7 PASS** |
| Sync ancien banc (7 RPC hérités + 4 propres) | **11/11 PASS** |
| Sync identité/contraintes/gardes capturés | **3/3 PASS** |
| Lot 505 catalogue/gardes | **2/2 PASS** |
| Contrat catalogue 505 | **9/9 PASS** |
| Contrat activation 505 | **8/8 PASS** |
| Deux onglets Chromium | **PASS**, HTTP fictif |
| Examens PC/mobile | **18 vues PASS**, données fictives |
| I21 souris/tactile + PDF/retry | **PC/mobile PASS**, réponses fictives |
| Compilation aperçu | **build OK** |

Les tests échouant avant correction (stockage, encodage/type Q1, volume du banc, largeur PDF et contrôle de sortie SQL) ont été rejoués ; seuls les résultats finaux ci-dessus sont PASS. Les modèles de table simplifiés du banc six RPC ne prétendent pas constituer le catalogue entier de production.

## Fichiers du delta de cette suite

- Code : `src/lib/answerPersistence.ts`, `src/components/formateurs/PdfPriveActions.tsx`.
- Tests existants renforcés : `answer-persistence-26nov.test.ts`, `sauvegarde-restauration-26nov.test.ts`, `sauvegarde-cle-reprise-07nov.test.ts`, `core-six-functions-contract.py`, `bilan-sync-26nov-contract.py`, `core_correction_securite_contract.py` (UTF8/environnement PG isolé).
- Nouveaux : `lot505-catalogue-26nov-contract.py`, `sync-identite-catalogue-26nov-contract.py`, `incident26-browser/i21-pc-mobile.py`, fixtures catalogue sauvegarde/index et schéma sync, ce rapport ; règles techniques consignées dans `AGENTS.md`. Aucun fichier de migration/de contenu pédagogique changé.

## Blocages précis et revue d'activation

1. **Production non activée volontairement**, conformément à la demande ; site public et six ACL réelles ne sont pas annoncés corrigés. La prochaine étape est la revue de ce delta et des candidats déjà préparés, pas une approbation générique ni une publication globale.
2. **Sauvegarde réelle finie** : exige après activation ciblée un cycle jusqu'au manifeste final, contrôle couverture/empreintes puis restauration de cet export sur base séparée. Les binaires des PDF/photos/signatures en stockage ne sont pas inclus dans la preuve de restauration des lignes ; ne pas assimiler chemins archivés à fichiers archivés.
3. **Cron** : candidat précédent = 720 relances/jour ; coût et fenêtre à valider avant modification. Aucun cron changé.
4. **Safari physique/stockage privé/sans Web Locks**, quota prolongé et volume des marqueurs : non prouvés ; le fallback sans Web Locks n'apporte pas de verrou multi-onglet global. Aucun compte réel requis/usurpé pour les tests effectués.
5. **Catalogue frais avant activation** : comparer les six définitions/ACL et les préconditions exactes des quatre copies/deux références aux captures ; refuser si dérive. Le catalogue 505 est la capture existante, pas un clone complet neuf. Aucun champ historique ne doit être remplacé pour faire passer ce contrôle.
6. **Publication ciblée** : la publication standard emporte les autres changements en attente ; cette suite ne l'utilise pas et ne prétend pas isoler automatiquement une publication globale. Le changement Slack concurrent et tous les travaux préparés sont conservés.

Conclusion : correctifs locaux supplémentaires réellement livrés et tests isolés terminés ; restent les validations impossibles à établir sans activation autorisée ou appareil physique, pas un travail technique laissé sur une simple roadmap.