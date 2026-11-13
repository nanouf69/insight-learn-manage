// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FORMATEUR_EMARGEMENT, lignesPdfSignaturesManquantes, generateSignaturesManquantesPdf, totalPdfSignaturesManquantes } from '../lib/pdf/signatures-manquantes-pdf';
import type { SignatureManquante } from '../lib/signaturesManquantes';

const row = (date: string, creneau: string, extra: Partial<SignatureManquante> = {}): SignatureManquante => ({
  date, creneau, source: 'Théorie — inscription de session', etat: 'manquante', ...extra,
});

describe('PDF signatures manquantes : horaires + formateur', () => {
  it('17/09 et 18/09 : 150+90+150 minutes = 6h30 pour 3 créneaux',()=>{
    const rows=[row('2026-09-17','Soir 2',{horaires:'18h30-21h'}),row('2026-09-18','Soir 1',{horaires:'17h-18h30'}),row('2026-09-18','Soir 2',{horaires:'18h30-21h'})];
    expect(lignesPdfSignaturesManquantes(rows).map(r=>r.minutes)).toEqual([150,90,150]);
    expect(totalPdfSignaturesManquantes(rows)).toEqual({minutes:390,creneaux:3});
  });
  it('journée et pratique aux horaires réels, sans durée fixe',()=>expect(totalPdfSignaturesManquantes([row('2026-09-17','Matin',{horaires:'9h30-12h30'}),row('2026-09-17','Pratique',{horaires:'13h-17h'})]).minutes).toBe(420));
  it('même date : ordre horaire matin puis après-midi',()=>expect(lignesPdfSignaturesManquantes([row('2026-09-17','Après-midi',{horaires:'13h-16h'}),row('2026-09-17','Matin',{horaires:'9h-12h'})]).map(r=>r.minutes)).toEqual([180,180]));
  it('duplication de session et créneaux chevauchants ne doublent pas le temps',()=>{
    const a=row('2026-09-17','Pratique',{horaires:'9h-12h'});
    expect(totalPdfSignaturesManquantes([a,a,row('2026-09-17','Matin',{horaires:'10h-12h'})])).toEqual({minutes:180,creneaux:2});
  });
  it('horaires absents : total inconnu, pas un zéro inventé',()=>expect(totalPdfSignaturesManquantes([row('2026-09-17','Matin')]).minutes).toBeNull());
  it('conflit exact : impression refusée',()=>expect(()=>totalPdfSignaturesManquantes([row('2026-09-17','Matin',{horaires:'9h-12h'}),row('2026-09-17','Matin',{horaires:'9h-11h'})])).toThrow());
  it('absence enregistrée conservée sur feuille mais exclue des heures à signer',()=>expect(totalPdfSignaturesManquantes([row('2026-09-17','Matin',{horaires:'9h-12h',etat:'absence_enregistree'})]).minutes).toBe(0));
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
