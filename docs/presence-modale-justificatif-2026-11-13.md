# Modale présence — simplification préparée, non publiée

Champ session/inscription retiré. Lecture interne du dossier authentifié et des inscriptions, comparaison exacte date/créneau/début/durée avec le planning partagé ; une seule inscription requise, sinon message et refus. C'est un précontrôle de lecture, pas une autorisation serveur de validation. La pratique sans rattachement exact reste explicitement bloquée.

Menu formateurs : noms/IDs uniquement, pagination, rôle admin vérifié, priorité aux formateurs liés dans session_formateurs si présents, Autre avec nom local sans création de compte. Le catalogue ne possède pas de champ actif : ce statut ne peut pas être garanti et n'est pas inventé. Aucun premier formateur arbitrairement choisi ; présélection si un seul correspond.

Menu justificatifs exact : feuille d'émargement, attestation de fin de formation, autre avec libellé. L'attestation seule ne prouve pas le créneau. PDF facultatif dans l'aperçu : limite 4 Mo, extension/MIME/en-tête %PDF-/fin %%EOF, aucun dépôt réseau. Ce contrôle local n'est ni une analyse complète du PDF ni une validation serveur. Le fichier reste local, n'est pas ajouté au dossier, ne reçoit aucun lien public et ne remplace aucun original.

Activation du dépôt bloquée : stockage privé admin, validation PDF serveur (analyse complète), référence immuable dans journal/validation avec idempotence et accès signé admin restent à installer et tester avec restauration. Aucune création de bucket ni écriture sur stockage/base réelle. Les règles financeur spécifiques ne sont pas confirmées ; aucun justificatif facultatif généralisé en production.

Confirmation de présence et date réelle restent intactes ; aucune signature créée, aucun horodatage client envoyé, aucune publication. Les protections et transport réel restent déconnectés comme avant.