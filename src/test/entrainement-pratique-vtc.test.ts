import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHOIX, objetMail, SUITE_PRATIQUE, introPratique, texteFige, estChoixValide, estCandidatVtc,
  estEligibleMailEchec, construireMailEchec, echeancesDepuisEnvoi, empreinteTexte, filiereDepuisDossier,
} from "@/lib/modeles/entrainementPratiqueVtc";
import { genererPreuveChoixPdf } from "@/lib/modeles/preuveChoixPdf";

const edge = readFileSync("supabase/functions/document-signature-public/index.ts", "utf8");
const migration = readFileSync("drizzle/migrations/0166_documents_a_signer_modele_choix.sql", "utf8");
const dialog = readFileSync("src/components/examens/EnvoiEchecChoixPratiqueDialog.tsx", "utf8");
const form = readFileSync("src/components/documents/ChoixPratiqueForm.tsx", "utf8");
const page = readFileSync("src/components/examens/ExamenReussitePage.tsx", "utf8");

describe("Texte fourni repris fidèlement", () => {
  it("exactement 3 choix, mots exacts", () => {
    expect(CHOIX.map((c) => c.label)).toEqual([
      "Je souhaite faire l'entraînement pratique dès maintenant (nous vous proposerons une date rapidement).",
      "Je souhaite faire l'entraînement pratique plus tard, après avoir réussi l'examen théorique, lors d'une prochaine session.",
      "Je ne souhaite pas faire l'entraînement pratique et je renonce à cette partie de la formation.",
    ]);
  });
  it("délais et avertissement CDC/France Travail présents", () => {
    const t = SUITE_PRATIQUE.join(" ");
    expect(t).toContain("pendant 6 mois à compter de ce message");
    expect(t).toContain("Caisse des Dépôts (Mon Compte Formation)");
    expect(t).toContain("France Travail");
    expect(t).toContain("dans un délai de 5 jours à compter de la réception de ce message");
  });
});

describe("Choix unique", () => {
  it("valide seulement les 3 codes", () => {
    expect(CHOIX.every((c) => estChoixValide(c.code))).toBe(true);
    for (const v of ["", "tous", null, undefined, ["maintenant"], "maintenant,renonce"]) expect(estChoixValide(v)).toBe(false);
  });
  it("formulaire : radiogroup, aucun pré-coché, signature obligatoire, anti double clic", () => {
    expect(form).toContain('role="radiogroup"');
    expect(form).toContain("useState<string | null>(null)");
    expect(form).toContain("disabled={envoi || !choix || !signature}");
    expect(form).toContain("verrou.current");
  });
});

describe("Ciblage par filière réelle", () => {
  it("VTC, TAXI, passerelle ; inconnu/ambigu = bloqué", () => {
    expect(filiereDepuisDossier("vtc")).toBe("vtc");
    expect(filiereDepuisDossier("VTC-E")).toBe("vtc");
    expect(filiereDepuisDossier("taxi")).toBe("taxi");
    expect(filiereDepuisDossier("TA-I")).toBe("taxi");
    expect(filiereDepuisDossier("ta")).toBe("ta");
    expect(filiereDepuisDossier("ta-e")).toBe("ta");
    for (const t of ["", null, "va", "taxi + vtc", "inconnu"]) expect(filiereDepuisDossier(t as any)).toBeNull();
    expect(estCandidatVtc("taxi")).toBe(false);
  });
  it("réussite, absence d'email ou filière inconnue exclues", () => {
    expect(estEligibleMailEchec({ resultat_examen: "non", type_apprenant: "vtc", email: "x@y.fr" })).toBe(true);
    expect(estEligibleMailEchec({ resultat_examen: "non", type_apprenant: "taxi", email: "x@y.fr" })).toBe(true);
    expect(estEligibleMailEchec({ resultat_examen: "oui", type_apprenant: "vtc", email: "x@y.fr" })).toBe(false);
    expect(estEligibleMailEchec({ resultat_examen: "oui", type_apprenant: "taxi", email: "x@y.fr" })).toBe(false);
    expect(estEligibleMailEchec({ resultat_examen: "non", type_apprenant: "", email: "x@y.fr" })).toBe(false);
    expect(estEligibleMailEchec({ resultat_examen: "non", type_apprenant: "vtc", email: "" })).toBe(false);
  });
  it("ancien mail de repassage seulement pour filière inconnue ; pas de double envoi", () => {
    expect(page).toContain("filiereDepuisDossier(a.type_apprenant) === null) || [];");
    expect(page).toContain("<EnvoiEchecChoixPratiqueDialog candidats={nonReussis as any} />");
    expect(dialog).toContain('d?.envoi_etat === "prepare"');
    expect(dialog).toContain('a.resultat_examen === "non"');
  });
});

