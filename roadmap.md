# Feuille de route

## 13/11 14:48 UTC — Modale présence simplifiée
- [x] Champ session retiré, correspondance interne exacte unique ; formateurs liés si disponibles/Autre et justificatifs/PDF local facultatif 4 Mo.
- [x] 28 tests PASS/3 fichiers, rendu PC/mobile inspecté, inscription réelle retrouvée et 1 formateur lié +Autre ; faux PDF refusé, fichier valide local seulement ; build OK.
- [ ] Dépôt réel/validation bloqués par analyse PDF serveur, stockage privé, rattachement journal et restauration non installés ; aucun dépôt ni publication.

## 13/11 14:40 UTC — Présence par créneau et pratique
- [x] Trois actions par créneau, confirmation preuve/identité avec rôle admin relu, pratique 0–6 h sans séance inventée ; signatures manquantes conservées, enregistrement déconnecté.
- [x] 65 tests PASS/6 fichiers ; parcours lecture réelle PC/mobile : trois boutons, avertissement de chevauchement, pratique 7 h refusée, confirmation désactivée ; build OK. Rapport docs/presence-creneaux-pratique-2026-11-13.md.
- [ ] Activation et taux/événements réels bloqués : journal exact et rattachement inscription/session absents, arbitrage des anciennes validations et protection EDOF/lecture propriétaire/restauration à prouver. Aucune écriture/publication.

## 13/11 14:36 UTC — Motif facultatif pour ajout de présence
- [x] Motif facultatif, null si vide, 200 caractères maximum ; auteur/date serveur/heures/date présence et verrou double-clic inchangés.
- [x] 28 tests PASS/4 fichiers, build OK ; lecture authentifiée sans écriture. SQL accepte null ; exigence distincte de motif pratique après gel conservée. Aucune écriture/publication.

## 13/11 14:33 UTC — Durées PDF signatures manquantes
- [x] Colonne durée, total exact en minutes, dates/horaires/formateur/signature manuscrite 53×30 mm conservés ; doublons exclus, total union des intervalles même date ; horaires inconnus signalés.
- [x] 29 tests PASS/3 fichiers ; 5 pages converties/inspectées puis réinspection après correction de l'ordre matin/après-midi ; PDF réel CHERNI 390 min/3 créneaux A4 et téléchargements PC/mobile confirmés ; build OK, aucune écriture/publication.

## 13/11 14:26 UTC — Annulations individuelles et heures restant à signer
- [x] Confirmation Supprimer/restaurer préparée, rôle relu et journal append-only candidat ; transport réel débranché, originaux préservés.
- [x] 6h30 brut depuis trois créneaux, compteur à justifier distinct sans déduction date-only ; Documents distingue 33h30 signatures +4h net, 37h30/40 connu, contrat non prouvé.
- [x] 69 Vitest PASS/9 fichiers +1 contrat SQL jetable (14 assertions), PC/mobile fictifs inspectés ; lecture authentifiée composants/dossier réel 6h30 confirmée, build OK, empreinte SELECT intacte. Rapport docs/presence-actions-2026-11-13.md.
- [ ] Mise en service bloquée par journal serveur non installé, protections jalons/relevés et parité propriétaire à prouver ; aucune écriture réelle/publication.

## 13/11 14:18 UTC — Rectification du dénominateur présence CHERNI
- [x] Lecture seule : session soir 40 h par défaut, heures configurées NULL, aucun contrat devis ni catalogue lié ; aucune inscription pratique, heures individuelles NULL. Le supplément 6 h vient du code, pas du dossier.
- [x] Supplément pratique implicite retiré de la projection commune, durées explicites préservées ; 33,5/40=83,75%, 39/40=97,5% et 37,5/40=93,75% vérifiés.
- [x] 94 tests PASS dans 8 fichiers ; PC/mobile projection fictive inspectée, build OK 14:21:22 UTC ; empreintes dossier/session inchangées, aucune écriture réelle ni publication.
- [ ] Parité élève authentifiée/événements distants bloquée par droits admin-only déjà constatés ; aucun droit élargi.

## 13/11 14:15 UTC — Incident signatures tardives, accord de publication ciblée
- [x] Isolation contrôlée contre production de7e9a862 : HEAD inclut 12 fichiers présence CHERNI non validés ; publication globale interdite par la demande.
- [x] Production route régularisation présente ; trigger accepte autorisation exacte et horodatage serveur ; 30/10 matin : 12 images existantes, zéro feuille réellement vide, zéro autorisation active exacte.
- [x] 12 tests tardif PASS ; appel réel liste sans session refusé 401 (ne prouve pas un parcours signé). Aucun déploiement ni signature réelle.
- [ ] Correctif ciblé bloqué : nécessite version isolée de la version publiée + autorisation nominative/motif/preuve/créneaux et circuit atomique installé/vérifié ; jamais remplacer les images existantes du 30/10.

## 13/11 — Présence administrative Tarek CHERNI (aperçu seulement)
- [x] SELECT CHERNI Tarek : 2010 minutes signées, validation 17/09 chevauche 90 min, 18/09 ajoute 240 ; résultat prudent 37h30/46 =81,5%, supplément 39h non prouvé.
- [x] Projection minutes commune aperçu, conflits explicites, événements locaux/focus/reconnexion ; rapport docs/presence-admin-cherni-2026-11-13.md.
- [x] 80 tests PASS, PC/mobile projection fictive inspectée, compilation OK, empreinte validations identique, aucune écriture/publication.
- [ ] Parité élève réelle et événements distants : table admin-only et absente publication Realtime, circuit propriétaire sûr non installé ; jalons protégés inchangés. NO-GO.

## 13/11 13:38 UTC — Fiabilisation globale EB1–6 TAXI/VTC
- [x] Inventaire SELECT global : 3392 passages/159 comptes, 7003 reçus/193 comptes, 979 copies à reçu pending périmé, 1381 autosaves exacts/65 comptes ; rapport docs/eb-coherence-globale-2026-11-13.md avec exclusions et limites.
- [x] Adaptateur partagé aperçu sur liste/détails/ouverture/Notes/CRM/session, statut correction/publication/revue distinct, ID exact prioritaire F/G, événements reset/tentative ; aucune écriture réelle.
- [x] Contrôle admin en lecture seule réexécutable ajouté, pages clés 100/annulation/seconde lecture ; parcours navigateur réel exhaustif non prouvé.
- [x] Matrice EB1–6 × 7, PC/mobile fictifs inspectés, suite complète exécutée (4918 PASS/3 FAIL/13 SKIP), deux timeouts passent au rejeu ; build OK, NO-GO documenté.
- [ ] Sécurité/restauration et parcours élève réel/live/panneau global : preuves manquantes, aucune publication autorisée.
- [ ] File multionglets : échecs intermittents existants non résolus, hors adaptateur notes ; parité reprise parent legacy complète non prouvée. NO-GO.

## 13/11 13:25 UTC — Audit MEMDOUH Ilies EB6 TAXI
- [x] SELECT sept matières définitives, G 17, général 14 ; 18 QRC corrigées, zéro ouvert, deux copies G conservées ; source secondaire ambiguë et sept autosaves anciens prouvés.
- [x] Correctif affichage aperçu : copie native indépendante commune, sauvegarde exacte déjà remise ne propose plus reprise, signal de tentative live ; 78 tests PASS, PC/mobile fictifs inspectés, admin PC réel confirmé.
- [x] Rapport docs/memdouh-eb6-audit-2026-11-13.md ; cinq empreintes avant/après identiques, build OK, aucune écriture réelle ni publication.
- [ ] Compte élève réel, corrections live réelles et mobile admin : non prouvés sans flux autorisé ; publication attend accord/garde-fous. Polling parent existant inchangé, chantier distinct soumis au choix utilisateur.

## 13/11 13:19 UTC — Audit note Sécurité routière Pogos SARKISIAN
- [x] SELECT : EB6 TAXI C/securite, 20 QCM remis, 12/20 définitif publié 09:38:02 UTC ; fiche secondaire absente, six autres valeurs correspondent exactement. Zéro écriture réelle.
- [x] Correctif lecture seule aperçu : projection exacte de matière native sans fiche, aucune création de résultat ; 54 tests PASS, PC admin réel 12/20 et moyenne 10,7 définitive, build OK.
- [x] Rapport docs/sarkisian-securite-eb6-audit-2026-11-13.md, empreintes avant/après identiques ; aucune note/tentative/signature modifiée, aucun recalcul enregistré ni publication.
- [ ] Mobile visuel/compte élève direct non prouvés ; capture masquée par menu, aucun compte élève dédié autorisé. Site publié inchangé, diffusion attend accord explicite.

## 13/11 13:10 UTC — Signature tardive d’émargement (aperçu uniquement)
- [x] Audit SELECT : date Paris égale aujourd’hui dans RPC/Edge, remplacement refusé, bouton passé divergent ; 30/10 : 12 matin + 12 après-midi signées, zéro autorisation exacte, aucune identité déduite.
- [x] Aperçu confirmation/conservation des preuves et recherche exacte, flag OFF ; candidat SQL atomicité/journal + Edge PNG non branchés, aucune présence inventée ni remplacement.
- [x] 62 Vitest + 25 SQL existants + 26 SQL candidats + 6 Deno PASS, PC/mobile fictifs inspectés, empreintes finales identiques, build OK ; rapport docs/emargement-tardif-audit-2026-11-13.md.
- [ ] Circuit complet : migration/Edge non installés, ancien INSERT/handler à couvrir, relecture/PDF et accès réel non prouvés ; horaires par session pratique exacte à certifier.
- [ ] Activation : bloquée par validation explicite et sauvegarde/restauration ; aucune écriture réelle, installation ou publication autorisée.

## 13/11 12:17 UTC — Bilan examen HASSEN BENKHELIL invisible
- [x] SELECT : cinq exercices historiques module 11 marqués remis, un brouillon, aucun passage figé/futur ; l’onglet ne lit pas cette source historique. Droits admin présents.
- [x] Consultation historique en lecture seule ajoutée, révisions/brouillons exclus, notes non vérifiées nulles ; 13 tests PASS, compte admin réel PC et compteur mobile vérifiés ; empreintes inchangées, build OK. Aucun envoi/migration/publication.

## 13/11 12:06 UTC — Contrat de location : signature par mail
- [x] Retirer les mentions résiduelles de brouillon de la version finale ; garder les contrôles assurance/permis et le brouillon disponible.
- [x] Préparer section mail CRM, écran client et noyau injecté isolé : empreinte/consentement, réservation envoi/renvoi et quarantaine inconnue. Flag OFF, aucune activation.
- [x] 47 tests PASS, PC/mobile fictifs PASS et build OK ; limites dans docs/location-signature-mail-2026-11-13.md.
- [ ] Envoi/renvoi réels et PDF signé durable : bloqués par circuit atomique non installé, pièces assurance et restauration complète non prouvées ; aucun mail réel ni publication.

## 13/11 10:51 UTC — Préremplir les contrats de location de tous les apprenants
- [x] Coordonnées de la fiche CRM dès l’ouverture, même sans dossier de bienvenue ; dossier complété du même apprenant prioritaire et fiche en complément des champs absents. Champs inconnus laissés vides, signatures/permis non copiés.
- [x] 33 tests PASS ; navigateur PC/mobile fictif : préremplissage, relecture sans écraser la saisie et changement de dossier sans fuite PASS ; build OK. Aucune écriture réelle ni publication ; parcours réel non exercé.

## 13/11 10:13 UTC — Suite HADDOU F/G et révisions
- [ ] Examiner journaux immuables et empreintes ; aucune liaison par temps/texte seul.
- [ ] Préparer reset/revue admin append-only en environnement jetable, sans activation.
- [ ] Terminer lecture par question des rounds confirmés de la même source.
- [ ] Tests ciblés/globaux, PC/mobile fictifs et SELECT avant/après ; rapport GO/NO-GO.

## 13/11 09:56 UTC — HADDOU EB6 TAXI F/G et dernières réponses
- [x] Audit SELECT : deux passages natifs par matière, aucune importation/reçu ; dernier résultat t2 opposé à projection ancienne t1 sans suffixe, liaison legacy/V2 non univoque. Reset maintenu verrouillé ; aucune écriture réelle.
- [x] Aperçu : réponses natives et file de leur seul attempt_id, aucune recopie/remappage implicite d’ancien passage ; projection révision distincte et refus des brouillons d’autres sources. 135 tests ciblés et 4 754 suite complète PASS/13 ignorés/0 FAIL, PC/mobile avec backend fictif, empreintes identiques et build OK.
- [x] Rapport docs/haddou-eb6-fg-dernieres-reponses-2026-11-13.md avec références exactes sans réponses privées.
- [ ] Liaison immuable legacy/V2 manquante : reset F/G non débloqué ; dernière révision multi-round par question non entièrement livrée (sources absentes bloquées, pas de rapprochement inventé).
- [ ] Publication NO-GO : restauration complète et isolement public non prouvés, vrai compte élève non exercé ; polling préexistant 8 s à arbitrer séparément.

## 13/11 09:45 UTC — Boutons F(T)/G(T) TAXI
- [x] Audit SELECT : F=reglementation_taxi, G=reglementation_taxi2 dans EB1–6 TAXI ; RPC présentes/droits authenticated, anon refusé ; aucun incident correspondant journalisé. Cause individuelle non prouvée sans identité/erreur ; aucune identité déduite.
- [x] Aperçu : refus lisible, relecture explicite après erreur, réponses tardives invalidées et confirmation par matière. 21 Vitest + 10 SQL + 14 contrats déclencheurs PASS, boutons réels avec serveur fictif PC/mobile PASS ; build OK. Rapport docs/taxi-fg-reset-2026-11-13.md.
- [ ] Publication NO-GO : restauration complète non prouvée ; aucun reset, écriture réelle ou migration autorisé.

## 13/11 09:08 UTC — Urgence BENNANI et signatures après formation
- [x] BENNANI : EB5 47 marqueurs/une QRC vide, refus local confirmé ; retour vers question manquante et version de reprise corrigés en aperçu. 42 tests ciblés PASS, PC/mobile fictifs sans écriture, build OK ; rapport docs/benani-revision-eb5-2026-11-13.md.
- [ ] Signatures après formation : préciser attestation ou régularisation de présence, conserver dates réelles et preuves.
- [ ] Publication bloquée par sauvegarde/restauration non prouvées ; suite globale 4 734 PASS/1 FAIL sous charge (panne 30 candidats, 7/7 PASS seule). Aucune publication ni migration réelle.

## 13/11 08:49 UTC — Correction visible Q3 EB5 VTC
- [x] Audit SELECT : éditeur 90004 et publication EB5 v10 portent C « 4 minutes » ; 53 snapshots portent C « 8 minutes ». Realtime exam_content_versions absent.
- [x] Affichage distinct du corrigé administrateur enregistré, identité exacte/aucune association de réponse sur texte modifié, événements sans nouveau polling ; copies/notes intactes.
- [x] 46 tests ciblés, suite 4 727 PASS/13 ignorés/0 échec, build OK ; navigateur PC/mobile fictif sans recharge et sans écriture. Rapport docs/eb5-correction-visible-2026-11-13.md.
- [ ] Publication NO-GO : restauration complète non prouvée ; compte apprenant et livraison Realtime inter-appareils réels non vérifiés. Aucune écriture réelle ni publication.

## 12/11 23:19 UTC — Qualification publication conditionnelle stabilisation
- [x] Comparaison site public/HEAD : 12 fichiers, trois fichiers applicatifs ; location/attestation absentes du delta, SQL auto-QRC de revue non installé constaté.
- [x] 77 tests ciblés, suite globale 4 680 réussis/3 échecs ; fixture manquante reconstituée sur cluster jetable (5 SQL + 2 lecteurs PASS), deux échecs textuels restent.
- [x] Empreintes SELECT avant/après identiques : 216 copies, 216 notes, 488 QRC, 3 328 réponses EB5 ; aucune écriture réelle.
- [x] 13/11 : stockage refusé, deux onglets, envoi en vol, appel figé, tests globaux (4 704 OK), scan frais (rien de nouveau) — corrigés/prouvés en aperçu.
- [ ] Publication NO-GO : sauvegarde complète/auth/fichiers et restauration isolée non accessibles/non prouvées. Rapport docs/stabilisation-go-no-go-2026-11-12.md.

## 12/11 21:04 UTC — Vérification directe sauvegardes et poursuite aperçu
- [x] Santé Cloud et inventaire stockage lus ; manifestes privés 11/12 relus avec session admin, deux lots de 10 000 clés vérifiés sans écriture.
- [ ] Restauration complète isolée : bloquée par absence d'outil inventaire/export/restauration Cloud et d'export complet disponible ; exports applicatifs incomplets, fichiers de stockage non sauvegardés par ce circuit.
- [x] 74/74 tests fictifs PASS dans 9 fichiers, dont panne six minutes accélérée/30 candidats/90 réponses ; une lecture répétée du profil supprimée en aperçu, deux fichiers privés lus HTTP 200 ; rapport docs/stabilisation-2026-11-12.md, build OK.
- [ ] Optimisation complète cours/historique et E2E réel isolé : cible sans données réelles/export complet non disponibles ; arbitrage rafraîchissement périodique versus règle zéro polling demandé. Aucun gain de latence réel revendiqué, aucune publication/migration/écriture réelle.

## 12/11 18:51 — Réinitialisation d’une matière dans l’examen actif
- [x] Audit lecture seule catalogue réel/admin/serveur/reprise élève : circuit ciblé sans reset global, copie ouverte refusée, confusion repassage isolé/passage général identifiée.
- [x] Séparation des reçus isolés préparée flag OFF, confirmation périmètre/exception copie vide précisée ; 35 Vitest + 23 SQL jetables PASS, reload/remise QCM PC/mobile fictifs PASS, build OK. Rapport docs/reset-matiere-active-2026-11-12.md.
- [ ] Demande complète bloquée par l'identité explicite passage général/remplacement et la neutralisation serveur des copies ouvertes avec réponses ; projection À refaire/global provisoire et matrice 7 matières/QRC non livrées. Aucune mutation réelle ni publication.

## 12/11 18:47 — Déblocage attestation autorisé
- [x] Retrait du verrou pédagogique ; préparation avec représentant et autorisation signature centre, envoi après enregistrement et confirmation admin ; e-learning sans durée obligatoire ni inventée. Fermeture automatique différée avec accord explicite.
- [x] 35 tests PASS : préparation sans modules/durée, envoi unique, vraie signature, dates CRM ; fiche Léa authentifiée vérifiée en lecture seule, prête à enregistrer ; fonctions ciblées déployées, build OK.
- [ ] Envoi/signature réels non exécutés (aucun mail ni document réel créé) ; publication du frontend non effectuée.

## 12/11 18:25 — Contrat location véhicule
- [x] Audit SELECT dossier Mamadou SOW et trois véhicules ; onze articles lus, tableau risques/fondements/propositions disponible dans le bouton Revue juridique.
- [x] Aperçu préremplissage fiable sans signature CMA, choix véhicule explicite, Avec/Sans caution, PDF brouillon non signable ; aucune écriture/envoi/publication.
- [x] 15 tests fictifs PASS ; CRM authentifié lecture seule, deux PDF téléchargés sur fiche fictive, quatre pages rendues PC/mobile, réseau en erreur/relecture et saisie protégée testés ; build OK.
- [ ] Activation bloquée par assurance/avenant location-examen, calendrier de disponibilité, aptitude/contrôle applicable et revue juridique (statut client, médiateur, franchises, tarifs, RGPD) à fournir/valider ; aucun stockage ni circuit de signature location activé.

## 12/11 18:23 — Bouton Envoyer par mail visible
- [x] Action visible sur le brouillon et les attestations à envoyer, motif du blocage explicite ; aucun contournement ni mail réel. 13 tests PASS dont rendu du vrai onglet avec dossier fictif complet/non certifié ; build OK.
- [ ] Activation bloquée par certification/fermeture compte non actives ; rendu authentifié PC/mobile non vérifié, aucune publication.

## 12/11 18:19 — Fermer le compte après envoi attestation
- [x] Orchestrateur isolé lié au document envoyé, garde compte unique/non admin, erreur explicite et rejeu sans transport de mail ; aucune écriture réelle branchée.
- [x] Audit SELECT des trois contrôles serveur : archivage/ban seuls ne prouvent pas la fermeture d'un JWT déjà émis ; 20 tests PASS (8 fermeture + 12 circuit/signature publique), Deno check et build OK.
- [ ] Activation bloquée : garde serveur des sessions déjà ouvertes et matrice lectures/RPC/écritures à sécuriser et tester sur compte fictif autorisé ; aucune désactivation, migration ou publication réelle. Rapport docs/attestation-fermeture-compte-2026-11-12.md.

## 12/11 18:16 — Date attestation limitée à la fin CRM
- [x] Plafond partagé aperçu/préparation serveur : dernière connexion limitée à la fin des cours en ligne CRM (sinon fin de formation), horodatage original et plafond conservés dans le nouveau modèle ; date absente/invalide = refus. Envoi recontrôle la date figée sans modifier les anciens documents.
- [x] 44 tests PASS : 31/10/2026, frontière Paris, connexion antérieure, limite absente/invalide, date CRM avancée avant envoi, circuit et PDF ; Deno check PASS, build OK. Aucune connexion, signature ou donnée réelle modifiée, aucun envoi.
- [ ] Mise en service : aucun déploiement/publication ; attend validation explicite. Parcours réel envoi non exécuté pour préserver les données.

## 12/11 18:12 — Arrêter les relances après l’attestation
- [x] Garde partagée avant transport dans les 11 relances, 2 envois nominatifs anciens et mode relance pratique ; lecture exacte non cachée et paginée des attestations, erreur = refus. Mails ordinaires/authentification/signature inchangés.
- [x] 30 tests PASS dont 12 garde attestation, vérification Deno des 15 fichiers PASS, build OK ; champs réels vérifiés par SELECT, aucun mail réel ni modification des preuves. Envoi réel bout-en-bout non testé.
- [ ] Mise en service : déploiement ciblé après validation explicite, sans publication globale.

## 12/11 17:37 — Modèle officiel attestation, non valable sans preuve
- [x] Formulation officielle ; sans certification, champs génériques dans le texte et filigrane MODÈLE NON VALABLE, alertes hors PDF ; enregistrement du nouveau modèle bloqué sans preuve globale, historiques intacts.
- [x] 32 tests PASS ; PDF Léa réel exporté en lecture seule, texte générique/non valable sans heure ni certification nominative ; complet fictif et A4 inspectés indépendamment, mobile réel rendu vérifié. Répétition « formation Formation »/e-learning corrigée ; aucune superposition. Aucun envoi/publication.
- [ ] Certification officielle disponible pour dossiers complets : preuve globale serveur et autorisation tampon/double signature figée non branchées ; modèle final reste bloqué, sans migration ni écriture réelle.

## 12/11 17:27 — Notes apprenant : examens officiels / Bilans
- [x] Six EB officiels avec détail pondéré et graphique ; Bilans réels et révisions séparés, À revoir conservé en bas ; lecture seule.
- [x] Tests pondération/tentatives/attente/isolation, PC/mobile fictifs, Rodrigue réel CRM et panne/retry vérifiés ; rapport docs/notes-officielles-eleve-2026-11-12.md.
- [ ] Publication : confirmation utilisateur et contrôle compte apprenant direct/mobile CRM (remontage parent)/barème historique global non disponibles ; aucun déploiement/publication.

## 12/11 17:19 — Retouche attestation professionnelle
- [x] Intitulé référentiel sans doublon, liste pédagogique issue des verdicts serveur (sinon détail à vérifier), aucun motif d’heures dans le nouveau PDF ; contrôles et documents historiques inchangés.
- [x] 31 tests PASS, exports complet/incomplet et consultation PC/mobile fictifs ; inspection indépendante PDF : contradiction du cas complet corrigée, aucune durée ni chevauchement. Identité/modules Léa vérifiés par SELECT, mais verdict RPC refusé et session navigateur sans accès admin : PDF réel Léa NON PROUVÉ. Aucun état réel modifié, aucune publication.

## 12/11 17:16 — Contour dernier module apprenant
- [x] Cadres rouges retirés des cartes ; contour bleu 3 px seulement sur dernière activité horodatée/ID attribué, sans repli connexion/nom/achèvement ; aucune mutation.
- [x] 5 tests PASS (identité, ordre, datation absente, égalité, hors parcours) ; aperçu administrateur Anis PC/mobile : un seul contour bleu, autres cartes grises, aucun débordement. Build OK ; aucune publication. Compte apprenant direct non testé.

## 12/11 17:12 — Chargement visible Notes par session
- [x] Étapes de lecture réelles, compteur seulement pour candidats/tableau mesurables, temps écoulé sans estimation inventée ; résultats partiels visibles, notes précédentes conservées en actualisation.
- [x] 15 tests PASS : journée/soirée/vide/lent/erreur/changement session/timeout/notes et filtres conservés ; Chromium PC/mobile fictifs PASS, aucun débordement ni erreur JS. Build OK, aucune donnée réelle modifiée, aucune publication ; vrai chargement authentifié non vérifié.

## 12/11 17:03 — Bandeau questions fausses et preuve durable
- [x] Audit SELECT : 221 clôtures, 109 sans reçu (2 couverture complète/sources seulement), 36 reçus sans sources avec sources dans leur propre reprise ; aucun rattrapage.
- [x] Correctif aperçu : lecteur exact paginé couverture/résultat/sources, références terminales conservées, grand bandeau partagé, erreur/retry, contrôle submitted complet ; tests réseau/double clic/partiel/concurrence/historique et PC/mobile fictifs PASS.
- [ ] Activation/publication : finalisation Bilan non installée, matrice authentifiée toutes filières/EB/jour/soir et deux onglets navigateur non prouvée ; dossiers non nommés, autorisation nominative nécessaire pour les 2 rattrapages. Aucun état réel modifié.

## 12/11 17:01 — Refonte visuelle attestation
- [x] Logo officiel exact retrouvé ; modèle et circuit existants lus, plan préparé.
- [x] PDF A4 logo officiel/sans durée, aperçu tactile/téléchargement, brouillon non valable sans affirmation totale, exports signés historiques inchangés ; export et inspection indépendante des deux PDF, PC/mobile fictifs PASS, aucun chevauchement.
- [ ] Modèle final : preuve globale serveur figée et autorisation tampon absentes, circuit final non branché ; réel Léa non atteint par session de contrôle. Publication en attente de validation, aucun envoi réel. Rapport commun docs/attestation-et-bandeau-revision-2026-11-12.md (120 Vitest distincts + 4 SQL PASS).

## 12/11 16:49 — Sauvegarde durable des questions fausses
- [x] Audit Bilan futur uniquement en mémoire + archive historique recouvrant la reprise ; modules/EB utilisent déjà la file partagée. Pilotes/corrigés courants OFF conservés, zéro mutation réelle.
- [x] Aperçu : file commune, identité reçu/version, accusé/relecture, reprise hors ligne, admin lecture ; priorité historique corrigée. 78 tests ciblés PASS, 4 contrats SQL et vrai handler HTTP jetables PASS, navigateur PC/mobile PASS ; rapport docs/bilan-revision-durable-2026-11-12.md.
- [ ] Mise en service : finalisation dédiée non installée (candidat testé jetable), rounds/finalisation des historiques TA/VA et matrice complète EB/jour/soir encore non prouvés ; aucune publication.

## 12/11 16:47 — Note Anis toujours masquée
- [x] Confusion remise/reçu corrigée avec preuve des réponses figées ; 16 tests PASS et écran administrateur réel : Sécurité EB4 13/20, général 12,3/20 définitif (Français 4 éliminatoire). Aucune publication ni mutation des copies.

## 12/11 16:38 — Copie récente dans Notes par session
- [x] Dernière remise V2 par apprenant/examen/matière projetée avec ses propres réponses et note, après cutoff de remise à zéro ; notes différentes/attente/zéro/égalité de date/sources conservées : 18 tests PASS, build OK. Aucune publication ni mutation réelle ; écran authentifié réel non vérifié.

## 12/11 12:57 — Corrigé courant entraînement F/G VTC
- [x] Q18/Q19 identifiées module 5/505, corrigé A+C enregistré ; 32 snapshots 505 portent UID Q18. Lecteur installé réservé EB publiés, inutilisable pour ce Bilan ; candidat owner/remis F/G préparé, non installé.
- [x] Relecture à chaque entrée/démarrage/vérification, dernier choix conservé seulement si identité/options concordent, erreurs sans repli figé ; 16 Vitest et 16 PostgreSQL jetables PASS, deux parcours PC/mobile PASS. Installation serveur reste nécessaire ; aucun compte réel, publication ou écriture production.

## 12/11 12:50 — Accès direct Questions QRC VTC
- [x] Entrée après F/G vers carte historique 1794399472264, sélection après hydratation et retour ; notes F/G et SQL inchangés.
- [x] 10 tests PASS, quatre parcours PC/mobile élève/admin : ordre Anglais/F/G/QRC, carte et lien exact cliqué, retour/rechargement, zéro mutation. Aucune publication ; écran réel non vérifié. Diff isolé documenté dans docs/bilan-vtc-qrc-direct-2026-11-12.md.

## 12/11 12:44 — Remises F/G dans le nouveau Bilan VTC
- [x] Remises originales 505/506 dans étapes et récapitulatif partagé, révisions exclues, bonnes/total explicités, 5/7 séparé du résultat A–E ; refus de lecture honnête.
- [x] 13 tests PASS et quatre parcours PC/mobile élève/admin PASS, clics F/G/retour, zéro mutation admin ; menu F/G présent dans asset public. Aucun compte réel/publication ; rendu réel sans capture non vérifié. Rapport docs/bilan-vtc-remises-fg-2026-11-12.md.

## 12/11 12:30 — Prévol installation accès EB unitaire
- [x] Catalogue SELECT : RPC/journal/gardes absents ; session VTC/TAXI 11–24/01/2027 planifiée, future, 2 inscrits ; frontend public unitaire présent, EB cible inconnu.
- [x] Candidat comparé ; 22 scénarios jetables = 20 PASS/2 blocages reproduits, 43 Vitest PASS ; procédures transaction/retrait conservant journal documentées.
- [x] NO-GO précis : première réponse Edge sans timer non gardée, import historique en_cours refusé ; canal canonique inactif non couvert et effets complets non certifiés. Rapport docs/session-exam-access-prevol-2026-11-12.md ; aucune installation/compte/fermeture/publication.

## 12/11 12:22 — Énoncé cliquable éditeur EB
- [x] Carte identifiée : AdminExamQuestionCard dans MatiereEditor ; édition locale du seul énoncé via updateQuestion, sauvegarde CAS/relecture/publication existantes inchangées.
- [x] 25 tests PASS, deux parcours PC/mobile vrai éditeur avec transport simulé : QRC/QCM, rechargement, variante VA liée, EB2/identités distinctes, copie figée, réponses inchangées, refus/retry. Build OK. Rapport docs/eb-enonce-clic-2026-11-12.md.
- Écran apprenant authentifié et publication V2 complète non vérifiés ; aucun compte réel, aucune publication ou donnée réelle. Aucun autre chantier modifié.

## 12/11 10:49 — Révision Sécurité routière VTC
- [x] Diagnostic SELECT : Q71 éditeur B, anciennes clés A ; Q226 D dans toutes les sources contrôlées, sélections C+D encore fausses. Cas individuel/cache inconnu ; aucun compte réel.
- [x] Lecture propriétaire/remise préparée uniquement en SQL local ; entraînement sans écriture pour reçu futur ou snapshot 5/502. Identité+énoncé+options ordonnées exigés. Version future ancienne : seules les deux correspondances auditées, autres exclues.
- [x] 14 tests Vitest, 10 contrats PostgreSQL jetables, quatre simulations entraînement PC/mobile et quatre régressions F/G admin/élève PASS ; build OK. Rapport docs/bilan-vtc-sr-training-2026-11-12.md.
- [ ] Mise en service : attend accord explicite pour installation ciblée du lecteur serveur puis livraison ; aucun lecteur installé, aucune publication. Historique legacy sans snapshot et cache réel non vérifiés.

## 12/11 10:23 — F/G après Anglais
- [x] Raccourcis du haut retirés ; étapes partagées A–E puis F/G par contexte VTC, IDs 505/506 et retour inchangés ; H/QRC à leur emplacement existant. 25 tests PASS, quatre parcours simulés PC/mobile × admin/élève (ordre géométrique E<F<G, clics F/G et retour, zéro mutation admin). Build OK ; aucune publication ni compte réel. TAXI hors contexte inchangé ; cas réels non vérifiés.

## 12/11 10:14 — Accès directs F/G nouveau Bilan VTC
- [x] Raccourcis 505/506 avant A–E ; ciblage après réhydratation prioritaire sur ancienne page/résultat, F→G→A–E et reload G→F, réponses B et H/QRC préservés. Quatre parcours Playwright PC/mobile × admin/élève simulés, ancien menu VTC présent, 34 tests PASS ; aucun compte réel ni publication. Diff versus production d7e00d6 limité au correctif et ses tests/journal ; cas réels et soumission complète non vérifiés.

