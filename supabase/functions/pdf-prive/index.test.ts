const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
  if (url.origin !== "https://backend.test") throw new Error("Origine externe interdite");
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length) } });
};

let handler: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { value: (callback: typeof handler) => { handler = callback; }, configurable: true });
Deno.env.set("SUPABASE_URL", "https://backend.test");
await import("./index.ts");
Object.defineProperty(Deno, "serve", { value: originalServe, configurable: true });

const appel = (signedUrl: string) => handler(new Request("https://app.test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ signed_url: signedUrl }),
}));

Deno.test("relais limité au stockage privé signé et PDF identique", async () => {
  const reponse = await appel("https://backend.test/storage/v1/object/sign/documents/contrat.pdf?token=fictif");
  const json = await reponse.json();
  if (reponse.status !== 200) throw new Error(`Statut ${reponse.status} : ${JSON.stringify(json)}`);
  const binaire = atob(json.pdf_base64);
  const relu = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  if (JSON.stringify([...relu]) !== JSON.stringify([...pdf])) throw new Error("PDF altéré");
  if (json.taille !== pdf.length) throw new Error("Taille différente");
});

Deno.test("une URL étrangère ou non signée est refusée", async () => {
  if ((await appel("https://example.test/storage/v1/object/sign/documents/contrat.pdf?token=fictif")).status !== 400) throw new Error("Origine acceptée");
  if ((await appel("https://backend.test/storage/v1/object/public/documents/contrat.pdf")).status !== 400) throw new Error("URL publique acceptée");
});

Deno.test("OPTIONS expose les en-têtes CORS", async () => {
  const reponse = await handler(new Request("https://app.test", { method: "OPTIONS" }));
  if (!reponse.headers.has("access-control-allow-origin")) throw new Error("CORS absent");
});

addEventListener("unload", () => { globalThis.fetch = originalFetch; });
