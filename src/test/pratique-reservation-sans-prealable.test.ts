// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const admin = readFileSync("src/components/examens/ExamenReussitePage.tsx", "utf8");
const page = readFileSync("src/pages/ReservationPratique.tsx", "utf8");

describe("Réservation pratique sans préalable de module", () => {
  it("ne sélectionne plus un message sans lien selon l'activité du module", () => {
    expect(admin).not.toContain("pratiqueDoneIds");
    expect(admin).not.toContain("buildInvitePratique");
    expect(admin).not.toContain("avant d'obtenir le lien");
    expect(admin).not.toContain("Avant de pouvoir choisir");
  });

  for (const type of ["vtc", "taxi"]) {
    it(`garde le lien personnalisé dans les trois envois ${type.toUpperCase()}`, () => {
      expect(admin.match(new RegExp(`const bookingUrl = getBookingUrl\\(a.id, '${type}'\\)`, "g"))).toHaveLength(3);
    });
  }

  it("conserve les liens de révision sans les imposer avant la date", () => {
    expect(page).not.toContain("Avant tout, faites le module");
    expect(page.match(/Pour vos révisions, consultez le module/g)).toHaveLength(4);
    expect(page).toContain("https://gestion.ftransport.fr/cours?module=8");
    expect(page).toContain("https://gestion.ftransport.fr/cours?module=6");
  });

  it("conserve le rappel obligatoire des heures e-learning aux deux endroits", () => {
    expect(page.match(/sous peine de sanction par le CPF ou France Travail/g)).toHaveLength(2);
  });
});