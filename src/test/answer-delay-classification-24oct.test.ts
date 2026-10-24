import { expect, it } from 'vitest';
import { classifyAnswerSaveFailure } from '@/lib/answerPersistence';

it.each([408, 429, 500, 503, 504])('HTTP %s avec délai français reste temporaire', status => {
  expect(classifyAnswerSaveFailure(status, 'Délai réseau dépassé')).toMatchObject({ definitif: false, reason: 'refused' });
});
it.each(['08006', '40001', '53100', '57014', '55P03', '58000', 'XX000', 'PGRST003'])('HTTP400 hérité avec %s reste temporaire', code => {
  expect(classifyAnswerSaveFailure(400, JSON.stringify({ code, error: 'Délai SQL dépassé' }))).toMatchObject({ definitif: false, reason: 'refused' });
});
it.each(['P0471', 'Nouveau passage interdit avant 48 h', 'Nouvelle tentative non autorisée avant 48h'])('refus 48h explicite %s reste bloqué', message => {
  expect(classifyAnswerSaveFailure(503, message)).toMatchObject({ definitif: true, reason: 'retake_delay' });
});
it.each(['Délai technique de 48 h', 'delai reseau depasse'])('mention isolée %s ne signifie pas nouveau passage', message => {
  expect(classifyAnswerSaveFailure(503, message)).toMatchObject({ definitif: false, reason: 'refused' });
});
it('contrainte et protection restent définitives, session reste reconnexion', () => {
  expect(classifyAnswerSaveFailure(400, '{"code":"23514"}')).toMatchObject({ definitif: true, reason: 'refused' });
  expect(classifyAnswerSaveFailure(503, 'permission denied : délai dépassé')).toMatchObject({ definitif: true, reason: 'forbidden' });
  expect(classifyAnswerSaveFailure(401, 'Délai réseau dépassé')).toMatchObject({ definitif: false, reason: 'forbidden' });
});