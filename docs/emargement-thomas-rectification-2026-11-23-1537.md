# Thomas RAMBOANIAINA — rectification prioritaire du 23/11 à 15:37 UTC

## Périmètre réel confirmé par le demandeur

Formation continue VTC **uniquement les 17 et 18 novembre 2026**. Les 28–29 octobre ne sont pas des journées suivies par Thomas. Le rapport antérieur décrit des valeurs enregistrées, pas la réalité de sa participation ; toute lecture contraire est rectifiée ici.

Le demandeur annonce deux signatures manquantes, donc deux signatures existantes à retrouver. Cette répartition **n’est pas démontrée par les données consultées**. Ne pas transformer une absence de preuve retrouvée en affirmation que Thomas n’a pas signé.

## Relecture réelle, exclusivement SELECT

| Créneau réel | Image enregistrée à cette date sur les dossiers Thomas ou son compte | Preuve papier liée | Conclusion |
|---|---|---|---|
| 17/11/2026 matin, 09h–12h | Aucune ligne | Aucune | Signature non retrouvée |
| 17/11/2026 après-midi, 13h–17h | Aucune ligne | Aucune | Signature non retrouvée |
| 18/11/2026 matin, 09h–12h | Aucune ligne | Aucune | Signature non retrouvée |
| 18/11/2026 après-midi, 13h–17h | Aucune ligne | Aucune | Signature non retrouvée |

Recherche sans filtre de masque pour ne pas exclure une preuve cachée : les deux dossiers et toutes les lignes du compte `875b9d15-660b-4912-b92d-68d9962054f4`. Aucun autre dossier portant RAMBOANIAINA retrouvé.

- Dossier novembre `5b9d205a-11cc-4005-b264-26a4023d961a`, inscription `a48b3264-2836-4555-9135-aaec7fb26c2a`, session `254199ae-cc7e-4d66-9281-d1c9fc80d624` : 17–18 novembre, 09h–17h, hors attente, non exclue. **auth_user_id NULL**.
- Ancien dossier `14f4bb0c-fcd7-4719-8222-d8959fc96172` : dates enregistrées 28–29 octobre, compte existant ; **aucune inscription session** retrouvée. Ces dates ne sont pas la formation réelle confirmée.
- Aucun rattachement explicite dans `emargement_dossiers_lies` ; aucun élément dans `fc_signatures_papier`, `presentiel_presence_creneaux`, `apprenant_documents_completes`, `documents` ou `emargement_regularisations` pour ces dossiers.
- `documents_inscription` : un seul devis FC VTC daté du 07/10 sur l’ancien dossier, aucun document d’émargement.
- `audit_logs` (actions signature/émargement/session) et `audit_journal` : aucune trace correspondante. Une absence de journal ne prouve pas une suppression.

## Provenance des quatre signatures enregistrées sous octobre

Toutes portent l’ancien dossier et le même compte ; les images sont présentes, non masquées et non absentes. Elles ont été créées et signées le 17 novembre en quatre opérations successives. Elles ne portent ni regularisation_id ni lien vers la session novembre.

| ID | Date stockée / créneau | Signature UTC le 17/11 | MD5 image, identique à la précédente lecture |
|---|---|---|---|
| 8d6c677d-0825-4d12-b8c0-52ad894ec09f | 28/10 matin | 12:15:01.120852 | facbe8d8950aca11717c7e1515181331 |
| b305f432-5809-47ca-823e-6ecfd297e97a | 28/10 après-midi | 12:15:25.555624 | 0f8fc2575b2c1539cfb07ee80cd08639 |
| 9fa4cb07-16da-41c5-adb5-7532e671db8a | 29/10 matin | 12:15:48.502911 | 7f998fd6feb87418acb177ffb9e10ca3 |
| 20085c09-02c1-4b79-8987-15bd92673cae | 29/10 après-midi | 12:16:11.606592 | 1fe35861310dd05a37de4efea39bc82b |

Le client de signature transmet la date ciblée (`dateEmargement` → `effectiveDate` → `date_emargement`), distincte de l’heure réelle de saisie. La divergence prouvée reste un dossier connecté aux dates anciennes et un dossier inscrit novembre sans compte lié. Le parcours exact utilisé le 17/11 et l’intention associée à chaque image ne sont pas journalisés dans les traces retrouvées : **impossible de choisir deux images et de les attribuer à novembre**.

## Résultat et blocage

Aucun code d’affichage, droit, date CRM, rattachement, signature, document, compteur ou fonction serveur modifié. Aucun transfert, aucune suppression, aucun envoi, aucune publication. Les quatre empreintes originales ont été relues et sont inchangées.

L’alignement réel admin/apprenant sur novembre et l’affichage de deux créneaux signés restent **NON PROUVÉS et non livrés** : il manque les deux preuves individuelles et l’identité autorisée reliant le compte au dossier novembre. La seule présence administrative « present » de l’inscription ne remplace pas une signature.

Prochaine information nécessaire : capture ou feuille originale montrant précisément les deux créneaux novembre déjà signés, avec dates visibles ; ensuite vérifier l’origine et le rattachement avant toute correction proposée. Aucune fusion déduite du nom.

Pas de nouveau test navigateur : aucun changement fonctionnel et aucun accès Thomas/admin autorisé utilisé dans cette relecture. Les tests fictifs antérieurs ne démontrent pas l’existence des deux signatures annoncées.