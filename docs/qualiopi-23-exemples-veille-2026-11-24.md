# Qualiopi — indicateur 23, exemples concrets de veille (24 novembre 2026)

## Décision

Statut conservé : **À compléter**.

La réserve précédente « aucun lien démontré entre une source réglementaire et une modification » est levée pour **Gestion** et **Sécurité routière** par deux comparaisons avant/après et des sources officielles. Aucun registre formel ni export ChatGPT n’est exigé.

La réserve restante est distincte : **SERVICES PRO est une SASU et aucun justificatif de dépôt des comptes annuels, ou de fondement d’exemption, n’a été localisé dans les sources consultées**. Le BPF ne remplace pas les comptes annuels. Il ne s’agit pas d’affirmer qu’aucun dépôt n’a été fait ailleurs.

## Déclaration enregistrée

Déclaration du dirigeant reçue le 24/11/2026 à 17:29 UTC : exploitation de la veille Service-Public/ChatGPT pour actualiser les plafonds de micro-entreprise, les régimes d’imposition, les amendes et les modalités d’inscription au registre VTC dans les PowerPoint.

Elle est marquée **déclarative, reçue et non vérifiée indépendamment**. Elle ne sert pas à fabriquer une date ou une modification absente des fichiers.

Preuve : `b97bfda4-1b2c-4923-a908-1c70196e7084` (`q23-declaration-exemples-veille-20261124`).

## Traces vérifiées

### Gestion — seuils et régimes d’imposition

- `B_Gestion_partie_2.pptx`, version Git du 27/02/2026, 17 diapositives, SHA256 `768be37de03f4ac5fb13bb95a696a0a7a9d3041728915df5d756d18efc743eee` : pas de montants 2026 dans la synthèse des régimes.
- `GESTION_2SUR3_v8.pptx`, créé le 16/09/2026, 21 diapositives, SHA256 `c624dddd3d56204c959ebcdf49579c3ce4f87e8984dd6c03b05199cf317d2f32`, diapositive 11 : seuils 2026, arrêté du 27/01/2026, micro-entreprise 83 600 €, réel simplifié 83 600–286 000 €, franchise TVA 37 500 €/41 250 €.
- `GESTION_2SUR3_v12.pptx`, créé le 06/11/2026, SHA256 `3c06c9225a008d964e2ab583af014ea92c9a2937658a319447125a16d3bdb600`, diapositive 12 : mêmes données ; fichier référencé dans les modules 2 et 10.
- Source officielle recoupée : https://entreprendre.service-public.fr/vosdroits/F32353 (83 600 € pour les prestations de services en 2026, page vérifiée le 21/02/2026).

Preuve : `dc6903bc-17e6-498a-ac78-7c4826dab63a` (`q23-gestion-seuils-avant-apres-2026`). La première version retrouvée date la trace disponible, sans prétendre connaître le jour exact de rédaction.

### Sécurité routière — amendes

- `C_Securite_Routiere_partie_3.pptx`, version Git du 27/02/2026, SHA256 `34b618fe281f65c3acf54f3592255f00ebf38a12a8588cf5796d020fe89eb842`, diapositive 5 : 4 500 €/2 ans pour l’alcool délictuel ; cumul jusqu’à 9 000 €.
- `SECURITE_ROUTIERE_3SUR3_v2.pptx`, créé le 16/09/2026, SHA256 `11e011cb05b9bf98e6d5b5564e688968512f7e6be63dbf5e6abe34ccb0822b5c`, diapositive 4 : 9 000 €/3 ans depuis le 09/07/2025 ; cumul 15 000 €/5 ans depuis le 11/07/2025.
- `C_Securite_Routiere_FINAL_2.pptx`, créé le 15/09/2026, diapositive 25 : barèmes actualisés ; fichier référencé dans les modules 2 et 10.
- Source officielle recoupée : https://www.legifrance.gouv.fr/codes/id/LEGIARTI000051877291/2025-07-11 (article L234-1, loi n°2025-622 du 09/07/2025, 3 ans et 9 000 €).

Preuve : `82b2c756-05f4-4bec-92ad-a82b2a01b5ed` (`q23-securite-amendes-avant-apres-2026`). Le lien Service-Public/ChatGPT reste déclaratif ; la modification et la source officielle sont vérifiées.

### T3P — registre VTC

- `T3P_1SUR2_corrige_3.pptx`, créé le 19/11/2026 à 14:46:08 UTC, 49 diapositives, SHA256 `20de1c2ce40c6ad4db811b83789a841a941e501b03ae3ff14ebc61e8937797ae`, diapositive 24 : registre national VTC et inscription individuelle.
- `A_T3P_partie_1.pptx`, SHA256 `0e2b7b22ed3cbbffb7fc6dc9088f5fbfdfc1c09b2aa9218ca3f0f816c3a2a59a`, et la version v9 contiennent déjà ce passage. **Aucun avant/après probant sur les modalités détaillées** n’est revendiqué.
- Sources officielles : https://entreprendre.service-public.fr/vosdroits/F31027 et article L3122-3 du Code des transports.

Preuve : `9ffdfa5b-c77b-4d80-b3b3-cda61be849a5` (`q23-t3p-registre-vtc-historique-2026`).

## Contrôles réellement exécutés

- Quatre nouvelles références et quatre liens relus en base ; indicateur 23 : **16 liens, 16 preuves distinctes, aucun doublon**.
- `qualiopi_indicateurs_etat` relu : statut `a_completer`, date 24/11/2026, remarque ajoutée sans effacer les remarques antérieures ; script et vigilance actualisés.
- Modules 2 et 10 relus avant/après : empreintes inchangées `0e2a131d7cccd0dab4a601058b873627` et `537c2a7ec9498ac310088cfee0b6bc81`, dates de modification inchangées au 06/11/2026.
- Recherche de justificatifs de comptes annuels dans les noms d’objets de stockage et les courriels : aucun résultat ; cela ne prouve pas une absence de dépôt.
- Lecture du circuit Qualiopi `src/lib/qualiopi/data.ts` et `src/components/qualiopi/QualiopiPage.tsx` : les preuves/liens et le statut enregistrés alimentent les écrans et exports existants. Aucun code applicatif modifié et aucun parcours visuel revendiqué.

Aucun cours, donnée élève, signature, email ou document historique modifié ; aucun envoi, déploiement ou publication.
