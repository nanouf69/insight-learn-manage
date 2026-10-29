import {test,expect} from "vitest";
import {modulesAttribuesDashboard as f} from "@/lib/parcoursModulesDashboard";
import {resolveFormationId} from "@/lib/parcoursModulesDashboard";
const a=[1,2,3,4,35,5,60,70,8,83,50,11];
test("pilot",()=>{const fo=resolveFormationId("vtc","vtc",a) as any; console.log("formation",fo, f(fo,a,"deb92ae7-09aa-4861-abfd-405e9d340d65").map(m=>m.id));
expect(f(fo,a,"deb92ae7-09aa-4861-abfd-405e9d340d65").some(m=>m.id===11)).toBe(true);
expect(f(fo,a,"other").some(m=>m.id===11)).toBe(false);});
