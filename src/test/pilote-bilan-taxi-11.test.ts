import {test,expect} from "vitest";
import {modulesAttribuesDashboard as f} from "@/lib/parcoursModulesDashboard";
const a=[1,2,3,4,35,5,60,70,8,83,50,11];
test("pilot",()=>{expect(f("vtc" as any,a,"deb92ae7-09aa-4861-abfd-405e9d340d65").some(m=>m.id===11)).toBe(true);
expect(f("vtc" as any,a,"other").some(m=>m.id===11)).toBe(false);});
