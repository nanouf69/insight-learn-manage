# Bilans nouveaux passages isolés — 29 octobre 2026, 20:18 UTC

## Résultat réel
Préparation indépendante et prototype exécutés sur PostgreSQL jetable. **Aucune activation, migration Cloud, écriture pédagogique/élève ou publication.** Aucun fichier du circuit existant des examens blancs ou des écrans Bilans modifié. Les élèves actuels et futurs utilisent encore les circuits publiés précédemment : l'harmonisation n'est donc PAS livrée à l'écran.

## Fichiers ajoutés/modifiés
- `src/lib/bilanFutureVersion.ts` : construction détachée d'une banque candidate commune, provenance, suspensions explicites, sélection isolée par reçu et copie immuable. Ce fichier n'est importé par aucun écran réel.
- `src/test/fixtures/bilan-common-source-20261029.json` : extraction pédagogique des dix listes actuelles ; aucune donnée élève.
- `src/test/bilan-future-version-isolation.test.ts` : 18 tests sur données fictives/extraction de questions.
- `src/test/fixtures/bilan-future-isolated-prototype.sql` : structures/RPC test-only indépendantes, droits et refus de réécriture ; PAS une migration appliquée.
- `src/test/bilan_future_isolated_sql_contract.py` : ouverture, lecture, correction, permissions et réessais sur PostgreSQL local jetable.
- `AGENTS.md`, mémoire, feuille de route et ce rapport : contraintes de séparation et état réel.

## Banque candidate, non active
Même candidate pour TAXI et VTC ; questions triées par numéro source conservé, identité d'origine documentée. Les identités des neuf ajouts ne sont PAS rattachées à d'anciennes réponses. Les UUID permanents du nouveau circuit restent à attribuer côté serveur avant activation.

| Matière | Questions préparées | Décisions dans cette préparation seule |
|---|---:|---|
| T3P | 114 | Q11 complet ; Q104 B = Racolage ; Q59/112/113/114 traitées comme communes car concernent explicitement les deux métiers/T3P et leurs clés ont été approuvées. |
| Gestion | 200 | Q48 espace normalisé, Q53 C sans explication inventée, Q206 B ; Q198/199 notions d'entreprise/CMA communes. |
| Sécurité | 211 | Les 42 Q214–255 conservées ; Q16 image « ALLUMEZ VOS FEUX » justifie le choix JSON A ; Q73 texte complet/A. 44 autres candidates suspendues, pas supprimées des sources. |
| Français | 97 | Reprise des questions communes identiques. |
| Anglais | 194 | Vraie Q195 « A"tip" mean : »/A, pas le faux placeholder admin Q194. |

Les nombres ne sont pas les nouveaux compteurs des élèves : cette banque est inactive et partielle en Sécurité.

### Suspensions Sécurité
- Correspondance d'image non prouvée : Q55,60,61,68–72,74–85,87–91,93–107 ; Q79/Q80 appartiennent également aux conflits de clé/image.
- Q79 : le fichier TAXI `image77.png` montre une phrase sur une voie de bus, pas le tunnel de l'énoncé. Ne pas utiliser cette image ni choisir la clé sans inspection de l'image VTC.
- Q80 : R413-4 établit un maximum de 50 km/h ; avec « je peux rouler à », 40 et 50 sont compatibles avec ce plafond, mais l'image TAXI n'est pas prouvée et aucune reformulation n'a été autorisée/appliquée.
- Q92 : distance normale sur route hors agglomération proche de 150 m, mais 200 m sur autoroute et exceptions ; question trop générale pour certifier la clé sans nuance. Suspendue.
- Q177 : accord JSON A=0, ancien canonique C=2 ; extrait officiel opérant insuffisant pendant la recherche. Suspendue.
- Q212 : appliquer pression préconisée constructeur, pas règle universelle « augmenter ». Suspendue.
- Q213 : formulation trop générale sur les véhicules pénitentiaires/SAMU ; classification officielle précise non certifiée ici. Suspendue.

