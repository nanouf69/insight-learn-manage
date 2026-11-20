# Qualiopi — revue probatoire prioritaire

FTRANSPORT SERVICES PRO — demande du 20/11/2026 à 10:10 UTC ; contrôles et décisions exécutés le même jour.

## Résultat

**19 reste À compléter : l’ajout assistance est terminé et présent dans le code du commit public observé, mais aucune communication de cet encadré à un bénéficiaire n’est retrouvée.** Les issues des incidents et l’exhaustivité des intervenants restent insuffisamment étayées. Aucun compte test n’est un préalable documentaire.

Deux synthèses nouvelles, sept rattachements sans doublon, cinq décisions À compléter enregistrées pour des indicateurs qui avaient des références mais aucun état. Remarques antérieures 19/21 conservées et conclusions ajoutées sous contrôle de version. Aucun indicateur passé Conforme sur la seule demande ou le nombre de preuves.

## État avant / après et actions concrètes

Comptages de références actives, pas de personnes ni de pièces indépendantes ; les synthèses d’audit ne constituent pas des preuves supplémentaires d’exécution.

| Indicateur | État avant → après | Références avant → après | Preuves disponibles / limites | Action probatoire restante |
|---|---|---:|---|---|
| 9 | Aucun état → À compléter | 802 → 803 | 552 mails, 247 formulaires, accueil et introductions référencés ; 150 convocations préalables non ambiguës dans l’audit antérieur. Dix convocations ambiguës et information/version préalable insuffisamment prouvées sur les cas restants. | Retrouver version et trace datée de communication avant prestation, rattachement exact dossier/formation sur les cas non couverts. Ne pas confondre envoi et réception. |
| 10 | Aucun état → À compléter | 757 → 758 | 409 remises liées au suivi, 314 formulaires, 26 mails, deux échanges pédagogiques et autres suivis. Zéro adaptation enregistrée ; absence dans l’outil ≠ absence d’action hors outil. | Documenter difficulté réelle → décision datée → adaptation appliquée → suivi d’efficacité pour les situations rencontrées. |
| 11 | Aucun état → À compléter | 734 → 735 | 523 remises serveur, 201 formulaires, six modules, une remise future et autres évaluations. Sources retrouvées ; maîtrise, finalité et correction historique ne se déduisent pas de l’existence des lignes. | Rapprocher objectifs/critères, correction autorisée et évaluation intermédiaire/finale pour les copies retenues ; conserver les historiques incertains sans reconstruction. |
| 12 | Aucun état → À compléter | 170 → 171 | 155 mails, un appel à risque de rupture, six inscriptions à rappeler/injoignables, quatre références au même justificatif et deux dossiers signés. J1/J2/J3 déclaré, pas chaîne exécutée prouvée. | Pièce accessible de la procédure ; absence datée, contact réel, résultat et suite ; volet prévention/signalement/traitement violences, harcèlement et discriminations du RNQ novembre. Aucun nouveau format unique obligatoire. |
| 13 | Non applicable → inchangé | 2 → 2 | Déclaration dirigeante du 19/11 sans alternance, et audit réglementaire. | Réexaminer uniquement si le périmètre change. |
| 14 | Non applicable → inchangé | 2 → 2 | Aucun apprentissage selon déclaration ; catégorie réglementaire apprentissage. | Même surveillance du périmètre ; accompagnement général reste sous 10/12. |
| 15 | Non applicable → inchangé | 2 → 2 | Aucun apprentissage selon déclaration ; catégorie réglementaire apprentissage. | Même surveillance ; le libellé écran ancien « coordination » n’est pas le texte officiel du 15. Aucun libellé modifié ici. |
| 16 | Aucun état → À compléter | 495 → 496 | 492 mails CMA/T3P, deux audits et capacité d’affichage de date individuelle. 101 rapprochements exacts, 104 ambigus, 287 sans session dans le corpus antérieur. | Retrouver convocations CMA définitives date/heure et validation individuelle de recevabilité/inscription ; rattacher les cas ambigus sans choisir arbitrairement. FC à simple attestation n’est pas assimilée à certification. |
| 19 | À compléter → inchangé | 17 → 18 | Ressources, usages pédagogiques, suivi et assistance réelle déjà documentés. Encadré ajouté, neuf tests rejoués, zéro email envoyé avec encadré/titre retrouvé. Trois messages 23/09 et 30/10 encore ouverts sans réponse enregistrée. 104 sessions dont 83 sans affectation de formateur. | Modalités d’aide effectivement communiquées pour les parcours à distance ; traitement/issue réelle des incidents ; liste exhaustive datée des intervenants par formation et référent si condition applicable. Aucun délai chiffré ni compte test imposé. |
| 20 | Non applicable → inchangé | 1 → 1 | Déclaration sans apprentissage et catégorie réglementaire exclusive. | Réexaminer en cas d’apprentissage ; obligations handicap générales restent applicables ailleurs. |
| 21 | À compléter → inchangé | 14 → 15 | Dix pièces Agrément antérieurement lues, agenda, signature réelle du 08/05, description utilisateur et synthèse. Catalogue de 43 pièces inchangé, aucune pièce nouvelle depuis l’audit antérieur. Grille originale non retrouvée. | Définition préalable des compétences requises et vérification documentée adaptée à chacun/matière/modalité ; qualifications et missions SERVICES PRO des externes, notamment troisième intervenant ; original accessible de la grille pour identité/méthode. Pas de test noté ni fréquence universelle imposés. |

