"""Restauration d'un export nocturne FICTIF sur PostgreSQL JETABLE (scripts/restauration_jetable.py).
Aucune donnée ni connexion réelle. Usage : python3 src/test/restauration_jetable_contract.py
"""
import json, os, pathlib, shutil, subprocess, sys, tempfile, unittest, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import restauration_jetable as R  # noqa: E402

SCHEMA = """
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
CREATE TABLE public.apprenants (id uuid PRIMARY KEY, nom text);
CREATE TABLE public.reponses_apprenants (id uuid PRIMARY KEY, apprenant_id uuid REFERENCES public.apprenants(id), exercice_id text, reponses jsonb DEFAULT '{}', reponses_meta jsonb DEFAULT '{}', originaux_exacts jsonb NOT NULL DEFAULT '{}');
"""


class Pg:
    def __init__(self, port):
        self.port = port
        self.dir = tempfile.mkdtemp(prefix='pg-rest-', dir='/tmp')
        self.user = [] if os.geteuid() else ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
        if self.user: os.chown(self.dir, 1000, 1000)
        subprocess.run(self.user + ['initdb', '-D', self.dir + '/d', '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], check=True, capture_output=True)
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-o', f"-k {self.dir} -p {port} -h ''", '-w', 'start', '-l', self.dir + '/log'], check=True, capture_output=True)
        self.cible = {'hote': self.dir, 'port': port}

    def stop(self):
        subprocess.run(self.user + ['pg_ctl', '-D', self.dir + '/d', '-m', 'immediate', 'stop'], capture_output=True)


def export_fictif(base, a_rows, r_rows, comptes=None, parts_r=2):
    d = pathlib.Path(tempfile.mkdtemp(prefix='export-fictif-', dir='/tmp')) / '2026-11-07'
    (d / 'apprenants').mkdir(parents=True); (d / 'reponses_apprenants').mkdir()
    (d / 'apprenants' / 'part-00000000.json').write_text(json.dumps(a_rows))
    taille = max(1, (len(r_rows) + parts_r - 1) // parts_r)
    for i in range(0, len(r_rows), taille):
        (d / 'reponses_apprenants' / f'part-{i:08d}.json').write_text(json.dumps(r_rows[i:i + taille]))
    man = {'jour': '2026-11-07', 'table_names': ['apprenants', 'reponses_apprenants'], 'erreurs': [],
           'comptes': comptes or {'apprenants': len(a_rows), 'reponses_apprenants': len(r_rows)},
           'export_termine': True, 'integrite': 'non_verifiee', 'restauration': 'non_prouvee', 'instantane_coherent': False}
    (d / '_export_termine.json').write_text(json.dumps(man))
    return d


class Restauration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = Pg(55481)

    @classmethod
    def tearDownClass(cls):
        cls.pg.stop()

    def donnees(self):
        a = [{'id': str(uuid.uuid4()), 'nom': f'Élève fictif {i}'} for i in range(3)]
        marq = {'v': 'nul-b64-v1', 'b64': 'ImFcdTAwMDBiIg==', 'projection': 'ab', 'seq': 1}
        r = [{'id': str(uuid.uuid4()), 'apprenant_id': a[i % 3]['id'], 'exercice_id': f'EB1__{i}', 'reponses': {'1': 'ab' if i == 0 else f'r{i} ␀'},
              'reponses_meta': {'1': {'seq': 1}}, 'originaux_exacts': {'1': marq} if i == 0 else {}} for i in range(7)]
        return a, r

    def test_restauration_prouvee_puis_defauts_detectes(self):
        a, r = self.donnees()
        rep = R.restaurer(export_fictif(None, a, r), SCHEMA, self.pg.cible)
        self.assertTrue(rep['ok'], rep)
        self.assertEqual(rep['restauration'], 'prouvee_sur_base_jetable')
        self.assertFalse(rep['instantane_coherent'])  # jamais déduit d'un export paginé
        self.assertEqual(rep['tables']['reponses_apprenants']['lignes_restaurees'], 7)
        self.assertEqual(rep['originaux_non_coherents'], 0)

        # Paquet manquant (export troué) : refus.
        d = export_fictif(None, a, r)
        sorted((d / 'reponses_apprenants').glob('part-*.json'))[-1].unlink()
        rep = R.restaurer(d, SCHEMA, self.pg.cible)
        self.assertFalse(rep['ok']); self.assertTrue(any('≠' in e for e in rep['erreurs']))

        # Même clé dans deux paquets (doublon) : refus.
        rep = R.restaurer(export_fictif(None, a, r + [dict(r[0])], comptes={'apprenants': 3, 'reponses_apprenants': 8}), SCHEMA, self.pg.cible)
        self.assertFalse(rep['ok'])

        # Fichier tronqué : refus.
        d = export_fictif(None, a, r)
        p = sorted((d / 'reponses_apprenants').glob('part-*.json'))[0]; p.write_text(p.read_text()[:-5])
        self.assertFalse(R.restaurer(d, SCHEMA, self.pg.cible)['ok'])

        # Référence orpheline (parent absent) : refus par la contrainte restaurée.
        self.assertFalse(R.restaurer(export_fictif(None, a[:1], r), SCHEMA, self.pg.cible)['ok'])

        # Marqueur d'original périmé : signalé.
        r2 = [dict(x) for x in r]; r2[0] = dict(r2[0], reponses={'1': 'autre'})
        rep = R.restaurer(export_fictif(None, a, r2), SCHEMA, self.pg.cible)
        self.assertEqual(rep['originaux_non_coherents'], 1)

        # Manifeste sans tables : refus, jamais une réussite vide.
        d = export_fictif(None, a, r)
        man = json.loads((d / '_export_termine.json').read_text()); del man['table_names']
        (d / '_export_termine.json').write_text(json.dumps(man))
        self.assertFalse(R.restaurer(d, SCHEMA, self.pg.cible)['ok'])

        # Export non terminé : rien certifié.
        d = export_fictif(None, a, r); (d / '_export_termine.json').unlink()
        self.assertFalse(R.restaurer(d, SCHEMA, self.pg.cible)['ok'])

        # Cible distante refusée (la production ne peut pas être visée).
        with self.assertRaises(SystemExit):
            R.restaurer(export_fictif(None, a, r), SCHEMA, {'hote': 'db.exemple.invalid', 'port': 5432})


if __name__ == '__main__':
    unittest.main()
