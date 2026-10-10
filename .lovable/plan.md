# Audit en lecture seule : diapositives, pages et questions (modules 2, 10, 40, 41, 6, 8)

Cette fiche sert seulement à obtenir votre accord pour lancer l'audit. Aucun fichier du projet, aucune donnée et aucun réglage ne seront modifiés. Rien ne sera déployé et aucun document ne sera produit. Le résultat sera donné directement dans le chat.

## Ce qui sera vérifié
1. **Sources réellement affichées** pour chaque module : cours définis dans le code (vtc, taxi, ta, va, pratique taxi et pratique vtc), puis les versions actuelles enregistrées en base (lecture seule de `module_editor_state`). Ces versions enregistrées sont prioritaires : fichiers, cours désactivés, suppressions et diaporamas intégrés.
2. **Comptage sur les fichiers eux-mêmes**, jamais à partir de leur nom :
   - PowerPoint : nombre de diapositives réellement présentes dans le fichier, en excluant les diapositives masquées (le nombre de masquées sera indiqué à part).
   - PDF : nombre de pages lu dans le fichier.
   - Diaporamas intégrés au site : nombre de diapositives réellement produites, limite incluse.
   - Fichiers téléchargés en lecture seule, uniquement dans un dossier temporaire.
3. **Pas de double comptage** : quand un même cours existe en PDF et en PowerPoint, on garde le support affiché en premier (diaporama intégré, sinon PowerPoint, sinon PDF). Les autres apparaissent comme « équivalents, non comptés ». Les ressources supplémentaires (liens, fiches, sources légales) sont listées à part.
4. **Questions actives** : questions affichées à l'élève, après retrait des exercices inactifs et des questions supprimées, à partir de la source canonique. Une même matière partagée entre deux modules n'est comptée qu'une fois par formation.
5. **Pratique** : les supports en ligne des modules 6 et 8 sont comptés séparément. La conduite en présentiel est exclue.

## Ce que vous recevrez
Pour chaque formation (VTC, TAXI, TA, VA, Pratique TAXI, Pratique VTC) :
- un tableau par fichier ou titre : support, type, diapositives ou pages, statut (compté / équivalent / supplémentaire / inaccessible) ;
- le total des diapositives du cours, les pages de pratique et les questions actives ;
- la durée selon deux hypothèses : 5 min par diapositive + 1 min par question, et 10 min par diapositive + 1 min par question ;
- si un fichier ne peut pas être lu : la mention « non inspectable », sans chiffre inventé, et le nombre de diapositives qu'il faudrait pour atteindre 60 h ou 66 h avec les questions vérifiées.

La répartition 90 % cours / 10 % pratique sera seulement indiquée comme hypothèse. Elle ne sera pas appliquée.

## Détails techniques
- Diapositives PowerPoint : décompte de `ppt/slides/slideN.xml` d'après `presentation.xml` (sldIdLst), avec repérage de `show="0"` pour les diapositives masquées.
- Pages PDF : avec `pypdf`.
- Diaporamas intégrés : sortie de `createSlidesFromParsedMarkdown`, en tenant compte de `maxSlides`.
- Base de données : uniquement des requêtes `SELECT`.
