# Quiz avant examen TAXI — décision de publication, 17/11/2026

## État réel
**NON PUBLIÉ pour les élèves.** Autorisation de publication reçue, mais conditionnée aux preuves ; aucun appel de publication, aucune migration ni écriture de réponse/note élève. L'aperçu admin reste sous `/admin/apercu-quiz-avant-examen-taxi`. Le nouveau parcours autonome `/quiz-avant-examen-taxi` est câblé en aperçu, mais refuse l'accès tant que les fonctions serveur ne sont pas installées.

La publication disponible porte sur le projet entier, pas sur une sélection de fichiers : elle emporterait les autres travaux non publiés. Le HTML public relu référence `assets/index-DFbUR3fS.js` ; cela ne prouve pas un commit public ni un lot isolé. Aucun changement de branche/historique effectué.

## Correction effectuée
L'ancien inventaire lisait uniquement le JSON de `module_editor_state` : **694** éligibles, 22 occurrences en conflit exclues, 320 doublons. Ce chiffre n'était pas celui des questions effectivement affichées depuis les corrigés canoniques.

Le lecteur utilise maintenant les sections liées de `quiz_questions`, les correspondances existantes et la projection nationale/locale partagée du lecteur de cours. Il pagine toutes les lectures (la banque dépasse 1 000 lignes), refuse une lecture incomplète, ne remet pas une question retirée depuis le JSON, actualise sur événements, retour de fenêtre et reconnexion. Les sections géographiques sans correspondance canonique restent leur source JSON sauvegardée, sans fabrication d'identité permanente en production.

Inventaire vérifié dans le navigateur après cette correction :

| Thème | QCM fiables retenus |
|---|---:|
| Nationale | 182 |
| Locale | 145 |
| Lieux de Lyon | 256 |
| Stations | 10 |
| Communes/ZUPC | 16 |
| Cas pratiques QCM existants | 62 |
| **Total** | **671** |

998 occurrences sources ; 327 doublons identiques représentés avec provenance, 0 conflit de corrigé restant ; 111 occurrences sans identité canonique. Les collisions de clés sont suffixées dans la projection, aucune donnée d'origine modifiée. **Module 13/13100 exclu.** Les **19 propositions multi-réponses par arrondissement restent exclusivement dans l'onglet admin « à valider »**, hors quiz et hors note.

Les deux occurrences signalées « férié figé » sont un même tarif D kilométrique 2026, et non deux questions de calendrier mobile. Pas de question nouvelle ni de corrigé inventé. Une occurrence après dédoublonnage reste dans les QCM existants.

## Jalons : frontière et vérifications
Le quiz n'est pas ajouté aux `MODULES_DATA`, `FORMATION_MODULES`, `FORMATION_DEFAULT_MODULES`, `ACTIVITES_CODE`, ni aux tables de complétude, réponses, résultats ou activités. Le score et la progression restent internes à l'aperçu. Aucun callback de validation globale ni de mise à jour d'heures.

SELECT connecteur : 368 fonctions publiques, 213 triggers non internes, 1 vue ; aucune référence `qaet` ou `quiz avant examen`. Ce contrôle lexical n'est **pas** la preuve d'une absence de tous effets indirects après une future intégration.

Lectures ciblées : `etat_completion_modules`, `save_module_completion`, `autovalidate_module_if_complete` ; inventaire des fonctions touchant activités/connexions/complétude et des triggers pertinents. `etat_completion_modules` dépend des lignes de complétude et réponses officielles ; le quiz d'aperçu n'écrit dans aucune. `geler_releves_fin_acces` n'a pas été exécuté.

Code consulté : `progressionModulesEleve`, `parcoursModulesDashboard`, `jalonsCalculCore`, `jalonsVolumes`, `jalonsPonderes`, `elearningHoursEvidence`, `useStudentEffectiveHours`, accès du portail et `useConnexionTracking`. L'aperçu ne change pas leurs entrées.

