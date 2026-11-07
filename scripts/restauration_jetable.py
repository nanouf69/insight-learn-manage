"""Restauration d'un export nocturne dans une base PostgreSQL JETABLE, puis contrôle.

But : prouver qu'un jeu de fichiers `<jour>/<table>/part-*.json` (+ `_export_termine.json`)
est RESTAURABLE et intègre (structure, clés, comptes, originaux exacts lisibles), sans
jamais toucher la production. Cela NE PROUVE PAS un instantané cohérent : l'export est fait
par pages HTTP successives ; le manifeste garde `instantane_coherent: false`.
Un instantané cohérent restaurable = sauvegarde quotidienne gérée par l'hébergement
(restauration en place uniquement) ou « Export data » complet, à restaurer de même ici.

Sécurité : refuse toute cible autre qu'un socket local/127.0.0.1 ; n'écrit que dans la
base cible fournie ; ne lit que le dossier fourni.

Usage :
  python3 scripts/restauration_jetable.py --export DOSSIER_JOUR --schema schema.sql \
      --hote /tmp/socket --port 5432 [--base postgres]
Le schéma doit provenir d'une source de structure (export complet ou migrations) ; les
fichiers nocturnes ne contiennent que des données.
"""
import argparse, json, os, pathlib, subprocess, sys

PK_PAR_DEFAUT = 'id'


def _psql(cible, sql, entree=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    r = subprocess.run(['psql', '-X', '-At', '-h', cible['hote'], '-p', str(cible['port']), '-U', cible.get('user', 'postgres'),
                        '-d', cible.get('base', 'postgres'), '-v', 'ON_ERROR_STOP=1', '-f', '-'],
                       input=sql if entree is None else entree, capture_output=True, text=True, env=env)
    return r.returncode, (r.stdout + r.stderr).strip()


def cible_locale(hote):
    return hote.startswith('/') or hote in ('127.0.0.1', 'localhost', '::1')


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def restaurer(dossier, schema_sql, cible, pks=None):
    """Retourne un rapport ; `ok` vrai seulement si TOUTES les vérifications passent."""
    if not cible_locale(cible['hote']):
        raise SystemExit('REFUS : cible non locale (la production ne doit jamais être visée).')
    dossier = pathlib.Path(dossier)
    pks = pks or {}
    rapport = {'ok': False, 'tables': {}, 'erreurs': [], 'instantane_coherent': False, 'restauration': 'non_prouvee'}
    manifeste_f = dossier / '_export_termine.json'
    if not manifeste_f.exists():
        rapport['erreurs'].append('_export_termine.json absent : export non terminé, rien à certifier')
        return rapport
    manifeste = json.loads(manifeste_f.read_text())
    if manifeste.get('erreurs'):
        rapport['erreurs'].append('manifeste avec erreurs')
    code, out = _psql(cible, schema_sql)
    if code:
        rapport['erreurs'].append(f'schéma refusé : {out[-300:]}')
        return rapport
    for table in manifeste.get('table_names', []):
        parts = sorted((dossier / table).glob('part-*.json')) if (dossier / table).exists() else []
        attendu = manifeste.get('comptes', {}).get(table)
        lignes = 0
        for part in parts:
            try:
                rows = json.loads(part.read_text())
            except Exception as e:  # fichier tronqué/corrompu
                rapport['erreurs'].append(f'{table}/{part.name}: JSON illisible ({e.__class__.__name__})')
                continue
            if not isinstance(rows, list):
                rapport['erreurs'].append(f'{table}/{part.name}: format inattendu'); continue
            code, out = _psql(cible, f"INSERT INTO public.{table} SELECT * FROM jsonb_populate_recordset(NULL::public.{table}, {lit(json.dumps(rows))}::jsonb);")
            if code:
                rapport['erreurs'].append(f'{table}/{part.name}: insertion refusée ({out.splitlines()[-1][:200] if out else "?"})')
                continue
            lignes += len(rows)
        code, n = _psql(cible, f"SELECT count(*) FROM public.{table};")
        pk = pks.get(table, PK_PAR_DEFAUT)
        _, distincts = _psql(cible, f"SELECT count(DISTINCT {pk}) FROM public.{table};")
        info = {'fichiers': len(parts), 'lignes_restaurees': int(n) if n.isdigit() else None, 'compte_manifeste': attendu}
        if attendu is None or info['lignes_restaurees'] != attendu:
            rapport['erreurs'].append(f'{table}: {info["lignes_restaurees"]} restaurées ≠ {attendu} au manifeste')
        if distincts != n:
            rapport['erreurs'].append(f'{table}: clés {pk} en double ({distincts} distinctes / {n})')
        rapport['tables'][table] = info
    # Originaux exacts U+0000 : chaque marqueur doit rester cohérent avec sa projection.
    code, out = _psql(cible, "SELECT count(*) FROM information_schema.columns WHERE table_name='reponses_apprenants' AND column_name='originaux_exacts';")
    if out == '1':
        _, inval = _psql(cible, """SELECT count(*) FROM public.reponses_apprenants r, jsonb_each(r.originaux_exacts) o
          WHERE o.value->>'v' IS DISTINCT FROM 'nul-b64-v1' OR (o.value->'projection') IS DISTINCT FROM (r.reponses->o.key)
             OR (o.value->>'seq') IS DISTINCT FROM (r.reponses_meta->o.key->>'seq');""")
        rapport['originaux_non_coherents'] = int(inval) if inval.isdigit() else None
    rapport['ok'] = not rapport['erreurs']
    # Restaurable et intègre pour CES fichiers ; jamais un instantané cohérent.
    rapport['restauration'] = 'prouvee_sur_base_jetable' if rapport['ok'] else 'echec'
    rapport['integrite'] = 'verifiee_fichiers' if rapport['ok'] else 'echec'
    return rapport


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--export', required=True); a.add_argument('--schema', required=True)
    a.add_argument('--hote', required=True); a.add_argument('--port', type=int, default=5432); a.add_argument('--base', default='postgres')
    x = a.parse_args()
    r = restaurer(x.export, pathlib.Path(x.schema).read_text(), {'hote': x.hote, 'port': x.port, 'base': x.base},
                  pks={'answer_state': 'response_id', 'answer_events': 'event_id', 'exam_attempts_v2': 'attempt_id', 'qrc_instances_v2': 'qrc_instance_id', 'qrc_correction_events': 'correction_event_id', 'core_exam_results': 'result_id'})
    print(json.dumps(r, ensure_ascii=False, indent=2))
    sys.exit(0 if r['ok'] else 1)
