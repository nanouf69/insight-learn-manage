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
- [ ] Autorisation d'activation reçue le 14/11 à 00:18 UTC — STOP sécurisé après contrôles réels à 00:19 UTC, pas un manque d'accord. Responsable : Lovable ; aucune migration, tâche, fonction d'envoi ou publication modifiée. 66 tests isolés rejoués avec succès. Bloqueurs : date de passage réel non raccordée à une preuve ; priorité/interdiction pratique non opérationnelles et validité contractuelle non prouvée ; mail historique affirme « jamais connecté » (incompatible avec les élèves déjà connectés) ; adaptateur canonique et verrou atomique absents. Action préalable : preuve nominative datée CMA/admin + arbitrage de ces affirmations sans inventer de blocage ni réécrire silencieusement le modèle historique. Preuves et limites : docs/activation-rappels-theoriques-2026-11-14.md.
- [ ] Rectification 23:19 : J+7/J+9/J+11 référence au modèle historique relance_suspension_cpf, contenu/format inchangés, nouveau texte J+7 retiré, aucun second modèle. 66 tests isolés réussis. Tâche historique active 09:00 UTC inchangée, nouvelle cadence NON ACTIVE. Bloqueurs : HTML historique affirme « jamais connecté », financement non filtré historiquement, preuve réelle et verrou atomique non raccordés. Autre modèle en base elearning-synchrone-assiduite (assiduité classe virtuelle, dates incohérentes) identifié, non sélectionné silencieusement. Aucun envoi ni modification réelle.
- [x] Correction 23:16 du modèle ferme après examen : objet URGENT, deux avertissements exacts #C62828/700, HTML et texte issus du même modèle ; préparation seule. J+1/J+3/J+5 conservés et obligations J+7 inchangées. Activation bloquée : interdiction de pratique non effective/validité contractuelle non prouvée, priorité non opérationnelle, raccordement serveur absent. Aucun envoi ni publication.
- [ ] Rappels VTC/TAXI — rectification 23:11 : FERME J−7/J+1/J+3/J+5 ; dès J+7/J+9/J+11 OBLIGATIONS avec mentions CPF/France Travail conditionnelles, sans sanction automatique. Modèles/calendrier/conditions isolés préparés, **63 tests exécutés avec succès**. Aux incomplets NON PRATIQUES seuls, arrêt dès complétion. Responsable : Lovable. Zéro envoi, activation ou publication. BLOQUÉ pour activation : preuve datée CMA, adaptateurs progression/financement vérifiés, journal atomique, priorité/exception, contrats/tests bout-en-bout et confirmation. Impossibilité de passer à pratique toujours à valider/reformuler. Aucun blocage dur de réservation.
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
