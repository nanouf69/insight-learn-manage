# Présence administrative — audit du 13 novembre 2026

## Rectification prioritaire du 13/11, demande 14:18 UTC
Cette section remplace les dénominateurs de la conclusion précédente ; le compte rendu initial ci-dessous reste conservé comme historique de l'audit.

- Relecture exacte : session `20a69b8e-fdf6-4fad-a1e6-666a0997a6c1`, « Session VTC cours du soir - Du 14 au 27 septembre 2026 », théorie, 17:00–21:00. `sessions.heures_total` = NULL : **40 h est le défaut du parcours soir**, non une valeur contractuelle enregistrée.
- `apprenants.heures_presentiel`, `heures_pratique`, `heures_totales`, `heures_elearning` = NULL. Aucune autre inscription, aucune session pratique. Aucun devis/contrat dans `devis_envois`, aucun document contrat dans `documents_inscription`, aucun catalogue lié à la session : la durée contractuelle n'est pas vérifiable par ces sources.
- **Cause des 46 h** : `tauxTotalPresence` ajoutait par défaut 6 h même lorsque `pratique.prevues = 0`. Aucune preuve du dossier ne justifie ce supplément. Ce n'est pas une preuve de « 40 h incluant 6 h de pratique » non plus.
- Dénominateur de présence selon les inscriptions connues : **théorie 40 h ; pratique 0 h inscrite (obligation contractuelle non déterminée) ; total inscrit 40 h**. Une future preuve contractuelle ou inscription pratique explicite reste à intégrer sans réécrire le contrat ; on ne déclare pas une dispense pratique.
- Signatures valides relues : **2010 minutes = 33 h 30**. Les deux validations font 330 minutes mais le 17/09 soir_1 prouve déjà 90 minutes : **240 minutes nettes retenues**, soit **2250 minutes = 37 h 30**. Résultat **37,5/40 = 93,75 %, affiché 93,8 %**. Les 90 minutes restent en revue, pas supprimées.
- Références testées : 33,5/40 = **83,75 %** ; 39/40 = **97,5 %** uniquement si les 330 minutes sont distinctes. 39 h n'est pas le temps actuellement prouvé.
- Aperçu : total partagé CRM/liste sans supplément implicite ; une durée pratique explicite reste comptée (40+6=46), les plafonds par catégorie sont conservés. Le défaut soir ne remplace plus une durée positive configurée.
- **Limites** : CRM/élève authentifiés complets non vérifiés sur ce correctif ; table de validations admin-only et événements distants non disponibles restent les blocages de parité déjà identifiés. Aucun changement de droits, jalons/EDOF, contrat, inscription, note ou signature. Les calculs génériques élève et rapports non alimentés par cette projection restent à aligner après preuve propriétaire sûre.
- Contrôle SELECT avant/après des validations : `09a38657f55fa99702ee04e73d3a5dad` identique (formule de cette relecture) ; signatures SELECT 2010 minutes ; aucune écriture réelle ni publication.
- Tests et vérifications de cette rectification : voir résultats finaux ci-dessous.

## État exact (SELECT uniquement)
Dossier **Tarek CHERNI, VTC cours du soir**, identité CRM `8fc60874-fa5d-4fed-aced-da946fbf1cca`.
- Validation `69de7ba5-6d4a-422f-86a2-fb9a3faa6e34` : théorie **90 minutes**, présence 17/09, créée 13/11 **13:52:38 UTC = 14:52:38 Paris**.
- Validation `a1a3de55-21da-4123-a2e6-22cbd7ab32bb` : théorie **240 minutes**, présence 18/09, créée **13:53:25 UTC = 14:53:25 Paris**.
- Table append-only : pas de colonne statut/annulation/session/créneau. Les deux lignes sont enregistrées, pas des brouillons ; aucun mécanisme d’annulation réel trouvé dans cette table. La simple présence de la ligne ne prouve pas un supplément distinct d’une séance déjà signée.
- Session théorique inscrite `20a69b8e-fdf6-4fad-a1e6-666a0997a6c1`, 14–27/09/2026, cours du soir : **40 h**, plus cible pratique existante **6 h**, total **46 h inchangé**. Aucune session pratique inscrite, aucune réservation, **0 h pratique prouvée**.
- Total signé valide **2 010 minutes = 33h30**, reproduit en SELECT. Trois images vierges connues exclues : 17/09 soir_2, 18/09 soir_1 et soir_2 ; autres signatures conservées.
- **17/09 soir_1 est déjà signé, image non vierge connue, 90 minutes**. La déclaration de 90 minutes sans créneau ni séance séparée chevauche cette preuve. Aucune liaison prouve qu’elle décrit les 150 minutes manquantes de soir_2 ni une séance supplémentaire.
- **18/09 : deux images vierges, 0 minute signée valide**, validation admin de 240 minutes intégrable à la théorie.

