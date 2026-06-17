/**
 * Non-regression: pendant un quiz, le countdown d'inactivité (tick 1s)
 * NE DOIT PAS provoquer de re-render du parent — sinon la page remonte
 * en haut (scroll jump) toutes les secondes.
 *
 * On vérifie ici que sur 60s simulées :
 *   - le parent qui contient le PresenceCheckModal ne re-render PAS
 *   - le compteur interne de la modale, lui, se met bien à jour
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useRef, useState } from "react";
import { PresenceCheckModal } from "@/components/cours-en-ligne/PresenceCheckModal";

describe("Quiz scroll stability — inactivity countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ne re-render PAS le parent pendant 60s de countdown", () => {
    const parentRenders = { count: 0 };

    function QuizParent() {
      parentRenders.count += 1;
      // deadline figée 2 minutes dans le futur
      const deadlineRef = useRef(Date.now() + 120_000);
      const [show] = useState(true);
      return (
        <div>
          <div data-testid="quiz-content">Question 1 — bla bla bla</div>
          <PresenceCheckModal
            show={show}
            countdownDeadline={deadlineRef.current}
            disconnectReason={null}
            onConfirm={() => {}}
          />
        </div>
      );
    }

    render(<QuizParent />);
    const initialRenders = parentRenders.count;

    // Avance 60 ticks de 1s (le setInterval interne de CountdownDisplay)
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    // Le parent n'a pas re-render une seule fois
    expect(parentRenders.count).toBe(initialRenders);

    // Mais le compteur a bien bougé (passé de 02:00 à ~01:00)
    expect(screen.getByText(/01:0\d/)).toBeInTheDocument();
  });
});
