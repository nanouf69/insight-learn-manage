# Identité sous les signatures apprenant — aperçu

Sept générateurs couverts : personnalisé, semaine, individuel initial/FC, collectif, pratique VTC/TAXI, signatures manquantes, signatures rassemblées. Helper partagé nomSousSignature : nom/prénom de l'objet exact de la ligne, police normale 6,5 pt, retour à la ligne et réduction limitée pour noms longs. Identité manquante non inventée. Bande inférieure réservée ; images signées rendues au-dessus, aucun nom substitué à une signature. La ligne collective supplémentaire sans identité reste vide. Modèle émargement formateur/jour sans apprenant : inchangé.

Les PDF sont uniquement régénérés en mémoire/download comme auparavant : aucune écriture base/storage, aucun remplacement de document historique, aucune signature originale modifiée.

## QA selon le guide PDF
Sept PDF fictifs, neuf pages A4 portrait/paysage converties par Poppler et inspectées. Cas : noms longs avec É/ç, deux élèves, signé/vierge, semaine du soir, pratique TAXI matin/après-midi, personnalisé TA. Problèmes trouvés : encodage absent dans la fixture (corrigé UTF-8) ; en-tête long de la feuille manquante chevauchant formateur (séparation des lignes) ; en-tête personnalisé empiétant formation (taille adaptée). Pages affectées régénérées et réinspectées : noms sous signatures lisibles et tracés séparés. Les exports paysage et pratique ont été inspectés avec les autres pages. 19 tests existants PASS/3 fichiers. Build OK 15:01:41 UTC.

## Limites et statut
Les variantes FC, VTC/TAXI/TA/VA partagent les générateurs modifiés ; chacune n'a pas été exercée individuellement. Aucun parcours de téléchargement réel sur compte élève testé pendant cette demande ; génération fictive des sept chemins prouvée. Très longs noms arbitraires au-delà des cas vérifiés non garantis. NON PUBLIÉ : les changements concurrents non validés restent dans l'aperçu. Aucun changement de données réelles.