**Risque restant sur les heures :** un quiz intégré directement dans `CoursPublic` hériterait de la session de connexion « cours ». `elearningHoursEvidence` compte toute la durée d'une connexion comportant une activité pédagogique : ne pas écrire d'activité quiz n'empêche donc pas le temps supplémentaire d'être compté si la connexion avait commencé dans un vrai cours. L'exclusion effective nécessite une frontière de session validée, pas un simple badge « facultatif ». Aucun calcul historique corrigé/baisse appliquée.

## Tests réellement exécutés
- **PASS : 33 tests Vitest**, quatre fichiers : quiz principal 13, arrondissements 2, publication/isolation 8, jalons attribués 10.
- Projection canonique actuelle, section retirée sans repli, lecture 1 207 lignes, erreur intermédiaire refusée, exclusion 13/13100 et propositions.
- Écriture d'aperçu avec relecture et révision : ancien onglet refusé, comptes séparés, réponses terminées conservées ; changement de corrigé recalcule uniquement la note interne.
- Passage d'aperçu : les fonctions réelles de parcours, progression, pondération/heures donnent strictement le même résultat avant/après (15 modules TAXI, heures 0 dans la fixture).
- **PASS navigateur admin PC/mobile** : nouvelle tentative complète, coche, suivante, rechargement/reprise avec réponse conservée, corrigé, fin avec réponses désactivées, nouvelle tentative erreurs indépendante. Captures examinées.
- Requêtes POST observées : seulement `rpc/has_role`, fonction de lecture de droits ; aucune écriture dans une table de résultat/apprenant par le quiz.
- Compilation automatique : `build OK`.
- **NON PROUVÉ :** parcours avec identité élève TAXI et refus VTC réels, sauvegarde/reprise inter-appareils, exclusion d'heures dans une session déjà pédagogique, attestations/fin/pratique/sanctions bout en bout, publication ciblée et accès public élève.

## Blocages précis et chemin restant
1. **Persistance élève** : actuelle = stockage local admin, non déployable telle quelle aux élèves selon la règle du projet. Préparer une persistance autonome propriétaire/tentative avec événements append-only, refus de version périmée et preuve de lecture, sans les tables officielles de complétude. Vérifier les règles serveur TAXI et le même dossier actif ; une visibilité de bouton seule ne suffit pas.
2. **Heures** : page autonome sans les hooks pédagogiques, fermeture confirmée de la session cours avant entrée et contrôle des sessions parallèles pour éviter toute attribution du temps du quiz. Tester avec activité de cours réelle avant le quiz, puis comparer heures/taux/attestation avant-après ; aucune modification rétroactive.
3. **Livraison** : dériver un lot de la version réellement publiée, avec seuls fichiers du quiz et point d'entrée ; publication générale actuelle non équivalente. La fonction de publication ne propose pas un paquet de fichiers isolé.
4. **Installation serveur** : preuve de restauration indépendante non disponible dans les éléments consultés ; les exports applicatifs de l'ancien rapport ne sont pas une restauration vérifiée. Ne transférer aucune donnée vers une destination non autorisée. Avant migration réelle, destination séparée du centre + restauration et contrôles indépendants requis par les règles permanentes.
5. **Tests de sortie** : compte technique conforme aux exclusions mails/statistiques, puis vraie navigation TAXI/VTC ordinateur/mobile et lecture avant/après des jalons/heures/progression. Aucun compte élève réel utilisé ici.

Il ne manque pas une nouvelle autorisation de publication : **les garanties techniques exigées ne sont pas encore établies**. L'aperçu a été amélioré et testé, pas présenté comme un module élève opérationnel.

## Exécution complémentaire — 17/11 après demande de régler les blocages

