import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ÉTAPE 1 du noyau sécurisé : structures vides créées en parallèle de l'existant.
 * Ces tests vérifient que les garanties critiques sont bien posées EN BASE
 * (et pas seulement dans le frontend). Ils ne touchent aucune donnée réelle.
 */
const sql = readFileSync(
  resolve(__dirname, '../../drizzle/migrations/0044_secure_core_step1_empty_structures.sql'),
  'utf8',
);

describe('Noyau sécurisé — étape 1 (structures vides)', () => {
  it('crée les 7 structures du nouveau noyau', () => {
    for (const table of [
      'public.exam_content_versions',
      'public.exam_content_shares',
      'public.exam_attempts_v2',
      'public.answer_state',
      'public.answer_events',
      'public.qrc_instances_v2',
      'public.audit_journal',
    ]) {
      expect(sql).toContain(`CREATE TABLE ${table}`);
    }
  });

  it('garantit une seule version ACTIVE par examen', () => {
    expect(sql).toContain('exam_content_versions_one_active');
    expect(sql).toContain("WHERE statut = 'publiee' AND retired_at IS NULL");
  });

  it('rend une version publiée immuable côté serveur', () => {
    expect(sql).toContain('enforce_exam_version_immutability');
    expect(sql).toContain('EXAM_VERSION_IMMUTABLE');
    expect(sql).toContain('trg_exam_version_immutability');
  });

  it('rend une tentative commencée immuable (snapshot + version figés)', () => {
    expect(sql).toContain('enforce_attempt_v2_immutability');
    expect(sql).toContain('ATTEMPT_IMMUTABLE');
    expect(sql).toMatch(/NEW\.snapshot IS DISTINCT FROM OLD\.snapshot/);
  });

  it('interdit qu’une révision obsolète écrase une réponse plus récente', () => {
    expect(sql).toContain('enforce_answer_revision');
    expect(sql).toContain('ANSWER_STALE_REVISION');
    expect(sql).toContain('NEW.revision <= OLD.revision');
  });

  it('impose une seule réponse courante par tentative + question', () => {
    expect(sql).toContain('answer_state_unique_courant UNIQUE (attempt_id, question_id)');
  });

  it('conserve toutes les valeurs successives d’une réponse', () => {
    expect(sql).toContain('log_answer_event');
    expect(sql).toContain('valeur_precedente');
    expect(sql).toContain('trg_answer_state_journal');
  });

  it('interdit la suppression ou la modification des journaux', () => {
    expect(sql).toContain('forbid_mutation_append_only');
    expect(sql).toContain('trg_answer_events_append_only');
    expect(sql).toContain('trg_audit_journal_append_only');
  });

  it('interdit la suppression d’une réponse ou d’une QRC', () => {
    expect(sql).toContain('forbid_answer_state_delete');
    expect(sql).toContain('QRC_DELETE_FORBIDDEN');
  });

  it('donne une identité définitive aux QRC et rend la correction finale', () => {
    expect(sql).toContain('qrc_instances_v2_unique UNIQUE (attempt_id, question_id)');
    expect(sql).toContain('QRC_CORRECTION_FINALE');
  });

  it('exige un partage déclaré explicitement (aucune propagation automatique)', () => {
    expect(sql).toContain('exam_content_shares_unique');
    expect(sql).toContain('Admin declare un partage');
  });

  it('active RLS et les GRANT sur chaque nouvelle table', () => {
    for (const table of [
      'public.exam_content_versions',
      'public.exam_content_shares',
      'public.exam_attempts_v2',
      'public.answer_state',
      'public.answer_events',
      'public.qrc_instances_v2',
      'public.audit_journal',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`GRANT ALL ON ${table} TO service_role`);
    }
  });

  it('ne touche à aucune donnée existante', () => {
    expect(sql).not.toMatch(/\bDROP TABLE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bUPDATE public\./i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
    expect(sql).not.toMatch(/INSERT INTO public\.(module_editor_state|reponses_apprenants|apprenant_quiz_results|qrc_instances)\b/i);
  });
});
