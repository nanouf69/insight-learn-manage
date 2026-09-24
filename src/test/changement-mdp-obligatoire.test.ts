/** Étape 2 (préparation) — tests sur données simulées uniquement. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { doitDemanderChangementMdp, verifierNouveauMdp } from "@/lib/changementMotDePasse";

const dash = { surTableauDeBord: true, apercu: false };
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Décision d'afficher la demande", () => {
  it("apprenant non concerné : rien ne change", () => {
    expect(doitDemanderChangementMdp({ requis: false, examen_en_cours: false }, dash)).toBe(false);
  });
  it("état inconnu / erreur serveur : aucun blocage", () => {
    expect(doitDemanderChangementMdp(null, dash)).toBe(false);
  });
  it("concerné, sur le tableau de bord, sans examen : demande affichée", () => {
    expect(doitDemanderChangementMdp({ requis: true, examen_en_cours: false }, dash)).toBe(true);
  });
  it("examen blanc en cours : JAMAIS de demande", () => {
    expect(doitDemanderChangementMdp({ requis: true, examen_en_cours: true }, dash)).toBe(false);
  });
  it("module ou examen ouvert : jamais d'interruption", () => {
    expect(doitDemanderChangementMdp({ requis: true, examen_en_cours: false }, { surTableauDeBord: false, apercu: false })).toBe(false);
  });
  it("après la fin du passage, retour au tableau de bord : la demande peut apparaître", () => {
    const pendant = doitDemanderChangementMdp({ requis: true, examen_en_cours: true }, dash);
    const apres = doitDemanderChangementMdp({ requis: true, examen_en_cours: false }, dash);
    expect([pendant, apres]).toEqual([false, true]);
  });
  it("aperçu admin/formateur : jamais", () => {
    expect(doitDemanderChangementMdp({ requis: true, examen_en_cours: false }, { surTableauDeBord: true, apercu: true })).toBe(false);
  });
});

describe("Contrôle du nouveau mot de passe", () => {
  it("refuse trop court, sans chiffre, ou confirmation différente", () => {
    expect(verifierNouveauMdp("abc1", "abc1").ok).toBe(false);
    expect(verifierNouveauMdp("abcdefgh", "abcdefgh").ok).toBe(false);
    expect(verifierNouveauMdp("abcdefg1", "abcdefg2").ok).toBe(false);
    expect(verifierNouveauMdp("abcdefg1", "abcdefg1").ok).toBe(true);
  });
});

describe("Aucun secret conservé, aucune donnée pédagogique touchée", () => {
  const comp = read("src/components/cours-en-ligne/ChangementMotDePasseObligatoire.tsx");
  const sql = read("drizzle/migrations/0073_preparation_changement_mdp_obligatoire.sql");

  it("le mot de passe va uniquement au service de connexion", () => {
    expect(comp).toContain("supabase.auth.updateUser({ password: mdp })");
    expect(comp).not.toMatch(/console\.(log|warn|error)/);
    expect(comp).not.toMatch(/from\(["'](apprenants|emails)["']\)/);
    expect(comp).not.toMatch(/localStorage|sessionStorage/);
    // la confirmation serveur ne reçoit aucun paramètre
    expect(comp).toMatch(/rpc as any\)\("confirmer_changement_mdp_effectue"\)/);
  });

  it("la table de suivi ne contient aucune colonne de mot de passe", () => {
    const table = sql.split("GRANT")[0];
    expect(table).not.toMatch(/mot_de_passe|password|mdp\s+text/i);
  });

  it("la préparation n'active personne et ne touche pas aux données pédagogiques", () => {
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.(apprenants|reponses|exam|apprenant_module|apprenant_quiz)/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
  });

  it("aucune déconnexion forcée", () => {
    expect(comp).not.toMatch(/signOut/);
    expect(sql).not.toMatch(/auth\.sessions|auth\.refresh_tokens/);
  });
});
