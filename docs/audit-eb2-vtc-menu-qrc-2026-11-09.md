# Audit lecture seule — EB2 VTC absent du menu Correction QRC V2

9 novembre 2026, contrôles entre 13:27 et 13:31 UTC. Données évolutives : élèves en train de composer. Aucun changement d'application, de fonction, de schéma, de réponse, de note ou de progression ; seules cette synthèse et la feuille de route sont ajoutées. Aucune publication appelée.

## Cause établie

- Identifiant exact VTC : `EB2` ; TAXI : `EB2-TAXI` ; passerelle TA : `eb2-ta`. Aucun identifiant `EB2-VTC` observé.
- Catalogue réel `exam_content_versions` : EB2 a une ancienne version retirée le 24/09/2026 à 09:42:08 UTC et un brouillon, mais aucune version publiée active. EB2-TAXI possède une version publiée active.
- `src/features/noyau-passage/pontV2.ts:132–140,194–206` : une reprise V2 ouverte est préservée ; pour un nouveau passage sans sujet publié, décision `ancien / sujet_non_publie`. Ne pas réactiver/publier une version pour réparer le menu : cela changerait le circuit de composition.
- `src/features/correction-qrc-v2/noyauReel.ts:202–215` : le menu lit les tentatives V2 non-test par pages de 1000. `217–240` : seuls les résultats historiques `eb3%` sont ajoutés. Les résultats et QRC historiques EB2 sont donc omis.
- `src/pages/AdminCorrectionQrcV2Reel.tsx:554–570` : options tirées des examens du groupe sélectionné, identifiant affiché tel quel. Aucun filtre QRC corrigée/en attente ni tentative terminée/en cours dans la requête de liste V2.
- Le JavaScript réellement servi `/assets/index-BbNPGt9M.js` contient aussi `.ilike("quiz_id","eb3%")`. Cause présente sur le site public, pas seulement dans l'aperçu.

## Novembre journée/soir : contrôle 13:31:01 UTC

Inscriptions réelles dans les sessions du 02 au 13/11/2026, résultats EB2 depuis le 01/11. Comptages de matières, pas de passages globaux à sept matières.

| Session | Élèves avec résultat EB2 | Résultats matière | Passages matière avec QRC | QRC historiques persistées | État technique QRC |
|---|---:|---:|---:|---:|---|
| Journée VTC/TAXI | 9 | 27 | 22 | 78 | 78 en_attente |
| Soirée VTC | 1 | 2 | 2 | 7 | 7 en_attente |
| Total | 10 | 29 | 24 | 85 | 85 en_attente |

85/85 textes QRC sont non vides. Zéro tentative V2 EB2 démarrée depuis novembre pour ces inscriptions. Le manque dans le menu ne signifie donc pas absence des réponses.

Répartition des QRC journée : T3P 50 sur 10 passages, Gestion 16 sur 8, Français 6 sur 2, réglementation VTC 4 sur 1, réglementation VTC 2 : 2 sur 1. Soir : T3P 5 sur 1, Gestion 2 sur 1. Sécurité/anglais n'ajoutent pas de QRC dans les lignes comptées.

Les lignes `reponses_apprenants` comprennent également des brouillons `in_progress` : contrôle 13:28, journée 8 lignes EB2 non terminées (dont une reprise `__t3`), soir 2. Ne pas les traiter comme des matières remises ni comme des QRC finalisées. Ces états évoluent en direct et une même personne peut avoir une matière terminée et une autre en cours.

Attention : `qrc_instances.etat=en_attente` décrit le circuit historique, pas un verdict de note globale. Certaines fiches portent aussi `details.correctionsIA` : leur présence seule ne prouve ni correction humaine ni publication définitive. Aucune équivalence automatique entre statut historique, correction IA et note finale n'est affirmée ; aucune renotation effectuée.

## Historique général et TAXI

