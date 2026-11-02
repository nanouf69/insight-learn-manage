# Espaces image/question → réponses, tous écrans — 02/11/2026

## Cause
`ExamQuestionImage` enveloppait toute image de question dans un cadre par défaut `w-full aspect-[4/3]`
(hauteur = 75 % de la largeur), alors que l'image visible est plafonnée par la classe de l'appelant
(`max-h-24` … `max-h-[480px]`) ou par la règle élève `[data-learner-question] img`. Le reste du cadre restait blanc.
Les deux corrections précédentes ne visaient que les quiz Sécurité routière 80/81/82.

## Correctif
- `ExamQuestionImage.tsx` : sans `frameClassName`, cadre `question-image-frame` ; réserve pendant le chargement = plafond
  de hauteur de l'appelant (`questionImageReserveHeight`) ; erreur = message seul.
- `ImageLightbox.tsx` : option `fitContent` ; une fois l'image prête (`data-loaded`), le cadre épouse l'image ; sources déjà
  affichées mémorisées (réouverture sans saut). Agrandissement au clic inchangé.
- `index.css` : styles `.question-image-frame` ; image `ml-2` gardée entière (plus de rognage de 8 px à droite).
- Sécurité routière (cadre dédié) inchangée, sauf erreur d'image = message seul.
- Images de cours (`CourseImageLightbox`) non concernées.

## Matrice contrôlée (vrais composants + vrais styles, balisage copié des écrans)
Écrans : exercice/quiz/bilan élève (ModuleDetailView), Sécurité routière élève, passage examen blanc, bilan futur,
bilan FC VTC, résultats détail, résultats/correction liste, éditeur EB admin, vignette liste admin, plein écran admin,
aperçu édition admin.
Formats : carré 198, portrait 200×400, paysage 800×500, très large 1992×183, grand carré 1200, sans image, erreur 404,
chargement lent 1,5 s, réouverture depuis le cache. Largeurs 1280, 1024, 768, 390.

Blanc entre bas des pixels visibles et élément suivant — avant / après :
| Écran | Avant (min–max px) | Après |
|---|---|---|
| Exercice élève | 8–599 | 25 |
| Sécurité routière élève | 9–11 | 9–11 |
| Examen blanc | 24–515 | 41 (espacement normal de la carte) |
| Bilan futur | 8–544 | 8 |
| Bilan FC | 70–596 | 13 |
| Résultats détail | 98–608 | 17 |
| Résultats liste | 130–609 | 1 |
| Éditeur EB admin | 15–515 | 1 |
| Plein écran admin | 29–557 | 13 |
| Aperçu édition admin | 15–630 | 15 |
| Vignette liste admin | cadre 866 px de large | 80×80 |

0 rognage, 0 débordement, 0 erreur JS. Chargement lent : un seul ajustement de hauteur, aucune boucle.
Réouverture : aucun changement de taille.

## Limites
- Écrans réels complets (avec données et comptes) non rendus : balisage reproduit depuis le code.
- Aucune session élève ou admin réelle, aucune vraie tablette.
- Premier chargement lent : la place réservée s'ajuste une fois à l'image.
- Aperçu d'édition admin : petites images affichées à leur taille prévue (légèrement plus grandes qu'avant).
- Hors périmètre : `BilanFutureApercuAdmin` et `FormateurQuizViewer` n'avaient pas de cadre réservé, donc pas de blanc à corriger.
- 1 test préexistant en échec (`suivi-formation-indicateurs`, émargements), sans rapport.

Aucune donnée, question, réponse, image, note, progression, jalon ni signature modifiée.
