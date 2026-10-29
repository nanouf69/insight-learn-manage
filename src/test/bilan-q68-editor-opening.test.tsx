import React, { useEffect, useRef, useState } from 'react';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isIncompleteCurrencyChoice } from '@/lib/editorSaveAcknowledgement';

// Execute the actual QuestionEditor body on an isolated copy, no Cloud transport.
const source=readFileSync('src/components/cours-en-ligne/ModuleDetailView.tsx','utf8');
const body=source.slice(source.indexOf('function QuestionEditor('),source.indexOf('// ===== Carte exercice avec questions ====='));
const js=ts.transpile(body,{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020});
const Button=({children,variant,size,...props}:any)=><button {...props}>{children}</button>;
const Input=(props:any)=><input {...props}/>;
const Textarea=(props:any)=><textarea {...props}/>;
const Colored=({onChange,value}:any)=><textarea aria-label="Énoncé" value={value} onChange={e=>onChange(e.target.value)}/>;
const Empty=()=>null;
const Editor=new Function('React','useState','useRef','useEffect','Button','Input','Textarea','Badge','ColoredTextField','QuestionImageUpload','X','Trash2','Save','Plus','isIncompleteCurrencyChoice',js+';return QuestionEditor')(
  React,useState,useRef,useEffect,Button,Input,Textarea,({children}:any)=><span>{children}</span>,Colored,Empty,Empty,Empty,Empty,Empty,isIncompleteCurrencyChoice);
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('Q68 isolated editor lifecycle',()=>{
  const q={id:68,enonce:'Registre ADS',choix:[{lettre:'A',texte:'Marque',correct:true},{lettre:'B',texte:'Nom'},{lettre:'C',texte:'Montant'},{lettre:'D',texte:'Inscription',correct:false}]};
  it('opening, waiting and save without input never emit a write or recheck D',async()=>{
    vi.useFakeTimers();const save=vi.fn(),draft=vi.fn(),cancel=vi.fn();
    const view=render(<Editor question={structuredClone(q)} onSave={save} onDraftSave={draft} onCancel={cancel} onDelete={vi.fn()} moduleId={11}/>);
    await act(async()=>vi.advanceTimersByTime(2000));
    expect(Array.from(view.container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')).map(x=>x.checked)).toEqual([true,false,false,false]);
    fireEvent.click(view.getByText('Enregistrer'));
    expect(save).not.toHaveBeenCalled();expect(draft).not.toHaveBeenCalled();expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('a real change preserves A-only and emits only question68',async()=>{
    vi.useFakeTimers();const draft=vi.fn();
    const view=render(<Editor question={structuredClone(q)} onSave={vi.fn()} onDraftSave={draft} onCancel={vi.fn()} onDelete={vi.fn()} moduleId={28}/>);
    fireEvent.change(view.getByLabelText('Énoncé'),{target:{value:'Registre ADS modifié'}});
    await act(async()=>vi.advanceTimersByTime(500));
    expect(draft).toHaveBeenCalledTimes(1);
    expect(draft.mock.calls[0][0].id).toBe(68);
    expect(draft.mock.calls[0][0].choix.filter((c:any)=>c.correct).map((c:any)=>c.lettre)).toEqual(['A']);
  });
});