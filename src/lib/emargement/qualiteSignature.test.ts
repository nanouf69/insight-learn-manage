import { describe, it, expect } from "vitest";
import { evaluerPixelsSignature } from "./qualiteSignature";
const W = 400, H = 120;
describe("qualité signature", () => {
  it("refuse un simple point", () => {
    expect(evaluerPixelsSignature((x, y) => (Math.abs(x - 200) < 4 && Math.abs(y - 60) < 4 ? 255 : 0), W, H).ok).toBe(false);
  });
  it("refuse un trait minuscule", () => {
    expect(evaluerPixelsSignature((x, y) => (y === 60 && x > 190 && x < 220 ? 255 : 0), W, H).ok).toBe(false);
  });
  it("accepte une vraie signature", () => {
    expect(evaluerPixelsSignature((x, y) => (Math.abs(y - (30 + (x % 60))) < 3 && x > 50 && x < 350 ? 255 : 0), W, H).ok).toBe(true);
  });
});
