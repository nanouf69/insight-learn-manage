// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FORMATEUR_EMARGEMENT, lignesPdfSignaturesManquantes, generateSignaturesManquantesPdf } from '../lib/pdf/signatures-manquantes-pdf';
import type { SignatureManquante } from '../lib/signaturesManquantes';

const row = (date: string, creneau: string, extra: Partial<SignatureManquante> = {}): SignatureManquante => ({
  date, creneau, source: 'Théorie — inscription de session', etat: 'manquante', ...extra,
});

describe('PDF signatures manquantes : horaires + formateur', () => {
  it('le formateur demandé est écrit sur la feuille', () => {
    expect(FORMATEUR_EMARGEMENT).toBe('Guenichi Naoufal');
  });

  it('chaque ligne porte les horaires réels et la mention absence reste affichée', () => {
    const lignes = lignesPdfSignaturesManquantes([
      row('2026-09-08', 'Après-midi', { horaires: '13h-16h' }),
      row('2026-09-07', 'Matin', { horaires: '9h-12h' }),
      row('2026-09-09', 'Matin', { horaires: '9h-12h', etat: 'absence_enregistree' }),
      row('2026-09-10', 'Matin'), // horaires indisponibles : rien d'inventé
    ]);
    expect(lignes.map(l => `${l.date}|${l.creneau}|${l.horaires ?? ''}|${l.absence}`)).toEqual([
      'Lundi 07/09/2026|Matin|9h-12h|false',
      'Mardi 08/09/2026|Après-midi|13h-16h|false',
      'Mercredi 09/09/2026|Matin|9h-12h|true',
      'Jeudi 10/09/2026|Matin||false',
    ]);
  });

  it('génère réellement un PDF multi-pages quand les horaires sont affichés', () => {
    const rows: SignatureManquante[] = [];
    for (let d = 1; d <= 20; d++) {
      const date = `2026-09-${String(d).padStart(2, '0')}`;
      rows.push(row(date, 'Matin', { horaires: '9h-12h' }));
      rows.push(row(date, 'Après-midi', { horaires: '13h-16h' }));
    }
    const pdf = generateSignaturesManquantesPdf({ prenom: 'Fiacre', nom: 'LALEYE' }, rows);
    expect(pdf.pages).toBeGreaterThan(1);
    expect(pdf.fileName).toBe('signatures-manquantes-Fiacre-LALEYE.pdf');
    expect(pdf.blob.size).toBeGreaterThan(0);
  });
});
