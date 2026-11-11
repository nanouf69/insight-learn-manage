import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstPassageProvider, QuestionFirstPassageRate } from '@/components/cours-en-ligne/QuestionFirstPassageRate';
import { readExamFirstPassage } from '@/lib/premierPassageExamStatsRead';
import type { QuestionRate, SessionFirstPassage } from '@/lib/premierPassageStats';

vi.mock('@/lib/premierPassageExamStatsRead', () => ({ readExamFirstPassage: vi.fn() }));
const mockedRead = vi.mocked(readExamFirstPassage);
const rate = (incorrect: number, total: number, unknown = 0): QuestionRate => ({ incorrect, total, unknown, jour: { incorrect, total }, soir: { incorrect: 0, total: 0 }, mixte: 0 });
const question = { id: 1, enonce: 'Question', type: 'QCM', choix: [{ lettre: 'A', texte: 'Oui', correct: true }, { lettre: 'B', texte: 'Non' }] };

function data(questionRate: QuestionRate): SessionFirstPassage {
  const session = { id: 'jour', nom: 'Session VTC et TAXI - Du 2 au 13 novembre 2026', date_debut: '2026-11-02', date_fin: '2026-11-13', mode: 'jour' as const, eligible: 16 };
  return { today: '2026-11-06', rates: { '1': questionRate }, modeRates: { jour: { '1': questionRate }, soir: { '1': rate(0, 0) } }, sessions: [session], sessionRates: { jour: { '1': questionRate } } };
}

function renderRate() {
  return render(<FirstPassageProvider moduleId={90000} exerciseId={0} questions={[question]} enabled examId="EB1" subjectId="gestion"><QuestionFirstPassageRate questionId={1} /></FirstPassageProvider>);
}

describe('Couleur du taux d’échec au premier passage', () => {
  it('détail exact : toutes réponses du dénominateur, filtre erreurs et QRC en attente séparée', async()=>{
    const r=rate(1,2,1);r.details=[{learnerId:'a',candidate:'Candidat A',answer:['B'],expected:['A'],passage:'p1',version:'v1',verdict:'incorrect'},{learnerId:'b',candidate:'Candidat B',answer:['A'],expected:['A'],passage:'p2',verdict:'correct'},{learnerId:'c',candidate:'Candidat C',answer:'Réponse en attente',passage:'p3',verdict:'unknown',reason:'QRC non notée'}];
    mockedRead.mockResolvedValue(data(r));renderRate();fireEvent.click(await screen.findByRole('button',{name:/50 %/}));
    expect(screen.getByText(/2 première\(s\) réponse/)).toBeInTheDocument();expect(screen.getByText(/Candidat A/)).toBeInTheDocument();expect(screen.getByText(/Candidat B/)).toBeInTheDocument();expect(screen.getByText('QRC non notée')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox',{name:'Erreurs seulement'}));expect(screen.queryByText(/Candidat B/)).not.toBeInTheDocument();expect(screen.getByText(/Candidat A/)).toBeInTheDocument();expect(screen.getByText(/Candidat C/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Fermer le détail des premières réponses'}));expect(screen.queryByText('QRC non notée')).not.toBeInTheDocument();
  });

  beforeEach(() => mockedRead.mockReset());

  it('1 erreur sur 2 réponses = 50 % affiché en rouge', async () => {
    mockedRead.mockResolvedValue(data(rate(1, 2)));
    renderRate();
    const line = await screen.findByText(/50 % \(1\/2\)/);
    expect(line).toHaveClass('text-destructive');
    expect(line).toHaveClass('font-semibold');
  });

  it('0 erreur sur 2 reste neutre, sans seuil arbitraire', async () => {
    mockedRead.mockResolvedValue(data(rate(0, 2)));
    renderRate();
    const line = await screen.findByText(/0 % \(0\/2\)/);
    expect(line).toHaveClass('text-muted-foreground');
    expect(line).not.toHaveClass('text-destructive');
  });

  it('QRC ou preuve insuffisante ne devient ni 0 % ni un échec rouge et n’affiche aucun non prouvé', async () => {
    mockedRead.mockResolvedValue(data(rate(0, 0, 2)));
    renderRate();
    const line = await screen.findByText(/données insuffisantes/);
    expect(line).not.toHaveTextContent('non prouvé');
    expect(line).not.toHaveClass('text-destructive');
  });

  it('un pourcentage calculé reste affiché sans suffixe non prouvé', async () => {
    mockedRead.mockResolvedValue(data(rate(1, 2, 14)));
    renderRate();
    const line = await screen.findByText(/50 % \(1\/2\)/);
    expect(line).not.toHaveTextContent('non prouvé');
  });
});
