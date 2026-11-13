# Réinitialisation ciblée F(T)/G(T) — 13 novembre 2026

## Statut
**Aperçu seulement, publication NO-GO.** Aucune réinitialisation réelle, migration, écriture, suppression, note, copie ou signature modifiée. Aucun compte identifié à partir de la capture.

## Audit en lecture seule
- Catalogue actuel des six EB TAXI : F(T) = `reglementation_taxi` (16 questions, 30 minutes), G(T) = `reglementation_taxi2` (8 questions, 20 minutes). Identifiants différents et correctement transmis individuellement.
- `exam_subject_reset_context` et `admin_authorize_exam_subject_reset` présentes. Exécution accordée à authenticated, refusée à anon ; rôle admin vérifié dans la commande serveur.
- Le serveur conserve les copies et résultats, journalise une autorisation append-only par apprenant/examen/matière/source/version/acteur/date. Il ne démarre pas la nouvelle tentative ni le chronomètre ; seul l'élève le fait.
- Copies ouvertes, correspondances ancien/V2 ambiguës, source différente, attribution absente et versions périmées restent refusées. Aucun repli vers une remise à zéro globale.
- Aucun événement correspondant trouvé dans error_logs sur trois jours ; les erreurs attrapées par ce bouton ne constituent pas forcément un événement dans ce journal.
- Le panneau affiche une note et lit indépendamment l'autorisation de repassage. Une note visible ne prouve donc pas qu'une copie est réinitialisable.

**Cause individuelle non prouvée** : l'identité et l'EB précis ne sont pas fournis ; aucun compte n'a été choisi par rapprochement de notes. La capture ne permet pas de distinguer un refus de droits, une panne de lecture, un conflit source/chronomètre ou une copie ambiguë. Le défaut confirmé de présentation est que tous ces échecs devenaient « Lecture indisponible », masquant leur motif.

## Correctif sûr
- `ExamensBlancsResetTab.tsx` : rendre le vrai motif d'échec de lecture plutôt qu'un libellé générique.
- `ResetMatiereAdminButton.tsx` : bouton explicite « Relire cette matière », confirmation désactivée après erreur jusqu'à une lecture réussie, identité complète contrôlée et résultats asynchrones périmés ignorés après changement de cible.
- Confirmation explicite conservée, double clic bloqué et reçu vérifié par relecture. F ne transmet jamais G et inversement. « Annuler » avant confirmation n'envoie aucune autorisation.
- Aucun bouton d'annulation après autorisation ajouté : le circuit existant ne prouve pas une révocation cohérente sur tous les lecteurs. Ne pas présenter une fermeture de dialogue comme une annulation de l'autorisation.
- Aucune règle serveur changée et aucun verrou contourné. Ce correctif améliore la reprise des lectures défaillantes, pas les refus légitimes de provenance.

## Preuves exécutées
- **21 Vitest PASS**, quatre fichiers : tests F/G et dix contrôles existants du bouton, erreurs fonction manquante, moyenne CRM.
- **10 contrats PostgreSQL PASS** sur base jetable, dont nouveau scénario F=15/20, G=8/20 et Anglais=12/20 : autorisation F seule puis G seule, Anglais intact ; réponses, notes et chronomètres originaux strictement identiques avant/après les autorisations.
- **14 contrats déclencheurs PASS** sur base jetable avec catalogue de déclencheurs existant : copies natives/importées, provenance incertaine, concurrence, reprise, protections historiques et absence d'effets externes.
- Chromium avec les vrais boutons, données et serveur fictifs uniquement : ordinateur 1280×1800, mobile 390×844 ; annulation sans envoi, confirmation G puis F et reçu lu, deux cibles exactes, aucune erreur JavaScript. Captures examinées.
- Le premier essai du panneau CRM complet sur fixture ne montrait pas les résultats (rafraîchissement de la fixture). Le contrôle navigateur positif utilise donc les vrais boutons isolés, pas le panneau complet ni un compte réel. La fixture du panneau a été ajustée, mais son parcours complet n'est pas déclaré prouvé.
- Dernier journal automatique : **build OK**. Suite globale non relancée pour cette intervention ciblée ; le blocage global sous charge signalé précédemment n'est pas déclaré résolu.

## Limites et publication
La restauration complète reste non prouvée et la publication n'est pas autorisée. Le refus exact pour l'élève de la capture demeure inconnu ; une identité explicitement fournie ou le message détaillé sera nécessaire pour qualifier ce cas individuel sans deviner. Aucun lot concurrent publié.

## Fichiers auxiliaires
`src/test/admin-reset-taxi-fg.test.tsx`, `src/test/admin_subject_reset_sql_contract.py`, `src/test/admin-subject-reset-browser/harness.tsx`, `AGENTS.md`, `roadmap.md` et ce rapport.