## 12/11 09:59 — Présentation admin nouveau Bilan VTC
- [x] Cartes matière/questions, noms/ordre/étapes et résumé remis partagés sans effets ; admin module 5 uniquement lecture autorisée, pas de composant élève monté. PC/mobile fixtures comparés, zéro appel mutateur admin, 12 tests PASS. Compléments/TAXI préservés, aucune publication. Limites/proofs docs/bilan-vtc-presentation-admin-2026-11-12.md.

## 12/11 09:49 — Carte QRC VTC résiduelle
- [x] Carte serveur 1794399472264 exposée au lieu de 9001 dans les compléments futurs ; lien exact unique cliqué en aperçu admin (aucun appel pédagogique mutateur) et route VTC simulée, TAXI exclu par test. 20 tests PASS, F/G/H préservés. A–E demande son ouverture habituelle dans la simulation élève, interceptée ; aucune écriture réelle ni publication. Complément isolé documenté.

## 12/11 09:45 — Correction horaires convocation FC
- [x] Remplacer uniquement les horaires affichés par 9h–12h / 13h–17h ; mémoriser la correction, conserver données et mails historiques, aucun envoi ni publication.

## 12/11 09:28 — Deux urgences isolées
- [x] Bilan VTC : 505/506/507 et cours 9001 rendus via legacy, filtre navigation seul ; 49/46/48 et réponse B fictive restaurée vérifiés PC/mobile sans mutation. A–E/TAXI inchangés.
- [x] Sauvegardes : comptage bloquant prouvé, pages lisibles, divergences de concurrence distinctes ; correctif fonction seule déployé, comptes facultatifs, conflits de lots refusés, empreintes et tests reprise exécutés. Bucket privé, aucun cron global/restauration.
- [x] Rattrapage borné effectivement réalisé : 10000 lignes journal pour chaque nuit, relecture 10000 clés uniques/ordre/empreinte ; marqueurs historiques conservés, aucun terminal de réparation encore présent.
- [ ] Achever les deux réexports : débit borné nécessaire pendant l'activité élèves, journaux volumineux ; autres trois tables du 12 pas encore atteintes. Pas de chaîne intensive. Couverture cohérente/restauration NON PROUVÉES.
- [x] Rapport docs/urgences-bilan-sauvegardes-2026-11-12.md, 59 tests finaux PASS, build OK ; mise en service frontend isolée expliquée sans publication globale.
- [ ] Publication Bilan isolée et soumission legacy complète : bundle public isolé/qualification du parcours serveur encore nécessaires ; aperçu global non publié.

## 12/11 09:22 — Convocations FC et répétitions
- [x] Présentation FC de la convocation formation : 9h–13h / 13h–17h, sans cours en ligne ni consignes d'examens initiaux ; récapitulatif, identité, date et ancienne signature non répétés. Classification par session FC même avec fiche VTC.
- [x] 12 tests PASS ; aperçu admin réel Ali Reziki contrôlé sans confirmer l'envoi, générateur PC/mobile vérifié, build OK. Aucun modèle enregistré, droit, donnée ni publication modifié. Mail séparé de confirmation FC hors périmètre.

## 11/11 18:49 — Présence à la date de l’examen choisi
- [x] Aucun planning liant session/EB/date identifié ; contrôle d’accès non installé et agenda sans identité session/EB probante. Alpha Barry : 11/11 matin signé 08:56:41 Paris, après-midi technique sans image, zéro papier/validation ; EB de la capture inconnu.
- [x] Date explicite sans présélection par session/examen, vue Tous sans badge ; lecture exacte par lots, horloge serveur existante, présence journalière valable prioritaire, Absent déclaré distinct de Non émargé.
- [x] 21 tests exécutés ; aperçu fixtures historique/futur/technique/signé/absence/changement EB et admin réel Alpha sans badge le 11/11. Aucune note, registre, migration ou publication modifiée.

## 11/11 17:52 — Notes par session autonome
- [x] Onglet principal après l'archive QRC, référentiel CRM seul (sessions sans copies incluses), anciens liens redirigés avant les hooks de correction.
- [x] Admin réel Chromium : onglet actif, accès direct, retour navigateur, ancien lien avec session conservée et clic MEMDOUH vers copie nationale exacte (4 cellules) ; aucune requête de copie avant sélection, 5 tests PASS, aucune publication ni donnée modifiée.

## 11/11 17:45 — Provenance des QRC en attente
- [x] Liens issus des passages officiels réellement retenus : session CRM de la date, date, passage, examen et apprenant ; plusieurs sources affichées séparément, classification exacte lue sur ces seules copies.
- [x] MEMDOUH EB4 TAXI 30/10 : six QRC visibles/corrigeables en lecture admin réelle (4 nationale, 2 locale), test croisé deux sessions et navigateur ; aucune donnée ni publication.

## 11/11 17:41 — Absence du jour dans Notes par session
- [x] Lecture admin en lots session/jour, créneaux des inscriptions retenues tous terminés et cours prouvé par signatures des inscrits ; papier/heures/signature partielle inhibent Absent, erreur = aucun indicateur.
- [x] HAMDI confirmé absent en lecture réelle dans ses deux sessions ; 13 tests PASS et six cas navigateur fictifs PC/mobile, encadré indépendant, aucune écriture ni publication.

## 11/11 17:30 — Liens des notes en attente
- [x] Lien accessible nouvel onglet session/examen exact/apprenant stable vers À corriger, contexte vide conservé, aucun passage arbitraire ; pas de filtre matière existant, aucun identifiant déduit.
- [x] 5 tests PASS et clics navigateur fictifs Tous VTC/TAXI + cellule matière vers vrai écran simulé ; actualisation des cadres conservée, aucune mutation ni publication.

## 11/11 17:14 — Filtre EB et moyennes de session
- [x] Filtre EB/filière, tous inscrits conservés, notes matières et moyennes définitives avec n/N, aucun nouvel appel au changement de filtre.
- [x] Tests zéro réel/attente/absence/filières/session vide, fixture PC et admin réel 16 inscrits : EB1 VTC 11,3/20 (9/10) ; aucun scan global ni publication.

## 11/11 17:02 — Sessions actuelles et notes par session
- [x] Accès direct trois sessions de formation actuelles Paris inclusif, liens explicites conservés, aucun catalogue global au premier accès testé.
- [x] Notes officielles EB1–6 de tous les inscrits, chargement ciblé, états incomplets/absence/erreur sans faux zéro ; filière par ligne.
- [x] SELECT CRM et parcours admin réel 12/16/18, 70 tests PASS, PC/mobile, aucune écriture/publication ; résultat sans fiche officielle = indisponible.

## 11/11 16:44 — Timeout catalogue QRC
- [x] Complément 16:55 : 103 sessions indépendantes (458 ms), lecture ciblée novembre (7,53 s), admin réel timeout global simulé puis 157 cellules ; 46 tests PASS, aucun scan global ciblé ni publication.
- [x] Reproduction admin : catalogue apprenant_quiz_results 1000 fiches/date-sort, timeout 8170 ms.
- [x] Curseur PK 100 copies, remises seules, scan QRC supprimé ; erreur/retry et grille même filtre, archives recherche secondaire.
- [x] 7316 copies distinctes, EB1 large 664 passages/1548 QRC, novembre 68/157 ; 63 tests PASS et Chromium PC/mobile retry. Rapport avec délais variables, pas de publication.

## 11/11 16:33 — Détail des erreurs au premier essai
- [x] Audit SELECT des sources/sessions ; capture insuffisante pour identifier la question, contrôle réel EB1 Gestion id8.
- [x] Détail exact issu du calcul, exclusions/droits conservés ; 87 tests PASS, Chromium PC/mobile fullscreen, détail réel 14 comptées + 2 exclues.
- [x] Rapport docs/premier-essai-detail-2026-11-11.md ; aucune écriture réelle/publication.

## 11/11 14:58 — Confirmation interne plein écran
- [x] Confirmations révision/navigation internes au conteneur fullscreen, focus/Échap, intention périmée refusée et double envoi bloqué.
- [x] 39 tests fictifs PASS ; Chromium iframe + fullscreen natif avant/pendant/après, annuler/Échap/confirmer puis relecture 0,5/2, un seul envoi simulé ; navigation avec commentaire vérifiée ; aucune note réelle ni publication.

## 11/11 14:45 — File QRC de travail prioritaire
- [x] Précision 14:51 : grille interactive existante en premier, restantes par défaut et Toutes les notes ; filtres conservés, 53 tests PASS et grille/clic PC/mobile fictifs vérifiés ; aucune donnée/publication.
- [x] Vue par défaut QRC notables restantes uniquement ; archives/inventaire secondaires, IA À valider et non notables À vérifier séparés.
- [x] Navigation après relecture, zéro validé exclu, contexte conservé ; 53 tests PASS, aperçu PC/mobile fictif sans mutation/publication.

## 11/11 14:29 — Catalogue QRC unique
- [x] Archives/ambiguïtés intégrées au menu normal session/examen, consultation seule ; zéro entrée Ancien circuit, sources conservées.
- [x] Vrais lecteurs admin : 7304 attendues/7304 visibles/0 manquante ; 4323 archives, 2981 V2 ; 24 examens/filières. Rapport docs/qrc-catalogue-unifie-2026-11-11.md.
- [x] Tests menu/pagination/ambiguïtés et PC/mobile fictifs PASS ; 5 remises EB2 sans native signalées ; aucune mutation QRC/migration/publication.
- [ ] Navigation réelle correcteur non prouvée : sélecteurs non apparus malgré session admin valide ; vrais lecteurs exécutés et UI fixtures vérifiée.

## 11/11 14:25 — Liens CPF Qualiopi (plan approuvé)
- [x] Catalogue admin partagé installé (0271), sept adresses initiales existantes ; CAS/relecture, aucune ligne réelle modifiée.
- [x] Onglet séparé copier/ouvrir/modifier, lecture admin réelle PC/mobile et modification fictive/readback PASS ; tests URL/modèles PASS ; aucun mail/publication.

## 11/11 14:17 — Miroirs QCM/QRC catalogue
- [x] Provenance double écriture et rapprochement strict copie/contenu/réponses ; ambigu conservé.
- [x] Catalogue/compteur même preuve + régressions QCM/QRC/tentatives collisions, 1002 passages.
- [x] SELECT et projection avant/après Mamadou EB4 (6 miroirs/1 divergent), lot récent 30 (23/7) ; aucune donnée modifiée/publication.
- [ ] Affichage admin réel NON PROUVÉ : session injectée redirige vers cours-public ; tests UI fictifs uniquement.

## 11/11 14:06 — Annulation reset : intégration isolée
- [x] Sélection V2 sans grant annulé et sérialisation timer/INSERT anciens préparées/testées ; matière ancien complet + UPDATE concurrents restent NON PROUVÉS.
- [x] 5 scénarios fictifs SQL + 2 vrais lecteurs TS PASS : archivage/restauration/sept notes/QRC/admin/élève/isolation ; aucune répétition des tests acquis.
- [x] Prévol HADDOU EB3 : 7 copies/7 notes, zéro V2/timer/reçu nouveau ; rapport NO-GO production et candidat isolé revuable.
- [ ] Activation bloquée : lecteurs frontend effectifs non branchés/rafraîchissement absent ; E2E 3 écrans et concurrence matière ancien/UPDATE non prouvés ; gate FALSE, aucune installation.

## 11/11 13:55 — Accès EB multi-session
- [x] Cases multi-sessions + états réels explicites + confirmation scoped désactivée pour écriture en aperçu.
- [x] Candidat atomique séparé sur journal existant, tests invalidité/CAS/droits/frontières démarrages/reprises/croisées et mobile ; chemins RPC complets anciens/TA/VA restent NON PROUVÉS avant activation.
- [x] Rapport RPC/limites préparé ; aucune installation ni accès réel modifié.

## 11/11 13:48 — Reprise archives : vrai admin et contrôles intégrés
- [x] Vrai profil admin en aperçu : fiche HADDOU → Examens blancs → Examens archivés ; reset EB3 exact, 7 copies/7 résultats visibles, bouton désactivé. Aucun POST mutateur autorisé.
- [x] 31 contrats SQL PASS + 1 scénario intégré schéma/triggers réels PASS + 17 Vitest PASS : RLS inter-apprenant, rejeux/conflits, résultats ancien/V2 réexposés via vues sans mutation des sources ; démarrage V2 reproduit le refus CANCELLED_RESET_GRANT, ancien reçu/timer prouvé sur examen distinct.
- [x] Rapport actualisé avec lien fiche aperçu, chemin exact (onglet Examens blancs, pas Remise à zéro des cours), SELECT final inchangé, build OK ; aucune production/migration/publication. Mobile réel capture masquée par navigation, non compté PASS visuel.
- [ ] Activation annulation BLOQUÉE : lecteurs/frontend et fonctions brutes à convertir ensemble, garde legacy/timer concurrente et vrai flux élève/CRM/QRC encore non prouvés. Gate false et confirmation désactivée ; consultation réelle des archives disponible sans migration.

## 11/11 13:42 — Sélecteur sessions accès EB
- [x] Sessions présentielles compatibles en cours/futures seules, catalogue existant, tri Paris inclusif, Select accessible, rouge en cours et aucun UUID/préchoix.
- [x] 31 tests PASS, PC/mobile fixture liste ouverte et invalidation immédiate vérifiés ; aucune mutation/migration/publication. Rapport docs/session-exam-access-selecteur-2026-11-11.md ; UI admin authentifiée réelle non testée, serveur candidat toujours non installé.

## 11/11 13:37 — Annulation ciblée d’un reset / Examens archivés
- [x] Onglet admin/confirmation exacte en aperçu, enregistrement toujours désactivé, aucun reset réel.
- [x] Candidat séparé append-only + trois projections préparé, 28 contrats jetables PASS et 17 Vitest PASS ; non installé.
- [x] SELECT HADDOU EB3 : 7 copies/7 notes définitives/0 démarrage après reset, grant intact ; EB4 : grant consommé et 5 nouveaux démarrages, refus obligatoire. Autres resets intacts.
- [x] PC/mobile fixture vérifiés, compilation OK ; rapport docs/examens-archives-annulation-reset-2026-11-11.md.
- [ ] Activation BLOQUÉE : lecteurs bruts cutoff/neutralisations et chemins serveur/legacy/consommation ne couvrent pas encore les projections et verrou commun. Gate SQL false, bouton confirmation désactivé. UI réelle et cohérence élève/CRM/QRC bout-en-bout NON PROUVÉES ; aucune migration/publication.

## 11/11 13:29 — Précédent essai Chemoun et sélection simulée
- [x] Score précédent officiel par identité 13/20 et libellé T3P seule, carte PC/mobile fixture vérifiée.
- [x] Simulation admin explicite préparée et désactivée pour enregistrement ; 24 tests PASS, navigateur 13,6/coef17/zéro éliminatoire, build OK ; défaut/copies intacts. Rapport docs/chemoun-eb3-precedent-selection-2026-11-11.md. Persistance serveur non préparée/non installée, aucun déploiement.

## 11/11 13:24 — Moyenne EB3 TAXI Chemoun
- [x] Lecture exacte : règle dernière tentative, T3P t2 définitif 2 et t1 définitif 13 ; coefficients 3/2/3/2/1/3/3, aucune sélection explicite de copie pour moyenne existante.
- [x] Projection V2 corrigée uniquement dans CRM Examen blanc, 26 tests PASS et navigateur PC/mobile fixture : moyenne 11,6, simulation t1 13,6 ; build OK. Aucune écriture ni publication. Rapport docs/chemoun-eb3-moyenne-2026-11-11.md ; affichage authentifié réel NON PROUVÉ, sélection explicite admin proposée seulement.

## 11/11 13:20 — Placement accès au bas des cartes EB
- [x] Contrôle partagé compact au bas de chaque carte après pause/dernière action ; utilisateur+ rôle serveur vérifiés, sélection explicite de session, aucune deuxième mécanique.
- [x] 13 tests PASS et navigateur vraie liste fictive PC/mobile, placement/cancel/apprenant exclu, zéro mutation/migration/publication. Rapport docs/session-exam-access-cartes-2026-11-11.md ; session admin réelle NON PROUVÉE, serveur toujours non installé.

## 11/11 13:10 — Accès examens blancs par session présentielle
- [x] Zone Accès examens blancs dans la fiche session CRM ; confirmation scoped/readback, absence serveur explicite, candidat SQL séparé non installé. Droits par défaut inchangés, zéro action réelle/publication.
- [x] 15 contrats PostgreSQL jetables + 29 tests Vitest PASS, confirmation PC/mobile fictive vérifiée ; rapport docs/session-exam-access-2026-11-11.md. UI réelle complète et ensemble des triggers actuels NON PROUVÉS ; installation hors périmètre autorisé.

## 11/11 12:58 — Menu Correction QRC : tous les passages remis
- [x] Audit : plafonds API/recherche, brouillons V2, filtre QRC ancien et superposition dernière fiche corrigés ; toutes sessions/dates et copie individuelle par ID, archives en lecture seule.
- [x] 48 tests PASS dont 1002 passages/1200 QRC, vrai menu/chargeur fictif PC/mobile, deux copies Chemoun séparées ; rapport docs/qrc-menu-tous-passages-2026-11-11.md, aucune écriture/publication. UI réelle authentifiée non prouvée.

## 11/11 12:52 — Accès CRM aux deux passages Chemoun EB3 TAXI T3P
- [x] SELECT : complète t1 15 réponses et partielle t2 1 réponse, liens V2/détails strictement identiques ; historique CRM indépendant ajouté, aucun remplacement de la sélection courante.
- [x] 44 tests et navigateur fictif PC/mobile PASS, rapport docs/chemoun-crm-historique-copies-2026-11-11.md ; aucune écriture de données ni publication, diagnostic précédent intact. UI réelle authentifiée et lien réel correcteur non prouvés, faute de session admin autorisée.

## 11/11 12:45 — Jeu de classement comptable GESTION
- [x] Classement glissé/tactile de 19 cartes, hypothèses explicites, feedback/score/rejeu et calcul amortissement ; exemples indépendants et bilan net 40 000 € équilibré.
- [x] Suivi facultatif versionné via file existante, module/score null sans registre obligatoire ; tests fictifs PC/mobile et compte rendu docs/jeu-gestion-classement-2026-11-11.md, aucun déploiement ni écriture réelle.

## 11/11 12:32 — Arezki autorisation EB3 A déjà accordée
- [x] SELECT : autorisation inutilisée, tokens source/version concordants, copie abandonnée sans réponse/résultat/reçu ; état inchangé après tests.
- [x] Dialogue CRM clarifié : confirmation déjà enregistrée + Fermer, sans bouton mort ; 22 tests UI, 14+9 contrats PostgreSQL et vrai PassageMatiere fictif PC/mobile exécutés. Aperçu seulement, aucun déploiement.
- [ ] Vue réelle apprenant Arezki NON PROUVÉE : session dédiée refusée faute d’approbation disponible ; CTA prouvé par code/fixtures uniquement. Rapport docs/arezki-autorisation-deja-enregistree-2026-11-11.md.

## 11/11 12:26 — Chemoun EB3 TAXI A/B en attente
- [x] SELECT exacts : A t2 1, B t2 2, A t1 5 QRC en attente, aucun résultat/correction ; A/B 16/16 retrouvés sur EB2 seulement. 15 contrats PostgreSQL jetables et 46 tests interface/lecture PASS.
- [x] Aucun défaut métier reproduit : pas de correctif inventé, aucun point ni écriture réelle ; empreintes ciblées inchangées. Rapport docs/chemoun-eb3-ab-diagnostic-2026-11-11.md.
- [ ] Reproduction visuelle admin réelle BLOQUÉE : session injectée élève indisponible comme admin ; écran/message/heure de saisie A/B EB3 non fournis. Aucun déploiement.

## 11/11 12:19 — Liens et vidéos dans les cours
- [x] Deux actions dans l’éditeur de description et rendu cours dédié sécurisé ; RichText/examens inchangés.
- [x] Formats, sauvegarde/réouverture via callback réel du CoursEditor et rendu PC/mobile sur fixtures uniquement ; aucune écriture Cloud. Tests et vérification navigateur réalisés, vidéos externes simulées.
- [x] Livré en aperçu sans publication : aucun socle de publication isolée prouvé pour les chantiers concurrents ; voir docs/cours-liens-videos-2026-11-11.md.

## 11/11 12:03 — EB4–6 : remise ancienne vers correction manuelle V2
- [x] SELECT retrouve 99 lignes indicatives (40/31/28) : 98 lignes de réponses non remises, une remise EB6 avec instant divergent. Aucune de ces 99 n'a une preuve de remise suffisante. Douze versions publiées confirmées ; compteurs V2 séparés, sans assimilation d'autres tentatives.
- [x] Candidat SQL séparé, neuf contrats PostgreSQL jetables PASS avec déclencheurs réels : douze variantes, conservation contenu/images/taille/notes, refus compteur/réponses/instant/droits, rejeu concurrent et correction manuelle fictive → résultat 20/20. Aucun flux apprenant complet ni production validés.
- [ ] Activation/rattrapage BLOQUÉS : snapshot ancien modifiable via droits élève ; preuve serveur de version figée absente, reprise ancienne restaure le sujet courant, remise classique restée in_progress. Exclusion IA par copie obligatoire non installée ; reprise après ACK/UI revue non intégrées. Aucun SQL installé, rattachement réel, note, IA ni publication. Voir docs/eb456-raccordement-manuel-2026-11-11.md.

## 11/11 11:18 — Devis formation continue : information écrite annulation/remboursement
- [x] CGV/délais existants relus sans modification ; case FC non précochée et obligatoire, texte complet identité/session/motif, email/LRAR/adresse officielle, aucune renonciation ni nouveau délai. Formations initiales et historiques signés exclus.
- [x] Preuve versionnée serveur avec date/heure, identité et devis dans le consentement protégé existant ; blocage client+serveur et affichage admin CRM/organisme. Verrou supplémentaire empêchant tout envoi réel avant activation des fonctions.
- [x] 92 tests de devis PASS, 2 fonctions Deno compilées, parcours Chromium fictif PASS (blocage, case, envoi simulé, initial, historique, serveur non activé), build OK. Rapport docs/devis-fc-consentement-annulation-2026-11-11.md.
- [ ] Activation effective : attend l’accord propriétaire pour déployer get-devis-public et upload-devis-signe ; aucune fonction déployée, aucune production publiée et aucune donnée réelle modifiée.

## 11/11 11:06 — EB3 TAXI Haddou/Memdouh : corrections et visibilité V2
- [x] Dix QRC relues sur leurs trois copies exactes : aucune note/correcteur V2, aucun événement humain, ancien journal, audit ou validation ; seules les propositions déterministes et l’import sont tracés. Anciens totaux = QCM + propositions, toujours pending.
- [x] Production gestion.ftransport.fr vérifiée avec mutations bloquées : session TAXI/TA 26/10–16/11, EB3-TAXI, date 30/10 ; trois lignes présentes, 4+4+2 boutons « À corriger », barèmes et boutons de note ouverts. Lien direct revérifié, aucune écriture.
- [x] Aucun filtre fautif : aucun correctif ni déploiement. Parcours exact et état des notes consignés dans docs/eb3-taxi-haddou-memdouh-suivi-2026-11-11.md.

## 11/11 10:56 — Copies V2 expirées et vides : déblocage ciblé
- [x] Expiration calculée depuis le snapshot serveur ; réponse, événement, résultat, neutralisation ou provenance ambiguë conservent le verrou. 9 contrats + 14 scénarios PostgreSQL avec déclencheurs réels PASS, dont concurrence, envoi tardif, reprise et résultat nouvelle tentative.
- [x] Migration 0270 appliquée : confirmation admin atomique, neutralisation append-only et abandon technique sans note ; nouvelle tentative et chrono différés côté élève. Catalogue/droits relus, aucun frontend ajouté ni publié.
- [x] Aperçu admin Arezki EB3 VTC A : bouton de confirmation actif, dialogue annulé et mutations interceptées. Empreintes copies/réponses/notes identiques ; 0 autorisation, reçu ou neutralisation réelle. Rapport docs/sql-revue/2026-11-11-subject-reset-expired-empty-report.md.

## 11/11 10:10 — Bouton « Réinitialiser la matière » installé
- [x] Contrats avec tous les déclencheurs réels (ancien, V2 natif/importé, refus ambigu, copie ouverte, reprise même copie) + 9 contrats + PassageMatiere réel + 25 Vitest PASS.
- [x] Migrations 0268/0269 appliquées ; catalogue, droits (anon refusé), appel API admin lecture et aperçu CRM Arezki vérifiés ; 0 autorisation/tentative réelle créée ; bundle publié déjà compatible, aucune publication.
- [ ] Arezki EB3 A : copie V2 ouverte, temps écoulé, sans réponse → ni reprise utile ni réinitialisation ; attend une décision sur une clôture admin sans note de cette copie.
- [ ] Message clair « fonction absente » : dans l'aperçu seulement (publication groupée impossible à isoler).

## 11/11 09:43 — Nouvelle version future SR TAXI
- [x] Écarts choix 71/78 seuls, source c5c4b4b3313ab958c92275923e0c5eea ; aucune transaction pertinente active observée, source verrouillée/revérifiée à l'activation.
- [x] Migration additive 0267 + test PostgreSQL jetable PASS : 255 IDs conservés, anciens reçus/versions intacts, droits et refus périmé.
- [x] Version cd3413ee-12d4-4beb-9117-5dddea70d63c active 09:49:39 UTC, SELECT 255 positions/65 images/0 divergence ; 88 reçus et 9 versions précédentes identiques, modules/source/release 0266 identiques. Aucun frontend, reset, mail ou IA.

## 11/11 09:27 — Bouton matière Arezki : dépendances absentes
- [x] SELECT Arezki EB3 A : V2 en_cours, sans résultat, à reprendre ; RPC admin absentes, aucune autorisation/tentative réelle.
- [x] PassageMatiere réel ancien VTC/V2 TAXI sur PostgreSQL jetable : réponse, reload du chrono et soumission ; 9 contrats SQL et 23 tests applicatifs PASS. Rejeu initial corrigé dans le candidat.
- [x] Installé 11/11 10:05 (voir section 10:10).

## 11/11 09:18 — Sécurité routière Bilan examen VTC → TAXI seulement
- [x] Source 255/cible historique 252, 190 écarts ; 9 réponses TAXI dont 5 sans snapshot, banque ancienne conservée. 62 modules/161 exercices empreintes identiques.
- [x] Migration 0266 + publication active nouveaux reçus TAXI 11/602 seulement : 255 positions, 0 divergence canonique/images/tailles, 210 IDs exacts conservés/45 nouveaux ; aucune modification autres matières.
- [x] PostgreSQL jetable PASS, 13 Vitest PASS, écran fictif PC/mobile et reload PASS ; build OK. 241 snapshots/17 figés/88 reçus/notes préexistantes identiques ; activités simultanées réponses/progression signalées. Rapport docs/bilan-securite-routiere-alignement-2026-11-11.md.
- [ ] Égalité de tous les écrans BLOQUÉE : 5 anciennes réponses sans snapshot sûr ; ancien JSON TAXI 252 et circuit futur VTC 249 restent intacts (source seule 255). Aucun remplacement historique ni élargissement VTC autorisé.

## 11/11 08:58 — Réinitialisation ciblée admin et démarrage élève
- [x] Composition enregistrée complète, EB3 VTC sept matières/A sans note, ordre officiel/ID exacts et nombres distincts ; calculs/global inchangés. Sélection historique par version encore non prouvée.
- [x] Candidat admin différé append-only et démarrage propriétaire avec reçu/durée publiés ; rôle, concurrence/rejeu, filières et refus en cours testés jetables. SQL non installé.
- [x] 146 tests applicatifs, 8 PostgreSQL jetables, Chromium admin→élève→reload VTC ordinateur/TAXI mobile PASS ; zéro écriture réelle/publication. Rapport dédié.
- [ ] Installation/action réelle BLOQUÉES : PassageMatiere complet et soumission/reprise chronomètre V2/importée non prouvés ; version historique du panneau non résolue. RPC non installées ; erreurs de lecture en aperçu réel, pas de faux succès.

## 11/11 08:52 — Rattachement nominatif QRC des cinq dossiers
- [x] Périmètre fermé : CHEMOUN 2be4ac7b-32a6-4a0f-9a12-267381c6779b ; BENKHELIL b9058e7e-a81e-4741-adba-6da88238cc84 ; MEMDOUH 7dac2ec5-46f4-46f9-9573-2bf245041601 ; HADDOU c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe ; SARKISIAN 144ca7f4-6623-4063-861b-e139a4a0108b. Lecture du code et incident uniquement, aucune mutation ni interaction avec le bouton reset.
- [ ] Inventaire et catalogue actuel BLOQUÉS : lectures Cloud échouent (pooler indisponible), sonde auth/base expirée, métriques indisponibles ; identités fournies non revalidées, compteurs actuels inconnus.
- [ ] Tests fictifs puis rattachements additifs et contrôle hors périmètre AVANT/APRÈS : attendent le retour des lectures et preuve complète des remises/snapshots/barèmes/notes validées. Aucun import, liaison, IA, note, email, migration ou publication exécuté.

## 11/11 08:42 — Remise à zéro admin d’une seule matière
- [x] Catalogue lu seulement : start_exam_subject_retake exige le propriétaire et ouvre immédiatement tentative/chronomètre ; aucune voie admin par matière trouvée. Aucun repli global ni appel de mutation.
- [x] Bouton ciblé et confirmation nominative préparés ; confirmation bloquée, aucune modification du bouton global, des notes ou des copies.
- [x] 23 tests applicatifs PASS ; aperçu du vrai panneau CRM sur fixtures VTC ordinateur/TAXI mobile PASS : confirmation nominative, annulation/reprise, envoi bloqué, autre note intacte, aucun appel de mutation après clic. Build observé OK, lint des nouveaux fichiers OK ; trois sections globales identiques à HEAD.
- [ ] Action effective BLOQUÉE : opération admin additive à démarrage différé + intégration de lecture du parcours actif et contrats serveur manquants ; aucune migration proposée/appliquée ni publication.

## 10/11 20:24 — Correctifs performance QRC autorisés
- [x] Mobile sans interception sticky et commentaire tenant dans panneau ; Actualiser avec notes même catalogue inchangé, signal historique sans scan automatique, lectures périmées écartées.
- [x] Inventaire différé après première grille ; profiling réel aperçu 17,765 s/57 requêtes, site 13,792 s/56 ; pas de gain statistique revendiqué ; règles et transport de notation inchangés.
- [x] 126 tests PASS, types PASS, lint ciblé zéro erreur/avertissement, build OK ; PC jour VTC/mobile soir TAXI EB3 base jetable PASS, sauvegarde 1 POST/1 lecture et largeur 637/192 stable, empreinte inchangée.
- [ ] NO-GO : nouvelles copies/IA/historique complet, permutations session rapides navigateur, questions fausses conjointes, catalogue encore lent et rollback de paquet non prouvés. Aucune publication ni donnée réelle modifiée.

## 10/11 20:01 — Tests approfondis performance Correction QRC V2
- [x] 122 régressions PASS, 15 contrats PostgreSQL jetables PASS, compilation observée OK ; lint FAIL (90 erreurs/8 avertissements), types autonome non exécuté. Aucun code fonctionnel changé.
- [x] Admin preview/production lecture seule : 20,189/14,133 s première grille, 59/56 requêtes ; EB3 soir 34 requêtes ; survol/scroll 0 ; inventaire 4480/4480 ; aucune écriture réelle.
- [x] PC synthétique : double clic note = 1 écriture/1 lecture, fenêtre 0,558 s dont attente fixe 0,5 s ; panneau 637 px stable ; rafale regroupée, panne, actualisation et reload exécutés.
- [ ] NO-GO : chevauchement mobile reproduit ; nouvelle copie/IA/historique, refresh après Realtime perdu, chargement concurrent, session JOURNÉE, types/lint et rollback complet restent à résoudre/prouver avant publication.
- [ ] Avant/après comparable indisponible : production affiche déjà bouton et absence bandeau ; ne pas utiliser preview/production comme gain. Rapport docs/performance-qrc-v2-2026-11-10-2001.md.

