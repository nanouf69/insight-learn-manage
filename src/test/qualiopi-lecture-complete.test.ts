import { describe, expect, it } from "vitest";
import { lirePagesQualiopi } from "@/lib/qualiopi/lectureComplete";

describe("lecture exhaustive des preuves Qualiopi", () => {
  it("conserve les 1085 références au-delà de la limite d'une page", async () => {
    const source = Array.from({ length: 1085 }, (_, id) => ({ id }));
    const rows = await lirePagesQualiopi(async (from, to) => ({
      data: source.slice(from, to + 1), error: null,
    }));
    expect(rows).toEqual(source);
    expect(rows.at(-1)?.id).toBe(1084);
  });
  it("refuse une seconde page illisible sans retourner un résultat partiel", async () => {
    const error = new Error("Lecture interrompue");
    await expect(lirePagesQualiopi(async (from) => from === 0
      ? { data: Array.from({ length: 500 }, (_, id) => id), error: null }
      : { data: null, error })).rejects.toBe(error);
  });
});