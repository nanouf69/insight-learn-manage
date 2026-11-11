# Cours : liens et vidéos — 11/11/2026

## Livré en aperçu
- Actions « Ajouter un lien » et « Ajouter une vidéo » sous les outils de mise en forme de Description / Contenu détaillé.
- Libellé libre, lien HTTP/HTTPS, ouverture `_blank` avec `noopener noreferrer`.
- YouTube : watch, youtu.be, shorts, embed ; hôtes exacts, ID de 11 caractères. Vimeo : URL numérique classique ou player.vimeo.com/video/ID. Vidéos privées/unlisted avec jeton non prises en charge pour l’intégration ; lien d’ouverture toujours présent.
- Fichiers directs HTTPS .mp4/.webm (paramètres URL acceptés), contrôles natifs et repli en cas d’erreur. Aucun upload ni stockage ajouté.
- Chargement explicite par bouton, aucun autoplay ; proportions 16:9, accessibilité clavier via les boutons existants.
- URL déjà en clair rendue cliquable dans la projection uniquement. Description originale non réécrite à la lecture. Textes, gras, italique, soulignement, couleur et taille issus de l’éditeur conservés.
- Les nouvelles insertions sont des ancres générées et échappées ; jamais de code iframe/HTML fourni par l’utilisateur. Copie collée dans l’éditeur insérée en texte seul. Le rendu cours filtre les balises actives et attributs dangereux sans changer RichText global.

## Persistance et preuves
La description enrichie est enregistrée par le `onSave` du CoursEditor existant ; aucune nouvelle colonne, fonction serveur ou migration. Le cours rejoint le circuit existant `moduleData.cours` et sa sauvegarde versionnée. Aucun compte/cours réel n’a été écrit.

Tests automatisés conservés : validation des schémas, hôtes/IDs exacts, échappement des libellés, URL anciennes, chargement au clic, absence autoplay, repli vidéo, refus invalide, callback réel d’enregistrement puis réouverture du CoursEditor.

Navigateur Playwright : vrai CoursEditor et vrai CourseDescription importés depuis l’aperçu dans une racine isolée ; persistance JSON fictive exclusivement. Parcours ajout invalide puis valide, lien + vidéo, enregistrer, réouvrir, réenregistrer, afficher et charger au clic. Ordinateur 1280×1800 et téléphone 390×844 : sans débordement ni erreur navigateur. Les réponses de fournisseur vidéo sont simulées : lecture audiovisuelle distante et disponibilité YouTube/Vimeo non prouvées. Le lien d’ouverture reste présent même lorsqu’un fournisseur refuse l’intégration sans signaler d’erreur au navigateur.

## Limite de livraison
Aucune publication : la capacité à publier uniquement ces changements sans les chantiers concurrents n’est pas établie. Aucun email, IA, note, évaluation, jalon, copie ou contenu réel changé. L’enregistrement Cloud réel n’a volontairement pas été testé en écriture ; preuve de persistance limitée au contrat existant et à la fixture isolée.