## Assistance : vérification de l’état réel

- Page publique `gestion.ftransport.fr` téléchargée : commit `c9c78b880eb1258a56591bf31e16efa7830af67d`. Le fichier `src/lib/convocationFormation.ts` de ce commit contient `data-assistance-formation="2026-11-20"` et les deux canaux d’aide confirmés. Observation du commit public et de son code, pas nouvelle publication ni preuve de clic connecté de production.
- `construireConvocationHtml` limite cet ajout aux convocations initiales ; FC/examen exclus conformément au circuit existant. Modèles TAXI, TA, VTC, VTC soir concernés ; VA utilise la sélection VTC existante.
- Requête `emails` : zéro ligne `sent` avec cet attribut ou le titre « Assistance pédagogique et technique ». Cela n’exclut pas un envoi hors corpus ou un autre libellé ; aucun envoi fictif rattaché.
- Sept tests de génération + deux tests de lecture exhaustive exécutés : **9 PASS**, sans transport, mutation de dossier ni nouvelle connexion élève.

## Référentiel et proportionnalité

Copie PDF Légifrance du décret 2026-728 retéléchargée et relue, pages 5–8, hash SHA256 `f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783` identique aux audits précédents. Source officielle citée : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509 ; copie effectivement lue : https://www.psppaca.fr/IMG/pdf/decret_no_2026-728_du_1er_aout_2026_relatif_au_referentiel_national_sur_la_qualite_des_actions_concourant_au_developpement_des_competences_-_legifrance.pdf . Ce téléchargement secondaire n’est pas présenté comme une nouvelle lecture directe du site officiel ou du guide V10 intégral.

19 : ressources/appropriation, effectivité du suivi distant, référent conditionnel selon intervenants par formation. Les réserves sur l’assistance éclairent l’appropriation et le traitement des difficultés, sans imposer la résolution de toute demande comme condition universelle distincte du texte. Le nombre de formateurs du catalogue n’établit pas le nombre exhaustif par formation. 21 : déterminer, mobiliser, évaluer des compétences adaptées ; aucun diplôme pédagogique, test noté, observation indépendante ou fréquence imposés arbitrairement.

Les intitulés anciens de la plateforme pour 12–15/19/20 ne remplacent pas le texte réglementaire actuel. Aucun changement de plateforme réalisé dans cette revue.

