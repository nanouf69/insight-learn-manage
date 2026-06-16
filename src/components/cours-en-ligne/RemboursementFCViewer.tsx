import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  ReceiptText,
  Award,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { buildEmargementHTML } from "./EmargementsSignesViewer";
import { getExpectedEmargements, type CreneauKey } from "@/lib/agendaSlots";
import { generateAttestationFCVTC } from "@/lib/pdf/attestation-fc-vtc";
import { toast } from "sonner";

interface Props {
  apprenantId?: string;
  completed: boolean;
  onComplete: () => void;
  formation?: "VTC" | "TAXI";
}

interface ApprenantInfo {
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  formation_choisie?: string | null;
  type_apprenant?: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
  creneau_horaire?: string | null;
  date_naissance?: string | null;
}

interface EmargementRow {
  id: string;
  date_emargement: string;
  demi_journee: string;
  signature_data_url: string | null;
  signed_at: string;
}

interface FactureDoc {
  id: string;
  url: string;
  nom_fichier: string;
  titre: string;
  created_at?: string;
}

const normalizeDemi = (d: string) => (d || "").toLowerCase().replace(/_/g, "-").trim();

function buildProgrammeHTML(formation: "VTC" | "TAXI") {
  const titre = `PROGRAMME DE FORMATION CONTINUE ${formation}`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>${titre}</title>
<style>
@page { size: A4; margin: 18mm; }
body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; }
h1 { color: #6b7fc7; font-size: 18px; margin: 0 0 6px; }
h2 { color: #6b7fc7; font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #6b7fc7; padding-bottom: 3px; }
.header { border-bottom: 2px solid #6b7fc7; padding-bottom: 10px; margin-bottom: 12px; }
.sub { color: #555; font-size: 11px; }
ul { padding-left: 18px; } li { margin-bottom: 4px; }
.footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 10px; color: #555; }
.noprint { margin-top: 18px; text-align: center; }
@media print { .noprint { display:none; } }
</style></head><body>
<div class="header">
  <h1>${titre}</h1>
  <div class="sub">Centre de formation FTRANSPORT — 86 Route de Genas, 69003 Lyon — Agrément 69-16-15</div>
</div>

<p><strong>Référence légale :</strong> Arrêté du 11 août 2017 (modifié par Arrêté du 15 juin 2024) relatif à la formation continue des conducteurs de taxi et VTC, pris en application de l'article R. 3120-8-2 du code des transports.</p>

<h2>Objectif</h2>
<p>Mettre à jour les connaissances essentielles à la pratique de l'activité de conducteur de ${formation === "VTC" ? "voiture de transport avec chauffeur (VTC)" : "taxi"}.</p>

<h2>Durée et organisation</h2>
<ul>
  <li>14 heures de formation en présentiel, dans un centre agréé (2 journées de 7h).</li>
  <li><strong>Horaires :</strong> 09h00 — 12h00 (matin, 3h) et 13h00 — 17h00 (après-midi, 4h).</li>
  <li>Possibilité de fractionnement en 4 périodes de 3h30 sur 2 mois maximum.</li>
  <li>Session organisée spécifiquement pour la profession (${formation}).</li>
</ul>

<h2>Modules d'approfondissement obligatoires (3 × 3h30)</h2>
<ul>
  <li><strong>A.</strong> Droit du Transport Public Particulier de Personnes (T3P).</li>
  <li><strong>B.</strong> Réglementation spécifique à l'activité ${formation === "VTC" ? "VTC" : "taxi"}.</li>
  <li><strong>C.</strong> Sécurité routière.</li>
</ul>

<h2>Module au choix (3h30)</h2>
<ul>
  <li><strong>D.</strong> Anglais.</li>
  <li><strong>E.</strong> Gestion et développement commercial (TIC incluses).</li>
  <li><strong>F.</strong> Prévention et secours civiques (PSC1).</li>
</ul>

<h2>Référentiel</h2>
<p>Annexe I de l'arrêté du 6 avril 2017 pour les modules A, B, C, D, E. Annexes 1, 2 et 3 de l'arrêté du 24 juillet 2007 pour le module F (PSC).</p>

<h2>Public et prérequis</h2>
<ul>
  <li>Conducteurs ${formation === "VTC" ? "VTC" : "taxi"} titulaires d'une carte professionnelle en cours de validité.</li>
  <li>Maîtrise de la langue française (compréhension écrite et orale).</li>
</ul>

<h2>Méthodes pédagogiques</h2>
<ul>
  <li>Apports théoriques, études de cas, mises en situation, échanges avec le formateur.</li>
  <li>Supports remis aux stagiaires (papier et/ou plateforme e-learning).</li>
</ul>

<h2>Évaluation et sanction</h2>
<ul>
  <li>Émargement par demi-journée signé par le stagiaire et le formateur.</li>
  <li>Évaluation des acquis en fin de stage (QCM / questions-réponses).</li>
  <li>Remise d'une <strong>attestation de suivi de formation continue</strong>, signée et datée par le représentant légal du centre.</li>
</ul>

<h2>Tarif et financement</h2>
<ul>
  <li>Tarif communiqué dans le devis et la facture.</li>
  <li>Financements possibles : autofinancement, FAFCEA (artisans), AGEFICE (commerçants).</li>
</ul>

<div class="footer">
  Services pro Ftransport — SIREN 823 461 561 — Déclaration d'activité 84 69 17 911 69 (cet enregistrement ne vaut pas agrément de l'État).
</div>

<div class="noprint">
  <button onclick="window.print()" style="padding:10px 20px;font-size:13px;cursor:pointer;background:#6b7fc7;color:#fff;border:none;border-radius:4px;">Imprimer / Enregistrer en PDF</button>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;
}

function openHtmlInNewWindow(html: string) {
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export default function RemboursementFCViewer({ apprenantId, completed, onComplete, formation = "VTC" }: Props) {
  const [loading, setLoading] = useState(true);
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [emargements, setEmargements] = useState<EmargementRow[]>([]);
  const [expected, setExpected] = useState<Array<{ date: string; creneau: CreneauKey }>>([]);
  const [factures, setFactures] = useState<FactureDoc[]>([]);
  const [attestations, setAttestations] = useState<FactureDoc[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!apprenantId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [apRes, emRes, fRes] = await Promise.all([
        supabase
          .from("apprenants")
          .select("nom, prenom, email, telephone, adresse, code_postal, ville, formation_choisie, type_apprenant, date_debut_formation, date_fin_formation, creneau_horaire, date_naissance")
          .eq("id", apprenantId)
          .maybeSingle(),
        supabase
          .from("emargements_fc" as any)
          .select("id, date_emargement, demi_journee, signature_data_url, signed_at")
          .eq("apprenant_id", apprenantId)
          .order("date_emargement", { ascending: true }),
        supabase
          .from("documents_inscription")
          .select("id, url, nom_fichier, titre, created_at")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", "facture-fc")
          .order("created_at", { ascending: false }),
      ]);

      const ap = (!apRes.error && apRes.data) ? (apRes.data as ApprenantInfo) : null;
      setApprenant(ap);
      if (!emRes.error && Array.isArray(emRes.data)) setEmargements(emRes.data as unknown as EmargementRow[]);
      if (!fRes.error && Array.isArray(fRes.data)) setFactures(fRes.data as FactureDoc[]);

      if (ap) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const parseDate = (s?: string | null): Date | null => {
          if (!s) return null;
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10) + "T00:00:00");
          if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
            const [d, m, y] = s.slice(0, 10).split("/");
            return new Date(`${y}-${m}-${d}T00:00:00`);
          }
          return null;
        };
        let start = parseDate(ap.date_debut_formation);
        if (!start || isNaN(start.getTime())) { start = new Date(today); start.setDate(today.getDate() - 30); }
        let end = parseDate(ap.date_fin_formation);
        if (!end || isNaN(end.getTime()) || end.getTime() > today.getTime()) end = today;
        const exp = await getExpectedEmargements({
          mode: "fc",
          formationChoisie: ap.formation_choisie,
          creneauHoraire: ap.creneau_horaire,
          apprenantId,
          startDate: start,
          endDate: end,
        });
        setExpected(exp);
      }
      setLoading(false);
    })();
  }, [apprenantId]);

  const signedCount = emargements.filter((r) => r.signature_data_url?.trim()).length;
  const hasEmargements = signedCount > 0;
  const hasFacture = factures.length > 0;

  const handleDownloadEmargements = () => {
    setDownloading("emargements");
    try {
      const map = new Map<string, any>();
      const ensure = (date: string) => {
        let e = map.get(date);
        if (!e) { e = { expectedSet: new Set() }; map.set(date, e); }
        return e;
      };
      for (const r of emargements) {
        const entry = ensure(r.date_emargement);
        const k = normalizeDemi(r.demi_journee);
        if (k === "matin") entry.matin = r;
        else if (k === "apres-midi" || k === "après-midi") entry.apresMidi = r;
        else if (k === "soir") entry.soir = r;
        else if (k === "soir-1") entry.soir1 = r;
        else if (k === "soir-2") entry.soir2 = r;
      }
      for (const e of expected) ensure(e.date).expectedSet?.add(e.creneau);
      const grouped = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
      const html = buildEmargementHTML(grouped, apprenant as any, { isFormationContinue: true });
      openHtmlInNewWindow(html);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadProgramme = () => {
    openHtmlInNewWindow(buildProgrammeHTML(formation));
  };

  const handleDownloadAttestation = async () => {
    if (!apprenant) return;
    setDownloading("attestation");
    try {
      await generateAttestationFCVTC({
        nom: apprenant.nom || "",
        prenom: apprenant.prenom || "",
        dateFin: apprenant.date_fin_formation || new Date().toISOString().slice(0, 10),
        dateDebut: apprenant.date_debut_formation || undefined,
        adresse: apprenant.adresse || undefined,
        codePostal: apprenant.code_postal || undefined,
        ville: apprenant.ville || undefined,
        telephone: apprenant.telephone || undefined,
        email: apprenant.email || undefined,
        dateNaissance: apprenant.date_naissance || undefined,
        formation,
      });
    } catch (e) {
      console.error("[RemboursementFC] attestation error", e);
      toast.error("Erreur lors de la génération de l'attestation");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadFacture = (f: FactureDoc) => {
    window.open(f.url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ReceiptText className="h-7 w-7 text-primary shrink-0 mt-1" />
        <div>
          <h2 className="text-xl font-bold">Remboursement de votre formation continue {formation}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Voici l'ensemble des documents à transmettre à votre organisme financeur (FAFCEA, AGEFICE, OPCO ou employeur)
            pour obtenir le remboursement de votre formation. Téléchargez chaque pièce en PDF, puis joignez-les à votre dossier.
          </p>
        </div>
      </div>

      <Card className="p-4 bg-amber-50 border-l-4 border-amber-400">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 space-y-1">
            <p className="font-semibold">Documents à fournir à votre financeur :</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Le programme de formation</li>
              <li>Les feuilles d'émargement signées</li>
              <li>L'attestation de fin de formation (présence et acquis)</li>
              <li>La facture acquittée délivrée par le centre</li>
              <li>Votre RIB (à fournir directement par vos soins)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 1. Programme de formation */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">1. Programme de la formation continue {formation}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Programme officiel conforme à l'arrêté du 11 août 2017 (modifié 15 juin 2024) — 14 heures, modules A/B/C + module au choix.
            </p>
            <Button size="sm" className="mt-2" onClick={handleDownloadProgramme}>
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger le programme (PDF)
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Feuilles d'émargement */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">2. Feuilles d'émargement signées</h3>
              {hasEmargements && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  {signedCount} signature{signedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Feuille individuelle reprenant toutes vos signatures par demi-journée durant la formation.
            </p>
            {!hasEmargements && (
              <p className="text-xs text-amber-700 mt-1">
                Aucune signature enregistrée pour le moment. Pensez à signer chaque demi-journée dans le module dédié.
              </p>
            )}
            <Button
              size="sm"
              className="mt-2"
              disabled={!hasEmargements || downloading === "emargements"}
              onClick={handleDownloadEmargements}
            >
              {downloading === "emargements" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Télécharger les feuilles d'émargement (PDF)
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Attestation de fin de formation */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Award className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">3. Attestation de fin de formation continue {formation}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attestation de présence et de suivi, signée et datée par le représentant légal du centre (article 3 de l'arrêté du 11 août 2017).
            </p>
            <Button
              size="sm"
              className="mt-2"
              disabled={!apprenant || downloading === "attestation"}
              onClick={handleDownloadAttestation}
            >
              {downloading === "attestation" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Télécharger l'attestation (PDF)
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Facture acquittée */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">4. Facture acquittée</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Facture délivrée par le centre avec la mention « acquittée » après réception du paiement.
            </p>
            {hasFacture ? (
              <div className="mt-2 space-y-2">
                {factures.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 border rounded-md p-2 bg-slate-50/50">
                    <div className="text-xs">
                      <div className="font-medium">{f.titre}</div>
                      <div className="text-muted-foreground">{f.nom_fichier}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadFacture(f)}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Télécharger
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700 mt-2">
                Votre facture acquittée n'est pas encore disponible. Elle sera mise en ligne dès réception de votre paiement
                par le centre. Vous serez alerté(e) par email.
              </p>
            )}
          </div>
        </div>
      </Card>

      {!completed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onComplete}>J'ai pris connaissance des documents</Button>
        </div>
      )}
    </div>
  );
}
