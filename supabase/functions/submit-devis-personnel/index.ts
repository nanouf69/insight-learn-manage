import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      // identité
      civilite, prenom, nom, email, telephone,
      adresse, codePostal, ville, dateNaissance,
      // devis
      numDevis, dateToday, fileName, hasSigned,
      typeFinancement, financeurNom, financeurSiret,
      formation, // { id, label, prix, type, designation, duree, agrement }
      dateDebutSouhaitee, creneauSouhaite,
      reponsesCritiques, // string[]
      pdfBase64, // base64 of PDF
    } = body || {};

    if (!nom || !prenom || !email || !formation || !pdfBase64 || !numDevis) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeFile = (fileName || `${numDevis}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `public/${numDevis}_${safeFile}`;
    const pdfBytes = base64ToBytes(pdfBase64);

    let uploadOk = false;
    for (let attempt = 0; attempt < 3 && !uploadOk; attempt++) {
      const { error: uploadErr } = await supabase.storage
        .from("devis")
        .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (!uploadErr) uploadOk = true;
      else console.error(`Upload error (essai ${attempt + 1}):`, uploadErr);
    }

    const { data: urlData } = supabase.storage.from("devis").getPublicUrl(storagePath);
    const fichierUrl = uploadOk ? (urlData?.publicUrl || "") : "";


    // ── Apprenant : trouver ou créer ──
    const { data: matched } = await supabase
      .from("apprenants")
      .select("id")
      .ilike("nom", String(nom).trim())
      .ilike("prenom", String(prenom).trim())
      .limit(1)
      .maybeSingle();

    let apprenantId: string | null = matched?.id ?? null;

    if (!apprenantId) {
      const { data: newApp, error: insErr } = await supabase
        .from("apprenants")
        .insert({
          nom: String(nom).trim(),
          prenom: String(prenom).trim(),
          civilite,
          email: String(email).trim(),
          telephone: String(telephone || "").trim(),
          adresse: adresse?.trim() || null,
          code_postal: codePostal?.trim() || null,
          ville: ville?.trim() || null,
          date_naissance: dateNaissance || null,
          formation_choisie: formation.label,
          montant_ttc: formation.prix,
          mode_financement: typeFinancement === "organisme" ? "organisme" : "personnel",
          organisme_financeur: typeFinancement === "organisme" ? financeurNom : null,
          statut: "particulier",
          type_apprenant: formation.type === "taxi" ? "TAXI" : "VTC",
          notes: `Devis ${numDevis} généré le ${dateToday}` +
            (typeFinancement === "organisme" ? `\nFinanceur: ${financeurNom} (${financeurSiret})` : ""),
        } as any)
        .select("id")
        .single();
      if (insErr) console.error("Apprenant insert error:", insErr);
      apprenantId = newApp?.id ?? null;
    }

    // ── devis_envois ──
    if (apprenantId) {
      const { data: devisRow } = await supabase.from("devis_envois").insert({
        apprenant_id: apprenantId,
        modele: "devis_personnel",
        montant: `${formation.prix} €`,
        formation: formation.label,
        fichier_url: fichierUrl,
        devis_signe_url: hasSigned ? fichierUrl : null,
        signed_at: hasSigned ? new Date().toISOString() : null,
        statut: hasSigned ? "signe" : "telecharge",
      } as any).select("id").single();

      // ── enrichit la trace Formulaires créée automatiquement (trigger) ──
      if (devisRow?.id) {
        try {
          const richData = {
            devis_envoi_id: devisRow.id,
            numero_devis: numDevis,
            date_devis: dateToday,
            formation: formation.label,
            montant: `${formation.prix} €`,
            duree: formation.duree || null,
            statut: hasSigned ? "Signé" : "Rempli (non signé)",
            signe: !!hasSigned,
            fichier_url: fichierUrl || null,
            civilite: civilite || null,
            nom, prenom, email,
            telephone: telephone || null,
            adresse: adresse || null,
            code_postal: codePostal || null,
            ville: ville || null,
            date_naissance: dateNaissance || null,
            mode_financement: typeFinancement === "organisme" ? "Organisme" : "Personnel",
            financeur: typeFinancement === "organisme" ? financeurNom : null,
            financeur_siret: typeFinancement === "organisme" ? financeurSiret : null,
            date_debut_souhaitee: dateDebutSouhaitee || null,
            creneau_souhaite: creneauSouhaite || null,
            points_vigilance: Array.isArray(reponsesCritiques) ? reponsesCritiques : [],
          };
          const { data: existing } = await supabase
            .from("apprenant_documents_completes")
            .select("id, donnees")
            .eq("apprenant_id", apprenantId)
            .eq("type_document", "devis-personnel")
            .eq("donnees->>devis_envoi_id", devisRow.id)
            .limit(1)
            .maybeSingle();
          if (existing?.id) {
            await supabase.from("apprenant_documents_completes")
              .update({ donnees: { ...(existing.donnees || {}), ...richData } } as any)
              .eq("id", existing.id);
          }
        } catch (e) {
          console.warn("Enrichissement trace documents_completes échoué:", e);
        }
      }



      // ── lien session ──
      try {
        const range = parseFrenchDateRange(dateDebutSouhaitee || "");
        if (range) {
          const typeApp = formation.type === "taxi" ? "TAXI" : "VTC";
          const { data: sessionMatch } = await supabase
            .from("sessions")
            .select("id, types_apprenant")
            .eq("date_debut", range.date_debut)
            .eq("date_fin", range.date_fin)
            .limit(20);

          const session = (sessionMatch || []).find((s: any) =>
            Array.isArray(s.types_apprenant) ? s.types_apprenant.includes(typeApp) : true
          ) || (sessionMatch || [])[0];

          if (session?.id) {
            const { data: existing } = await supabase
              .from("session_apprenants")
              .select("id")
              .eq("session_id", session.id)
              .eq("apprenant_id", apprenantId)
              .maybeSingle();
            if (!existing) {
              await supabase.from("session_apprenants").insert({
                session_id: session.id,
                apprenant_id: apprenantId,
                date_debut: range.date_debut,
                date_fin: range.date_fin,
                mode_financement: typeFinancement === "organisme" ? "organisme" : "personnel",
                montant_total: formation.prix,
                notes: `Inscription via devis ${numDevis} (${creneauSouhaite || "créneau non précisé"})`,
              } as any);
            }
          } else {
            console.warn("Aucune session trouvée pour", range, typeApp);
          }
        }
      } catch (e) {
        console.warn("Lien session_apprenants échoué:", e);
      }
    }

    // ── Emails bienvenue + pré-information ──
    if (apprenantId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const onboardingUrl = "https://insight-learn-manage.lovable.app/bienvenue";
        const preInfoTemplateId = formation.type === "taxi" ? "pre-information-taxi" : "pre-information-vtc";

        const sendTemplate = async (templateId: string) => {
          const { data: tpl } = await supabase
            .from("email_templates")
            .select("subject_template, body_template")
            .eq("id", templateId)
            .single();
          if (!tpl) {
            console.warn("Template introuvable:", templateId);
            return;
          }
          const fill = (s: string) => (s || "")
            .replace(/\{\{prenom\}\}/g, prenom || "")
            .replace(/\{\{nom\}\}/g, nom || "")
            .replace(/\{\{email\}\}/g, email || "")
            .replace(/\{\{formation\}\}/g, formation.label || "")
            .replace(/\{\{apprenant_id\}\}/g, apprenantId || "")
            .replace(/\{\{onboarding_url\}\}/g, onboardingUrl)
            .replace(/\{\{civilite\}\}/g, civilite || "")
            .replace(/\{\{adresse\}\}/g, adresse || "")
            .replace(/\{\{code_postal\}\}/g, codePostal || "")
            .replace(/\{\{ville\}\}/g, ville || "");
          const subject = fill(tpl.subject_template);
          const body = fill(tpl.body_template);

          const sendRes = await fetch(`${supabaseUrl}/functions/v1/sync-outlook-emails`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              action: "send",
              userEmail: "contact@ftransport.fr",
              to: email,
              subject,
              body,
            }),
          });
          const sendData = await sendRes.json().catch(() => ({}));
          if (sendData?.success) {
            await supabase.from("emails").insert({
              apprenant_id: apprenantId,
              type: "sent",
              subject,
              body_html: body,
              sender_email: "contact@ftransport.fr",
              recipients: [email],
              sent_at: new Date().toISOString(),
            } as any);
          } else {
            console.warn(`Envoi ${templateId} échoué:`, sendData);
          }
        };

        await sendTemplate("bienvenue");
        await sendTemplate(preInfoTemplateId);
      } catch (e) {
        console.warn("Envoi emails bienvenue/pré-info échoué:", e);
      }
    }

    // ── alerte système ──
    try {
      const alerteCritique = Array.isArray(reponsesCritiques) && reponsesCritiques.length > 0;
      await supabase.from("alertes_systeme").insert({
        type: alerteCritique ? "warning" : "devis_signe",
        titre: alerteCritique
          ? `⚠️ Devis signé avec alertes — ${prenom} ${nom}`
          : `🖋️ Nouveau devis signé — ${prenom} ${nom}`,
        message: `${formation.label} • ${formation.prix} € • ${typeFinancement === "organisme" ? `Financeur : ${financeurNom}` : "Financement personnel"}${dateDebutSouhaitee ? ` • Session : ${dateDebutSouhaitee}` : ""}${alerteCritique ? ` • ⚠️ ${(reponsesCritiques as string[]).join(", ")}` : ""}`,
        details: `Devis ${numDevis}\nEmail: ${email}\nTéléphone: ${telephone}\nFichier: ${fichierUrl}`,
      } as any);
    } catch (e) {
      console.warn("Alerte échouée:", e);
    }

    return new Response(
      JSON.stringify({ success: true, apprenantId, fichierUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("submit-devis-personnel error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erreur serveur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const FR_MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, "février": 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, "août": 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, "décembre": 12,
};
function parseFrenchDateRange(label: string): { date_debut: string; date_fin: string } | null {
  if (!label) return null;
  const s = label.toLowerCase().normalize("NFD").replace(/\u0300|\u0301|\u0302|\u0308/g, "");
  const m = s.match(/du\s+(\d{1,2})(?:\s+([a-zéûôî]+))?\s+au\s+(\d{1,2})\s+([a-zéûôî]+)\s+(\d{4})/);
  if (!m) return null;
  const d1 = parseInt(m[1], 10);
  const mo1 = m[2] ? FR_MONTHS[m[2]] : undefined;
  const d2 = parseInt(m[3], 10);
  const mo2 = FR_MONTHS[m[4]];
  const yyyy = parseInt(m[5], 10);
  if (!mo2) return null;
  const month1 = mo1 ?? mo2;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date_debut: `${yyyy}-${pad(month1)}-${pad(d1)}`,
    date_fin: `${yyyy}-${pad(mo2)}-${pad(d2)}`,
  };
}
