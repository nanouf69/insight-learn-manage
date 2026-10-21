import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client",()=>({supabase:{}}));
vi.mock("@/lib/sessionRpc",()=>({freshSessionCall:vi.fn()}));
vi.mock("@/lib/answerPersistence",()=>({enqueueAnswerSave:vi.fn(),flushAnswerSavesAndWait:vi.fn(),getPendingAnswers:vi.fn()}));
import { useActiviteTaxi, type TransportTaxi } from "@/components/cours-en-ligne/pratique-taxi-2026/useActiviteTaxi";
import { IDS_TAXI, FERIES_2026 } from "@/components/cours-en-ligne/pratique-taxi-2026/donnees";
afterEach(()=>{cleanup();window.localStorage.clear();}); // isolated jsdom only
function serveurFictif(){
  const rows=new Map<string,unknown>();
  const t:TransportTaxi={lire:vi.fn(async(c,id)=>rows.get(`${c}:${id}`)??null),envoyer:vi.fn(async(c,id,draft,fin)=>{rows.set(`${c}:${id}`,{completed:fin,reponses:{version:"2026-v1",...draft}});return true;})};
  return t;
}
describe("Parcours sauvegarde fictive TAXI",()=>{
  it("incomplet enregistrer/fermer/rouvrir/recharger, autre compte/type isolés",async()=>{
    const t=serveurFictif();const h=renderHook(({c,id})=>useActiviteTaxi(c,id,t),{initialProps:{c:"fictif-A",id:IDS_TAXI[0] as string}});
    await waitFor(()=>expect(h.result.current.charge).toBe(true));
    act(()=>h.result.current.modifier("f01","2026-01-01"));await act(()=>h.result.current.enregistrer(false));
    expect(h.result.current.statut).toBe("Brouillon enregistré — confirmé par le serveur");h.unmount();
    const h2=renderHook(({c,id})=>useActiviteTaxi(c,id,t),{initialProps:{c:"fictif-A",id:IDS_TAXI[0] as string}});
    await waitFor(()=>expect(h2.result.current.valeurs.f01).toBe("2026-01-01"));
    h2.rerender({c:"fictif-B",id:IDS_TAXI[0]});await waitFor(()=>expect(h2.result.current.charge).toBe(true));expect(h2.result.current.valeurs).toEqual({});
    h2.rerender({c:"fictif-A",id:IDS_TAXI[1]});await waitFor(()=>expect(h2.result.current.charge).toBe(true));expect(h2.result.current.valeurs).toEqual({});
    h2.rerender({c:"fictif-A",id:IDS_TAXI[0]});await waitFor(()=>expect(h2.result.current.valeurs.f01).toBe("2026-01-01"));
  });
  it("échec réseau conserve saisie et réouverture sans faux succès",async()=>{
    const t=serveurFictif();t.envoyer=vi.fn(async()=>{throw Error("réseau");});
    const h=renderHook(()=>useActiviteTaxi("fictif-A",IDS_TAXI[2],t));await waitFor(()=>expect(h.result.current.charge).toBe(true));
    act(()=>h.result.current.modifier("s01_r","4 si ZUPC"));await act(()=>h.result.current.enregistrer(false));expect(h.result.current.statut).toContain("non confirmé");expect(h.result.current.valeurs.s01_r).toBe("4 si ZUPC");h.unmount();
    const h2=renderHook(()=>useActiviteTaxi("fictif-A",IDS_TAXI[2],t));await waitFor(()=>expect(h2.result.current.valeurs.s01_r).toBe("4 si ZUPC"));
  });
  it("lecture échouée préserve local et refuse envoi",async()=>{
    const t=serveurFictif();t.lire=vi.fn(async()=>{throw Error("JWT");});const h=renderHook(()=>useActiviteTaxi("A",IDS_TAXI[0],t));await waitFor(()=>expect(h.result.current.statut).toContain("indisponible"));
    await act(()=>h.result.current.enregistrer(true));expect(t.envoyer).not.toHaveBeenCalled();expect(h.result.current.confirme).toBe(false);
  });
  it("validation seulement après toutes réponses et relecture exacte",async()=>{
    const t=serveurFictif();const h=renderHook(()=>useActiviteTaxi("A",IDS_TAXI[0],t));await waitFor(()=>expect(h.result.current.charge).toBe(true));
    await act(()=>h.result.current.enregistrer(true));expect(t.envoyer).not.toHaveBeenCalled();
    act(()=>FERIES_2026.forEach(f=>h.result.current.modifier(f.id,f.date)));await act(()=>h.result.current.enregistrer(true));expect(h.result.current.confirme).toBe(true);
    await act(()=>h.result.current.enregistrer(false));expect(t.envoyer).toHaveBeenCalledTimes(1);
  });
  it("accusé ancien/relecture incomplète ne confirme jamais",async()=>{
    const t=serveurFictif();t.envoyer=vi.fn(async()=>true);const h=renderHook(()=>useActiviteTaxi("A",IDS_TAXI[0],t));await waitFor(()=>expect(h.result.current.charge).toBe(true));
    act(()=>FERIES_2026.forEach(f=>h.result.current.modifier(f.id,f.date)));await act(()=>h.result.current.enregistrer(true));expect(h.result.current.confirme).toBe(false);expect(h.result.current.statut).toContain("non confirmé");
  });
});