- EB2 VTC V2 : 432 tentatives matière, 78 élèves, toutes terminées au premier contrôle, aucune neutralisée ; 1099 QRC sur 338 passages (1071 corrigées, 28 en attente). Les ensembles de passages corrigés/en attente peuvent se recouper : ne pas additionner leurs nombres de passages. Ces anciennes copies existent et restent visibles sous leurs groupes, pas nécessairement dans les sessions novembre.
- QRC historiques EB2 : 389 en attente au contrôle 13:31, toutes dates et tous élèves ; ce total augmente pendant la composition. Les 85 novembre journée/soir sont un sous-ensemble, pas une deuxième copie à additionner à V2.
- EB2-TAXI novembre chez les inscrits TAXI/TA : contrôle 13:28, 20 tentatives matière terminées, 6 en cours, 2 abandonnées ; 50 QRC V2 (39 corrigées, 11 en attente) sur 14 passages porteurs de QRC. Les mêmes inscriptions croisées apparaissent dans les deux sessions TAXI/TA et VTC/TAXI : ne pas additionner les deux groupes.
- La capture annoncée « 17 passages » n'est pas un total stable : sélection/date, instant du chargement et nouvelles compositions peuvent changer ce nombre. Capture exacte non disponible ici ; ne pas prétendre reproduire ce chiffre.

## Autres pistes vérifiées

- RLS SELECT des tentatives/QRC V2 : propriétaire ou admin, pas de condition particulière EB2. Aucune politique modifiée.
- Pagination V2 principale présente ; absence novembre expliquée par zéro ligne V2 et filtre historique EB3, pas par le plafond 1000.
- Lectures secondaires de types/inscriptions/sessions non entièrement paginées et erreurs parfois non remontées : risques distincts, pas la cause prouvée de cet incident.
- Liste des groupes chargée au montage/changement de mode (`AdminCorrectionQrcV2Reel.tsx:120–138`). Une relecture des QRC ne recharge pas le catalogue. Une actualisation serait utile, mais ne rend pas EB2 historique visible avec le filtre actuel.
- Ancien circuit déjà disponible dans le même écran (`ancienCircuit`, branche à partir de la ligne 730), archives accessibles par recherche candidat. Ne pas migrer les QRC historiques vers V2 pour afficher une option.

## Proposition minimale — NON appliquée

1. Ajouter les résultats historiques finalisés de l'identifiant exact `EB2` à la liste historique, avec lecture paginée ; conserver EB3 et toutes les options V2 existantes.
2. Créer l'option explicite `EB2 — VTC — ancien circuit`, branchée sur le correcteur historique existant, avec les identifiants de résultats originaux ; aucune nouvelle tentative, aucune nouvelle QRC.
3. Conserver les filtres sessions CRM, dates de passage et inscriptions croisées ; distinguer matières terminées, brouillons et QRC en attente, sans fusionner avec les anciennes copies V2.
4. Tester en fictif journées/soirées, changement de date, doublons de sources, chargement >1000, reload et erreurs de lecture. Vérifier les réponses et leur preuve dans l'écran autorisé avant publication.
5. Si une source historique est ambiguë ou le correcteur ne la lit pas fidèlement, afficher une revue explicite plutôt que reconstruire une copie/correction.

## Vérifications exécutées et limites

- 36/36 tests existants PASS, deux fichiers : `eb2-retrait-version-essai-routage.test.ts` (2), `correction-qrc-inscriptions-croisees.test.ts` (34), transport fictif sans données réelles.
- Lecture réelle du catalogue, tentatives, inscriptions, résultats, réponses, états QRC et politiques ; contenu des réponses non exporté dans ce rapport.
- HTML/JS public lus, filtre EB3 confirmé.
- Tentative navigateur avec session injectée et refus de toutes les requêtes non GET/HEAD/OPTIONS : redirection `/cours-public`, appel `has_role` bloqué. Écran administrateur NON PROUVÉ ; aucun clic de correction ni écriture autorisé.
- Aucun correctif appliqué, aucun test d'un nouveau correctif prétendu, aucune publication. Préparations EB3 et audit des verdicts inchangés.