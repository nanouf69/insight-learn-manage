import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Execute the actual page-local hook without mounting course/exam side effects.
const source = readFileSync('src/pages/CoursPublic.tsx', 'utf8');
const ast = ts.createSourceFile('CoursPublic.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useLoginIdentityConfirmation');
if (!declaration) throw new Error('Missing identity confirmation hook');
const javascript = ts.transpile(declaration.getText(ast), { target: ts.ScriptTarget.ES2020 });
let listener: ((event: string, value: ReturnType<typeof session> | null) => void) | undefined;
const unsubscribe = vi.fn();
const auth = { onAuthStateChange: vi.fn((callback: typeof listener) => {
  listener = callback;
  return { data: { subscription: { unsubscribe } } };
}) };
const useConfirmation = new Function('useState', 'useEffect', 'useRef', 'supabase', `${javascript}; return useLoginIdentityConfirmation;`)(
  React.useState, React.useEffect, React.useRef, { auth },
) as (embedded: boolean) => readonly [boolean, React.Dispatch<React.SetStateAction<boolean>>];

function session(id = 'connexion-1', owner = 'eleve-1', suffix = 'signature') {
  return { user: { id: owner }, access_token: `header.${btoa(JSON.stringify({ session_id: id }))}.${suffix}` };
}
function emit(event: string, value: ReturnType<typeof session> | null = session()) {
  act(() => listener?.(event, value));
}
beforeEach(() => { listener = undefined; vi.clearAllMocks(); });
afterEach(cleanup);

describe('Confirmation en mémoire par nouvelle connexion apprenant', () => {
  it('blocks initially until explicit confirmation', () => {
    const { result } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
  it('requires confirmation again for a new SIGNED_IN of the same account', () => {
    const { result } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    act(() => result.current[1](true));
    emit('SIGNED_IN', session('connexion-2'));
    expect(result.current[0]).toBe(false);
  });
  it('does not reset confirmation on TOKEN_REFRESHED', () => {
    const { result } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    act(() => result.current[1](true));
    emit('TOKEN_REFRESHED', session('connexion-1', 'eleve-1', 'nouveau-jeton'));
    expect(result.current[0]).toBe(true);
  });
  it('ignores duplicate SIGNED_IN and resume events for the same session', () => {
    const { result, rerender } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    act(() => result.current[1](true));
    emit('SIGNED_IN');
    act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange')); });
    rerender();
    expect(result.current[0]).toBe(true);
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });
  it('clears confirmation after logout, including same-account reconnection', () => {
    const { result } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    act(() => result.current[1](true));
    emit('SIGNED_OUT', null);
    expect(result.current[0]).toBe(false);
    emit('SIGNED_IN');
    expect(result.current[0]).toBe(false);
  });
  it('requires confirmation for a different account', () => {
    const { result } = renderHook(() => useConfirmation(false));
    emit('INITIAL_SESSION');
    act(() => result.current[1](true));
    emit('SIGNED_IN', session('connexion-1', 'eleve-2'));
    expect(result.current[0]).toBe(false);
  });
  it('does not persist confirmation across unmounts', () => {
    const first = renderHook(() => useConfirmation(false));
    act(() => first.result.current[1](true));
    first.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
    const second = renderHook(() => useConfirmation(false));
    expect(second.result.current[0]).toBe(false);
  });
  it('leaves embedded admin previews outside the learner listener', () => {
    renderHook(() => useConfirmation(true));
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});