#!/usr/bin/env bash
# Contrat jetable : une seule finalisation de révision par propriétaire/examen/brouillon,
# même avec deux appareils simultanés. Aucune connexion à la production.
set -euo pipefail
D=$(mktemp -d /tmp/pgrev.XXXX); P=55437; chown 1000:1000 "$D"
U=(setpriv --reuid=1000 --regid=1000 --clear-groups)
"${U[@]}" initdb -D "$D/db" -A trust --no-locale -U postgres >/dev/null; "${U[@]}" pg_ctl -D "$D/db" -o "-p $P -k $D -h ''" -l "$D/log" -w start >/dev/null
trap '"${U[@]}" pg_ctl -D "$D/db" stop -m immediate >/dev/null; rm -rf "$D"' EXIT
Q() { psql -h "$D" -p $P -U postgres -v ON_ERROR_STOP=1 -qtAc "$1"; }
Q "create table public.apprenant_quiz_results(id uuid primary key default gen_random_uuid(), apprenant_id uuid, quiz_id text, quiz_type text, matiere_id text, tentative int, score_obtenu int, details jsonb);"
# Historique : anciens résultats sans lien (dont doublons) doivent rester acceptés et intacts.
Q "insert into apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,details) select '00000000-0000-0000-0000-000000000001','EB2','revision_fausses','{}' from generate_series(1,3);"
Q "$(sed -n '/-- MIGRATION START/,/-- MIGRATION END/p' "$0" | sed '1d;$d' | sed 's/^# //')"
# -- MIGRATION START
# CREATE UNIQUE INDEX IF NOT EXISTS uniq_aqr_revision_fausses_finalisation ON public.apprenant_quiz_results (apprenant_id, quiz_id, ((details->>'revision_exercice_id'))) WHERE quiz_type = 'revision_fausses' AND details ? 'revision_exercice_id';
# -- MIGRATION END
ins="insert into apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,score_obtenu,details) values ('00000000-0000-0000-0000-000000000002','EB1','revision_fausses',48,'{\"revision_exercice_id\":\"rev_EB1_r1\"}')"
fail=0
# Deux appareils : A garde son insertion ouverte, B tente la même finalisation.
( psql -h "$D" -p $P -U postgres -qtAc "begin; $ins; select pg_sleep(1.5); commit;" ) & A=$!
sleep 0.5
if psql -h "$D" -p $P -U postgres -qtAc "$ins" 2>"$D/b.err"; then echo "FAIL: second appareil inséré"; fail=1; elif grep -q "duplicate key" "$D/b.err"; then echo "PASS: second appareil refusé (doublon)"; else echo "FAIL: erreur inattendue"; cat "$D/b.err"; fail=1; fi
wait $A
n=$(Q "select count(*) from apprenant_quiz_results where details->>'revision_exercice_id'='rev_EB1_r1'"); [ "$n" = 1 ] && echo "PASS: un seul résultat" || { echo "FAIL: $n résultats"; fail=1; }
# Rejeu après accusé perdu : refusé, ligne existante inchangée.
Q "$ins" 2>/dev/null && { echo "FAIL: rejeu inséré"; fail=1; } || echo "PASS: rejeu refusé"
s=$(Q "select score_obtenu from apprenant_quiz_results where details->>'revision_exercice_id'='rev_EB1_r1'"); [ "$s" = 48 ] && echo "PASS: résultat inchangé" || { echo FAIL; fail=1; }
# Autre brouillon, autre examen, autre élève : acceptés.
Q "insert into apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,details) values ('00000000-0000-0000-0000-000000000002','EB1','revision_fausses','{\"revision_exercice_id\":\"rev_EB1_r2\"}'),('00000000-0000-0000-0000-000000000002','EB2','revision_fausses','{\"revision_exercice_id\":\"rev_EB1_r1\"}'),('00000000-0000-0000-0000-000000000003','EB1','revision_fausses','{\"revision_exercice_id\":\"rev_EB1_r1\"}')" && echo "PASS: identités voisines acceptées"
# Examens blancs et anciens résultats sans lien non concernés.
Q "insert into apprenant_quiz_results(apprenant_id,quiz_id,quiz_type,details) values ('00000000-0000-0000-0000-000000000001','EB2','revision_fausses','{}'),('00000000-0000-0000-0000-000000000002','EB1','examen_blanc','{\"revision_exercice_id\":\"rev_EB1_r1\"}')" && echo "PASS: anciens formats et autres quiz non bloqués"
h=$(Q "select count(*) from apprenant_quiz_results where details='{}'"); [ "$h" = 4 ] && echo "PASS: historique sans lien intact" || { echo FAIL; fail=1; }
# Rollback : suppression de l'index seule, données identiques.
before=$(Q "select md5(string_agg(id::text||details::text, ',' order by id)) from apprenant_quiz_results")
Q "drop index uniq_aqr_revision_fausses_finalisation"
after=$(Q "select md5(string_agg(id::text||details::text, ',' order by id)) from apprenant_quiz_results")
[ "$before" = "$after" ] && echo "PASS: rollback sans changement de données" || { echo FAIL; fail=1; }
exit $fail
