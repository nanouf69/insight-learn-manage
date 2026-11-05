# Bilan Français 63 QCM — état réel, 05/11/2026

## Appliqué
- Migration additive 0241 : pointeur de nouvelle version append-only, garde 63 QCM/neuf supports, ouverture des seuls nouveaux reçus Français 503/603 avec ancienne version préservée pour les reçus existants ; supports sans clés dans la projection élève.
- Version indépendante enregistrée : `ca3fc116-a0b7-4c07-a2e6-996226b2151d`, empreinte `95d445427a4216bf347ecd1b0a66de4b` ; 63 QCM et neuf textes, sept par texte.
- Q14 A+C, Q15 QCM A+C avec énoncé ambigu inchangé ; Q87 A+C, C exactement « Pour se mouvoir elle utilisera l'électricité », B intact. Q33 : fragment « ladies cab» : » remis dans l'énoncé d'après le DOCX, sans changer le sens ; vraie bonne réponse identique.
- Les 27 QRC et Q91–98 sont absentes seulement de la version candidate. Q80 non ajoutée ; Q40 QRC exclue, divergence sans effet.
- Affichage des neuf supports dans l'aperçu.

## Non activé / non publié
- Zéro entrée dans `bilan_future_french_releases` ; zéro reçu utilisant la version candidate. Les nouveaux passages continuent donc d'utiliser le circuit/version existants.
- Aucun appel de publication ; pas de mail, SMS, IA, compte créé ni tentative réelle de test.
- Le contenu actuel de `module_editor_state` n'est pas remplacé : seul le nouveau circuit versionné est préparé.

## Protection vérifiée en lecture seule
- Ancienne banque : 97 questions, empreinte toujours `3f12115d70f91bd8185660904c6f7fb0`.
- 8 reçus : `c8e2b7ed967da229f7913f7db18ce3cc` ; 4 soumissions : `932f7421214a076017918822ab1edb94` ; 45 éligibilités : `9e081857ee1636d5023c60cab9717cde` (identiques avant/après).
- Les 1377 brouillons enregistrés avant 19:47:29 UTC restent identiques (`51590d2333bd97ec2f938b6e660399d0`). Les nouvelles sauvegardes réelles intervenues pendant le travail ne sont pas confondues avec une modification des preuves initiales.
- Aucun identifiant historique renuméroté, aucune ancienne banque/copie supprimée.

## Tests réellement exécutés
- Vitest ciblé : **36/36 PASS** sur banque/source, écran, transport et isolation.
- PostgreSQL jetable Français : **3/3 PASS**, reçus existants préservés, nouveaux VTC/TAXI, supports sans clés, multichoix 62/63 et 63/63, permissions et idempotence.
- PostgreSQL jetable circuit existant : **14/14 PASS**, dont cinq matières et validation/progression intactes.
- Playwright : simulations utilisant le composant réel et la banque candidate, PC VTC 1280×1800 / mobile TAXI 390×844 : neuf supports, 63 QCM, reprise après retour aux matières, remise/readback 63/63, pas de débordement ni erreur JavaScript. **Ces simulations ne prouvent pas un parcours élève authentifié contre la base en ligne.** La session disponible est administrateur et redirige vers le tableau de bord.
- Non-régression complète : **3393 PASS, 5 FAIL, 13 SKIPPED**. Quatre échecs `gel-par-module-raccordement.test.ts` (mock sans `auth.getSession`), un échec `suivi-formation-indicateurs.test.ts` (attendu priorité agenda : 1/100%, calcul 2/50%). Tests/domaines hors périmètre laissés inchangés ; pas de revendication de non-régression globale réussie.
- Derniers journaux locaux : build OK ; cela ne prouve aucune publication.

## Bloquants
Activation et publication suspendues conformément à l'instruction de ne pas publier si les tests échouent ; les cinq échecs généraux et le parcours élève réel doivent être vérifiés avant la bascule.