### Code livré
- `docs/sql-revue/qaet-autonome.sql` : candidat complet tables autonomes, RLS propriétaire, RPC TAXI, commandes journalisées append-only, révisions CAS, idempotence, gel après remise volontaire, calcul /20 interne sur les sources serveur actuelles (aucun score client accepté). Aucune table officielle de notes, modules, heures, attestations ou sanctions modifiée.
- `src/lib/quizAvantExamenTaxi/serveur.ts` : transport authentifié avec contrôle même compte, journal de l'opération non confirmée, refus d'écrasement local, acquittement uniquement après relecture des choix ; reprise du même identifiant d'opération après délai réseau.
- `src/components/quiz-avant-examen-taxi/QuizEleveAutonome.tsx` et `src/pages/QuizAvantExamenTaxi.tsx` : véritable écran autonome, tentatives, choix multiples, thèmes, note serveur, reprise, corrigés, refaire les erreurs, fin confirmée ; aucun hook de connexion/activité pédagogique. Route ajoutée dans App.
- Les écritures du candidat sont refusées tant qu'une session de cours reste ouverte, sur tous les appareils. **Le bouton de fermeture confirmée de la session existante n'est pas encore raccordé**, pour ne pas clôturer à l'aveugle les connexions d'un autre appareil.

### Preuves exécutées
- **PASS 25 Vitest** : inventaire 13, isolation 8, écran autonome/journal/reprise/session 4. La reprise de l'écran autonome est testée avec un transport simulé, pas une session authentifiée réelle.
- **PASS 5 tests PostgreSQL jetable** (65 s dernière exécution), dont 671 appels réels de sauvegarde du candidat, finalisation, rejeu, conflit d'opération/révision, RLS autre TAXI, refus VTC/anon, interdiction des écritures directes, score 20 puis 19,97 après correction locale d'une source synthétique, réponses terminées inchangées, rejet 13/13100 et empreinte absente.
- Premier essai de performance arrêté à 600 s : recalcul de toute la banque à chaque réponse. Corrigé : acquittement ciblé, notation à la relecture/remise, 65 s pour la suite complète. Le temps réel sur les 671 sources de production n'est pas encore mesuré.
- **PASS arithmétique heures avec une session de cours prouvée dans la fixture : 60 min avant et après le quiz** ; test SQL prouve que les connexions closes et preuves officielles synthétiques ne sont pas réécrites. Ceci ne remplace pas une session cours réelle en navigateur.
- Navigateur ordinateur 1280×1800 et téléphone 390×844 : page autonome visible, accès sans session refusé. **NON PROUVÉ** : navigation authentifiée TAXI/VTC et inter-appareils sur Cloud.
- SELECT production : **aucune table ni fonction qaet**. Site public visité à `/quiz-avant-examen-taxi` : aucun titre Quiz avant examen TAXI ; ce constat confirme que la nouvelle page n'est pas publique.
- Compilation automatique OK, diff sans erreur.

### Installation et livraison : points restant réellement bloquants
1. Restauration indépendante réelle toujours non démontrée : aucun export ni donnée apprenant transféré ; avant installation, une destination séparée autorisée du centre et une restauration vérifiée sont requis par la règle permanente. Le candidat n'est donc pas dans l'historique des migrations actives. L'installation, une fois ce préalable établi, doit passer par l'outil de migration.
2. Équivalence exhaustive des 671 références réelles et unicité du manifeste serveur à renforcer : le candidat résout les sources, refuse 13 et contrôle le nombre, mais ne prouve pas encore que chaque client demande exactement l'inventaire officiel sans doublons sous clés différentes. Aucune activation tant que cette vérification n'est pas ajoutée.
3. Fermeture de session confirmée et protection d'une session cours concurrente : refus actuel fail-closed, mais aller-retour cours/quiz authentifié complet à terminer et éprouver avec les vrais hooks avant de promettre des heures inchangées.
4. Livraison séparée non disponible dans l'outil de publication, qui capture tout le projet. Une branche/historique publié vérifié + seulement ce lot est nécessaire ; aucun remplacement d'autres travaux effectué, aucune publication globale demandée.
5. Tests Cloud avec comptes techniques exclus des mails/statistiques, permissions TAXI/VTC, reprises PC/mobile et lectures officielles avant/après encore non exécutés : ne pas les présenter comme PASS.

**Bilan : code serveur et écran autonome effectivement construits et testés en local/jetable ; production inchangée, module non publié.**