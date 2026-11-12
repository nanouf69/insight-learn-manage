import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { BilanVtcComplements } from "@/components/cours-en-ligne/BilanVtcComplements";
import { estComplementBilanVtc } from "@/lib/bilanVtcComplements";

describe("compléments VTC isolés", () => {
  it("filtre exclusivement 505/506/507 et la carte Questions QRC VTC sans toucher les identités", () => {
    const pages = [500, 501, 502, 503, 504, 505, 506, 507, 607].map(id => ({ type: "exercice-single", exercice: { id } }));
    expect(pages.filter(p => estComplementBilanVtc(5, p)).map(p => p.exercice.id)).toEqual([505, 506, 507]);
    expect(pages.filter(p => estComplementBilanVtc(11, p))).toEqual([]);
    expect(estComplementBilanVtc(5, { type: "cours", cours: { id: 1794399472264 } })).toBe(true);
    expect(estComplementBilanVtc(5, { type: "cours", cours: { id: 9001 } })).toBe(false);
    expect(estComplementBilanVtc(11, { type: "cours", cours: { id: 1794399472264 } })).toBe(false);
    expect(estComplementBilanVtc(5, { type: "cours", cours: { id: 9002 } })).toBe(false);
    expect(pages[0].exercice.id).toBe(500);
  });
  it("navigation complémentaire conserve une réponse A–E en mémoire, aucune remise à zéro", () => {
    function Future() { const [answer, setAnswer] = useState('A'); return <input aria-label="réponse existante" value={answer} onChange={e => setAnswer(e.target.value)} />; }
    render(<BilanVtcComplements future={<Future />} legacy={() => <p>Copie 505 existante</p>} />);
    fireEvent.change(screen.getByLabelText('réponse existante'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'F(V) — Développement commercial' }));
    expect(screen.getByText('Copie 505 existante')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour au Bilan A–E' }));
    expect((screen.getByLabelText('réponse existante') as HTMLInputElement).value).toBe('B');
  });
  it("cible 505 puis 506 et recible le même exercice sans remonter les réponses", () => {
    const cibles: number[] = [];
    function Legacy({ id }: { id?: number }) { const [answer] = useState('B'); return <p>{id}:{answer}</p>; }
    render(<BilanVtcComplements future={<p>A–E</p>} legacy={c => { if (c) cibles.push(c.exerciceId); return <Legacy id={c?.exerciceId} />; }} />);
    expect(cibles).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'F(V) — Développement commercial' }));
    expect(screen.getByText('505:B')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'G(V) — Réglementation spécifique' }));
    expect(screen.getByText('506:B')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour au Bilan A–E' }));
    fireEvent.click(screen.getByRole('button', { name: 'F(V) — Développement commercial' }));
    expect(cibles.at(-1)).toBe(505);
    expect(screen.getByText('505:B')).toBeTruthy();
  });
});