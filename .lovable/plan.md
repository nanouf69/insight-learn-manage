# Module 50 « FIN DE FORMATION VTC » : diagnostic (lecture seule) et options

## Constat prouvé (Thierno Diallo, 8313311b…)
- Fiche : `type_apprenant = vtc-e`, `formation_choisie = vtc-elearning-1099`, `modules_autorises = {26,2,3,4,35,5,8}` : **le module 50 n'est pas attribué**.
- Aucune ligne de validation pour les modules 50 à 53.
- Espace élève : `modulesAttribuesDashboard` (parcoursModulesDashboard.ts, l.113-124) ne garde que les modules attribués, donc il affiche 7/7, « tous terminés ». C'est le fonctionnement prévu, pas un bug d'affichage.
- Jalons : `modulesDuCalcul` (jalonsPedagogiques.ts, l.33-39) construit le parcours depuis le **parcours par défaut** `FORMATION_MODULES[...]`, qui contient 50 (parcours vtc-elearning : `[26,2,3,4,35,5,60,70,8,50]`). Le correctif « modules attribués » filtre seulement les modules **pondérés**. Le module 50 a un poids de 0 : il reste donc une ligne « obligatoire sans poids », comptée dans `jalonsObligatoiresManquants` (jalonsPonderes.ts, l.178-189).

## Cause exacte
Les deux écrans ne partent pas de la même liste. L'élève voit ses modules attribués. Les jalons ajoutent volontairement les formalités de fin (50 à 53) du parcours par défaut. Comme le module 50 n'a jamais été attribué à Thierno, il **ne peut pas y accéder**, alors que les jalons l'exigent.

## Impact
- Pourcentage pédagogique : 100 %, sans effet du module 50, qui pèse 0.
- Pourcentage global : 99,9 % au plus, tant que la formalité 50 reste manquante. Aucun 100 % ne sera forcé.

## Autres candidats (population à vérifier, pas des bugs confirmés)
- 35 dossiers e-learning, Ismail AMAR exclu, ont des modules attribués sans aucun des modules 50 à 53.
- Ils ont la même incohérence possible si leur parcours par défaut prévoit une fin de formation.
- Contrôle individuel non fait.

## Comment Thierno peut accéder au module 50 (rien n'est appliqué)
Option A, recommandée : ajouter manuellement 50 aux modules autorisés de Thierno depuis sa fiche (action admin volontaire). Il le verra et le fera lui-même. Aucune validation fictive.

Option B : modifier le code pour que l'espace élève affiche toujours la formalité de fin prévue par le parcours. Cela touche tous les élèves et demande un accord séparé.

Option C : changer les jalons pour ne plus exiger 50 à 53 quand ils ne sont pas attribués. Non recommandée, car les formalités Qualiopi/EDOF disparaîtraient.

## Garanties
Aucune écriture et aucune publication. Gels et Ismail non touchés. Après votre choix, seule l'option retenue sera mise en œuvre.
