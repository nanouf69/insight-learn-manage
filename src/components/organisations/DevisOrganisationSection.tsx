import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Download, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { DEVIS_TEMPLATES } from "@/components/crm/apprenant-sections/DevisSection";

function formatDateFr(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy");
}

interface Props {
  organisation: any;
}

export function DevisOrganisationSection({ organisation }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [templateId, setTemplateId] = useState<string>("");
  const [nbParticipants, setNbParticipants] = useState<number>(1);
  const [prixUnitaire, setPrixUnitaire] = useState<number>(0);
  const [dateDevis, setDateDevis] = useState<string>(today);
  const [dateValidite, setDateValidite] = useState<string>(
    format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
  );
  const [datesFormation, setDatesFormation] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);

  const chargerHistorique = useCallback(async () => {
    if (!organisation?.id) return;
    const { data } = await supabase
      .from("devis_envois")
      .select("id, token, modele, montant, statut, signed_at, devis_signe_url, fichier_url, created_at")
      .eq("organisation_id", organisation.id)
      .order("created_at", { ascending: false });
    setHistorique(data || []);
  }, [organisation?.id]);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  const tmpl = useMemo(() => DEVIS_TEMPLATES.find((t) => t.id === templateId), [templateId]);
  const total = (prixUnitaire || 0) * (nbParticipants || 0);

  const onSelectTemplate = (id: string) => {
    setTemplateId(id);
    const t = DEVIS_TEMPLATES.find((x) => x.id === id);
    if (t) setPrixUnitaire(t.prix);
  };

  const buildDocx = async (): Promise<Blob> => {
    if (!tmpl) throw new Error("Veuillez sélectionner un modèle de devis");
    const response = await fetch(`/devis/${tmpl.file}`);
    if (!response.ok) throw new Error("Impossible de charger le modèle DOCX");
    const arrayBuffer = await response.arrayBuffer();

    const payload = {
      client_nom: organisation.nom || "",
      client_adresse1: organisation.adresse || "",
      client_codep: organisation.code_postal || "",
      client_ville: organisation.ville || "",
      client_tel: organisation.telephone || "",
      client_mail: organisation.email || "",
      client_email: organisation.email || "",
      client_siret: organisation.siret || "",
      devis_date: formatDateFr(dateDevis),
      devis_ligne_produit_date1: datesFormation || "",
      montant: String(total),
      formation: tmpl.label,
      quantite: String(nbParticipants),
    };

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
      nullGetter() {
        return "";
      },
    });
    doc.render(payload);
    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  const telecharger = async () => {
    setGenerating(true);
    try {
      const blob = await buildDocx();
      const safeNom = (organisation.nom || "organisation").replace(/[^a-zA-Z0-9._-]/g, "_");
      saveAs(blob, `Devis_${safeNom}_${tmpl?.id}_${format(new Date(), "ddMMyyyy")}.docx`);
      toast.success("Devis DOCX téléchargé");
    } catch (e: any) {
      toast.error(e?.message || "Génération impossible");
    } finally {
      setGenerating(false);
    }
  };

  const envoyerParMail = async () => {
    if (!organisation.email) {
      toast.error("Cette organisation n'a pas d'email");
      return;
    }
    setSending(true);
    try {
      const blob = await buildDocx();
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as any);
      }
      const b64 = btoa(bin);

      const safeNom = (organisation.nom || "organisation").replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `Devis_${safeNom}_${tmpl?.id}_${format(new Date(), "ddMMyyyy")}.docx`;

      // Archivage du devis dans le stockage
      const storagePath = `organisations/${organisation.id}_${tmpl?.id}_${format(new Date(), "yyyyMMddHHmmss")}.docx`;
      await supabase.storage.from("devis").upload(storagePath, blob, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
      const { data: urlData } = supabase.storage.from("devis").getPublicUrl(storagePath);

      // Enregistrement de l'envoi avec token de signature
      const { data: devisRecord } = await supabase
        .from("devis_envois")
        .insert({
          organisation_id: organisation.id,
          client_nom: organisation.nom || "",
          client_email: organisation.email || "",
          client_adresse: organisation.adresse || "",
          client_code_postal: organisation.code_postal || "",
          client_ville: organisation.ville || "",
          client_telephone: organisation.telephone || "",
          modele: tmpl?.label || "devis",
          montant: `${total} €`,
          formation: tmpl?.label || "",
          fichier_url: urlData.publicUrl,
          statut: "envoye",
          dates_formation: datesFormation || null,
          date_devis: dateDevis || null,
          date_validite: dateValidite || null,
        })
        .select("token")
        .single();

      const signLink = devisRecord?.token
        ? `${window.location.origin}/devis?token=${devisRecord.token}`
        : "";

      const subject = `Votre devis FTRANSPORT — ${tmpl?.label}`;
      const htmlBody = `<p>Bonjour,</p>
<p>Veuillez trouver ci-joint le devis établi au nom de <strong>${organisation.nom}</strong>.</p>
<p>Formation : <strong>${tmpl?.label}</strong><br/>
Nombre de participants : <strong>${nbParticipants}</strong><br/>
Montant total : <strong>${total} € TTC</strong> (non assujetti à la TVA)</p>
${datesFormation ? `<p>Dates de formation : <strong>${datesFormation}</strong></p>` : ""}
${dateValidite ? `<p>Devis valable jusqu'au ${formatDateFr(dateValidite)}.</p>` : ""}
${signLink ? `<p>📝 <strong>Pour consulter et signer votre devis en ligne :</strong><br/>
<a href="${signLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:8px;">Accéder à mon devis et le signer</a></p>` : ""}
<p>Pour toute question : 04.28.29.60.91 — contact@ftransport.fr</p>
<p>Cordialement,<br/>FTRANSPORT</p>`;


      for (const to of [organisation.email, "contact@ftransport.fr"]) {
        const { error } = await supabase.functions.invoke("send-document-email", {
          body: {
            recipientEmail: to,
            recipientName: organisation.nom,
            subject,
            htmlBody,
            attachmentName: fileName,
            attachmentBase64: b64,
            attachmentContentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
        });
        if (error) throw error;
      }

      await supabase.from("emails").insert({
        subject,
        body_html: htmlBody,
        body_preview: `Devis ${tmpl?.label} — ${total} €`,
        sender_email: "contact@ftransport.fr",
        recipients: [organisation.email],
        type: "sent",
        is_read: true,
        sent_at: new Date().toISOString(),
      });

      await chargerHistorique();
      toast.success(`Devis envoyé à ${organisation.email}`);
    } catch (e: any) {
      toast.error("Envoi impossible : " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Devis au nom de {organisation.nom}
      </h4>

      <div className="space-y-2">
        <Label>Modèle de devis</Label>
        <Select value={templateId} onValueChange={onSelectTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un modèle de devis" />
          </SelectTrigger>
          <SelectContent>
            {DEVIS_TEMPLATES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label} — {t.prix} €
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre de participants</Label>
          <Input
            type="number"
            min={1}
            value={nbParticipants}
            onChange={(e) => setNbParticipants(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
        <div className="space-y-2">
          <Label>Prix unitaire (€)</Label>
          <Input
            type="number"
            min={0}
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Date du devis</Label>
          <Input type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Valable jusqu'au</Label>
          <Input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Dates de formation (optionnel)</Label>
          <Input
            placeholder="ex : du 5 au 16 octobre 2026"
            value={datesFormation}
            onChange={(e) => setDatesFormation(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md bg-background border p-3 text-sm">
        <p className="text-muted-foreground">
          Client : <span className="font-medium text-foreground">{organisation.nom}</span>
          {organisation.siret ? ` — SIRET ${organisation.siret}` : ""}
        </p>
        <p className="text-muted-foreground">
          Adresse :{" "}
          <span className="font-medium text-foreground">
            {[organisation.adresse, organisation.code_postal, organisation.ville].filter(Boolean).join(", ") || "—"}
          </span>
        </p>
        <p className="mt-1 font-semibold">
          Total : {total} € TTC ({nbParticipants} × {prixUnitaire} €)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={telecharger} disabled={!tmpl || generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger le devis DOCX
        </Button>
        <Button
          variant="outline"
          onClick={envoyerParMail}
          disabled={!tmpl || sending || !organisation.email}
          className="gap-2"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer le devis par email
        </Button>
      </div>

      {historique.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <h5 className="text-sm font-semibold">Devis envoyés</h5>
          {historique.map((d) => (
            <div
              key={d.id}
              className="rounded-md bg-background border p-3 text-sm flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-medium">{d.modele}</p>
                <p className="text-muted-foreground text-xs">
                  Envoyé le {formatDateFr(d.created_at)}
                  {d.montant ? ` — ${d.montant}` : ""}
                  {d.signed_at ? ` — signé le ${formatDateFr(d.signed_at)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {d.statut === "signe" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Signé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    <Clock className="h-4 w-4" /> En attente de signature
                  </span>
                )}
                {d.devis_signe_url && (
                  <a
                    href={d.devis_signe_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-primary"
                  >
                    Voir la signature
                  </a>
                )}
                {d.fichier_url && (
                  <a
                    href={d.fichier_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-muted-foreground"
                  >
                    Devis
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
