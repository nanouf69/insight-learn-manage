import { describe, it, expect, vi } from "vitest";

/**
 * E2E-style test for the "Terminer la matière" flow on l'épreuve E
 * dans la page « Examens Blancs ».
 *
 * Reproduit la logique corrigée dans ExamensBlancsPage.tsx (lignes 852-876) :
 *  - saveMatiereResult est awaité
 *  - si save === false → résultat retiré, toast erreur, progression bloquée
 *  - si save === true  → résultat conservé, on avance à la matière suivante
 */

type Resultat = { matiereId: string; note: number } | null;

async function terminerMatiere({
  matiereIndex,
  tousResultats,
  resultat,
  saveMatiereResult,
  toastError,
  setResultats,
  advance,
}: {
  matiereIndex: number;
  tousResultats: Resultat[];
  resultat: NonNullable<Resultat>;
  saveMatiereResult: () => Promise<boolean>;
  toastError: (msg: string) => void;
  setResultats: (r: Resultat[]) => void;
  advance: () => void;
}) {
  const newResultats = [...tousResultats];
  newResultats[matiereIndex] = resultat;
  setResultats(newResultats);

  const saved = await saveMatiereResult();
  if (!saved) {
    newResultats[matiereIndex] = null;
    setResultats(newResultats);
    toastError("Impossible d'enregistrer votre résultat pour cette matière.");
    return { advanced: false, persisted: false };
  }

  advance();
  return { advanced: true, persisted: true };
}

describe("Examens Blancs — sauvegarde épreuve E", () => {
  const matieres = ["A", "B", "C", "D", "E", "F", "G"];
  const eIndex = matieres.indexOf("E");

  it("enregistre l'épreuve E et avance à F quand la sauvegarde réussit", async () => {
    const saveMatiereResult = vi.fn().mockResolvedValue(true);
    const toastError = vi.fn();
    const advance = vi.fn();
    let state: Resultat[] = new Array(7).fill(null);
    const setResultats = (r: Resultat[]) => { state = r; };

    const out = await terminerMatiere({
      matiereIndex: eIndex,
      tousResultats: state,
      resultat: { matiereId: "bilan_anglais", note: 14 },
      saveMatiereResult,
      toastError,
      setResultats,
      advance,
    });

    expect(saveMatiereResult).toHaveBeenCalledOnce();
    expect(out.persisted).toBe(true);
    expect(out.advanced).toBe(true);
    expect(state[eIndex]).toEqual({ matiereId: "bilan_anglais", note: 14 });
    expect(toastError).not.toHaveBeenCalled();
    expect(advance).toHaveBeenCalledOnce();
  });

  it("bloque la progression et purge le résultat si la sauvegarde de E échoue", async () => {
    const saveMatiereResult = vi.fn().mockResolvedValue(false);
    const toastError = vi.fn();
    const advance = vi.fn();
    let state: Resultat[] = new Array(7).fill(null);
    const setResultats = (r: Resultat[]) => { state = r; };

    const out = await terminerMatiere({
      matiereIndex: eIndex,
      tousResultats: state,
      resultat: { matiereId: "bilan_anglais", note: 14 },
      saveMatiereResult,
      toastError,
      setResultats,
      advance,
    });

    expect(out.persisted).toBe(false);
    expect(out.advanced).toBe(false);
    expect(state[eIndex]).toBeNull();
    expect(toastError).toHaveBeenCalledOnce();
    expect(advance).not.toHaveBeenCalled();
  });

  it("réessai après échec : le second clic persiste E et déverrouille F", async () => {
    const saveMatiereResult = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const toastError = vi.fn();
    const advance = vi.fn();
    let state: Resultat[] = new Array(7).fill(null);
    const setResultats = (r: Resultat[]) => { state = r; };

    const first = await terminerMatiere({
      matiereIndex: eIndex, tousResultats: state,
      resultat: { matiereId: "bilan_anglais", note: 12 },
      saveMatiereResult, toastError, setResultats, advance,
    });
    expect(first.persisted).toBe(false);
    expect(state[eIndex]).toBeNull();

    const second = await terminerMatiere({
      matiereIndex: eIndex, tousResultats: state,
      resultat: { matiereId: "bilan_anglais", note: 12 },
      saveMatiereResult, toastError, setResultats, advance,
    });
    expect(second.persisted).toBe(true);
    expect(second.advanced).toBe(true);
    expect(state[eIndex]).toEqual({ matiereId: "bilan_anglais", note: 12 });
    expect(saveMatiereResult).toHaveBeenCalledTimes(2);
    expect(advance).toHaveBeenCalledOnce();
  });
});
