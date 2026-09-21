import { supabase } from "@/integrations/supabase/client";
import type {
  PrestataireDossier,
  PrestataireEnvoi,
  PrestataireHistorique,
  PrestatairePiece,
  PrestataireStatut,
  TypeEnvoi,
} from "./types";
import { DEFAULT_ENTREPRISE, DEFAULT_TEMPLATES, type EntrepriseInfos, type TemplateDef } from "./templates";

export const BUCKET = "prestataire-justificatifs";

export async function loadDossiers(): Promise<PrestataireDossier[]> {
  const { data, error } = await supabase
    .from("prestataire_dossiers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrestataireDossier[];
}

export async function loadEnvois(dossierId: string): Promise<PrestataireEnvoi[]> {
  const { data, error } = await supabase
    .from("prestataire_envois")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PrestataireEnvoi[];
}

export async function loadAllEnvois(): Promise<PrestataireEnvoi[]> {
  const { data, error } = await supabase
    .from("prestataire_envois")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PrestataireEnvoi[];
}

export async function loadPieces(dossierId: string): Promise<PrestatairePiece[]> {
  const { data, error } = await supabase
    .from("prestataire_pieces")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrestatairePiece[];
}

export async function loadHistorique(dossierId: string): Promise<PrestataireHistorique[]> {
  const { data, error } = await supabase
    .from("prestataire_historique")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PrestataireHistorique[];
}

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return { id: data.user?.id ?? null, email: data.user?.email ?? null };
}

export async function logHistorique(
  dossierId: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  const u = await currentUser();
  await supabase.from("prestataire_historique").insert({
    dossier_id: dossierId,
    action,
    details: details as never,
    utilisateur: u.id,
    utilisateur_email: u.email,
  });
}

export async function saveDossier(
  values: Partial<PrestataireDossier>,
  id?: string,
): Promise<PrestataireDossier> {
  const u = await currentUser();
  if (id) {
    const { data, error } = await supabase
      .from("prestataire_dossiers")
      .update(values as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    await logHistorique(id, "Dossier modifié", { champs: Object.keys(values) });
    return data as unknown as PrestataireDossier;
  }
  const { data, error } = await supabase
    .from("prestataire_dossiers")
    .insert({ ...values, created_by: u.id } as never)
    .select("*")
    .single();
  if (error) throw error;
  const created = data as unknown as PrestataireDossier;
  await logHistorique(created.id, "Dossier créé", {});
  return created;
}

export async function uploadPiece(
  dossierId: string,
  file: File,
  typePiece: string,
  titre?: string,
): Promise<void> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const chemin = `${dossierId}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(chemin, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw upErr;
  const u = await currentUser();
  const { error } = await supabase.from("prestataire_pieces").insert({
    dossier_id: dossierId,
    type_piece: typePiece,
    titre: titre || file.name,
    chemin,
    nom_fichier: file.name,
    content_type: file.type || null,
    taille: file.size,
    created_by: u.id,
  });
  if (error) throw error;
  await logHistorique(dossierId, "Justificatif ajouté", { type: typePiece, fichier: file.name });
}

export async function getPieceUrl(chemin: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export const STATUT_APRES_ENVOI: Record<TypeEnvoi, PrestataireStatut> = {
  demande: "demande_envoyee",
  relance1: "relance_1_envoyee",
  relance2: "relance_2_envoyee",
  mise_en_demeure: "mise_en_demeure_envoyee",
};

/**
 * Crée l'entrée d'historique (brouillon -> envoi en cours), déclenche l'envoi réel,
 * puis reflète le résultat. Le statut du dossier n'avance QUE si l'envoi a réussi.
 */
export async function envoyerEmail(params: {
  dossier: PrestataireDossier;
  typeEnvoi: TypeEnvoi;
  objet: string;
  corpsTexte: string;
  corpsHtml: string;
  destinataire: string;
}): Promise<{ success: boolean; error?: string; envoiId: string }> {
  const u = await currentUser();
  const { data: envoi, error } = await supabase
    .from("prestataire_envois")
    .insert({
      dossier_id: params.dossier.id,
      type_envoi: params.typeEnvoi,
      destinataire_nom:
        [params.dossier.prestataire_prenom, params.dossier.prestataire_nom].filter(Boolean).join(" ") ||
        params.dossier.raison_sociale,
      destinataire_email: params.destinataire,
      objet: params.objet,
      corps_html: params.corpsHtml,
      statut: "en_cours",
      declenche_par: u.id,
      declenche_par_email: u.email,
    })
    .select("*")
    .single();
  if (error) throw error;

  const envoiId = (envoi as { id: string }).id;
  const { data, error: fnError } = await supabase.functions.invoke(
    "send-prestataire-facture-request",
    { body: { envoiId } },
  );

  const ok = !fnError && (data as { success?: boolean } | null)?.success === true;
  const message = fnError?.message ?? (data as { error?: string } | null)?.error ?? null;

  if (ok) {
    await supabase
      .from("prestataire_dossiers")
      .update({
        statut: STATUT_APRES_ENVOI[params.typeEnvoi],
        derniere_action_le: new Date().toISOString(),
      })
      .eq("id", params.dossier.id);
    await logHistorique(params.dossier.id, "E-mail envoyé", {
      type: params.typeEnvoi,
      objet: params.objet,
      destinataire: params.destinataire,
      envoi_id: envoiId,
    });
  } else {
    await logHistorique(params.dossier.id, "Échec d'envoi d'e-mail", {
      type: params.typeEnvoi,
      destinataire: params.destinataire,
      erreur: message,
      envoi_id: envoiId,
    });
  }

  return { success: ok, error: message ?? undefined, envoiId };
}

// ---- Modèles d'e-mails + infos entreprise ----

export interface TemplatesBundle {
  templates: Record<string, TemplateDef>;
  signature: string;
  entreprise: EntrepriseInfos;
}

export async function loadTemplates(): Promise<TemplatesBundle> {
  const { data } = await supabase.from("prestataire_email_templates").select("*");
  const rows = (data ?? []) as { id: string; objet: string; corps: string }[];
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const templates: Record<string, TemplateDef> = {};
  for (const key of ["demande", "relance1", "relance2", "mise_en_demeure"]) {
    const saved = byId[key];
    const def = DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES];
    templates[key] = {
      objet: saved?.objet || def.objet,
      corps: saved?.corps || def.corps,
    };
  }
  const signature = byId["signature"]?.corps || DEFAULT_TEMPLATES.signature.corps;
  let entreprise: EntrepriseInfos = DEFAULT_ENTREPRISE;
  if (byId["entreprise"]?.corps) {
    try {
      entreprise = { ...DEFAULT_ENTREPRISE, ...JSON.parse(byId["entreprise"].corps) };
    } catch {
      entreprise = DEFAULT_ENTREPRISE;
    }
  }
  return { templates, signature, entreprise };
}

export async function saveTemplate(id: string, objet: string, corps: string) {
  const { error } = await supabase
    .from("prestataire_email_templates")
    .upsert({ id, objet, corps, updated_at: new Date().toISOString() } as never);
  if (error) throw error;
}
