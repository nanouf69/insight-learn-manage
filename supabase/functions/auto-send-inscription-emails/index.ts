import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONBOARDING_URL = "https://gestion.ftransport.fr/bienvenue";

const FORMATION_LABELS: Record<string, string> = {
  vtc: "VTC",
  "vtc-e": "VTC (E-learning)",
  "vtc-e-presentiel": "VTC (E-learning + Présentiel)",
  taxi: "TAXI",
  "taxi-e": "TAXI (E-learning)",
  "taxi-e-presentiel": "TAXI (E-learning + Présentiel)",
  ta: "Passerelle TA (VTC→TAXI)",
  "ta-e": "Passerelle TA (E-learning)",
  "ta-e-presentiel": "Passerelle TA (E-learning + Présentiel)",
  va: "Passerelle VA (TAXI→VTC)",
  "va-e": "Passerelle VA (E-learning)",
  "va-e-presentiel": "Passerelle VA (E-learning + Présentiel)",
};

// Formation continue VTC/TAXI : jamais de pré-information ni de dossier de bienvenue
const isFormationContinue = (...values: Array<string | null | undefined>) =>
  values.some((v) => {
    const s = (v || "").toLowerCase();
    return s.includes("continue-vtc") || s.includes("continue-taxi") ||
      s.includes("formation-continue-vtc") || s.includes("formation-continue-taxi");
  });

const normalizeDate = (value: unknown): string | null => {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let payload: any = {};
    try { payload = await req.json(); } catch (_) { /* noop */ }
    const explicitIds: string[] | null = Array.isArray(payload?.apprenantIds) ? payload.apprenantIds : null;
    // Bornes de sécurité : au maximum 50 apprenants traités par exécution
    const LIMIT = Math.min(Number(payload?.limit) || 50, 50);

    // 1) Apprenants candidats : créés récemment ou dont la formation a commencé
    const apprenants: any[] = [];
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        let q = admin
          .from("apprenants")
          .select("id, nom, prenom, email, type_apprenant, formation_choisie, statut, date_debut_cours_en_ligne, date_debut_formation")
          .not("email", "is", null)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (explicitIds) q = q.in("id", explicitIds);
        const { data, error } = await q;
        if (error) throw error;
        apprenants.push(...(data || []));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const eligibles = apprenants.filter((a) => {
      if (isFormationContinue(a.formation_choisie, a.type_apprenant)) return false;
      const statut = (a.statut || "").toLowerCase();
      if (["annule", "annulé", "abandon", "desinscrit", "désinscrit", "prospect"].some((s) => statut.includes(s))) return false;
      if (explicitIds) return true;
      const debut = normalizeDate(a.date_debut_cours_en_ligne) ?? normalizeDate(a.date_debut_formation);
      return !!debut; // une date d'entrée en formation est renseignée
    });

    // 2) Emails déjà envoyés (pré-information / bienvenue)
    const ids = eligibles.map((a) => a.id);
    const hasPreInfo = new Set<string>();
    const hasBienvenue = new Set<string>();
    for (let i = 0; i < ids.length; i += 100) {
      const slice = ids.slice(i, i + 100);
      let from = 0;
      while (true) {
        const { data, error } = await admin
          .from("emails")
          .select("apprenant_id, subject")
          .in("apprenant_id", slice)
          .eq("type", "sent")
          .order("id", { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        for (const e of data || []) {
          const s = (e.subject || "").toLowerCase();
          if (s.includes("pré-information") || s.includes("pre-information")) hasPreInfo.add(e.apprenant_id);
          if (s.includes("bienvenue chez ftransport")) hasBienvenue.add(e.apprenant_id);
        }
        if (!data || data.length < 1000) break;
        from += 1000;
      }
    }

    const todo = eligibles
      .filter((a) => !hasPreInfo.has(a.id) || !hasBienvenue.has(a.id))
      .slice(0, LIMIT);

    const send = async (apprenantId: string, to: string, subject: string, body: string) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-outlook-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
        body: JSON.stringify({ action: "send", apprenantId, userEmail: "contact@ftransport.fr", to, subject, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`);
    };

    const results: any[] = [];
    for (const a of todo) {
      const rawType = (a.type_apprenant || "").toLowerCase().split(" + ")[0].trim();
      const baseType = rawType.replace(/-e-presentiel$/, "").replace(/-e$/, "");
      const label = FORMATION_LABELS[rawType] || (rawType ? rawType.toUpperCase() : "votre formation");
      const r: any = { id: a.id, email: a.email, preInfo: false, bienvenue: false };

      try {
        if (!hasPreInfo.has(a.id) && ["vtc", "taxi", "ta", "va"].includes(baseType)) {
          const { data: tpl } = await admin
            .from("email_templates")
            .select("subject_template, body_template")
            .eq("id", `pre-information-${baseType}-sans-date`)
            .maybeSingle();
          if (tpl) {
            const vars: Record<string, string> = {
              "{{prenom}}": a.prenom || "",
              "{{nom}}": a.nom || "",
              "{{email}}": a.email || "",
              "{{apprenant_id}}": a.id,
              "{{formation}}": a.formation_choisie || label,
              "{{date_debut}}": "",
            };
            let subject = tpl.subject_template as string;
            let body = tpl.body_template as string;
            for (const [k, v] of Object.entries(vars)) {
              subject = subject.split(k).join(v);
              body = body.split(k).join(v);
            }
            await send(a.id, a.email, subject, body);
            r.preInfo = true;
          }
        }
      } catch (e) {
        r.preInfoError = String((e as Error).message);
      }

      try {
        if (!hasBienvenue.has(a.id)) {
          const subject = `Bienvenue chez Ftransport - ${a.prenom} ${a.nom}`;
          const body = `<p>Bonjour ${a.prenom} ${a.nom},</p>
<p>Nous avons le plaisir de vous confirmer votre inscription à la formation <strong>${label}</strong>.</p>
<p>🚨 <strong style="color: #dc2626;">IMPORTANT : Afin de valider définitivement votre inscription à l'examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l'examen.</strong></p>
<p>👉 <strong><a href="${ONBOARDING_URL}">CLIQUEZ ICI POUR COMPLÉTER VOTRE DOSSIER D'INSCRIPTION</a></strong></p>
<p>⚠️ <strong>Ce dossier est OBLIGATOIRE. Sans celui-ci complété, vous ne pourrez pas effectuer votre formation.</strong></p>
<p>Pour toute question :<br>📞 04 28 29 60 91<br>📧 contact@ftransport.fr</p>
<p>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon</p>`;
          await send(a.id, a.email, subject, body);
          r.bienvenue = true;
        }
      } catch (e) {
        r.bienvenueError = String((e as Error).message);
      }

      results.push(r);
    }

    return new Response(JSON.stringify({ success: true, traites: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[auto-send-inscription-emails]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
