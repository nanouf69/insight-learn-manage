# Roadmap — chantiers ouverts (13/11/2026)
Légende : PROD = en ligne · APERÇU = prêt non publié · BLOQUÉ = raison indiquée.
Prérequis global des lots serveur à risque : export de la base fait par l'utilisateur (More → Database → Settings → Export) + restauration test sur un projet distinct.

## P0 — Présence
- [ ] Validation par créneau + PDF privé + annulation sans motif + union/plafond 40/46/6 h — APERÇU (444 tests). Critère : clic réel admin sur dossier de test, relecture après rechargement. Bloqué : publication à valider.
- [ ] Justificatifs dans Contrôle qualité + ZIP — APERÇU (8 tests).
- [ ] Périmètre TOTAL VTC seulement (TAXI/TA/VA restaurés) — APERÇU (73 tests).
- [ ] P0 interdiction serveur de toute signature apprenant passée (13/11 19:57) : fermer la régularisation et les liens rétroactifs, vérifier accès direct + Europe/Paris sur copie isolée ; preuves historiques inchangées. Responsable : Lovable ; activation isolée après tests, aucune publication globale.
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