## Résultat prudent sans double comptage
**33h30 + 4h net = 37h30 / 46h = 81,521739 %, soit 81,5 %** au taux présentiel et total si le même dénominateur est utilisé. Théorie 37h30/40h, pratique 0/6h. Les 90 minutes du 17/09 restent enregistrées et signalées « couverture à vérifier », pas supprimées ou déplacées.

Si une preuve établit que les 90 minutes déclarées sont réellement supplémentaires au soir_1 déjà signé : **33h30 + 5h30 = 39h /46h = 84,782609 % → 84,8 %**. Cette preuve manque actuellement ; ni le motif « cours » ni l’heure de saisie ne suffisent.

## Cause racine
`chargerApprenantTauxRealisation` additionnait les validations mais `ApprenantDetailPage` remplaçait ensuite ce résultat par `chargerTauxPresenceHeures`, qui ne lisait **jamais** la table administrative. `useTauxPresenceHeures` ne relisait qu’au montage/identité : invalidation du cache ou événement local n’avait aucun effet sur ses données. Une addition naïve aurait en plus doublé la couverture du 17/09.

## Correctif aperçu uniquement
- `presenceAdministrative` : projection pure en minutes entières, identité validation, date/catégorie, maximum de couverture signée/déclarée d’une même journée, conflit/chevauchement signalé. Sans créneau précis, jamais addition de deux déclarations d’une même date/catégorie. Aucune mutation de signature ou ligne administrative.
- Source sessions lit les validations, vérifie les dates inscrites, sépare théorie/pratique, mêmes 40+6h. Temps prouvé conservé, pourcentage plafonné séparément par catégorie : surplus théorie ne remplit pas la pratique.
- Carte CRM présentiel/total et liste des taux complets consomment cette source. Rapport de progression recalcule l’ajout net depuis la même fonction ; libellés « prouvées » plutôt que faussement « signées ».
- Rafraîchissement local `heures-validees-changed`, retour fenêtre/connexion, abonnement aux événements existants. Réponse ancienne ignorée par génération, erreur visible et pas de faux zéro. Aucun intervalle ajouté.

## Limites de sécurité confirmées — NO-GO
- **Table administrative SELECT admin uniquement** (RLS relue) : l’apprenant n’a pas accès à ces validations. Aucun élargissement de droits ni RPC créé. La parité du compte élève réel n’est donc **pas** livrée/prouvée ; une projection propriétaire minimale côté serveur sera nécessaire après accord.
- **Table absente de toute publication Realtime** : abonnement préparé mais événements distants non garantis. Local après saisie confirmée/focus/reconnexion fonctionne ; propagation multi-appareils temps réel exige un circuit autorisé, non installé.
- Annulation serveur non disponible : test pur d’annulation explicite seulement, aucune annulation inventée de ligne réelle.
- Séance/créneau/session absents de la validation : conflits signalés, aucune déduction automatique ; plusieurs validations même date pourraient représenter des activités différentes, dont le total ne peut pas être prouvé.
- **Jalons/EDOF et relevés figés laissés inchangés** : le vieux calcul de jalon virtuel agrège encore théorie/pratique/admin. Le modifier globalement pourrait abaisser des jalons protégés ; aucun accord nominatif avant/après fourni, donc correction du jalon non activée.
- PDFs historiques, attestations, originaux et statistiques gelées inchangés. Le nouveau rapport de progression affiché est distinct des preuves historiques sauvegardées.

## Vérifications exécutées
- **80 tests PASS, 9 fichiers** : 1h30+4h, exact 39/46 si supplémentaire, chevauchement 17/09, 37h30/46, mêmes séances/IDs, annulation simulée, hors inscription, signatures vierges, sessions doubles, plafonds séparés, événement local scoppé, régressions présentiel et gel. Deux fixtures initiales erronées corrigées (longueur image vierge et IDs manquants), puis suite rejouée.
- PC 1280×1800/mobile 390×844 : projection fictive même fonction inspectée, **37,5/46 — 81,5 %, théorie37,5/pratique0, ajout240 minutes**, aucun débordement. Ce n’est **pas** un parcours CRM/élève authentifié complet. Montage du test navigateur corrigé après ressources incorrectes.
- Compilation observée **build OK 14:09:24 UTC** ; aucune compilation manuelle.
- Empreinte des validations avant/après identique : **13eac23330e8f6fdc1f762045afb4ee3**. Contrôle en SELECT uniquement, aucune écriture, signature, recalcul serveur, migration ou publication.

**Décision : NO-GO publication**, parité élève/RLS, événements distants, provenance créneau et protection jalons à résoudre après validation explicite.