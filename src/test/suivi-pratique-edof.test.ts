import { describe, it, expect } from "vitest";
import { pourcentageModules, mailDerniereRelance, mailDerniereRelanceHtml, OBJET_DERNIERE_RELANCE, dateLimiteRelance, bilanSignaturesPresentiel, PARAGRAPHES_SANCTIONS_ROUGES, PARAGRAPHE_SANCTIONS_NORMAL, ROUGE_SANCTIONS, compteurSignaturesFiche } from "@/lib/suiviPratiqueEdof";

describe("suivi pratique EDOF", () => {
  it("8 modules terminés sur 10 = 80 %", () => expect(pourcentageModules(8, 10)).toBe(80));
  it("aucun module attribué = pas de pourcentage", () => expect(pourcentageModules(0, 0)).toBeNull());
  it("objet exact de la dernière relance", () => expect(mailDerniereRelance("Ali", "Ben", 80, "x").subject).toBe("URGENT – DERNIER AVERTISSEMENT – Formation à terminer sous 3 jours"));
  it("mail personnalisé avec nom, progression et date limite", () => {
    const m = mailDerniereRelance("Ali", "Ben", 80, "lundi 2 novembre 2026");
    expect(m.body).toContain("Bonjour Ali BEN,");
    expect(m.body).toContain("Votre progression actuelle : 80 % des modules terminés.");
    expect(m.body).toContain("lundi 2 novembre 2026");
    expect(OBJET_DERNIERE_RELANCE).toBe(m.subject);
  });
  it("date limite = envoi + 3 jours calendaires", () => expect(dateLimiteRelance(new Date("2026-10-29T12:00:00Z"))).toBe("dimanche 1 novembre 2026"));
  it("texte brut : nouveaux paragraphes sanctions, sans couleur ni HTML", () => {
    const m = mailDerniereRelance("Ali", "Ben", 80, "dimanche 1 novembre 2026");
    for (const p of PARAGRAPHES_SANCTIONS_ROUGES) expect(m.body).toContain(p);
    expect(m.body).toContain("Vous disposez de 3 JOURS calendaires à compter de la réception de cet email pour terminer l'ensemble des modules, exercices et évaluations obligatoires de votre parcours, soit au plus tard le dimanche 1 novembre 2026.");
    expect(m.body).not.toContain("Nous vous demandons impérativement");
    expect(m.body).toContain(PARAGRAPHE_SANCTIONS_NORMAL);
    expect(m.body).toContain("Elles ne sont pas automatiques.");
    expect(m.body).not.toContain("Le non-respect de vos obligations de formation peut entraîner des conséquences sur votre dossier de financement");
    expect(m.body).not.toMatch(/<[^>]+>/);
    expect(m.body).not.toContain(ROUGE_SANCTIONS);
  });
  it("HTML : délai 3 JOURS et les 2 paragraphes de financement en rouge, le reste non", () => {
    const html = mailDerniereRelanceHtml("Ali", "Ben", 80, "dimanche 1 novembre 2026");
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    // 4 paragraphes rouges : ATTENTION, délai 3 JOURS, CPF, France Travail
    expect(html.match(new RegExp(`color:${ROUGE_SANCTIONS}`, "g"))).toHaveLength(4);
    for (const p of PARAGRAPHES_SANCTIONS_ROUGES) expect(html).toContain(`<p style="color:${ROUGE_SANCTIONS};font-weight:600">${esc(p)}</p>`);
    expect(html).toContain(`<p style="color:${ROUGE_SANCTIONS};font-weight:600">Vous disposez de <strong style="font-size:1.15em">3 JOURS</strong> calendaires`);
    expect(html).toContain("soit au plus tard le dimanche 1 novembre 2026.");
    expect(html).toContain(`<p>${esc(PARAGRAPHE_SANCTIONS_NORMAL)}</p>`);
    expect(html).toContain("<p>Bonjour Ali BEN,</p>");
  });
  it("HTML : les caractères spéciaux du nom sont échappés", () => {
    const html = mailDerniereRelanceHtml("<b>Ali</b>", "Ben & Cie", 80, "x");
    expect(html).toContain("&lt;b&gt;Ali&lt;/b&gt; BEN &amp; CIE");
    expect(html).not.toContain("<b>Ali</b>");
  });
  it("présentiel : journée 9h-16h sur 2 jours = 4 attendues, 1 signée = 3 manquantes", () => {
    const sessions = [{ liste_attente: false, sessions: { type_session: "theorique", statut: "en_cours", date_debut: "2026-10-26", date_fin: "2026-10-27", heure_debut: "09:00", heure_fin: "16:00" } }];
    const sig = [{ date_emargement: "2026-10-26", demi_journee: "matin", signature_data_url: "data:image/png;base64,AAAA", signed_at: "2026-10-26T08:00:00Z", masque: false }];
    const r = bilanSignaturesPresentiel(sig, sessions, [], [], "2026-10-29");
    expect(r.attendues).toBe(4);
    expect(r.manquantes).toBe(3);
  });
});

describe("compteur EDOF = fiche apprenant", () => {
  it("TA 2/12 (présentiel 0/10, pratique 2/2) : 10 manquantes / 12 attendues", () => {
    const attendus = [...Array(10)].map(() => ({ etat: "manquante" })).concat([{ etat: "absence_enregistree" }]);
    expect(compteurSignaturesFiche({ objectifTotal: 12, total: 2 }, attendus)).toEqual({ attendues: 12, signees: 2, manquantes: 10 });
  });
});
