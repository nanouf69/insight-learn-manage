// Pixel de suivi d'ouverture des emails FTRANSPORT
// Appelé par le navigateur/messagerie du destinataire lors de l'ouverture de l'email.
import { createClient } from "npm:@supabase/supabase-js@2";

const GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

const pixelResponse = () =>
  new Response(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Access-Control-Allow-Origin": "*",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return pixelResponse();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) return pixelResponse();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await supabase
      .from("email_accuses")
      .select("id, opened_at, open_count, statut")
      .eq("id", id)
      .maybeSingle();

    if (row) {
      const now = new Date().toISOString();
      await supabase
        .from("email_accuses")
        .update({
          statut: "ouvert",
          opened_at: row.opened_at ?? now,
          last_opened_at: now,
          open_count: (row.open_count ?? 0) + 1,
        })
        .eq("id", id);
    }
  } catch (err) {
    console.error("[email-track-open]", err);
  }

  return pixelResponse();
});
