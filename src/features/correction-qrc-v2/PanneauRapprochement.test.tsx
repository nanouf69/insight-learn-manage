import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PanneauRapprochement } from "./PanneauRapprochement";
import type { GroupeSessionCrm } from "./noyauReel";

const lire = vi.hoisted(() => vi.fn());
vi.mock("./lectureRapprochement", () => ({ lireRapprochement: lire }));
afterEach(() => { vi.useRealTimers(); lire.mockReset(); });

it("l'inventaire attend la première grille, puis ne recommence pas à chaque lecture de notes", async () => {
  vi.useFakeTimers();
  lire.mockResolvedValue({ attendues: 1, visibles: 1, manquantes: [], luLe: "2026-11-10T20:24:00Z" });
  const groupes: GroupeSessionCrm[] = [{
    cle: "s", type: "crm", libelle: "Session fictive", periode: null, debut: null, fin: null,
    tri: "", nbCandidats: 1, examens: [],
  }];
  const vue = render(<PanneauRapprochement groupes={groupes} pret={false} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(lire).not.toHaveBeenCalled();
  vue.rerender(<PanneauRapprochement groupes={groupes} pret />);
  await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
  expect(lire).toHaveBeenCalledOnce();
  vue.rerender(<PanneauRapprochement groupes={groupes} pret={false} />);
  vue.rerender(<PanneauRapprochement groupes={groupes} pret />);
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(lire).toHaveBeenCalledOnce();
});