Références : [R413-4](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159600/), [IISR article25](https://equipementsdelaroute.cerema.fr/IMG/pdf/iisr_2epartie_vc_20220613_cle253d8c.pdf), [Sécurité routière pneus](https://www.securite-routiere.gouv.fr/sites/default/files/2019-01/sric_depliant_pneu_2005_05_02_cle0111c3.pdf).

## Tests effectivement exécutés
- **PASS 27/27 Vitest** : 18 nouveaux, 2 frontière sans snapshot, 2 projection/gel, 5 affichage figé.
- **PASS PostgreSQL jetable** : absence d'éligibilité → ancien circuit ; double ouverture concurrente idempotente ; même version TAXI/VTC et reçus distincts ; banque exacte admin/élève via vrais rôles SQL ; refus lecture autre compte/écriture directe/choix inconnu/question hors banque/soumission incomplète ; correction serveur 2/2 ; réessai identique ; nouvelle soumission différente refusée ; versions/reçus immuables ; copies fictives anciennes inchangées ; envoi tardif fictif reste dans l'espace ancien.
- Un premier test SQL a échoué sur la lecture de banque : référence `id` ambiguë dans une politique du prototype. Référence qualifiée, suite entière rejouée PASS. Aucun effet Cloud.
- Compilation automatique : dernier signal `build OK` à 20:17:40 UTC.
- **NON PROUVÉ** : parcours réel compte technique sous nouvelle interface, sauvegarde admin réelle vers nouvelle version, reprise appareil ancien, pont validation modules/jalons, publication. Aucun compte apprenant réel testé.

## Contrôle Cloud avant/après (lecture seule)
| Ensemble | Lignes | Empreinte avant = après |
|---|---:|---|
| module_editor_state 5/11 | 2 | f057c5b90a13e17d180b71f79fc4c7f7 |
| canonique TAXI600–604 | 809 | 240006baf7eb223ec549fd053ea36367 |
| snapshots5/11 | 216 | ebad90cec518117b29c6736b891d90dc |
| réponses5/11 cinq matières | 215 | 7c33f0eff9b239048b15c3fed0805c0d |

## Blocage précis d'activation
1. Les anciennes réponses différées/autosauvegardes et soumissions sont adressées par `module_X_exo_Y`, sans reçu de passage/version. Le retour d'ouverture perd déjà le snapshot_id côté client et relit la tentative la plus récente.
2. Absence de ligne courante ≠ absence de passage : archives de réponses, résultats, complétions, timers et anciens navigateurs peuvent encore porter une copie. Aucune date de bascule ne prouve l'absence de brouillon sur un autre appareil.
3. Les verrous d'ouverture existants ne sont pas partagés par tous les anciens écrivains. Réutiliser la même identité pour un nouveau reçu exposerait à des écritures tardives depuis un ancien écran.
4. Le prototype sépare stockage/réponses et exige une éligibilité explicite, mais cette autorisation, l'interface dédiée, le transport des brouillons versionnés, les identités permanentes et le pont de validation n'ont PAS été intégrés au circuit réel. Ne pas inventer de validation et ne pas changer les règles de complétion hors périmètre.

**Arrêt de l'activation conformément à la consigne utilisateur.** La préparation sûre est conservée ; aucun ancien texte, choix, correction, nombre de questions, note, statut ou snapshot n'a changé. Une version nouvelle réellement utilisable exige de terminer et vérifier le circuit reçu → réponses isolées → correction serveur → relecture → validation, sans réutiliser les anciennes files.
## Suite 29/10 20:45 UTC — transport reçu/version
- Prototype serveur : `bilan_future_drafts` (append-only), `bilan_future_save_draft(reçu, version, question, révision, réponse, jeton)` et `bilan_future_resume(reçu)`. Refus : autre compte, version différente du reçu, révision périmée (ancien onglet), question hors banque, écriture directe, brouillon après soumission. Réessai identique idempotent.
- Client `src/lib/bilanFutureTransport.ts` : file locale à clé `bilan-future:v1:compte:reçu:version`, refus des clés `module_X_exo_Y`, retrait seulement après accusé serveur, refus définitifs non rejoués.
- Tests : PostgreSQL jetable PASS (9 blocs), Vitest 22/22 PASS.
- Toujours NON appliqué en Cloud, non branché à l'écran, non publié : éligibilité réelle, écran élève dédié, pont vers validation module/jalons et test compte technique hébergé restent à faire.

## Audit images Sécurité routière 502/602 — 29/10 20:50 UTC (fichiers réellement chargés)
- Q1–54, 56–58, 62–65 : même fichier VTC/TAXI, cohérent visuellement avec l'énoncé. Signalés sans changement : Q62 (locomotive = passage SANS barrières, clé actuelle A « avec barrières ») ; Q63 (panneau temporaire chaussée glissante, pas spécifique verglas).
- Q55, Q60, Q61 : fichier VTC correct (dépassement interdit >3,5 t ; stationnement 1-15/16-31 ; route prioritaire) ; fichiers TAXI image55/59/60 faux (demi-tour interdit, carte texte, ski de fond).
- Q68–107 (hors 79/80/92) : images TAXI DÉCALÉES (souvent l'image de la question n−2, ou capture d'explication) ; VTC sans image. Ex. Q70 montre « Je peux dépasser par la droite » (=Q68), Q81 montre le tunnel (=Q79).
- Q79 : VTC = tunnel 50 (même fichier que TAXI image79 placé en Q81) ; TAXI image77 = carte « voie de bus » (faux). Q80 : VTC sans image, TAXI photo de route non probante.
- Q214–255 : aucune image dans les deux parcours.
- Candidate isolée : Q55/60/61 image VTC, 35 questions sans image, Q79/80/92/177/212/213 suspendues → Sécurité 249 questions. Inactive, non publiée. Les élèves TAXI actuels voient toujours les images décalées (non corrigé, anciens passages intouchés).
