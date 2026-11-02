# Espacement Sécurité routière — 02/11/2026

## Cause exacte
`ExamQuestionImage` réservait un cadre `w-full aspect-[4/3]`, en chargement, en échec et via `ImageLightbox` après chargement. Le cadre occupait 75 % de la largeur complète de la question, tandis que la règle globale `[data-learner-question] img` imposait à l'image une largeur/hauteur automatiques et des marges verticales de 16 px. Les réponses arrivaient après le cadre, pas après le panneau. Modifier seulement la marge des réponses ou `max-h-*` n'aurait pas corrigé cette cause.

## Correction limitée
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : cadre optionnel uniquement pour exercices Sécurité routière 80/81/82 dans leurs modules de cours 4/9/15/21/27/29/81. Aucun cadre d'examen blanc, autre matière ou éditeur modifié.
- `src/components/cours-en-ligne/ExamQuestionImage.tsx` : transmet le cadre optionnel aux trois états, sans changer les URL, signatures d'URL ou erreurs.
- `src/components/cours-en-ligne/ImageLightbox.tsx` : accepte le cadre optionnel ; valeur par défaut identique pour tous les autres appels.
- `src/index.css` : règle uniquement sous `.road-safety-question-image` et `[data-learner-question]`, image entière en `object-fit: contain`, sans marge interne verticale ; largeur du cadre limitée à 384 px et réductible sur mobile.
- `src/components/cours-en-ligne/AGENTS.md` : règle locale de préservation du cadre borné.
- `roadmap.md` et ce journal : suivi documentaire uniquement.

## Vérifications réellement exécutées
Écran réel `ModuleDetailView`, module 15, quiz 80, transport isolé dans Playwright Chromium ; aucune session élève ni requête extérieure autorisée, aucune réponse saisie/soumise. Image originale locale Q9 `image9.png` (198×198), non modifiée.

| Écran | Cadre Q9 | Espace image → mention multichoix | Débordement horizontal |
|---|---|---|---|
| Ordinateur 1280×1800 | 384×288 px | 8 px | Aucun |
| Tablette portrait 768×1024 | 338×253,5 px | 8 px | Aucun |
| Tablette paysage 1024×768 | 384×288 px | 8 px | Aucun |
| Mobile 390×844 | 228×171 px | 8 px | Aucun |

Captures tablette/mobile inspectées : panneau complet, texte et choix lisibles ; aucune erreur JavaScript. Les 105 images rendues de Partie 1 sont chargées, contenues, sans marge interne ni cadre dépassant 288 px.

117 tests PASS : `image-carousel-source.test.tsx` (1), `formation-order-regression.test.ts` (91), `bilan-securite-recopie-en-masse.test.ts` (4), `answerHelpers.test.ts` (21). Aperçu : journal automatique `build OK` après correction.

## Limites et conservation
La capture originale utilisateur n'était pas disponible comme fichier ; la cause est établie dans les styles et reproduite avec le vrai écran local, pas dans sa session tablette. Connexion élève hébergée, tablette physique et toutes les autres matières en navigation réelle NON PROUVÉES ; valeurs par défaut du composant partagé inchangées et ordre des formations testé. Aucun test sur un vrai apprenant.

Aucune écriture Cloud, migration, question, réponse, image, note, logique de quiz, progression, jalon, signature ou droit modifié. Aucun envoi. Aucune publication : correction uniquement dans l'aperçu.
## Reprise 02/11 11:35 UTC — l'espace restait en production
**Cause du raté** : le commit 9cd4419a était bien publié (CSS `road-safety-question-image` présent sur gestion.ftransport.fr), mais le ciblage par modules (4/9/15/21/27/29/81) excluait le module 2 (VTC) et le module 10 (TAXI), qui contiennent les quiz 80/81/82 en base. Ces élèves gardaient le cadre 4:3 pleine largeur : mesuré 294 px de blanc sous Q9 (reproduit). De plus le cadre 4:3 laissait du blanc sous les panneaux larges.

**Correctif** : ciblage par quiz 80/81/82 + titre « Sécurité Routière — Partie 1/2/3 » dans tout module (`roadSafetyQuestionImage.ts`) ; cadre de hauteur fixe pendant le chargement (240 px, 200 px mobile), puis cadre aux proportions réelles de l'image (`ImageLightbox` option `fitFrameToImage`). Bilans 102, examens 502/602 et autres matières inchangés.

**Mesures (aperçu local, composants réels, CSS réelle)** : blanc entre bas des pixels visibles et « Plusieurs réponses possibles » = 9 px (8 px d'écart + 1 px de bordure) pour Q9 carrée, image très large 74 et image 75, sur 1280×1800, 768×1024, 1024×768, 390×844 ; aucun débordement horizontal ; témoin non ciblé = 294 px. Tests : 96 PASS.

**Limites** : panneaux très larges (texte) petits sur mobile (agrandissement au toucher inchangé) ; images plus larges que hautes se réduisent une fois au chargement ; session élève réelle hébergée non testée.
