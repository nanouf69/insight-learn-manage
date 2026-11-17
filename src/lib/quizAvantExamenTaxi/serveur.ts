import { supabase } from '@/integrations/supabase/client';
import { freshSessionCall } from '@/lib/sessionRpc';
import type { ItemInventaire } from './inventaire';
import type { Tentative } from './tentatives';

export interface OperationQuiz {
  operation: string; action: 'start' | 'answer' | 'finish'; tentative: string;
  revision: number; payload: Record<string, unknown>;
}
export interface TentativeServeur extends Tentative { empreintes: Record<string,string>; note20: number | null }
export interface EtatQuiz { tentatives: TentativeServeur[]; coursActif: boolean }
export interface TransportQuiz {
  lire(): Promise<EtatQuiz>;
  envoyer(operation: OperationQuiz): Promise<EtatQuiz>;
}
const journalKey = (owner: string) => `qaet-pending:v1:${owner}`;
export function lireOperation(owner: string): OperationQuiz | null {
  const raw = localStorage.getItem(journalKey(owner));
  if (!raw) return null;
  const value = JSON.parse(raw) as OperationQuiz;
  if (!value.operation || !value.tentative) throw new Error('Brouillon local illisible : ne pas le supprimer.');
  return value;
}
export function garderOperation(owner: string, op: OperationQuiz) {
  const previous = lireOperation(owner);
  if (previous && previous.operation !== op.operation) throw new Error('Une réponse attend encore sa confirmation.');
  localStorage.setItem(journalKey(owner), JSON.stringify(op));
  if (localStorage.getItem(journalKey(owner)) !== JSON.stringify(op)) throw new Error('Brouillon non confirmé.');
}
export function acquitterOperation(owner: string, op: OperationQuiz) {
  if (lireOperation(owner)?.operation === op.operation) localStorage.removeItem(journalKey(owner));
}
export const nouvelleOperation = (action: OperationQuiz['action'], tentative: string, revision: number, payload: Record<string, unknown>): OperationQuiz =>
  ({ operation: crypto.randomUUID(), action, tentative, revision, payload });

/** Original source references only; the server resolves and verifies each question. */
export const referencesQuiz = (items: ItemInventaire[]) => items.map(q => ({
  cle: q.cle, module: q.module, exercice: q.exercice, question: q.questionId, theme: q.theme,
}));

export function transportQuizServeur(owner: string): TransportQuiz {
  const rpc = async (op: OperationQuiz | null): Promise<EtatQuiz> => {
    const { data, error } = await freshSessionCall(() => supabase.rpc('qaet_commande' as never, {
      p_operation: op?.operation ?? null, p_action: op?.action ?? 'read',
      p_tentative: op?.tentative ?? null, p_revision: op?.revision ?? 0, p_payload: op?.payload ?? {},
    } as never), owner);
    if (error) throw new Error(error.message);
    const result = data as unknown as EtatQuiz;
    if (!result || !Array.isArray(result.tentatives)) throw new Error('Lecture serveur non confirmée.');
    return result;
  };
  return { lire: () => rpc(null), envoyer: async op => {
    garderOperation(owner, op);
    const result = await rpc(op);
    const t = result.tentatives.find(x => x.id === op.tentative);
    if (!t || (op.action === 'answer' && JSON.stringify(t.reponses[String(op.payload.cle)]?.lettres) !== JSON.stringify(op.payload.lettres)) ||
      (op.action === 'finish' && !t.termineeLe)) throw new Error('Réponse non confirmée : le brouillon est conservé.');
    acquitterOperation(owner, op);
    return result;
  } };
}