## 10/11 17:59 — Finalisation publiée des questions fausses
- [x] 18:20 : garantie serveur installée (index unique 0265, additif, 151 résultats inchangés en nombre) ; 23505 = déjà finalisé puis relecture exacte ; contrat PostgreSQL jetable 8/8 (deux appareils, rejeu, historique, rollback) + 68 Vitest PASS.
- [x] Diagnostic lecture seule : 105 clôtures sans résultat lié, dont 2 récentes prouvées complètes ; badge non rafraîchi et admin « terminé » sur simple clôture.
- [x] Correctif aperçu : reprise des clôtures orphelines, preuve de couverture, relecture du résultat exact, accusé perdu sans seconde insertion, badge relu et rattaché aux copies affichées, admin fondé sur le résultat.
- [x] 61 tests et contrôle navigateur PC/mobile PASS ; inventaire final 151 résultats, aucune écriture réelle effectuée (pas de comparaison d'empreintes avant/après).
- [ ] Publication de l'écran NO-GO : parcours élève authentifié réel PC/mobile → badge → admin et site publié non prouvés (compte élève de test autorisé requis) ; aperçu groupé avec chantiers encore désactivés.

## 10/11 16:49 — Synchronisation des trois corrigés
- [x] Reprise 17:30 : adaptateurs Bilans figés/futurs + EB, lots 400, sauvegarde auto serveur, conflits 2 onglets, lecteur admin complet, couverture admin ; 27+7 PostgreSQL, 243+24 Vitest, navigateur PC/mobile 2 onglets PASS ; couverture réelle mesurée ; rien installé/publié.
- [ ] Installation serveur + contrôle en ligne — attend votre accord et un compte élève de test autorisé.
- [ ] Règle de rapprochement si énoncé légèrement modifié (12 503 questions) — attend votre décision.
- [ ] EB2 VTC sans version publiée (11 846 questions sans corrigé actuel) — attend publication décidée par vous.
- [x] Reprise 17:04 : contrat EB append-only/version/CAS/idempotence + composant branché désactivé ; 16 PostgreSQL (24 EB fictifs) et 52 Vitest PASS, E2E vrai SQL jetable PC/mobile PASS, inventaire Cloud actualisé ; aucune écriture réelle.
- [ ] Nouveau circuit : adapters Bilans/autres quiz + preuve historique/EB2, >50 questions, journal durable et provenance admin complète non finis ; attente d'implémentation, pas d'action utilisateur requise.
- [ ] NO-GO confirmé : tests trois surfaces réelles/éditeur et 2 onglets navigateur, vrais jours/soirs, rollback complet et site publié non prouvés. Rapport mis à jour, candidat et serveur restent inactifs.
- [x] Lecture officielle A+C VTC v23/TAXI v10 ; candidat EB source unique strict+legacy/QRC et panneaux correction/révision/admin préparés, désactivés ; aucune installation serveur ni écriture pédagogique.
- [x] 76 Vitest, 7 PostgreSQL lecture et 14 cas tout-ou-rien PASS ; branche réelle CHEMOUN en attente reproduite, aucun panneau candidat activé.
- [ ] STOP : contrat serveur versionné préparé mais non installé ; Bilans/autres quiz non intégrés, anciennes copies sans preuve et EB2 VTC sans publication à qualifier.
- [ ] Publication NO-GO : E2E positif des trois parcours, PC/mobile, publication concurrente et rollback d'activation non prouvés. Rapport docs/corriges-trois-parcours-2026-11-10.md.

## 10/11 16:38 — QCM tout-ou-rien et corrigé titiller
- [x] Fonctions serveur et chemins partagés inspectés ; A+C actuel 2 points VTC v23/TAXI v10 confirmé ; 115 Vitest PASS et 14 calculs PostgreSQL jetables PASS, historique intact.
- [ ] Publication NO-GO : parcours réel CHEMOUN EB3 en branche attente sans encadré ; affichage positif A+C/rechargement/mobile et modification→candidat non prouvés. Ne pas forcer de correction ou modifier une question réelle pour tester.
- [x] Rapport docs/qcm-tout-ou-rien-2026-11-10-1638.md, règle permanente enregistrée ; aucun code actif ni donnée pédagogique modifié.

## 10/11 14:32 — Incident notes QRC EB3 TAXI
- [x] Diagnostic lecture seule : captures identifiées (candidat = CHEMOUN Mourad), nouveau correcteur cohérent 2 735/2 735, 14 tests jetables PASS. Rapport docs/incident-notes-qrc-eb3-taxi-2026-11-10-1432.md.
- [ ] Anciennes copies TAXI non notables (8 : CHEMOUN, FERREIRA) — preuves ciblées + notation serveur, attend accord.
- [ ] Note globale EB calculée serveur — attend accord.
- [ ] 48 copies VTC récentes ancien circuit — attend accord et liste nominative.

## 10/11 14:39 — Onglet « Actualiser les notes »
- [x] Commandes serveur diagnostic/actualisation (états dérivés seuls, CAS, idempotence, journal), onglet + panneau correcteur, revérification après correction.
- [x] Tests : 14 PostgreSQL jetables, 4 103 applicatifs PASS ; empreinte production identique, journal vide. Rapport docs/synchronisation-notes-eb-2026-11-10.md.
- [ ] Contrôle avec un compte administrateur et vue navigateur — compte de contrôle non admin.
- [ ] Publication — attend votre accord après contrôle.
- [ ] 36 copies importées sans barème : corriger effacerait la note — décision requise.
- [ ] 56 notes divergentes du calcul — vérification humaine.

## 10/11 14:14 — Mots-clés personnalisés QRC
- [x] Liste serveur partagée admin uniquement (migration 0260) ; ajout, renommage confirmé, retrait = archivage ; commentaires historiques indépendants.
- [x] Tests : 5 HTTP/PostgreSQL jetables PASS (droits, conflit, rejeu, archivage, candidat inchangé), suite complète 4 097 PASS.
- [ ] Contrôle navigateur ordinateur/mobile NON PROUVÉ : le compte de contrôle est redirigé (accès élève expiré 30/04/2026), pas d'accès admin.
- [ ] Publication NON FAITE : attend le contrôle navigateur ou votre accord explicite.

## 10/11 13:02 — Commentaires prédéfinis QRC
- [x] Aperçu : quatre textes exacts, cumul/doublon/édition, relecture du journal et projection candidat V2/historique ; 107 tests applicatifs et 7 PostgreSQL jetables exécutés, navigateur VTC soir sans écriture.
- [x] Rapport docs/commentaires-qrc-2026-11-10.md : NO-GO, perte du commentaire seul à note V2 inchangée reproduite ; pas de mutation réelle ni publication.
- [ ] Correctif serveur append-only du commentaire seul : modification de règle serveur hors demande UI, attend accord spécifique ; ne jamais modifier artificiellement la note.
- [ ] E2E admin/API/candidat isolé jour/soir et anciens circuits, sauvegarde/rollback et blocages du lot précédent : non prouvés, publication suspendue.

## 10/11 12:41 — Révisions admin et correcteur unique
- [x] Aperçu : réponses persistées par identité explicite, initiale distincte, heure individuelle prouvée sinon signalée ; 55 réponses consultées et reload identique.
- [x] Tests 32 nouveaux/lecture/inventaire, 79 révision, 46 tri/navigation/notes, 6 PostgreSQL jetable PASS ; clé matière:question confirmée dans paquet public, compteur live 4326/4326/0.
- [x] Anciennes copies : remplacement de l’ancien écran par consultation unique sans notation, À VÉRIFIER ; pas de note humaine inventée.
- [x] Rapport docs/revisions-admin-2026-11-10-1241-no-go.md ; empreinte 204 révisions identique avant/après ; aucune migration/publication.
- [ ] Publication NO-GO : E2E sauvegarde élève → admin sur API isolée du chemin publié, concurrence/Terminer, écran mobile non recouvert, consultation historique visuelle et rollback déployé durable non prouvés ; dernière répétition compteur expirée.

## 10/11 10:49 — Reprise activation liaison QRC
- [x] Preuve serveur ciblée des cinq remises Meriem BENNANI EB2 T3 : 5/5 prouvées (migration 0257, table append-only), sans réécriture ni assouplissement global.
- [x] Mocks supabase.channel des 20 tests navigation corrigés, vrais échecs visibles.
- [x] PostgreSQL isolé 87 + 86 OK, Vitest 458 OK, répétition jetable sur données réelles OK.
- [x] Empreintes avant/après : 0 copie disparue/modifiée (hors 1 EB3 en cours de composition) ; publication faite, bundle public vérifié. Rapport docs/activation-qrc-2026-11-10-1115-go.md.
- [ ] 710 autres remises __tN/tentative=1 (46 élèves) — traitement nominatif seulement sur accord.

## 10/11 10:17 — Activation conditionnelle liaison QRC
- [x] Sauvegarde privée ciblée + SHA-256, cinq résultats complets et empreintes avant/après identiques ; cinq remises originales Meriem BENNANI EB2 T3 retrouvées, suffixe __t3 mais champ tentative=1 contradictoire.
- [x] Tests rejoués : 51 PASS / 20 FAIL (transport fictif sans channel) ; suite PostgreSQL interrompue à 180 s sans bilan final, non prouvée ; tri dédié PASS, clic réel non exécuté.
- [ ] Activation/publication BLOQUÉES : preuve serveur ciblée de liaison encore absente et suite d'enregistrement en échec ; STOP/NO-GO demandé, aucune migration ni publication.
- [x] Rapport précis docs/activation-qrc-2026-11-10-1017-no-go.md ; notes, copies, réponses et historique inchangés.

## 10/11 09:46 — Régression liaison correction QRC
- [x] Défaut reproduit en lecture sur ABDELHAK/DIANE Gestion QCM18 A+B/B+A et AIT BALLAGH Réglementation QCM10 B+C/C+B ; mêmes QRC, IDs, remise et tentative.
- [x] Comparaison QCM figée corrigée, relecture avant note, contrôle serveur requis pour permutation, résultat matière relu incorporé ; candidat SQL des RPC réelles préparé hors migrations, non appliqué.
- [x] 57 tests applicatifs + 27 PostgreSQL jetables PASS ; trois copies réelles relues sans écriture. Rapport docs/regression-qrc-liaison-2026-11-10-0946.md.
- [ ] Clic exact 09:45 — télémétrie absente, attend nom ou identifiant de la copie affichée ; aucun candidat supposé.
- [ ] Activation serveur — accord requis ; sans installation du candidat, les permutations restent non notables, sans contournement.
- [ ] Publication — attend accord explicite.

## 10/11 09:32 — Alerte note globale EB présentiel
- [x] Diagnostic : global assemblé à l’écran ; correction distincte de publication, sept matières même tentative strictes, QRC figées ancien/V2.
- [x] Alerte administrative en aperçu sans écriture : relecture 5 s, déduplication, événements sans polling, résolution automatique ; petits groupes de lecture séquentiels.
- [x] 77 tests PASS ; navigateur authentifié avec transport synthétique PC/mobile, alerte puis résolution sans écriture ; lecture réelle 563 groupes/128 prêts tous publiables. Rapport docs/alerte-note-globale-eb-2026-11-10.md.
- [ ] Détection persistante administration fermée — extension serveur et accord sur écritures de suivi requis ; Realtime après correction réelle non prouvé, aucune correction réelle autorisée pour test.
- [ ] Publication — attend accord explicite.

## 10/11 09:25 — Retrait confirmation de copie QRC
- [x] Case et avertissement supprimés ; clic direct pour copies prouvées, erreur explicite sans envoi pour identités ambiguës, serveur inchangé.
- [x] 53 tests ciblés et 12 contrats PostgreSQL jetables PASS ; rapport docs/qrc-retrait-confirmation-2026-11-10.md ; aucune note réelle saisie.
- [ ] Publication — attend accord explicite ; parcours de notation réel non exécuté pour préserver les copies.

## 10/11 09:19 — Tri admin QRC par fin décroissante
- [x] Tri partagé par fin réelle décroissante et navigation ; pagination déterministe, actualisation des nouveaux passages par Realtime sans écriture élève.
- [x] 89 tests PASS ; navigateur réel TAXI 7 matières et VTC soir 5 matières QRC, rechargement mobile identique ; rapport docs/tri-qrc-fin-decroissante-2026-11-10.md.
- [ ] Publication — attend nouvel accord explicite ; nouveau passage réel non créé, événement testé isolément.

## 10/11 08:34 — P0 EB2 notes en attente malgré QRC validées
- [x] Correctif déjà public (index-ryoThghQ.js) ; aucun autre changement de code en attente ; 3 997 tests PASS.
- [x] Rejeu réel : 111 matières/29 élèves débloquées (Kamal 5/5), 125/37 élèves restent sur 379 QRC non validées ; V2 EB1–EB6 sans divergence.
- [ ] 379 QRC EB2 VTC + 6 QRC EB2-TAXI de Pogos — attendent une correction admin.

## 10/11 07:34 — Audit lecture seule doublons T3P Bilans examen VTC/TAXI
- [x] Données courantes 5/500 et 11/600 : 114 entrées, IDs/UID distincts, 112 énoncés normalisés uniques ; deux paires strictes 25/43 et 37/47 avec mêmes choix/clés dans chaque filière.
- [x] Treize familles sémantiques à validation nominative ; divergences location à la place et attente voie publique isolées, aucune fusion proposée automatiquement.
- [x] Origine prouvée hors concaténation T3P 1/2 : banque d'examen indépendante, zéro correspondance exacte avec les 128 exercices sources ; copies figées et affichage élève vérifiés par versions/reçus/rendu.
- [x] Rapport `docs/audit-doublons-t3p-bilans-examen-2026-11-10.md` ; aucune donnée, question, copie, réponse, note ou publication modifiée.
- [ ] Correctif minimal en attente d'accord : nouvelle version 112 entrées pour nouveaux passages seulement, IDs 43/47 exclus sans renuméroter, anciennes copies et scores intacts.

## 09/11 22:36 — Correctif urgent existant et activation EB3 TAXI
- [x] Correctif QRC du ticket urgent réutilisé sans correctif concurrent : public index-Cv4rxQEI.js confirmé, 39 tests PASS.
- [x] EB3 TAXI : source admin 90008 univoque, 7 matières/107 questions (91 QCM/16 QRC), comparaison intégrale questions/choix/corrigés/ordre et coefficients/seuils ; version 2 publiée en base à 22:40:49 UTC, relecture conforme, signal core_sujet_publie=true.
- [x] 66 tests partagés sauvegarde/reprise/soumission/QRC/notes PASS ; aucune note ni réponse réelle saisie, source admin intacte, EB3 VTC non modifié.
- [ ] Garantie exhaustive des anciennes reprises et parcours élève réel complet NON PROUVÉS : ancien historique V2 peut prendre priorité sur un passage ancien, identité parent serveur absente. Ne pas présenter cette limite comme résolue. Rapport docs/eb3-taxi-activation-2026-11-09-2236.md.

## 09/11 19:55 — Rectification présélection QRC
- [x] Supprimer panneau doublonné ; sélection locale sur boutons standard, sauvegarde humaine normale.
- [x] 77 tests de proposition, sauvegarde/relecture et révision ; contrôle réel sans écriture ; publication ciblée demandée. Rapport docs/qrc-preselection-2026-11-09.md.
- Activation EB3 reste bloquée et distincte de ce correctif d'interface.

## 09/11 19:49 — EB3 futur et pré-note QRC
- [x] Lecture réelle : deux brouillons EB3 vides, sources 107 questions × deux filières ; 234/45 marqueurs matière anciens en cours, identité de passage global non certifiée. Aucune activation.
- [x] Pré-note locale conservatrice distincte, validation humaine explicite, trace dans la correction ; 76 tests ciblés PASS.
- [x] Aperçu authentifié vraie copie EB2 soir vérifié, RPC de notation bloquées ; aucune donnée réelle de test. Rapport docs/eb3-prenote-2026-11-09.md.
- [ ] Publication/activation bloquées : candidat EB3 vide et reprise serveur non certifiée ; sémantique générale/pré-note publique non prouvées.

## 09/11 17:23 — Urgence opérationnelle EB2 journée/soir
- [x] Public et aperçu : 156 QRC journée / 16 soir visibles, notation bloquée ; 95/9 remises identiques, zéro lien V2 ; import existant insuffisamment protégé, non exécuté.
- [x] Aperçu : IDs originaux visibles, pagination complète des remises et ordre stable ; 8 tests PASS, aucun faux bouton de note, candidat précédent conservé.
- [x] Routage soir vérifié source + versions réelles : EB2 aucune version publiée, risque de nouvelles copies consultation ; rapport docs/eb2-urgence-journee-soir-2026-11-09.md.
- [ ] E2E complet soumission soir→notation→note élève — attend adaptation additive serveur et qualification catalogue réel, non prouvé.
- [ ] Déploiement effectif — attend rapport de sécurité et validation spécifique, aucun déblocage annoncé sans preuve.

## 09/11 17:16 — Notation sûre des QRC historiques
- [x] Prévisualisation 24 EB ; EB2 VTC 81 copies/261 QRC figées sans lien, 139 avec remise identique mais aucun horodatage exact ; corrections historiques en attente à qualifier, zéro création automatique autorisée.
- [x] Candidat jetable renforcé : corrections existantes protégées, liens divergents gardés, verrou source ; 15 SQL PASS + navigateur 168 corrections synthétiques, une révision/retry et reprises tactiles PASS.
- [x] Rapport docs/qrc-historique-notable-preparation-2026-11-09.md : migration proposée, autorisation admin des ambiguïtés et publication révisée, aucune application réelle.
- [ ] Intégration réelle notation/remontée — validation spécifique de migration et compatibilité catalogue complet requises.

## 09/11 17:13 — Règle statistique parfaite explicite
- [x] Règle permanente enregistrée ; moteur existant conforme, notes/barèmes/verdicts inchangés.
- [x] Six cas explicites supplémentaires QCM A+B et QRC 0/2–1/2–2/2 ; 86 tests ciblés PASS ; rejeu preuves audit 3/5, 7/14, 8/18 inchangé.
- [x] Rapport complété sans confondre rejeu conservé et nouvelle vérification publique.
- [ ] Publication statistique séparée — attend validation explicite.

## 09/11 17:01 — Audit taux QRC premier essai
- [x] Public reproduit 2/4, 5/12, 6/16 ; preuves individuelles relues, aperçu réel 3/5, 7/14, 8/18.
- [x] Correctif QRC commun : soumission prouvée, brouillons miroirs ignorés, reprises suivantes exclues sans masquer le premier passage ; 80 tests ciblés et 123 critiques PASS.
- [x] Rapport docs/audit-qrc-premier-essai-2026-11-09.md ; aucune écriture élève ni publication.
- [ ] Taux exhaustifs des copies anciennes sans preuve et extension VA — non prouvés ; périmètres et inscriptions actuelles conservés.

## 09/11 16:10 — Audit global toutes tentatives EB
- [x] Inventaire SQL réel complet : 191 élèves, 5848 résultats, 1025 groupes tentative, 2545 passages V2 ; 17 écarts candidats/8 ensembles/7 élèves, 167 copies différentes non forcées.
- [x] Correctifs partagés aperçu : tentative CRM, priorité dernière tentative, QRC pilote par tentative connue, détail même ID/reset-aware, pagination complète ; 109 tests ciblés + suite critique 123 tests PASS (partiellement communes).
- [x] Rapport docs/audit-global-eb-2026-11-09-1610.md ; public index-BNKO-425.js confirmé ; parcours réels Zine + SAWADOGO CRM/cartes concordants.
- [ ] Publication des nouveaux correctifs — attend accord explicite ; aucune écriture élève.
- [ ] Rejeu exact toutes interfaces et toutes anciennes copies — non prouvé : sessions personnelles indisponibles et preuves anciennes ambiguës ; aucun statut inventé.

## 09/11 16:01 — Zine DAKHLI : contradiction EB1 carte / compte
- [x] Zine DAKHLI identifié ; sept notes V2 définitives 15,5/10/7/14/11/12,5/6, 16 QRC corrigées ; public index-BNKO-425.js, carte/détail/CRM/Notes consultés = réussi. Contradiction passée non reproduite sur version actuelle.
- [x] Lacune de rafraîchissement partagé corrigée en aperçu : écoute des résultats historiques aussi ; 74 tests PASS, scénario Zine + 24 EB / 108 matières source. Cause de l'ancienne capture non prouvée.
- [x] Consultation publique admin du dossier + vue apprenant + carte + détail : réussi 10,7 ; tablette aperçu réussi. Session personnelle et restauration détail après reload NON PROUVÉES.
- [ ] Publication du correctif de rafraîchissement — attend validation ; aucune écriture élève. Rapport docs/incident-zine-eb1-2026-11-09.md.

## 09/11 15:22 — Audit + correctifs exhaustifs calcul/remontée EB1–EB6 VTC/TAXI
- [x] Inventaire config (24 EB, 112 matières) et données réelles (lecture seule).
- [x] Contrôle cohérence (719 ensembles élève/examen rejoués) ; 3 bugs prouvés corrigés en aperçu.
- [x] Tests automatisés + rejeu réel avant/après.
- [x] Publication demandée après accord ; marqueurs vérifiés sur index-BNKO-425.js à 15:58:55 UTC ; 181 tests PASS, EB2 VTC public visible.
- [ ] 398 ensembles encore en attente (QRC réellement non corrigées ou anciennes copies sans fiche V2) — notation historique = migration, bloquée sans accord.
- [ ] Décision : 5 anciens EB1 de juillet dont note stockée ≠ points/barème (carte et admin peuvent différer de 0,1 à 2,2 pts).
- [ ] Décision : 2 EB2 VTC bloqués « en attente » par l'ancienne liste pilote QRC de septembre.

## 09/11 14:21 — « FAIS LE » : faux verdicts EB (P1) puis QRC V2 global (P2)
- [x] P1 correctif calcul/affichage seul (scoring + carte + détail) : seuil figé → seuil configuré → statut explicite ; incomplet/à vérifier jamais « échoué ».
- [x] P1 tests : 17 nouveaux + 48 existants PASS ; suite complète 3 863 PASS / 2 échecs préexistants (heures de présence) ; vraies cartes sur copies réelles lues seule PC/tablette/téléphone + rechargement : Ilies 14,8/13,4 RÉUSSIS, Pogos 7,5 ÉCHOUÉ C seule, EB2 EN ATTENTE ; 0 écriture.
- [x] P1 diff app vs public = 3 fichiers seulement ; publié, contrôle 14:35:50 UTC : index-B5unSckE.js contient le correctif, option EB2 refusée absente.
- [x] P2a EB2 VTC visible dans Correction QRC V2 en consultation seule (notation non disponible sans adaptation serveur) ; publié.
- [ ] P2b notation EB2 historique + remontée EB1–EB6 globale : attend autorisation migration serveur.

## 09/11 14:15 — EB2 VTC absent du menu, préparation de lecture seule
- [x] Audit : journée 9 élèves/39 résultats QRC/127 réponses (101 le 09/11), V2 absent ; soir 1/5/16 ; 78 QRC preuve exacte, 49 non certifiées ; 5 fiches en cours distinctes.
- [x] Projection test-only sans mutation/notation : 8 tests + 45 existants PASS ; même écran V2 synthétique PC/tablette/rechargement PASS, aucun ancien écran.
- [x] Rapport : docs/eb2-vtc-consultation-ciblee-2026-11-09.md ; aucune écriture réelle/migration/publication.
- [ ] Activation réelle non effectuée : capacité explicite consultation à intégrer, droits/lecture réelle et preuves restantes à vérifier ; notation historique exige adaptation serveur séparée.

## 09/11 14:07 — Audit prioritaire des faux verdicts EB, lecture seule
- [x] Captures Ilies MEMDOUH TAXI EB1/EB2 identifiées exactement ; 14 matières définitives, zéro QRC restante ; faux échec et sept éliminatoires reproduits avec le vrai calcul de carte.
- [x] Cause : appel de la liste sans reussi + seuil absent du snapshot V2 ⇒ Boolean(undefined) faux ; moyenne indépendante correcte. 32 tests existants PASS ; deux reproductions du défaut exécutées.
- [x] Pogos SARKISIAN identifié : EB1 7,5 légitimement échoué (C=5 seule éliminatoire), EB2 six QRC F/G réellement en attente ; aucun déblocage inventé.
- [x] Rapport et plan minimal non appliqué : docs/audit-verdict-eb-captures-2026-11-09.md. Aucun code actif, donnée, migration ou publication modifié.
- [ ] Correctif et validation navigateur non autorisés : attend accord explicite ; chantier QRC global et protections EB3 laissés intacts.

## 09/11 13:55 — Correcteur QRC global, préparation jetable autorisée
- [x] Prototype hors imports actifs : 24 identités × sept matières, lecture unifiée, preuves, pages >1000 et sessions ; 12 contrats PostgreSQL PASS.
- [x] Notation append-only, concurrence/rejeu/rollback ; vrai écran V2 → HTTP local → PostgreSQL jetable : 168 corrections + une révision/retry et reprises tablette/téléphone PASS ; 76 tests existants PASS.
- [x] Rapport et limites : docs/qrc-global-preparation-isolee-2026-11-09.md ; aucun changement actif, migration réelle, écriture Cloud ou publication.
- [ ] Mise en service BLOQUÉE : inventaire sans snapshot, corrections historiques existantes, liens/imports et snapshots natifs ambigus, catalogue/triggers complets, verrouillage source et transport production non certifiés ; nouvel accord réel indispensable.

## 09/11 13:52 — Toutes les QRC EB1–EB6 dans le correcteur V2
- [x] Audit lecture seule 24 identités d'examen : 4 591 résultats historiques sans copie V2 (2 374 remises prouvées) ; rapport docs/audit-qrc-v2-tous-eb-2026-11-09.md.
- [ ] STOP : notation V2 impossible sans fonction serveur (migration) ; attend accord pour prototype jetable. Aucune écriture ni publication.

## 09/11 13:49 — Rectification EB2 VTC, correcteur V2 exclusivement
- [x] Ancien correcteur explicitement refusé ; approche précédente annulée dans l'aperçu uniquement, trois fichiers fonctionnels identiques à la référence préalable ; 76 tests V2 PASS, build OK.
- [x] Lecture serveur : core_correct_qrc exige une qrc_instances_v2 existante ; les 44 résultats matière novembre jour/soir ne portent aucun lien V2 prouvé.
- [ ] Intégration V2 sans copie/doublon : nécessite une adaptation serveur de lecture et correction append-only sur identité historique immuable ; aucune adaptation réelle autorisée implicitement, aucun import exécuté.
- [ ] Publication STOP : workflow complet V2 non compatible avec ces identités à ce jour ; ne pas publier une simple option ni restaurer le correcteur refusé.

## 09/11 13:26 — Audit lecture seule EB2 VTC absent de Correction QRC V2
- [x] Cause prouvée : EB2 sans version V2 publiée active (retrait 24/09), nouvelles copies ancien circuit ; menu historique limité à EB3. Site public index-BbNPGt9M.js contient ce filtre.
- [x] Contrôle 13:31 UTC : journée 27 résultats matière / 9 élèves / 78 QRC sur 22 passages ; soir 2 / 1 / 7 QRC sur 2 passages ; 0 tentative EB2 V2 novembre chez ces inscrits. 36 tests fictifs PASS ; aucune écriture Cloud ni publication.
- [x] Accord 13:33 : option EB2 historique ajoutée, exclusion par result_id V2 exact, identité tentative et références figées EB2 ; 62 tests PASS, build OK, lecture admin journée/soir/date/reload vérifiée sans écriture.
- [x] Approche précédente refusée le 09/11 13:49 : publication demandée au tour précédent, désormais public index-BFL2MHLY.js ; aucune nouvelle publication, annulation dans l'aperçu. Voir rectification prioritaire ci-dessus.

## 09/11 13:10 — Audit lecture seule verdicts examens blancs novembre
- [x] Sessions journée/soir et TAXI lié identifiées ; 368 lignes matière dont 286 novembre, 47 derniers ensembles avec activité novembre : 19 réussites, 7 échecs tous <10, 21 attentes. Aucune donnée ou préparation EB3 modifiée.
- [x] Règle 10 + minima 6/4 + complétude vérifiée, formule publique confirmée ; classement incomplet comme échoué identifié dans le code, cache/source soupçons distincts ; rapport docs/audit-verdict-eb-novembre-2026-11-09.md et plan minimal non appliqué.
- [ ] Cause exacte terrain non prouvée : aucun écran/copie précis fourni ; 0 verdict définitif >10/échec retrouvé. Correction/publication attendent accord explicite et rattachement d'une capture au passage.

## 09/11 13:02 — Protections nouvelles tentatives EB3–EB6 uniquement
- [x] Identifiants et déclencheurs réels lus ; identité parent originale absente du démarrage par matière, formats snapshots distincts ; 23 lignes V2 en cours protégées, aucun changement actif.
- [x] Prototype de périmètre hors application/migrations : 9 contrats PostgreSQL + 18 contrats atomicité préexistants + 94 Vitest PASS ; exclusion EB1/2 et parent préactivation vérifiée sur fictifs.
- [ ] STOP migration/publication : identité parent/cohorte immuable au démarrage original manquante, compatibilité source historique et intégration complète anciens clients/triggers/navigateur non prouvées. Rapport docs/eb3-protections-prospectives-2026-11-09.md ; site public index-BbNPGt9M.js inchangé au contrôle.

## 09/11 12:59 — Autorisation de publication des trois correctifs EB2
- [x] Schéma et déclencheurs réels contrôlés en lecture seule ; candidats et diff examinés, aucun changement actif.
- [x] STOP : 873/1034 copies EB2 et 144/173 copies TAXI sans le snapshot exigé ; 17/18 révisions ouvertes repérées par clé sont au format ancien sans revisionState. Le candidat/commutateur sont globaux EB1–EB6, pas isolés EB2 ; statut/submitted_at modifiés par un trigger réel absent des fixtures.
- [ ] Migration/publication bloquées : compatibilité historique et périmètre EB2 strict non résolus ; intégration catalogue complet + navigateur/SQL requise. Autorisation reçue mais aucune migration ni publication appelée. Rapport docs/eb2-publication-stop-2026-11-09.md.

## 09/11 12:49 — EB2 : préparation strictement jetable
- [x] Candidat SQL atomique terminé/résultat/reçu, hors migrations actives ; isolation PostgreSQL locale contrôlée.
- [x] Copie de test RevisionFausses : amorçage write_seq, reprise même identité et refus QRC sans mots-clés utilisables ; application active inchangée.
- [x] 18 SQL + 96 tests ciblés PASS ; 2 parcours Chromium tactiles, sept matières synthétiques chacun, Terminer/retry/reload PASS ; rapport docs/eb2-preparation-isolee-2026-11-09.md. SQL et navigateur séparés, catalogue complet/appareils physiques non prouvés.
- [ ] Activation réelle et publication INTERDITES : nouvelle autorisation et revue de compatibilité nécessaires.

## 09/11 — Synchronisation dynamique des bilans d’exercices après édition admin
- [x] Défaut reproduit : projection statique + ancien contenu conservé ; 128 figées et Q1 toujours visible après suppression fictive, contre 126 et texte source modifié attendu.
- [x] Sources serveur 2/10 actives, projection après chaque lecture/sauvegarde/reconnexion, IDs historiques et JSON brut préservés ; bilans d’examen/EB et exercices indépendants exclus.
- [x] 29 compositions dynamiques testées (suppression/ajout/édition/ordre/sauvegarde), 151 tests ciblés puis 3 775 globaux PASS / 13 ignorés / 0 échec ; build OK, empreintes modules inchangées. Rapport `docs/correctif-bilans-sources-dynamiques-2026-11-09.md`.
- [x] Aucune publication : paquet public `index-Cv2PoEkg.js` inchangé. Limites : écran admin indisponible avec le compte expiré ; Realtime hébergé non prouvé, reprise testée sur transport local.

## 09/11 — Tous les bilans d’exercices VTC, TAXI, TA et VA
- [x] 29 compositions inventorées dans les modules 4, 9, 27, 29 et héritages 81/82 ; bilans d’examen 5/11/28/30 et examens blancs exclus.
- [x] Tableau sources/attendu/actuel/écart/cause, IDs, contenus, ordre, doublons et manquantes : `docs/audit-bilans-exercices-2026-11-09.md` et JSON détaillé.
- [x] Projection non destructive étendue, T3P conservé, 39 identités déterministes contrôlées sans collision, restauration serveur avant sauvegarde.
- [x] 398 tests ciblés PASS ; suite complète 3 743 PASS / 13 ignorés / 0 échec ; build OK et empreintes modules inchangées. Aucune publication.

## 09/11 — Bilan T3P limité aux 128 questions sources
- [x] Audit lecture seule : 206 = 114 références + 14 uniques + 59 doublons + 19 références obsolètes ; projection 128, IDs et contenus historiques conservés.
- [x] Correction non destructive limitée au module 9 / exercice 100 ; sauvegarde restaurant les 206 objets serveur avant intention explicite, autres modules inchangés.
- [x] 218 tests PASS, build OK, empreintes des modules 5/9/10/11 inchangées ; activité concurrente sur réponses/progressions consignée. Rapport `docs/audit-bilan-t3p-128-2026-11-09.md`. Aucune publication ; affichage navigateur admin non vérifié faute de session admin.

## 08/11 20:17 — Finalisation idempotente et rattrapage QRC ciblés
- [x] Reçu serveur atomique candidat et garde INSERT ; tests concurrence/rejeu/propriétaire PostgreSQL PASS, aucun ancien résultat modifié.
- [x] Rattrapage QRC événementiel 400 ms + une lecture à 2,4 s, identité isolée ; boucle de lectures NotesView corrigée ; écran fictif 18,3/20 sans reload capturé.
- [x] Tests ciblés, handler/PostgREST isolés, empreintes et scan réalisés ; rapport docs/revision-qrc-corrections-2026-11-08.md.
- [x] Contrôles achevés : suite finale 3 706 PASS / 13 ignorés / 0 FAIL, neuf SQL privés, handler isolé et vrais écrans mobiles avec transport local ; empreintes inchangées.
- [ ] Mise en service NO-GO : score/source serveur immuable et compatibilité anciens clients non prouvés ; source snapshot complet présente dans 1 278/6 009 résultats seulement. Aucun déploiement ; Realtime hébergé non prouvé. Voir complément 21:52 du rapport ciblé.

## 08/11 — Preuve de clôture de révision des réponses fausses EB
- [x] RevisionFausses identifié ; vendredi 06/11 : 25 occurrences de « Dernières réponses non confirmées », contexte sans identifiant d'opération, cause individuelle non démontrable.
- [x] 21 tests composant/projection PASS (serveur simulé), 8 tests queue PASS, vrai handler/PostgREST/PostgreSQL PASS (501 événements, concurrence, gel, ACK refusé puis rejeu).
- [x] Défaut reproduit composant + PostgreSQL isolés séparément : retour perdu après insertion du résultat puis nouvel essai = deux insertions même revision_exercice_id ; trigger réel attribue tentatives 1/2. Test durable revision-fausses-retry-diagnostic ; aucun code applicatif modifié.
- [ ] E2E navigateur + handler/SQL réunis, captures, délai de clôture persistée après reload et session réellement expirée NON PROUVÉS. Nécessite harnais UI privé branché sur API isolée ; aucun test sur compte réel ni publication.

## 08/11 — Preuve du rafraîchissement QRC sur écran déjà ouvert
- [x] Paquet public index-Dy9_Awa8.js : abonnements NotesView et useCoreChangeTick confirmés ; publication des quatre tables et droits propriétaire/admin lus, aucune authentification reprise.
- [x] Contrat PostgreSQL sécurité/correction PASS, 5 vrais tests handler/PostgREST/SQL avec fournisseur local fictif PASS, 20 tests source/identité/copies figées PASS. SQL mesuré : 6,67 → 11,67 provisoire → 18,33 définitif → révision 20 ; retours 28–29 ms.
- [ ] DOM temps réel NON PROUVÉ : PostgreSQL/PostgREST isolés disponibles mais aucun service Realtime isolé configuré. Veille/réseau/changement d'élève non exercés en E2E ; aucune correction réelle ni publication. Code : regroupement 400 ms sur résultats, aucun rattrapage explicite NotesView/useCoreChangeTick à la reconnexion.

## 08/11 — Alignement ciblé Bilan T3P/Gestion VTC/TAXI
- [ ] Comparer exhaustivement les seules banques 5/500–11/600 et 5/501–11/601, y compris doublons, choix, clés, images et explications.
- [ ] Sauvegarder les quatre états actuels et les empreintes des copies/réponses/résultats ; confirmer l'immutabilité des passages.
- [ ] Aligner additivement numéros affichés et ordre sans renuméroter les identifiants de stockage ni modifier une bonne réponse.
- [ ] Rejouer les tests fictifs, contrôler l'égalité intégrale et les preuves inchangées, puis vérifier les écrans et la publication ciblée.

## 08/11 — Trois priorités persistantes autorisées
- [x] Persistance BENNANI / CLERC : cause des renvois confirmés et troncature 500 corrigée ; vrai handler/PostgreSQL jetable validé ; aucune purge ni récupération appareil non prouvée.
- [x] QRC restantes : 2 corrigés de calcul incomplets, 5 ambiguïtés et 3 réponses vides conservées en revue ; 0 nouvel appel IA/note ; faux état terminé corrigé, empreintes QRC/résultats inchangées.
- [ ] Sauvegarde cohérente : parcours 08/11 terminé mais non snapshot ; restauration réelle subordonnée à un Export data géré et à une destination privée isolée distincte.
- [x] 3 697 tests globaux, contrats SQL/handler, compilation et déploiements ciblés ; rapport `docs/priorites-persistance-qrc-sauvegarde-2026-11-08.md`.
- [ ] Publication frontend demandée ; ancien paquet encore servi au dernier contrôle, bascule à confirmer avant de déclarer le correctif client en ligne.

## 07/11 — Mise en service progressive autorisée (depuis 280112574)
- [x] Vraie intégration handler Deno + PostgREST + PostgreSQL jetable : v2/v3, concurrence, rejeu après commit, gel, journal et faux ACK — 1/1 PASS le 07/11.
- [x] Empreintes avant/après identiques ; migration additive 0243, fonction réponses déployée, durcissement 0244 appliqué ; rejeu admin réel sans écriture PASS.
- [x] Correctif d'export nocturne déployé seul, sans export réel ni prétention de snapshot ; restauration réelle toujours non prouvée.
- [x] Suite globale 3 688 PASS / 0 échec ; build OK ; scan frais relu sans contournement.
- [ ] Publication frontend NON APPELÉE : 4 erreurs RLS indépendantes (`bilan_future_opening`, `bilan_identite_flags`, `bilan_snapshot_flags`, `module_regles_validation`) ; patch isolé `answerPersistence` préparé, lot de 167 fichiers non publié.

## 07/11 — Blocages restants (22P05, sécurité, sauvegarde cohérente)
- [x] 22P05 : projection + original exact versionné (v3 additive), ACK par relecture exacte, refus définitif sans boucle si non activé, V2 écarté localement, message RAM honnête ; tests jetables + Vitest PASS.
- [x] Sécurité : appelants réels vérifiés en SELECT, aucun cron dépendant, rôle cron retiré, garde-fou d'application, retour arrière testé.
- [x] Sauvegarde : script de restauration sur base jetable testé ; instantané cohérent = sauvegarde gérée/Export data uniquement.
- [x] Migration v3 0243, fonction réponses et durcissement 0244 appliqués le 07/11 avec tests et empreintes ; export corrigé déployé. Frontend non publié à cause de quatre alertes RLS critiques indépendantes.
- [ ] Restauration d'un « Export data » réel sur base jetable : nécessite que le responsable lance l'export depuis l'interface.

## 06/11 — Trois accords nominatifs et prévention des jalons prématurés
- [x] Audit lecture seule des trois UUID : aucune ligne EDOF et aucun connecteur/preuve externe de NON-validation ; CATANIA, NIKA et KEBBAB restent donc PROTÉGÉS. Projections confirmées comme indicatives, jamais écrites.
- [x] Aucun taux, relevé gel-v2, réponse, note, signature ou autre dossier modifié ; aucune exécution de `geler_releves_fin_acces()`.
- [x] Candidats prospectifs hors historique des migrations : périmètre serveur exhaustif, ajouts tardifs exclus, preuve append-only/idempotente ; gel-v3 distinct utilisant verdicts et attribution archivés, ancien gel-v2 inchangé.
- [x] 81 tests Vitest ciblés PASS (VTC/TAXI/TA/VA, preuve fausse/indéterminée, activités, ancien gel), 25/25 contrats SQL de validation PASS sur PostgreSQL jetable, TypeScript/build OK ; bundle candidat synchronisé, sans déploiement.
- [ ] Contrat SQL du gel-v3 NON PROUVÉ : harnais auxiliaire incomplet retiré, ne pas le compter comme réussi ; ne pas déployer ce candidat avant un contrat SQL dédié réussi.
- [ ] Écriture des trois taux BLOQUÉE par l’absence de preuve externe fiable de NON-validation EDOF ; publication/déploiement BLOQUÉS en attente de revue globale de l’aperçu et du contrat SQL du gel.

## 06/11 — Tableau de bord : apprenants à 100 % depuis septembre
- [x] Périmètre validé : 101 dossiers non supprimés créés depuis le 01/09/2026 ; critère « Modules (jalons) » = 100 % OU « TAUX TOTAL » ≥ 100 %, mêmes calculs que la fiche.
- [x] Carte avec les deux taux, accès à la fiche, masquage individuel réversible sur ce navigateur, signalement des lectures impossibles et calcul différé à l’approche pour ne pas saturer le tableau de bord.
- [x] 34 tests PASS, TypeScript/build OK ; contrôle réel : 10 apprenants affichés, 1 lecture indisponible signalée, retrait 10→9 persistant après rechargement, réaffichage 9→10, concordance fiche 100 % jalons / 0 % total ; aucune modification de dossier ni publication.
- [x] Carte remontée juste sous les quatre indicateurs, analyse immédiate et affichage progressif ; contrôle 1366×1125 : carte visible à 9,7 s, premier nom à 24,7 s, 10 noms à la fin, aucune erreur HTTP/page ; calculs et masquage inchangés, non publié.

## 06/11 — Supports T3P/Gestion, lot 1/3 (VTC 2 + TAXI 10)
- [x] Lecture seule : cinq cours ciblés par module ; VTC 2 sans PDF, TAXI 10 avec paires et forme-finder à préserver ; 5 PPTX et 5 PDF valides.
- [x] Dix nouveaux médias avec `?v=20261106` ; 15 liens remplacés et cinq PDF ajoutés au VTC, sans autre modification.
- [x] Relecture serveur : 20 liens exacts, dix URL HTTP 200, empreintes des autres cours/champs/exercices et forme-finder strictement identiques ; anciens fichiers conservés, aucune publication frontend.

## 06/11 — Bouton « À envoyer par mail »
- [x] Ouvrir directement l’aperçu de relance depuis Formulaires, ramener la zone à l’écran et conserver la vérification explicite avant tout envoi.
- [x] 10 tests PASS (aperçu, fermeture sans réouverture, zéro signature, adresse absente, règles de relance), TypeScript PASS ; clic réel à 1366×1125 avec retour visible et zéro appel d’envoi, sans publication.

## 06/11 — Design admin des QCM/QRC et taux premier essai
- [x] QCM réel Gestion Q3 capturé avant/après ; en-tête compact, choix A/B/C/D sur deux colonnes, bonne réponse sobre, QRC harmonisées, taux intégrés par session à droite sur ordinateur et sous la question sur tablette.
- [x] UI/CSS seulement : contenus, corrigés, calculs, filtres et données inchangés ; 56 tests PASS, TypeScript/build PASS, PC/tablette sans débordement, filtres Global/JOURNÉE/SOIRÉE et n/N vérifiés, non publié.

## 06/11 — URGENT production : terminer « Refaire uniquement les questions fausses »
- [x] Cause exacte : course d’enregistrement pendant un envoi lent ; `revisionState` entier reste à une ancienne base, le serveur ignore l’enveloppe mais avance score/write_seq, puis la clôture est bloquée avant appel. Six révisions récentes preuves (1 réponse serveur malgré 30–480 événements) ; pas un refus RLS/réseau, production contient déjà les protections antérieures.
- [x] Correctif aperçu `answerPersistence.ts` + retour conditionnel `stored_reponses` dans `upsert-reponse-apprenant` : chaînage des bases confirmées, nouvelle opération seulement pour extension stricte sans conflit serveur/file, sinon blocage conservé. Aucune écriture réelle.
- [x] 29 tests PASS, dont parcours fictif QCM+QRC avec rechargement, retour, déconnexion/reconnexion et double clic ; EB1–EB6 VTC/TAXI/TA couverts, aucun succès sans confirmation. Build OK ; serveur simulé, pas de test réel publié.
- [ ] Déploiement de la fonction et publication frontend : en attente de revue des autres changements d’aperçu et d’autorisation explicite de périmètre. Élève bloqué : ne rien effacer/recommencer, conserver tablette et file locale ; aucune clôture manuelle sûre avant correctif.

## 06/11 — Menu Correction QRC V2 : rouge uniquement en cours
- [x] Limiter la couleur rouge aux sessions CRM réellement en cours à la date locale ; passées et futures en noir, lignes spéciales neutres.
- [x] Conserver libellés, dates, ordre, sélection, filtres et données ; menu ouvert vérifié (3 en cours rouges, 12 autres noires, 2 spéciales noires), 9 tests de dates PASS, sans publication.

## 06/11 — Règle stricte QCM corrigé admin / QRC correction validée
- [x] Sources tracées : QCM serveur depuis snapshot publié, QRC humaines prioritaires et IA seulement après publication prouvée ; 0 IA sans preuve, 0 IA après humain, 0 QRC manquante, 0 définitif avec QRC restantes. Humain partiel = points conservés + provisoire.
- [x] VTC soir EB1 : 8 passages natifs, 7 comparables sans variation, Gestion non comparable ; T3P 10 QRC en attente sur 2 passages, Gestion 2, Sécurité 0. Le 7 de la capture n’apparaît pas dans les résultats natifs actuels ; aucune note touchée.
- [x] Calcul à blanc : 59 écarts définitifs chez 30 élèves toutes tentatives, 52 sur dernières tentatives, tous à la hausse ; 24 examens complets chez 13 élèves, zéro verdict changé. 32 zéros automatiques réponse vide (31 réels + 1 fictif) : points inchangés mais statut strict = attente ; un examen simulé deviendrait en attente.
- [x] Rapport `audit-notation-qcm-qrc-2026-11-06.xlsx` : correctif minimal proposé pour publication QCM, régularisations traçables, replis QRC non validés/déterministes et attente V2 ; tests définis mais non exécutés. Aucune écriture réelle, aucun code modifié, aucune publication.

## 06/11 — Source de vérité du corrigé admin et divergences
- [x] Corrigé admin réel = `module_editor_state` ; Q2 B et Q3 B+C conformes à la capture. Nouvelles tentatives figées depuis la version publiée `exam_content_versions`, source distincte : Q2 publié B+C, Q3 publié B+C.
- [x] Comparaisons strictes EB1–EB6 VTC/TAXI/TA : 17 lignes natives globales (9 questions distinctes, 273 occurrences), dont 16 lignes admin ≠ publié (8 questions distinctes) ; 9 lignes dans les sessions actives. 100 lignes d’anciennes fiches globales sur ID+énoncé identiques, options à confirmer ; zéro dans les sessions actives.
- [x] Taux premier essai : correction du snapshot de la tentative avec identité énoncé/options ; aucun basculement rétroactif sur le corrigé courant. Les journaux groupés existants ne suffisent pas à rattacher chaque taux à une version de corrigé par question.
- [x] Règle sûre et tableau complet dans `diagnostic-corrections-eb-2026-11-06.xlsx` : publication contrôlée pour le futur, révisions append-only et simulation validée pour l’historique, mêmes références note/taux après régularisation explicite. Aucune écriture de données, aucun code modifié et aucune publication.

## 06/11 — Revoir les notes de tous les élèves des sessions actives
- [x] Trois sessions actives, 40 élèves uniques après déduplication ; audit lecture seule des derniers passages avec corrigé actif et QRC validées.
- [x] 42 écarts de matière chez 22 élèves : 33 définitifs et 9 provisoires, tous à la hausse ; moyennes recalculées, aucun changement de verdict parmi les examens complets définitifs.
- [x] Validation « Appliquer les 42 » exécutée : 42/42 notes conformes à la relecture, 33 définitives et 9 provisoires préservées, 42 audits avant/après, zéro ancienne valeur restante ; réponses, copies et snapshots inchangés.

## 06/11 — EB1 affiché échoué 9,9 après corrections QRC
- [x] Identifier la tentative par les sept matières sans présumer l’identité ; contrôler QRC manuelles, notes matière serveur et ancienne fiche en lecture seule.
- [x] Recalculer le global avec les coefficients figés et le verdict ; distinguer note juste, ancienne fiche, cache et correctifs seulement en aperçu.
- [x] Fournir le tableau avant/après prouvé ; aucune écriture sans autorisation spécifique et aucune publication sans revue globale.
- [x] Corrigé actif de Corrections pris comme référence : Q2 B, Q4 A, Q9 A+B, Q13 B ; il est identique à l’ancienne fiche sur 20/20 QCM et donne Sécurité 11/20, global 9,9/20, non admis. Aucune donnée modifiée.
- [x] Résultat natif Sécurité régularisé 9 → 11 avec révision et journal ; le remplacement par 9,6 est écarté.
- [x] Point T3P identifié : QRC Q2 honorabilité, réponse « Casier judiciaire B2 », note manuelle actuelle 0/2 ; le QCM casier Q15 est déjà 1/1. Avec Q2 = 1/2 : T3P 16,5, global 10,1 et ADMIS (Sécurité 11). Aucune écriture automatique.
- [x] Régularisations appliquées avec journal avant/après : T3P Q2 0 → 1, T3P 16,5 et Sécurité 11 relues serveur ; global 10,1, ADMIS. Réponses, copies et snapshots inchangés.

## 06/11 — Taux d’échec au premier passage non affiché en rouge
- [x] Diagnostic : taux placés sous chaque question, pas dans les lignes de sessions. Deux causes : preuves natives rejetées (`revision_precedente` NULL et auteur `auth_user_id`), puis texte toujours gris. QRC sans preuve de correction et notes en attente non comptées comme échecs.
- [x] Données réelles relues : trois sessions actives, 12/16/18 éligibles ; onglets Global/JOURNÉE/SOIRÉE conformes. EB1 Gestion Q3 : 60 % (3/5) TAXI/TA, 29 % (4/14) VTC/TAXI journée, 100 % (1/1) soir ; avant = données insuffisantes grises.
- [x] Correctifs minimaux dans `premierPassageExamStats(Read).ts` et `QuestionFirstPassageRate.tsx` ; rouge si erreur prouvée > 0, zéro/inconnu neutre. 62 tests PASS, TypeScript et build OK, écran réel et ligne rouge vérifiés, aucune donnée modifiée.
- [x] QRC ajoutées au taux : copie réellement soumise + correction humaine prioritaire ou IA appliquée au même barème ; note maximale = réussite, attente/reprise = non prouvé. EB1 T3P Q1 réel : 50 % (2/4) TAXI/TA journée, 46 % (6/13) VTC/TAXI journée ; soir = 2 copies en attente, donc aucun taux inventé. Suffixes « non prouvé(s) » entièrement retirés de l’affichage. 70 tests PASS puis 36 tests d’affichage/calcul PASS, TypeScript/build/aperçu réel PASS.
- [ ] Publication BLOQUÉE : autres changements de l’aperçu non validés et autorisation distincte absente.

## 06/11 — Répercussion des corrections QRC sur matières, score global et admission
- [x] Audit lecture seule des 18 EB : 2 278 tentatives éligibles, 5 160 QRC corrigées, 824 passages natifs sans écart ; tests/neutralisées exclus, aucun recalcul persisté.
- [x] Calcul à blanc : BENNANI 9,6, MALKI 9,1, SELMI 6,0, tous non admis ; zéro note native à régulariser. Onze écarts anciens importés isolés : dix arrondis, un arbitrage BAISSA ; un FERREIRA provisoire avec deux QRC en attente.
- [x] Correctif minimal dans `coreExamPublication.ts` : la note serveur déjà sur 20 n’est plus divisée une seconde fois par le barème brut ; coefficients/admission et priorité au correcteur couverts. 406 tests PASS, TypeScript et build OK.
- [x] Aucune migration créée : zéro ligne validée pour régularisation. Procédure transactionnelle/idempotente/réversible documentée dans `docs/audit-repercussion-notes-qrc-2026-11-06.md` si un futur cas est prouvé ; aucune écriture de données.
- [ ] Publication BLOQUÉE : autres changements de l’aperçu non validés et autorisation distincte absente ; divergence QCM Sécurité des trois cas non arbitrée.

## 06/11 — Reprise durable « Refaire uniquement les questions fausses » EB VTC/TAXI
- [x] Audit du composant partagé EB1–EB6 VTC/TAXI : position forcée à zéro, validation non restaurée, clés de questions communes aux matières et sauvegarde directe sans file durable.
- [x] File serveur durable QCM/QRC, ordre/contexte/position/correction restaurés, clé matière+question, indication honnête ; double geste, requêtes tardives, conflits et clôture après reset bloqués sans écrasement.
- [x] Recommencer conserve l’ancien brouillon dans une nouvelle tentative ; clôture après flush et relecture serveur, un seul résultat ; aucune suppression ni donnée réelle modifiée.
- [x] 51 tests révision/files + 156 tests EB + 8 tests PostgreSQL jetables PASS ; deux scénarios Chromium fictifs ordinateur/tactile mobile PASS avec hors ligne, rechargements, reprise serveur sans file locale et un seul résultat ; TypeScript PASS.
- [ ] Publication BLOQUÉE : revue des autres changements embarqués et autorisation distincte requises ; aucun parcours sur un élève réel effectué.

## 06/11 — Sécurisation durable des examens blancs après remise à zéro
- [x] État initial sauvegardé sous `/tmp/eb-reset-securisation-etat-initial` ; référence : 169 Vitest PASS / 1 échec textuel obsolète, 19 tests SQL isolés PASS au contrôle précédent.
- [x] Récupérer sans perte les files locales des tentatives `terminee` et `abandonnee`, uniquement vers le même examen/matière et des identifiants du snapshot ; tablette/rechargement et mauvais snapshot couverts par tests et Chromium fictif isolé.
- [x] Migration additive 0242 : autorisation de reset V2 consommée au plus une fois sous verrou serveur ; double appareil, matières concurrentes, rejeu et rollback validés sur PostgreSQL jetable, aucune donnée réelle modifiée.
- [x] Avant « Terminer la matière », dernières valeurs serveur vérifiées ; clôture abandonnée refusée et état illisible en échec fermé.
- [x] Reset admin complet remplacé par l’archivage officiel ; reset par matière destructif désactivé tant qu’aucun circuit d’archivage dédié sûr n’existe.
- [x] 156 Vitest + 10 contrats SQL jetables PASS ; test textuel obsolète corrigé ; scénario Chromium fictif hors ligne/reset/rechargement/nouvelle tentative/clôture PASS sans requête externe ; TypeScript PASS.
- [ ] Publication BLOQUÉE : revue explicite de tous les autres changements de l’aperçu et autorisation distincte requises.

## 06/11 — Correction QRC V2 : inscriptions croisées EB1-TAXI
- [x] Les 30 passages sont visibles dans chacune des deux sessions couvrantes avec les mêmes identifiants, une seule fois par session et la mention « Inscription croisée » ; EB1-TAXI a quitté le conflit, les vrais conflits restent.
- [x] Avertissement contre l’addition des totaux, EB1 VTC distinct, filtres/navigation inchangés ; 62 QRC visibles et empreinte des passages identique avant/après, aucune écriture.
- [x] 28 tests ciblés PASS ; série QRC 182 PASS + 1 échec ancien connu de reprise après clôture hors périmètre ; build OK ; écran réel et captures vérifiés sans erreur JS.
- [x] Vérification impérative complémentaire : EB1 VTC et EB1-TAXI ouverts dans la même session ; 67/30 passages, 10/6 candidats et 148/62 QRC concordent avec la base ; copies VTC/TAXI ouvertes sans mélange.
- [ ] Publication interdite sans autorisation distincte ; aucune publication effectuée.

## 06/11 — Passage automatique à la copie suivante après notation QRC
- [x] Après la note choisie, attente de la persistance serveur puis relecture confirmant l'état corrigé et la note exacte avant toute navigation.
- [x] Passage à la même question du candidat suivant dans la liste courante ; copie conservée avec erreur en cas d'échec/relecture non conforme et message explicite sur la dernière copie.
- [x] Flèches manuelles et commentaire non enregistré protégés ; 89 tests QRC PASS, quatre scénarios d'écran fictifs et flèches sur admin réel vérifiés sans cliquer de note réelle. Build OK, aucune donnée modifiée, aucune publication.

## 06/11 — Navigation entre copies dans Correction QRC V2
- [x] Ajouté uniquement « ← Retour » / « Suivant → » sous le barème, dans l'ordre des copies déjà filtrées, en conservant matière/question si possible.
- [x] Extrémités et enregistrement en cours désactivés ; confirmation avant d'abandonner un commentaire non enregistré.
- [x] 80 tests QRC PASS ; admin réel EB2 TAXI vérifié : précédent/suivant, même matière/question, extrémités, position sous barème et commentaire protégé. Aucune note/réponse/donnée modifiée, aucune publication.

## 05/11 22:18 — Indicateur admin TA uniquement
- [x] Six examens passerelle VTC→TAXI identifiés : eb1-ta…eb6-ta, modules virtuels 90012/90018–90022 ; audit legacy/V2, empreintes avant lecture seule.
- [x] Ajout du branchement visuel et lecture des seules identités TA ; composants/filtres/calculs de preuve réutilisés, aucune écriture Cloud ou comportement élève changé.
- [x] 57 tests ciblés + 123 critiques PASS ; global 3450 PASS/5 FAIL préexistants/13 ignorés. Six TA vérifiés admin réel, PC/mobile, filtres et limites affichés ; empreintes modules/tentatives/résultats/versions identiques. Rapport docs/erreur-premier-passage-ta-2026-11-05.md.
- [ ] Publication attend une autorisation distincte ; aucune publication dans ce périmètre.

## 05/11 21:46 — Premier passage dans l’éditeur des examens blancs
- [x] Audit lecture seule des identités, premières réponses et corrigés figés ; données insuffisantes explicitement exclues, copies historiques jamais promues en premier choix.
- [x] Affichage admin seul VTC/TAXI n°1–6, sessions actives, JOURNÉE/SOIRÉE et choix par ID ; composants existants réutilisés, aucun calcul exercice changé.
- [x] 42 tests ciblés + 123 critiques PASS ; suite générale 3435 PASS/5 FAIL préexistants/13 ignorés. Admin réel VTC/TAXI, PC/mobile et filtres vérifiés ; preuves insuffisantes affichées, zéro taux fictif. Empreintes contenu/versions identiques. Rapport docs/erreur-premier-passage-examens-blancs-2026-11-05.md.
- [ ] Publication interdite sans nouvelle autorisation explicite ; taux exhaustif ancien non prouvé faute de premières réponses/corrigés figés complets. Aucun changement de droits, de données pédagogiques ou de routage.

## 05/11 20:33 — Activation/publication Bilan Français
- [x] Cinq échecs investigués : quatre simulations sans auth, un attendu ancien agenda incompatible avec inscriptions ; pas une régression Français démontrée. 36 tests Français + 3 contrats SQL Français + 14 isolation PASS. Candidate/ancienne banque/routage live relus.
- [ ] Activation/publication BLOQUÉES : session nominative autorisée sans dossier élève (count=0), parcours réel ouverture/reprise/remise non vérifié ; aperçu global avec cinq tests généraux non remis à niveau et permissions connues non arbitrées. Pointeur vide, zéro reçu candidat ; aucun élève, donnée ou droit modifié. Détails dans ETAT.md.

## 05/11 20:22 — Publication premier passage
- [x] Filtre individuel par ID de session terminé, remise à zéro JOURNÉE/SOIRÉE et lectures admin réelles vérifiées PC/mobile, 20 tests calcul PASS ; aucune écriture pédagogique.
- [x] Suite globale exécutée : 3413 PASS, 5 FAIL préexistants (4 mock auth gel-par-module-raccordement, 1 règle agenda suivi-formation-indicateurs), 13 skipped ; aperçu build OK.
- [ ] Publication BLOQUÉE selon condition « conforme et sans risque » : cinq tests en échec et quatre alertes critiques de lecture de paramètres (bilan_future_opening, bilan_identite_flags, bilan_snapshot_flags, module_regles_validation) ; aucune correction de permissions hors périmètre et aucune demande de publication envoyée.

## 05/11 20:18 — Sessions explicites du premier passage
- [x] Sessions retenues nom/dates/modalité, filtres JOURNÉE/SOIRÉE, taux et n/N par catégorie et session ; aucune écriture Cloud.
- [x] 33 tests PASS : dates inclusives, périodes distinctes, déduplication et catégorie sans session ; compte admin réel PC/mobile + actualisation vérifiés. Q1 : journée 0/2, soirée aucune réponse prouvée (18 exclus), global 0/2 ; non publié. Rapport docs/erreur-premier-passage-sessions-2026-11-05.md.

## 05/11 — Erreur au premier passage dans la liste admin
- [x] Lecture seule sessions actives JOUR/SOIR, inscriptions effectives, premières réponses journalisées + tentative 1 remise + preuve figée compatible ; jamais corrigé actuel ni note agrégée.
- [x] Affichage liste admin normale/plein écran, taux partiel et limites, partage par quiz_question_bindings, déduplication ; 28 tests PASS, compte admin réel Q1 marketing 0/2 avec 26 exclus non prouvés ; aucune écriture base/publication.
- [ ] Contrôle mobile complet NON PROUVÉ : navigation latérale existante masque la liste au petit format ; pas de modification hors périmètre. Anciennes données sans preuve conservées et exclues, taux exhaustif non prouvé.

## 05/11 19:45 UTC — Bilan Français : 63 QCM, neuf textes
- [x] Sources jaunes, 7 QCM par texte, Q14/Q15/Q87 ; 63 QCM, aucune QRC ni Q80 ajoutée, Q33 fragment d'énoncé remis dans l'énoncé selon DOCX.
- [x] Migration additive 0241 appliquée, version indépendante ca3fc116-a0b7-4c07-a2e6-996226b2151d insérée ; neuf supports, ancienne banque/reçus/soumissions/éligibilité et 1377 brouillons antérieurs identiques. Zéro activation, zéro nouveau reçu sur cette version.
- [x] 36 tests ciblés + 3 contrats SQL Français + 14 SQL isolation PASS ; simulations écran réel PC/mobile PASS. Pas de parcours élève authentifié réel vérifié : session disponible administrateur.
- [ ] Bascule/publication BLOQUÉES : suite complète 3393 PASS, 5 FAIL (gel-par-module-raccordement : mock auth absent, suivi-formation-indicateurs : ancien attendu agenda), 13 skipped. Aucun changement hors périmètre pour les résoudre. Rapport docs/bilan-francais-63-qcm-2026-11-05/ETAT.md.

## 05/11 15:07 — Source Word unique du Bilan Français reçue
- [x] Fichier réellement ouvert : XML et 21 pages extraits ; 10 textes, 98 questions (67 QCM explicites, 27 QRC, 4 complémentaires sans type explicite), aucune bonne réponse QCM marquée.
- [x] Q40/Q87/Q91/Q95–98 signalées par la source elle-même ; aucune correction pédagogique, écriture base ou publication à cette étape.
- [ ] Intégration ciblée 5/503 et 11/603 : corrigé QCM validé manquant et ambiguïtés de source à arbitrer ; préserver anciennes identités et snapshots, puis tests élève/admin avant publication.

## 05/11 — Convocations FC après paiement confirmé (préparation uniquement)
- [x] Rapprochements et modèle officiel lus ; neuf inscriptions auditées, montants dossier/session divergents et deux mails historiques à revoir, aucun seuil contractuel inventé.
- [x] Chaîne convocations distincte préparée : preuves admin, SQL non appliqué, fonction non déployée, unicité/session, journal, reprise bornée et quarantaine ; ancien bloc bancaire dangereux retiré de l'aperçu uniquement.
- [x] 61 Vitest + 14 SQL jetable PASS ; simulation fictive PC/mobile sans écriture ; empreintes live financières et inscriptions identiques ; rapport docs/convocations-fc-2026-11-05.md.
- [ ] Activation : bloque sur nouvelles autorisations de déploiement/publication/envoi, preuves de rapprochement/contrat et secret de planification ; revue/formulaire CRM et parcours authentifié réel restent à vérifier avant activation.

## Supports pratiques reçus — 04/11 14:52 UTC
- [x] Accord TA → support TAXI / VA → support VTC : partage déjà assuré par les modules pratiques communs 6/8 ; tests des six modalités ajoutés, sans changement des affectations ni des jalons.
- [x] Deux sources exactes vérifiées : 20 pages / 76 questions-réponses chacune ; accord d’ajout dans Déroulement, consultation seule, sans publication.
- [x] 40 pages rendues dans le stockage privé existant ; originaux non exposés, affichage dans cours id 2 des modules 6/8 sans remplacer les anciens supports.
- [x] 20 tests ciblés PASS ; lecteur isolé authentifié avec pages réelles TAXI/VTC, PC/mobile sans débordement, impression masquée ; build OK. Aucun changement de données pédagogiques ou publication.
- [ ] Parcours complet dans le module d’un élève : non prouvé (Baptiste dispose du module 12, pas 6) ; aucun compte élève utilisé ni accès modifié.

## Délai 57014 éditeur de questions — incident 04/11 15h18
- [x] 0239 jamais appliqué (constat live) ; trace 14:18:32 UTC identifiée ; aucune perte (clic suivant enregistré).
- [x] Copie isolée identique au live ; équivalence 16/16 PASS dont cas réel exo 82 ; mesure par contrôle : gain 0239 ≈ 25–30 %.
- [x] Cause dominante : base saturée en pointe (enregistrement 0,45 s isolé → 2,2 s moyen / 7,1 s max en ligne).
- [x] 0239 appliqué (accord 04/11) et vérifié actif ; contenus modules inchangés (empreinte identique avant/après).
- [x] Sonde élève 5 s → 30 s (aperçu, test PASS) ; publication à faire après accord.
- [ ] Lectures de progression (1er consommateur) et taille de l'instance : non traités.
- [ ] Test de persistance après rechargement : aucune sauvegarde Admin depuis la mise en place ; à faire au prochain enregistrement.

## Activation initiale seule — durée 24 h acceptée 04/11 10:09 UTC
- [x] Examiner émission actuelle et limites fournisseur : activation utilise recovery, expiration commune limitée à 24 h.
- [x] Accord 24 h enregistré ; lecture officielle tentée (`lovable auth settings show` : service distinct indisponible), configuration OTP réelle NON VÉRIFIÉE ; rapport docs/activation-initiale-24h-2026-11-04.md.
- [ ] Activation 24 h + renvoi sûr : bloqués par durée native commune à récupération 3 h et absence de preuve initial/activé ; lecture de valeur par propriétaire et capacité de durée séparée nécessaires, aucun changement global ni contournement.
- [ ] Tests lien valide/expiré/renvoi/activé : non exécutés, aucun vrai email ni modification de compte, aucune publication.

## Sauvegardes ciblées — autorisation 04/11
- [x] Reproduction SQL jetable score numérique 23514 / NULL accepté ; transport corrigé, aucun changement SQL actif.
- [x] Lecture etat_completion_modules via freshSessionRead ; HTTP anonyme 401/42501 et auth 200 vérifiés ; aucun GRANT.
- [x] Files auditées, aucune récupération locale prétendue ; 90 tests client et 7 SQL isolés PASS.
- [x] Rapport docs/sauvegardes-ciblees-2026-11-04.md ; aucune publication ni écriture fictive Cloud.
- [ ] Publication et vérification sur appareils élèves : attend accord distinct ; payloads historiques exacts et vidage des files locales non disponibles.

## Espaces image/question → réponses, tous écrans — 02/11 13:35 UTC
- [x] Cause commune : cadre par défaut pleine largeur 4:3 d’ExamQuestionImage (exercices, examens blancs, résultats, bilans, éditeurs admin). Cadre ajusté à l’image visible ; Sécurité routière inchangée.
- [x] 11 dispositions × 5 formats + sans image × 4 largeurs : blanc après image 1–41 px (avant jusqu’à 630 px), 0 rognage/débordement ; chargement lent = un seul ajustement, réouverture sans saut, erreur compacte. Tests image 116 PASS ; suite 3287 PASS, 1 échec préexistant émargements hors périmètre.
- [ ] Session élève/admin réelle non testée ; publication après contrôles.

## Espacement images Sécurité routière — 02/11
- [x] Cause : cadre pleine largeur 4:3 + image en taille automatique ; cadre borné optionnel pour seuls exercices Sécurité routière, image entière sans marge interne. Contenus et valeurs par défaut ailleurs inchangés.
- [x] Écran réel isolé Q9 sur 1280/768/1024/390 : marge8px, zéro débordement/erreurJS ;105 images Partie1 chargées et contenues,117 tests PASS, aperçu buildOK. Journal docs/securite-routiere-espacement-2026-11-02.md ; aucun compte réel testé, Cloud ni publication.

## Réinitialisation mot de passe — 02/11 09:40 UTC
- [x] Œil indépendant nouveau mot de passe/confirmation et refus français sur /reset-password, sans changer les comptes ni les contrôles serveur.
- [x] 14 tests isolés PASS : affichage/masquage indépendant, refus serveur sans déconnexion/succès, nouvel essai avec confirmation ; build OK. Aucun mail réel. Connexion/lien réel non consommé et parcours hébergé NON PROUVÉ. Journal docs/reinitialisation-mot-de-passe-2026-11-02.md.
- [ ] Validité 3 h : réglage hébergé réservé au propriétaire, Plus → Users → Auth settings → Email → Email OTP expiration (seconds) = 10800 ; non modifié ni prouvé.
- [ ] Publication interdite sans autorisation distincte ; corrections disponibles seulement dans l’aperçu.

## Incident accès RHAIMA / ABDULLBASET — 02/11 07:36 UTC
- [x] Identités uniques vérifiées : RHAIMA ta-e actif 02/11–31/05 ; NESAR compte connecté ce matin mais cours expirés31/10, examen enregistré29/09 et aucune extension.
- [x] Deux demandes récupération HTTP200 et hooks réussis : RHAIMA07:38:58 / NESAR07:39:48 UTC, emails enregistrés, aucun jeton exposé ; livraison boîte et clic NON PROUVÉS.
- [x] Ancien lien expiré +429 confirmés ; page publiée refus expiré vérifiée,8 tests PASS, empreintes67réponses/31quiz/10complétions/22feuilles identiques. Aucun code/SQL actif/déploiement/publication ; rapport docs/incident-acces-rhaima-nesar-2026-11-02.md.
- [x] NESAR prolongation02/11 07:54:07UTC : seule date_fin_cours_en_ligne31/10→14/11 inclus (updated_at automatique) ;9 tests PASS, empreintes67réponses/31quiz/10complétions/22feuilles et autres dossiers identiques. Aucune migration/publication/envoi ; rapport docs/nesar-prolongation-2026-11-02.md.
- [ ] NESAR ouverture autonome réelle : session nominative indisponible (approbation non disponible) ; bornes et données vérifiées, connexion/UI en compte élève NON PROUVÉES, aucun contournement ni consommation du lien.
- [ ] RHAIMA direction mobilité : demandeVTC→TAXI mais dossierTA/passerelle-taxi-elearning ; attend confirmation, aucune conversion/modules modifiés.

## Autorisation ciblée 28 VTC novembre — 01/11 16:11 UTC
- [x] Audit28 IDs :10auth valides/liens uniques,18absents ;Bekkis janvier conservé, accès par inscription novembre testé isolément.
- [ ] Création18 comptes : reprise01/11 16:50UTC,403 confirmé dans les logs pour89354720-37ec-4431-8f29-77108e0657e0 (naoufal.guenichi@gmail.com,user). CRM contact@ftransport.fr a le rôle serveur admin mais sa session n'est pas injectée ;mint nominatif refusé car approbation indisponible. Aucun contournement/création/envoi. Attend transmission autorisée de cette session par Lovable.
- [x] 38 feuilles ajoutées pour10comptes :20chacun/200total,0weekend/remplies, rejeu0 ;360 feuilles des18absents restent bloquées par absence de compte.
- [x] Migration0236 ciblée VTC deux sessions appliquée ;25PostgreSQL+181Vitest PASS, anciennes3053feuilles empreinte identique. Autres règles inchangées ;pas de site publié.
- [ ] Test connexion/signature élève et affichage publié :non prouvé sans session élève autorisée ;remise des18accès à préparer après création, envoi distinct non autorisé. Rapport docs/vtc-novembre-28-preparation-2026-11-01.md.
- [ ] Écart SMAIL : dossier en-ligne, inscription non exclue ;0236 lui donne néanmoins20créneaux théoriques et20feuilles vides existent. Ne pas forcer le mode ni demander de signature ;résoudre la contradiction avant de déclarer prêt.

## Émargements des inscriptions session — priorité 02/11/2026
- [x] Migration0235 appliquée : théorie inscrite sans agenda, deux créneaux ouvrés, TA5 premiers jours, horaires personnalisés, pratique distincte, passé sur régularisation seulement.
- [x] PostgreSQL isolé22/22 PASS avant et après fichier exact appliqué ; ouverture−30min et conservation des preuves.
- [x] Compteurs/feuilles individuels locaux harmonisés ;12 feuilles lundi vides ajoutées, rejeu0, aucun compte ni message. Aucun site publié.
- [x] Audit40 personnes/46 inscriptions :33 éligibles/66 créneaux lundi ;18 sans compte non créés,6TA semaine terminée,1e-learning exclu. Rapport docs/emargements-inscriptions-2026-11-01.md et CSV.
- [x] Empreinte3041 feuilles identique avant/après ;155 tests signatures PASS. Limites : aucune signature réelle testée, collectifs et relance serveur non harmonisés, calendriers d'autres sessions hors correction lundi.
- [ ] Accès autonome des18 inscrits sans compte : création/envoi interdits dans ce périmètre ; tests en compte réel non autorisés.
- [ ] Mise en ligne des compteurs/PDF locaux : attend accord explicite, aucune publication.

## Fiabilité globale après audit — 01/11/2026
- [ ] Priorité supplémentaire 00:37 : nouveau corrigé administrateur immédiatement autoritaire pour corrections/nouvelles tentatives ; caches/invalidation, A→B, éditions rapides, multichoix et 8 € sur deux sessions/appareils ; copies et notes figées inchangées, divergences explicites.
- [ ] P1 : protéger brouillons/soumissions contre concurrence, accusés trompeurs et réécritures ; tests fictifs uniquement.
- [ ] P2 : preuve EB par toutes les matières effectivement requises et remises ; compatibilité historique sans modification des acquis.
- [ ] P3 : diagnostic QRC en attente et copies vides ; aucune relance IA payante automatique ni renotation.
- [ ] P4 : recontrôler les divergences de comptes, 353 déficits et 74 feuilles passées sans image ; signaler les preuves insuffisantes, aucune réparation automatique.
- [ ] Tests ciblés, intégration PostgreSQL jetable, non-régression globale et simulations mobiles/tablettes ; rapport avant/après.
- [ ] Déploiement : interdit avant contrôles terminés et nouvelle confirmation explicite du propriétaire.

## Supports pratiques complets — 31/10 13:17 UTC
- [x] Audit : deux PDF originaux retrouvés dans la copie des pièces jointes, 19 pages / couverture 72 questions, trois parties présentes ; sources 20/76 non trouvées. Rapport docs/supports-pratiques-complets-audit-2026-10-31.md.
- [ ] Intégration intégrale séparée en consultation authentifiée uniquement, sans impact sur les acquis ; bloquée tant que les sources exactes ne sont pas vérifiées.
- [x] 6 tests existants PASS : séparation TAXI/VTC et aucune obligation ajoutée ; aucun code ni donnée Cloud changé.
- [ ] Parcours authentifiés et stabilité mobile/tablette : non prouvés ; images publiées HTTP403 depuis sandbox et contrôle bundle expiré. Aucune publication sans confirmation.

## Extension tablettes et autres modules — 31/10 10:44 UTC
- [x] Audit transversal et correctifs SlideViewer, images cours/questions, carousel et scroll révision ; aucune donnée pédagogique modifiée.
- [x]10 écrans pratiques locaux sur iPad/Android ;2 scénarios lecteurs portrait/paysage/hauteur/clavier, cadres images stables ; rapport docs/incident-tablettes-transversal-2026-10-31.md.
- [x] Suite3249 PASS/13 ignorés/zéro erreur, buildOK ;4 alertes de configuration triées en lecture seule, non supprimées.
- [ ] Publication et production : bloquées par couverture autonome hébergée complète non garantie, automatismes du compte TEST non isolés et lecteurs externes non prouvés.

## Lever les blocages de publication iPhone — 31/10 10:19 UTC
- [x] Auditer les16 échecs et10 erreurs : mocks/attentes corrigés ; timeout WelcomeBanner annulé au démontage. 3247 PASS /13 ignorés, zéro erreur non gérée le31/10 10:43.
- [x] Écrans6/8/12 vérifiés avec transport local isolé ; limites hébergées conservées au rapport tablette.
- [x] Tests globaux3249 PASS/zéro erreur et sécurité relus ; publication reste conditionnée aux limites nommées plus haut.

## Incident généralisé pratiques iPhone — 31/10 10:01 UTC
- [x] Cartographie code + lecture Cloud6/8/12 : TAXI/TA partagent6/12, VTC/VA8 ; PDF, PPT sans PDF, images et supports Lyon distingués.
- [x] Correctifs partagés PDF (largeur mobile, navigation explicite, source/page, scroll local), cadres images, timeout auth non assimilé à logout, cleanup reconnect.
- [x] 43 tests ciblés PASS ;10 simulations WebKit/Chromium PASS avec médias/auth fictifs. Rapport docs/incident-pratiques-mobile-2026-10-31.md.
- [ ] Tests hébergés et supports réels complets : bloqués par isolation compte test non garantie ; Office/PWA réelle non prouvés.
- [ ] Publication : échecs globaux levés (3249 PASS), couverture hébergée/tablette complète et lecteurs externes non prouvés ; aucun déploiement.

## Incident iPhone — compte TEST isolé — 31/10
- [ ] Compte hébergé : bloqué tant que tous les envois automatiques et statistiques ne sont pas exclus ; aucun compte réel utilisé.
- [x] Profil TEST local WebKit iPhone13 : largeur canvas372→372, scroll delta0, retour=1 vérification ; QCM/QRC conservés après reload/arrière/avant (transport simulé). Page temporaire retirée, contexte détruit, aucun appel Cloud.
- [x] Hook connexion : lectures différées hors callback auth, événements regroupés, même identité vérifiée, contrôle révocation60s conservé ; 31 tests ciblés PASS. Rapport docs/incident-iphone-test-isole-2026-10-31.md.
- [ ] Tests auth hébergés/PWA réelle : bloqués par isolation incomplète ; deux erreurs worker WebKit local conservées au rapport. Global3218 PASS/16 FAIL/13 skipped,10 erreurs ; aucune publication.

## Synchronisation Riyad LABIOD — 30/10 15:41 UTC
- [x] Lecture réelle sept modules : 5/7 cohérent avec la projection ; module2 exercices7/72 incomplets, module4 première copie118/206, révision206 non soumise. Jalons100 ignorait les détails ; aucun gel. Rapport docs/riyad-synchronisation-jalons-2026-10-30.md.
- [x] Jalons live : mêmes détails/soumissions et garde historique après dispenses, 95,5% vérifié ; élève événements réponses/complétions + focus/online. Aucune écriture Cloud ni contenu/proof modifié.
- [x] Serveur (0230–0232, actif) : verdict unique `etat_completion_modules` lu par élève/fiche admin/EDOF/jalons ; validation refusée si QCM sans réponse ; sauvegarde tardive ne vide plus une réponse. Aperçu Riyad 5/7, 95,5 %. 17 tests SQL + 61 tests ciblés PASS.
- [ ] Publication de l'interface : bloquée — 16 tests en échec déjà présents dans la version en ligne ; multi-appareils NON PROUVÉ ; correction historique non faite (modules 2/4 de Riyad réellement incomplets).
- [x] 123 tests PASS/11 fichiers ; fiche réelle + Vue apprenant5/7, restants2/4, reload stable, buildOK. Audit global426 lignes/204 dossiers après preuves soumises ; aucun retraitement.
- [ ] Achèvement réel7/7 et exhaustivité historique BLOQUÉS : versions initiales2/4 non récupérées, révisionT3P non soumise,12 clésmodule2 sans preuve. Test autonomie/multiappareils après soumission réelle NON PROUVÉ ; aucun test sur compte réel. Publication suspendue : test annexe couleur FAIL et autres contrôles globaux inachevés.

## Mail signatures manquantes — 30/10 15:39 UTC
- [x] Bouton Relance signatures ajouté au suivi présentiel, réutilise aperçu/relecture/confirmation CRM ; aucun envoi de test.
- [x] Compte admin : ouverture tableau de bord → relance FIACRE → aperçu mail vérifiée ; 31 tests PASS. Aucun mail envoyé, aucune publication.

## Signatures réelles — 30/10 15:27 UTC
- [x] Audit Ilyes : TA dix créneaux/10 images, aucune pratique réservée/inscrite ; +2 forfait client.22 feuilles futures sans image conservées ; origine exacte du lot12/10 NON PROUVÉE.
- [x] Lecture nominative457 dossiers,3041 feuilles :79 plannings incomplets,45 dossiers hors planning,34 horodatages sans image,0 doublon ; rapport docs/audit-emargements-2026-10-30.md et CSV Files. Empreinte avant/après identique.
- [x] Compteurs partagés selon planning réel, résumé en haut des fiches, taux/Documents/EDOF harmonisés ; aucune écritureCloud ni preuve/calendrier modifié.
- [x] 191 tests/18 fichiers PASS ; aperçu buildOK ; compte admin réel ficheIlyes/Formulaires10/10 et mobile lisible. Aucun mail/SMS/IA/attestation/publication.
- [ ] Publication BLOQUÉE : confirmer horaire27/10 après-midi (agenda13–15=29h contre30h affichées), plannings incomplets et concordance serveur/attestations. Tests SQL et parcours de tous les comptes NON PROUVÉS ; audit détaillé des attestations existantes non terminé (preuves complémentaires requises).

## Livres reçus — 30/10 15:06 UTC
- [x] TAXI113 / VTC87 / TA53 / VA27 pages ; deux fichiers TA byte-identiques ; seuls modules70–73 concernés.
- [x] Visionneuse masquée à l'impression ; PDF original élève toujours refusé côté serveur, aucune modification de questions/données.
- [ ] Préparer les nouvelles versions privées : TAXI113/TA53/VA27 images temporaires ; VTC incomplet (conversion trop lente/ensemble alternatif incomplet). Aucun téléversement ni pointeur changé ; anciens livres conservés.
- [x] Visionneuse actuelle testée isolément avec session admin : navigation TA et média print blanc ; buildOK. Nouvelles versions et parcours élève NON PROUVÉS.
- [ ] Activer seulement après validation globale ; aucune publication dans ce lot.

## Contrôle de connaissances absent — 30/10 12:01 UTC
- [x] Lecture seule session TAXI/TA du 26/10 au 16/11 : module13 absent des listes explicites de Mohktar BEN ALI, Ilyes Dakhlaoui, CIHAN RAYMAN et Harutyun Pndukyan ; ce dernier a une date d’accès expirée. MASSINISSA HADDOU a une liste NULL, distincte d’une exclusion explicite.
- [x] Cause confirmée : listes par défaut TA/TA e-présentiel des formulaires création et modification omettent13, contrairement au catalogue commun ; les listes TAXI le contiennent. ListeNULL bénéficie du parcours par défaut côté élève (pas une absence confirmée).
- [x] Accord « Oui, les trois élèves » : module13 ajouté seul aux trois listes actives sous verrou/comparaison exacte, trois événements audit ; formulaires création/modification TA et TA e-présentiel corrigés. Harutyun et listeNULL inchangés.
- [x] 55 tests PASS ; empreintes des trois dossiers hors modules, réponses, validations et216 snapshots strictement identiques avant/après. Fiche Mohktar relue dans CRM : contrôle coché, aucune sauvegarde UI ni soumission. Build OK ; ajouts d’accès effectifs Cloud, formulaires non publiés.
- [ ] Ouverture autonome du contrôle depuis un compte élève NON PROUVÉE (consultation CRM seule, aucun compte réel connecté pour test) ; formulaires corrigés attendent publication autorisée.

## Objets oubliés TAXI — 30/10 11:31
- [x] Page officielle et scan2024 article6/p5 lus ; vérifier avant éloignement, pas avant descente. Texte2026 article9 fraîchement relu, destinataire divergent.
- [x] Inventaire code + JSON/banques Cloud ; feedbacks locaux20/29 précisés, secours Contrôle57 délai24→72 seulement. Q35, banques et sauvegarde/IA conservés.
- [x] 53tests PASS, lecture copie technique soumise PC/mobile vérifiée, empreintes Cloud identiques ; rapport docs/objets-oublies-taxi-2026-10-30.md, aucune publication/écritureCloud.
- [ ] Harmonisation complète BLOQUÉE : articulation Métropole/Rhône pour ADS hors Métropole à arbitrer ; copies héritées ouvertes sans protection des références prouvée. Exhaustivité des supports binaires NON PROUVÉE.

## Corrigés spécialités Q29/Q35 — 30/10 11:17
- [x] QCM locaux29/35 identifiés ; supports Locale1 pages8–9, livre PDF33 et arrêté2026 art9/10 PDF17 lus.
- [x] Q35D accepté (≥6, tiers arrière, disque/lumineux/2h), feedbackQ29 explicite sans exclusion catégorique ; banques intactes,35 tests PASS, aucune écriture serveur/publication. Rapport docs/qrc-specialites-q29-q35-2026-10-30.md.
- [ ] Nouvelles clésQ29 BLOQUÉES : lieu de dépose du client absent de l’énoncé, texte dit mairie de dépose non prise en charge ; arbitrage utilisateur nécessaire.

## Visibilité prolongation d’accès — 30/10 11:15
- [x] Onglet existant renommé « Ajouter un mois d’accès », raccourci près de Réinscription ouvrant l’onglet et le faisant défiler ; aucune prolongation automatique.
- [x] Aperçu administrateur : raccourci ouvre onglet actif, proposition serveur et action de confirmation visibles, aucune réactivation exécutée ; 4 tests PASS, build OK. Aucune publication.

## Choix dates Examen et Réussite — 30/10
- [x] Masquer dates passées dans les deux sélecteurs théorie, proposer prochaine session selon jour Paris ; garder catalogue et dossiers historiques inchangés.
- [x] 13 tests ciblés PASS ; aperçu administrateur : sept dates futures, choix janvier confirmé ; build OK, aucune publication.

## Sauvegarde durable des deux quiz QRC TAXI — 30/10 10:40 UTC
- [x] Audit : local seulement/finalisation sans preuve ;78/84 champs requis, ancienne copie conservée/import brouillon explicite, facultatifs hors progression.
- [x] 0228 appliquée et vérifiée : propriétaire/RLS, réponses append-only, CAS, idempotence et soumission atomique ; aucun pont vers notes/modules.
- [x] Interface sauvegarde/horodatage/manquants, reprise2appareils et offline→online sous compte technique vérifié ; deux passages complets/relecture dont clic Soumettre spécialités. Sources intactes.
- [x] IA nouvelle soumission correspondante requise ; appels payants facultatifs bloqués402 tant que budget€ non vérifiable, refus réel testé sans fournisseur. Fonction ciblée déployée, aucune publication frontend.
- [x] 40 tests Vitest+8 groupes SQL jetable PASS, build OK ; docs/qrc-durable-2026-10-30.md. Compteur réponses officielles+1 concurrent non attribué, pas de fausse empreinte inchangée.
- [ ] Navigation complète portail depuis étapes8/3 NON PROUVÉE : compte technique formationVTC. Tests appareil physique, conflitUI deux versions et coupure soumission réelle non effectués ; interface NON PUBLIÉE en attente accord.

## Plafonds QRC IA et application — 30/10 10:35 UTC
- [x] Lecture seule : coûts enregistrés, plan Pro actif, recharges automatiques et recherche de limites bloquantes natives.
- [x] Chemin des quiz terminés confirmé dans la source : correction depuis réponse sauvegardée, sans reset ; accès actif et même navigateur nécessaires. Parcours hébergé ancien élève NON PROUVÉ, aucun retraitement automatique.
- [ ] Mise en place plafond global QRC20 €/mois civil Europe/Paris avec réservation atomique et alertes50/80/100 : BLOQUÉE par conversion crédits/euros et financement client non disponibles, à établir avant poursuite IA.
- [ ] Plafond total300 €/mois : BLOQUÉ par factures abonnement/recharges/hébergement et dépenses externes non disponibles, aucun contrôle global en euros prouvé.
- [x] Rapport docs/qrc-budgets-controles-2026-10-30.md : coûts crédits vs euros inconnus, aucune limite native trouvée, recharge auto100cr/mois distincte d’un budget€ ; aucune publication ni test IA payant.

## Choix réinscription et réactivation plateforme — 30/10 10:20 UTC
- [x] Diagnostic lecture seule : badge non éditable ; accès lié aux dates initiales, circuit IA avec garde propre ; règle d’historique séparé retenue.
- [x] Plan approuvé : choix Oui/Non par examen et nouvel onglet, périodes supplémentaires append-only, originaux conservés.
- [x] Commandes admin idempotentes/RLS + historique (0227), relecture, concurrence refusée ; écran et garde IA reconnaissent l’extension sans changer dates ou jalons. Fonction qrc-taxi-ia ciblée déployée, aucun appel IA.
- [x] 27 tests frontend +8 SQL isolés PASS ; fiche Naim lue, deux confirmations/readback navigateur simulés PASS ; build OK. Empreintes dossiers/documents identiques, tables nouvelles vides.
- [ ] Parcours hébergé complet après véritable écriture NON PROUVÉ : aucun dossier réel utilisé pour tester et aucun compte fictif réactivé sur Cloud. Frontend NON PUBLIÉ, attend accord ; journal docs/crm-reinscription-reactivation-2026-10-30.md.

## IA immédiate des quiz QRC TAXI — 30/10 10:07 UTC
- [x] Audit lecture seule : corriger-qrc existant non adapté (références client, pas d’auth/idempotence) ; circuit officiel en file exclu.
- [x] Accord plan : limites dédiées 60/heure +200/jour/compte glissantes, une active/compte ; migration0226 appliquée, reçus privés sans réponses brutes.
- [x] Endpoint immédiat authentifié actif : références serveur exactes, claim atomique, reprises transitoires bornées, résultats inconnus jamais rejoués, pause persistante402/403 ; Q5/Q6/Q13 à arbitrer sans note. Interface préparée, aucune publication.
- [x] 39 tests Vitest PASS +8 contrôles PostgreSQL jetable PASS ; IA réelle deux paraphrases1/1 et réponse incorrecte0, journal Gateway3 succès ; même réponse relue sans nouvel appel. Composants réels sous session technique PC/mobile PASS, sans débordement/erreur console.
- [ ] Navigation complète étapes8TAXI/3TA sous compte technique NON PROUVÉE : compte technique disponible affiche le parcoursVTC et garde multi-session ; aucune attribution/formation/session modifiée pour forcer le test. Emplacement et isolation couverts par tests existants. Rapport docs/qrc-taxi-ia-immediate-2026-10-30.md.

## Arbitrage QRC TAXI — 30/10 10:03 UTC
- [x] Demande : réponses seules, points contradictoires suspendus, copies intactes, aucune publication.
- [x] Feedback intégré complet/spécialités : alertes Q5/Q6 et précision CPAM Q13, énoncés/références/barème/stockage inchangés.
- [ ] Remplacement Q5/Q6 et quatrième équipement universel BLOQUÉ : arbitrage juridique nécessaire ; formulations exactes non validées.
- [ ] Contrôle13 BLOQUÉ : protection des références des copies en cours non prouvée ; aucune écriture Cloud.
- [x] 30 tests ciblés/non-régression PASS ; trois sources pédagogiques strictement identiques aux copies avant audit ; contrôle automatique build OK10:05:33Z. Parcours compte élève hébergé NON PROUVÉ.

## Corrections réglementaires QRC TAXI — 30/10 09:47 UTC
- [x] Localisation texte : intégré25/26/33, fiches TAXI/TA, H44/46/60, Cloud13/13100/212/213/220 ; sources officielles, loi juin2026 article28 relue et arrêté Rhône septembre2026 intégral.
- [ ] Corrections SUSPENDUES à validation : Q5 nouveau délit sans carte3ans/45000€, récidive3000€ non prouvée ; Q6 couleur=disponibilité, gaine universelle non prouvée ; Q13 trousse conventionnelle, quatrième universel non établi. Aucun contenu pédagogique modifié.
- [ ] Contrôle13 futur-only BLOQUÉ : 6 copies principales +1révision non terminées, protection de leurs références initiales non prouvée ; aucun JSON Cloud changé.
- [x] 27 tests existants isolés PASS ; rapport docs/qrc-taxi-corrections-audit-2026-10-30.md. Aucune publication/IA/envoi ; correction des nouvelles formulations et parcours élève NON PROUVÉS faute d'application autorisée.

## Bilans futurs isolés — 29/10 20:10 UTC
- [x] Circuit audité : retour perd le reçu, files anciennes sans identité de version, absence de preuve serveur ne signifie pas jamais commencé ; anciens circuits intacts.
- [x] Candidate commune indépendante 114/200/211/97/194 et provenance préparées,44 SR suspendues ; aucun import écran ni écriture Cloud.
- [x] 27 tests Vitest PASS + suite PostgreSQL jetable permissions/ouverture/correction/reprise PASS ; quatre empreintes Cloud strictement identiques avant/après.
- [ ] Activation/publication BLOQUÉES : éligibilité réelle, transport/interface reçu-scopés et pont de validation non prouvés ; aucune bascule pendant anciennes files actives.
- [x] Transport brouillons reçu+version (serveur prototype + client) testé ; reste : migration Cloud, écran, pont validation, compte technique.
- [x] Rapport docs/bilans-futurs-isoles-2026-10-29.md ; publication aucune, examens blancs et données anciennes inchangés.

## Publication en bloc et cohérence Bilan 5/11 — 29/10 19:24 UTC
- [x] Autorisation explicite de publier la version courante en bloc ; aucune nouvelle intervention sur les examens blancs.
- [x] Contrôle sécurité effectué ; trois alertes critiques de lecture de paramètres signalées, aucun changement de permissions.
- [x] 20 tests de protection des passages et projection exécutés ; publication demandée vers gestion.ftransport.fr.
- [x] Version servie confirmée HTTP200 : index-tGd3fqJR.js, empreinte cf64d6f7… ; navigateur public Connexion, aucune erreur JavaScript ; expression snapshot stricte retrouvée dans le fichier publié.
- [x] Contrôles isolés :20 tests avant publication,27/28 tests sauvegarde/reprise (1 ancien contrat de chaîne source FAIL),12 assertions PostgreSQL jetable et11 tests après publication PASS ; deux tests nouveaux prouvent le risque sans snapshot.
- [ ] Circuit cinq matières complet sous compte technique hébergé NON PROUVÉ : suspendu avant écriture, copies héritées sans snapshot ni preuve de contenu initial toujours présentes.
- [ ] Q104/Q48/Q206/Q73 suspendues : respectivement4/18/3/5 copies sans snapshot ; clés, texte ou liste pourraient changer. Q53 déjàC, aucun changement. Rapport docs/publication-coherence-bilans-2026-10-29-1924.md ; aucune donnée ni code applicatif modifié après publication.


## Onze questions validées — cohérence ciblée 29/10 17:58 UTC
- [x] Audit avant écriture : sections600/601/602 non partagées avec TA28 ; affichage snapshots5/11 remplacé par contenu actuel via questionsSnapshotCorrigees ; futurs600–602 figés depuisJSON, pas canonique.
- [x] RisqueQ104 prouvé :15 snapshots TAXI600,9 ancienne cléC/6 cléB ; copies non terminées600/601/602=10/8/4. STOP : aucune donnée pédagogique modifiée.
- [x] Trois tests fictifs réellement exécutés PASS : reproduction du remplacement rétroactif, snapshot source inchangé ; compilation automatique OK18:01:19Z. Aucun test compte hébergé ni envoi.
- [ ] Q104, typographie48, Q206 et libellé73 suspendus : protection affichage/barème des passages commencés et copies héritées non garantie ; accord distinct pour préparer futur-only requis. Q53 conserveC ; aucun ajout des exclusives59/112–114/198–199.
- [ ] Compte technique/UI/publication suspendus : aucune correction livrée avant protection prouvée ; rapport docs/onze-questions-coherence-2026-10-29.md et test diagnostic fictif conservés.

## Sauvegarde Admin 57014 — Q2 « prise en charge » — 29/10 14:12 UTC
- [x] Q2 identifiée : TAXI 11 / Bilan examen Réglementation locale (606) Q2, ligne officielle partagée TAXI 11/606 + TA 28/701 ; base déjà « 3,10€ » (module 14:11:32, liste officielle 14:11:41), journal humain 4 € → "? € → 3, € → 3,10€.
- [x] Cause prouvée sur copie jetable : contrôle de liaison Bilans VTC↔TAXI (290 liens) ≈4 s sur ≈5 s par sauvegarde du module 11 ; limite serveur 8 s → 57014 sous charge.
- [x] Correctif 0220 appliqué : même contrat en une passe, 12/12 cas équivalents (résultat, module, journal, liens), sauvegarde ≈1 s ; persistance/répétition/ancien onglet vérifiés sur copie jetable.
- [x] Éditeur : succès seulement après relecture module + liste officielle ; refus = bandeau « NON enregistrée », Réessayer explicite, alerte avant fermeture ; 50 tests PASS. Non publié.
- [ ] Clic réel Admin/élève sur Q2 en production NON fait (écrirait des valeurs intermédiaires dans le contenu réel pendant des bilans en cours).

## Protection futurs bilans TAXI/TA — accord 29/10 13:49 UTC
- [x] Prototype futur-only TA testé PostgreSQL jetable : nouvelles listes84/40, copies existantes non migrées et toujours saisissables, réouverture figée, accès refusé hors propriétaire. NON activé.
- [x] Corrigé les fausses intentions d’édition dans bilans11/28 : ID explicite, ensemble d’édition propre à l’instance ; ouverture réelle Q68 sans écriture +2 tests composant réel isolé PASS. Q68 rétablie A seule14:01:18Z après réécriture concurrente13:57:03Z, origine exacte NON PROUVÉE.
- [x] Rapport docs/bilan-ta-future-only-2026-10-29.md ;214 snapshots inchangés. Aucun mail/publication ni compte élève réel utilisé.
- [ ] Protection complète TA puis ajouts47/48/49 : bloqués,7 copies locales TA encore en cours, sans contenu initial complet ni garantie des brouillons navigateur ; aucune reconstruction effectuée. Six incertaines restent suspendues.
- [ ] Q73 masquage et renotation : ne pas toucher, la liste affichée participe aux calculs. Tests soumission de bout en bout sous compte technique hébergé NON PROUVÉS.
- [ ] Contrôle global :90/91 PASS, écart empreinte ancien module connaissances-ville hors périmètre non modifié. Cause concurrente Q68 et protection serveur durable nécessitent preuve de l’origine avant nouvelle modification.

## Cohérence bilans examen TAXI/TA nationale et locale — 29/10 13:35 UTC
- [x] Neuf absences locales auditées :47/48/49 valides,45/51 mauvaises clés,53 aucune bonne option,52 ambiguë/doublon de notion,46/54 procédure non prouvée.
- [x] Migration0219 appliquée : futurs TAXI11/606=40 canoniques, réouvertures intactes ;214 snapshots empreinte identique. Nationale84, sept ajouts antérieurs conservés, Q73 inactive.
- [x] 12 assertions SQL jetables +132 tests exhaustifs +23 tests existants PASS ; aperçu local TAXI/TA40 confirmé, national TA ouvert. Rapport docs/bilan-examen-coherence-2026-10-29.md. Aucun mail/publication.
- [ ] Ajouts47/48/49 et circuit futur-only TA : STOP,8 copies locales TA actuellement en cours sans snapshot ; ajouts modifieraient leur liste. Autorisation de préparation sûre/arbitrage requis.
- [ ] Q45/51/52/53 formulations/clés et46/54 suspendues : confirmation utilisateur nécessaire. Q73 historique non neutralisée : accord distinct requis.
- [ ] Incident lecture : première ouverture éditeur réécritQ68 enA+D ; A seule rétablie avecCAS, suivantes protégées sans écritures. Cause exacte et correctif NON PROUVÉS. Parcours élève autonome/soumission réelle non vérifiés.

## QCM document TAXI Bilan examen nationale — 29/10 10:31 UTC
- [x] Module11/605 confirmé, 9 manquants ; Q2 équivalent605/40, Q12 équivalent605/65, Q4 suspendue et DGFiP déjà dans605/18 ; QRC exclues, clés B+C/C+D/B+D contrôlées. Rapport docs/qcm-taxi-bilan-national-2026-10-29.md.
- [x] Accord explicite 29/10 10:56 UTC : neuf QCM1/3/5/7/10/11/13/14/16 insérés seuls dans la section605 partagée TAXI11/605 + TA28/700 (IDs89–97). 68→77 actifs ;2 301 anciennes questions,62 modules et64 bindings strictement identiques. QRC exclues,2/12 non dupliquées, DGFiP conservée.29 tests PASS ; copie navigateur TAXI/TA77 questions, clics/corrections/reload/Admin PASS, zéro écriture élève. Aucun code applicatif ni publication. Rapport exact mis à jour ; compte élève hébergé/soumission Cloud/temps réel production NON PROUVÉS, nécessitent compte technique et contrôle distinct sans données réelles.

## Intégrité montants Cas pratique — 29/10 10:19 UTC
- [x] Module12/exercice306/question4/A identifié ; JSON/canonique 8€ déjà enregistré, journal humain €/_€/8€ ; 31 848 choix JSON et 2 261 questions canoniques actifs inspectés, zéro € seul actuel. Rapport docs/integrite-montants-2026-10-29.md.
- [x] Révision locale pour accusés JSON/canoniques, € seul gardé localement, minuteur annulé à Enregistrer ; 79 tests distincts PASS, navigateur composants réels isolés/sauvegarde lente/clic/reload et coche module13 préservée, build OK ; aucun écrasement Cloud ni renotation.
- [ ] Compte technique hébergé, notation monétaire ouverte, historique complet et temps réel réel NON PROUVÉS ; publication ciblée non disponible sans embarquer travaux inachevés.

## Contrôle connaissances questions retirées — 29/10 10:04
- [x] Lecture : retraits Admin 199/201/204/207, tombstone antérieur69 ; 221 questions actuelles, IDs226/227 de la capture conservés. Cause navigateur Ahlem NON PROUVÉE.
- [x] Préparé module13 seul : membership/tombstones avant canonique, aucun fallback de liste ni prune concurrent, compteur écran courant, relecture événement/reconnexion sans polling ; aucun contenu Cloud modifié.
- [ ] 20 tests PASS et page ouverte fictive TAXI/TA 3→2 ; saisie TA, vrais comptes autonomes et événement realtime/reload restent NON PROUVÉS. Publication ciblée bloquée par travaux inachevés globaux ; rapport docs/controle-connaissances-sync-2026-10-29.md.

## Quiz jours fériés Cas pratique — 29/10
- [x] Quiz complémentaire de 11 dates 2026 en haut du module 12, identité distincte ; anciens quiz serveur empreinte identique, aucune obligation/jalon ajouté.
- [x] Protection serveur 0216 appliquée, 41 tests PASS et ouverture visuelle fictive 11 questions, compilation OK ; interface non publiée.
- [ ] Enregistrement complet avec compte élève autonome NON PROUVÉ ; aucun test d’écriture sur données réelles.

## Cas pratique TAXI absent — 29/10 09:12 UTC
- [x] Lecture seule : module 12 absent des affectations de 12 dossiers théoriques avec accès actif ou session actuelle, dont 7 en session TAXI/TA 26/10–16/11 ; aucune validation module 12 enregistrée pour ces dossiers.
- [x] Cause repérée : formulaire de création omet 12 dans les six listes TAXI/TA ; modification omet 12 dans les trois listes TA. Catalogue correct, dashboard respecte les listes explicites. Pratique seule [6] exclue.
- [x] Accord « Oui, les 12 dossiers » : module 12 ajouté seul aux douze listes avec comparaison exacte avant écriture et douze événements audit ; formulaires création TAXI/TA et modification TA corrigés.
- [x] Empreintes dossiers hors modules, réponses, validations et relevés figés identiques pour les 12 ; 39 tests PASS, ouverture module fictif avec 11 quiz/62 questions, compilation OK. Accès enregistrés en production ; formulaires non publiés.
- [ ] Connexion élève autonome NON PROUVÉE ; Salem Rachid reste abandonné et Pndukyan Harutyun garde sa date d’accès expirée, aucune réactivation. Les dénominateurs live peuvent inclure le module rétabli, sans modification des jalons historiques.

## Quiz non réalisés en rouge — 29/10
- [x] Cartes communes/équipements/pratique et listes d’activités : non réalisé en rouge, même facultatif ; dispense distincte de réalisation, jalons et preuves inchangés.
- [x] 74 tests fictifs PASS, clics parties 32/33 et cartes rouges 58/24 vérifiés dans l’aperçu Admin fictif, téléphone et compilation OK ; aucune publication.
- [ ] Connexion autonome élève et contrôle de chaque quiz historique masqué NON PROUVÉS ; limites du chantier Réalisés conservées.

## Pratique signée à valider EDOF — 29/10
- [x] Demande 09:51 : tri dernière date pratique décroissante, en-tête « Dates de formation pratique », retrait confirmé réversible par compte/navigateur uniquement ; 14 tests PASS, navigateur Admin réel annuler/retirer/recharger/réafficher vérifiés, compilation OK. Aucun dossier/signature modifié ; non publié.
- [x] Financements personnels exclus : 12 tests PASS, liste Admin 25 personnes vérifiée ; non publié.
- [x] Badge E = dernière validation EDOF ; liste de pratiques réellement signées, excluant E, absents/masqués/attente/théorie ; aucune écriture de dossier ou preuve.
- [x] 8 tests PASS et tableau de bord Admin connecté : 38 personnes avec dates, capture vérifiée, compilation OK ; rafraîchissement du badge après sauvegarde CRM corrigé. Non publié.

## Quiz communes session TAXI/TA — 29/10
- [x] SOUICI Ahlem identifiée ; onze élèves comparés, anciennes séries 7020/7021 10/6 vs activités 58/24, snapshots 241/282 expliqués. Rapport docs/quiz-communes-session-2026-10-29.md.
- [x] Module 7 : second filtrage concurrent d'ouverture désactivé, accès directs par IDs et distinction historique ; aucune écriture de preuve/affectation/contenu.
- [x] 72 tests PASS ; aperçu Admin fictif TA/TAXI, clics réels parties32/33→58/24, téléphone vérifié, compilation OK. Preuves entières couvrent vides Ahlem/CIHAN/Pogos ; tests Réalisés/émargement repassés.
- [ ] Connexion compte technique autonome et reproduction réseau dans deux ordres restent NON PROUVÉES ; production frontend non publiée pour ne pas embarquer les travaux globaux inachevés.

## Émargement trente minutes avant — 29/10
- [x] Règle centrale réelle −30 min, contrôles serveur et sélection théorie/pratique ; migration et fonction ciblées déployées, 2 996 lignes historiques empreinte identique.
- [x] Minuteur prochaine ouverture + retour fenêtre, priorité identité/conflit/présence/inactivité, date et heures réelles dans la feuille.
- [x] 11 tests SQL jetables + 36 frontend + 7 attestations PASS ; modal fictive vérifiée sans envoi, compilation OK. Rapport docs/emargement-trente-minutes-2026-10-29.md.
- [ ] Parcours réel compte fictif et popup à la frontière bureau/mobile : session technique refusée (approbation indisponible). Un test historique de classification hors périmètre échoue.
- [ ] Publication frontend ciblée bloquée : outil capture tout le projet, travaux Réalisés/autres inachevés ; aucune publication globale.

## Modules réellement complets — 29/10
- [x] Diagnostic lecture seule : drapeau completed insuffisant, réponses null réelles, faux Réalisés des modules dispensés ; 466 copies candidates/214 dossiers, pas de mutation.
- [x] Projection des vides historiques, compteurs CRM/élève, liens par quiz et cartes rouges ; 68 tests ciblés PASS, série élargie 77 PASS/1 FAIL contrat source ancien ; build OK. Rapport docs/modules-realises-preuves-2026-10-29.md.
- [ ] Connexion compte technique et contrôle mobile réel bloqués par approbation indisponible ; premier aperçu simulé bureau concluant, mobile masqué et nouvelles recherches échouées.
- [ ] Périmètre historique complet pages/archives tronquées et règles facultatives à vérifier avant publication ; aucun calcul d'heures ni jalon historique modifié. Non publié.

## Support PDF Pratique TAXI — 28/10 16:52 UTC
- [x] Support consultable uniquement module 6, 19 images sans PDF original, sans activité ni callback de fin ; acquis et jalons inchangés.
- [x] 22 tests PASS, compilation OK ; aperçu administrateur bureau/mobile : ouverture et navigation 19/19 vérifiées avec les images exactes interceptées localement. Non publié.
- [ ] Chargement CDN réel et compte élève NON PROUVÉS : même limitation d’accès hébergé que VTC ; aucune donnée ni droit modifié.

## Support PDF Pratique VTC — 28/10 16:44 UTC
- [x] Consultation complémentaire module 8 uniquement, 19 images hébergées ; aucun PDF original mis en ligne, bouton télécharger/imprimer absent.
- [x] Aucun cours/page/activité/jalon ajouté ; 19 tests PASS, compilation OK. Aperçu admin connecté bureau/375 : ouverture et navigation jusqu'à 19/19, pages rendues visuellement vérifiées avec images exactes interceptées (médias CDN absents du serveur local).
- [x] Non publié ; captures d'écran techniquement possibles. Journal docs/support-pratique-vtc-lyon-2026-10-28.md.
- [ ] Chargement CDN et parcours compte élève réel NON PROUVÉS : accès aux domaines hébergés refusé 403 depuis le sandbox ; aucun droit ni donnée élève modifié.

## Régression affichage quiz module 7 — 28/10 14:44 UTC
- [x] Cause lecture et aperçu réel : panneau communes inséré dans l'en-tête de toutes les pages, avant le quiz sélectionné ; pas de remplacement des données.
- [x] Panneaux limités aux quiz 7020/7021 correspondants ; bandeau jeux global retiré des autres étapes du module 7, validation/données inchangées.
- [x] Aperçu administrateur connecté bureau/375 : Consulats29/Hôpitaux30/Musées41, communes 58/24 ouvertes, lien Légende propre ; 17 tests PASS, compilation OK. Rapport docs/correction-affichage-module7-2026-10-28.md ; non publié.
- [ ] Parcours élève technique module 7 et validation/navigation Précédent/Suivant : aucun compte technique autorisé module 7 disponible ; aucun droit ajouté ni faux quiz validé pour tester.

## Textes à trous jeu Lyon — 28/10 14:37 UTC
- [ ] Complément 14:41 : isoler résultats par joueur/jeu/quiz/tentative/version ; réidentifier à finishedAt + 24 h exactement, sans prolongation au reload ; changement joueur avant 24 h sans fuite ni déconnexion formation.
- [ ] Tests fictifs requis : A quiz1→quiz2, B même appareil, 24 h−1/exact/+1, reload/multi-onglets, réponse lente A après B ; blocage identique : projet propriétaire lecture seule ici.
- [x] Reproductions supplémentaires par sauvegardes fictives sur site publié : résultat national transféré vers locale ; identité B modifiée dans second onglet sans masquer le résultat A ; champ de fin 48 h ignoré. Ce ne sont pas des connexions/completions réelles ; détails et captures dans le rapport commun.
- [x] Projet propriétaire Lyon Explorer Map identifié ; audit des deux textes (31/28 trous, banques 46/45), aucune réponse absente initialement.
- [x] Reproductions publiques anonymes bureau/375/768 : doublons limitent à 30/31 et 26/28 ; banque nationale copiée vers locale ; ancienne banque incomplète restaurée. Rapport docs/audit-textes-trous-lyon-2026-10-28.md.
- [ ] Correction bloquée : l'autre projet est accessible uniquement en copie lecture seule depuis cette conversation ; ouvrir Lyon Explorer Map pour appliquer les correctifs, sans toucher historiques/jalons.
- [ ] Après correction dans le projet propriétaire : preuve finale avec compte technique, clavier, changement joueur, remplacement/doublons, ancienne sauvegarde ; aucune publication globale ni correction livrée ici.

## Quiz communes visibles — 28/10 14:31 UTC
- [x] Lecture seule : deux quiz déjà présents en aperçu module 7 ; absents de la liste admin Édition, source code indépendante du JSON serveur.
- [x] Affichage ajouté aussi sous Exercices dans Édition, sans duplication de questions ni écriture élève.
- [x] Ouverture réelle admin des deux quiz (58/24 questions) dans Édition et présence en Aperçu ; aucune réponse soumise. 25 tests PASS dont exigences et volume nuls pour modules terminés avant ajout ; compilation OK. Nouvelle visibilité Édition non publiée, aucun déploiement global.

## Livres de formation 70–73 — suite 28/10 13:20 UTC
- [x] Audit fiches/définitions/QRC contre les 4 livres ; 2 corrections justifiées (définition honorabilité VTC/TAXI en nouvelle version, réponse ADS du cours TA) ; rapport docs/livres-formation-audit-2026-10-28.md.
- [x] Accès testés (admin, anonyme, jeton invalide, page hors livre, expiration, stockage public) ; 2 erreurs serveur corrigées et déployées ; aperçu bureau/tablette/mobile 4 livres.
- [x] Anciens livres archivés en privé ; références actives supprimées.
- [ ] Anciennes adresses publiques encore valides : suppression en attente de la résolution du calcul figé.
- [ ] Réponse attendue « Les mairies. » aux examens blancs TAXI/TA : nouvelle version + publication explicite, à valider.
- [ ] Tests élèves réels TAXI/TA/VA et clics de connexion : bloqués (approbation de connexion indisponible, aucun compte technique de ces formations).
- [ ] Publication des fiches/du correctif Imprimer : en attente d'accord.

## Kevin FERNANDES — « attente » sur EB4/EB5 — 28/10 09:10 UTC
- [x] Cause prouvée : 0 QRC en attente côté serveur (toutes corrigées IA, notes définitives) ; l'écran rejetait le passage serveur car l'ancienne fiche ne garde qu'un résumé des questions, puis affichait l'ancienne copie jamais corrigée.
- [x] Correctif d'affichage seul (matières à QRC, mêmes réponses, passage définitif) + 6 tests ; même cause chez 13 élèves / 61 matières, corrigée par le même affichage ; aucune IA relancée.
- [ ] Publication en attente d'accord (embarquerait Quiz 20 questions, PDF, émargement).

## Feuilles d’émargement invisibles après connexion — 28/10 09:00 UTC
- [x] Cause prouvée : la lecture de l’agenda est réservée Admin ; côté élève elle revenait vide sans erreur → aucune feuille due (11/11 élèves session TAXI/TA, 0 signature depuis le 26/10).
- [x] Lecture serveur dédiée (horaires des semaines de ses sessions seulement), refus = bandeau « vérification impossible » ; feuille contrôlée aussi en ouvrant un module directement (bandeau, fenêtre en revenant à l’accueil) ; TA = première semaine comme l’Admin.
- [x] 6 tests nouveaux PASS ; calcul réel lecture seule : 55 feuilles dues (5 × 11) au 28/10 ~10h Paris ; navigateur isolé élève fictif : fenêtre + bandeau, panne, module direct, mobile.
- [ ] Publication du site : en attente d’accord, car elle embarquerait aussi le travail Quiz Équipements 20 questions et le téléchargement PDF de ce matin.

## Refaire une matière d’examen blanc — 27/10 22:52 UTC, autorisation ciblée
- [x] Relire les circuits actuels et protections Kevin/QRC ; ne pas réutiliser la reprise neutralisante.
- [x] Préparer bouton résultat/temps écoulé, reçu serveur idempotent, copies/files conservées ; SQL non appliqué au backend partagé.
- [x] Tests isolés SQL et 36 tests frontend, bouton PC/mobile fictif, compilation OK ; aucun IA/mail/publication.
- [x] Ajouter historique par ID/snapshot lecture seule, bouton transition et retour/navigation par compte ; 38 tests frontend + 14 SQL simplifiés PASS, build OK.
- [ ] Extension ciblée NON APPLIQUÉE : test catalogue réel FAIL (clôture T2 modifie détails T1 via ensure_quiz_result_on_matiere_completion). Mapping V2 initial et consommation admin multi-entrées à sécuriser avant parcours complet fictif/déploiement ; aucun front global publié. Rapport `docs/refaire-matiere-etat-2026-10-27.md`.

## Questions ambiguës TAXI/TA vérifiées — 27/10 15:56 UTC, accord explicite
- [x] Appliquer seulement 70-11, 71-47 (explication), 71-10 (choix B DGFiP/TVA), 73-27 (énoncé le.taxi suspendu), 75-19 (exception ALD) si réponses/notes/terminés intacts ; journal avant/après.
- [x] Bloqués et signalés : 70-73 B, 74-6 D, 73-25 relettrage (réponses déjà enregistrées sur ces lettres) ; 70-19/65/78/87 et 74-17 inchangées.
- [x] Contrôle avant/après : 305 lignes de réponses identiques, 5 questions modifiées, 5 entrées de journal ; affichage écran élève NON PROUVÉ ; pas de publication.

## Rectification attestation Documents de formation — 26/10 17:16 UTC
- [x] Présentiel : premier jour des cours, dernier jour incluant la pratique ; supprimer les heures e-learning du PDF, total présentiel seul.
- [x] Signature et tampon privés de Documents dans la nouvelle attestation ; originaux préservés, aucun envoi/publication.
- [x] 25 tests PASS ; deux PDF téléchargés depuis Documents Formation admin et inspectés sur toutes leurs pages. Hakim ZAOUI : 14 septembre–21 octobre 2026, théorie 40 h + pratique 6 h = 46 h, aucune ligne e-learning. Hedy Khalfoun : jalons 41,7 %, aucune heure. Mise en page corrigée (total sorti du cadre et seconde page inutile), signature/tampon visibles sur une page ; compilation automatique OK. Contrôle exhaustif de tous les dossiers NON PROUVÉ.

## Signature et tampon séparés — 26/10
- [x] Extraction fidèle du PDF fourni, PNG transparents ajoutés comme nouveaux objets privés admin uniquement, sans remplacement.
- [x] Onglet adjacent à « À remplir / signer », téléchargement séparé, insertion/déplacement/taille dans une nouvelle version PDF locale ; circuit destinataire et originaux inchangés.
- [x] Aperçu admin connecté : deux images privées chargées, insertion indépendante et nouvelle copie PDF téléchargée ; page PDF inspectée, chevauchement initial corrigé. Compilation automatique OK ; aucun envoi/enregistrement de document, aucune publication. Téléphone et déplacement tactile NON PROUVÉS.

## Attestation fin de formation — 26/10
- [x] Présentiel : dates en toutes lettres françaises + durée totale ; e-learning : uniquement le taux total de jalons détaillé (relevé figé prioritaire, erreur de lecture = « indisponible », jamais de chiffre fabriqué).
- [x] 5 tests PASS, tsgo OK ; PDF réels vérifiés dans l'aperçu : Yasin LAIDAOUI (présentiel, dates longues + 61h48) et Hedy Khalfoun (e-learning, taux 41,7 % + détail par jalon, sans dates ni heures).
- [x] Publié 26/10 17:05 UTC (demande explicite « tout publier »), site attendu https://gestion.ftransport.fr.

## Bilan = somme des cours par matière — 26/10, accord explicite
- [x] Locale TAXI+TA : projection canonique 73/76/74/75 (29+29+22+25=105) vers section 204, identités historiques conservées, 242 lignes intactes en base.
- [x] T3P (133) et Gestion (150) : projection JSON depuis module 10 vers module 9, identités par source_exercice_id/source_question_id, protection d'enregistrement (version serveur rétablie avant toute sauvegarde).
- [x] 30 tests projection + 72 tests voisins PASS, tsgo OK, build OK ; aperçu admin vérifié : TAXI 133/150/241/103/126/98/105, TA 98/105 ; module_editor_state 9/27 inchangés (aucune écriture Cloud).
- Publié 26/10 17:05 UTC (accord explicite) ; réponses élèves individuelles relues non prouvées. Rapport docs/bilan-somme-cours-2026-10-26.md.

## Bilan TA nationale — périmètre exclusif 26/10 14:54 UTC
- [x] Affichage national TA seul : mêmes 64 + 34 questions actuelles ; ancienne liste TA non rattachée et 195 lignes partagées conservées, TAXI et enregistrement inchangés.
- [x] 32 tests PASS, diff avant/après, aperçu admin TAXI98/TA98 et sections locales à 242 identiques ; empreintes Cloud identiques, zéro écriture Cloud ; publié 26/10 17:05 UTC. Rapport docs/bilan-ta-nationale-selection-2026-10-26.md ; chaque résultat individuel NON PROUVÉ.

## Bilan TAXI nationale — autorisation ciblée 26/10
- [x] Sélection seule : 64 Partie 1 + 34 Partie 2 actuelles, sans l'ancienne question 15 ; identités Bilan existantes conservées, TA et les 195 lignes intacts.
- [x] 50 tests PASS ; aperçu admin réel TAXI98 / TA195, résultats accessibles ; compilation automatique OK, empreintes Cloud identiques. Rapport docs/bilan-taxi-nationale-selection-2026-10-26.md.
- Publié 26/10 17:05 UTC (accord explicite) ; lecture de chaque résultat individuel côté élève NON PROUVÉE, aucune donnée écrite.

## Refus P0520 éditeur TAXI — 26/10
- [x] Cause reproductible : sept anciennes tombstones absentes de la projection (73:6, 74:14/15/16/18/19, 76:28) retransformées en suppressions ; 964 questions JSON, 34 Partie 2 actives.
- [x] Copie serveur complète + intentions ID explicites, arrêt sur erreur de lecture, pas d'upsert canonique historique/renumérotation implicite ; P0520/CAS inchangés.
- [x] 167 Vitest + 3 PostgreSQL jetable PASS ; navigateur fonction isolée PASS, module10 JSON strictement identique avant/après ; compilation automatique OK ; rapport docs/repair-admin-save-p0520-2026-10-26.md.
- [ ] Vraie sauvegarde et réouverture Cloud de l'éditeur NON PROUVÉES : attend publication autorisée et protocole sans modification de questions réelles ; aucune publication effectuée.

## Nationale TAXI Partie 1 — rectification 26/10 : enrichir le COURS, pas les questions
- [x] Proposition 25 questions 99–123 retirée de l’interface ; anciens fichiers de travail non connectés, aucune suppression Cloud.
- [x] Audit 64 positions/IDs/UUID versus PowerPoint reçu, 17 notions absentes et 11 insuffisantes ; docs/audit-cours-nationale-partie1-2026-10-26.md.
- [x] PowerPoint/PDF 30 diapositives, 16 textes/images originaux identiques + 14 compléments avant conclusion ; relecture admin module10/cours10014 seulement, Partie2 et suivi élèves inchangés.
- [x] 28 tests PASS, validation PPTX PASS, chevauchements corrigés puis 14 diapositives réinspectées ; compilation automatique OK, liens visibles ordinateur/téléphone. Fichiers publics valides ; téléchargement localhost renvoie HTML (assets non servis localement), donc téléchargement complet via aperçu NON PROUVÉ.
- Activation élève/publication en attente d’accord ; actualité exhaustive des durées juridiques citées depuis le recueil officiel 2022 NON PROUVÉE. Aucun changement Cloud ni données élèves.

## Revue 8beeefc1 — délais français, 24/10
- [x] Corriger uniquement la classification délai/48h et codes SQL temporaires ; conserver les anciennes files bloquées.
- [x] Tests réels avant/après (16 échecs avant, 54/54 réussites après), journal ciblé ; aucune requête production/publication. Compilation automatique OK ; typecheck manuel NON EXÉCUTÉ (interdit par l’environnement).

## EB2 Khalfoun et chargement examens — 24/10, accord explicite
- [x] Corréler logs disponibles : traces navigateur présentes, logs serveur 22/23 absents ; HTTP400 exact NON PROUVÉ. Empreintes de référence exactes identiques avant/après.
- [x] Corriger refus persistants, reprise session et lectures bornées sans modifier données pédagogiques ; diagnostics sans réponses/secrets et 503 temporaire dans la fonction ciblée déployée.
- [x] Tests fictifs avant/après (4 échecs reproduits puis réussis), 244 tests, navigateur file conservée/refus non confirmé ; journal. Aucune publication frontend globale.
- Limites : appareil de Khalfoun inaccessible, cause historique 400/401 non prouvée ; version EB2 VTC V2 non publiée réellement, aucune version créée. Interface corrigée seulement dans aperçu, publication ciblée à décider sans autres brouillons.

## Dossier de bienvenue e-learning — 24/10
- [x] Afficher les dates réelles d’accès à l’étape 12 par lecture sécurisée du dossier, sans repli sur les dates de formation.
- [x] Ajouter deux confirmations obligatoires avant génération : accès non reçus/contact centre ; journée pratique dans les trois semaines à compter du lendemain de l’examen théorique.
- [x] Conserver les confirmations et dates dans les futurs dossiers/PDF uniquement ; contrôle complet sur données fictives, sans mail ni modification des documents existants.
- Fonction de lecture sécurisée déployée seule ; interface non publiée. Contrôles ordinateur/téléphone avec transports interceptés, tests ciblés et compilation automatique réussis. Enregistrement réel volontairement non testé ; journal : docs/journal-bienvenue-engagements-2026-10-24.md.

## Heures des sessions — 23/10 15:38 UTC
- [x] Corriger le double comptage des sessions théoriques communes chevauchantes dans la présence CRM ; TAXI 90 h + pratique 6 h, filières VTC/TA et sessions distinctes conservées.
- [x] 55 tests ciblés PASS ; compilation automatique OK ; fiche réelle admin Yasin contrôlée en lecture seule : 90 h théorie / 6 h pratique / 96 h total, taux total 100 %. Aucun changement de données ni publication.
- [x] Même contrôle pour Mohamed ISSAOUNE (23/10) : mêmes deux sessions de septembre chevauchantes ; fiche lue en lecture seule : session 72 h signées / 90 h (80 %), pratique 6/6 (100 %), total 78/96 = 81,3 %, dernière signature 23/10/2026. Aucun changement de code ni de données.
- Limite : un test annexe existant sur l'anomalie d'une feuille masquée échoue (attend une anomalie absente) ; code de classification non modifié. Contrôle individuel de tous les autres dossiers non exécuté. Journal : docs/journal-heures-sessions-2026-10-23.md. Correctif NON PUBLIÉ (en attente d'accord).

## Dates des activités e-learning — 23/10
- [x] Afficher première/dernière activité réelle dans TAUX E-LEARNING pour tous les dossiers, connexions seules exclues ; heures et données inchangées.
- [x] 39 tests ciblés réussis (4 fichiers), compilation automatique OK. Vérification CRM authentifiée non prouvée : session injectée reconnue comme apprenant introuvable, fiche admin inaccessible. Aucune publication ni écriture Cloud.

## IA QRC : traçabilité et reprise des 6 QRC Aba — 23/10 09:05 UTC
- [x] Trace par appel, budget de 140 s, migration 0199, fonction déployée, reprise unique des 6 : toutes corrigées, empreintes identiques. Journal : docs/journal-qrc-ia-trace-reprise-6-2026-10-23.md

## Pratique TAXI — exactement 3 exercices Rhône 2026 — 21/10 16:34 UTC
- [x] Recherche indépendante : copie de l’arrêté 69-2026-02-19-00002 lue, extraits articles/pages et limites dans docs/preuves/taxi-rhone-2026/sources.md ; site préfectoral en maintenance.
- [x] Ajout module 6 uniquement : calendrier/QCM 11 dates, quiz unique 30 questions, un exercice RTST 13 étapes/52 saisies. Les 10 cours et 1 quiz préexistants inchangés.
- [x] Gel prouvé fictivement : 100 %, date initiale, activités facultatives visibles ; VTC/VA inchangés ; TAXI/TA utilisent leur module 6 réel.
- [x] Backend explicitement partagé : configuration même instance ; aucune écriture élève/test droits. Garde serveur additive préparée uniquement, pas appliquée ; suivi réel indisponible tant que protection absente, aucun faux succès.
- [x] 90 tests unitaires/persistance/gel/files + 32 tests travaux antérieurs après adaptation cible TAXI ; PostgreSQL local jetable (11 assertions) ; Playwright quatre dimensions, trois exercices, réouverture/rechargement/isolement/panne et 13 étapes terminées avec transport fictif. Compilation automatique OK.
- [x] Empreintes avant/après : 62 modules bbb6f08b16f0d4f4ef29e3d9db32edbd ; 57 versions d4971facecd63dca241b9007da361b36 ; releve_jalons_gels 0 lignes ; 7 fichiers protégés inchangés. Journal détaillé conservé.
- [ ] NON PROUVÉ : sauvegarde/validation sur Cloud avec vraie session et tous triggers existants (protection non appliquée) ; vraie tablette physique ; annexe ZUPC actuelle, fauteuil, refus sécurité ivresse. Aucun chantier antérieur abandonné ni publié.
- NON PUBLIÉ ; aucune acceptation du brouillon, aucun envoi ni correction IA élève.

## Carte des jeux Lyon agrandie — 21/10 12:45 UTC
- [x] Jeux MONUMENTS et QUARTIERS (module 8 PRATIQUE VTC uniquement ; module 6 TAXI sans jeu, vérifié en base) : carte nettement plus grande, largeur disponible, hauteur confortable tablette, responsive ordinateur/mobile, panneaux sans écraser la carte, mode plein écran, zoom/déplacement faciles, recentrage.
- [x] Aucune modification de monuments, quartiers, questions, réponses, corrections, progressions ou signatures ; règles et scores préservés ; aucun message aux apprenants.
- [x] Vérifier rendu tablette portrait/paysage et fonctionnement du jeu après agrandissement ; indiquer si publié ou non.
- Fait 21/10 12:57 UTC : fenêtre du jeu ouverte d'office en mode agrandi (bouton Réduire/Agrandir conservé) ; carte en pleine largeur, hauteur ~72 % de l'écran (plein écran : tout l'écran moins les consignes) ; zoom molette/pincement proportionnel au geste et ancré sous le doigt/le curseur (plus de saut brutal), boutons +/−/recentrage inchangés ; étiquettes et retours au-dessus de la carte sans l'écraser.
- Preuves : 25 tests PASS (10 jeux Lyon dont 2 nouveaux sur le zoom : point sous le curseur fixe, bornes, amplitude proportionnelle ; 8 activités module ; 7 horloge appareil). Contrôle visuel Playwright sur page temporaire (supprimée après) : tablette portrait 800×1280 (carte 766×1040), tablette paysage 1280×800 (1246×560), ordinateur 1280×1800, mobile 390×844 ; jeu joué (étiquette + toucher + retour « Encore un essai »), zoom molette, recentrage, réduire/agrandir — captures /tmp/browser/jeux-carte/screenshots.
- Aucune écriture base : uniquement 3 fichiers frontend (CarteLyon.tsx, JeuxCartesLyon.tsx, jeuxLyonLogic.ts) + tests. Avertissements console forwardRef préexistants (TooltipProvider/Toaster), sans rapport.
- Limites NON PROUVÉES : pas testé sur une vraie tablette physique ; pas testé avec un compte élève réel connecté (mentaillage de session refusé sans accord) ; NON PUBLIÉ.

## Onglet signatures manquantes — 20/10 15:49 UTC

## Onglet signatures manquantes — 20/10 15:49 UTC
- [x] Onglet individuel avec liste lecture seule, aperçu, relecture et confirmation ; circuit mail existant sans envoi collectif ni modification des preuves.
- [x] 23 tests fictifs PASS ; navigateur CRM connecté : deux créneaux, aperçu et confirmation puis annulation, zéro erreur JS, écritures bloquées ; compilation automatique OK. 25 émargements et empreinte identiques avant/après ; journal ; aucune publication. Envoi réel NON PROUVÉ, volontairement non exécuté.

## Changement présentiel vers e-learning — 20/10 15:44 UTC
- [x] Identité de lecture liée au mode/heures + invalidation après modification ; total e-learning bleu, jalons rouges, présence session/pratique visible sur les deux modes et taux présentiel basé sur leurs heures prévues.
- [x] 35 tests PASS dont bascule fictive sur la même fiche montée avec signatures intactes ; compilation automatique OK. CRM Aba-Bakre lu sans écriture : total 75 % bleu, pratique 6/6 = 100 %, session non inscrite, présentiel 6/6 = 100 %. Aucune publication ; pas de changement réel de dossier pour le test.

## Total présence session + pratique — 20/10 15:39 UTC
- [x] Total live commun corrigé : heures prévues session + pratique, sans imposer 66 h au soir ; surplus théorie ne compense pas pratique manquante. Preuves et relevés inchangés.
- [x] 43 tests PASS (journée, soir, TAXI/TA, pratique absente, lecture impossible), compilation automatique OK. Deux fiches connectées lecture seule vérifiées : 46/46 = 100 %, 60/66 = 90,9 %. Non publié ; audit individuel de tous les dossiers NON PROUVÉ.

## Cohérence signatures — 20/10 15:35 UTC
- [x] Diagnostic : signed_at automatique à la création ; deux feuilles du 20/10 créées le 09/10 sans image. Compteurs harmonisés et anomalies signalées, données conservées.
- [x] 78 tests PASS ; compilation automatique OK ; CRM et PDF vérifiés 20/22, pratique 0/2, mention EDOF absente ; empreinte des 25 lignes inchangée. Pas de publication ni envoi.

## Mode formation et jalons — 20/10 15:30 UTC
- [x] Afficher présentiel/e-learning/mixte sur la fiche ; mettre en rouge le taux de jalons e-learning sans changer les calculs.
- [x] Trois tests classification PASS ; compilation automatique OK ; fiche ouverte contrôlée en lecture seule (Présentiel). Couleur sur une fiche e-learning réelle NON PROUVÉE ; aucune publication.

## Indicateur réinscription — 20/10 15:26 UTC
- [x] Badges dans Examen et Réussite et panneau mails : réponse signée, attente, inconnu ou lecture indisponible ; aucune inscription déduite, écriture ou publication.
- [x] 12 tests PASS ; compilation automatique OK ; huit badges Non renseigné contrôlés dans les deux vues connectées, aperçu accessible, zéro appel fonction.

## Panneau mail échec — 20/10 15:17 UTC
- [x] Aperçu et statut des documents existants de même examen, toutes versions ; aucun double envoi, écriture ou publication.
- [x] 50 tests PASS, compilation automatique OK ; contrôle CRM connecté : aperçu visible sans appel fonction, six mails envoyés et deux signés affichés, cases protégées. Journal conservé.

## Prévention générale QRC — 20/10 09:53 UTC
- [x] Diagnostic frais, réservation atomique, un item streamé par invocation, continuation bornée nouveaux passages seulement ; aucun traitement historique.
- [x] 180 tests Vitest + 8 SQL locaux + 2 flux fictifs PASS ; Deno types PASS, compilation plateforme OK ; fonction déployée et mauvais token refusé 403, empreintes identiques.
- [x] Publication publique vérifiée en navigateur : index-BcmV7BPt.js HTTP200 SHA2567ebe759489f176e708d50842e58c627d85e150d0ac5bedc1a41430ab93211325 ; connexion visible, zéro erreur JS, sans maintenance.
- [ ] Chaîne automatique réelle NON PROUVÉE : aucun autre appel IA élève autorisé ; reconnexion tablette Jean inaccessible, baseline historique4fcc… source exacte requise.

## Dossier bienvenue vert — 20/10 09:50 UTC
- [x] Dossier bienvenue vert pour Payé, Dossier complet ou Inscription validée ; affichage uniquement, 17 tests PASS, compilation OK. Non publié ; contrôle CRM connecté NON PROUVÉ.

## Affichage questions / publication — 20/10 08:53 UTC
- [x] Preuves SELECT Kevin et protections Jean ; limites tablette réelle conservées.
- [x] Cartes agrandies, comparaison présentation uniquement et écran synthétique vérifiés.
- [x] Bandeau temporaire publié puis retiré du code final.
- [x] 93 tests/12 fichiers, compilation automatique OK, empreintes actuelles identiques avant/après, publication finale demandée.
- [x] Déploiement final vérifié : index-P4KrySsp.js, sans bandeau, design présent.
- [ ] Baseline historique 4fcc… NON REPRODUITE : ancien releve_jalons_gels vide ; source exacte requise.

## Kevin / Jean — 20/10, reprise ciblée autorisée
- [x] Diagnostic frais : 503 upstream_stall 180 s, appel suivant annulé 70 s, trois QRC encore en attente ; Jean PGRST303 non capturé.
- [x] Reprise IA atomique bornée, trois QRC uniquement corrigées 20/10 08:50–08:51 UTC ; Q17 intacte, résultat définitif 12.
- [x] Expiration PGRST303 et rejet lecture jeux corrigés ; 75 tests PASS, compilation OK ; aucune publication frontend.
- [x] Trace Q3 conservée en base, affichée remplacée uniquement avec preuve finale serveur ; tests PASS.
- [ ] Reconnexion réelle et files de la tablette Jean : NON PROUVÉES, appareil inaccessible.

## Avertissement e-learning 50 % — 19/10 15:43 UTC
- [x] Périmètre présenté et plan approuvé avant code.
- [x] Bandeau accueil élève + rappel dernier jalon, indicateur TAUX E-LEARNING et filtre admin, sources horaires inchangées.
- [x] 97 tests fictifs PASS, 12 fichiers ; rappel et fermeture inspectés ordinateur/téléphone, compilation automatique OK ; journal, aucun blocage ni écriture pédagogique.
- Limites : parcours authentifié complet et filtre CRM à l'écran NON PROUVÉS ; aucun test réel élève, aucune publication demandée.

## Écarts émargements — 17/10 12:52 UTC
- [x] Horaires planning pratique prioritaires, journée et demi-journée ; générateur futur sans reprise rétroactive.
- [x] Signatures listes d’attente et historique masqué classés à examiner, sans faux présentiel ni fausse absence.
- [x] 104 tests et compilation OK ; fonctions SQL appliquées, publication frontend demandée 13:05 UTC (asset public à confirmer).
- [ ] Preuves humaines : attentes septembre Fiacre / statuts des trois listes attente / inscription théorie Aba-Bakre.

## Durées des devis e-learning — 17/10 11:01 UTC
- [x] Durées partagées VTC 66/TAXI 96/TA 36, Word/PDF et affichages correspondants ; anciens devis inchangés.
- [ ] VA : total présentiel non prouvé ; programme source 7 h sans ventilation pratique, confirmation centre nécessaire.
- [x] 16 tests fictifs PASS, comparaison des 12 DOCX (seules trois mentions durée changées), PDF/Word inspectés, navigateur PC/mobile, compilation OK ; aucun envoi ni publication.

## Contrat de formation individuel — 17/10 09:02 UTC
- [x] Intégrer près du devis et dans Documents formation, formulaire personnel, modèle et annexes, aperçu/PDF communs.
- [x] Contrôler jour Paris, 14 jours/prolongation distance, financement, identité, champs manquants, TVA/durées/échéancier et rôle admin serveur ; aucune ouverture pédagogique.
- [x] 40 tests PASS, téléchargement PDF complet et régularisation sur données fictives, 12 pages inspectées, ordinateur/mobile et non-admin ; compilation OK. Journal sans envoi/publication.
- Limites : saisie temporaire non enregistrée ; pas de service de conclusion/signature ni de contrôle serveur d’ouverture ; références légales du centre contradictoires à confirmer avant utilisation définitive. PDF complet non signé seulement, aucune conformité prétendue.

## Source des dates du devis — 17/10 08:54 UTC
- [x] Retirer le repli sur la fiche élève dans l’aperçu et les deux générations DOCX ; utiliser seulement le choix du devis, sans toucher aux historiques.
- [x] 10 tests PASS ; aperçu vide malgré date de fiche, sélection 22 octobre identique au DOCX téléchargé et à la page de signature ; envoi/signature simulés, zéro erreur JS, compilation OK 08:55:28 UTC. Aucun envoi réel ni publication.

## Date et signature des devis — 17/10
- [x] Date DOCX éditable, dates enregistrées et lien de signature explicite ; originaux UUID sans remplacement.
- [x] 9 tests PASS ; date 16/10, envoi intercepté, dates conservées et signature dessinée jusqu’à confirmation fictive ; compilation OK. Aucun envoi réel ni publication, réception réelle NON PROUVÉE.

## Dates pratiques dans les devis — 17/10
- [x] Proposer les journées explicitement typées du planning dans les devis pratiques, sans changer prix, réservations ou documents existants.
- [x] Cinq tests fictifs PASS, sélection navigateur 22 octobre confirmée parmi les 17/22/23 octobre TAXI, écritures bloquées ; compilation OK. Aperçu PDF et devis réel NON PROUVÉS ; aucun envoi ni publication.

## Corrections techniques autorisées — 17/10
- [x] Sessions fraîches, progression isolée, origine canonique manuelle, examens sans faux vide ; frontend publié le 17/10 à 09:16 UTC.
- [x] Documents 4 Mo, erreurs lisibles, reprise idempotente et conservation des versions ; mocks seulement.
- [x] Export append des trois tables CMA, manifeste versionné et reprise compatible ; fonction déployée sans invocation.
- [x] Diagnostic Bilan non activé ; aucune QRC modifiée, trois corruptions restent hors correction.
- [x] Tests isolés et trois empreintes strictement identiques ; journal détaillé, aucune donnée élève modifiée.
- [x] Finalisation « Continue » : revue indépendante version 6e0157ad, contrats incomplets bloqués, 100 tests PASS + navigateur ancien receipt sans renvoi, trois empreintes identiques.
- [x] Mise en service coordonnée : frontend validé 6e0157ad réellement servi à 09:16:23 UTC (index-CZVWE7Y1.js), puis upload-document-inscription déployé aussitôt ; OPTIONS 200 et GET 405 à 09:16:40 UTC, sans fichier réel.
- Limites : reprise totale Nika, ordre serveur d’écritures autosave concurrentes et prochaine sauvegarde réelle NON PROUVÉS ; authentification du déclencheur nocturne historique non migrable automatiquement sur ce projet.

## Compteurs validés et preuves QRC — 16/10
- [x] Revue formats legacy/snapshots : harness SELECT réel avant/après, compatibilité stricte et 93 tests PASS ; EB5/6 débloqués, EB4 tronqué conservé ; 7/83/86 empreintes inchangées, sans publication.
- [x] Corriger le compteur accueil depuis les identités du relevé validé, score et heures inchangés.
- [x] Rapprocher strictement le même passage et ses réponses pour la source QRC commune élève/admin ; ambiguïtés et erreurs non vérifiables.
- [x] Tests fictifs, lectures production SELECT uniquement et compilation ; aucune publication. Limite : QRC tronquée sans validation équivalente reste en attente.

## Cohérence signatures VTC journée — 15/10
- [x] Diagnostic lecture seule : objectif erroné 40 + 2 ; nouvelle règle utilisateur 20 + 2 = 22, heures inchangées.
- [x] Plan approuvé ; objectif VTC journée/soir 20 + 2 = 22, TAXI/TA inchangés. Lecture seule : 22 dates signées dont 20 images PDF et 2 sans image ; mention explicite. 172 tests PASS, bouton réel isolé → PDF fictif téléchargé, aucune erreur JS ; compilation OK ; journal, aucune écriture élève ni publication. Parcours réel complet NON PROUVÉ.

## ZIP Contrôle — signatures présentiel (15/10)
- [x] Diagnostic lecture seule : raccorder le PDF « Signatures session + pratique » existant au ZIP des formations présentielles.
- [x] Plan approuvé, raccordement réalisé ; 131 tests PASS, bouton réel avec sources fictives → ZIP téléchargé → PDF inspecté (3 signatures, versions session + pratique), build automatique OK ; journal ajouté. Aucune donnée élève modifiée, aucune publication ; parcours réel NON PROUVÉ.

## Base de présence VTC journée — 15/10
- [x] Accord : corriger les bases communes par filière, sans modifier heures ni signatures enregistrées.
- [x] 46 tests fictifs réussis ; carte VTC isolée 60/60 et pratique 0/6 vérifiées, aucune erreur JS ; compilation automatique OK ; journal ; aucune publication. Parcours réel élève non testé.

## Indicateurs à compter du 01/07/2026
- [ ] Affichage uniquement : objectifs présentiels VTC 66/TAXI 96/TA 36 ; total = signatures apprenant valides / créneaux attendus du planning, sans connexion/quiz.
- [ ] Rouge pour jalons e-learning et total présentiel ; tests fictifs, anciennes formations conservées, contrôle et publication autorisée.
- Fichiers : nouveau calcul/lecteur `suiviFormationIndicateurs.ts`, `useApprenantTauxRealisation.ts`, `ApprenantDetailPage.tsx`, `JalonsPonderesCard.tsx`, tests et règles `AGENTS.md` ; aucune écriture élève.

## Gestion partie 2 — cadrage 38 et 40 (13/10)
- [x] Corriger uniquement la géométrie des deux encadrés droits du support actuel ; originaux, textes et styles intégralement conservés (comparaison XML hors géométrie).
- [x] PDF/PPTX CDN téléchargés, validation PPTX et 52 tests ciblés réussis ; rendu isolé ordinateur/tablette/mobile sans compte élève ni erreur JS. Défaut de centrage au zoom détecté puis corrigé pour rendre les deux bords accessibles.
- [ ] Publication frontend : non effectuée, nécessite « Publier → Mettre à jour » ; les nouveaux médias CDN seuls ne prouvent pas la publication du correctif.

## Formulaires — PDF de toutes les signatures
- [x] Export lecture seule des signatures réelles (théorie/pratique), dates et horaires séparés de l'instant de signature ; toutes versions conservées. Horaires absents/ambigus explicitement non déterminés.
- [x] Tests fictifs, téléchargement du bouton Formulaires et inspection des 6 pages ; ajustement ordre matin/après-midi, aucune coupure/image manquante. Bouton ordinateur/téléphone sans débordement, aucune erreur JS ni écriture élève. Pas de publication demandée ; dossiers réels non testés.

## Dispenses Lyon dans la fiche CRM — 13/10
- [x] Partager les dispenses avec le compteur CRM et les jalons actuels ; exception deux jeux Thierno BAH, aucun faux module terminé, gels inchangés.
- [x] 37 tests fictifs, compilation OK 15:32:20 UTC et rendu ordinateur/mobile sans exigences des jeux ; aucune écriture élève ni publication demandée. Fiche réelle complète non testée ; limites gel/pages/questions précédentes conservées.
 
## Planning pratique — ouvrir fiche CRM (13/10)
- [x] Noms VTC/TAXI cliquables via navigation CRM existante ; horaires/réservations/signatures inchangés.
- [x] 11 tests fictifs passés ; compilation automatique OK 15:28:40 UTC ; clic et identifiant transmis confirmés sur ordinateur/mobile, aucune erreur JS. Fiche CRM complète réelle non testée, aucun dossier élève modifié ; pas de publication demandée.
 
## Parcours terminés avant les jeux Lyon — 13/10
- [x] Dispense automatique des deux jeux seulement sur preuve serveur datée de tous les modules pédagogiques avant leur ajout ; compteurs élève et candidats partagés, données/gels inchangés.
- [x] 49 tests fictifs passés ; compilation automatique OK à 15:26:13 UTC ; compteur 10/10 confirmé sur ordinateur/mobile pour un compte fictif sans exception nominative, aucun débordement ni erreur JS. Aucune publication demandée.
 
## Exception individuelle Zekkour — 13/10
- [x] Exclure les deux jeux Lyon et la rubrique d'archives émargement du compteur individuel ; dix validations serveur, aucune réponse/signature/statut fabriqué, gels inchangés.
- [x] 132 tests fictifs, compilation OK, compteur 10/10 vérifié en Chromium ordinateur/téléphone ; aucune publication demandée.

## Candidats examens — modules et rappel individuel (13/10)
- [x] Colonne modules terminés/total selon le parcours partagé avec l’élève ; rappel de terminer tous les modules, aucune connexion faible alléguée ni envoi réel.
- [x] 125 tests fictifs, compilation OK, compteur 2/3 + 1 restant et mail vérifiés en Chromium 1280/390 ; aucune erreur JS ni débordement. Publication non demandée ce tour.

## Cohérence affichage élève — finalisation autorisée 05e1c399
- [x] Un seul calcul pour bandeau, bloc modules, listes et état secondaire des heures ; présence physique identifiée par jalon, jamais par nom.
- [x] 29 tests fictifs : jeux restants, 100 % sans validation, changement de compte, erreurs, gels ; captures vrai dashboard ordinateur 1280 et mobile 390, aucun débordement ni erreur JS.
- [x] Publication confirmée 13/10/2026 13:09:00 UTC : index-BLUB7gmc.js servi HTTP 200 sur gestion.ftransport.fr, marqueurs bandeau canonique et activités en ligne présents.
- Limites antérieures conservées hors ce correctif : recomptage fiable des pages de supports et exigences de nouvelles questions après validation non prouvées ; gels et suivi mails inchangés.

## Clarification pourcentages et heures — 12/10 19:55 UTC
- [x] Tableau partagé Contrôle/PDF : poids, progression, contribution, heures CPF et couverture prévisionnelle ; heures enregistrées séparées, calculs inchangés.
- [x] 18 tests ciblés quatre filières, 38 pages PDF inspectées, Contrôle et téléchargement Amar admin lecture seule ; objectifs et annexes conservés.
- [x] Compilation automatique OK ; publication confirmée le 12/10 à 20:04:37 UTC, bundle index-1Ewywis7.js contenant tableaux, rappel chiffré et objectifs ; journalisé.

## Objectifs pédagogiques des jalons — 12/10 18:56 UTC
- [x] Ajouter les textes approuvés via un mapping partagé, limité aux modules existants des quatre parcours e-learning, dans Contrôle et le PDF.
- [x] Tester les quatre parcours et l'absence de modification des calculs ; inspecter toutes les pages PDF fictives et l'affichage.
- [x] Compilation et publication confirmées ; objectifs toujours présents dans index-1Ewywis7.js au contrôle du 12/10 à 20:04:37 UTC.

## Relevé des jalons pédagogiques PDF — 12/10 14:32 UTC
- [x] Étendre la source commune carte/PDF avec un jalon virtuel « Entraînement pratique — 6 h » valant 360 points pour les quatre parcours e-learning visés.
- [x] Calculer sa progression uniquement depuis les minutes pratiques justifiées par Planning pratique + émargements signés : 0/180/360 min = 0/50/100 %, indisponible distinct de 0.
- [x] Recalculer tous les poids sur points e-learning + 360, sans pourcentage figé, double comptage, écriture de module ni assimilation du module en ligne 6/8 à la présence physique.
- [x] Ajouter dans Contrôle, pour VTC/TAXI/TA/VA e-learning uniquement, un téléchargement admin en lecture seule près du relevé de connexions.
- [x] Réutiliser la source dynamique des Jalons pondérés pour points, poids, progression et statuts, sans grille parallèle ni écriture élève.
- [x] Générer un PDF factuel paginé : identité/dates disponibles, tableau des jalons, méthode, preuves réellement disponibles, limites et références CPOF/CG V15.
- [x] Vérifier sur données fictives : calculs, zéro/incomplet, informations absentes, filtrage e-learning/admin, pagination et rendu visuel de toutes les pages.
- [x] Compilation et contrôles ciblés ; première phase sans publication.

## Blocage vue apprenant — 09/10 16:26 UTC
- [x] Diagnostic lecture seule et plan approuvé : canal de suivi des heures partagé déjà abonné.
- [x] Canal unique par montage, calculs et données inchangés.
- [x] 157/157 tests fictifs PASS (7 fichiers) : affichages simultanés, doubles montages, réouverture, signatures, lecture seule et ordre des 15 parcours. Compilation automatique OK 16:28:14 UTC ; journal ajouté. Vue complète authentifiée/appareil réel NON PROUVÉS ; aucune écriture serveur ni publication.

## Heures de M. Majsak depuis le 6 octobre — 09/10 16:16 UTC
- [x] Diagnostic lecture seule et plan approuvé : fenêtre de calcul distincte du filtre historique.
- [x] Calcul e-learning élève/admin/rapports depuis le 06/10/2026 inclus à minuit Paris ; connexion chevauchante tronquée sans réinitialiser le plafond de session.
- [x] 151 tests PASS (7 fichiers), build OK ; Chromium fictif écran/impression : 1h depuis le 6 reste 1h avec Tout l’historique. Avant/après : 26 connexions, même empreinte. Journal ajouté ; aucune écriture serveur ni publication. Appareil réel/mobile et site publié NON PROUVÉS.

## Historique de M. Majsak — 09/10 16:11 UTC
- [x] Diagnostic lecture seule : début d'accès 05/10/2026 ; 26 connexions conservées, dont 15 depuis le 5 octobre.
- [x] Plan approuvé : filtre initial depuis le 05/10/2026 pour ce dossier uniquement, « Tout l'historique » accessible et heures globales inchangées.
- [x] 109 tests PASS, compilation OK ; filtre et impression vérifiés en Chromium avec données fictives ; contrôle après : 26 connexions conservées dont 15 depuis le 5 octobre. Journal ajouté, aucune écriture serveur ni publication. Appareil réel/mobile et site publié NON PROUVÉS.

## Heures réellement faites et cohérence élève/admin — 09/10 15:23 UTC
- [x] Même requête de lecture élève/CRM pour heures réalisées, contrat et taux ; heures réalisées non plafonnées et format commun heures/minutes. Rapports et candidats harmonisés.
- [x] Taux d'heures borné à 100 %, indépendant des modules restant à valider ; aucune validation ni écriture serveur, aucun volume contractuel inconnu inventé.
- [x] 147 tests fictifs PASS (7 fichiers), dont parité VA/VTC, contrats 66/90 h, 100% heures avec modules restants, ordre des 15 parcours et contenus ; compilation automatique OK, journal ajouté. Aucun envoi ni publication.
- [ ] Vérification authentifiée à l'écran NON PROUVÉE : nécessite compte technique autorisé ; aucun test sur vrai élève.

## Vérification des taux des autres élèves — 09/10 15:19 UTC
- [x] Audit lecture seule de 239 dossiers suivis, hors comptes techniques, archivés et abandonnés ; 41 dossiers bénéficient du repli corrigé.
- [x] 125 tests fictifs PASS (5 fichiers) ; compilation automatique OK. Divergence prouvée : 6 VTC-e avec contrats 66/90 h mais compteur élève standard 60 h ; 4 dossiers sans type malgré formation continue VTC ; 3 continue-taxi sans référence horaire. 1 contrat VTC à vérifier : 20+34 h contre total 60 h, aucune valeur corrigée.
- [x] Accord 15:23 : cohérence des volumes contractuels et repli formation connue implémentés, heures réelles non plafonnées ; aucune donnée corrigée.
- [ ] Volume de référence continue-taxi et incohérence du contrat 20+34/60 : à confirmer avant toute modification des valeurs. Vérification authentifiée des écrans NON PROUVÉE, compte technique soumis à approbation.
- Aucun changement de l'application, aucune écriture élève, aucun envoi ni publication ; corrections soumises à accord.

## Taux e-learning vide — 09/10
- [x] Réutiliser les heures requises du parcours si aucun volume contractuel n'est renseigné, sans changer les heures réalisées ni les modules.
- [x] 136 tests isolés PASS : VTC/TAXI/VA/TA, priorité contrat, séparation heures/modules et ordre pédagogique ; compilation automatique OK.
- [x] Journaliser ; aucune écriture élève ni publication.
- [ ] Vérification authentifiée sur appareil réel NON PROUVÉE : compte technique soumis à approbation.

## Pratique signée et taux présentiel — 09/10 15:07 UTC
- [x] Compter uniquement les signatures présentes aux horaires du planning ; conserver les heures prouvées même sans volume contractuel présentiel.
- [x] Actualiser le taux CRM sur événement de signature, sans écriture de progression ni modification du contrat ; corriger également les lectures des rapports.
- [x] 41 tests fictifs PASS, dont fiche 0→50→100 %, 11 contrôles ordre cours/quiz ; compilation automatique OK ; aucun envoi ni publication.
- [ ] Vérification du compte technique sur appareil réel : NON PROUVÉE, approbation de connexion nécessaire ; aucun test sur vrai apprenant.

## Horaires des feuilles pratiques — 09/10
- [x] Lire le circuit PDF et le planning sans écriture serveur.
- [x] Afficher les horaires pratiques par date et demi-journée, sans modifier les signatures.
- [x] 15 tests isolés réussis, dont génération réelle du PDF ; compilation automatique OK ; aucune écriture serveur ni publication.
- [ ] Vérification sur le compte élève technique : NON PROUVÉE, nécessite une approbation de connexion ; aucun essai sur élève réel.

## Taux e-learning candidats examens — 08/10
- [x] Afficher le taux depuis le suivi existant, uniquement pour les e-learning, sans écriture de progression.
- [x] Ajouter sous le taux une préparation de mail individuel modifiable et un envoi manuel confirmé.
- [x] 113 tests isolés réussis, sans envoi réel ; ordre/contenus des 15 formations et 68 fichiers pédagogiques inchangés ; journal ajouté, aucune publication.

## Réactivations après incident du 28/09 — demande 07/10 18:40 UTC
- [ ] Présenter le périmètre exact : 13 quiz dans modules 2,10,17,23,25,32,39 ; corrections T3P toutes copies ; module 13 et Bilans Français intacts.
- [ ] Vérifier l'origine du Bilan Français 4/9 en lecture seule, annoncer les limites de preuve.
- [ ] Appliquer uniquement les bascules autorisées avec contrôle de version et historique conservé ; contrôler avant/après les contenus et les protections des données élèves.
- [ ] Vérifier l'ordre complet de toutes les formations, l'aperçu sur données fictives sans écritures élèves, puis journaliser les résultats.
- [ ] Publier sur demande explicite, après contrôles réussis et vérification des conditions de publication.

## T3P — corrections et réactivation autorisées (07/10, 18:25 UTC)
- [x] Lire les questions exactes, protections serveur et périmètre de partage avant écriture.
- [ ] Accord 18:29 : protéger contre la reconstruction automatique intégrale des bilans ; limiter la propagation aux questions réellement modifiées, préserver les métadonnées des autres questions.
- [ ] Corriger P1 Q29/Q42 et P2 Q36/Q60/Q79, avec sauvegarde avant/après et refus d'écriture périmée.
- [ ] Réactiver uniquement les deux quiz du parcours VTC ; vérifier bilans, autres activations, historiques et ordre complet inchangés hors ajouts autorisés.
- [x] Textes exacts TPMR/sanctions livrés, aucune question modifiée ; journal de diagnostic ajouté. Correction du déclenchement des bilans nécessite un périmètre distinct explicitement autorisé.

## Numérotation administrateur et non-régression globale (07/10, périmètre autorisé)
- [x] Audit lecture seule et accord : numérotation admin uniquement, contrôles et journal ; aucun quiz réactivé.
- [x] Aligner la numérotation administrateur sur les associations permanentes existantes sans modifier l'affichage apprenant.
- [x] 102/102 tests PASS : 15 parcours configurés, quatre séquences cours/quiz, 68 fichiers pédagogiques inchangés ; quiz inactifs et coordonnées historiques vérifiés. Empreinte serveur des 62 modules identique avant/après ; compilation automatique OK.
- [x] Journal daté ajouté dans `docs/journal-modifications.md` ; aucun élève réel, aucune écriture serveur, aucun quiz réactivé.
- [ ] Parcours complets à l'écran ordinateur/téléphone et Safari réel : NON PROUVÉS ; nécessitent une vérification isolée sur données fictives, aucun déploiement demandé.

## VTC — encadrés et ordre cours/quiz (07/10, plan approuvé)
- [x] Diagnostic lecture seule : dépassements présents dans PowerPoint/PDF ; quiz désactivés entraînant un décalage par position.
- [x] Nouvelle version intégrale du support partie 2 : 43 slides, textes et numéros inchangés, originaux conservés ; PDF correspondant et liens d’affichage dédiés.
- [x] Association cours/quiz par identifiants permanents ; adaptation lecture/écriture des positions historiques sans migration ; aucun quiz réactivé.
- [x] 46/46 tests ciblés PASS ; 39/39 pages interactives parcourues et défilement contrôlé en Chromium et WebKit, largeurs 1280/390 ; PDF 43 pages ouvert et TPMR visible. Aucun élève réel ni écriture serveur ; Safari/appareil réel et livraison distante des nouveaux médias NON PROUVÉS.

## Mise en valeur des sessions (07/10)
- [x] Encadré identique (même couleur) pour session en cours, sessions TAXI/TA et sessions VTC en cours du soir ; aucune donnée modifiée.
- [x] Vérifié à l’écran : toutes les cartes concernées ont la même bordure et le même fond.


## Formats des documents d’agrément (07/10)
- [x] Supprimer les restrictions de format pour Ajouter et Remplacer dans TAXI/VTC ; conserver les originaux, reconnaître JFIF pour la conversion PDF.
- [x] 10/10 tests ciblés PASS : sélecteurs sans restriction, conversion JFIF et original intact, ordre commun TAXI/VTC ; build OK. Stockage sans restriction MIME, limite existante 20 Mo. Aucun document réel modifié ; envoi réel non testé.

## Lettre masquée remise visible (07/10)
- [x] Lecture avant modification : ligne masquée, PDF original toujours présent et non masqué ; remettre uniquement la ligne visible sur demande explicite, sans remplacer le document.

## Lettre commune TAXI/VTC (07/10)
- [x] Partager la lecture de la même lettre et de ses fichiers dans les deux dossiers et exports, sans modifier les données existantes.
- [x] 6 tests PASS (en environnement node), affichage isolé TAXI/VTC vérifié avec le même fichier fictif en position 1 ; build OK ; aucune écriture réelle. Export ZIP/PDF branché sur la même lecture, téléchargement non exécuté.

## Lettre de présentation en position 1 (07/10)
- [x] Classement d’affichage et exports ZIP/PDF : lettre en tête, identifiants et ordre enregistrés inchangés.
- [x] 4 tests PASS ; écran TAXI/VTC vérifié avec pièces fictives et écritures bloquées ; build OK. Aucun document réel modifié.

## Inscrits théorique : une session ou toutes les dates (06/10)
- [x] Ajouter « Toutes les dates » au filtre du tableau, avec lecture paginée, sans changer le planning.
- [x] Vérifier à l’écran la vue globale (2 candidats fictifs de sessions différentes) puis une seule session ; 20/20 tests ciblés réussis, build OK ; écritures et envois bloqués.

## Sessions d’examen manquantes dans le filtre (06/10)
- [x] Diagnostic lecture seule : « Toutes les dates » est construit uniquement depuis les élèves de la session déjà sélectionnée.
- [x] Correctif approuvé : les deux sélecteurs proposent les 12 sessions et partagent la même sélection ; filtre local trompeur retiré.
- [x] 19/19 contrôles ciblés réussis ; sélection 2026/2027 et synchronisation vérifiées à l’écran avec listes fictives ; toutes les demandes d’écriture interceptées, aucun mail ni donnée réelle modifiée ; build OK.
- [x] Session sans période pratique publiée : ne plus affecter une valeur indéfinie, pour éviter le plantage lors du choix d’une date 2027.

## Notes individuelles pratique (06/10)
- [x] Champ par candidat dans les listes CMA et formation ; historique conservé avec refus des versions périmées.
- [x] Note personnelle dans les sept mails pratiques ; CMA, impression et aperçus depuis la même note ; aucune date modifiée, aucun mail envoyé.
- [x] 9/9 tests ciblés ; champ vérifié sur ordinateur/téléphone avec données fictives simulées ; build OK ; empreinte des 12 plannings inchangée, 0 note élève écrite.
- [ ] Enregistrement serveur et refus d’une version périmée de bout en bout : NON PROUVÉS, nécessitent un contexte de test isolé autorisé ; aucun test sur vrai élève.

## Réservation pratique — retrait du préalable module (06/10)
- [x] Retirer la condition module PRATIQUE des envois manuels VTC/TAXI et les formulations correspondantes ; conserver les conseils et les heures e-learning.
- [x] Vérifier sans envoi de mail ni modification de données élèves : 5 tests réussis, dix messages individuels/groupés contrôlés, build OK. Test navigateur non exécuté.

## Chantier global affichage apprenant (25/09)
- [x] Règle unique d'affichage + tableau de bord/déblocage branchés dessus + tests de cohérence.
- [ ] Tests navigateur F5/reconnexion : NON PROUVÉS (portes identité/émargement/session unique).
- [x] Réparation automatique des statuts par le tableau de bord supprimée (lecture seule).

## Incident prioritaire — GOUEPO Stéphane, modules terminés affichés non faits (25/09/2026)
- [x] État logique figé et parcours reconstitué depuis les données serveur et l’activité.
- [x] Cause d’affichage identifiée : le tableau recalculait après Terminé à partir des compteurs de contenu actuels et pouvait appliquer une ancienne réponse de rechargement arrivée en retard.
- [x] Correctif général non destructif : état serveur Terminé prioritaire et réponses de chargement périmées ignorées.
- [x] Garde serveur contre une rétrogradation obsolète vérifiée avec le compte TEST ; test visuel fermeture/F5 limité par son rattrapage d’émargement obligatoire.
- [x] Compteurs avant/après relevés ; rapport unique à remettre.

## Terminé — écran unique Correction QRC (23/09/2026)
- EB3 finalisé apparaît dans le menu sous « EB3 — ANCIEN CIRCUIT », sans migration ni copie.
- Les 9 matières EB3 ouvertes sont exclues ; les 50 QRC finalisées uniques de la session sont affichées (50/50 avec le contrôle en base).

## Bloqué — en attente de la fin de la session EB3 et des 15 resynchronisations
Aucun déploiement tant que des élèves passent EB3. Surveillance lecture seule uniquement.

Pré-requis avant Phase 1 (demande du 22/09, 21h22) :
- Snapshot/état de référence du système actuel à figer AVANT Phase 1 : file locale, accusé de réception serveur, numéro d'ordre, idempotence réponses, idempotence finalisation, snapshots V2, journaux append-only, résultats actuels des tests automatiques.
- Phase 1 ne reconstruit PAS la file locale ; périmètre : indicateur 🟢/🟠/🔴, arrêt définitif des retries sur erreurs fonctionnelles non récupérables (règle 48 h), backoff avec jitter, durcissement du contrôle serveur avant « Terminer la matière », message clair du mode dégradé.
- Après Phase 1 : tests existants + tests spécifiques panne/récupération ; si un seul mécanisme existant régresse → pas de déploiement.
- Aucune modification des réponses, tentatives, notes, corrections ou historiques existants.

1. Réparer l'écriture des alertes (`alertes_systeme` : RLS refuse toute insertion).
2. Distinguer « identifiants incorrects » et « service temporairement indisponible » sur l'écran de connexion.
3. Corriger `permission denied for function check_apprenant_session` (et `start_or_get_exam_timer`).
4. Règle 48 h : message explicite « Nouveau passage non autorisé avant 48 h » + arrêt immédiat des réessais automatiques (pas de requête chaque seconde sur un refus définitif P0471).
5. Monitoring externe de la base (indépendant de la base elle-même) + health checks + alerte automatique si authentification ou sauvegarde indisponible.
6. Conservation des journaux au-delà d'un redémarrage (export périodique hors base) pour permettre une vraie analyse de cause racine.
7. Test de charge sur données fictives : charge du 22/09 puis ×2 et ×3 ; dimensionnement de l'instance décidé APRÈS ce test.

## Suivi en cours (lecture seule, sans modification)
- Point 21h28 : MTIMET Chokri 🟢 (matière EB3 complète envoyée et finalisée à 21h12 Paris). SAWADOGO : 1 seule écriture réussie à 21h23 Paris, plus aucune boucle détectée. Les 15 élèves restent 🟠 — dernière écriture serveur toujours 19h35–19h45 Paris, aucun retour depuis le rétablissement. MTIMET prouve que la chaîne fonctionne ; il ne valide pas les files locales des 15.

## Décisions utilisateur en attente
- Affichage des QRC corrigées automatiquement (2 333) en orange plutôt qu'en vert.
- 2 divergences de contenu EB3 (longueur minimale VTC hybride, prix psychologique).
- Reprise de la copie incrémentale des matières finalisées (corriger `core_import_passage_finalise` / `audit_journal`).

## Plan anti-panne (cahier des charges du 22/09, 21h18) — GELÉ jusqu'à la fin d'EB3 et des 15 resynchronisations
État relevé en lecture seule le 22/09 (aucune modification) :
- EXISTANT : file locale durable + accusé serveur (answerPersistence.ts, answer_save_queue_v1), numéro d'ordre serveur anti-écrasement, idempotence des envois, finalisation idempotente (examFinalizationGuard.ts), snapshot immuable V2, journal append-only (reponses_apprenants_journal, audit_journal), 83 fichiers de tests de non-régression.
- PARTIEL : indicateur de sauvegarde côté élève (états internes idle/saving/saved/error, pas d'affichage permanent 🟢/🟠/🔴) ; arrêt des réessais (403 stoppe, 500 fonctionnel type P0471 continue de réessayer) ; backoff exponentiel (plafond 30 s, sans jitter) ; blocage de la finalisation tant que la file n'est pas vide ; journalisation d'erreurs (error_logs, dans la base) ; mode dégradé (réponses conservées mais pas de message explicite).
- ABSENT : monitoring externe indépendant de la base ; canal d'alerte hors base ; alertes_systeme (RLS refuse toute insertion) ; health checks liveness/readiness/DB/auth/exam-save ; conservation des journaux après redémarrage ; distinction panne / mauvais mot de passe (Login.tsx, StudentLogin.tsx) ; test de charge ; test de panne provoquée ; test de restauration.

Phases (ordre imposé) : 1 données → 2 observabilité → 3 corrections → 4 infrastructure → 5 résilience → 6 capacité → 7 production.

## Étape 0 — Snapshot de référence figé (22/09, 21h40)
Voir `docs/snapshot-reference-avant-phase1.md` : empreintes md5 des 5 fichiers de protection, description figée des mécanismes (file locale, accusé serveur, write_seq, anti-écrasement, idempotences, snapshots V2, journaux), et résultats des tests AVANT modification (449 réussis / 5 échecs préexistants / 50 fichiers non collectés faute du module natif canvas ; 20/20 sur les tests de sauvegarde).
Étapes 1 à 5 de la Phase 1 : EN ATTENTE de l'accord explicite de l'utilisateur après lecture du snapshot.

## Étape 1 — Politique de réessai (faite, EN ATTENTE D'ACCORD pour déploiement)
- `src/lib/answerPersistence.ts` : ajout de `classifyAnswerSaveFailure()` (définitif vs temporaire) et `computeRetryDelay()` (backoff existant + jitter ±30 %, plafond 30 s). Le bloc 403 est remplacé par la classification ; un refus définitif marque l'élément « blocked » (conservé, jamais supprimé) et affiche la vraie raison. Nouvelle empreinte : df05119856fc6c6ba7dff21daaa489b4.
- `src/components/cours-en-ligne/AnswerSaveIndicator.tsx` : affiche le message réel du refus.
- `src/test/retry-classification-etape1.test.ts` : 7 tests (48 h, droits, passage fermé, 5xx/timeout temporaires, jitter, 100 réessais → 1 seul envoi).
- Non-régression : 456 réussis / 5 échecs préexistants (449+7) ; 20/20 sur les tests critiques ; clés de file locale et format inchangés ; examFinalizationGuard.ts, pontV2.ts, useAutoSaveReponses.ts, ExamenBlancsPassage.tsx : empreintes identiques au snapshot.

## Étape 2 — Indicateur de sauvegarde (préparée, NON DÉPLOYÉE)
- Indicateur informatif branché sur les états existants : vert après accusé serveur et file vide, orange avec compteur de réponses, rouge sur panne temporaire, refus fonctionnel séparé.
- Ajout sur le passage des examens blancs ; aucune modification des clés ou du format des files locales.
- Tests ciblés : 7/7. Tests sauvegarde + ordre + propriété + retries + indicateur : 34/34, dont les 20/20 critiques historiques inchangés.
- Suite exécutable complète : 463 réussis / 5 échecs préexistants ; 50 fichiers restent non collectés à cause de `canvas`, comme au snapshot. Aucun nouvel échec.
- Empreintes protégées inchangées pour `examFinalizationGuard.ts`, `pontV2.ts` et `useAutoSaveReponses.ts`. `answerPersistence.ts` change uniquement pour exposer le compteur informatif ; `ExamenBlancsPassage.tsx` change uniquement pour afficher l'indicateur commun.
- Statut : EN ATTENTE D'ACCORD, aucun déploiement.

## Verrouillage moteur d'examen — 23/09/2026
- Terminé : suite de non-régression bloquante `src/test/verrouillage-moteur-examen.test.ts` (41 tests critiques, 8 axes) + `npm run test:critique` (96 tests, bloquant avant déploiement du moteur d'examen).
- Terminé : surveillance production `supabase/functions/surveillance-moteur-examen` — détection seule, lecture seule, alertes e-mail/webhook, journaux anonymisés.

## Plan de stabilisation validé (23/09, 19h36) — une phase à la fois : TEST → rapport → accord → production → contrôle
- [ ] Phase 1a — C2+C3 isolation stricte entre candidats (serveur/base) — EN ATTENTE : choix d'un environnement TEST isolé
  - Étape C inclut désormais le **retrait physique des corrigés V2 de `examens-blancs-data.ts` et du bundle public compilé** ; écrans Admin/Correction QRC V2 alimentés par une fonction serveur protégée ; contrôle post-compilation : 0 corrigé V2 dans le JavaScript servi (23/09, 20h10). Détail : `phase1-c2c3-plan-deploiement-2026-09-23.md`.
  - A n'est PAS lancé : accord explicite + créneau vérifié sans examen en cours requis. Premier travail = A uniquement, puis test et arrêt avant B.
- [ ] Phase 1b — C1 unicité OPEN en base (audit préalable, aucune suppression)
  - Cas de test de référence : BOUDJORF DOUBAA Kamel, EB2 T3P, 2 passages créés à 19 ms d'écart le 22/09 09:16:32 (ancien circuit, ne pas corriger individuellement) — la protection doit rendre ce cas impossible.
- [ ] Plus tard — règle propre pour tentatives abandonnées encore ouvertes (HOMAWOO eb3-ta, VALENTIN EB5/EB6-TAXI) ; ne pas les fermer manuellement.
- [ ] Phase 1a étape A — en attente : ne lancer que si 0 élève en train de composer (activité < 30 min).
- [ ] Phase 1c — C5 publication interdite si test critique échoue
- [ ] Phase 2 — serveur d'abord au chargement/F5 + double-clic Commencer ; V2 seule source d'état
- [ ] Phase 3 — C4 chrono serveur, tolérance 30 s transmission uniquement (arrêt si non garantissable)
- [ ] Phase 4 — 7 scénarios manquants (serveur/intégration/navigateur réel), alerte double OPEN, 4 alertes hautes
- Ne pas nettoyer l'ancien circuit.

## Chantiers séparés — après stabilisation V2 uniquement (23/09, 20h10), hors A→B→C→D
- [ ] S1 — Sécurisation EB3 / EB3-TAXI : retrait des corrigés du code servi au navigateur + correction QCM côté serveur ; hors session EB3, sauvegarde + tests fictifs préalables.
- [ ] S2 — Sécurisation des Bilans e-learning : même logique, corrigés exposés dans le code du site ; traitement séparé.
- Aucun diagnostic supplémentaire : cartographie jugée suffisante (23/09).

## Stabilisation moteur EB (après pause — pas avant, sauf bug critique ; TEST → validation → production)
- [ ] Serveur interrogé avant toute reprise locale (le navigateur ne choisit jamais la tentative)
- [ ] V2 seule source du statut / progression / Commencer-Reprendre pour les EB V2
- [ ] Déploiement bloqué si un test critique échoue
- [ ] Test + alerte tableau de bord « 2 tentatives OPEN même candidat/examen » (vu transitoirement le 23/09, candidat non identifié)

## Après C1/C2/C3/C5 — fonctionnement type Formative (exigence 23/09, 19h56, à NE PAS développer maintenant)
Supprimer la nécessité de publier manuellement chaque modification pédagogique :
- [ ] Enregistrement d'une modification d'un examen blanc → création/publication AUTOMATIQUE d'une nouvelle version pour les futurs passages uniquement (plus de bouton « Publier » pour les modifications ordinaires)
- [ ] Passage déjà commencé → snapshot inchangé
- [ ] Passage terminé → inchangé
- [ ] Notes/corrections existantes → jamais recalculées
- [ ] Nouveau passage → dernière version enregistrée
- [ ] Conserver l'historique / version précédente pour audit et retour arrière
- Invariant : une modification ne doit jamais changer le sujet d'un élève en cours d'examen.

## Garanties permanentes anti-récidive (exigence 23/09, 21h01) — à intégrer à A/B/C/D + C1/C5, RIEN développé pendant que des élèves composent
Règle : chaque incident réel (Kevin, Thierno, Léa, Seydou, BOUDJORF) = protection permanente + test bloquant avant publication, reproduit de façon anonymisée.
- Sauvegarde (Phase 2/4) : aucune réponse perdue ; coupure réseau → conservation locale → renvoi auto ; F5/reconnexion → reprise correcte ; une réponse en erreur ne bloque jamais les suivantes ; P0409/ancienne révision ne bloque jamais la file.
- Terminer (Phase 2/3 + B) : clôture refusée avec 0 réponse serveur si l'élève a répondu ; attente des réponses en transit ; double-clic = une seule finalisation ; coupure pendant Terminer = reprise idempotente ; jamais de note 0 due à une panne.
- Tentatives (C1 + Phase 2) : une seule OPEN par élève/examen/matière (contrainte base) ; double-clic Commencer impossible ; tentative CLOSED jamais réactivée par le navigateur ; après reset/réouverture l'ancienne session locale est rejetée ; serveur interrogé avant toute reprise locale.
- Chrono (Phase 3) : F5 ne remet jamais à zéro ; réouverture admin = nouveau chrono complet ; 00:00 = gel → envoi → confirmation serveur → finalisation ; panne serveur à 00:00 = « finalisation en attente », jamais 0 technique.
- 48 h : uniquement pour une vraie nouvelle tentative ; jamais entre matières d'un même examen ; jamais pendant sauvegarde/reprise/finalisation.
- Affichage (Phase 2) : statut, progression, Commencer/Reprendre, tentative active = V2 uniquement ; aucune ancienne session navigateur ne réaffiche un examen avant reset ; date examen CRM = même info côté apprenant.
- Surveillance (FAIT 23/09, à maintenir) : aucun comptage limité à 500/1 000 ; agrégat serveur ; erreur de lecture = alerte technique, jamais « 0 réponse » ; distinguer abandon / import ancien circuit / vrai incident V2.
- Tests de non-régression (Phase 4) : 2 onglets ; double-clic ; réseau coupé/rétabli ; F5 ; fermeture navigateur ; réponse à 00:00 ; 20 réponses simultanées ; CLOSED + nouvelle OPEN ; reset administratif ; 10 000 réponses en surveillance.
- C5 (Phase 1c) : publication du moteur IMPOSSIBLE si un seul test critique échoue (pas seulement « tests verts conseillés »).
- Démonstration attendue après stabilisation : perte de réponse impossible (scénarios couverts) — 0 technique impossible — double tentative impossible — ancienne tentative après reset impossible — blocage Terminer récupérable automatiquement — faux incident surveillance protégé — tests critiques obligatoires avant publication : OUI.
- Priorité : ces barrières avant toute nouvelle fonction d'examen.

## Terminé — EB2 G(V) Q5 clé unique C (24/09/2026)
- Source code corrigée (B n'est plus correcte), contrôle générique + 4 tests de non-régression. Historique intact.

## En attente de décision
- Déblocage EB2 / Kevin FERNANDES (version V2 incomplète) — traité séparément.
- 8 passages EB2 G(V) sous-notés de 2 points (Q5) — correction contrôlée ultérieure.
- 11 divergences de correction détectées dans les versions actives (liste dans le bilan du 24/09).

- [x] 24/09 : 17 passages Bilan Sécurité routière figés à l affichage + garde serveur (aucune nouvelle réponse)

- [x] 24/09 : 44 questions Q1-Q49 réparées (Bilans VTC/TAXI) depuis Partie 1

## Lot du 27/09 (étapes 1 à 7)
- [x] Étape 1 — 5 notes EB3 Gestion créées + correction automatique des questions ouvertes
- [x] Étape 2 — Passages non fiables : note ancien système + mention ; texte complet dans Correction QRC
- [x] Étape 3 — Fonction commune note/statut (Mes notes = écran admin) — recomptage des 220 écarts NON FAIT
- [x] Étape 4 — Statut modules serveur (règle 6/6 automatique, « Validation en cours »)
- [x] Étape 5 — Contenu indisponible élève + bandeau brouillon local admin
- [ ] Étape 6 — 8 questions en double des Bilans : définition du « 8 » non retrouvée (attente utilisateur)
- [ ] Étape 7 — Essais écran TEST/admin + publication : bloquée, élèves actifs (dernière activité 11:33 UTC)

- [x] 27/09 Contrôle de connaissances TAXI (module 13) : exercice 13100 créé (1 237 questions), exercices 1–5 désactivés.
- [ ] Publication du lot : en attente (examen blanc en cours à 20:49 UTC) ; essais écran du module 13 à faire.
- [x] Date examen : réponse du dossier de bienvenue toujours prioritaire ; date la plus proche seulement si vide (ApprenantEditForm + dateExamenDossierBienvenue, 4 tests PASS)

- [x] 07/10 18:34 UTC T3P : cinq corrections autorisées, quiz 1/2 VTC réactivés ; protection serveur contre reconstruction des bilans ; 62 contenus comparés, bilans 4/9 intacts, 102 tests ordre PASS. Runtime déjà protégé, aucune modification frontend requise. Écrans complets/Safari iPhone et publication non vérifiés ; aucun déploiement.

- [x] 08/10 15:45 UTC Annulation d'inscription : « INSCRIPTION ANNULÉE » en grand et en rouge sur la fiche apprenant (avec date) + badge rouge « ANNULÉ » sur la carte de la liste des apprenants et dans la table Apprenants ; masquage Examens/Réussite/sessions conservé ; aucune donnée supprimée ; vérifié à l'écran sur David FERREIRA ; frontend non publié.

- [x] 08/10 16:05 UTC Convocation TA : la ligne « Horaires de la première semaine » affiche désormais la semaine d'entrée ({{semaine_entree}}, calculée de la date de début au vendredi de la même semaine, bornée par la fin de formation) ; modèle convocation-ta mis à jour en base (sauvegarde docs/backups/convocation-ta-avant-semaine-entree-2026-10-08.html), variable ajoutée à replaceTemplateVars ; session TAXI/TA du 26/10 → « du 26 octobre au 30 octobre 2026 ». Frontend non publié.

- [x] 09/10 08:30 UTC Note générale pour la lettre CMA : colonne additive planning_pratique_config.note_lettre_cma (migration 0132) ; champ de saisie dans la carte Lettre CMA, enregistré par session + période pratique avec les mêmes garde-fous que le planning ; note incluse dans la lettre (aperçu, impression, e-mail CMA), omise si vide ; notes par candidat inchangées ; frontend non publié.

- [x] 09/10 08:45 UTC Lettre CMA : retrait réversible des candidats sans résultat (bouton « Retirer de la lettre » / « Rétablir », colonne additive lettre_exclus_ids, migration 0133) ; débloque l'envoi du mail ; testé à l'écran, base relue vide ; frontend non publié.

## 18/10 « Oui règle les pb »
- [ ] P3 TA : objectif 10 théorie + 2 pratique = 12 (Fiacre 12 attendues, 2 rattachées, historique à régulariser)
- [ ] P1 persistance/auth (Ferreira, Benjelloun) : diagnostic + correctif ciblé
- [ ] P2 Riyad LABIOD EB2 t3 / délai 48 h : distinguer refus attendu et perte
- [ ] Diagnostics lecture seule : 500 liens bilan_sync, 7 QRC vtc-e, mails identifiants

## 21/10 — Bilan sécurité (rechargement, chunk 404, rattrapage Aba-Bakre, Belarbi, Smail)
- handleHardReload ne vide plus aucun stockage ; cache-bust `_t` en conservant l'URL.
- Textes honnêtes (plus de « 90 % des cas » ni promesse de sauvegarde).
- Tests `src/test/error-boundary-reload.test.ts` : 4/4 PASS.

## 2. Ancien chunk 404 (Riyad, JeuxCartesLyon) ✅
- `src/lib/chunkVersionGuard.ts` : détection chunk obsolète, notification avec action « Recharger », jamais de boucle ni de rechargement automatique, aucune file touchée.
- Installé dans `src/main.tsx`. Tests inclus au point 1.

## 3. Rattrapage IA Aba-Bakre (64 QRC, EB1/4/5/6 du 18–19/10) — EN COURS
- Fonction `qrc-ia-correction` : période 17–19/10 restreinte à son dossier ; continuations de suite autorisées dans ces périodes seulement. Déployée (SHA 80be14e1…).
- 20 suites créées (une par tentative), cron `qrc-ia-suites-bornees` actif.
- Progression : 5/64 à 08h35. À vérifier jusqu'à 64/64 + notes finales.

## 4. Belarbi — incident résorbé ✅
- Révision `module_3_revision_exo_404` persistée à 21:42:24 par la file de fond ; original submitted intact. L'échec affiché à 20 s était seulement l'attente écran. Aucune action donnée.

## 5. Smail — incident résorbé ✅
- Révision `module_2_revision_exo_1` persistée à 21:29:54 après la coupure réseau de 21:28. Aucune action donnée.

## 6. Finalisation — EN COURS
- Types OK, build OK, tests 12/12, publication demandée (gestion.ftransport.fr).
- Reste : fin du rattrapage 64/64, empreintes APRÈS, journal docs/.

## 21/10 — Finalisation sécurité correctif 21ee53d
- [x] roadmap.md restauré depuis le parent, historique conservé
- [x] Rattrapage Aba-Bakre limité à l'allowlist figée 64 QRC / 20 passages (direct + suite)
- [x] Tests hors allowlist refusés
- [x] Fonction qrc-ia-correction déployée, état des 64 et empreintes relus

- 21/10 09h: tablettes — jeux et contenu module indépendants de la date appareil, compteur pages borné 100 %; file QRC: suites sans passage → à vérifier (fait).

## Verrou attestations formation continue — 27/10 17:34 UTC
- [x] Aucune génération/téléchargement/envoi d'attestation FC (VTC, TAXI si même processus) sans les 4 signatures serveur (matin+après-midi × 2 jours) ; vérification serveur, refus par défaut, message des créneaux manquants ; tests 0–4 signatures, envois auto/manuels, accès directs ; aucun mail réel.

## 30/10 — Riyad LABIOD jalons 100 % → 95,5 %
- [x] Diagnostic : 99 questions ajoutées le 29/09 après validation (M2 : 11, M4 : 88) + 1 supprimée
- [x] Correctif serveur 0233 appliqué (Riyad 7/7 prouvés) ; test SQL dédié et publication restent à faire — [ ] Correctif : exigences figées à l'attribution/validation, nouveaux quiz non rétroactifs ; tests ; publication conditionnelle
## 30/10 — Liste Pratique signée EDOF : élèves en financement personnel (N. BONNARDON) — attente décision

- [x] Kevin FERNANDES (31/10) : introduction restaurée depuis journal 15/09 (A), date/score 9/10 conservés ; 5/7 modules prouvés. Sept droits individuels enregistrés, accès G(V) seule et bilan testés en aperçu admin réel ; 56 tests PASS, build OK, résultats/snapshots/signatures identiques. Rapport docs/kevin-fernandes-reparation-2026-10-31.md.
- [ ] Kevin EB1 : copies historiques T3/T4 divergent du moteur et sans preuve de remise de même tentative ; correction historique exacte requise, aucune note empruntée ni attente supprimée fictivement. EB2 déjà 14/14 QRC corrigées, aucune relance.
- [ ] Kevin publication des accès : interface prête mais non publiée, confirmation explicite nécessaire ; connexion autonome/soumission G(V) non testées.

## Incidents bilan 05/11 — autorisation « Corrige »
- [x] P4 plantage lazy (Emmanuel 04/11 23:31) : cause prouvée dans le code — `preventDefault` sur `vite:preloadError` faisait résoudre l'import à `undefined` → `_result.default`. Corrigé (aperçu), test PASS, non publié.
- [x] P1 : fusion quadratique prouvée ; 0240 actif (980/980 identiques, 6× plus rapide) ; single-flight + gigue en aperçu. Gain en ligne à constater.
- [x] P2 audité : Malki 7 reprises prouvées ; Mliki 1 élément non confirmé (pas de preuve appareil).
- [ ] P3 42501 progression : correctif freshSessionRead du 04/11 présent dans le code, publication non vérifiée.
- [ ] P5 Belarbi m64 : correctif du 04/11 présent dans l'aperçu, non publié, aucune preuve élève.
- [x] QRC 22 = exclusion volontaire reglementation_taxi2 (correction formateur).
- [x] test_16 : banc obsolète (0230 rejouée sans 0232) ; banc corrigé, assertion inchangée, 17/17 OK.

## 06/11 20:18 UTC — Protection des snapshots après édition des examens blancs
- [ ] Audit lecture seule V2/legacy, écritures admin, snapshots, réponses/QRC, notes et vues.
- [ ] Protéger en aperçu toute modification/ajout/suppression/réorganisation/clé/barème/corrigé pour les futures tentatives seules.
- [ ] Signaler sans reconstruction les historiques dont le snapshot est insuffisant.
- [ ] Tests fictifs de régression et contrôle de non-modification des données réelles ; aucune publication globale.

## 07/11 — Notes EB1 VTC soir 2–13 novembre
- [x] Audit des 18 comptes : 119 matières actives, 118 définitives, 59 faux pending/13 élèves, une vraie attente (4 QRC).
- [x] Affichage V2 par preuve unique réponses/QRC ; archives exclues, aucun recalcul ni écriture.
- [x] Régressions anonymisées et 18 vues CRM élève consultées avec écritures bloquées.
- [ ] Mobile élève autonome non prouvé (contrôle effectué dans CRM uniquement) ; publication bloquée sans accord/sécurité globale.

## 07/11 — Levée des 5 points NO-GO (aperçu seul)
- [x] Notes : masquage inter-matières supprimé, verdict aligné sur la note affichée, isolation changement d'élève.
- [x] Tests globaux : 0 échec (3 658 réussis).
- [x] En-tête admin mobile/tablette : plus de chevauchement.
- [ ] Migration de sécurité des fonctions de correction : brouillon revu (docs/sql-revue), en attente d'accord distinct.
- [ ] Parcours élève autonome iPhone Safari + rafraîchissement QRC en direct : NON PROUVÉS (pas d'identifiants élève).
- [ ] Publication : lot global non découpable, en attente d'accord.

## 07/11 — Causes communes (sauvegarde, 22P05, propagation)
- [x] Sauvegarde nocturne : lecture par clé, réessai sans saut ; comptes seuls NON probants, export achevé distinct de l’intégrité/restauration ; réexport indépendant, tests isolés.
- [ ] Réparation de la journée 07/11 : à lancer sur accord, hors examens ; état déployé de la fonction non vérifié.
- [x] 22P05 : défaut U+0000 reproduit sur base jetable ; codec préparé mais INACTIF faute de marqueur durable et lecteurs complets.
- [ ] Champ exact du refus d'Ahmed MALKI : non prouvable (corps de requête non conservé) ; file de son appareil non vérifiée.
- [x] Propagation exercice 62 : réintroduction reproduite, brouillon SQL testé (docs/sql-revue), non appliqué.
- [ ] Q40/Q41 toujours présentes en TAXI 10/62 et Q49 en TAXI : décision admin requise, aucune modification faite.
- [x] Contrat sécurité fonctions de correction : 6 profils testés ; correcteurs réels = 1 admin + service IA.

## 07/11 11:09 — Finalisation ciblée a66eccf (sans activation)
- [x] Export : états honnêtes, concurrence et anciens curseurs, réparation indépendante ; tests PASS.
- [x] 22P05 : codec inactif, originaux préservés, lecteurs non marqués inchangés ; prototype SQL lossless PASS.
- [x] Sécurité : brouillon identité session/role vérifiée, refus par défaut, matrice SQL isolée PASS ; non appliqué.
- [x] Rapport fichiers/tests/limites ; 53 tests ciblés + 2 contrats SQL PASS ; aucune publication, migration, donnée réelle ou appel payant.

## 07/11 14:12 UTC — Lever les quatre alertes RLS puis publication conditionnelle
- [x] Quatre alertes et droits réels identifiés ; appelants légitimes vérifiés, aucune preuve d'exploitation.
- [x] 0245 appliquée : lectures admin seules, anonymes refusés ; fonctions/EXECUTE inchangés ; retour arrière testé.
- [x] Matrices jetables, Bilans/snapshots/trigger, validation modules ; 3 688 tests globaux, build et navigateur admin PASS.
- [x] Scan frais : 0 erreur, 6 avertissements, 2 informations ; empreintes contenus/réponses/notes/tentatives/émargements identiques.
- [x] Publication globale demandée sur commit `afda34b573528b93a9c136a26022ad12577545b8`.
- [ ] Bascule frontend effective NON PROUVÉE : contrôle HTTP 200 mais ancienne version encore servie ; attente du déploiement programmé, sans nouvelle publication.

## 07/11 14:48 UTC — G(T) e-learning : admissibilité par question et reprise contrôlée
- [ ] Retirer l'exclusion matière globale ; snapshot seul, corrigé/barème suffisants, ambiguïté = revue, présentiel/tests exclus.
- [ ] Tester le vrai handler et les RPC sur PostgreSQL jetable : snapshots `questions`/`matieres`, reprise idempotente, aucune double facturation ni réévaluation.
- [ ] Appliquer uniquement la migration additive de reprise des exclusions `matiere_exclue_gt`, puis déployer `qrc-ia-correction`.
- [ ] Reprendre les 24 QRC réelles ciblées : 22 admissibles, 2 calculs bagages incomplets en revue ; FICTIF et 6 déjà corrigées exclus ; plafond 20 € intact.
- [ ] Relire corrections, revues, exclusions, notes définitives et affichage ; aucun mail/SMS, contenu, réponse ou historique modifié.

## 07/11 21:03 UTC — Corrections ciblées autorisées
- [x] Export 07/11 : réexport indépendant terminé (1 777 363 lignes), originaux/marqueurs préservés, aucune rotation. Comptes concurrents divergents consignés dans `_incomplet.json`, jamais un snapshot cohérent ; restauration fictive jetable PASS, réelle non prouvée.
- [x] Émargements : 216 `signed_at=created_at` automatiques (166 futurs, 50 passés), pas des preuves perdues ; 131 images/8 dossiers hors créneau actuel conservées, 40 tests PDF + 25 contrats SQL PASS, aucune signature modifiée.
- [ ] CMA : quatre attentes confirmées, algorithme actuel déjà correct (10 tests). MESBAHI univoque mais RPC refusé sans session admin habilitée ; trois autres choix non automatiques. Aucun rattachement appliqué.
- [x] Paiements : 0247 + identité stable appliqués, multi-session et virements égaux testés ; 18 paiements intacts, zéro backfill. Publication confirmée (`index-Dl3wEx4I.js`) sur les deux URL.
- [x] Synchro : 0248 appliquée, réintroduction future bloquée ; Q40/Q41/Q49 et 210 contenus inchangés, empreintes modules identiques.
- [x] Tests : 3 695 globaux PASS, scan 0 critique/6 avertissements/2 infos ; rapport final et bascule publique confirmée. Seul le rattachement CMA reste bloqué par la session admin habilitée.

## 08/11 22:01 UTC — Publication ciblée
- [x] Rattrapage QRC écran ouvert publié (`index-XoqG3L5A.js`) ; fin de révision publiée = chemin existant, appel serveur désactivé (`uoe=!1`).
- [ ] Finalisation atomique révision : bloquée, pas de source serveur structurée pour ~30 % des copies récentes (151/509 en novembre sans snapshot, seulement un résumé texte) ; décision nécessaire.

## 11/11 — Accès EB unitaire (préparation sans écriture réelle)
- [x] Diagnostic catalogue serveur en SELECT : contrôle unitaire/groupé et journal absents.
- [x] Dissocier une seule session du groupé, garder confirmation et relecture exactes.
- [x] 43 tests UI/transport, 16 contrats SQL jetables et aperçu PC/mobile fictif ; admin réel lecture seule confirme le blocage serveur.
- [ ] Installation réelle bloquée par absence d’accord séparé et prévol de compatibilité serveur ; aucune migration/publication dans ce tour.

## 11/11 — Noms du relevé vers CRM
- [x] Lien immuable identique à Correction QRC V2, nouvel onglet ; 6 tests réussis, fiche Ilies MEMDOUH ouverte en aperçu admin réel, relevé/filtre EB4 TAXI préservés, sans écriture ni publication.

## 10/11 — Notes historiques EB2 VTC dans le correcteur (accord explicite)
- [x] Projection en lecture seule du résultat original /20, identité consultation, aucune mutation réelle.
- [x] 77 tests PASS ; journée 49/49 et soir 54/54 notes définitives concordantes ; 34 copies soir en attente gardées sans note ; rechargement PC/mobile identique, 42 notes TAXI conservées.
- [ ] Publication ciblée demandée ; contrôle public 07:21 UTC sert encore index-Cv4rxQEI.js sans projection. Bascule du déploiement non prouvée, attente du service de publication.

## 13/11 00:41 UTC — Corriger les obstacles du NO-GO stabilisation (aperçu, aucune écriture réelle)
- [ ] File V2 : stockage refusé/saturé → repli session/mémoire, alerte visible, garde de fermeture, jamais « sauvegardé » sans confirmation.
- [ ] Deux onglets : verrou inter-onglets, fusion sans perte, dernière valeur par horodatage, conflits mis de côté.
- [ ] Tests : fermeture pendant envoi, panne prolongée, deux onglets, stockage refusé.
- [ ] Deux tests globaux en échec, suite entière, scan de sécurité frais.
- [ ] Sauvegardes/restauration isolée : vérifier ce qui est possible, déclarer le blocage sinon. Lot à publier contrôlé.
