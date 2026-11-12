import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { BilanVtcComplements } from "@/components/cours-en-ligne/BilanVtcComplements";
import { estComplementBilanVtc } from "@/lib/bilanVtcComplements";

describe("compléments VTC isolés", () => {
  it("filtre exclusivement 505/506/507 et cours 9001 sans toucher les identités", () => {
    const pages = [500, 501, 502, 503, 504, 505, 506, 507, 607].map(id => ({ type: "exercice-single", exercice: { id } }));
    expect(pages.filter(p => estComplementBilanVtc(5, p)).map(p => p.exercice.id)).toEqual([505, 506, 507]);
    expect(pages.filter(p => estComplementBilanVtc(11, p))).toEqual([]);
    expect(estComplementBilanVtc(5, { type: "cours", cours: { id: 9001 } })).toBe(true);
    expect(estComplementBilanVtc(5, { type: "cours", cours: { id: 9002 } })).toBe(false);
    expect(pages[0].exercice.id).toBe(500);
  });
  it("navigation complémentaire conserve une réponse A–E en mémoire, aucune remise à zéro", () => {
    function Future() { const [answer, setAnswer] = useState('A'); return <input aria-label="réponse existante" value={answer} onChange={e => setAnswer(e.target.value)} />; }
    render(<BilanVtcComplements future={<Future />} legacy={<p>Copie 505 existante</p>} />);
    fireEvent.change(screen.getByLabelText('réponse existante'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'F(V), G(V), H et Questions QRC VTC' }));
    expect(screen.getByText('Copie 505 existante')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour au Bilan A–E' }));
    expect((screen.getByLabelText('réponse existante') as HTMLInputElement).value).toBe('B');
  });
});