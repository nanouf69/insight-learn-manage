import { describe, expect, it } from "vitest";
import { presentationConvocation } from "@/lib/convocationFormation";
import { isFormationContinueValue } from "@/lib/emargementHours";

describe("règles de présentation FC du 12 novembre", () => {
  it.each(["continue-vtc", "continue-taxi"])("%s : horaires 9h–13h / 13h–17h", (type) => {
    expect(presentationConvocation(isFormationContinueValue(type), "13h–17h").horaires).toBe("9h–13h / 13h–17h");
  });
  it.each(["continue-vtc", "continue-taxi"])("%s : aucun accès cours dans la convocation", (type) => {
    expect(presentationConvocation(isFormationContinueValue(type)).afficherAccesCours).toBe(false);
  });
  it("préserve la présentation des formations initiales", () => {
    expect(presentationConvocation(false, "17h–21h")).toEqual({ horaires: "17h–21h", afficherAccesCours: true });
  });
});