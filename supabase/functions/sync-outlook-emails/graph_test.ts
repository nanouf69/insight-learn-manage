import {
  assert,
  assertEquals,
  assertRejects,
} from "jsr:@std/assert@1";
import { fetchEmails, type EmailMessage } from "./graph.ts";

const message = (id: string, from: string, to = "contact@ftransport.fr"): EmailMessage => ({
  id,
  subject: id,
  bodyPreview: id,
  from: { emailAddress: { address: from, name: from } },
  toRecipients: [{ emailAddress: { address: to, name: to } }],
  hasAttachments: false,
  isRead: false,
  receivedDateTime: "2026-11-20T09:00:00Z",
});

Deno.test("sync ciblé inbox : recherche from, sans balayage ni tri interdit", async () => {
  let requestedUrl = "";
  let headers: Headers | undefined;
  const result = await fetchEmails(
    "jeton-fictif",
    "contact@ftransport.fr",
    "inbox",
    "Eleve@Example.com",
    async (input, init) => {
      requestedUrl = String(input);
      headers = new Headers(init?.headers);
      return Response.json({
        value: [
          message("pertinent", "eleve@example.com"),
          message("autre", "autre@example.com"),
        ],
      });
    },
  );

  const url = new URL(requestedUrl);
  assertEquals(url.searchParams.get("$search"), '"from:Eleve@Example.com"');
  assertEquals(url.searchParams.get("$orderby"), null);
  assertEquals(url.searchParams.get("$top"), "100");
  assertEquals(headers?.get("ConsistencyLevel"), "eventual");
  assertEquals(result.map((email) => email.id), ["pertinent"]);
});

Deno.test("sync ciblé sentItems : recherche to et filtrage exact des destinataires", async () => {
  let requestedUrl = "";
  const result = await fetchEmails(
    "jeton-fictif",
    "contact@ftransport.fr",
    "sentItems",
    "eleve@example.com",
    async (input) => {
      requestedUrl = String(input);
      return Response.json({
        value: [
          message("pertinent", "contact@ftransport.fr", "Eleve@Example.com"),
          message("autre", "contact@ftransport.fr", "autre@example.com"),
        ],
      });
    },
  );

  assertEquals(new URL(requestedUrl).searchParams.get("$search"), '"to:eleve@example.com"');
  assertEquals(result.map((email) => email.id), ["pertinent"]);
});

Deno.test("erreur Graph : refus explicite, jamais une synchronisation vide réussie", async () => {
  await assertRejects(
    () => fetchEmails(
      "jeton-fictif",
      "contact@ftransport.fr",
      "inbox",
      "eleve@example.com",
      async () => new Response("indisponible", { status: 503 }),
    ),
    Error,
    "HTTP 503",
  );
});

Deno.test("sync globale : conserve les 200 messages récents et le tri serveur", async () => {
  let requestedUrl = "";
  const result = await fetchEmails(
    "jeton-fictif",
    "contact@ftransport.fr",
    "sentItems",
    undefined,
    async (input) => {
      requestedUrl = String(input);
      return Response.json({ value: [message("recent", "contact@ftransport.fr")] });
    },
  );

  const url = new URL(requestedUrl);
  assertEquals(url.searchParams.get("$orderby"), "sentDateTime desc");
  assertEquals(url.searchParams.get("$search"), null);
  assertEquals(url.searchParams.get("$top"), "200");
  assertEquals(result.length, 1);
});

Deno.test("sync ciblée : pagination bornée à deux pages de 100 résultats", async () => {
  let calls = 0;
  const result = await fetchEmails(
    "jeton-fictif",
    "contact@ftransport.fr",
    "inbox",
    "eleve@example.com",
    async () => {
      calls += 1;
      return Response.json({
        value: [message(`page-${calls}`, "eleve@example.com")],
        "@odata.nextLink": `https://graph.microsoft.com/page-${calls + 1}`,
      });
    },
  );

  assertEquals(calls, 2);
  assertEquals(result.map((email) => email.id), ["page-1", "page-2"]);
});

Deno.test("lecture Graph bloquée : délai maximal et erreur explicite", async () => {
  await assertRejects(
    () => fetchEmails(
      "jeton-fictif",
      "contact@ftransport.fr",
      "inbox",
      "eleve@example.com",
      (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
      5,
    ),
    Error,
    "délai dépassé",
  );
});
