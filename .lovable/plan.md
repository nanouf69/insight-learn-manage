# Mail type « Entraînement pratique VTC – réponse sous 5 jours » + choix signé

## Constat (lecture seule)
- Un circuit existe déjà : documents à signer avec lien unique (`/document-a-signer/:token`), fonction serveur publique `document-signature-public`, signature manuscrite (`SignaturePad`), PDF téléchargeable.
- Limites actuelles : il ne gère que des zones posées sur un PDF importé (pas de choix unique), et la signature écrase la ligne (`update`) sans garde contre une double validation simultanée.
- Les mails types sont gérés dans l'onglet « Mails Type » (`EmailTemplatesEditor`) et l'envoi passe par `send-document-email`.

## Ce qui sera construit (réutilisation, pas de 3e système)
1. **Modèle de mail type** « Votre entraînement pratique VTC – réponse attendue sous 5 jours », texte repris mot pour mot. Les 3 cases et le bloc « Nom, prénom / Date / Signature » sont remplacés dans le mail par un bouton **« Choisir et signer »** et une phrase : « Vous pouvez répondre par écrit à ce mail ou cliquer sur le bouton pour choisir et signer en ligne. » Aucune case cochable dans le mail.
2. **Formulaire sécurisé** sur la page de signature existante (nouveau type « choix unique ») :
   - texte complet du modèle (version figée) ;
   - exactement 3 choix exclusifs, présentés comme des cases, aucun pré-coché, modifiables tant que non signé ;
   - nom et prénom pré-remplis depuis la fiche de l'élève destinataire (affichés, non modifiables) ;
   - date/heure de Paris enregistrée par le serveur au moment de la signature ;
   - signature manuscrite obligatoire (doigt ou souris), adaptée mobile.
3. **Envoi manuel admin** dans l'onglet « À remplir / signer » : bouton « Préparer le mail entraînement pratique VTC », l'admin choisit lui-même l'élève (aucune sélection automatique, aucun filtre « échec » imposé), voit l'**aperçu complet**, puis clique sur « Envoyer ». Aucun envoi automatique, aucune relance, aucun SMS/appel.
4. **Suivi admin** : statut (préparé / envoyé le … / signé le …), choix fait, PDF de preuve téléchargeable ; visible aussi dans le dossier de l'élève via la liste existante.

## Preuve et protections
- Une seule réponse signée active par envoi ; une 2e validation (double clic, rechargement, 2 onglets) renvoie la preuve existante sans rien réécrire (garde serveur en base).
- Preuve conservée : texte exact + numéro de version, élève et adresse destinataire, choix, date/heure Paris + horodatage, image de signature, empreinte du texte.
- Après signature : preuve immuable (trigger refusant toute modification) ; aucune ancienne copie, réponse ou signature supprimée.
- Lien : jeton aléatoire long non devinable ; un lien invalide ou d'un autre élève ne révèle aucune donnée.
- Délais 5 jours / 6 mois : affichés à partir de la **date d'envoi réelle enregistrée** (jamais de la date d'aperçu) ; mention « date d'envoi, pas une preuve de réception ». La livraison/ouverture n'est jamais présentée comme une réception.
- Aucun effet automatique du choix : pas d'abandon déclaré, pas de changement Caisse des Dépôts / France Travail, pas d'annulation de pratique, pas de gel d'heures ou de modules. Le texte sur les conséquences reste celui fourni, sans validation juridique de ma part.

## Tests (fictifs uniquement)
Choix unique / aucun pré-coché, signature obligatoire, mobile (390 px), jeton invalide/étranger, droits (élève/anonyme ne lit rien d'autre), double validation, preuve figée, délais calculés depuis l'envoi réel. Typecheck + build. Aucun mail réel envoyé, aucune donnée élève modifiée, **pas de publication**.

## Détails techniques
- Migration additive sur `documents_a_signer` : colonnes nullables `modele_code`, `modele_version`, `texte_fige`, `texte_empreinte`, `apprenant_id`, `choix`, `envoye_le`, `signe_le_paris` ; trigger `trg_documents_a_signer_preuve_immuable` (refus 42501 après `statut='signe'`) ; update conditionnel `WHERE statut <> 'signe'` pour l'idempotence. RLS existantes conservées (admin seulement), accès élève uniquement via la fonction serveur par jeton.
- Modèle versionné dans `src/lib/modeles/entrainementPratiqueVtc.ts` (texte, 3 choix, version v1).
- Fichiers : `supabase/functions/document-signature-public/index.ts` (type choix unique, garde idempotente, nom pré-rempli depuis `apprenants`), `src/pages/DocumentASignerPublic.tsx`, `src/components/documents/DocumentsASigner.tsx` + nouveau `EnvoiEntrainementPratiqueDialog.tsx`, `src/lib/documentSigneDownload.ts` (PDF de preuve généré sans fichier source), tests `src/test/entrainement-pratique-vtc.test.ts`, journal daté dans `docs/`.
- Envoi via `send-document-email` existant, déclenché uniquement par le clic admin ; `envoye_le` écrit seulement après succès serveur.
