# Durées affichées des devis e-learning — 17 octobre 2026

## Périmètre appliqué
- VTC 66 heures, TAXI 96 heures, TA VTC→TAXI 36 heures, pratique comprise sans ajout.
- Source unique : `src/lib/devisDureesElearning.ts`, utilisée par `DevisSection.tsx` et `DevisPersonnel.tsx`.
- Trois modèles Word : `Devis_VTC_elearning.docx`, `Devis_TAXI_elearning_avec_examen.docx`, `Devis_Ta_elearning.docx`.
- Aperçu, contenu futur des emails et paramètre durée du générateur PDF canonique harmonisés. Générateur canonique inchangé.
- Nouveaux devis CRM : durée exacte enregistrée dans le libellé formation ; `DevisPublic.tsx` reprend seulement cette durée enregistrée, anciens libellés et liens non réinterprétés.
- `AGENTS.md` et tests ciblés ajoutés ; aucun contrat ni contenu pédagogique modifié.

## Blocage VA
`src/lib/pdf/programme-formation.ts:349–375` définit le programme passerelle TAXI→VTC avec « 7 heures. », sans prouver un total présentiel incluant la pratique. `elearningRequiredHours.ts` indique aussi 7 h e-learning, tandis que `jalonsPonderes.ts` alloue un budget CPF distinct de 36 h. Aucun de ces chiffres ne prouve le total présentiel demandé. VA laissé intégralement inchangé, valeur totale à confirmer par le centre.

## Preuves
- 16/16 tests exécutés PASS : durées VTC/TAXI/TA, VA non inventée, sens des passerelles, pratique sans double comptage, Word généré et PDF avec valeurs concrètes, nouveaux libellés vs historiques, dates et choix pratiques.
- Comparaison binaire ZIP des 12 DOCX : neuf inchangés, trois avec uniquement `word/document.xml` modifié ; comparaison exacte prouve une seule substitution durée par modèle, tous autres octets XML et parties ZIP conservés.
- Extraction/édition/repack avec validation DOCX PASS ; intégration finale minimale depuis les originaux pour éviter les normalisations XML du repack.
- PDF canoniques fictifs : 12 pages inspectées visuellement, aucune nouvelle superposition/coupure détectée. Trois premières pages Word converties inspectées : durées lisibles, tableaux conservés. Le libellé préexistant URL plateforme reste réparti sur plusieurs lignes.
- Navigateur sur ordinateur 1280×1800 et mobile 390×844 : trois nouvelles durées visibles dans signature et catalogue ; ancien devis VTC sans durée reste inchangé ; VA garde ancien affichage ; aucune erreur JavaScript. Toutes requêtes de service interceptées, aucune soumission/envoi réel.
- Compilation automatique : `build OK` à 11:07:36 UTC.

## Limites
- Total présentiel VA NON PROUVÉ, correction VA bloquée sur source fiable/confirmation centre.
- Affichage mobile du tableau de signature préexistant déborde horizontalement ; aucune refonte hors périmètre.
- Aperçu CRM et envoi/signature réels NON PROUVÉS ; aucun envoi email/SMS, aucune publication, aucun dossier/document déjà envoyé/signé modifié.