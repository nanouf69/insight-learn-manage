import { expect, test } from "vitest";
import { modulesAttribuesDashboard } from "@/lib/parcoursModulesDashboard";
test("FC TAXI module 7 ajouté visible", () => {
  expect(modulesAttribuesDashboard("continue-taxi",[82,11,92,84,86,93,94,95,96,51,7]).map(m=>m.id)).toContain(7);
});
test("ancienne affectation initiale FC jamais visible", () => {
  expect(modulesAttribuesDashboard("continue-vtc",[1,2,3,4,35,5,60,70,8,83,50]).map(m=>m.id)).not.toContain(2);
  expect(modulesAttribuesDashboard("continue-taxi",[1,10,7,3,9,13,11,36,6,84]).map(m=>m.id)).not.toContain(7);
});
