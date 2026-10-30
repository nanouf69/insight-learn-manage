import { quizItems, QuizItem } from '@/data/quiz-qrc-taxi/quizData';
import { QCM_LOCAUX_BILAN_TA, QcmBilanTa } from '@/data/bilan-ta/qcmLocauxBilanTa';
import { METROPOLE_LYON, ZUPC_LYON, distracteurs } from './communesLyon';

export type PracticeQuiz = 'complet' | 'specialites';
export const PRACTICE_VERSION = 'taxi-optional-durable-v1';
export type AnswerValue = string | string[];
export interface Requirement { key: string; label: string; kind: 'choice' | 'text' | 'choices' | 'list'; options?: string[]; min?: number; }
export const QUIZ_DEFINITIONS: Record<PracticeQuiz, { titre: string; items: QuizItem[]; zones: ('metropole' | 'zupc')[]; qrcDesLaPremiere: boolean; qcmLocaux: QcmBilanTa[] }> = {
  complet: { titre: 'QRC TAXI complet', items: quizItems, zones: ['metropole'], qrcDesLaPremiere: false, qcmLocaux: [] },
  specialites: { titre: 'QRC TAXI spécialités', items: quizItems.filter(q => q.category === 'national'), zones: ['zupc', 'metropole'], qrcDesLaPremiere: true, qcmLocaux: QCM_LOCAUX_BILAN_TA },
};
export function requirements(quiz: PracticeQuiz): Requirement[] {
  const def = QUIZ_DEFINITIONS[quiz];
  return [
    ...def.items.flatMap((q, i): Requirement[] => [
      { key: `mcq:${q.id}`, label: `Question ${i + 1} — QCM`, kind: 'choice', options: q.mcqOptions },
      ...((def.qrcDesLaPremiere || i > 0) && q.qrcQuestion.trim() ? [{ key: `qrc:${q.id}`, label: `Question ${i + 1} — QRC`, kind: 'text' as const }] : []),
    ]),
    ...def.qcmLocaux.map(q => ({ key: `local:${q.id}`, label: `QCM local ${q.id}`, kind: 'choices' as const, options: q.choix.map(c => c.lettre) })),
    ...def.zones.flatMap((zone): Requirement[] => {
      const ref = zone === 'metropole' ? METROPOLE_LYON : ZUPC_LYON;
      return [
        { key: `cases:${zone}`, label: `${zone === 'metropole' ? 'Métropole' : 'ZUPC'} — cases`, kind: 'choices', options: [...ref.map(e => e.nom), ...distracteurs(zone)] },
        { key: `list:${zone}`, label: `${zone === 'metropole' ? 'Métropole' : 'ZUPC'} — liste écrite (${ref.length} éléments)`, kind: 'list', min: ref.length },
      ];
    }),
  ];
}
/** Presence, not correctness: a wrong selection or non-empty QRC remains an answer. */
export function validAnswer(rule: Requirement, value: unknown, complete = true): value is AnswerValue {
  if (rule.kind === 'choice') return typeof value === 'string' && (value === '' && !complete || !!rule.options?.includes(value));
  if (rule.kind === 'choices') return Array.isArray(value) && (!complete || value.length > 0) && value.every(v => typeof v === 'string' && rule.options?.includes(v)) && new Set(value).size === value.length;
  if (typeof value !== 'string' || value.length > 8000 || (rule.kind === 'text' && value.length > 4000)) return false;
  if (!complete) return true;
  if (!value.trim()) return false;
  if (rule.kind === 'list') return new Set(value.split(/[\n,;/•]+/).map(s => s.trim().toLowerCase()).filter(Boolean)).size >= (rule.min ?? 1);
  return true;
}
export function missingAnswers(rules: Requirement[], answers: Record<string, AnswerValue>): Requirement[] {
  return rules.filter(r => !validAnswer(r, answers[r.key]));
}
export function legacyAnswers(raw: unknown, rules: Requirement[]): { answers: Record<string, AnswerValue>; rejected: string[] } {
  const answers: Record<string, AnswerValue> = {}, rejected: string[] = [];
  if (!raw || typeof raw !== 'object') return { answers, rejected: ['Ancienne sauvegarde illisible'] };
  const state = raw as Record<string, unknown>;
  for (const [field, prefix] of [['reponses', ''], ['locaux', 'local'], ['cases', 'cases'], ['saisies', 'list']] as const) {
    const values = state[field];
    if (!values || typeof values !== 'object') continue;
    for (const [id, value] of Object.entries(values)) {
      const candidates = field === 'reponses' && value && typeof value === 'object'
        ? [[`mcq:${id}`, (value as Record<string, unknown>).qcm], [`qrc:${id}`, (value as Record<string, unknown>).qrc]]
        : [[`${prefix}:${id}`, value]];
      for (const [key, answer] of candidates) {
        if (typeof key !== 'string' || answer === undefined || answer === '' || Array.isArray(answer) && !answer.length) continue;
        const rule = rules.find(r => r.key === key);
        if (rule && validAnswer(rule, answer, false)) answers[key] = answer;
        else rejected.push(String(key));
      }
    }
  }
  return { answers, rejected };
}