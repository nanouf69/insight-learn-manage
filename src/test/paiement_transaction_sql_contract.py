"""Identité stable des virements — PostgreSQL JETABLE uniquement."""
import os, pathlib, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = (ROOT / 'drizzle/migrations/0247_paiement_identite_virement.sql').read_text()
SCHEMA = """
CREATE TABLE public.apprenants(id uuid PRIMARY KEY);
CREATE TABLE public.transactions_bancaires(id uuid PRIMARY KEY, montant numeric NOT NULL, date_operation date);
CREATE TABLE public.apprenant_paiements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apprenant_id uuid NOT NULL REFERENCES public.apprenants(id),
 montant numeric NOT NULL DEFAULT 0, moyen_paiement text, date_paiement date, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.apprenants VALUES
 ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
INSERT INTO public.transactions_bancaires VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',50,'2026-09-20'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',50,'2026-09-20');
"""

class Contrat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp(prefix='pg-paiement-', dir='/tmp')
        cls.user = [] if os.geteuid() else ['setpriv','--reuid=1000','--regid=1000','--clear-groups']
        if cls.user: os.chown(cls.dir,1000,1000)
        cls.env = {k:v for k,v in os.environ.items() if not k.startswith('PG')}
        subprocess.run(cls.user+['initdb','-D',cls.dir+'/db','-U','postgres','-A','trust','--no-locale'],check=True,capture_output=True,env=cls.env)
        subprocess.run(cls.user+['pg_ctl','-D',cls.dir+'/db','-o',f"-k {cls.dir} -p 55483 -h ''",'-w','start','-l',cls.dir+'/log'],check=True,capture_output=True,env=cls.env)
        cls.sql(SCHEMA+MIGRATION)

    @classmethod
    def tearDownClass(cls):
        subprocess.run(cls.user+['pg_ctl','-D',cls.dir+'/db','-m','immediate','stop'],capture_output=True,env=cls.env)

    @classmethod
    def sql(cls, query, check=True):
        return subprocess.run(['psql','-X','-At','-h',cls.dir,'-p','55483','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True,check=check,env=cls.env)

    def test_identites_uniques_et_virements_egaux_distincts(self):
        a='11111111-1111-1111-1111-111111111111'; b='22222222-2222-2222-2222-222222222222'
        ta='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; tb='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
        self.sql(f"INSERT INTO public.apprenant_paiements(apprenant_id,montant,date_paiement,transaction_bancaire_id) VALUES ('{a}',50,'2026-09-22','{ta}'),('{a}',50,'2026-09-20','{tb}')")
        self.assertEqual(self.sql(f"SELECT sum(montant) FROM public.apprenant_paiements WHERE apprenant_id='{a}'").stdout.strip(),'100')
        for apprenant in (a,b):
            result=self.sql(f"INSERT INTO public.apprenant_paiements(apprenant_id,montant,transaction_bancaire_id) VALUES ('{apprenant}',50,'{ta}')",check=False)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('apprenant_paiements_transaction_bancaire_unique',result.stderr)
        self.sql(f"INSERT INTO public.apprenant_paiements(apprenant_id,montant,date_paiement) VALUES ('{b}',50,'2026-09-20'),('{b}',50,'2026-09-20')")
        self.assertEqual(self.sql('SELECT count(*) FROM public.apprenant_paiements').stdout.strip(),'4')

if __name__ == '__main__':
    unittest.main(verbosity=2)
