import { describe, it, expect } from "vitest";
import { etapesSuiviEmail, alerteNonRemis } from "@/lib/suiviEmailEtats";
import { deciderConfirmation, hacherJeton, nouveauJeton, masquerEmail } from "../../supabase/functions/_shared/confirmationReception";

const base = { statut: "envoye", sent_at: "2026-11-13T18:00:00Z", delivered_at: null, opened_at: null, open_count: 0, failed_at: null, erreur: null };
const codes = (a: any) => etapesSuiviEmail(a).map((e) => e.code);

describe("suivi e-mail", () => {
  it("envoyé seul : remise inconnue, non confirmé", () => expect(codes(base)).toEqual(["accepte", "remis_inconnu", "non_confirme"]));
  it("livré", () => expect(codes({ ...base, delivered_at: "2026-11-13T18:01:00Z" })).toEqual(["accepte", "remis", "non_confirme"]));
  it("ouvert n'est jamais confirmé", () => expect(codes({ ...base, statut: "ouvert", opened_at: "2026-11-13T18:35:00Z", open_count: 3 })).toEqual(["accepte", "remis_inconnu", "ouvert_indice", "non_confirme"]));
  it("confirmé seulement avec confirmed_at", () => expect(codes({ ...base, confirmed_at: "2026-11-13T19:00:00Z" }).at(-1)).toBe("confirme"));
  it("bounce : échec, ni remis ni confirmé", () => expect(codes({ ...base, statut: "echec", failed_at: "x", erreur: "bounce" })).toEqual(["accepte", "echec"]));
  it("alerte si rejet ou non remis après 24 h", () => {
    expect(alerteNonRemis({ ...base, statut: "echec" })).toBe(true);
    expect(alerteNonRemis(base, Date.parse("2026-11-14T19:00:00Z"))).toBe(true);
    expect(alerteNonRemis(base, Date.parse("2026-11-13T20:00:00Z"))).toBe(false);
  });
});

describe("lien de confirmation", () => {
  const futur = "2026-12-13T00:00:00Z";
  it("première confirmation acceptée", () => expect(deciderConfirmation({ expires_at: futur, confirmed_at: null }, Date.parse("2026-11-13T00:00:00Z")).action).toBe("confirmer"));
  it("rejeu / lien transféré après confirmation : date d'origine gardée", () => expect(deciderConfirmation({ expires_at: futur, confirmed_at: "2026-11-13T19:00:00Z" })).toEqual({ action: "deja_confirme", date: "2026-11-13T19:00:00Z" }));
  it("expiré", () => expect(deciderConfirmation({ expires_at: "2026-11-01T00:00:00Z", confirmed_at: null }, Date.parse("2026-11-13T00:00:00Z")).action).toBe("expire"));
  it("jeton inconnu", () => expect(deciderConfirmation(null).action).toBe("introuvable"));
  it("jetons uniques par envoi (plusieurs renvois) et hachage stable", async () => {
    const a = nouveauJeton(), b = nouveauJeton();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hacherJeton(a)).toBe(await hacherJeton(a));
    expect(await hacherJeton(a)).not.toBe(a);
  });
  it("adresse masquée", () => expect(masquerEmail("jean.dupont@mail.fr")).toBe("je***@mail.fr"));
});
