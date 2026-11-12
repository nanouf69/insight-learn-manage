# Révision Sécurité routière VTC — correctif préparé, non activé

## Diagnostic anonymisé (SELECT et lecture du code uniquement)

| Question | Éditeur module 5/exercice 502 | Copie/version ancienne | Conclusion |
| --- | --- | --- | --- |
| Camion sur route étroite (Q71 dans l'ancien jeu) | UID `79ef7a10-1eac-498f-b5b5-ddb8d90d4328`, B Non | A Oui | Divergence prouvée. Le mode futur lit la correction figée ; le legacy à snapshot conserve aussi cette clé. |
| Alcool 0,29 mg/l (Q226) | UID `45e4fbf1-caf4-48ff-8e55-b16e2595a0e5`, D | D | Pas de divergence de clé dans les sources contrôlées. D seule est juste ; C+D est faux, sans point partiel. |

Ancienne version future `b3ab1768-df8c-41ad-ab85-89af51927141` : 249 questions, 26 reçus VTC dont 16 remis. Nouvelle version `cd3413ee-12d4-4beb-9117-5dddea70d63c` : 255 questions, camion numéroté 262 avec B, aucun reçu VTC contrôlé. Le numéro affiché n'est donc pas une identité portable.

Des dernières révisions enregistrées comportent D seule ; d'autres sélections comportent C+D. Aucun compte individuel ouvert : la sélection réellement affichée et le cache du plaignant restent **NON PROUVÉS**. Le helper de révision EB n'est pas utilisé ici et n'a pas été modifié.

## Diff fonctionnel contre 549bf94b

- `BilanFutureExam.tsx` : bouton d'entraînement dédié uniquement à VTC 5/502 remis.
- `ModuleDetailView.tsx` : même entraînement uniquement en présence d'un snapshot élève 5/502 ; admin exclu.
- `BilanSrTraining.tsx`, `bilanSrTraining.ts` : une lecture explicite de correction actuelle, puis sélections et liste des fausses entièrement en mémoire. Aucune sauvegarde, validation, écriture de score ou remplacement de snapshot.
- SQL candidat `docs/sql-revue/2026-11-12-bilan-vtc-sr-training.sql` : propriétaire authentifié + remise obligatoire, lecture de l'éditeur et de la réponse enregistrée. Snapshot : UID unique, énoncé exact et ordre/texte des options exacts. Futur ancien : deux correspondances explicitement auditées pour cette version seulement, jamais un rapprochement général par numéro. Autres questions comptées indisponibles, jamais présumées justes.
- Dernière révision legacy : même apprenant/tentative, créée et mise à jour après la remise. Une révision d'une autre tentative est ignorée ; choix local explicite, même vide, prioritaire dans l'entraînement courant.
- Tests et journaux uniquement ailleurs ; F/G après E, IDs 505/506, H et QRC inchangés. Aucun changement TAXI, droits existants, clés admin ou routage.

## Limites de mise en service

Le lecteur `bilan_vtc_sr_training_read` **n'est pas installé**. L'aperçu réel refuse donc l'entraînement si la lecture manque, sans repli vers une clé ancienne ni exposition globale des corrigés. Les copies et résultats historiques restent consultables.

Le futur ancien ne rapproche que les deux questions auditées ; les autres sont exclues avec compteur explicite. Le legacy sans snapshot conserve son ancien parcours : pas de correction générique sûre démontrée. Aucun circuit global de corrections activé.

Le SQL est un candidat testé sur schéma minimal jetable, pas une migration exécutée. Avant activation : revue sur catalogue réel, preuve complète des autres identités si entraînement exhaustif souhaité, installation séparée autorisée du lecteur, puis livraison ciblée autorisée. Pas de publication globale.

## Preuves exécutées

- Vitest : **14/14 PASS** (nouveaux cas, correction future existante et compléments VTC).
- PostgreSQL jetable : **10/10 PASS** : Q71 B, Q226 dernière D, propriétaire/anon, remise/TAXI, UID remappé, numéro réutilisé avec autre UID refusé, options inversées/doublon refusés, version future inconnue exclue, autre tentative exclue, empreintes des réponses/snapshots/soumissions inchangées avant/après lecture.
- Playwright : **4/4 PASS**, ancien snapshot/futur × PC/mobile. Deux faux initiaux, Non puis D seule, zéro faux résiduel, retour ; exactement une lecture de correction, aucun appel mutateur ; sorties réseau externes bloquées. Captures inspectées, pas de débordement horizontal.
- Régression F/G : **4/4 PASS**, PC/mobile × élève/admin, ordre E→F→G, ciblage 505/506 et retour, aucune mutation admin.
- Dernier signal de construction : **build OK**.

**Non vérifié :** session élève réelle, cache du plaignant, reprise multi-appareils de cet entraînement volontairement local, compatibilité d'installation du candidat sur catalogue complet, activation réelle. Aucun compte réel, écriture réelle, migration exécutée, publication ou envoi tiers.