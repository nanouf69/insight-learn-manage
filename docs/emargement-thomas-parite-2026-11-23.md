# Émargements Thomas RAMBOANIAINA — diagnostic et correction ciblée

23 novembre 2026. Aperçu uniquement, aucun envoi, aucune publication, aucune écriture Cloud.

## Cause exacte prouvée

Les deux captures correspondent à **deux identifiants de dossier distincts**, pas à un changement de date provoqué par le cache :

| Dossier | Formation et dates enregistrées | Compte / session | Preuves |
|---|---|---|---|
| `14f4bb0c-fcd7-4719-8222-d8959fc96172` | formation-continue-vtc / PA VTC, 28–29 octobre 2026 | Compte apprenant existant ; aucune inscription session trouvée | Quatre signatures, dates de cours 28–29/10, horodatées le 17/11 |
| `5b9d205a-11cc-4005-b264-26a4023d961a` | continue-vtc, 17–18 novembre 2026 | Sans auth_user_id ; inscription session FC VTC 17–18/11, non exclue et hors liste d’attente | Aucune ligne emargements_fc |

Aucun rattachement dans `emargement_dossiers_lies` pour ces deux IDs. La lecture apprenant est protégée par son identité/les rattachements explicites ; la lecture administrateur est protégée par son rôle. L’horodatage du 17 novembre **ne déplace pas une signature du 28 octobre vers le 17 novembre**.

Source des images, dates et statuts : `emargements_fc`, filtre `masque=false`, ID apprenant exact. Source des créneaux attendus : `emargement_fenetres_eleve`, qui vérifie les droits et les inscriptions. Les signatures d’octobre ne prouvent donc pas la présence de novembre. Le motif métier de la création des deux dossiers n’est pas établi ; aucune fusion ou identité inter-dossier déduite du seul nom.

## Défauts d’affichage corrigés en aperçu

- L’administration utilisait `EmargementsSignesViewer`, tandis que les documents FC avaient une seconde présentation dans `RemboursementFCViewer` : désormais même écran, même lecteur et même export par ID de dossier.
- Le PDF de l’écran partagé omettait l’option FC, affichant potentiellement 13–16 h au lieu de 13–17 h : option FC transmise aux exports journée et feuille complète.
- Les commandes « re-signer » étaient affichées même pour des preuves existantes ; retirées. L’administrateur consulte/télécharge, ne signe pas à la place du stagiaire. L’apprenant propriétaire ne peut signer que les créneaux attendus non renseignés ; remplacement désactivé.
- Les erreurs de lecture pouvaient être ignorées et conserver un état incomplet ; elles affichent maintenant « vérification impossible », sans déclarer un manque ni permettre un export non confirmé.
- Lecture paginée, ordre stable par ID, changement de dossier protégé contre les réponses asynchrones périmées ; pas de cache local de signatures. Une ligne vide plus récente ne masque pas une preuve existante. Les autres versions restent visibles et dans l’export, sans mutation des originaux.
- Bouton Actualiser ; relecture au retour de l’onglet/réseau et après notification de signature ; aucune interrogation périodique ajoutée.
- Dates et identifiant du dossier visibles pour éviter de confondre deux inscriptions ; horodatages affichés en heure de Paris.

## Tests réellement exécutés

**PASS — 31 tests automatisés** :

- `emargement-parite-dossiers.test.ts` : 5 tests — quatre preuves octobre, quatre manques novembre, pas d’emprunt par horodatage, relecture retirant un seul manque, ligne vide n’effaçant pas la preuve, absence distincte de signature.
- `emargement-agenda-eleve.test.ts` : 6 tests.
- `emargement-fenetres.test.ts` : 4 tests.
- `emargement-tardif.test.ts` : 12 tests.
- `pratique-horaires-stricts.test.ts` : 4 tests.

**PASS — 8 parcours navigateur fictifs** : octobre/novembre × admin/apprenant × ordinateur/téléphone. Sur le même dossier : même périmètre et mêmes statuts, commandes adaptées aux droits, aucune commande de re-signature, actualisation et rechargement conservant les résultats, confirmation fictive d’une preuve réduisant exactement le bon manque. Pas de débordement horizontal détecté, aucune erreur de page.

**PASS — PDF** : huit exports navigateur imprimés ; deux dates, 14 h sur deux journées, quatre images fictives pour octobre, quatre cellules non signées pour novembre. Les PDF imprimés admin/apprenant ont exactement le même texte par période (comparaison pypdf), une page chacun. Boutons interactifs adaptés au rôle mais absents à l’impression.

**PASS — erreur et second écran FC** : refus fictif = alerte, aucun faux « 4 signatures manquantes » ; documents FC affichent la même vue et les quatre horodatages tardifs.

**PASS — conservation réelle avant/après** : mêmes quatre IDs, dates, horodatages, masque=false et empreintes des images :

| ID preuve | Date / créneau | signed_at UTC | MD5 image |
|---|---|---|---|
| 8d6c677d-0825-4d12-b8c0-52ad894ec09f | 28/10 matin | 17/11 12:15:01.120852 | facbe8d8950aca11717c7e1515181331 |
| b305f432-5809-47ca-823e-6ecfd297e97a | 28/10 après-midi | 17/11 12:15:25.555624 | 0f8fc2575b2c1539cfb07ee80cd08639 |
| 9fa4cb07-16da-41c5-adb5-7532e671db8a | 29/10 matin | 17/11 12:15:48.502911 | 7f998fd6feb87418acb177ffb9e10ca3 |
| 20085c09-02c1-4b79-8987-15bd92673cae | 29/10 après-midi | 17/11 12:16:11.606592 | 1fe35861310dd05a37de4efea39bc82b |

**PASS — aperçu compilé** : dernier journal consulté « build OK ».

**NON PROUVÉ — parcours réel Thomas/admin et PDF de ses images réelles** : la session disponible se connecte mais `has_role(...,admin)=false`, redirige vers `/cours-public` et reçoit « Accès aux feuilles refusé » sur les deux IDs ; aucun droit modifié. Les comptes fictifs du navigateur ne prouvent pas l’accès réel ni les notifications en production. Aucune signature réelle créée pendant les tests.

## Périmètre restant bloqué

L’affichage est unifié **pour le même ID de dossier**. Montrer automatiquement novembre dans le compte d’octobre, ou faire compter les signatures d’octobre pour novembre, n’est pas livré : aucune liaison autorisée ni preuve de présence de novembre n’existe. Il faut une décision explicite sur le rattachement, après vérification d’identité et de la période réellement suivie ; aucun déplacement, duplication de signature ni suppression n’a été effectué.

## Fichiers modifiés

- `src/components/cours-en-ligne/EmargementsSignesViewer.tsx` : lecture, états, droits, actualisation et options PDF.
- `src/components/cours-en-ligne/RemboursementFCViewer.tsx` : section émargements remplacée par la vue commune ; programme, factures, attestations inchangés.
- `src/components/crm/apprenant-sections/DocumentsFormation.tsx` et `DocumentsDossier.tsx` : consultation explicitement en lecture seule, libellé adapté.
- `src/lib/emargementLecture.ts` : lecteur exact paginé et projection non destructive.
- `src/test/emargement-parite-dossiers.test.ts`, `src/test/emargement-parite-browser/{harness.html,harness.tsx,comparaison.py}` : tests fictifs sans accès Cloud.
- `AGENTS.md`, `roadmap.md`, ce rapport : règle technique et limites.

Aucune migration, politique, fonction serveur, donnée élève, feuille historique, signature, attestation, facture ou autre module modifié. **Aucune publication.**