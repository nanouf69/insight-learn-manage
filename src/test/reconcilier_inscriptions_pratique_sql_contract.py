"""Réconciliation planning → sessions sur PostgreSQL jetable, données fictives seulement."""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

AS = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups']
PORT = '55531'
A = '11111111-1111-1111-1111-111111111111'
B = '22222222-2222-2222-2222-222222222222'
M = '33333333-3333-3333-3333-333333333333'
G = '44444444-4444-4444-4444-444444444444'
V = '55555555-5555-5555-5555-555555555555'
T = '66666666-6666-6666-6666-666666666666'
X = '77777777-7777-7777-7777-777777777777'


class ReconciliationPratique(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.mkdtemp(prefix='reconciliation-pratique-', dir='/tmp')
        os.chown(cls.directory, 1000, 1000)
        cls.env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        subprocess.run(AS + ['initdb', '-D', cls.directory + '/db', '-U', 'postgres', '-A', 'trust', '--no-locale'], env=cls.env, check=True, capture_output=True)
        subprocess.run(AS + ['pg_ctl', '-D', cls.directory + '/db', '-l', cls.directory + '/log', '-o', f'-k {cls.directory} -p {PORT} -h ""', '-w', 'start'], env=cls.env, check=True, capture_output=True)
        cls.addClassCleanup(cls.cleanup)
        cls.sql(f"""
          CREATE SCHEMA auth;
          CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
          CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$;
          CREATE FUNCTION public.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
          CREATE PUBLICATION supabase_realtime;
          CREATE TABLE public.apprenants(id uuid PRIMARY KEY, deleted_at timestamptz);
          CREATE TABLE public.reservations_pratique(apprenant_id uuid, date_choisie date, type_formation text, creneau text);
          CREATE TABLE public.planning_pratique_config(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
          CREATE TABLE public.sessions(id uuid PRIMARY KEY, date_debut date, type_session text, statut text, created_at timestamptz DEFAULT now(), heure_debut text, heure_fin text);
          CREATE TABLE public.session_apprenants(
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, apprenant_id uuid,
            montant_total numeric, montant_paye numeric, mode_financement text,
            heure_debut_personnalisee text, heure_fin_personnalisee text,
            UNIQUE(session_id, apprenant_id)
          );
          CREATE FUNCTION public.pratique_creneaux_planifies(p_date date, p_creneau text)
          RETURNS TABLE(creneau text, debut time, fin time) LANGUAGE sql AS $$
            SELECT 'matin', TIME '09:00', TIME '12:00'
            UNION ALL SELECT 'apres_midi', TIME '13:00', TIME '16:00'
          $$;
          INSERT INTO public.apprenants VALUES ('{A}', NULL), ('{B}', NULL), ('{M}', NULL);
          INSERT INTO public.reservations_pratique VALUES
            ('{A}', DATE '2026-11-25', 'vtc', 'journee'),
            ('{B}', DATE '2026-11-25', 'taxi', 'journee');
          INSERT INTO public.sessions(id, date_debut, type_session, statut, heure_debut, heure_fin) VALUES
            ('{G}', DATE '2026-11-25', 'pratique', 'planifiee', '08:00', '15:00'),
            ('{V}', DATE '2026-11-25', 'pratique_vtc', 'planifiee', '08:00', '15:00'),
            ('{T}', DATE '2026-11-25', 'pratique_taxi', 'planifiee', '08:00', '15:00'),
            ('{X}', DATE '2026-11-25', 'pratique', 'annulee', '08:00', '15:00');
          INSERT INTO public.session_apprenants(session_id, apprenant_id) VALUES
            ('{V}', '{A}'), ('{G}', '{M}');
        """)
        cls.sql(Path('drizzle/migrations/0284_reconcilier_inscriptions_pratique_toutes_sessions.sql').read_text())

    @classmethod
    def cleanup(cls):
        if hasattr(cls, 'directory'):
            subprocess.run(AS + ['pg_ctl', '-D', cls.directory + '/db', '-m', 'immediate', 'stop'], env=cls.env, capture_output=True)
            shutil.rmtree(cls.directory, ignore_errors=True)

    @classmethod
    def sql(cls, query):
        result = subprocess.run(['psql', '-X', '-At', '-h', cls.directory, '-p', PORT, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', query], env=cls.env, text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stderr)
        return result.stdout.strip()

    def test_ajoute_chaque_session_compatible_sans_retrait(self):
        self.assertEqual(self.sql("SELECT count(*) FROM public.reconcilier_inscriptions_pratique(DATE '2026-11-25')"), '3')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{G}' AND apprenant_id IN ('{A}','{B}')"), '2')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{V}' AND apprenant_id='{A}'"), '1')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{T}' AND apprenant_id='{B}'"), '1')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{V}' AND apprenant_id='{B}'"), '0')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{T}' AND apprenant_id='{A}'"), '0')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{G}' AND apprenant_id='{M}'"), '1', 'inscription manuelle conservée')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.session_apprenants WHERE session_id='{X}'"), '0', 'session annulée ignorée')
        self.assertEqual(self.sql(f"SELECT count(*) FROM public.sessions WHERE id IN ('{G}','{V}','{T}') AND heure_debut='09:00' AND heure_fin='16:00'"), '3')

    def test_rejoue_sans_doublon(self):
        self.sql("SELECT * FROM public.reconcilier_inscriptions_pratique(DATE '2026-11-25')")
        before = self.sql("SELECT md5(string_agg(session_id::text || apprenant_id::text, ',' ORDER BY session_id::text, apprenant_id::text)) FROM public.session_apprenants")
        self.assertEqual(self.sql("SELECT count(*) FROM public.reconcilier_inscriptions_pratique(DATE '2026-11-25')"), '0')
        after = self.sql("SELECT md5(string_agg(session_id::text || apprenant_id::text, ',' ORDER BY session_id::text, apprenant_id::text)) FROM public.session_apprenants")
        self.assertEqual(after, before)


if __name__ == '__main__':
    unittest.main()
