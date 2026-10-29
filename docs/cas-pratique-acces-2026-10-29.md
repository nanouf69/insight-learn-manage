# Accès Cas pratique TAXI — 29 octobre 2026

## Accord et diagnostic
Accord utilisateur : « Oui, les 12 dossiers ». Catalogue module 12 correct ; création TAXI/TA et modification TA omettaient ce module dans leurs listes locales. Les listes explicites excluaient donc son affichage.

## Réparation enregistrée
Ajout seul de 12 en fin des listes existantes, avec contrôle d’égalité des listes attendues et vérification des douze comptes existants. Douze événements `restaurer_acces_cas_pratique_taxi` dans audit_journal conservent avant/après. Aucun déclenchement de création d’accès : tous ont déjà un compte.

| Dossier | Parcours | Module 12 après |
|---|---|---|
| Abdelhammid BELARBI | TA e-learning | Attribué |
| Mohktar BEN ALI | TA | Attribué |
| Rachida CHALA | TA | Attribué |
| Ilyes Dakhlaoui | TA | Attribué |
| Mohamed HAMDI | TAXI | Attribué |
| Farid MEDANE | TAXI e-learning | Attribué |
| Ilies MEMDOUH | TAXI | Attribué |
| Mouadh Naimi | TAXI e-learning | Attribué |
| Harutyun Pndukyan | TA | Attribué, date d’accès inchangée/expirée |
| CIHAN RAYMAN | TA | Attribué |
| Rachid SALEM | TA e-learning | Attribué, abandon conservé |
| Pogos SARKISIAN | TAXI | Attribué |

## Preuves et limites
- PASS : douze listes relues contiennent le seul ajout 12 ; dossiers hors modules/updated_at, réponses, validations et gels ont exactement leurs empreintes avant intervention. Aucun module 12 faussement validé.
- PASS : 39 tests exécutés, six variantes TAXI/TA dans les deux formulaires, exclusion VTC/VA, pratique seule toujours [6], source candidat commune.
- PASS : aperçu Admin fictif, ouverture Cas pratique, 11 quiz et 62 questions, aucune erreur JavaScript. Compilation automatique OK 09:16:07 UTC.
- NON PROUVÉ : connexion élève autonome ; parcours complet des douze utilisateurs. Aucun test d’écriture sur compte réel.
- Les affectations sont déjà enregistrées sur le service partagé production/aperçu. Les formulaires corrigés ne sont pas publiés.
- Les réponses, scores, heures et jalons historiques ne sont pas modifiés. Les compteurs live peuvent désormais inclure ce module rétabli selon les règles existantes ; aucun gel ni validation artificielle.
- Aucun abandon ni délai d’accès n’est modifié, aucun mail/SMS/IA et aucune publication globale.