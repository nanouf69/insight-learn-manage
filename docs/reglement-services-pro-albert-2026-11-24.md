# SERVICES PRO — article 21 et justification Albert AKONO — 24/11/2026

## Règlement
- Version `services-pro-ri-2026-11-24-v2`, 21 articles : vingt originaux exactement conservés et seul article 21 ajouté. Comparaison du bloc CGV avec le commit avant intervention : identique.
- Le nouvel article interdit violences, harcèlement moral/sexuel, agissements sexistes et discriminations ; signalement confidentiel à contact@ftransport.fr, traitement diligent/impartial, protection contre représailles, mesures adaptées, sanctions proportionnées selon procédure/droits de la défense, autorités compétentes accessibles.
- Formulaire de nouvelle acceptation : snapshot complet RI/CGV enregistré dans la nouvelle ligne, relecture version/horodatage et articles exacts avant succès. L’ancien formulaire terminé demeure terminé, sans nouvelle acceptation déduite.
- Export des nouveaux documents : contenu exclusivement depuis le snapshot enregistré ; pas de reconstruction du texte courant pour les historiques.
- CRM → Formulaires : consultation de la nouvelle version et mention explicite de l’information restant à organiser. Message non envoyé : `docs/reglement-services-pro-information-inscrits-2026-11-24.md`.
- Les anciens fichiers PDF et le générateur historique condensé séparé ne sont pas remplacés par cette intervention ; ne pas les assimiler à la nouvelle version.
- Avant/après : **133 acceptations, MD5 b8c0eb9c9882c75f7d29ad8df05c89e7 identique**. Aucune signature/donnée élève modifiée.

## Indicateur 12
- Preuve ajoutée `f1c4cfc9-528c-4960-b885-a77219a01e9f`, référence `q12-ri-services-pro-v2-20261124`, un lien relu vers 12 ; SHA256 du snapshot RI : `ab6770edd7f31adc9c18208c11b6c2e7c5faa333922693ee8ac71ff2901db714`.
- Lacune documentaire prévention/signalement/traitement levée. **À compléter maintenu** : nouvelle version non publiée et information effective des inscrits non démontrée. Aucun incident, diffusion ou nouvelle acceptation inventés.
- Sources et rattachements antérieurs conservés ; remarque datée ajoutée, pas de conformité automatique.

## Formulaire Albert
- Formateur existant `6d0f9f9d-5380-4757-90ef-375e1179f811`, **ALBERT AKONO**, adresse connue **contact@speakenglish4real.com**, externe anglais.
- Aucun formulaire existant retrouvé ; une seule invitation créée, document `8b944d42-aa7d-4f19-83d9-bc4ef10c0b07` ; identité/texte/version figés et protection d’immuabilité déjà existante réutilisée.
- CV/diplôme existants dans Agrément référencés dans le texte figé ; aucune qualification inventée.
- Missions/publics/modalités/dates, expérience, intitulés exacts des diplômes, CV, justificatifs, déclaration d’exactitude non précochée ; PDF/JPEG/PNG privés jusqu’à 4 Mio par pièce.
- Jeton aléatoire 256 bits ; échéance **25/12/2026 00:00 Europe/Paris**, dernière journée utile 24/12. Chaque accès compare modèle/jeton/échéance ; aucun ID CRM, courriel, avis responsable ou données d’autrui dans la lecture publique.
- Fichiers immuables par empreinte dans `documents-a-signer/competences/<document-id>/`; extension déclarée vérifiée par octets, dépôt sans remplacement, relecture exacte avant acceptation. Fichier d’un autre dossier refusé.
- Déclaration remise une seule fois par CAS ; état technique `signe` signifie ici déclaration enregistrée, **pas validation responsable ni signature manuscrite**. Écran explicite ; avis responsable dans document séparé append-only, admin vérifié côté serveur, méthode réelle + justification + confirmation obligatoires.
- CRM → Formateurs → Justification des compétences : consultation des pièces privées, historique et nouvelle décision du responsable. Ne change pas automatiquement l’indicateur 21.
- Nouveau service ciblé activé et ancien handler de signature garde ces modèles hors de son circuit. **Aucune publication du site/app**, aucun envoi mail.
- Relecture réelle : brouillon, réponses vides, `sent_at` et `signed_at` NULL ; Albert n’a pas été déclaré signataire/qualifié.

## Lien
Lien individuel préparé pour le site, **nécessite publication explicite de la nouvelle page** :
`https://gestion.ftransport.fr/competences-intervenant/5d83b5538be616e918387f8231b7cc5e497856eed07498ce48f35fd8e09f3ec2`

Même chemin dans l’aperçu ; contrôlé dans le navigateur local PC/mobile sur le vrai service et la vraie invitation, sans remplir le dossier d’Albert. Ne pas rendre ce jeton public : il autorise son porteur à remettre ce formulaire, sans prouver son identité civile.

## Contrôles réellement exécutés
- **41 Vitest PASS** : 8 règlement/version/parcours + 19 choix pratique serveur + 14 attestation ; cinq tests actualisation CRM également rejoués séparément, non comptés comme tests du présent lot.
- **12 Deno PASS** : transport fictif sans sortie réseau, mauvais jeton/expiration/déclaration/refus fichiers externes/soumission CAS-relecture/décision append-only/non-admin. Pas une preuve RLS production.
- **Réel service** : invitation GET HTTP 200 sans session, déclaration vide HTTP 400, accès responsable sans identité HTTP 401, ancien handler avec ce jeton HTTP 404.
- **Réel écran public PC/mobile** : formulaire Albert affiché, déclaration décochée, validation vide refusée, jeton inconnu refusé, pas de débordement.
- **Écran règlement PC/mobile fictif sans apprenantId** : 21 articles, présentation conservée, case décochée ; aucun enregistrement.
- Build OK ; données historiques identiques.

## Limites / suite
- Pas de soumission réelle de la déclaration d’Albert, ni dépôt réel de ses pièces, ni validation responsable réelle : aucune preuve ne peut être fabriquée pour tester.
- Compte disponible `naoufal.guenichi@gmail.com` = rôle user : accès responsable refusé réellement. Vue CRM admin et décision réelle NON PROUVÉES, nécessitent une session administrateur existante, sans élargir ses droits.
- Publication de la nouvelle page et diffusion du règlement attendent accord ; aucune diffusion faite.
- Restauration indépendante non réalisée dans ce lot, aucune migration appliquée.