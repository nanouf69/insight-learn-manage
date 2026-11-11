# Remise à zéro admin d’une matière — aperçu bloqué

## Reprise 11/11 — état le plus récent, prioritaire sur les comptes rendus ci-dessous
- Catalogue Cloud : `exam_subject_reset_context` et `admin_authorize_exam_subject_reset` toujours absentes ; **aucune migration appliquée**, aucune autorisation ou tentative réelle, aucun frontend publié.
- Arezki HADJ ALI, EB3/T3P : tentative V2 `5b7ca25e-ed8b-45b7-8bc4-690385e21c50` en cours, fin NULL, aucun résultat ; chrono initial du 10/11 à 08:23:59 UTC, durée 2700 secondes. Ne pas remplacer cette copie, même si son délai est écoulé : état serveur encore ouvert.
- Nouveau test reproductible `src/test/subject-reset-passage-browser/check_flow.py` : véritable PassageMatiere, transport réseau intercepté vers PostgreSQL jetable exclusivement, ancien EB3 VTC sur ordinateur et V2 EB4 TAXI sur mobile ; réponse sélectionnée relue, chrono repris à 44:56/44:55 après reload, soumission observée. Captures vues. Aucun réseau réel IA/email/Cloud autorisé.
- Défaut reproduit et corrigé dans le candidat : le premier reçu avait source=destination et empêchait une nouvelle tentative ultérieure (rejeu de la copie initiale). Le candidat remplace l'unicité source par un index partiel des véritables repassages sans supprimer de reçu ; le client distingue les opérations par preuve source et autorisation. Neuf contrats PostgreSQL PASS, dont première remise puis tentative 2 et original inchangé ; 23 tests applicatifs ciblés PASS ; dernier build observé OK.
- **Installation encore suspendue** : scénario de soumission V2 historique importée complet non exécuté ; le cluster contient les guards ciblés mais pas tous les triggers live (dont enfilage IA et completion de module). Résultat serveur après soumission non asserté par le navigateur et preuve d'absence d'effet indirect global incomplète. Ne pas revendiquer une compatibilité exhaustive ni un bouton opérationnel.
- La modification cliente exige une publication ciblée ultérieure ; la dépendance serveur seule ne suffirait pas à corriger le rejeu du premier reçu avec l'ancien bundle. Aucun lot frontend groupé n'a été publié.

## État
Bouton et confirmation uniquement. **Pas d’action effective, pas de publication, pas de migration préparée ou appliquée.** Le bouton de confirmation est toujours désactivé ; aucun transport de mutation n’est importé dans ce composant.

## Diagnostic en lecture seule
Le catalogue réel expose `start_exam_subject_retake(uuid,uuid,text,text,text,uuid)` :
- exige `core_est_proprietaire`, pas un droit admin ;
- crée une nouvelle réponse, éventuellement une tentative V2, et démarre immédiatement un chronomètre ;
- consomme éventuellement une autorisation à portée examen ;
- exige une identité de source univoque et refuse certaines copies historiques/V2 ambiguës.

Ce circuit élève ne peut donc pas être appelé depuis la fiche admin, ni être adapté en usurpant l’identité de l’élève. La restauration côté élève dépend notamment d’un reçu sélectionné dans son navigateur : une création admin seule ne prouve pas que seule cette matière sera proposée dans son parcours actif.

`core_admin_reset_exam`, `core_restart_matiere` et `reset_quiz_attempt` ne sont jamais utilisés comme replis. Le bouton global et ses actions restent byte-identiques.

## Parcours
VTC/TAXI anciens et V2 : action admin bloquée, aucune compatibilité effective annoncée. TA/VA également bloqués. Copies en cours : aucun déplacement/écrasement ; ce lot n’ajoute aucune action aux lignes en cours sans résultat. Les lignes terminées ouvrent uniquement une confirmation indisponible, identifiée par apprenant/examen/filière/matière/résultat et noms affichés.

## Prérequis de mise en service
Une opération additive spécifique doit permettre une autorisation nominative et différée sans lancer le chronomètre admin, vérifier côté serveur le rôle admin, le dossier, le parcours/filière, la matière, le résultat et le passage source, les copies concurrentes et l’idempotence. La lecture du parcours élève doit retrouver cette autorisation sans réécrire ses anciennes copies, sessions ou résultats, puis créer une nouvelle tentative non notée uniquement au démarrage de cette matière. Aucun score zéro, recalcul historique, suppression ou effet de bord global n’est admissible.

## Vérification attendue de ce lot
Les tests couvrent le blocage, l’annulation, les identités et l’absence de mutation. Le succès d’un reset, ses droits serveur et sa concurrence restent **NON PROUVÉS**, puisque l’opération admin n’existe pas. Ne pas assimiler un test d’interface à un contrat serveur positif.

