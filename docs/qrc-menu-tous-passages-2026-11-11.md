# Menu Correction QRC — tous les passages

## Livraison en aperçu seulement
- Menu sessions : nouvelle option **Toutes les sessions — tous les passages remis**. Les sessions CRM, groupes e-learning, non déterminés et conflits restent disponibles ; inscriptions croisées conservées mais une copie n’est comptée qu’une fois dans la vue globale (ID immuable).
- Menu EB conserve EB/filière/circuit, dates complètes avec année ; bouton **Toutes les dates** et nouveau sélecteur **Tous les passages — toutes les tentatives du filtre**, ou copie individuelle avec candidat/date Paris/heure/tentative/ID.
- Les anciennes copies restent dans `CopiesHistoriquesLecture`, sans notation. Les imports V2 sont dans la grille V2 sans migration supplémentaire. Notes strictement par `attempt_id`. Le filtre individuel borne également précédent/suivant et l’avancement après correction.

## Causes réellement constatées et corrigées
1. Catalogue V2 lisait également `en_cours`/`abandonnee` : seules `terminee` sont désormais listées comme remises (2908 terminées, 46 en cours, 8 abandonnées constatées par SELECT).
2. Aucun latest-only ni fenêtre de dates dans le catalogue actuel : toutes les tentatives étaient déjà lues, mais menu limité à la session choisie et accès individuel absent. Option globale et sélection explicite ajoutées.
3. QRC du chargeur plafonnées à une réponse API par lot (`range(0,4999)`), sans pagination : remplacé par pages stables de 1000 ; erreurs remontées. Neutralisations paginées aussi.
4. Recherche archives limitée à 50 candidats/500 résultats et regroupée par candidat/EB/jour : pagination complète et une entrée par ID résultat, non par date. Filtres `quiz_type=examen_blanc`, EB et fin non nulle conservés. SELECT live : 6535 résultats EB et 163 révisions distinctes, aucune autre valeur de quiz_type à intégrer.
5. Ancien circuit exclu si aucune QRC texte : toute copie historique finalisée peut maintenant être consultée, même sans QRC écrite ; aucun brouillon ajouté.
6. Chargeur superposait la dernière fiche non suffixée au texte des anciennes tentatives. Supprimé : seul `source_historique.details.reponses` de la copie exacte peut compléter un texte importé. Natif sans source conserve son propre texte V2, aucune donnée inventée.
7. Passage d’une session à la vue globale avec mêmes IDs vidait la grille sans relire (mémo inchangé). Relecture liée aussi à la sélection de session/EB ; un événement de sélection EB inchangée est ignoré.

## Chemoun : preuves réelles en lecture seule
- EB3-TAXI T3P 01/11 : source `485503df-2091-43fb-91ed-743af3e339aa`, passage `91bce116-6f48-48bc-ad2a-1abe93311b81`, tentative 1, 15 réponses originales, 5 QRC V2 ; fin 17:15:42 UTC / 18:15:42 Paris.
- 09/11 : source `e0cb84a0-e170-40b2-aef2-6b55174b1bd6`, passage `7f3f3ead-78a3-42c5-80fb-719a5be8351f`, tentative 2, 1 réponse « 3.5 t », 1 QRC V2 ; fin 20:21:19 UTC / 21:21:19 Paris.
- SELECT confirme deux passages terminés distincts. La date ne sert jamais d’identité. Diagnostic de sauvegarde/CRM antérieur intact.

## Tests exécutés
- 48 tests PASS sur cinq fichiers : vrai catalogue/chargeur multi-page, agrégation toutes sessions, filières et ancien/V2, deux tentatives, sélection individuelle et absence de notation, régressions correcteur/CRM.
- Vrai catalogue sur transport fictif : 1002 passages dans quatre filières + brouillon exclu ; vrai chargeur : 1200 QRC pour deux copies, dernière QRC présente, source exacte séparée, aucune lecture de dernière fiche.
- Chromium réel, menu+chargeur sur API interceptée fictive, PC 1280×1800 et mobile 390×844 : toutes sessions, choix complète puis partielle, Q2 de la complète et « 3.5 t » de la partielle, date 01/11 puis toutes dates, zéro écriture Cloud et zéro erreur JS. Captures inspectées.
- Compilation observée build OK. Aucun import/migration, modification de copies/réponses/notes, email/IA ou publication. Commits gérés automatiquement par la plateforme ; référence finale à communiquer après vérification.

## Limites
- Pas de session admin réelle vérifiée dans ce chantier : accessibilité des deux copies réelles prouvée par SELECT et mêmes identités/code ; comportement UI exécuté sur données fictives, pas dans une session réelle Chemoun.
- Anciens résultats finalisés sont présentés en consultation, pas déclarés notables sans preuve serveur. Pas de requalification de brouillons, aucun import automatique.
- Les miroirs techniques déjà prouvés restent dédupliqués selon le mécanisme existant (source historique ou miroir V2), pas par nom/date. Le changement ne revoit pas une migration antérieure.
- Interface mobile du correcteur reste à deux panneaux comme auparavant, non redessinée ; les menus sont bornés en largeur, les grilles défilent horizontalement.