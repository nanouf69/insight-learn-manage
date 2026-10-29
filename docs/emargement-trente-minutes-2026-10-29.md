# Émargement dès trente minutes avant — 29 octobre 2026

## Diff fonctionnel
- Créneaux et heures réels calculés côté serveur depuis inscriptions, agenda daté et planning pratique ; heures personnalisées prioritaires, attente/exclusions/annulations refusées.
- Début converti en instant Europe/Paris puis moins trente minutes. Pas de limite de fin supplémentaire : rattrapage conservé.
- Sélection élève et sauvegarde utilisent le même contrôle ; garde P0541 sur insert/remplissage direct. Feuilles vierges générées inchangées.
- Pratique après-midi non proposée avec le matin tant que sa propre fenêtre n'est pas ouverte.
- Minuteur ponctuel à la prochaine ouverture, relecture au retour de fenêtre ; identité/conflit/présence/inactivité prioritaires.
- Date, pratique et heures réelles visibles ; signature et confirmation de présence restent des actions explicites.

## Fichiers concernés
- `drizzle/migrations/0215_attendance_early_window.sql` (appliquée).
- `supabase/functions/save-emargement-apprenant/index.ts` (déployée seule).
- `src/lib/emargementFenetres.ts`, `agendaSlots.ts`, `pratiqueEmargements.ts`.
- `src/pages/CoursPublic.tsx`, `src/components/cours-en-ligne/EmargementFCModal.tsx`.
- Tests `emargement_fenetre_sql_contract.py`, `emargement-fenetres.test.ts`, adaptation `emargement-agenda-eleve.test.ts`.

## Preuves exécutées
- PASS : 11 tests sur PostgreSQL jetable, tables et dépendances lues du catalogue réel. −31 refus / −30 accepté / −1 accepté / début exact, après-midi/soir, DST été/hiver, veille 23h30, personnalisation, pratique, exclusions, e-learning, accès autre compte, horodatage réel et metadata historiques.
- PASS : 36 tests frontend de fenêtres/sélection/ouverture/sources/pratique. Identité occupée puis libérée testée mécaniquement ; signature traitée non proposée.
- PASS : 7 tests PostgreSQL jetable de verrou attestation FC (fonctionnalité inchangée).
- PASS : modal réelle rendue avec identité fictive, pratique après-midi 14h–16h et date correcte, sans envoi ; capture `/tmp/browser/attendance-window/modal.png`, aucune erreur JavaScript.
- PASS : dernière compilation observée.
- PASS : empreinte des 2 996 lignes `emargements_fc` identique avant/après : `638a2b56f26f0a4b6ae84fb3ecdecb3b`.
- NON PROUVÉ : connexion et sauvegarde/relecture complètes en navigateur sous compte technique. Session technique refusée par l'outil (approbation indisponible) ; aucune substitution par un vrai élève.
- NON PROUVÉ : popup automatique au passage réel de l'heure, conflits et bureau/mobile en session technique ; les tests mécaniques et le rendu fictif ne remplacent pas ces parcours.
- FAIL hors périmètre : test préexistant `emargements-planning-attente.test.ts`, feuille historique masquée attendue dans anomalies. Aucun correctif de classification effectué ici.

## Disponibilité
- Serveur : migration et fonction de sauvegarde ciblées installées ; existence des fonctions relue.
- Aperçu : sélection et minuteur modifiés, compilation OK.
- Production frontend : NON PUBLIÉ. La publication disponible capture tout le projet ; impossible de garantir une publication de ces seuls fichiers sans embarquer le chantier « Réalisés » et les autres travaux inachevés. Aucun lancement global.
- Pas de test live d'écriture, mail, SMS, IA ni modification de réponses/notes/jalons/signatures historiques.

## Points encore à vérifier
- Calendriers atypiques/cours sans agenda ni horaires explicites échouent fermés : ne pas inventer d'heure.
- La règle FC garde les attentes de signatures existantes ; elle ne certifie pas une présence du seul fait d'une signature anticipée.
- Comparaison approfondie de toutes les formations et flux rétrospectifs reste nécessaire avant publication frontend ciblée.