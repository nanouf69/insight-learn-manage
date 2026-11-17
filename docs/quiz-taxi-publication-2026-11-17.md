# Quiz avant examen TAXI — décision de publication, 17/11/2026

## État réel
**NON PUBLIÉ pour les élèves.** Autorisation de publication reçue, mais conditionnée aux preuves ; aucun appel de publication, aucune migration ni écriture de réponse/note élève. L'accès reste admin uniquement, sous `/admin/apercu-quiz-avant-examen-taxi` dans l'aperçu Lovable.

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