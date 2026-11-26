# SIRET du centre — vérification du 26/11/2026

Identifiant confirmé par le dirigeant : **82346156100016**, SERVICES PRO / FTRANSPORT. Cette correction reprend sa déclaration, sans prétendre à une vérification indépendante du registre des entreprises.

## Correction des modèles futurs
- Remplacement exact des mentions `82346156100018`, de sa forme espacée et de `53516371400044` dans les informations du centre : devis canoniques VTC/TAXI, devis FC TAXI et leurs CGV, pré-information, analyse des besoins, projet professionnel, contrats de location, attestations, relevés, feuilles d’émargement, programme, accueil, contrôle et préremplissage BPF.
- Factures : les générateurs principaux utilisent déjà `82346156100016` (éventuellement espacé) ; vérification par génération d’un PDF fictif sans enregistrement ni téléchargement navigateur.
- Les SIREN `823461561` correctement étiquetés SIREN restent inchangés. Aucun SIRET client, financeur ou intervenant n’est remplacé.
- Ni prix, dates, NDA, agréments, clauses, réponses, signatures, progression ou tickets modifiés.

## Sources enregistrées et limites
- Consultation des organismes : aucune ligne du centre avec ces identifiants dans `organismes`.
- Consultation BPF : zéro dossier enregistré avec les deux anciens identifiants recherchés. Aucun BPF enregistré modifié.
- Quatre modèles `email_templates` de convocation conservent leur ancienne signature (TA, VTC soir, TAXI, VTC). Le rendu de convocation existant retire déjà ce paragraphe et imprime les coordonnées du centre corrigées ; tests sur ces quatre cas, sans réécrire le modèle ni un message historique.
- Le pied de mail de `send-notification-admin` est corrigé dans le code, **sans déploiement**. Le service actif peut donc conserver l’ancienne mention jusqu’à son déploiement autorisé.
- Neuf liens CPF de l’ancien catalogue contiennent `53516371400044` dans leur adresse. Ils ne sont pas des mentions SIRET imprimées ; ils restent inchangés : remplacer des identifiants d’offre par déduction pourrait casser les destinations, la vérification des offres relève d’un lot séparé.
- Aucun PDF/document original enregistré ou signé n’est réécrit. Un fichier ancien peut donc encore contenir une ancienne mention ; sa rectification doit créer une nouvelle version suivant le circuit existant, jamais écraser l’original.

## Vérifications
- Tests des SIRET réellement émis par les générateurs canoniques VTC/TAXI, FC TAXI et facture ; SIRET financeur distinct conservé ; contrat FC TAXI prérempli avec l’identifiant confirmé.
- PDF fictifs locaux : extraction du texte avec pypdf, SIRET centre exact dans les devis VTC/TAXI (quatre pages chacun) et la facture (une page).
- Aperçu : compilation automatique vérifiée ; aucune publication, aucun envoi et aucune écriture de données.
- Consultation connectée administrateur et contrôle de tous les anciens documents stockés : non prouvés. Les tests concernent les générateurs/modèles, pas une certification exhaustive des archives.