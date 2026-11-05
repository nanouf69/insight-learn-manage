# Word de référence reçu — 05/11/2026 15:07 UTC

## Accès réellement confirmé
- Fichier : `Bilan_francais_TAXI_VTC_textes_QCM_QRC.docx`.
- SHA256 : `0a2cfad4f4e45c9ac89e2019279d62deb4dbf199b3f6a5aa750d4268974e7f01`.
- Lecture complète du résultat de parsing ; confirmation indépendante par XML original ; contrôle visuel pages 8, 17 et 19.
- 21 pages ; 10 textes supports ; Q1–Q98 continus, sans numéro absent.
- 67 questions explicitement QCM, 27 explicitement QRC ; Q95–98 proposent des choix mais ne portent pas de type explicite.
- Aucun corrigé QCM marqué : le document le précise au début et dans sa liste finale d'avertissements. Ne pas transférer arbitrairement les anciennes clés.

## Source conservée, pas intégrée
`source-exacte.json` conserve tous les paragraphes XML, les dix textes et les questions associés. Les champs de corrigé QCM sont volontairement NULL. Il s'agit d'une extraction documentaire détachée, jamais chargée dans l'application ni dans la base.

## Ambiguïtés confirmées
- Q40 : réponse proposée = sécurité des femmes ET création d'emplois ; note finale signale une divergence avec le précédent document QRC. Rien arbitré.
- Q87 : une même proposition est répétée deux fois ; répétition présente dans le Word, pas une erreur de parsing.
- Q91 : « 2B jours » est réellement écrit dans le texte (page 19), tandis que les choix incluent « 28 jours ». Aucune substitution réalisée.
- Q95–98 : aucun texte support identifié ; pas de type explicite dans leur titre. Aucun texte associé inventé.
- Q64 : une proposition réunit « A établi un record… » et « Est un exemple… » dans le même paragraphe ; ne pas la scinder sans validation.
- Le texte 9 ne contient pas littéralement la citation « des piétons moins soucieux des règles » utilisée par Q89. Conserver la différence, ne pas ajouter de phrase à la source.

## Changements possibles et protections
Périmètre autorisé : VTC 5/503 et TAXI 11/603 uniquement ; textes supports et réponses QRC ouvertes. Il faut une exception serveur limitée à ces deux exercices, un rendu des textes, un transport QRC sûr et une nouvelle version pour les futurs passages. Aucune modification globale des Bilans ou examens blancs.

Avant toute intégration : vérifier les identités existantes (97 questions actuelles contre 98 source), sauvegarder l'état live et les empreintes des passages, établir le mapping stable, ne jamais superposer le nouveau contenu sur un passage commencé. Validation du corrigé QCM indispensable avant notation automatique. Tests SQL isolés, fidélité, isolement et vues élève/admin requis avant publication.

## Réalisé / non réalisé
- Réalisé : lecture du DOCX et analyse documentaire, extraction détachée et consignation du périmètre.
- Non réalisé : correction pédagogique, changement de code de l'application, modification SQL, import, déploiement, publication, email ou appel IA de correction.
- Aucun test de correction ou parcours élève/admin exécuté : aucun correctif n'est encore implanté. Les assertions de comptage de l'extraction ont été exécutées ; elles ne prouvent pas un fonctionnement applicatif.
- Blocage : corrigé QCM non fourni et ambiguïtés ci-dessus non arbitrées. L'état des Bilans utilisés par les élèves reste inchangé dans ce tour.