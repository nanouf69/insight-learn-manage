# Qualiopi 12–16 — audit et rattachements du 19 novembre 2026

## Résultat relu en base et dans l’interface connectée

- Indicateur 12 : **0 → 170 références actives** ; 13/14/15/16 : **0 → 1 référence d’audit chacun**.
- **167 nouvelles fiches**, **174 nouveaux liens**, trois fiches antérieures réutilisées sans les remplacer. Zéro doublon de lien et zéro orphelin.
- Aucun état `statut` ou `applicable` changé. L’écran continue d’afficher « Sans preuve » et « Jamais vérifié » : c’est son état manuel antérieur, pas une absence de références.
- Aucune pièce jointe nouvelle ; aucun mail, appel, dossier, inscription, signature ou note modifié. Aucun envoi ni publication.

## Indicateur 12 — contenu effectivement rattaché

| Source | Références | Portée et limites |
|---|---:|---|
| `emails` | 155 | 104 rappels émargement, 46 rappels avant fin, 5 demandes de signatures manquantes. Identité apprenant explicite, destinataire identique et contenu vérifié. 59 dossiers ; du 14/05 au 12/11/2026. Envoi enregistré ≠ réception. |
| `apprenant_appels` | 1 | Appel sortant du 31/07/2026 à 12:01 UTC, risque d’arrêt et demande de rappel explicites. Dossier e-learning ; aucune session présentielle inventée. Pas preuve de J1 ou d’un rappel exécuté. |
| `apprenant_documents_completes` | 2 | Dossiers de bienvenue signés : contacter le centre si accès non reçus et engagement pratique confirmés. Dates d’accès archivées distinctes du CRM actuel. Réutilisation des fiches 9 existantes ; aucune donnée sensible copiée. |
| `session_apprenants` | 6 | Quatre « à rappeler », deux « injoignable ». Inscription/session exactes ; quatre sessions examen et deux théoriques. Statut actuel seulement, pas appel ni date d’absence. |
| `documents_inscription` | 4 | Documents validés, objets privés existants de 81 140 octets au catalogue. Quatre créneaux se rapportent à un même justificatif : ne pas compter quatre pièces indépendantes. Contenu médical non relu, non copié, non joint ; session non déduite d’une date. |
| Déclaration procédure | 1 | J1/J2/J3 et texte utilisateur transcrits comme procédure déclarée, original non accessible, aucune exécution présumée. |
| Audit réglementaire | 1 | Exigences exactes 12–16, périmètre, limites et écarts de l’écran. |

Les **147 emails avec session unique** ont un rapprochement par nom exact de session dans leur contenu + inscription du même dossier, avec identifiants inscription/session et dates enregistrées. **8 emails restent sans session prouvée**. Ce ne sont pas huit personnes nécessairement sans formation.

## Audit des autres traces et exceptions

- 17 appels réels inspectés. Un seul décrit clairement le risque d’arrêt ; un autre « pas de réponse » et un échange à rappeler ne prouvent pas la procédure d’absence.
- 189 emails candidats sur un filtre large ; les 155 retenus ont un contenu d’émargement/contact contrôlé. Six emails CPF ont été écartés de ces preuves d’exécution, dont un modèle synchrone aux dates inversées (14/09/2026 → 25/06/2026). 28 rappels de connexion/suspension hors lot retenu : ils comprennent des noms de test non enregistrés dans le registre technique ; aucune certification de l’ensemble des destinataires.
- 15 notifications entrantes « Non remis : RAPPEL ÉMARGEMENT » existent. Elles ne valent ni réception ni annulation automatique des traces d’envoi ; correspondance provider par message à approfondir. Zéro réception confirmée documentée dans le premier lot large contrôlé.
- 3 765 lignes d’émargement, 200 masquées exclues ; 3 226 images signées datées reconnues. **Zéro ligne non masquée avec `absent=true`**, zéro date de première absence documentée dans ces lignes ; les 339 autres lignes non masquées ne sont pas déclarées présentes par cet audit.
- 132 acceptations RI existent ; elles attestent une acceptation, pas un contact à la suite d’une absence. Le règlement visible prévoit avertir le formateur en cas d’absence/retard, sans démontrer la mise en œuvre J1/J2/J3.
- Le code de `relance-emargements-manquants` vise un écart de trois demi-journées et une exclusion de relance sur sept jours, pas J1/J2/J3. Lecture de code uniquement, aucune fonction déclenchée. Son compteur historique ne filtre pas les lignes masquées : pas de déduction de conformité ni réparation dans cet audit.
- Les originaux accessibles montés et le catalogue de stockage n’ont pas permis d’identifier **Indicateur 12.pdf**. Aucun fichier simulé, aucune attestation de lecture du PDF. Pour joindre et contrôler cet original, le retransmettre.
- Adresse 44 Route de genas et menace de non-garantie d’une place conservées comme texte source, pas coordonnées courantes ni sanction juridiquement validées ; divergences avec les anciens documents à résoudre avant usage.
- **J1/J2/J3 non prouvé** : absence datée → contact réel → résultat → action suivante → reprise/clôture manquent. Ne pas inventer ces événements.