## Résultats exécutés
- Vitest : **23/23 PASS**, dont 11 tests du bouton admin, 8 tests du repassage élève existant et 4 tests du reset global existant. Aucun test positif serveur admin n’est revendiqué.
- Chromium, vrai panneau CRM sur fixtures uniquement : VTC 1280×1800 et TAXI 390×844, confirmation élève/examen/matière, annulation/réouverture, confirmation désactivée, note Anglais inchangée, aucun débordement ni erreur de page. Captures finales vues après animation.
- Toutes les requêtes externes ont été interceptées : un `log_error` de démarrage lié au chargement des définitions fictives a également été bloqué. **Zéro requête de mutation déclenchée par les clics**, zéro écriture Cloud.
- Compilation automatique observée : `build OK` ; lint des nouveaux fichiers : zéro erreur. Comparaison des trois sections globales (gestionnaire, bouton et dialogue) à HEAD : identiques. Aucun changement des calculs de notes.
- Session admin réelle et parcours élève réel positif : **NON PROUVÉS** ; volontairement aucune remise à zéro réelle, aucun email, IA ou publication.

## Reprise autorisée 11/11 08:58 — candidat fonctionnel, installation suspendue
- Le panneau compose toutes les matières du sujet enregistré en ordre officiel et associe les résultats par ID exact : EB3 VTC/TAXI = sept lignes, TA/VA = leurs deux matières spécifiques. Résultat absent = aucune note ajoutée. Calcul global existant, gestionnaire global, bouton global et dialogue global non modifiés.
- Bouton « Réinitialiser la matière » : vraie lecture serveur, confirmation nominative, verrou immédiat, autorisation dédiée et relecture. Pas de lancement admin du chrono. Cas en cours, nom/résultat changé, version/source ambiguë : refus explicite.
- Candidat `docs/sql-revue/2026-11-11-subject-reset.sql` : catalogue serveur de source, autorisations immuables avec rôle admin, identité/version, unicité/concurrence ; start propriétaire atomique et reçu avant insertion pour le délai ciblé. Sujet V2/durée issus de la publication actuelle, ancienne copie intacte. Premier passage non commencé = tentative 1, pas de résultat fictif ni délai 48 h emprunté aux autres matières.
- Élève : liste des autorisations persistées ; « Refaire la matière » relit l’identité serveur au lieu de deviner un suffixe ; reçu existant relu sans seconde création. La navigation existante ouvre seulement la matière du reçu.

### Vérifications exécutées
- 146 tests applicatifs de boutons, composition, sauvegarde, délai, snapshots, notes et reset global PASS ; 19 tests ciblés rejoués après concordance du résultat PASS.
- 8 contrats PostgreSQL réels sur schéma public copié sans données dans un cluster jetable PASS : admin→élève, absence de chrono admin/résultat zéro, sources et autres matières intactes, droits, filières TA/VA, refus en cours, V2 native avec copie historique identique, zéro IA, concurrence.
- Chromium VTC 1280×1800 et TAXI 390×844 : vrais boutons/panneau CRM → SQL jetable → bouton élève → reçu → relecture après reload PASS, aucune erreur de page ; une autorisation et un démarrage par parcours. Captures vues. Le rendu de la copie dans ce harnais est une projection de test, PAS le composant PassageMatiere complet.
- Lint ciblé sans erreur ; compilation automatique observée build OK. Aucune mutation Cloud, email, IA payante ni publication. Fichiers/données du rattachement des cinq dossiers non touchés.

### Blocages et limites restant à prouver avant installation
- Migration volontairement NON appliquée : la confirmation réelle affiche une erreur de lecture tant que les RPC ne sont pas installées ; ne pas annoncer l’action effective.
- E2E du composant PassageMatiere complet avec routage V2/ancien, réponses/soumission et reprise du chrono sur catalogue isolé non exécuté. Le harnais positif vérifie les commandes réelles et le reçu, pas ce composant complet.
- Sources V2 historiques importées sans métadonnées complètes restent refusées ; liens multiples/contradictoires ne sont pas tolérés. Source native avec ancien résultat de tentative différente doit encore être qualifiée exhaustivement. Composition historique spécifique à chaque version de passage non reconstituée dans le panneau : affichage actuel suit la définition enregistrée, pas une sélection explicite de version historique.
- Le panneau d’état lit une matière à la fois ; Realtime d’une autorisation créée dans un autre onglet non prouvé. Site publié inchangé.
- Le polling préexistant de ExamensBlancsPage contredit la préférence zéro polling : conservé hors scope, aucune correction non autorisée de cette règle.
