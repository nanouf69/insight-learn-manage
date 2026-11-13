# Point de restauration avant installation présence — 13/11/2026 16:05 UTC (lecture seule)

Aucune installation effectuée. Relevé pris sur la base réelle (la seule disponible : un brouillon créé à 16:03 UTC partage lui aussi la base réelle).

- `presentiel_heures_validees` : 3 lignes, empreinte md5 `c751e2867a7c224c78a2901945e7cd62`.
- CHERNI : `69de7ba5…` 1,5 h théorie 17/09 ; `a1a3de55…` 4 h théorie 18/09 (créées le 13/11 13:52/13:53 UTC).
- Droits actuels de cette table : lecture et ajout admin uniquement ; aucune modification ni suppression possible par l'application.
- Objets à installer absents : `presentiel_validation_decisions`, `presentiel_presence_pdf`, `presentiel_presence_creneaux`, dossier privé `presentiel-justificatifs`.
- `releve_sources_apprenant(uuid)` : md5 `23509f3cb8c55b13f13b16bf488483cb`, définition exacte dans `releve_sources_apprenant.avant.sql` (seule fonction existante que le lot modifierait).

Retour arrière du lot : `retour-arriere.sql` (rétablit la fonction à l'identique ; les nouveaux journaux ne sont pas supprimés, ils sont seulement retirés du circuit, conformément à la règle zéro destruction).
