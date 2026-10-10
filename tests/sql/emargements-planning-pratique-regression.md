# Test de non-régression — émargements Planning pratique

Exécution : bloc DO PL/pgSQL qui crée un stagiaire fictif (nom ZZTEST_FICTIF, dates 2099),
un planning fictif, des réservations fictives, puis termine par RAISE EXCEPTION
'RESULTATS_ROLLBACK: ...' : toute la transaction est annulée (aucune écriture conservée).

Cas couverts : T1 inscription journée (matin + après-midi) ; T2 aucun doublon après
3 rafraîchissements ; T3 feuille signée conservée ; T4 changement de date (nouvelle date
créée, ancienne conservée) ; T5 demi-journée matin ; T6 changement de créneau (apresmidi) ;
T7 date absente du planning = aucune feuille ; T8 retrait d'un jour du planning = rien
supprimé ; T9 ajout d'un jour au planning = feuilles créées ; T10 signatures réelles inchangées.

Contrôle avant/après obligatoire : nombre de signatures + empreinte md5(id||md5(signature)).
Résultat 2026-10-10 07:59 UTC : 10/10 PASS, 2399 signatures, empreinte
c631f029d77f91c265126a6d6526b350 identique avant/après, 0 ligne fictive restante.
