# Qualiopi 19 — environnement dédié, 19/11/2026 17:26 UTC

## Actions effectivement exécutées

- Création de l’espace « Qualiopi 19 — contrôle élève isolé », avec instructions complètes de STOP avant toute écriture si séparation ou absence de sorties mail non prouvées.
- Liste des surfaces relue : cet espace possède **sa propre base de test**, contrairement aux trois anciens espaces qui utilisent la base live. Aucune hypothèse d’isolation d’après le seul mot « brouillon ».
- Contrôle complet demandé uniquement dans cet espace, sans acceptation, publication, copie de données personnelles, usurpation ni création de compte en production.
- Retour intermédiaire du contrôleur : séparation confirmée, blocage réseau non prouvé ; création de compte suspendue. Ce retour n’est pas un résultat de parcours authentifié.
- 61 tests Vitest existants rejoués dans 10 fichiers : 61 réussis. Session/reprise (11), assistance fictive (2), heures fictives (3), remise fictive (6), preuves de complétion (5), progression (17), jalons (17).
- RLS activée et politiques lues sur apprenants, réponses, connexions, questions et complétions. Lecture de catalogue uniquement, pas refus entre deux JWT de test exécuté dans ce fil.
- Session officielle administrateur injectée restaurée via mécanisme prévu, sans modification de droits : interface Qualiopi effectivement accessible cette fois, ligne 19 « À compléter », 15 preuves avant puis 16 après ajout.
- Ajout append-only d’une référence `q19-controle-20261119-1726` et d’un lien 19 sans doublon ; références antérieures intactes, aucune mise à jour de statut. Relecture interface et capture du dialogue anonymisé exécutées.

## Preuves et limites

Les tests rejoués utilisent des transports fictifs. Ils ne prouvent ni une connexion élève officielle, ni une nouvelle remise Cloud, ni les heures d’une vraie séance. La référence ajoutée explicite cette limite. Les 116 tests/17 cas SQL de l’audit précédent ne sont pas présentés comme rejoués dans ce lot.

Capture temporaire du dialogue : `/tmp/browser/qualiopi19-official-check/indicateur19.png`, non prétendue pièce jointe durable. Script navigateur temporaire au même emplacement, aucune session ni secret dans les journaux. Le parcours de vérification admin a attendu le chargement complet : la première lecture trop précoce ne trouvait aucune ligne ; le second passage a effectivement affiché Qualiopi.

## Critères de démarrage de l’identité fictive

Dans la base séparée uniquement : vérifier/désactiver tous les chemins d’envoi (auth, fonctions, tâches planifiées et services connectés), sans action sur production. Si impossibilité de garantir zéro sortie, ne créer aucun compte. Utiliser ensuite la création officielle autorisée, puis deux identités fictives pour refus RLS croisés, cours/supports/quiz fictifs, remise/reconnexion/relecture, progression, temps et assistance. Aucun contournement d’approbation.

Le contrôle dédié est terminé (commit `80b9a9eec716089978939ef6b8f0624203c11093`) : base séparée et données vides vérifiées, 28 tests fictifs réussis, protections d’accès lues. Messagerie et fonctions locales arrêtées, mais un déclencheur conserve une destination externe : blocage exhaustif des sorties NON PROUVÉ. STOP avant création officielle : aucun compte créé. Connexion, sauvegarde/remise, heures, jalons, assistance et refus entre identités restent NON PROUVÉS sous identité officielle. Les 28 tests sont ceux du contrôleur dédié, pas du fil principal ; ils ne sont pas additionnés comme scénarios uniques aux 61 tests locaux. Rapport dédié `docs/qualiopi19-draft-isolation-2026-11-19.md`, conservé dans l’espace de test, non accepté dans le projet principal.

**Action requise :** fournir ou faire configurer dans cet espace de test un confinement réseau effectif des sorties, autorisant les seuls transports de test nécessaires et empêchant le déclencheur d’atteindre sa destination externe ; faire vérifier ce blocage avant de reprendre la création officielle fictive. Une connexion interactive seule ne résout pas le problème. Aucune modification de production ni réutilisation des anciens brouillons live n’est une solution sûre.

## Conformité

Indicateur 19 : **À compléter**, 16 preuves actives, relu interface. Aucune conclusion Conforme : parcours complet et exigences organisationnelles restent à démontrer (modalités FOAD accessibles, assistance technique et pédagogique, résolution des demandes ouvertes, intervenants et référent selon seuil applicable).

Aucun compte créé en production, aucun élève réel modifié, aucun mail envoyé, aucun gel de relevé, aucune publication. Les seules écritures du fil principal sont la référence documentaire et son lien autorisés.