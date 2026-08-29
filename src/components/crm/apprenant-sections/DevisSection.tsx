import { useState, useRef, useEffect } from "react";
import { FileText, Download, Plus, Trash2, Eye, CheckCircle2, XCircle, Clock, Receipt, PenLine, RotateCcw, Send, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContratLocationSection } from "./ContratLocationSection";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { buildCanonicalDevisPDF } from "@/lib/pdf/devis-canonical";
import { saveAs } from "file-saver";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

async function getSignedDevisUrl(fichierUrl: string | null, download = false): Promise<string | null> {
  if (!fichierUrl) return null;
  // Extract storage path after "/devis/"
  const match = fichierUrl.match(/\/devis\/(.+)$/);
  const path = match ? decodeURIComponent(match[1]) : fichierUrl;
  const { data, error } = await supabase.storage
    .from("devis")
    .createSignedUrl(path, 3600, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
}

function devisStoragePath(fichierUrl: string | null): string | null {
  if (!fichierUrl) return null;
  const match = fichierUrl.match(/\/devis\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : fichierUrl;
}

async function devisFileExists(fichierUrl: string | null): Promise<boolean> {
  const path = devisStoragePath(fichierUrl);
  if (!path) return false;
  const { data, error } = await supabase.storage.from("devis").createSignedUrl(path, 60);
  return !error && !!data?.signedUrl;
}


function DevisHistorique({ apprenantId, apprenant }: { apprenantId: string; apprenant?: any }) {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const envoyerParMail = async (d: any) => {
    if (!apprenant?.email) {
      toast.error("L'apprenant n'a pas d'email");
      return;
    }
    setSendingId(d.id);
    try {
      const url = await getSignedDevisUrl(d.fichier_url);
      if (!url) throw new Error("Fichier introuvable");
      const resp = await fetch(url);
      const blob = await resp.blob();
      const buf = await blob.arrayBuffer();
      let bin = "";
      const b = new Uint8Array(buf);
      for (let i = 0; i < b.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)) as any);
      }
      const b64 = btoa(bin);
      const signLink = d.token ? `${window.location.origin}/devis?token=${d.token}` : null;
      const subject = `Votre devis FTRANSPORT — ${d.modele}`;
      const htmlBody = `<p>Bonjour ${apprenant.prenom || ''} ${apprenant.nom || ''},</p>
<p>Veuillez trouver ci-joint votre devis${d.montant ? ` d'un montant de <strong>${d.montant}</strong>` : ''}.</p>
${d.dates_formation ? `<p>Dates de formation : <strong>${d.dates_formation}</strong></p>` : ''}
${d.date_validite ? `<p>Valide jusqu'au ${format(new Date(d.date_validite), "dd/MM/yyyy", { locale: fr })}.</p>` : ''}
${signLink ? `<p>Pour signer votre devis en ligne : <a href="${signLink}">${signLink}</a></p>` : ''}
<p>Pour toute question : 04.28.29.60.91 — contact@ftransport.fr</p>
<p>Cordialement,<br/>FTRANSPORT</p>`;
      for (const to of [apprenant.email, "contact@ftransport.fr"]) {
        await supabase.functions.invoke("send-document-email", {
          body: {
            recipientEmail: to,
            recipientName: `${apprenant.prenom || ''} ${apprenant.nom || ''}`.trim(),
            subject,
            htmlBody,
            attachmentName: `devis-${d.modele}-${d.id}.pdf`,
            attachmentBase64: b64,
            attachmentContentType: "application/pdf",
          },
        });
      }
      toast.success(`Devis envoyé à ${apprenant.email}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Envoi impossible: " + (e?.message || e));
    } finally {
      setSendingId(null);
    }
  };

  const [devisEnvoyes, setDevisEnvoyes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("devis_envois")
        .select("*")
        .eq("apprenant_id", apprenantId)
        .order("created_at", { ascending: false });
      setDevisEnvoyes(data || []);
      setLoading(false);
    };
    load();
  }, [apprenantId]);

  if (loading || devisEnvoyes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Devis envoyés ({devisEnvoyes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {devisEnvoyes.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{d.modele}</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyé le {format(new Date(d.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                    {d.montant && ` — ${d.montant}`}
                  </p>
                  {(d.date_devis || d.date_validite) && (
                    <p className="text-xs text-muted-foreground">
                      {d.date_devis && `Devis du ${format(new Date(d.date_devis), "dd/MM/yyyy", { locale: fr })}`}
                      {d.date_devis && d.date_validite && ' · '}
                      {d.date_validite && `valide jusqu'au ${format(new Date(d.date_validite), "dd/MM/yyyy", { locale: fr })}`}
                    </p>
                  )}
                  {d.dates_formation && (
                    <p className="text-xs text-primary font-medium">📅 {d.dates_formation}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {d.statut === "signe" ? (
                  <Badge variant="default" className="bg-green-600 text-xs">Signé</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">En attente</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  title="Voir / télécharger le devis"
                  onClick={async () => {
                    const url = await getSignedDevisUrl(d.fichier_url);
                    if (url) window.open(url, "_blank");
                    else toast.error("Impossible d'ouvrir le devis");
                  }}
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Télécharger"
                  onClick={async () => {
                    const url = await getSignedDevisUrl(d.fichier_url, true);
                    if (url) {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `devis-${d.modele}-${d.id}.pdf`;
                      a.click();
                    } else toast.error("Téléchargement impossible");
                  }}
                >
                  <Download className="w-3 h-3" />
                </Button>
                {d.statut === "signe" && d.devis_signe_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Voir devis signé"
                    onClick={async () => {
                      const url = await getSignedDevisUrl(d.devis_signe_url);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileDown className="w-3 h-3 text-green-600" />
                  </Button>
                )}
                {d.statut !== "signe" && d.token && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Lien de signature"
                    onClick={() => {
                      const link = `${window.location.origin}/devis?token=${d.token}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Lien de signature copié");
                      window.open(link, "_blank");
                    }}
                  >
                    <PenLine className="w-3 h-3 mr-1" /> Signer
                  </Button>
                )}
                {apprenant?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendingId === d.id}
                    title={`Envoyer par mail à ${apprenant.email}`}
                    onClick={() => envoyerParMail(d)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {sendingId === d.id ? "Envoi..." : "Envoyer par mail"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DevisSectionProps {
  apprenant: any;
}

interface LigneDevis {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
}

// ─── DEVIS TEMPLATES DOCX ───
const DEVIS_TEMPLATES = [
  { id: "vtc_complet", label: "Formation VTC complète (théorique + pratique)", file: "Devis_VTC_complet.docx", prix: 1499, emailId: "devis-vtc-complet" },
  { id: "vtc_elearning", label: "Formation VTC E-learning", file: "Devis_VTC_elearning.docx", prix: 1099, emailId: "devis-vtc-elearning" },
  { id: "taxi_elearning_examen", label: "Formation TAXI E-learning avec examen", file: "Devis_TAXI_elearning_avec_examen.docx", prix: 1299, emailId: "devis-taxi-elearning" },
  { id: "ta_elearning", label: "Formation TA (passerelle VTC→TAXI) E-learning", file: "Devis_Ta_elearning.docx", prix: 999, emailId: "devis-ta-elearning" },
  { id: "va_elearning", label: "Formation VA (passerelle TAXI→VTC) E-learning", file: "Devis_VTC_pour_chauffeurs_TAXI.docx", prix: 999, emailId: "devis-va-elearning" },
  { id: "taxi_pratique", label: "Formation pratique TAXI", file: "Devis_TAXI_pratique.docx", prix: 349, emailId: "devis-taxi-pratique" },
  { id: "taxi_mobilite", label: "Formation à la mobilité TAXI (14h)", file: "Devis_TAXI_mobilite.docx", prix: 349, emailId: "devis-taxi-mobilite" },
  { id: "fc_vtc", label: "Formation continue VTC", file: "Devis_formation_continue_VTC.docx", prix: 200, emailId: "devis-fc-vtc" },
  { id: "fc_taxi", label: "Formation continue TAXI", file: "Devis_formation_continue_TAXI.docx", prix: 200, emailId: "devis-fc-taxi" },
  { id: "vtc_sans_frais_examen", label: "Formation VTC sans frais d'examen", file: "Devis_VTC_sans_frais_examen.docx", prix: 1099, emailId: "devis-vtc-sans-frais-examen" },
  { id: "vtc_soir_avec_examen", label: "Formation VTC soir avec examen", file: "Devis_VTC_soir_avec_examen.docx", prix: 1499, emailId: "devis-vtc-soir-avec-examen" },
  { id: "vtc_soir_sans_examen", label: "Formation VTC soir sans examen", file: "Devis_VTC_soir_sans_examen.docx", prix: 1099, emailId: "devis-vtc-soir-sans-examen" },
];

// ─── EMAIL BODY TEMPLATES (per devis type) ───
const DEVIS_EMAIL_BODIES: Record<string, { subject: string; body: string }> = {
  "devis-vtc-complet": {
    subject: "Votre devis Formation VTC complète - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation VTC complète (théorique et pratique).

📋 Détails de la formation :
- Intitulé : Formation VTC
- Durée : 66 heures
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de :
1. Remplir et signer le devis ci-joint
2. Nous renvoyer la fiche d'inscription complétée
3. Joindre les documents justificatifs demandés (pièce d'identité, justificatif de domicile)

📧 Par mail : contact@ftransport.fr
📍 Ou en vous rendant au 86 route de Genas, 69003 Lyon

N'hésitez pas à nous contacter au 04.28.29.60.91 pour toute question.

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-elearning": {
    subject: "Votre devis Formation VTC E-learning - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation VTC E-learning.

📋 Détails de la formation :
- Intitulé : Formation VTC E-learning
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Formation pratique VTC 3h solo ou 6h en groupe + Frais d'examen + Mise à disposition du véhicule
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de :
1. Remplir et signer le devis ci-joint
2. Nous renvoyer la fiche d'inscription complétée
3. Joindre les documents justificatifs demandés

📧 Par mail : contact@ftransport.fr
📍 Ou sur place : 86 route de Genas, 69003 Lyon

N'hésitez pas à nous contacter au 04.28.29.60.91 pour toute question.

Cordialement,
L'équipe Ftransport`,
  },
  "devis-taxi-elearning": {
    subject: "Votre devis Formation TAXI E-learning - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation TAXI E-learning avec examen.

📋 Détails de la formation :
- Intitulé : Formation TAXI E-learning
- Durée : 96h
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Frais d'examen CMA + Mise à disposition du véhicule pour l'examen
- Lieu : LYON
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de nous renvoyer le devis signé avec les justificatifs demandés.

📧 Par mail : contact@ftransport.fr
📍 Sur place : 86 route de Genas, 69003 Lyon
📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-ta-elearning": {
    subject: "Votre devis Formation TA (Passerelle VTC→TAXI) - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation TAXI pour chauffeurs VTC (TA) en E-learning.

📋 Détails :
- Intitulé : Formation passerelle TAXI pour chauffeurs VTC
- Plateforme E-learning : accès 3 mois
- Inclus : Frais d'examen CMA + Formation pratique TAXI + Mise à disposition du véhicule
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-va-elearning": {
    subject: "Votre devis Formation VA (Passerelle TAXI→VTC) - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC pour chauffeurs TAXI (VA) en E-learning.

📋 Détails :
- Intitulé : Formation VTC pour chauffeurs TAXI
- Formation théorique et pratique
- Plateforme E-learning : accès 3 mois
- Inclus : Entrainement pratique VTC + Mise à disposition du véhicule
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-taxi-pratique": {
    subject: "Votre devis Formation pratique TAXI - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation pratique TAXI.

📋 Détails :
- Intitulé : Formation pratique TAXI
- Durée : 6h en groupe ou 3h solo
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-taxi-mobilite": {
    subject: "Votre devis Formation à la mobilité TAXI (14h) - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation à la mobilité TAXI (14h), obligatoire pour exercer votre activité de conducteur de taxi dans un département différent de celui où vous avez obtenu votre examen (arrêté du 11 août 2017, articles 2 à 4).

📋 Détails de la formation :
- Intitulé : Formation à la mobilité TAXI
- Durée : 14 heures en présentiel (2 jours)
- Lieu : LYON (69) - 86 route de Genas, 69003 Lyon
- Centre agréé Préfecture n°69-18-001 - Qualiopi
- Montant : {{montant}} € TTC (non assujetti TVA)

📚 Programme (référentiel annexe I arrêté du 6 avril 2017) :
• Module A - Connaissance du territoire (7h)
  Géographie, axes routiers, gares, aéroports, hôpitaux, administrations, lieux d'intérêt du département.
• Module B - Réglementation locale (7h)
  Arrêtés préfectoraux et municipaux, zones de prise en charge, stationnement, tarifs, obligations professionnelles.

✅ Prérequis :
- Être titulaire de la carte professionnelle de conducteur de taxi depuis au moins 2 ans
- Exercer dans un département différent de celui d'obtention de l'examen

🎓 À l'issue du stage :
- Remise d'une attestation de suivi de la formation à la mobilité (art. 4)
- Transmission par le centre au préfet du département d'origine et au préfet du département de destination
- Délivrance par le préfet de destination d'une autorisation d'exercice

📎 Documents à nous renvoyer avec le devis signé :
1. Devis signé (mention « Lu et approuvé, bon pour acceptation »)
2. Fiche d'inscription complétée
3. Conditions générales de vente signées
4. Copie pièce d'identité (recto/verso)
5. Copie carte professionnelle TAXI
6. Justificatif de domicile de moins de 3 mois
7. Règlement (virement, chèque ou espèces sur place)

📧 contact@ftransport.fr | 📞 04.28.29.60.91
📍 86 route de Genas, 69003 Lyon

Cordialement,
L'équipe Ftransport`,
  },
  "devis-fc-vtc": {
    subject: "Votre devis Formation continue VTC - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation continue obligatoire VTC.

📋 Détails :
- Intitulé : Formation continue VTC
- Durée : 14 heures présentielles
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Cette formation est obligatoire pour le renouvellement de votre carte professionnelle VTC (tous les 5 ans).

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-fc-taxi": {
    subject: "Votre devis Formation continue TAXI - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation continue obligatoire TAXI.

📋 Détails :
- Intitulé : Formation continue TAXI
- Durée : 14 heures présentielles
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Cette formation est obligatoire pour le renouvellement de votre carte professionnelle TAXI (tous les 5 ans).

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-sans-frais-examen": {
    subject: "Votre devis Formation VTC sans frais d'examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC E-learning (sans frais d'examen).

📋 Détails :
- Intitulé : Formation VTC E-learning
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Formation pratique VTC + Mise à disposition du véhicule
- Frais d'examen NON inclus (à votre charge auprès de la CMA)
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-soir-avec-examen": {
    subject: "Votre devis Formation VTC soir avec examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC en cours du soir (avec frais d'examen inclus).

📋 Détails :
- Intitulé : Formation VTC cours du soir
- Plateforme : www.gestion.ftransport.fr/cours
- Inclus : Formation pratique VTC + Frais d'examen CMA + Mise à disposition du véhicule
- Horaires : Cours du soir
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-soir-sans-examen": {
    subject: "Votre devis Formation VTC soir sans examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC en cours du soir (sans frais d'examen).

📋 Détails :
- Intitulé : Formation VTC cours du soir
- Plateforme : www.gestion.ftransport.fr/cours
- Inclus : Formation pratique VTC + Mise à disposition du véhicule
- Frais d'examen NON inclus (à votre charge auprès de la CMA)
- Horaires : Cours du soir
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
};

const FORMATIONS_CATALOGUE = [
  { label: "Formation initiale VTC (sans examen) - 1 099 €", prix: 1099, designation: "Formation initiale VTC - Préparation à la carte professionnelle chauffeur VTC (sans frais d'examen)" },
  { label: "Formation initiale VTC avec frais d'examen - 1 599 €", prix: 1599, designation: "Formation initiale VTC avec frais d'examen - Préparation complète à la carte professionnelle chauffeur VTC" },
  { label: "Formation initiale TAXI (sans examen) - 1 299 €", prix: 1299, designation: "Formation initiale TAXI - Préparation à la carte professionnelle chauffeur de taxi (sans frais d'examen)" },
  { label: "Formation initiale TAXI avec frais d'examen - 1 799 €", prix: 1799, designation: "Formation initiale TAXI avec frais d'examen - Préparation complète à la carte professionnelle chauffeur de taxi" },
  { label: "Formation passerelle TAXI pour chauffeur VTC (TA) - 999 €", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC (TA) - Accès à la carte professionnelle taxi pour titulaires d'une carte VTC" },
  { label: "Formation continue obligatoire VTC - 200 €", prix: 200, designation: "Formation continue obligatoire VTC - Prévention des discriminations et des violences sexuelles et sexistes (14h)" },
  { label: "Formation VTC E-learning - 1 099 €", prix: 1099, designation: "Formation initiale VTC en E-learning - Préparation à la carte professionnelle chauffeur VTC" },
  { label: "Formation VTC E-learning avec examen - 1 599 €", prix: 1599, designation: "Formation initiale VTC en E-learning avec frais d'examen" },
  { label: "Formation TAXI E-learning - 1 299 €", prix: 1299, designation: "Formation initiale TAXI en E-learning" },
  { label: "Formation TA E-learning - 999 €", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC en E-learning (TA)" },
  { label: "Formation VA E-learning - 499 €", prix: 499, designation: "Formation passerelle VTC pour chauffeur TAXI en E-learning (VA)" },
  { label: "Formation pratique TAXI - 349 €", prix: 349, designation: "Formation pratique TAXI - Préparation pratique à l'examen taxi" },
  { label: "Formation mobilité TAXI 14h - 349 €", prix: 349, designation: "Formation mobilité TAXI (14h) - Formation obligatoire de mobilité pour exercer dans un autre département" },
];

/* ─── DATES DE FORMATION CATALOGUE (présentiel) ─── */
const DATES_VTC = [
  "Du 12 au 25 janvier 2026",
  "Du 16 au 30 mars 2026",
  "Du 11 au 24 mai 2026",
  "Du 6 au 19 juillet 2026",
  "Du 14 au 27 septembre 2026",
  "Du 2 au 15 novembre 2026",
];
const DATES_TAXI = [
  "Du 5 au 26 janvier 2026",
  "Du 9 au 30 mars 2026",
  "Du 4 au 25 mai 2026",
  "Du 29 juin au 20 juillet 2026",
  "Du 7 au 28 septembre 2026",
  "Du 26 octobre au 16 novembre 2026",
];

const CGV_TEXT = `CONDITIONS GENERALES DE VENTE - FTRANSPORT

FTRANSPORT est un organisme de formation professionnelle specialise dans le secteur du transport.
Siege social : 86 route de Genas, 69003 Lyon
Numero SIRET : 82346156100018
Numero de declaration d'activite : 84 69 15114 69
(Cet enregistrement ne vaut pas agrement de l'Etat)
Organisme non assujetti a la TVA
Contact : 04.28.29.60.91 | contact@ftransport.fr

DEFINITIONS
CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT
STAGIAIRE : la personne physique ou morale qui participe a une formation
CGV : les conditions generales de vente, detaillees ci-dessous.
OPCO : les organismes paritaires collecteurs agrees charges de collecter et gerer l'effort de formation des entreprises.

ARTICLE 1 - OBJET
Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente.

ARTICLE 2 - DELAI DE RETRACTATION
Conformement a l'article L6353-5 du Code du travail, le Client beneficie d'un delai de retractation de dix jours a compter de la conclusion du contrat de formation professionnelle.
Le Client peut exercer son droit de retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT a l'adresse suivante : 86 route de Genas, 69003 Lyon, ou par e-mail a : contact@ftransport.fr
Aucun paiement ne sera exige du Client avant l'expiration de ce delai de retractation.

ARTICLE 3 - CONDITIONS FINANCIERES, REGLEMENTS ET MODALITES DE PAIEMENT
Tous les prix sont indiques en euros, toutes taxes comprises.

3.1 - Modalites de paiement pour les particuliers
Conformement a l'article L6353-6 du Code du travail, lorsque le Client est une personne physique qui finance elle-meme sa formation :
- Aucune somme ne peut etre exigee avant l'expiration du delai de retractation de 10 jours.
- A l'expiration de ce delai, un premier versement ne pourra exceder 30% du prix total de la formation.
- Le solde sera echelonne au fur et a mesure du deroulement de la formation, selon un echeancier qui sera communique au Client.
Toutefois, le Client reste libre de regler l'integralite du montant de la formation en avance s'il le souhaite, apres l'expiration du delai de retractation de 10 jours. Ce paiement anticipe ne peut en aucun cas etre impose ou exige par FTRANSPORT.
Moyens de paiement acceptes : especes, virement bancaire, cheque.

3.2 - Modalites de paiement pour les entreprises et organismes financeurs
Lorsque la formation est financee par une entreprise, un OPCO, France Travail (anciennement Pole Emploi) ou tout autre organisme financeur, le paiement integral peut etre demande avant le debut de la formation, conformement aux accords conclus avec ces organismes.

3.3 - Retard de paiement
Toute somme non payee a echeance entraine de plein droit et sans mise en demeure prealable, l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros.

ARTICLE 4 - INSCRIPTION ET EFFECTIF
L'effectif de chaque formation est limite. Les inscriptions sont prises en compte dans leur ordre d'arrivee.
L'inscription devient definitive apres signature du contrat de formation et expiration du delai de retractation de 10 jours, conformement aux articles L6353-3 et suivants du Code du travail.
Seuls les contrats dument renseignes, dates, signes et revetus de la mention "Bon pour accord" ont valeur contractuelle.

ARTICLE 5 - CONTRAT DE FORMATION POUR LES PARTICULIERS
Conformement aux articles L6353-3 et L6353-4 du Code du travail, lorsqu'une personne physique finance elle-meme sa formation, un contrat de formation professionnelle est conclu entre FTRANSPORT et le stagiaire AVANT l'inscription definitive et tout reglement de frais.

ARTICLE 6 - DEDIT ET REMPLACEMENT D'UN PARTICIPANT
En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure ou de le remplacer par un autre participant.

ARTICLE 7 - ANNULATION, ABSENCE OU INTERRUPTION D'UNE FORMATION
Tout module commence est du dans son integralite.

ARTICLE 8 - ASSIDUITE ET CONTROLE DE PRESENCE
La presence du stagiaire est obligatoire et controlee par une feuille d'emargement signee par demi-journee.

ARTICLE 9 - HORAIRES ET ACCUEIL
Les formations se deroulent de 09h00 a 12h00 et de 13h00 a 17h00 avec une pause en milieu de chaque demi-journee, sauf indication contraire mentionnee sur la convocation.

ARTICLE 10 - REGLEMENT INTERIEUR
Le reglement interieur applicable aux stagiaires est remis a chaque participant avant le debut de la formation.

ARTICLE 11 - OBLIGATIONS ET FORCE MAJEURE
FTRANSPORT est tenue a une obligation de moyens et non de resultat vis-a-vis de ses Clients ou de ses Stagiaires.

ARTICLE 12 - PROPRIETE INTELLECTUELLE
L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT constituent des oeuvres protegees par le droit d'auteur et sont la propriete exclusive de FTRANSPORT ou de ses partenaires.

ARTICLE 13 - ACCESSIBILITE AUX PERSONNES EN SITUATION DE HANDICAP
FTRANSPORT s'engage a accueillir les personnes en situation de handicap dans les meilleures conditions.

ARTICLE 14 - PROTECTION DES DONNEES PERSONNELLES
Conformement au RGPD et a la loi n 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de rectification, de limitation, d'opposition, de portabilite et d'effacement des donnees personnelles le concernant.

ARTICLE 15 - DROIT APPLICABLE ET REGLEMENT DES LITIGES
Les presentes conditions generales de vente sont regies par le droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable. A defaut d'accord, le litige sera porte devant les Tribunaux competents de Lyon.

---
Numero de declaration d'activite : 84 69 15114 69 - Cet enregistrement ne vaut pas agrement de l'Etat
Ftransport n'est pas assujetti a la TVA
Services Pro - FTransport - SASU au capital social de 5 000 euros
SIRET : 82346156100018 | 86 route de Genas - 69003 LYON | Tel : 04.28.29.60.91 | contact@ftransport.fr`;

// Formatteur de nombre compatible jsPDF (pas d'espaces insécables)
const formatEUR = (n: number): string => {
  const parts = n.toFixed(2).replace('.', ',').split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts[0]},${parts[1]} EUR`;
};

// Détecte le template de devis le plus adapté selon le type d'apprenant
function detectDevisTemplate(apprenant: any): string | null {
  const type = (apprenant.type_apprenant || "").toUpperCase();
  const formation = (apprenant.formation_choisie || "").toLowerCase();

  if (type.includes("PA") && type.includes("VTC")) return "fc_vtc";
  if (type.includes("PA") && type.includes("TAXI")) return "fc_taxi";
  if (formation.includes("continue") && formation.includes("vtc")) return "fc_vtc";
  if (formation.includes("continue") && formation.includes("taxi")) return "fc_taxi";
  if (type === "TA" || type === "TA E") return "ta_elearning";
  if (type === "VA" || type === "VA E") return "va_elearning";
  if (type === "VTC" || type === "VTC E") {
    if (formation.includes("e-learning") || formation.includes("elearning") || type.includes("E")) return "vtc_elearning";
    return "vtc_complet";
  }
  if (type === "TAXI" || type === "TAXI E") {
    if (formation.includes("pratique")) return "taxi_pratique";
    return "taxi_elearning_examen";
  }
  if (type === "RP TAXI") return "taxi_pratique";
  return null;
}

export function DevisSection({ apprenant }: DevisSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const validiteDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const detectedTemplate = detectDevisTemplate(apprenant);

  const getDesignationInitiale = () => {
    if (!apprenant.formation_choisie) return "Formation professionnelle";
    const found = FORMATIONS_CATALOGUE.find(f =>
      apprenant.formation_choisie === f.label ||
      f.label.toLowerCase().includes((apprenant.formation_choisie || '').toLowerCase())
    );
    return found?.designation || apprenant.formation_choisie;
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string>(detectedTemplate || "");
  const selectedTemplateConfig = DEVIS_TEMPLATES.find(t => t.id === selectedTemplate);
  const selectedTemplatePrix = selectedTemplateConfig?.prix ?? apprenant.montant_ttc ?? 0;
  const detectedTemplatePrix = DEVIS_TEMPLATES.find(t => t.id === detectedTemplate)?.prix;
  const [lignes, setLignes] = useState<LigneDevis[]>([
    {
      id: crypto.randomUUID(),
      designation: getDesignationInitiale(),
      quantite: 1,
      prixUnitaire: detectedTemplatePrix ?? apprenant.montant_ttc ?? 0,
    }
  ]);
  const [dateDevis, setDateDevis] = useState(today);
  const [dateValidite, setDateValidite] = useState(validiteDate);
  const [notes, setNotes] = useState("");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [formationType, setFormationType] = useState<'vtc' | 'taxi' | null>(null);
  const [tvaTaux, setTvaTaux] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statutDevis, setStatutDevis] = useState<'en_attente' | 'valide' | 'refuse'>('en_attente');
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [factureCreee, setFactureCreee] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingDevisEmail, setSendingDevisEmail] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!selectedTemplateConfig) return;
    setLignes(prev => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      if ((first.prixUnitaire ?? 0) === selectedTemplateConfig.prix) return prev;
      return [{ ...first, prixUnitaire: selectedTemplateConfig.prix }, ...rest];
    });
  }, [selectedTemplate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const formatDateForDevis = (value?: string | null) => {
    if (!value) return format(new Date(), 'dd/MM/yyyy');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'dd/MM/yyyy');
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas) setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const addLigne = () => {
    setLignes(prev => [...prev, {
      id: crypto.randomUUID(),
      designation: "",
      quantite: 1,
      prixUnitaire: 0,
    }]);
  };

  const removeLigne = (id: string) => {
    setLignes(prev => prev.filter(l => l.id !== id));
  };

  const updateLigne = (id: string, field: keyof LigneDevis, value: string | number) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const applyFormationCatalogue = (formationLabel: string) => {
    const f = FORMATIONS_CATALOGUE.find(f => f.label === formationLabel);
    if (!f) return;
    setLignes(prev => prev.map((l, i) => i === 0 ? { ...l, designation: f.designation, prixUnitaire: f.prix } : l));
    const lower = formationLabel.toLowerCase();
    if (lower.includes('taxi')) setFormationType('taxi');
    else if (lower.includes('vtc')) setFormationType('vtc');
    else setFormationType(null);
    setSessionDate("");
  };

  const availableSessionDates = formationType === 'taxi' ? DATES_TAXI : formationType === 'vtc' ? DATES_VTC : [];

  const totalHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  const montantTVA = totalHT * (tvaTaux / 100);
  const totalTTC = totalHT + montantTVA;

  // ─── DOCX TEMPLATE DOWNLOAD ───
  const generateDocxFromTemplate = async () => {
    if (!selectedTemplate) {
      toast.error("Veuillez sélectionner un modèle de devis");
      return;
    }
    setGeneratingDocx(true);
    try {
      const tmpl = selectedTemplateConfig;
      if (!tmpl) throw new Error("Template introuvable");

      const response = await fetch(`/devis/${tmpl.file}`);
      if (!response.ok) throw new Error("Impossible de charger le modèle DOCX");
      const arrayBuffer = await response.arrayBuffer();

      const sharedPayload = {
        client_nom: `${apprenant.civilite || ''} ${apprenant.prenom || ''} ${apprenant.nom || ''}`.trim(),
        client_adresse1: apprenant.adresse || '',
        client_codep: apprenant.code_postal || '',
        client_ville: apprenant.ville || '',
        client_tel: apprenant.telephone || '',
        client_mail: apprenant.email || '',
        client_email: apprenant.email || '',
        devis_date: formatDateForDevis(dateDevis),
        devis_ligne_produit_date1: formatDateForDevis(apprenant.date_formation_catalogue || apprenant.date_debut_formation),
        montant: String(selectedTemplatePrix),
        formation: apprenant.formation_choisie || '',
      };

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{", end: "}" },
        nullGetter() { return ""; },
      });
      doc.render(sharedPayload);
      const outBuf = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

      const fileName = `Devis_${apprenant.prenom}_${apprenant.nom}_${tmpl.id}_${format(new Date(), 'ddMMyyyy')}.docx`;
      saveAs(outBuf, fileName);
      toast.success("Devis DOCX téléchargé avec succès !");
    } catch (err: any) {
      console.error("Erreur génération DOCX:", err);
      toast.error(`Erreur : ${err.message || "Impossible de générer le DOCX"}`);
    } finally {
      setGeneratingDocx(false);
    }
  };

  // ─── EMAIL SEND (via Outlook) ───
  const getEmailContent = () => {
    const tmpl = selectedTemplateConfig;
    if (!tmpl) return null;
    const emailData = DEVIS_EMAIL_BODIES[tmpl.emailId];
    if (!emailData) return null;
    const montant = selectedTemplatePrix;
    const subject = emailData.subject
      .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
      .replace(/\{\{nom\}\}/g, apprenant.nom || '');
    const body = emailData.body
      .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
      .replace(/\{\{nom\}\}/g, apprenant.nom || '')
      .replace(/\{\{montant\}\}/g, String(montant));
    return { subject, body };
  };

  const validateBeforeSend = (): boolean => {
    const intitule = lignes[0]?.designation?.trim();
    if (!intitule) {
      toast.error("Veuillez renseigner l'intitulé de la formation (désignation)");
      return false;
    }
    if (!sessionDate) {
      toast.error("Veuillez choisir les dates de formation avant d'envoyer");
      return false;
    }
    if (!dateValidite) {
      toast.error("Veuillez renseigner la date de fin de validité du devis");
      return false;
    }
    return true;
  };

  const sendDevisEmail = async () => {
    if (!apprenant.email) {
      toast.error("Aucun email renseigné pour cet apprenant");
      return;
    }
    if (!validateBeforeSend()) return;
    const emailContent = getEmailContent();
    if (!emailContent) {
      toast.error("Aucun modèle d'email pour ce type de devis");
      return;
    }

    setSendingEmail(true);
    try {
      // 1. Generate the DOCX
      const tmpl = selectedTemplateConfig;
      if (!tmpl) throw new Error("Template introuvable");

      const response = await fetch(`/devis/${tmpl.file}`);
      if (!response.ok) throw new Error("Impossible de charger le modèle DOCX");
      const arrayBuffer = await response.arrayBuffer();

      const sharedPayload = {
        client_nom: `${apprenant.civilite || ''} ${apprenant.prenom || ''} ${apprenant.nom || ''}`.trim(),
        client_adresse1: apprenant.adresse || '',
        client_codep: apprenant.code_postal || '',
        client_ville: apprenant.ville || '',
        client_tel: apprenant.telephone || '',
        client_mail: apprenant.email || '',
        client_email: apprenant.email || '',
        devis_date: formatDateForDevis(dateDevis),
        devis_ligne_produit_date1: formatDateForDevis(apprenant.date_formation_catalogue || apprenant.date_debut_formation),
        montant: String(selectedTemplatePrix),
        formation: apprenant.formation_choisie || '',
      };

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{", end: "}" },
        nullGetter() { return ""; },
      });
      doc.render(sharedPayload);
      const outBuf = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

      // 2. Upload DOCX to storage
      const fileName = `originaux/${apprenant.id}_${tmpl.id}_${format(new Date(), 'yyyyMMddHHmmss')}.docx`;
      const { error: uploadErr } = await supabase.storage
        .from("devis")
        .upload(fileName, outBuf, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });
      if (uploadErr) throw new Error("Erreur upload du devis: " + uploadErr.message);

      const { data: urlData } = supabase.storage.from("devis").getPublicUrl(fileName);

      // 3. Create devis_envois record with unique token
      const { data: devisRecord, error: insertErr } = await supabase
        .from("devis_envois")
        .insert({
          apprenant_id: apprenant.id,
          modele: tmpl.label,
          montant: `${selectedTemplatePrix} €`,
          formation: tmpl.label,
          fichier_url: urlData.publicUrl,
          statut: "envoye",
        })
        .select("token")
        .single();
      if (insertErr) throw new Error("Erreur création devis: " + insertErr.message);

      // 4. Build email with link to public page (use published URL, not preview)
      const appUrl = 'https://insight-learn-manage.lovable.app';
      const devisLink = `${appUrl}/devis?token=${devisRecord.token}`;

      const bodyHtml = emailContent.body.replace(/\n/g, '<br/>') +
        `<br/><br/>📝 <strong>Pour compléter et signer votre devis :</strong><br/>` +
        `<a href="${devisLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:8px;">` +
        `Accéder à mon devis</a><br/><br/>` +
        `<em style="font-size:12px;color:#888;">Ce lien vous permet de télécharger votre devis, le compléter, le signer et nous le renvoyer directement.</em>`;

      const { error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: apprenant.email,
          subject: emailContent.subject,
          body: bodyHtml,
          apprenantId: apprenant.id,
        }
      });
      if (error) throw error;
      toast.success(`Email de devis envoyé à ${apprenant.email} avec lien de signature`);
      setShowEmailPreview(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'email: " + (err.message || ""));
    } finally {
      setSendingEmail(false);
    }
  };

  const creerFacture = async () => {
    setCreatingFacture(true);
    try {
      const { data: lastFacture } = await supabase
        .from('factures')
        .select('numero')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const year = new Date().getFullYear();
      let nextNum = 1;
      if (lastFacture?.numero) {
        const match = lastFacture.numero.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const numero = `FAC-${year}-${String(nextNum).padStart(4, '0')}`;

      const designation = lignes.map(l => l.designation).join(' / ');
      const { data, error } = await supabase.from('factures').insert({
        numero,
        apprenant_id: apprenant.id,
        client_nom: `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim(),
        client_adresse: [apprenant.adresse, apprenant.code_postal, apprenant.ville].filter(Boolean).join(', '),
        date_emission: dateDevis,
        date_echeance: dateValidite,
        montant_ht: totalHT,
        montant_tva: montantTVA,
        montant_ttc: totalTTC,
        tva_taux: tvaTaux,
        type_financement: apprenant.mode_financement || 'particulier',
        statut: 'en_attente',
      }).select().single();

      if (error) throw error;
      setFactureCreee(data.numero);
      toast.success(`Facture ${data.numero} créée avec succès !`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la création de la facture");
    } finally {
      setCreatingFacture(false);
    }
  };

  const generateDevisPDF = async (opts?: { returnBase64?: boolean }): Promise<{ base64: string; fileName: string } | void> => {
    setGenerating(true);
    try {
      const numDevis = `DEV-${format(new Date(), 'yyyyMM')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const isElearning = /e-?learning/i.test(
        (selectedTemplateConfig?.label || apprenant.formation_choisie || '') as string,
      );

      const doc = buildCanonicalDevisPDF({
        numDevis,
        dateDevis: new Date(dateDevis),
        dateValidite: new Date(dateValidite),
        client: {
          civilite: apprenant.civilite,
          prenom: apprenant.prenom,
          nom: apprenant.nom,
          adresse: apprenant.adresse,
          codePostal: apprenant.code_postal,
          ville: apprenant.ville,
          telephone: apprenant.telephone,
          email: apprenant.email,
          dateNaissance: apprenant.date_naissance,
        },
        typeFinancement: apprenant.financeur_nom ? 'organisme' : 'personnel',
        financeur: apprenant.financeur_nom ? {
          nom: apprenant.financeur_nom,
          type: apprenant.financeur_type,
          adresse: apprenant.financeur_adresse,
          codePostal: apprenant.financeur_code_postal,
          ville: apprenant.financeur_ville,
          siret: apprenant.financeur_siret,
          email: apprenant.financeur_email,
          telephone: apprenant.financeur_telephone,
          contactNom: apprenant.financeur_contact_nom,
        } : undefined,
        formation: {
          designation: lignes[0]?.designation || apprenant.formation_choisie || 'Formation professionnelle',
          duree: selectedTemplateConfig ? undefined : undefined,
          agrement: undefined,
          type: formationType,
          isElearning,
        },
        lignes: lignes.map(l => ({
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
        tvaTaux,
        sessionDate,
        notes,
        signatureDataUrl,
      });

      const fileName = `Devis_${apprenant.prenom}_${apprenant.nom}_${format(new Date(), 'ddMMyyyy')}.pdf`;
      if (opts?.returnBase64) {
        const dataUri = doc.output('datauristring');
        const base64 = dataUri.split(',')[1] || '';
        return { base64, fileName };
      }
      doc.save(fileName);
      toast.success("Devis PDF généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du devis PDF");
    } finally {
      setGenerating(false);
    }
  };


  const envoyerDevisParEmail = async () => {
    if (!apprenant.email) {
      toast.error("L'apprenant n'a pas d'adresse email.");
      return;
    }
    if (!validateBeforeSend()) return;
    setSendingDevisEmail(true);
    try {
      const result = await generateDevisPDF({ returnBase64: true });
      if (!result) throw new Error("Impossible de générer le PDF");
      const { base64, fileName } = result;

      // Upload dans storage
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const storagePath = `envois/${apprenant.id}/${Date.now()}_${fileName}`;
      const { error: upErr } = await supabase.storage.from('devis').upload(storagePath, bytes, {
        contentType: 'application/pdf', upsert: true,
      });
      if (upErr) {
        console.error('Upload devis error:', upErr);
        toast.error(`Upload impossible: ${upErr.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from('devis').getPublicUrl(storagePath);

      // Enregistrer l'envoi
      const { data: devisRecord } = await supabase.from('devis_envois').insert({
        apprenant_id: apprenant.id,
        modele: selectedTemplate || 'devis',
        montant: `${totalTTC.toFixed(2)} €`,
        formation: (selectedTemplateConfig as any)?.label || apprenant.formation_choisie || '',
        fichier_url: urlData.publicUrl,
        statut: 'envoye',
        dates_formation: sessionDate || null,
        date_devis: dateDevis || null,
        date_validite: dateValidite || null,
      }).select('token').single();

      const appUrl = 'https://insight-learn-manage.lovable.app';
      const devisLink = devisRecord?.token ? `${appUrl}/devis?token=${devisRecord.token}` : '';
      const em = getEmailContent();
      const bodyHtml = em.body.replace(/\n/g, '<br/>') +
        (devisLink ? `<br/><br/>📝 <a href="${devisLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Consulter et signer le devis en ligne</a>` : '') +
        `<br/><br/><em style="font-size:12px;color:#888;">Le devis est également joint en PDF à cet email.</em>`;

      const { error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: apprenant.email,
          subject: em.subject,
          body: bodyHtml,
          apprenantId: apprenant.id,
          attachments: [{ name: fileName, contentType: 'application/pdf', contentBytes: base64 }],
        },
      });
      if (error) throw error;
      toast.success(`Devis envoyé par email à ${apprenant.email}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur envoi devis : " + (err.message || ""));
    } finally {
      setSendingDevisEmail(false);
    }
  };

  const emailContent = getEmailContent();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="devis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devis">📄 Devis</TabsTrigger>
          <TabsTrigger value="location">🚗 Contrat de location</TabsTrigger>
        </TabsList>

        <TabsContent value="devis" className="space-y-6 mt-4">
          {/* ═══ SECTION 1 : DEVIS DOCX TEMPLATES ═══ */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileDown className="w-5 h-5 text-primary" />
                Devis DOCX pré-rempli
              </CardTitle>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sélectionner le modèle de devis</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un modèle de devis..." />
              </SelectTrigger>
              <SelectContent>
                {DEVIS_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label} {t.prix > 0 ? `- ${t.prix} €` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {detectedTemplate && selectedTemplate === detectedTemplate && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Détecté automatiquement selon le type d'apprenant ({apprenant.type_apprenant})
              </p>
            )}
          </div>

          {selectedTemplate && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Données qui seront injectées dans le DOCX :</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Nom :</span> <strong>{apprenant.prenom} {apprenant.nom}</strong></div>
                <div><span className="text-muted-foreground">Adresse :</span> <strong>{apprenant.adresse || '—'}</strong></div>
                <div><span className="text-muted-foreground">CP :</span> <strong>{apprenant.code_postal || '—'}</strong></div>
                <div><span className="text-muted-foreground">Ville :</span> <strong>{apprenant.ville || '—'}</strong></div>
                <div><span className="text-muted-foreground">Tél :</span> <strong>{apprenant.telephone || '—'}</strong></div>
                <div><span className="text-muted-foreground">Email :</span> <strong>{apprenant.email || '—'}</strong></div>
                <div><span className="text-muted-foreground">Date devis :</span> <strong>{formatDateForDevis(dateDevis)}</strong></div>
                <div><span className="text-muted-foreground">Montant :</span> <strong>{selectedTemplatePrix} €</strong></div>
                <div><span className="text-muted-foreground">Dates formation :</span> <strong>{formatDateForDevis(apprenant.date_formation_catalogue || apprenant.date_debut_formation || null)}</strong></div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={generateDocxFromTemplate}
              disabled={generatingDocx || !selectedTemplate}
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              {generatingDocx ? "Génération..." : "Télécharger le devis DOCX"}
            </Button>

            {selectedTemplate && apprenant.email && (
              <Button
                variant="outline"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {showEmailPreview ? "Masquer" : "Envoyer"} l'email de devis
              </Button>
            )}
          </div>

          {/* Email preview */}
          {showEmailPreview && emailContent && (
            <div className="border rounded-lg p-4 space-y-3 bg-background">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Destinataire</p>
                <p className="text-sm font-medium">{apprenant.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Objet</p>
                <p className="text-sm font-medium">{emailContent.subject}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Corps du message</p>
                <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {emailContent.body}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={sendDevisEmail}
                  disabled={sendingEmail || !lignes[0]?.designation?.trim() || !sessionDate || !dateValidite}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? "Envoi en cours..." : "Envoyer l'email"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEmailPreview(false)}>
                  Annuler
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                📝 L'apprenant recevra un lien pour télécharger, compléter, signer et renvoyer le devis en ligne.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ SECTION 1b : HISTORIQUE DEVIS ENVOYÉS ═══ */}
      <DevisHistorique apprenantId={apprenant.id} apprenant={apprenant} />

      {/* ═══ SECTION 2 : DEVIS PDF PERSONNALISÉ (existant) ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Devis PDF personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infos devis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du devis</Label>
              <Input type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valable jusqu'au</Label>
              <Input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Appliquer une formation catalogue</Label>
            <Select onValueChange={applyFormationCatalogue}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation..." />
              </SelectTrigger>
              <SelectContent>
                {FORMATIONS_CATALOGUE.map(f => (
                  <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSessionDates.length > 0 && (
            <div className="space-y-2">
              <Label>Dates de formation à choisir ({formationType === 'taxi' ? 'TAXI' : 'VTC'})</Label>
              <Select value={sessionDate} onValueChange={setSessionDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une session..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSessionDates.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sessionDate && (
                <p className="text-xs text-muted-foreground">
                  ✓ Cette session sera imprimée dans les notes du devis.
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Lignes du devis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Lignes du devis</h3>
              <Button variant="outline" size="sm" onClick={addLigne}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter une ligne
              </Button>
            </div>
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <span className="col-span-6">Désignation</span>
              <span className="col-span-1">Qté</span>
              <span className="col-span-2">Prix unit. (€)</span>
              <span className="col-span-2 text-right">Total (€)</span>
              <span className="col-span-1"></span>
            </div>
            {lignes.map((ligne) => (
              <div key={ligne.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 md:col-span-6">
                  <Textarea
                    value={ligne.designation}
                    onChange={(e) => updateLigne(ligne.id, 'designation', e.target.value)}
                    placeholder="Désignation de la prestation..."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <Input type="number" min={1} value={ligne.quantite} onChange={(e) => updateLigne(ligne.id, 'quantite', Number(e.target.value))} className="text-center" />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input type="number" min={0} step={0.01} value={ligne.prixUnitaire} onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', Number(e.target.value))} className="text-right" />
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                  <span className="font-semibold text-sm">{(ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button variant="ghost" size="icon" onClick={() => removeLigne(ligne.id)} className="text-destructive hover:text-destructive h-8 w-8" disabled={lignes.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* TVA + Totaux */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm whitespace-nowrap">TVA :</Label>
                <Select value={String(tvaTaux)} onValueChange={(v) => setTvaTaux(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% - Non assujetti</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{totalHT.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({tvaTaux}%{tvaTaux === 0 ? ' - Non assujetti' : ''})</span>
                <span>{montantTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total TTC</span>
                <span className="text-primary">{totalTTC.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Modalités particulières</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions particulières, modalités de paiement, informations complémentaires..." className="min-h-[80px]" />
          </div>

          <Separator />

          {/* Signature électronique */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <PenLine className="w-4 h-4 text-primary" />
                Signature électronique client
              </Label>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="text-muted-foreground hover:text-destructive gap-1 text-xs">
                <RotateCcw className="w-3 h-3" />
                Effacer
              </Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!signatureDataUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground text-sm">Signez ici avec votre souris ou votre doigt</span>
                </div>
              )}
            </div>
            {signatureDataUrl && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Signature enregistrée — elle sera intégrée dans le PDF
              </p>
            )}
          </div>

          <Separator />

          {/* Statut du devis */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Statut du devis</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => { setStatutDevis('en_attente'); setFactureCreee(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'en_attente' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border bg-background text-muted-foreground hover:border-amber-200'}`}>
                <Clock className="w-4 h-4" /> En attente
              </button>
              <button onClick={() => setStatutDevis('valide')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'valide' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border bg-background text-muted-foreground hover:border-green-200'}`}>
                <CheckCircle2 className="w-4 h-4" /> Validé
              </button>
              <button onClick={() => { setStatutDevis('refuse'); setFactureCreee(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'refuse' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border bg-background text-muted-foreground hover:border-red-200'}`}>
                <XCircle className="w-4 h-4" /> Refusé
              </button>

              {statutDevis === 'en_attente' && <Badge className="bg-amber-100 text-amber-800 border-amber-300">En attente de réponse client</Badge>}
              {statutDevis === 'valide' && <Badge className="bg-green-100 text-green-800 border-green-300">Devis accepté par le client</Badge>}
              {statutDevis === 'refuse' && <Badge className="bg-red-100 text-red-800 border-red-300">Devis refusé par le client</Badge>}
            </div>

            {statutDevis === 'valide' && (
              <div className="mt-3 p-4 rounded-lg border-2 border-green-200 bg-green-50/50 space-y-3">
                <p className="text-sm font-medium text-green-800">Le devis est validé — vous pouvez générer la facture correspondante.</p>
                {factureCreee ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Facture <strong>{factureCreee}</strong> créée avec succès dans le module Comptabilité.
                  </div>
                ) : (
                  <Button onClick={creerFacture} disabled={creatingFacture} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    {creatingFacture ? "Création en cours..." : "Générer la facture"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions PDF */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button onClick={() => generateDevisPDF()} disabled={generating} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              {generating ? "Génération..." : "Télécharger le devis PDF"}
            </Button>
            <Button onClick={envoyerDevisParEmail} disabled={sendingDevisEmail || generating || !apprenant.email || !lignes[0]?.designation?.trim() || !sessionDate || !dateValidite} title={!apprenant.email ? "L'apprenant n'a pas d'email" : !lignes[0]?.designation?.trim() ? "Renseignez l'intitulé" : !sessionDate ? "Choisissez les dates de formation" : !dateValidite ? "Renseignez la date de validité" : `Envoi à ${apprenant.email}`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4" />
              {sendingDevisEmail ? "Envoi en cours..." : `Envoyer par mail au client${apprenant.email ? ` (${apprenant.email})` : ''}`}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {showPreview ? "Masquer" : "Aperçu"} les CGV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Récap client */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Récapitulatif client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{apprenant.civilite} {apprenant.prenom} {apprenant.nom}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{apprenant.email || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="font-medium">{apprenant.telephone || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mode de financement</p>
              <Badge variant="outline">{apprenant.mode_financement || '-'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu CGV */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Conditions Générales de Vente — FTRANSPORT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {CGV_TEXT}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="location" className="mt-4">
          <ContratLocationSection apprenant={apprenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
