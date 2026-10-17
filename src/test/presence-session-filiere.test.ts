// @vitest-environment node
import { describe, it, expect } from "vitest";
import { calculerTauxPresenceHeures } from "../components/crm/TauxPresenceSessionsCard";
import { heuresSessionPourApprenant } from "../lib/sessionHeures";
const mixte = { nom: "Session VTC et TAXI", type_session: "theorique", heures_total: 90, date_debut: "2026-09-14", date_fin: "2026-09-27" };
const inscriptions = [{ sessions: mixte }, { sessions: { type_session: "pratique", heures_total: 6, date_debut: "2026-10-15" } }];
const signatures = [14,15,16,17,18,21,22,23,24,25].map((jour) => ["matin", "apres_midi"].map(demi_journee => ({ date_emargement: `2026-09-${jour}`, demi_journee, signature_data_url: "data:image/png;base64,AAAA" }))).flat();
describe("Présence selon la filière", () => {
  it.each([["vtc",60,66],["taxi",90,96]])("%s utilise sa base sans modifier les preuves", (filiere, session, total) => {
    const avant = JSON.stringify({ signatures, inscriptions });
    const d = calculerTauxPresenceHeures(signatures, inscriptions, String(filiere));
    expect(d.session.faites).toBe(60);
    expect(d.session.prevues).toBe(session);
    expect(d.session.prevues+d.pratique.prevues).toBe(total);
    expect(JSON.stringify({ signatures, inscriptions })).toBe(avant);
  });
  it("VTC : session 100 %, total 60/66 et pratique 0/6", () => {
    const d = calculerTauxPresenceHeures(signatures, inscriptions, "vtc");
    expect(d.session.faites/d.session.prevues*100).toBe(100);
    expect(d.pratique).toEqual({ faites:0, prevues:6 });
    expect((d.session.faites+d.pratique.faites)/(d.session.prevues+d.pratique.prevues)*100).toBeCloseTo(90.909);
  });
  it.each([
    [{ nom:"Session VTC cours du soir",heures_total:40 },"vtc",40],
    [{ nom:"Formation TA",types_apprenant:["TA"] },"ta",30],
    [{ nom:"Formation continue VTC",heures_total:14 },"vtc",14],
    [{ type_session:"pratique" },"vtc",6],
    [{ nom:"Session VTC",heures_total:54 },"vtc",54],
    [mixte,null,90],
  ])("préserve les autres durées %j", (s, filiere, heures) => {
    expect(heuresSessionPourApprenant(s, filiere)).toBe(heures);
  });
});