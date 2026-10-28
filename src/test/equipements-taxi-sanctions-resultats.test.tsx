import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QuizEquipements, SERIE_SANCTIONS } from "@/components/cours-en-ligne/equipements-taxi-locale/CoursQuizEquipementsTaxi";
import type { TransportEquipements } from "@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements";

vi.mock("@/lib/learnerPreviewGuard", () => ({ isLearnerPreviewReadOnly: () => false }));

const Q = SERIE_SANCTIONS.questions;
const toutesJustes = () => Object.fromEntries(Q.map((q) => [q.id, String(q.correct)]));

function serveur(initial: unknown = null, opts: { echec?: boolean; delai?: number } = {}) {
  let row: any = initial;
  const t: TransportEquipements & { envois: number } = {
    envois: 0,
    async lire() { return row; },
    async envoyer(_c, draft, termine) {
      t.envois++;
      if (opts.delai) await new Promise((r) => setTimeout(r, opts.delai));
      if (opts.echec) return false;
      row = { completed: termine, reponses: { version: SERIE_SANCTIONS.version, ...draft } };
      return true;
    },
  };
  return t;
}

const cocherToutes = (valeurs: Record<string, string>) => {
  Q.forEach((q, i) => {
    const bloc = screen.getByTestId(`equipements-question-${i + 1}`);
    const texte = q.choix[Number(valeurs[q.id])];
    fireEvent.click(bloc.querySelector(`[aria-label="${CSS.escape(texte)}"]`) as Element);
  });
};

beforeEach(() => localStorage.clear());

describe("Quiz 20 sanctions — résultats après Terminer", () => {
  it("avant confirmation : aucun résultat ni corrigé global", async () => {
    render(<QuizEquipements compteId="fictif-1" transport={serveur()} serie={SERIE_SANCTIONS} />);
    await screen.findByText("Suivi chargé");
    expect(screen.queryByTestId("equipements-resultats")).toBeNull();
    expect(screen.queryAllByRole("region", { name: "Corrigé" })).toHaveLength(0);
  });

  it("Terminer confirmé : bilan + 20 corrigés affichés, réponse index 0 comprise", async () => {
    const t = serveur();
    render(<QuizEquipements compteId="fictif-1" transport={t} serie={SERIE_SANCTIONS} />);
    await screen.findByText("Suivi chargé");
    const v = toutesJustes(); v[Q[0].id] = String((Q[0].correct + 1) % 3);
    cocherToutes(v);
    const fin = screen.getByRole("button", { name: /Terminer le quiz/ });
    fireEvent.click(fin); fireEvent.click(fin);
    await screen.findByTestId("equipements-resultats");
    expect(t.envois).toBe(1);
    expect(screen.getByTestId("equipements-resultats").textContent).toContain(`${Q.length - 1} / ${Q.length}`);
    expect(screen.getAllByRole("region", { name: "Corrigé" })).toHaveLength(Q.length);
    expect(screen.getByText(/Votre réponse/)).toBeTruthy();
  });

  it("quiz déjà terminé rechargé : corrigés visibles sans clic", async () => {
    const t = serveur({ completed: true, reponses: { version: SERIE_SANCTIONS.version, revision: "r", valeurs: toutesJustes() } });
    render(<QuizEquipements compteId="fictif-2" transport={t} serie={SERIE_SANCTIONS} />);
    await screen.findByTestId("equipements-resultats");
    expect(screen.getAllByRole("region", { name: "Corrigé" })).toHaveLength(Q.length);
    expect(t.envois).toBe(0);
  });

  it("échec serveur : jamais terminé, pas de bilan, réessai possible", async () => {
    render(<QuizEquipements compteId="fictif-3" transport={serveur(null, { echec: true })} serie={SERIE_SANCTIONS} />);
    await screen.findByText("Suivi chargé");
    cocherToutes(toutesJustes());
    fireEvent.click(screen.getByRole("button", { name: /Terminer le quiz/ }));
    await screen.findByText(/non confirmé/);
    expect(screen.queryByTestId("equipements-resultats")).toBeNull();
    expect((screen.getByRole("button", { name: /Terminer le quiz/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("latence : bouton bloqué pendant l'envoi, bilan après confirmation", async () => {
    const t = serveur(null, { delai: 50 });
    render(<QuizEquipements compteId="fictif-4" transport={t} serie={SERIE_SANCTIONS} />);
    await screen.findByText("Suivi chargé");
    cocherToutes(toutesJustes());
    const fin = screen.getByRole("button", { name: /Terminer le quiz/ });
    fireEvent.click(fin);
    await waitFor(() => expect((fin as HTMLButtonElement).disabled).toBe(true));
    expect(screen.queryByTestId("equipements-resultats")).toBeNull();
    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
    await screen.findByTestId("equipements-resultats");
    expect(t.envois).toBe(1);
  });
});

import { SERIE_COMPLEMENT } from "@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements";

describe("Effet partagé — série complémentaire 11 (même composant)", () => {
  it("11 questions : même comportement, bilan sur 11 seulement après confirmation", async () => {
    const C = SERIE_COMPLEMENT.questions;
    let row: any = null;
    const t: TransportEquipements = {
      async lire() { return row; },
      async envoyer(_c, d, fin) { row = { completed: fin, reponses: { version: SERIE_COMPLEMENT.version, ...d } }; return true; },
    };
    render(<QuizEquipements compteId="fictif-5" transport={t} serie={SERIE_COMPLEMENT} />);
    await screen.findByText("Suivi chargé");
    C.forEach((q, i) => {
      const bloc = screen.getByTestId(`equipements-question-${i + 1}`);
      fireEvent.click(bloc.querySelector(`[aria-label="${CSS.escape(q.choix[q.correct])}"]`) as Element);
    });
    expect(screen.queryByTestId("equipements-resultats")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Terminer le quiz/ }));
    await screen.findByTestId("equipements-resultats");
    expect(screen.getByTestId("equipements-resultats").textContent).toContain(`${C.length} / ${C.length}`);
    expect(screen.getAllByRole("region", { name: "Corrigé" })).toHaveLength(C.length);
  });
});

describe("Coupure puis reprise de connexion", () => {
  it("1er envoi échoue, réponses gardées, 2e réussit : bilan affiché", async () => {
    let row: any = null; let enLigne = false; let envois = 0;
    const t: TransportEquipements = {
      async lire() { return row; },
      async envoyer(_c, d, fin) { envois++; if (!enLigne) return false; row = { completed: fin, reponses: { version: SERIE_SANCTIONS.version, ...d } }; return true; },
    };
    render(<QuizEquipements compteId="fictif-6" transport={t} serie={SERIE_SANCTIONS} />);
    await screen.findByText("Suivi chargé");
    cocherToutes(toutesJustes());
    fireEvent.click(screen.getByRole("button", { name: /Terminer le quiz/ }));
    await screen.findByText(/non confirmé/);
    expect(screen.queryByTestId("equipements-resultats")).toBeNull();
    enLigne = true;
    fireEvent.click(screen.getByRole("button", { name: /Terminer le quiz/ }));
    await screen.findByTestId("equipements-resultats");
    expect(envois).toBe(2);
    expect(screen.getByTestId("equipements-resultats").textContent).toContain(`${Q.length} / ${Q.length}`);
  });
});
