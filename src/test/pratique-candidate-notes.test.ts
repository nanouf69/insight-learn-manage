// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pratiqueCandidateNameHTML, pratiqueNoteHTML } from '../lib/pratiqueCandidateNotes';

describe('Notes individuelles pratique', () => {
  it('n’ajoute rien pour une note vide', () => {
    expect(pratiqueNoteHTML('  ')).toBe('');
    expect(pratiqueCandidateNameHTML('TEST Élève')).toBe('TEST Élève');
  });
  it('échappe le texte et conserve les retours à la ligne', () => {
    expect(pratiqueNoteHTML('<script> & "\nDeuxième ligne')).toBe('<p><strong>Note :</strong> &lt;script&gt; &amp; &quot;<br>Deuxième ligne</p>');
    expect(pratiqueCandidateNameHTML('TEST <Élève>', 'Après-midi')).toBe('TEST &lt;Élève&gt; — Après-midi');
  });
  it('insère la note personnelle dans les sept envois pratique et les deux aperçus', () => {
    const source = readFileSync('src/components/examens/ExamenReussitePage.tsx', 'utf8');
    expect(source.match(/await candidateNotes.emailNote\(/g)).toHaveLength(7);
    expect(source.match(/body: noteHTML \+ body/g)).toHaveLength(7);
    expect(source.match(/__html: pratiqueNoteHTML\(candidateNotes.row/g)).toHaveLength(2);
    expect(source.match(/<PratiqueCandidateNote candidateId=/g)).toHaveLength(4);
    expect(source).toContain('generateLettreHTML(refreshed.data)');
  });
  it('préserve l’historique avec contrôle de version serveur', () => {
    const sql = readFileSync('drizzle/migrations/0127_pratique_candidate_note_history.sql', 'utf8');
    expect(sql).toContain('BEFORE UPDATE OR DELETE');
    expect(sql).toContain('current_revision<>p_expected_revision');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(sql).toContain('GRANT SELECT ON public.pratique_candidate_note_revisions TO authenticated');
  });
});