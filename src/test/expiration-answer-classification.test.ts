// @vitest-environment node
import { it, expect } from 'vitest';
import { classifyAnswerSaveFailure } from '@/lib/answerPersistence';
it('PGRST303/401 conserve une reprise possible, pas un refus définitif',()=>{
  expect(classifyAnswerSaveFailure(400,'{"code":"PGRST303"}').definitif).toBe(false);
  expect(classifyAnswerSaveFailure(401,'JWT expired').definitif).toBe(false);
  expect(classifyAnswerSaveFailure(403,'auth_user_id_mismatch').definitif).toBe(true);
  expect(classifyAnswerSaveFailure(500,'P0471').definitif).toBe(true);
});