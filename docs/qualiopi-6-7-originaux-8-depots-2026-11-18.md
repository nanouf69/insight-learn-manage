# Contrôle et écritures Qualiopi — 18 novembre 2026, 17:05 UTC

## Pièces originales 6/7
- Aucun des quatre fichiers nommés par l’utilisateur retrouvé dans les fichiers du projet, les DOCX locaux inspectés ou le catalogue du stockage Cloud. Aucun planning TAXI source identifiable.
- Le montage des anciens envois utilisateur est inaccessible (délai dépassé) : absence des fichiers dans cet ancien montage NON PROUVÉE. La recherche d’historique du nom `Emploi_du_temps_VTC` retrouve uniquement cette demande, pas un fichier téléchargeable.
- 0 pièce attachée. Relecture : indicateur 6, quatre preuves et zéro fichier ; indicateur 7, une preuve et zéro fichier. Aucune simulation, copie recomposée, URL fictive ni remplacement.
- À fournir : Emploi_du_temps_VTC_journee(8).docx, Emploi_du_temps_VTC_cours_du_soir(3).docx, Emploi_du_temps_VTC_cours_du_soir(4).docx, indicateur 7.docx et le planning TAXI original s’il existe.

## Indicateur 8 : résultat effectivement enregistré et relu
- Périmètre : 234 preuves d’admission documentaire existantes, 187 dossiers ; cinq autres preuves anciennes conservées (239 au total).
- 234 preuves annotées sans suppression de leur description ni de leur JSON historique.
- 93 dates de dépôt signées documentées pour 64 apprenants. Source exacte : document dossier-bienvenue, identifiant permanent, `donnees.date_completion`, signature image présente, un document unique et date non future. Dates affichées en heure de Paris. Les dates techniques de création, modification et completion de ligne sont ignorées.
- 141 preuves sans date de dépôt vérifiable : 139 preuves / 121 apprenants sans dossier-bienvenue ; deux preuves / deux apprenants sans signature prouvée.
- Aucune clé explicite de décision/admission/acceptation trouvée dans les documents complétés. **0 date de décision attribuée** ; les 234 décisions restent historiquement non datées. Les dates de dépôt ne deviennent jamais des dates d’admission.
- Trois dépôts sont postérieurs au début de la session liée, 90 antérieurs ou du même jour : même un dépôt antérieur ne prouve pas une décision. L’annotation précise que le dépôt concerne le dossier de l’apprenant, sans preuve de rattachement à cette session.
- `date_preuve` et `decision_le` restent NULL pour les 234 admissions. Aucune réussite d’examen attribuée.
- Empreinte des 1 867 documents complétés identique avant/après : `aeb4ce2bda6c39fda4ce84bf37db8a4d`.

## Contrôles
- 17 tests SQL exécutés dans PostgreSQL jetable : douze contrôles d’admission existants et cinq contrôles du nouvel ajout documentaire (dépôt ≠ décision, signature nécessaire, absence, doublon non rapproché, réexécution sans doublon).
- Cinq tests de date de dépôt existants exécutés avec succès.
- Écriture retournée : 234 annotations / 93 dates de dépôt / 141 exceptions ; relecture indépendante conforme.
- Aucun dossier source, inscription, signature ou résultat modifié. Aucun envoi ni publication. Contrôle de l’écran Qualiopi après ces annotations NON PROUVÉ ; relecture Cloud exécutée.