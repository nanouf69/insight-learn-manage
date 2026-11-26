import { assert, assertEquals } from "jsr:@std/assert@1";
import { construireReponse } from "./message.ts";

Deno.test("réponse : référence dans le sujet, texte échappé, mapping Résolu", () => {
  const m = construireReponse({ reference: "SIG-2026-000007", nom: "A <b>", demande: "x", reponse: "<script>", statut: "traite" });
  assertEquals(m.sujet, "[SIG-2026-000007] Réponse du centre à votre signalement");
  assert(m.html.includes("&lt;script&gt;") && !m.html.includes("<script>"));
  assert(m.html.includes("Résolu"));
});
Deno.test("réponse : en cours = Non résolu", () => {
  assert(construireReponse({ reference: "R", nom: null, demande: "d", reponse: "r", statut: "en_cours" }).html.includes("Non résolu"));
});
