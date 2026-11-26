# Adresse du destinataire — 26/11/2026

## Règle
L'adresse affichée doit être celle du destinataire de la facture, entreprise ou stagiaire. Une facture déjà payée ou envoyée garde ses coordonnées enregistrées : aucune substitution automatique depuis le dossier actuel.

## Cause et correction demandée
Facture 20260724002 : `client_adresse` est renseigné en base. Le formulaire Comptabilité « Modifier la facture » n'avait aucun champ postal. Ajout d'un champ en lecture seule dans `ComptabilitePage.tsx`, alimenté par la ligne facture déjà chargée, sans requête supplémentaire ni changement de sauvegarde. La capture comporte aussi un champ email en chargement : adresse postale et email sont deux champs distincts ; les emails financeur existent en lecture seule, aucun échec de lecture réel démontré ici.

## Inventaire des chemins lus
| Chemin | Constat après lecture |
|---|---|
| Comptabilité : chargement, édition | `select('*')` conserve l'adresse ; champ postal maintenant visible. Aucun changement de la facture payée. |
| PDF Comptabilité, révision, facture collective (`draft-facture.ts`) | `factureToDraftShape` reprend `client_adresse` enregistrée dans le bloc destinataire. |
| Création générale (`FactureForm.tsx`) : brouillon, comptabilisation, aperçu HTML | Adresse société/financeur ou stagiaire issue de `getClientInfo`, enregistrée dans `client_adresse` et imprimée. Risque existant : société sans adresse peut prendre celle du stagiaire. Non modifié. |
| Ancien brouillon local Comptabilité : aperçu HTML/PDF | Bloc destinataire construit uniquement depuis `refDossier` ; l'adresse n'est pas garantie dans ce champ. Non modifié. |
| Session FC : création principale | `ensureFactureBrouillon` préfère l'adresse du stagiaire même si le nom du destinataire est celui de l'entreprise. Écart prospectif identifié, non modifié. |
| Session FC : création additionnelle | Adresse financeur si présent, sinon stagiaire ; enregistrée. |
| PDF FC partagé (`facture-fc.ts`) | Financeur professionnel : adresse financeur ; sinon adresse stagiaire. Champs manquants non inventés. |
| Session FC : PDF principal/additionnel, téléchargement et envoi | Reconstruit depuis coordonnées actuelles du dossier/financeur plutôt que `client_adresse` figée ; risque de divergence après modification du dossier. Non modifié. |
| Facture collective : création (`creer_facture_commune_fc`) | Fonction live lue : construit une adresse financeur avec repli champ par champ vers stagiaire ; peut mélanger les coordonnées si le financeur est incomplet. Non modifié. |
| Facture collective : écran et PDF (`FactureCommuneFC.tsx`) | Choix du payeur montre nom/identifiant, pas adresse avant création ; PDF depuis adresse enregistrée. Non modifié. |
| CRM DocumentsFormation : envoi de facture | Passe `financeur:null` et adresse stagiaire au PDF, même si la facture vise une entreprise. Écart identifié, non modifié. |
| Élève RemboursementFCViewer : PDF | Passe financeur actuel si présent et adresse stagiaire au générateur FC ; pas d'adresse figée de facture. Risque de divergence après changement du dossier. Non modifié. |
| Versions (`facture_modifier_version`) | Définition live lue : ne permet pas de modifier `client_adresse` et conserve les snapshots complets. Aucun changement SQL. |
| Envoi des révisions (`facture-notifier-revision`) | Transporte/conserve le PDF fourni par le générateur fondé sur le snapshot `apres` ; réessai utilise le PDF retenu. Aucun envoi exécuté. |
| Archivage (`saveFactureToCRM`) | Stocke les octets fournis, ne calcule aucune adresse. Aucun appel exécuté ; circuit historique de remplacement non modifié. |
| Portail comptable (`get-comptable-factures`) | Liste synthétique sans `client_adresse`, pas un générateur de facture postal. Non modifié ; aucune permission élargie. |
| Facturation électronique (`facturation-electronique`) | XML lu : adresse vendeur présente, adresse acheteur absente. Écart identifié, aucun déploiement ni émission. |

Tâches automatiques : recherche dans les fonctions auto/cron sans générateur d'adresse de facture identifié ; absence exhaustive NON PROUVÉE. Les transports et fonctions ci-dessus ont été lus, pas exécutés en production. Cette demande étant une question sur le formulaire, les autres écarts restent en attente du choix de l'utilisateur, sans refonte silencieuse.

## Vérifications
- PASS : 14 tests Vitest (destinataire email et révisions), réellement exécutés.
- PASS : PC 1158 px et mobile 390 px, facture fictive, adresse postale visible en lecture seule ; email financeur/stagiaire chargé, aucune écriture externe autorisée ; captures inspectées.
- PASS : aperçu build OK, diff sans erreur.
- NON PROUVÉ : ouverture du formulaire de cette facture réelle avec la session disponible (attente de ligne expirée).
- Aucun enregistrement, mail, publication, changement de rôle, réglage ou archive.