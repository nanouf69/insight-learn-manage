import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { avecJalonPratique, PRATIQUE_PHYSIQUE, LABEL_PRESENTIEL } from "@/lib/jalonsPonderes";
import { objectifsJalons, TITRE_OBJECTIFS_JALONS } from "@/lib/objectifsJalons";
import { ObjectifsJalonsSection } from "@/components/crm/apprenant-sections/ObjectifsJalonsSection";

describe("objectifs éditoriaux partagés", () => {
  it.each(["vtc-e", "taxi-e", "ta-e", "va-e"])("décrit uniquement les modules existants : %s", (key) => {
    const ids = avecJalonPratique(FORMATION_MODULES[key].modules.map(({ id }) => id));
    const before = [...ids];
    const objectifs = objectifsJalons(key, ids);
    expect(ids).toEqual(before);
    expect(objectifs.map(({ moduleId }) => moduleId)).toEqual(ids.filter((id) => ![50, 51, 52, 53].includes(id)));
    expect(objectifs.every(({ objectif }) => objectif.length > 20)).toBe(true);
    expect(objectifs.find(({ moduleId }) => moduleId === PRATIQUE_PHYSIQUE)?.intitule).toBe(LABEL_PRESENTIEL);
    expect(objectifs.find(({ intitule }) => intitule === "Cours et exercices")?.objectif).toContain(key === "taxi-e" || key === "ta-e" ? "formation taxi" : "formation VTC");
    render(<ObjectifsJalonsSection parcours={key} moduleIds={ids} />);
    expect(screen.getByRole("region", { name: TITRE_OBJECTIFS_JALONS })).toBeTruthy();
    for (const { objectif } of objectifs) expect(screen.getByText(objectif)).toBeTruthy();
    cleanup();
  });
  it("sépare pratique et révisions sans revendiquer des annales", () => {
    const objectifs = objectifsJalons("taxi-e");
    expect(objectifs.find(({ moduleId }) => moduleId === 6)?.objectif).toMatch(/épreuve pratique/);
    expect(objectifs.find(({ moduleId }) => moduleId === 71)?.objectif).toMatch(/l'essentiel/);
    expect(objectifs.find(({ moduleId }) => moduleId === 11)?.objectif).toBe("S'entraîner sur des questions types des épreuves d'examen.");
    expect(JSON.stringify(objectifs)).not.toMatch(/annales|officielles|conforme CDC/i);
  });
  it("exclut parcours non concernés, modules étrangers et doublons", () => {
    for (const key of ["vtc", "continue-vtc", "mobilite-taxi", "inconnu"]) expect(objectifsJalons(key)).toEqual([]);
    expect(objectifsJalons("vtc-e", [2, 2, 64, 50]).map(({ moduleId }) => moduleId)).toEqual([2]);
    expect(objectifsJalons("vtc-e", [])).toEqual([]);
  });
});