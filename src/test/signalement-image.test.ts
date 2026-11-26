import { describe, it, expect } from "vitest";
import { erreurImage } from "@/components/cours-en-ligne/SignalementForm";
const Mo = 1024 * 1024;
describe("captures de signalement", () => {
  it("accepte PNG, JPEG, WEBP, GIF et HEIC jusqu'à 20 Mo", () => {
    for (const [n, t] of [["a.png","image/png"],["a.jpg","image/jpeg"],["a.webp","image/webp"],["a.gif","image/gif"],["a.heic",""]])
      expect(erreurImage({ name: n, type: t, size: 20 * Mo })).toBeNull();
  });
  it("refuse au-delà de 20 Mo", () => { expect(erreurImage({ name: "a.png", type: "image/png", size: 20 * Mo + 1 })).toMatch(/20 Mo/); });
  it("refuse un fichier non image", () => { expect(erreurImage({ name: "a.pdf", type: "application/pdf", size: 10 })).toMatch(/pas une image/); });
});
