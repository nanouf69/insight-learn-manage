import { afterEach, describe, expect, it } from 'vitest';
import { setSearchFocus, peekSearchFocus, consumeSearchFocus, getActiveSearchFocus } from '../components/cours-en-ligne/module-content-search';

afterEach(() => setSearchFocus(null));

describe('search target lifetime', () => {
  it('retains question identity after navigation consumes the scroll request', () => {
    const target = { moduleId: 27, exerciceId: 251, questionId: 143 };
    setSearchFocus(target);
    consumeSearchFocus();
    expect(peekSearchFocus()).toBeNull();
    expect(getActiveSearchFocus()).toEqual(target);
  });
  it('clears the old identity on module exit', () => {
    setSearchFocus({ moduleId: 27, exerciceId: 251, questionId: 143 });
    setSearchFocus(null);
    expect(getActiveSearchFocus()).toBeNull();
  });
  it('replaces the old target with the next selected result', () => {
    setSearchFocus({ moduleId: 27, exerciceId: 251, questionId: 143 });
    consumeSearchFocus();
    setSearchFocus({ moduleId: 11, exerciceId: 606, questionId: 29 });
    expect(getActiveSearchFocus()).toEqual({ moduleId: 11, exerciceId: 606, questionId: 29 });
  });
});