import { describe, it, expect } from "vitest";
import { assainirHtmlEmail, nettoyerUrlLien } from "@/lib/emailHtmlSafe";
import { choisirCopie } from "@/components/emails/EmailDetailDialog";
describe("consultation admin mail", () => {
  it("supprime scripts, handlers, pixel et images distantes", () => {
    const { html, imagesBloquees } = assainirHtmlEmail(`<p onclick="x()">Bonjour</p><script>alert(1)</script><iframe src="https://e"></iframe><form><input></form><img src="https://x/functions/v1/email-track-open?id=1" width="1" height="1"><img src="https://cdn/logo.png" alt="Logo"><a href="javascript:alert(1)">a</a><a href="https://site.fr/p?utm_source=m&id=3">b</a>`);
    expect(html).not.toMatch(/script|onclick|iframe|<form|<input|email-track-open|https:\/\/cdn|javascript:/);
    expect(html).toContain("Bonjour");
    expect(html).toContain('href="https://site.fr/p?id=3"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(imagesBloquees).toBe(1);
  });
  it("refuse les liens de suivi", () => { expect(nettoyerUrlLien("https://a/functions/v1/email-track-open?id=x")).toBeNull(); });
  it("choisit la bonne copie archivée ou aucune", () => {
    const a: any = { id: "1", destinataire: "Cma@x.fr", sujet: "Ajout élève pratique", sent_at: "2026-10-09T16:06:00Z" };
    const c = (id: string, subject: string, sent_at: string, r = ["cma@x.fr"]) => ({ id, subject, sent_at, recipients: r, created_at: sent_at, body_html: "x" } as any);
    expect((choisirCopie(a, [c("a", "Liste candidats", "2026-10-09T16:06:00Z"), c("b", "Ajout élève pratique", "2026-10-09T16:07:00Z"), c("z", "Ajout élève pratique", "2026-10-09T16:06:00Z", ["autre@x.fr"])]) as any)?.id).toBe("b");
    expect((choisirCopie(a, [c("b", "Ajout élève pratique", "2026-10-09T16:07:00Z"), c("d", "Ajout élève pratique", "2026-10-09T16:08:00Z")]) as any)?.id).toBe("b");
    expect(choisirCopie(a, [c("b", "Ajout élève pratique", "2026-10-09T16:07:00Z"), { ...c("d", "Ajout élève pratique", "2026-10-09T16:08:00Z"), body_html: "autre" }])).toBe("ambigu");
    expect(choisirCopie(a, [c("c", "Ajout élève pratique", "2026-10-09T18:00:00Z")])).toBeNull();
  });
});
