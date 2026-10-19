// Régularisation d'émargements passés : autorisation Admin append-only
// (emargement_regularisations) liant UN compte à UN dossier et une liste fermée de créneaux.
// Jamais de remplacement d'une signature existante, jamais d'absence/présence automatique,
// signed_at = horodatage réel du serveur (date_emargement = date du cours).

export type Slot = { date: string; creneau: string };

export const isWeekend = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
};

export const parisToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);

export function verifierDemande(
  reg: { auth_user_id: string; apprenant_id: string; creneaux: Slot[]; expire_le: string } | null,
  userId: string,
  body: Record<string, unknown>,
  now = new Date(),
): { ok: true; slot: Slot } | { ok: false; status: number; error: string } {
  if (!reg) return { ok: false, status: 404, error: "Autorisation introuvable" };
  if (reg.auth_user_id !== userId) return { ok: false, status: 403, error: "Accès refusé" };
  if (new Date(reg.expire_le).getTime() < now.getTime()) return { ok: false, status: 403, error: "Autorisation expirée" };
  if (body.action === "liste") return { ok: true, slot: { date: "", creneau: "" } };
  const date = String(body.date_emargement || "");
  const creneau = String(body.demi_journee || "");
  if (String(body.apprenant_id || "") !== reg.apprenant_id) return { ok: false, status: 403, error: "Dossier non autorisé" };
  if (!reg.creneaux.some((s) => s.date === date && s.creneau === creneau)) return { ok: false, status: 403, error: "Créneau non autorisé" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= parisToday(now)) return { ok: false, status: 403, error: "Date non autorisée" };
  if (isWeekend(date)) return { ok: false, status: 403, error: "Week-end non autorisé" };
  if (body.confirme_presence_creneau !== true) return { ok: false, status: 400, error: "Confirmation de présence requise pour ce créneau" };
  if (body.absent) return { ok: false, status: 400, error: "Absence non saisie par ce formulaire : laissez le créneau non signé" };
  const sig = typeof body.signature_data_url === "string" ? body.signature_data_url : "";
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]{200,}$/.test(sig) || sig.length > 600_000) return { ok: false, status: 400, error: "Signature requise" };
  return { ok: true, slot: { date, creneau } };
}

// deno-lint-ignore no-explicit-any
export async function traiterRegularisation(supabase: any, userId: string, body: Record<string, unknown>) {
  const json = (b: Record<string, unknown>, status = 200) => new Response(JSON.stringify(b), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" },
  });
  const { data: reg, error: regErr } = await supabase.from("emargement_regularisations")
    .select("id, auth_user_id, apprenant_id, session_id, creneaux, expire_le").eq("id", String(body.regularisation_id)).maybeSingle();
  if (regErr) return json({ error: "Lecture de l'autorisation impossible" }, 500);
  const v = verifierDemande(reg, userId, body);
  if (v.ok === false) return json({ error: v.error }, v.status);

  const { data: rows, error: rowsErr } = await supabase.from("emargements_fc")
    .select("id, date_emargement, demi_journee, signature_data_url, absent, signed_at, masque")
    .eq("apprenant_id", reg.apprenant_id);
  if (rowsErr) return json({ error: "Lecture des émargements impossible" }, 500);
  // deno-lint-ignore no-explicit-any
  const filled = (r: any) => r.masque !== true && (Boolean(String(r.signature_data_url || "").trim()) || r.absent === true);

  if (body.action === "liste") {
    const { data: app } = await supabase.from("apprenants").select("prenom, nom").eq("id", reg.apprenant_id).maybeSingle();
    const { data: sess } = await supabase.from("sessions").select("nom").eq("id", reg.session_id).maybeSingle();
    return json({
      apprenant_id: reg.apprenant_id,
      eleve: app ? `${app.prenom ?? ""} ${app.nom ?? ""}`.trim() : null,
      session: sess?.nom ?? null,
      creneaux: (reg.creneaux as Slot[]).map((s) => {
        // deno-lint-ignore no-explicit-any
        const r = (rows || []).find((x: any) => x.date_emargement === s.date && x.demi_journee === s.creneau && filled(x));
        return { ...s, signe: Boolean(r), signed_at: r?.signed_at ?? null };
      }),
    });
  }

  // deno-lint-ignore no-explicit-any
  const sameSlot = (rows || []).filter((x: any) => x.date_emargement === v.slot.date && x.demi_journee === v.slot.creneau);
  if (sameSlot.some(filled)) return json({ success: true, duplicate: true });
  const row = {
    signature_data_url: body.signature_data_url,
    absent: false,
    confirme_presence_creneau: true,
    confirme_identite: true,
    regularisation_id: reg.id,
    signed_at: new Date().toISOString(),
    user_agent: String(body.user_agent || "").slice(0, 500) || null,
  };
  // deno-lint-ignore no-explicit-any
  const vide = sameSlot.find((x: any) => !filled(x) && x.masque !== true);
  const { error } = vide
    ? await supabase.from("emargements_fc").update(row).eq("id", vide.id)
    : await supabase.from("emargements_fc").insert({ ...row, apprenant_id: reg.apprenant_id, user_id: userId, date_emargement: v.slot.date, demi_journee: v.slot.creneau });
  if (error && error.code === "23505") return json({ success: true, duplicate: true });
  if (error) return json({ error: "Enregistrement refusé", code: error.code }, 400);
  return json({ success: true });
}
