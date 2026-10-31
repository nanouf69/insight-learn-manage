# Supports pratiques complets — contrôle du 31/10/2026

## Sources réellement retrouvées
- `/tmp/user-uploads/Examen_pratique_VTC_Lyon_complet_4.pdf` : 19 pages, couverture « 72 questions et réponses à connaître pour l’oral ».
- `/tmp/user-uploads/Examen_pratique_TAXI_Lyon_complet.pdf` : 19 pages, même volume annoncé, contenu TAXI distinct.
- Les trois parties demandées sont présentes : questions générales, reconnaître les lieux, connaissance de Lyon.
- Versions de 20 pages / 76 questions-réponses : NON TROUVÉES. Aucune page ni réponse ne doit être inventée.

## Affichage existant
Chaque support dispose déjà de 19 pointeurs d’images, séparés dans `src/assets/pratique-vtc-lyon/` et `src/assets/pratique-taxi-lyon/`.
Les lecteurs sont insérés dans `ModuleDetailView.tsx` : module 8 VTC, module 6 TAXI, sans condition liée à une validation historique. Ils sont initialement fermés et portent le titre « Examen pratique [VTC/TAXI] — Connaissance de Lyon ».
L’absence des versions annoncées de 20 pages est établie ; l’absence éventuelle du bouton actuel chez un élève n’est pas reproduite ni expliquée avec certitude.

## Consultation et limites
Aucun PDF original n’est référencé par ces lecteurs ; aucun bouton télécharger/imprimer. Le cadre image est réservé en ratio 3/4. Les lecteurs actuels ne constituent pas à eux seuls une autorisation privée par page ni un blocage de l’impression navigateur. Une consultation strictement contrôlée devra être vérifiée avant toute nouvelle intégration ; ne pas transformer les PDF en ressources publiques.
Une requête anonyme vers la première image VTC publiée a retourné HTTP 403 depuis le sandbox : ce refus ne prouve ni un problème chez l’élève ni la sécurité complète des médias. La vérification supplémentaire du bundle publié a expiré et reste NON PROUVÉE.

## Contrôles exécutés
`bunx vitest run src/test/pratique-vtc-lyon-support.test.ts src/test/pratique-taxi-lyon-support.test.ts` : 6 tests PASS, séparation 6/8, 19 images distinctes par support, absence d’activité ajoutée.
`pdfinfo`, `pdftotext` et parsing documentaire des deux fichiers : volume et trois parties confirmés.
Parcours élève authentifié, intégralité des images hébergées, stabilité mobile/tablette réelle : NON PROUVÉS ce tour. Aucun test sur un compte réel.

## Changements et suite
Aucun code applicatif, support, contenu pédagogique, réponse, note, signature, module attribué, progression ou donnée Cloud modifié. Documentation et exigences enregistrées uniquement ; aucune publication.
Intégration demandée bloquée jusqu’à réception des deux versions exactes 20 pages / 76 questions-réponses, ou confirmation explicite que les versions retrouvées 19 pages / 72 questions sont celles à utiliser.