## RNQ exact applicable et indicateurs 13–16

Source primaire : décret n° 2026-728 du 1er août 2026, JORFTEXT000054608509, entrée en vigueur au 1er novembre 2026.

- URL officielle : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509
- Copie Légifrance effectivement téléchargée et lue, pages 5–7 et article 2 : https://www.psppaca.fr/IMG/pdf/decret_no_2026-728_du_1er_aout_2026_relatif_au_referentiel_national_sur_la_qualite_des_actions_concourant_au_developpement_des_competences_-_legifrance.pdf
- SHA-256 : `f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783`.
- Les accès directs au ministère et Légifrance renvoient une protection navigateur. Guide V10 intégral NON PROUVÉ ; ne pas substituer silencieusement V9. Une éventuelle disposition transitoire acceptée par le certificateur n’est pas établie.

| Indicateur | Exigence exacte synthétisée | Applicabilité constatée |
|---|---|---|
| 12 | Engagement/ruptures **et** prévention/traitement violences, VSS, harcèlement, discrimination | Applicable aux formations examinées. Le volet supplémentaire n’est pas couvert par la procédure d’absence ; procédure de signalement et traitement à documenter. |
| 13 | En alternance : missions anticipées avec entreprise/apprenant, coordination et progressivité centre/entreprise | Non applicable aux parcours VTC/TAXI/TA/VA examinés sans alternance. Applicable si contrat d’alternance, même hors apprentissage ; périmètre global de l’organisme à confirmer. |
| 14 | Accompagnement socio-professionnel, éducatif/citoyenneté et traitement sans délai des ruptures liées aux difficultés/violences/discriminations | Spécifique apprentissage dans le tableau du décret. Non applicable aux parcours examinés sans apprentissage ; statut OF/CFA et contrats à confirmer pour décision globale. |
| 15 | Droits/devoirs apprentis salariés, santé/sécurité, mineurs, signalement, médiateur et inspection du travail | Spécifique apprentissage. Même distinction que 14. Ce n’est pas la coordination des intervenants. |
| 16 | Conditions de présentation à une certification conformes aux exigences de l’autorité | Applicable aux préparations VTC/TAXI et passerelles conduisant à une certification ; FC donnant une simple attestation : non applicable sauf certification distincte. VA et codes/validité en vigueur à confirmer selon offre précise. |

Zéro dossier ou session libellé alternance/apprentissage/CFA ; **cette absence de libellé n’établit pas l’absence juridique de contrats ou d’activité CFA**. Table `formations` vide ; des dossiers anglais/marketing existent aussi, donc conclusion globale interdite sans vérifier le périmètre réellement dispensé. Les codes RS sont contradictoires dans plusieurs écrans/formulaires : aucun code ni validité officielle réattribué par cet audit.

### Écart de l’interface signalé, non corrigé sans décision

13 affiche l’accompagnement socio-professionnel ; 14 affiche la fonction tutorale ; 15 affiche la coordination des intervenants (exigence 18). Ces intitulés sont inexacts. 12 ne montre pas son ajout réglementaire de novembre et le bandeau général reste à 32 indicateurs. La fiche d’audit rattachée rend l’écart explicite ; aucun référentiel d’écran ou statut changé dans cette demande documentaire.

## Contrôles réellement exécutés

- PASS : relecture indépendante des comptes 170/1/1/1/1, sources et zéro doublon/orphelin ; fichiers joints = 0.
- PASS : interface admin connectée `/?section=qualiopi`, compteurs 12–16 et onglet « C — Nos preuves (170) » ouverts ; capture du détail lue. État « Sans preuve » inchangé.
- PASS : sept empreintes sources avant/après strictement identiques :
  - emails `42ad0c483619ee17912c1fd2b5f6d680`
  - appels `e669dc7d80cafc94eb484940452ef000`
  - émargements `72e877283f19415477a356716f429eae`
  - dossiers `2f7e835148b3e6ab6bce52fd259a6a8f`
  - inscriptions `80e65af45da04c46745c23202f612557`
  - notes `a8c674ed3164668b26dec0b7ee2476ea`
  - états Qualiopi `9342c93d41d1c9db16110670b18a2409`
- Aucun code d’application changé ; aucun test métier nouvellement annoncé. Journal de compilation : OK.

## Suites possibles, sans activation

1. Retransmettre l’original PDF 12 pour contrôle et pièce jointe réelle.
2. Documenter les premières absences, appels et résultats réellement constatés, pas reconstituer J1/J2/J3 à partir de dates techniques.
3. Préparer le volet prévention/signalement/traitement violences, harcèlement et discriminations du 12.
4. Confirmer périmètre OF/CFA/alternance et certifications actuelles, puis décider manuellement des états 13–16.
5. Autoriser séparément la correction des intitulés RNQ affichés et la revue des anciennes affirmations des mails.

Les demandes antérieures 6/7 restent bloquées par les originaux manquants ; 8 conserve ses 93 dépôts documentés sans décision historique inventée. Aucune intervention sur ces données durant cet audit.