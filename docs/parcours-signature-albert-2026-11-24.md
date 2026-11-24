# Parcours des trois documents Albert AKONO — 24/11/2026

## Contenu confirmé et activation

1. **Bilan et justification des compétences** : invitation d'origine `8b944d42-aa7d-4f19-83d9-bc4ef10c0b07`, toujours brouillon, réponses vides, aucune date de remise. La signature manuscrite sera une preuve nouvelle et ne validera pas automatiquement les compétences ou I21.
2. **Contrat-cadre de prestation de formation — anglais** : document `0fe55aff-a06b-4e8d-97e0-51b965b98356`, version figée `services-pro-contrat-cadre-intervenant-2026-11-24-v1`, empreinte `33b2b6347781e40cf922310694e89c029b649f48a16bcb9e6972086feff6817f`. Identités, 50 € TTC/h, missions libres sans minimum/exclusivité, durée indéterminée, préavis de 30 jours, clauses qualité/confidentialité/indépendance/facturation/CPF. Début courant 2021 à confirmer expressément ; aucune heure historique attestée ; signature SERVICES PRO non présumée.
3. **Enquête de satisfaction formateur — I30** : document `c85e72cd-8089-4d75-8605-8f806758756a`, version figée `services-pro-satisfaction-formateur-2026-11-24-v1`, empreinte `d398a6649d3e8022e3bc59041e36b084e64871a73d071470460e2b982afe58fb`. Cinq notes entières de 1 à 5, points positifs et améliorations obligatoires, commentaire facultatif réellement facultatif, déclaration de sincérité puis signature distincte. Aucune validation automatique de I30.

Les deux documents nouveaux sont en brouillon, sans réponses ni date de remise. Les trois documents utilisent le lien individuel existant. Aucun cours, apprenant, contrat historique, réponse ou signature existante n'a été modifié.

## Protections actives

- Migration `0282_activer_signatures_trois_documents_intervenants` appliquée : table privée append-only, une preuve par document et par opération, empreintes SHA-256, droits admin en lecture seule et service role, aucun accès anonyme.
- Service isolé `intervenant-signature` déployé, source SHA-256 annoncée `d22789f8093b0de6e3cd86e0a487652788a165f6438f866d733d9d508866937a`.
- Texte figé stocké comme chaîne JSON et contrôlé avant chaque signature ; réponses de l'enquête liées à la preuve par empreinte.
- Consentement et signature manuscrite séparés pour chacun des trois documents ; confirmation 2021 supplémentaire pour le contrat.
- PDF privés relus octet par octet après stockage ; horodatage réel du serveur ; audit append-only ; idempotence avec le même UUID après erreur.
- CRM : statut, réponses et PDF privé par document ; rattachement humain possible à I21, I27 ou I30 seulement après signature, relecture et vérification du PDF, sans changement automatique de statut.
- Envoi : seul destinataire `contact@speakenglish4real.com`, trois documents obligatoires, vérification du site de production, réservation atomique, unicité et résultat inconnu jamais rejoué automatiquement.

## Tests réellement exécutés

- **PASS — 9 règles Vitest** : identités, tarif, clauses, 2021, trois consentements, cinq notes, champs obligatoires/facultatifs, aperçu/version et UUID.
- **PASS — 8 scénarios Deno du parcours** : trois documents, préparation admin, enquête complète, altération refusée, trois signatures/PDF/idempotence, rattachement I30, envoi unique et panne inconnue non rejouée.
- **PASS — 12 scénarios Deno compétences** : jeton/expiration, fichiers, remise CAS/relecture, admin et preuves séparées.
- **PASS — 6 règles email** : signature commune sans doublon.
- **PASS — 9 contrats PostgreSQL jetables** : droits minimaux, anonyme refusé, immuabilité, unicité contrat/enquête et restauration complète dans une seconde base jetable avec sources et permissions identiques.
- **PASS — PC fictif** : trois signatures, enquête complète, première erreur contrat visible puis reprise avec le même identifiant, aucune erreur page.
- **PASS — mobile tactile fictif** : tracé au doigt, bouton actif et aucun débordement horizontal.
- **PASS — vrai dossier en local PC/mobile** : trois documents réels et service actif, aucune soumission.
- **PASS — compilation TypeScript/Deno et diff** ; journal de build `build OK`.

## Publication et envoi — résultat confirmé à 19:33 UTC

- Troisième publication terminée : `gestion.ftransport.fr` sert `assets/index-DCkm6ZN_.js` avec le nouveau parcours.
- **PASS — production PC et mobile** : les trois documents réels, l'enquête complète, les zones de signature et le service actif sont visibles ; aucune erreur navigateur ni soumission de test.
- **UN SEUL EMAIL ENVOYÉ** à `contact@speakenglish4real.com` après ces contrôles. Confirmation fournisseur : accusé `64aa18a5-f200-41ea-bea1-4b92785cf3db`, message `01a20f0b-8648-7b84-86fb-fabdca689751`. CRM `envoye`, daté `2026-11-24 19:32:23.427+00`.
- La relecture d'audit utilisait par erreur la colonne inexistante `id` au lieu de `event_id`. La preuve d'envoi a été ajoutée manuellement une fois, événement `11201`, avec les trois identifiants de documents et l'accusé ; aucun email supplémentaire. Le code serveur est corrigé pour les opérations futures.
- Aucune signature réelle n'a été créée par les tests. Les trois documents restent à compléter/signer par Albert ; aucun statut Qualiopi n'a changé.

## Reste à vérifier après Albert

- Remise réelle de sa déclaration et de ses justificatifs, trois signatures réelles et leurs PDF privés.
- Relecture CRM par une session administrateur existante et rattachements pertinents ; aucune compétence, heure historique, signature du centre ou conformité ne doit être déduite automatiquement.
