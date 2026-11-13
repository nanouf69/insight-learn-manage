# Roadmap — chantiers ouverts (13/11/2026)
Légende : PROD = en ligne · APERÇU = prêt non publié · BLOQUÉ = raison indiquée.
Prérequis global des lots serveur à risque : export de la base fait par l'utilisateur (More → Database → Settings → Export) + restauration test sur un projet distinct.

## P0 — Présence
- [ ] Validation par créneau + PDF privé + annulation sans motif + union/plafond 40/46/6 h — APERÇU (444 tests). Critère : clic réel admin sur dossier de test, relecture après rechargement. Bloqué : publication à valider.
- [ ] Justificatifs dans Contrôle qualité + ZIP — APERÇU (8 tests).
- [ ] Périmètre TOTAL VTC seulement (TAXI/TA/VA restaurés) — APERÇU (73 tests).
- [ ] P0 interdiction serveur de toute signature apprenant passée (13/11 19:57) : PRÉPARÉ, NON DÉPLOYÉ. Contrôle réel relu le 13/11 à 20:21 UTC : exception regularisation_id toujours présente (empreinte fonction 36fcaddbfedab7cdf5854edf5ea7039f). Responsable : Lovable. 27 tests rejoués avec succès (6 PostgreSQL jetable, 12 Vitest, 9 Deno) ; les 55 antérieurs restent documentés. STOP avant migration/déploiement : export réel et restauration indépendante non prouvés ; tests synthétiques et anciennes archives ne remplacent pas cette preuve. Activation après preuve : contrôle base puis uniquement save-emargement-apprenant et send-regularisation-emargement, refus authentifiés non destructifs et relecture historique ; aucune publication globale, aucun mail, aucune signature créée.
- [ ] Cases anciennes manquantes : présence/absence administrative justifiée et auditée uniquement, sans signature apprenant ; aucune annulation de signature. Nom-prénom feuilles : aperçu à vérifier.

## P0 — Examens blancs / sauvegarde
- [ ] P0 Bilan examen VTC 505 « Développement commercial » : cause prouvée = 2e clic des questions à plusieurs réponses journalisé mais écarté de la copie (base périmée) → « envoi » refusé en boucle. Correctif serveur EN LIGNE 13/11 19:26 (upsert-reponse-apprenant : dernier clic du même compte appliqué, 7 tests). À confirmer : premier « Valider » réussi de SAIDI / ABDELHAK / CABRAL.
- [ ] Révisions « questions fausses » : rebase même onglet — APERÇU (214 tests).
- [ ] Clôture sûre persist_answer_batch v2/v3 — BLOQUÉ : change le serveur pour tous les élèves → sauvegarde préalable.
- [ ] 18 révisions figées (16 élèves) : récupération par nouvelle révision autorisée — BLOQUÉ par le point précédent.
- [ ] UX EB (sortie, alertes 5/2 min, calculatrice) — APERÇU.
- [ ] Copies refaites en 1–2 s / rouvertes vides ; HADDOU reset matière — diagnostic fait, correctif à préparer.
- [ ] Zéro polling du chronomètre — écart signalé, décision utilisateur.

## P1 — Formation continue / e-mails
- [ ] Rappels VTC/TAXI — mise à jour 23:06 : FERME à J−7 date prévue puis J+1/J+3/J+5 date réelle ; NORMAL dès J+7 tous les deux jours aux incomplets NON PRATIQUES seuls. Deux modèles à préparer, contrôles/exclusions/arrêt canonique conservés. Responsable : Lovable. Projection isolée précédente : 40 tests. Zéro envoi, activation ou publication. BLOQUÉ pour activation : preuve datée CMA, progression canonique, journal atomique, priorité/exception, contrats/tests bout-en-bout ; phrase d'impossibilité de pratique incohérente avec absence de blocage effectif, à soumettre avant activation. Aucun blocage dur de réservation à créer.
- [x] Aperçu e-mails en texte lisible — APERÇU.
- [x] Accusé « Je confirme avoir reçu » : PROD, bouton actif sur renvoi nouvelle adresse, documents, identifiants, régularisation émargement, Outlook, identifiants auto. Relances (modifiées il y a 25 h) non redéployées volontairement. À prouver au premier envoi réel.
- [ ] États distincts dans CRM (accepté/remis/rejet/indice d'ouverture/confirmé) — APERÇU.
- [ ] Avis de remise/rejet : récepteur signé en PROD (refus 401 sans signature) — attend la clé de signature Resend (RESEND_WEBHOOK_SECRET).
- [ ] Devis FC signé → session, doublons, classement FC VTC — à implémenter (alerte non destructive).
- [ ] Convocation après 50 € confirmés — règle enregistrée, automatisation non activée.
- [ ] CMA ajournés → prochaine session — APERÇU, bloqué : territoire pratique absent.

## P1 — Attestations
- [ ] Date dernière activité pédagogique vs fin administrative, rectificatif versionné — à faire (aucune réécriture d'attestation signée).

## P2 — Performances
- [ ] Autosave anti-tempête / lectures périodiques — à faire après P0.
