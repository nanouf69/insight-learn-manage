# Preuves Qualiopi — contrôle du 24/11/2026

## Règle durable
Règle du dirigeant 16:44 UTC enregistrée et relue dans la mémoire durable existante du dossier Qualiopi, avec rappel dans son index. Elle couvre tous les indicateurs : toute preuve pertinente réellement disponible doit être référencée/rattachée indépendamment du statut, avec reçu/non vérifié, vérifié, validé et conformité distincts, provenance/date/version/historique conservés et anti-doublon non destructif.

## Enregistrement réellement confirmé en base
- I12 : 175 références, À compléter ; règlement v2 `f1c4cfc9-528c-4960-b885-a77219a01e9f` déjà rattaché, décision prospective 16:41 consignée sans effacer la remarque précédente. Aucune information des inscrits présumée.
- I21 : 17 références avant, 18 après ajout de `09c13fd2-add4-44a6-b10f-bb6136612e8a`, référence à l’invitation Albert `8b944d42-aa7d-4f19-83d9-bc4ef10c0b07`. Source, date, modèle et empreinte conservés ; jeton individuel non copié dans la preuve.
- Invitation Albert : brouillon, réponses vides, sent_at NULL et signed_at NULL à la relecture. Référence vérifiée, aucune déclaration reçue ni validation responsable prouvée. Aucun justificatif ou email inexistant ajouté. Autorisation distincte d’envoi maintenue, aucun envoi exécuté dans ce tour.
- I12/I21 restent À compléter. Aucun doublon de paire preuve/indicateur constaté. Insertion avec ref_key unique et rattachement anti-doublon ; aucune suppression ou mise à jour de source.
- 133 acceptations historiques retrouvées ; empreinte de contrôle de cette lecture `d257b9863dd32dd119cbbbbb55b01126` (algorithme id + données, distinct des anciens rapports). Aucune écriture de données/signatures élèves effectuée.

## Circuits vérifiés et limites explicites
- `IndicateurDialog.tsx`, `PreuveFormDialog.tsx`, `data.ts` : aucun verrou de conformité avant ajout/rattachement ; statut choisi séparément.
- La preuve générique possède source/date/validité/prédécesseur mais pas de cycle structuré reçu/vérifié/validé. Les réserves et états de la nouvelle référence sont donc explicités dans ses champs documentaires, sans inventer de nouveau statut technique.
- `createPreuve` manuel/CRM ne fournit pas de ref_key et ne déduplique pas les sources ; la paire preuve/indicateur est seule idempotente. Aucun doublon existant supprimé.
- `competences-intervenant` : remise et avis responsable sont séparés et versionnés ; ni remise ni avis ne rattachent automatiquement à I21. Les propositions CRM I21 couvrent les formateurs mais pas ces déclarations/avis ; les propositions email n’incluent pas I21.
- Le règlement versionné est déjà référencé à I12 ; cette référence ne prouve pas sa mise en œuvre ni une diffusion auprès des inscrits actuels.
- La règle durable est appliquée à l’enregistrement effectué ; elle ne signifie pas qu’une automatisation exhaustive de tous les circuits est installée. Aucun code, migration, envoi ou publication modifiés dans ce tour ; contrôle d’interface avec écriture et réception réelle non effectué.