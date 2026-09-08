// Webhook Resend : remise, échec (bounce) et plainte des emails FTRANSPORT
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const payload = await req.json();
    const type: string = payload?.type ?? "";
    const messageId: string | undefined = payload?.data?.email_id ?? payload?.data?.id;
    if (!messageId) {
      return new Response(JSON.stringify({ ignored: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await supabase
      .from("email_accuses")
      .select("id, statut")
      .eq("provider_message_id", messageId)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ ignored: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};

    if (type === "email.delivered") {
      update.delivered_at = now;
      if (row.statut === "envoye") update.statut = "remis";
    } else if (type === "email.bounced" || type === "email.delivery_delayed") {
      if (type === "email.bounced") {
        update.statut = "echec";
        update.failed_at = now;
        update.erreur =
          payload?.data?.bounce?.message ?? payload?.data?.reason ?? "Email non délivré (rebond)";
      }
    } else if (type === "email.complained") {
      update.statut = "echec";
      update.failed_at = now;
      update.erreur = "Marqué comme indésirable par le destinataire";
    } else if (type === "email.opened") {
      update.statut = "ouvert";
      update.last_opened_at = now;
      update.opened_at = now;
    }

    if (Object.keys(update).length > 0) {
      await supabase.from("email_accuses").update(update).eq("id", row.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[email-webhook]", err);
    return new Response(JSON.stringify({ error: "invalid payload" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
