// Accès TEMPORAIRE au seul élève fictif « FICTIF – ESSAI IA » (contrôle visuel).
// - réservé aux administrateurs ;
// - verrouillé sur l'identifiant de l'élève fictif (aucun autre apprenant possible) ;
// - adresse technique non routable (.invalid) : aucun e-mail ne peut partir ;
// - mot de passe aléatoire jamais stocké ni transmis : seule une session est renvoyée.
import { createClient } from "npm:@supabase/supabase-js@2";

const FICTIF_ID = "4ff21547-36f7-49e7-b817-c399c637bd5c";
const EMAIL_TECHNIQUE = "essai-ia-fictif@ftransport.invalid";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "non authentifié" }, 401);
  const { data: estAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!estAdmin) return json({ error: "réservé aux administrateurs" }, 403);

  const { data: app } = await admin.from("apprenants").select("id, nom, prenom, auth_user_id").eq("id", FICTIF_ID).maybeSingle();
  if (!app || app.nom !== "FICTIF" || app.prenom !== "ESSAI IA") return json({ error: "élève fictif introuvable" }, 404);

  const mdp = crypto.randomUUID() + crypto.randomUUID();
  let uid = app.auth_user_id as string | null;
  if (!uid) {
    const { data: c, error } = await admin.auth.admin.createUser({ email: EMAIL_TECHNIQUE, password: mdp, email_confirm: true, user_metadata: { is_apprenant: true, fictif: true } });
    if (error) return json({ error: error.message }, 400);
    uid = c.user!.id;
    const { error: e2 } = await admin.from("apprenants").update({ auth_user_id: uid }).eq("id", FICTIF_ID).is("auth_user_id", null);
    if (e2) return json({ error: e2.message }, 400);
  } else {
    const { data: au } = await admin.auth.admin.getUserById(uid);
    if (au?.user?.email !== EMAIL_TECHNIQUE) return json({ error: "compte non fictif : refus" }, 409);
    await admin.auth.admin.updateUserById(uid, { password: mdp });
  }
  const { data: s, error: e3 } = await createClient(url, anon).auth.signInWithPassword({ email: EMAIL_TECHNIQUE, password: mdp });
  if (e3) return json({ error: e3.message }, 400);
  return json({ ok: true, user_id: uid, session: s.session });
});
