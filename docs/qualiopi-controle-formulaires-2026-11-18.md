# Qualiopi 9/10/11 — mails, formulaires et Contrôle — 18/11/2026

## Résultat enregistré et relu

837 nouvelles preuves de référence : 314 formulaires et 523 remises de quiz. 1 032 liens ajoutés (314 pour 10, 718 pour 11). Aucune pièce jointe fictive, aucune modification de source, aucun envoi/publication/conformité automatique.

| Indicateur | Avant | Ajouts liens | Après |
|---|---:|---:|---:|
| 9 | 802 | 0 | 802 |
| 10 | 34 | 314 | 348 |
| 11 | 16 | 718 | 734 |

Relecture : zéro doublon de source, zéro doublon de lien, zéro référence orpheline, zéro fichier ajouté. Page admin connectée `/?section=qualiopi` : 1 986 preuves totales, compteurs identiques. Deux tests de lecture exhaustive exécutés et réussis. Dernier signal de compilation : build OK.

## Emplacements explicitement inspectés

### Mails / convocations — indicateur 9

Les convocations sont dans `emails`, pas dans les cours : `subject`, `body_html/body_preview`, `apprenant_id/recipients`, `sent_at`. Relecture des 802 liens : 552 événements mails, 247 formulaires, 3 références de supports. Les 553 inscriptions du précédent audit conservent 150 convocations préalables non ambiguës, 5 postérieures, 6 le jour du début, 215 acceptations RI au dossier et 126 dossiers signés au dossier. Les catégories se recoupent. Aucun doublon ajouté pour ces mêmes sources.

Le rapprochement du contenu avec les dates de formation et identités est conservé dans `docs/qualiopi-9-individuel-2026-11-18.sql`. Un envoi ne prouve ni réception ni remise effective de toutes les pièces. Les 186 inscriptions sans référence 9 identifiée et 398 sans convocation sûrement liée restent des exceptions, pas des absences absolues d'information.

### Formulaires dans Contrôle — indicateurs 10 et 11

`ControleQualiteTab.tsx:269–359` inventorie `apprenant_documents_completes` et les validations de modules. Son compteur vérifie parfois seulement l'existence d'une ligne : il n'est pas utilisé comme preuve de remise ou d'acquisition.

Les tests de compétences sont stockés dans `donnees.sections`, `sectionItems`, `answers`, et non dans `competences/reponses`. Les items réels portent sur T3P, sécurité, gestion, français, anglais et réglementation propre à la filière. Les formulations « Je connais / Je sais » sont un auto-positionnement initial, pas un examen final noté.

- 197 tests `completed` de dossiers actifs non techniques ; 195 ont les items archivés et toutes les réponses non vides. Deux tests sans structure exploitable restent non vérifiables dans cette méthode, sans modification.
- 195 tests référencés pour 10 et 11 ; 148 sans date de signature exploitable gardent `date_preuve` vide. Les 47 dates retenues sont des signatures, explicitement pas des dates d'évaluation.
- 119 analyses de besoin/projets professionnels `completed` avec image de signature et date vérifiées, référencés pour 10. Aucun texte personnel ni besoin sensible copié.
- Les 6 évaluations des acquis déjà référencées restent conservées : 4 VTC, 1 TA, 1 VA. Pas de nouvelle attribution de session, date pédagogique, évaluateur ou résultat.
- `qualiopi_adaptations` : zéro ligne, zéro mise en œuvre confirmée. Le diagnostic et suivi disponibles ne suffisent donc pas à certifier une adaptation réalisée et efficace.

### Contrôle / résultats / quiz — indicateur 11

Sources réelles : export de Contrôle `ControleQualiteTab.tsx:614–654`, résultats CRM `ResultatsApprenantTab`, `apprenant_quiz_results`, et preuve de remise `reponses_apprenants.status/submitted_at/completed/reponses`. Objectifs : `src/lib/objectifsJalons.ts` et titres des exercices enregistrés dans `module_editor_state`.

Catalogue : 7 740 résultats (7 492 lignes de matières d'EB, 248 révisions), pour 216 apprenants ; ce nombre n'est pas un nombre d'examens complets. Aucun regroupement ou nouveau verdict n'a été créé.

Remises quiz : 3 966 dans le catalogue, 3 894 après exclusion des dossiers supprimés/techniques. Réponses présentes, statut `submitted`, `completed=true`, date de remise passée et résultat brut existant vérifiés. 2 731 retrouvent l'identité exercice/module dans la banque serveur actuelle ; 1 163 ne sont pas rapprochables à cette banque par cette méthode. Cela ne signifie pas qu'elles sont fausses : plusieurs modules sont définis dans le code ou ont des identités historiques différentes.

523 dernières remises par apprenant/module référencées, pour 152 apprenants. Les autres remises restent intactes. La preuve contient l'identité, date, tentative, titre/module et empreinte actuelle, pas les réponses ou notes personnelles. Le titre actuel situe l'objectif ; il ne reconstitue pas le corrigé ni la version historique et ne certifie pas l'acquisition.

| Compatibilité temporelle des 2 731 remises rapprochées | Nombre |
|---|---:|
| Aucune inscription couvrant la date | 1 031 |
| Une inscription compatible | 1 538 |
| Deux inscriptions compatibles | 162 |

Pour les 523 références retenues : 189 sans inscription compatible, 303 avec une et 31 avec deux. **Même une seule inscription compatible n'est pas une attribution pédagogique prouvée** : toutes restent candidates dans la référence, sans choix automatique. Les dossiers e-learning peuvent légitimement ne pas avoir de session présentielle.

Module 13 « CONTRÔLE DE CONNAISSANCES TAXI » : 34 remises de dossiers actifs inspectées, 31 identités retrouvées dans la banque actuelle et 3 historiques non rapprochées. Il n'a pas été assimilé à « Cours et exercices ».

## Intégrité et limites

Empreintes globales avant/après identiques : mails, formulaires, résultats quiz, réponses et inscriptions. Aucun état 9/10/11 n'existe en base : leur état affiché par défaut reste inchangé. L'audit ne leur attribue aucune conformité.

Liaison formulaire/session de `ContexteFormulaire` actuellement en aperçu local uniquement : non utilisée comme événement enregistré. Le taux de documents et `quizCompletes=quizTotal=quizzes.length` de l'export ne sont pas interprétés comme atteinte des objectifs. Notes absentes, provisoires, QRC et sources officielles nécessitent le lecteur habituel ; cet audit n'a recalculé aucune note.

Exceptions identifiables conservées dans l'espace privé du projet, pas de noms dans ce rapport ou le résumé. Priorités : retrouver la structure des deux tests, l'identité historique des 1 163 remises, le lien pédagogique à l'inscription et les preuves d'adaptation effective, sans fabriquer de traces rétroactives.

6/7 : zéro original supplémentaire joint ; 8 : 93 dépôts signés déjà documentés, aucune date de décision inventée ; aucun changement dans ce lot.