describe("Mail unique adapté", () => {
  const vtc = construireMailEchec({ filiere: "vtc", prenom: "Fictif<script>", lien: "https://gestion.ftransport.fr/document-a-signer/abc" });
  const taxi = construireMailEchec({ filiere: "taxi", prenom: "Fictif", lien: "https://x/abc" });
  const ta = construireMailEchec({ filiere: "ta", prenom: "Fictif", lien: "https://x/abc" });
  it("objet par filière", () => {
    expect(vtc.subject).toBe(objetMail("vtc"));
    expect(vtc.subject).toMatch(/théorique VTC.*pratique.*5 jours/);
    expect(taxi.subject).toMatch(/théorique TAXI.*pratique.*5 jours/);
  });
  it("aucun mot VTC chez TAXI ni passerelle", () => {
    for (const m of [taxi, ta]) { expect(m.subject).not.toContain("VTC"); expect(m.html).not.toContain("VTC"); }
    expect(taxi.html).toContain("formation TAXI chez FTRANSPORT");
    expect(JSON.stringify(texteFige("taxi"))).not.toContain("VTC");
    expect(texteFige("taxi").titre).toBe("Votre entraînement pratique TAXI");
  });
  it("3 choix, délais et avertissement identiques pour toutes filières", () => {
    for (const f of ["vtc", "taxi", "ta"] as const) {
      const t = texteFige(f);
      expect(t.choix).toEqual(CHOIX.map((c) => ({ ...c })));
      expect(t.suite).toEqual(SUITE_PRATIQUE);
    }
  });
  it("infos de réexamen conservées, bouton à la fin", () => {
    const h = vtc.html;
    expect(h).toContain("www.exament3p.fr");
    expect(h).toContain("département 69");
    expect(h).toContain("04 28 29 60 91");
    expect(h.indexOf("exament3p")).toBeLessThan(h.indexOf("Choisir et signer"));
    expect(h).toContain("Naoufal Guenichi");
  });
  it("aucune case cochable dans le mail, prénom échappé", () => {
    expect(vtc.html).not.toMatch(/<input|<form|☐/);
    expect(vtc.html).not.toContain("<script>");
  });
});

describe("Délais depuis l'envoi réel", () => {
  it("rien sans date d'envoi réelle", () => {
    expect(echeancesDepuisEnvoi(null)).toBeNull();
    expect(echeancesDepuisEnvoi("pas une date")).toBeNull();
  });
  it("5 jours et 6 mois depuis envoye_le", () => {
    const e = echeancesDepuisEnvoi("2026-10-15T10:00:00Z")!;
    expect(e.reponseAttendue.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(e.finDisponibilite.toISOString().slice(0, 10)).toBe("2027-04-15");
  });
  it("envoye_le écrit seulement après succès d'envoi, une seule fois", () => {
    // Envoi orchestré côté serveur : le navigateur n'écrit plus envoye_le (voir echec-choix-pratique-serveur.test.ts).
    expect(dialog).not.toMatch(/envoye_le:\s*now|sync-outlook-emails|\.insert\(/);
    expect(dialog).toContain("envoi-echec-choix-pratique");
  });
});

describe("Serveur : jetons, idempotence, immuabilité", () => {
  it("lien préparé non envoyé = introuvable ; pas d'email ni d'info sur jeton inconnu", () => {
    expect(edge).toContain("!lienActif(full)");
    expect(edge).toContain("Document introuvable ou lien expiré");
    expect(edge).not.toMatch(/from\("apprenants"\)/);
  });
  it("double validation renvoie la preuve existante sans écraser", () => {
    expect(edge).toContain("soumettre(deps, token");
  });
  it("vérifie empreinte, choix et signature", () => {
    expect(edge).toContain("vuePublique(full)");
  });
  it("trigger : signé immuable, aucune suppression, texte/destinataire figés", () => {
    expect(migration).toContain("Preuve signée immuable");
    expect(migration).toContain("suppression interdite");
    expect(migration).toContain("NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id");
    expect(migration).not.toMatch(/DROP COLUMN|DELETE FROM/);
  });
  it("aucune action automatique CDC/France Travail/abandon/statut", () => {
    for (const src of [edge, dialog]) expect(src).not.toMatch(/apprenants"\)\.update|statut_formation|abandon\s*=|france_travail/i);
  });
});

describe("Preuve PDF", () => {
  it("empreinte stable", async () => {
    const t = JSON.stringify(texteFige("vtc"));
    expect(await empreinteTexte(t)).toBe(await empreinteTexte(t));
    expect(await empreinteTexte(t)).toHaveLength(64);
  });
  it("génère un PDF avec texte figé", async () => {
    const bytes = await genererPreuveChoixPdf({
      texte: texteFige("taxi"), version: "v1", empreinte: "x", nom: "FICTIF", prenom: "Test", choix: "plus_tard",
      signature: null, signeLeParis: "jeudi 15 octobre 2026 21:00:00", signedAt: "2026-10-15T19:00:00Z", envoyeLe: null,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(introPratique("taxi")).toHaveLength(2);
  });
});
