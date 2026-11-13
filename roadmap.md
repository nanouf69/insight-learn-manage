# Roadmap — chantiers ouverts (13/11/2026)
Légende : PROD = en ligne · APERÇU = prêt non publié · BLOQUÉ = raison indiquée.
Prérequis global des lots serveur à risque : export de la base fait par l'utilisateur (More → Database → Settings → Export) + restauration test sur un projet distinct.

## P0 — Présence
- [ ] Validation par créneau + PDF privé + annulation sans motif + union/plafond 40/46/6 h — APERÇU (444 tests). Critère : clic réel admin sur dossier de test, relecture après rechargement. Bloqué : publication à valider.
- [ ] Justificatifs dans Contrôle qualité + ZIP — APERÇU (8 tests).
- [ ] Périmètre TOTAL VTC seulement (TAXI/TA/VA restaurés) — APERÇU (73 tests).
- [ ] Signatures tardives / à refaire, nom-prénom feuilles — à confirmer par dossier nommé ; aucune annulation de signature.

## P0 — Examens blancs / sauvegarde
- [ ] Révisions « questions fausses » : rebase même onglet — APERÇU (214 tests).
- [ ] Clôture sûre persist_answer_batch v2/v3 — BLOQUÉ : change le serveur pour tous les élèves → sauvegarde préalable.
- [ ] 18 révisions figées (16 élèves) : récupération par nouvelle révision autorisée — BLOQUÉ par le point précédent.
- [ ] UX EB (sortie, alertes 5/2 min, calculatrice) — APERÇU.
- [ ] Copies refaites en 1–2 s / rouvertes vides ; HADDOU reset matière — diagnostic fait, correctif à préparer.
- [ ] Zéro polling du chronomètre — écart signalé, décision utilisateur.

## P1 — Formation continue / e-mails
- [x] Aperçu e-mails en texte lisible — APERÇU.
- [x] Accusé « Je confirme avoir reçu » : table + page de confirmation — PROD (page en ligne, testée sur lien invalide/inconnu). Lien dans les e-mails : ÉTEINT (secret EMAIL_CONFIRMATION_RECEPTION_ACTIVE=true + redéploiement des fonctions d'envoi).
- [ ] États distincts dans CRM (accepté/remis/rejet/indice d'ouverture/confirmé) — APERÇU.
- [ ] Avis de remise/rejet : brancher webhook Resend + vérifier signature — BLOQUÉ : action utilisateur dans Resend + secret RESEND_WEBHOOK_SECRET.
- [ ] Devis FC signé → session, doublons, classement FC VTC — à implémenter (alerte non destructive).
- [ ] Convocation après 50 € confirmés — règle enregistrée, automatisation non activée.
- [ ] CMA ajournés → prochaine session — APERÇU, bloqué : territoire pratique absent.

## P1 — Attestations
- [ ] Date dernière activité pédagogique vs fin administrative, rectificatif versionné — à faire (aucune réécriture d'attestation signée).

## P2 — Performances
- [ ] Autosave anti-tempête / lectures périodiques — à faire après P0.
