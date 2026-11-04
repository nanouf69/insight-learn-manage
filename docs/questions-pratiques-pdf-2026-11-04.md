# Questions examen pratique — 04/11/2026

Accord : ajout dans les cours Déroulement correspondants, consultation seule, sans publication.

## Sources
- VTC `Examen_pratique_VTC_Lyon_complet_6.pdf` : 20 pages, 76 questions-réponses ; SHA256 e5a151ffc9a07b0845986f53980be42dbb06a292e722934b13287c5026560673.
- TAXI `Examen_pratique_TAXI_Lyon_complet_1.pdf` : 20 pages, 76 questions-réponses ; SHA256 0373bcd2e0bfe14a26d8e96b46618af8ea3baaaf0e22fcd361120849f21787a6.
- Conversion intégrale JPEG, 1600 px, aucune réécriture du texte ; couverture et dernière page contrôlées visuellement.

## Préparation
- 40 nouveaux objets, bucket privé existant cours-fichiers, préfixes cours-images/pratique-{taxi,vtc}-20261104 ; présence des 40 objets relue.
- Pas de PDF original téléversé ni URL publique utilisée. Pages téléchargées sous session puis présentées comme blobs temporaires révoqués à la fermeture ; impression masquée. Les politiques existantes autorisent les utilisateurs authentifiés à lire les images de cours (pas une restriction supplémentaire par formation).
- Ajout séparé à l’affichage du cours id 2 des modules 6/TAXI et 8/VTC, même si le titre VTC commence par 3 côté serveur. Aucune insertion dans cours/pages/ACTIVITES_CODE, aucune obligation ni callback de validation.
- Supports historiques inchangés. Aucune écriture dans module_editor_state, réponses, notes, progression ou signatures ; aucune migration, fonction déployée ou publication.

## Vérifications exécutées
- Vitest : 20/20 PASS (nouveau routage, deux supports historiques, PDF mobile).
- Build aperçu : OK.
- Playwright : lecteur isolé réellement authentifié, images réelles TAXI puis VTC pages 1 et 2, 1280×1800 et 390×844 ; aucun débordement, media print display none. Captures relues.
- Parcours complet d’un élève dans le module : NON PROUVÉ. L’aperçu Baptiste propose module 12, pas le module 6 de la capture antérieure. Aucun accès modifié pour forcer ce parcours ; aucune session élève nominative utilisée.

## Fichiers
- src/lib/pratiqueQuestionsSupport.ts
- src/components/cours-en-ligne/PratiqueQuestionsSupport.tsx
- src/components/cours-en-ligne/ModuleDetailView.tsx (import et insertion affichage)
- src/test/pratique-questions-support.test.ts
- src/components/cours-en-ligne/AGENTS.md
- roadmap.md