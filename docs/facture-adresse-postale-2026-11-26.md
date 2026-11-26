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

## Suite autorisée — 26/11 16:53 : prochaines factures
L'utilisateur a choisi « Corriger les prochaines ». Les constats du tableau ci-dessus décrivent l'audit initial ; les corrections prospectives ci-dessous ne réécrivent aucune facture ni aucun PDF passé.

### Corrections préparées en aperçu
- Source commune `supabase/functions/_shared/adresseFacture.ts`, réexportée par `src/lib/comptabilite/adresseFacture.ts` : une adresse vient entièrement du destinataire choisi, jamais d'un mélange entreprise/stagiaire. Entreprise sans coordonnées : vide explicite, pas de domicile emprunté. Les factures additionnelles conservent leur choix existant de financeur particulier comme destinataire.
- `FactureForm.tsx` : source société entière, aucun repli vers le domicile ; nouveaux brouillons locaux conservent `client_nom`, `client_adresse`, `client_siret` distincts de la référence dossier. Aucune modification de facture déjà comptabilisée.
- `ComptabilitePage.tsx` et `draft-facture.ts` : nouveaux brouillons relus, aperçu HTML échappé et PDF utilisent ces coordonnées explicites ; validation locale conserve l'adresse dans la nouvelle ligne. Références des anciens brouillons non reconstruites.
- `SessionDetail.tsx` : création FC individuelle utilise l'adresse du financeur professionnel ou du stagiaire, sans assemblage croisé. PDF individuels/additionnels et téléchargements/envois groupés passent la ligne effectivement relue, y compris juste après création ; aucun envoi exécuté.
- `facture-fc.ts` : bloc destinataire enregistré optionnel, nom/adresse repliés sur plusieurs lignes ; absent = ancien rendu exactement conservé. Les coordonnées ne sont pas rafraîchies depuis un dossier modifié.
- `DocumentsFormation.tsx` et `RemboursementFCViewer.tsx` : lisent les champs de facturation enregistrés et les utilisent pour les factures futures. Le destinataire email et tous les anciens chemins restent inchangés.
- `FactureCommuneFC.tsx` : adresse du payeur visible avant création ; PDF demeure fondé sur l'adresse enregistrée.
- Bornage prospectif : `created_at` serveur à compter du 26/11/2026 16:53 UTC (accord utilisateur). Date absente/illisible/antérieure = ancien adaptateur conservé, sans interprétation du statut comme preuve d'une nouvelle facture. Les factures futures conservent leurs propres coordonnées même après paiement.

### Corrections serveur préparées, non activées
- `docs/sql-revue/2026-11-26-facture-adresse-prospective.sql` : remplace seulement le choix de l'adresse lors des prochaines créations collectives. Même signature, SECURITY INVOKER, mêmes ACL ; relecture idempotente avant les coordonnées ; aucun UPDATE de ligne, backfill, changement RLS ou donnée exemple. Financeur professionnel = ses seuls champs ; particulier = ceux du stagiaire. Attente d'autorisation explicite de migration.
- `facturation-electronique/index.ts` : ajoute au XML futur la ligne postale enregistrée, échappée, sans inventer postcode/ville/pays ; ancien XML sans nouvelle adresse. `deno check` réussi, aucun déploiement, aucune émission réelle. Ne constitue pas une certification du profil Factur-X complet.
- `get-comptable-factures` demeure une liste de synthèse (pas un bloc destinataire PDF), aucun élargissement de droits. Archivage `saveFactureToCRM`, transports, factures de fournisseurs et fonctions de tickets inchangés ; aucun archivage ni remise réelle exécuté.

### Vérifications exécutées
- 56 Vitest : adresses entreprise/stagiaire/financeur particulier explicitement destinataire, manque de coordonnées sans mélange, bornage ancien/nouveau, relecture de coordonnées figées, brouillons, XML, PDF FC VTC/TAXI, SIRET, destinataire mail, factures collectives, révisions et règles d'attestation.
- 21 scénarios PostgreSQL jetables : 14 règles existantes + 7 contrôles adresse prospective, ACL préservées, anciennes factures payées identiques et réessai idempotent ; aucun réseau ni écriture de production.
- Parcours réel du logiciel avec transports fictifs : sélection dossier/financeur → sauvegarde brouillon → relecture Comptabilité → aperçu → téléchargement PDF, PC 1158 px et mobile 390 px ; une seule insertion fictive par parcours, aucun mail. Première exécution du scénario de test refusée car aucune organisation sélectionnée en mode professionnel ; scénario rectifié en sélectionnant le dossier financé selon le circuit existant, puis réussi.
- Quatre PDF extraits avec pypdf : deux téléchargés dans le navigateur (entreprise/stagiaire) et deux PDF FC (VTC/TAXI), adresse exacte et pas de coordonnées actuelles empruntées.
- Captures PC/mobile inspectées et aperçu build OK. Accès administrateur réel, création officielle d'une facture et réception de mail : NON PROUVÉS ; aucun dossier réel de test créé.

## Alerte rouge — demande 17:01
Lecture réelle : facture 20260724002 payée, mail de facture non enregistré, mail financeur et stagiaire présents. La cause exacte de l'alerte sur la session de l'utilisateur n'est pas prouvée par les logs disponibles (pas de lecture ciblée capturée), mais le code attendait les deux lectures, même lorsque le financeur donnait déjà un destinataire confirmé ; timeout/erreur du dossier pouvait donc empêcher le préremplissage. Une erreur/absence tardive réaffichait aussi le rouge après saisie manuelle.

- `lireDestinataireFacture` lit d'abord le financeur et ne lit le dossier que si le destinataire reste à déterminer ; refus du financeur = refus, jamais un autre mail par défaut.
- Saisie manuelle protégée également pour erreurs/timeout tardifs ; alerte toast identifiée et retirée après succès ou saisie/fermeture. Vrai manque conservé ; bouton de relecture sans sauvegarde ni envoi.
- 59 Vitest PASS (dont trois scénarios supplémentaires de lecture prioritaire, repli nécessaire et refus non contourné).
- Cinq parcours fictifs : financeur PC/mobile avec dossier volontairement indisponible (zéro lecture dossier), saisie manuelle avant timeout, refus puis relecture réussie, financeur sans mail (alerte légitime maintenue). Aucun enregistrement/envoi réel, facture payée inchangée.
- Demandes de confirmation répétées arrêtées ; la réponse de mécontentement n'est pas interprétée comme une autorisation de migration ou de déploiement.