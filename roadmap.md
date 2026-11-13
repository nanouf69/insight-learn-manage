# Roadmap — chantiers ouverts (13/11/2026)
Légende : PROD = en ligne · APERÇU = prêt non publié · BLOQUÉ = raison indiquée.
Prérequis global des lots serveur à risque : export de la base fait par l'utilisateur (More → Database → Settings → Export) + restauration test sur un projet distinct.

## P0 — Présence
- [ ] Validation par créneau + PDF privé + annulation sans motif + union/plafond 40/46/6 h — APERÇU (444 tests). Critère : clic réel admin sur dossier de test, relecture après rechargement. Bloqué : publication à valider.
- [ ] Justificatifs dans Contrôle qualité + ZIP — APERÇU (8 tests).
- [ ] Périmètre TOTAL VTC seulement (TAXI/TA/VA restaurés) — APERÇU (73 tests).
- [ ] Signatures tardives / à refaire, nom-prénom feuilles — à confirmer par dossier nommé ; aucune annulation de signature.

## P0 — Examens blancs / sauvegarde
- [ ] P0 Bilan examen VTC 505 « Développement commercial » : cause = accusé perdu + version serveur identique traitée comme conflit → validation bloquée à l’étape envoi (SAIDI, ABDELHAK, MALKI, CABRAL, Alpha). Correctif APERÇU (envoi-onglet-accuse-perdu.test.ts + 185 tests). Bloqué : publication globale.
- [ ] Révisions « questions fausses » : rebase même onglet — APERÇU (214 tests).
- [ ] Clôture sûre persist_answer_batch v2/v3 — BLOQUÉ : change le serveur pour tous les élèves → sauvegarde préalable.
- [ ] 18 révisions figées (16 élèves) : récupération par nouvelle révision autorisée — BLOQUÉ par le point précédent.
- [ ] UX EB (sortie, alertes 5/2 min, calculatrice) — APERÇU.
- [ ] Copies refaites en 1–2 s / rouvertes vides ; HADDOU reset matière — diagnostic fait, correctif à préparer.
- [ ] Zéro polling du chronomètre — écart signalé, décision utilisateur.

## P1 — Formation continue / e-mails
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
