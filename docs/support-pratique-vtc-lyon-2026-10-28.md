# Support Pratique VTC Lyon — 28 octobre 2026

## Périmètre
Le PDF reçu comporte 19 pages. Affichage complémentaire limité au module 8 : bouton « Examen pratique VTC — Connaissance de Lyon », consultation page par page, zoom, retour et suivant. PDF original non téléversé ; seules les images fidèlement rendues sont hébergées. Aucun bouton de téléchargement ou d'impression. Les images visibles et captures d'écran ne peuvent pas être rendues impossibles à copier.

## Protection des acquis
Aucune écriture apprenant, aucune modification de module_editor_state, cours, pages, questions, réponses, activités, validation ou jalons. Support hors registre d'activités et sans callback de fin. Disponible aussi dans un module déjà terminé, sans nouvelle obligation (même choix de consultation facultative pour tous).

## Vérifications réellement exécutées
- 19 tests PASS : support module 8 uniquement, 19 images distinctes sans PDF, absence d'obligation, tests existants activités élève et jalons jeux Lyon.
- Compilation automatique : build OK.
- Aperçu apprenant avec session administrateur, aucune soumission : bouton ouvert et navigation réelle jusqu'à page 19, suivant désactivé, aucun lien dans le lecteur ; bureau 1280 et mobile 375, images inspectées sans chevauchement. Sources images exactes fournies par interception locale car le serveur localhost ne sert pas le CDN.
- NON PROUVÉ : chargement effectif depuis le CDN dans le navigateur de l'utilisateur (requêtes hébergées depuis le sandbox refusées HTTP403) ; compte élève réel. Les 19 pointeurs ont été créés par le service d'assets, pas fabriqués.

## Fichiers
- src/lib/pratiqueVtcLyonSupport.ts : sélection et références images.
- src/components/cours-en-ligne/PratiqueVtcLyonSupport.tsx : consultation seule.
- src/components/cours-en-ligne/ModuleDetailView.tsx : import + insertion limitée au module 8.
- src/assets/pratique-vtc-lyon/ : 19 pointeurs d'images.
- src/test/pratique-vtc-lyon-support.test.ts : tests ciblés.

## Publication
Aucune publication frontend ni déploiement de fonction ; aucun fichier PDF original accessible ajouté.