## Contrôles exécutés et limites

- 2 996 rattachements préexistants / 2 171 fiches distinctes prioritaires lus intégralement par requête ordonnée `p.id, l.indicateur`, erreur de lecture bloquante.
- 1 024 emails originaux distincts rattachés relus, tous `sent`, corps présent ; période 12/02–18/11/2026. Corpus des preuves prioritaires, pas totalité des mails d’accès ni totalité de l’organisme. Le corps enregistré ne prouve pas remise provider/lecture.
- Existence vérifiée de 567 formulaires, 523 remises, dix pièces Agrément, sept états de modules et événements individuels référencés ; aucun original individuel manquant. Une synthèse agenda a `source_table=agenda_blocs` sans `source_id` : référence de catalogue, non lien individuel cassé. Catalogue actuel relu : 336 blocs, 183 affectés (141/8/34), signature du 08/05 à 11:03:27 UTC relue. Planification/présence ne prouvent pas maîtrise.
- Dix originaux Agrément déjà inspectés le 19/11 utilisés avec provenance et réserves existantes ; **pas prétendument retéléchargés ou relus visuellement ce jour**. Original `critere 21.pdf` absent du catalogue actuel ; seule description utilisateur conservée.
- Avant/après : cinq empreintes complètes inchangées (`agrement_pieces_fichiers`, `formateurs`, `agenda_blocs`, `apprenant_questions`, `module_editor_state`). Les compteurs vivants peuvent évoluer normalement ; aucune garantie de gel intégral de la base revendiquée.
- Deux nouvelles fiches et sept liens relus : 19 = 18, 21 = 15 ; 9/10/11/12/16 = 803/758/735/171/496. Zéro doublon de lien ; zéro orphelin avant écriture, nouvelles fiches et liens confirmés après.
- États 9/10/11/12/16 créés seulement si absents ; mises à jour 19/21 conditionnées à la version antérieure, remarques ajoutées sans remplacement. Seuls déclencheurs constatés sur ces tables documentaires : mise à jour de date ; aucun circuit email.
- Relecture finale **base prouvée**, interface connectée actuelle non vérifiée dans cette revue. Le code existant associe `a_completer` à « À compléter », `non_applicable` à « Non applicable » et les états absents à « Sans preuve ». Lecture du code ≠ observation de l’écran actuel.
- Aucun mail, compte test, dossier, signature, résultat, source pédagogique ou historique modifié ; aucune publication, migration, fonction d’envoi ou `geler_releves_fin_acces()` exécutée.

## Autres indicateurs : inventaire actuel, pas nouvel audit complet

| Indicateurs | Statut enregistré | Références actives | Suite |
|---|---|---|---|
| 1 / 2 / 4 / 5 | Documenté | 13 / 7 / 14 / 12 | Audits antérieurs conservés ; pas requalifiés Conforme. |
| 3 | À compléter | 12 | Taux d’obtention à publier avec source et période vérifiables ; aucune diffusion effectuée. |
| 6 / 7 / 8 | À compléter | 4 / 1 / 239 | Originaux des emplois du temps/procédure ; couverture exacte dont thème stress/médicaments ; positionnement et rattachements historiques à étayer sans décisions inventées. Limites des audits antérieurs, pas nouvelle inspection complète. |
| 17 | Conforme | 22 | Décision SERVICES PRO précédente conservée ; pas réétendue à OPTO. |
| 18, 22–32 | Aucun état enregistré | 0 chacun | Aucun dossier probatoire enregistré ; non-applicabilité éventuelle (29 notamment) à évaluer séparément, pas conformité ni absence juridique de preuve déduites. Revue exhaustive non réalisée ce jour. |

Les actions restantes ci-dessus attendent des preuves réelles de communication, d’intervention, de procédure ou d’évaluation. Le travail documentaire faisable avec le corpus actuel est terminé pour les priorités ; aucune tâche d’envoi/publication ni réécriture historique lancée.