import { describe, it, expect } from "vitest";
import { pourcentageModules, mailDerniereRelance, mailDerniereRelanceHtml, OBJET_DERNIERE_RELANCE, dateLimiteRelance, bilanSignaturesPresentiel, PARAGRAPHES_SANCTIONS_ROUGES, PARAGRAPHE_SANCTIONS_NORMAL, ROUGE_SANCTIONS } from "@/lib/suiviPratiqueEdof";

describe("suivi pratique EDOF", () => {
  it("8 modules terminés sur 10 = 80 %", () => expect(pourcentageModules(8, 10)).toBe(80));
  it("aucun module attribué = pas de pourcentage", () => expect(pourcentageModules(0, 0)).toBeNull());
  it("objet exact de la dernière relance", () => expect(mailDerniereRelance("Ali", "Ben", 80, "x").subject).toBe("DERNIER AVERTISSEMENT – Formation à terminer sous 3 jours"));
  it("mail personnalisé avec nom, progression et date limite", () => {
    const m = mailDerniereRelance("Ali", "Ben", 80, "lundi 2 novembre 2026");
    expect(m.body).toContain("Bonjour Ali BEN,");
    expect(m.body).toContain("Votre progression actuelle : 80 % des modules terminés.");
    expect(m.body).toContain("lundi 2 novembre 2026");
    expect(OBJET_DERNIERE_RELANCE).toBe(m.subject);
  });
  it("date limite = envoi + 3 jours calendaires", () => expect(dateLimiteRelance(new Date("2026-10-29T12:00:00Z"))).toBe("dimanche 1 novembre 2026"));
  it("présentiel : journée 9h-16h sur 2 jours = 4 attendues, 1 signée = 3 manquantes", () => {
    const sessions = [{ liste_attente: false, sessions: { type_session: "theorique", statut: "en_cours", date_debut: "2026-10-26", date_fin: "2026-10-27", heure_debut: "09:00", heure_fin: "16:00" } }];
    const sig = [{ date_emargement: "2026-10-26", demi_journee: "matin", signature_data_url: "data:image/png;base64,AAAA", signed_at: "2026-10-26T08:00:00Z", masque: false }];
    const r = bilanSignaturesPresentiel(sig, sessions, [], [], "2026-10-29");
    expect(r.attendues).toBe(4);
    expect(r.manquantes).toBe(3);
  });
});
