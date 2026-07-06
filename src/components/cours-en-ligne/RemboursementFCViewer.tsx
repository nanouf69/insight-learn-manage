import { useCallback, useEffect, useMemo, useState } from "react";
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
  PenTool,
} from "lucide-react";
import { buildEmargementHTML } from "./EmargementsSignesViewer";
import { EmargementFCModal } from "./EmargementFCModal";
import { creneauHoraire, creneauLabel, getExpectedEmargements, type CreneauKey } from "@/lib/agendaSlots";
import { generateAttestationFCVTC } from "@/lib/pdf/attestation-fc-vtc";
import { generateFactureFC } from "@/lib/pdf/facture-fc";
import { toast } from "sonner";
import agrementVtcAsset from "@/assets/agrement-vtc-ftransport.pdf.asset.json";

interface DbFacture {
  id: string;
  numero: string;
  date_emission: string;
  date_paiement: string | null;
  statut: string | null;
  montant_ttc: number;
  financeur?: any;
  paiements?: Array<{ montant: number; date_paiement: string; moyen_paiement: string }>;
}

interface Props {
  apprenantId?: string;
  completed: boolean;
  onComplete: () => void;
  formation?: "VTC" | "TAXI";
}

interface ApprenantInfo {
  auth_user_id?: string | null;
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
  absent?: boolean | null;
}

interface FactureDoc {
  id: string;
  url: string;
  nom_fichier: string;
  titre: string;
  created_at?: string;
}

type GroupedEmargements = {
  matin?: EmargementRow;
  apresMidi?: EmargementRow;
  soir?: EmargementRow;
  soir1?: EmargementRow;
  soir2?: EmargementRow;
  expectedSet?: Set<CreneauKey>;
};

const normalizeDemi = (d: string) => (d || "").toLowerCase().replace(/_/g, "-").trim();
const normalizeCreneauKey = (d: string): CreneauKey | null => {
  const k = normalizeDemi(d);
  if (k === "matin") return "matin";
  if (k === "apres-midi" || k === "après-midi") return "apres_midi";
  if (k === "soir") return "soir";
  if (k === "soir-1") return "soir_1";
  if (k === "soir-2") return "soir_2";
  return null;
};
const emargementSlotKey = (date: string, creneau: CreneauKey) => `${date}|${creneau}`;
const isEmargementFilled = (row?: EmargementRow | null) => Boolean(row?.signature_data_url?.trim()) || row?.absent === true;

const formatDateFR = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

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
  const [dbFactures, setDbFactures] = useState<DbFacture[]>([]);
  const [generatingFactureId, setGeneratingFactureId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState<{ date: string; creneau: CreneauKey; replaceExisting?: boolean } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!apprenantId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const [apRes, emRes, fRes, atRes] = await Promise.all([
        supabase
          .from("apprenants")
          .select("auth_user_id, nom, prenom, email, telephone, adresse, code_postal, ville, formation_choisie, type_apprenant, date_debut_formation, date_fin_formation, creneau_horaire, date_naissance")
          .eq("id", apprenantId)
          .maybeSingle(),
        supabase
          .from("emargements_fc")
          .select("id, date_emargement, demi_journee, signature_data_url, signed_at, absent")
          .eq("apprenant_id", apprenantId)
          .order("date_emargement", { ascending: true }),
        supabase
          .from("documents_inscription")
          .select("id, url, nom_fichier, titre, created_at")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", "facture-fc")
          .order("created_at", { ascending: false }),
        supabase
          .from("documents_inscription")
          .select("id, url, nom_fichier, titre, created_at")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", "attestation-fc")
          .order("created_at", { ascending: false }),
      ]);

      const ap = (!apRes.error && apRes.data) ? (apRes.data as ApprenantInfo) : null;
      setApprenant(ap);
      setUserId(session?.user?.id || ap?.auth_user_id || null);
      if (!emRes.error && Array.isArray(emRes.data)) setEmargements(emRes.data as unknown as EmargementRow[]);
      if (!fRes.error && Array.isArray(fRes.data)) setFactures(fRes.data as FactureDoc[]);
      if (!atRes.error && Array.isArray(atRes.data)) setAttestations(atRes.data as FactureDoc[]);

      // Charge les factures payées en BDD + financeur + paiements pour génération à la volée
      try {
        const { data: facRows } = await supabase
          .from("factures")
          .select("id, numero, date_emission, date_paiement, statut, montant_ttc")
          .eq("apprenant_id", apprenantId)
          .in("statut", ["payee", "acquittee"])
          .order("date_emission", { ascending: false });
        const paidFacs = (facRows || []) as DbFacture[];
        if (paidFacs.length > 0) {
          const [{ data: fcRows }, { data: paiRows }] = await Promise.all([
            supabase
              .from("financeurs_fc" as any)
              .select("*")
              .eq("apprenant_id", apprenantId)
              .maybeSingle(),
            supabase
              .from("facture_paiements" as any)
              .select("facture_id, montant, date_paiement, moyen_paiement")
              .in("facture_id", paidFacs.map((f) => f.id)),
          ]);
          const payByFac: Record<string, any[]> = {};
          (paiRows || []).forEach((p: any) => {
            (payByFac[p.facture_id] = payByFac[p.facture_id] || []).push(p);
          });
          setDbFactures(paidFacs.map((f) => ({
            ...f,
            financeur: fcRows || null,
            paiements: payByFac[f.id] || [],
          })));
        } else {
          setDbFactures([]);
        }
      } catch (e) {
        console.warn("[RemboursementFC] load db factures error", e);
      }


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
          typeApprenant: (ap as any).type_apprenant,
          apprenantId,
          startDate: start,
          endDate: end,
        });
        setExpected(exp);
      }
      setLoading(false);
    })();
  }, [apprenantId, refreshTick]);

  const signedCount = emargements.filter((r) => r.signature_data_url?.trim()).length;
  const hasEmargements = signedCount > 0;
  const hasFacture = factures.length > 0 || dbFactures.length > 0;
  const emargementBySlot = useMemo(() => {
    const map = new Map<string, EmargementRow>();
    for (const row of emargements) {
      const key = normalizeCreneauKey(row.demi_journee);
      if (key) map.set(emargementSlotKey(row.date_emargement, key), row);
    }
    return map;
  }, [emargements]);
  const missingEmargements = expected.filter((slot) => !isEmargementFilled(emargementBySlot.get(emargementSlotKey(slot.date, slot.creneau))));
  const missingCount = missingEmargements.length;
  const allSignableSlots = expected.length > 0
    ? expected
    : emargements
        .map((row) => {
          const creneau = normalizeCreneauKey(row.demi_journee);
          return creneau ? { date: row.date_emargement, creneau } : null;
        })
        .filter((slot): slot is { date: string; creneau: CreneauKey } => Boolean(slot));
  const signableSlots = missingEmargements.length > 0 ? missingEmargements : allSignableSlots;
  const firstSignable = signableSlots[0];
  const openSignatureFor = useCallback((slot: { date: string; creneau: CreneauKey }) => {
    const existing = emargementBySlot.get(emargementSlotKey(slot.date, slot.creneau));
    setSignTarget({ date: slot.date, creneau: slot.creneau, replaceExisting: Boolean(existing) });
  }, [emargementBySlot]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; date?: string; creneau?: CreneauKey } | null;
      if (data?.type !== "open-emargement-signature" || !data.date || !data.creneau) return;
      openSignatureFor({ date: data.date, creneau: data.creneau });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [openSignatureFor]);

  const handleDownloadEmargements = () => {
    setDownloading("emargements");
    try {
      const map = new Map<string, GroupedEmargements>();
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
      const html = buildEmargementHTML(grouped, apprenant, { isFormationContinue: true });
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

  const handleGenerateDbFacture = async (f: DbFacture) => {
    if (!apprenant) return;
    try {
      setGeneratingFactureId(f.id);
      const typeApp = `${apprenant.type_apprenant || ""} ${apprenant.formation_choisie || ""}`.toUpperCase();
      const formationType: "VTC" | "TAXI" = typeApp.includes("TAXI") ? "TAXI" : "VTC";
      const lastPay = f.paiements && f.paiements.length ? f.paiements[f.paiements.length - 1] : null;
      const result: any = await generateFactureFC(
        {
          numero: f.numero,
          dateEmission: f.date_emission,
          apprenant: {
            nom: apprenant.nom || "",
            prenom: apprenant.prenom || "",
            adresse: apprenant.adresse || undefined,
            code_postal: apprenant.code_postal || undefined,
            ville: apprenant.ville || undefined,
            email: apprenant.email || undefined,
            telephone: apprenant.telephone || undefined,
          },
          financeur: f.financeur || null,
          formation: formationType,
          designation: `Formation Continue Obligatoire ${formationType} - 14h`,
          montantHT: Number(f.montant_ttc) || 200,
          tvaTaux: 0,
          duree: "14h",
          acquittee: true,
          dateAcquittement: f.date_paiement || lastPay?.date_paiement || undefined,
          moyenPaiement: lastPay?.moyen_paiement || undefined,
        },
        { returnBlob: true }
      );
      if (result?.blob && result?.fileName) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("[RemboursementFC] generate facture error", e);
      toast.error("Erreur lors de la génération de la facture");
    } finally {
      setGeneratingFactureId(null);
    }
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
              <li>L'agrément du centre de formation</li>
              <li>Votre RIB (à fournir directement par vos soins)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Liens financeurs */}
      <Card className="p-4 bg-blue-50/60 border-blue-200">
        <div className="flex items-start gap-3">
          <ReceiptText className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Déposer votre demande de remboursement en ligne</h3>
            <p className="text-xs text-blue-800/80 mt-1">
              Selon votre organisme financeur, accédez directement au portail pour soumettre votre dossier :
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="flex flex-col gap-1">
                <a
                  href="https://www.fafcea.com/je-depose-ma-demande/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  🏢 FAFCA — Je dépose ma demande
                </a>
                <p className="text-[11px] text-blue-700/70">
                  Si vous êtes artisan VTC et que votre entreprise est toujours en activité
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <a
                  href="https://communication-agefice.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  🏪 AGEFICE — Espace adhérent
                </a>
                <p className="text-[11px] text-blue-700/70">
                  Si vous êtes VTC en plus commerçant, toujours en activité
                </p>
              </div>
            </div>
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
              {missingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  <AlertCircle className="h-3 w-3" />
                  {missingCount} à signer
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Feuille individuelle reprenant toutes vos signatures par demi-journée durant la formation.
            </p>
            {missingCount > 0 ? (
              <p className="text-xs text-amber-700 mt-1">
                Il reste {missingCount} créneau{missingCount > 1 ? "x" : ""} à signer avant de télécharger une feuille complète.
              </p>
            ) : !hasEmargements && (
              <p className="text-xs text-amber-700 mt-1">
                Aucune signature enregistrée pour le moment. Pensez à signer chaque demi-journée dans le module dédié.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={(emargements.length === 0 && expected.length === 0) || downloading === "emargements"}
                onClick={handleDownloadEmargements}
              >
                {downloading === "emargements" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Télécharger les feuilles d'émargement (PDF)
              </Button>
              {firstSignable && userId && (
                <Button size="sm" onClick={() => openSignatureFor(firstSignable)}>
                  <PenTool className="h-4 w-4 mr-1.5" />
                  {missingCount > 0 ? "Signer maintenant" : "Re-signer"}
                </Button>
              )}
            </div>
            {missingCount > 0 && userId && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 p-2">
                <p className="text-[11px] font-medium text-amber-900 mb-1.5">
                  Créneaux non signés ({missingCount})
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {missingEmargements.map((slot) => (
                    <button
                      key={emargementSlotKey(slot.date, slot.creneau)}
                      type="button"
                      onClick={() => openSignatureFor(slot)}
                      className="flex w-full items-center justify-between gap-2 rounded bg-background/80 px-2 py-1.5 text-left text-xs hover:bg-amber-100 transition-colors"
                    >
                      <span className="text-foreground">
                        <span className="capitalize">{formatDateFR(slot.date)}</span> — {creneauLabel(slot.creneau)} ({creneauHoraire(slot.creneau)})
                      </span>
                      <span className="inline-flex h-7 items-center rounded px-2 text-xs font-medium text-primary">
                        <PenTool className="h-3.5 w-3.5 mr-1" />
                        Signer
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {missingCount === 0 && userId && signableSlots.length > 0 && (
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/70 p-2">
                <p className="text-[11px] font-medium text-blue-900 mb-1.5">
                  Besoin de refaire une signature ?
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {signableSlots.map((slot) => (
                    <button
                      key={emargementSlotKey(slot.date, slot.creneau)}
                      type="button"
                      onClick={() => openSignatureFor(slot)}
                      className="flex w-full items-center justify-between gap-2 rounded bg-background/80 px-2 py-1.5 text-left text-xs hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-foreground">
                        <span className="capitalize">{formatDateFR(slot.date)}</span> — {creneauLabel(slot.creneau)} ({creneauHoraire(slot.creneau)})
                      </span>
                      <span className="inline-flex h-7 items-center rounded px-2 text-xs font-medium text-primary">
                        <PenTool className="h-3.5 w-3.5 mr-1" />
                        Re-signer
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 3. Attestation de fin de formation */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Award className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">3. Attestation de fin de formation continue {formation}</h3>
              {attestations.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Émise par le centre
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attestation de présence et de suivi, signée et datée par le représentant légal du centre (article 3 de l'arrêté du 11 août 2017).
            </p>
            {attestations.length > 0 ? (
              <div className="mt-2 space-y-2">
                {attestations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md p-2 bg-slate-50/50">
                    <div className="text-xs">
                      <div className="font-medium">{a.titre}</div>
                      <div className="text-muted-foreground">{a.nom_fichier}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.open(a.url, "_blank", "noopener,noreferrer")}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Télécharger
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Votre attestation est en cours d'édition par le centre. Elle sera disponible
                  ici dès qu'elle aura été validée et envoyée par votre formateur.
                </span>
              </div>
            )}
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
                {dbFactures.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 border rounded-md p-2 bg-emerald-50/50">
                    <div className="text-xs">
                      <div className="font-medium">Facture acquittée n° {f.numero}</div>
                      <div className="text-muted-foreground">
                        {Number(f.montant_ttc).toFixed(2).replace(".", ",")} €
                        {f.date_paiement ? ` — payée le ${f.date_paiement.split("-").reverse().join("/")}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateDbFacture(f)}
                      disabled={generatingFactureId === f.id}
                    >
                      {generatingFactureId === f.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1" />
                      )}
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

      {/* 5. Agrément VTC du centre */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Award className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">5. Agrément VTC du centre de formation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agrément préfectoral du centre FTRANSPORT (à joindre à votre dossier de remboursement).
            </p>
            <div className="mt-2">
              <a
                href={agrementVtcAsset.url}
                target="_blank"
                rel="noopener noreferrer"
                download="Agrement-VTC-FTRANSPORT.pdf"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md px-3 py-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Télécharger l'agrément VTC
              </a>
            </div>
          </div>
        </div>
      </Card>

      {!completed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onComplete}>J'ai pris connaissance des documents</Button>
        </div>
      )}

      {signTarget && userId && apprenantId && (
        <EmargementFCModal
          apprenantId={apprenantId}
          userId={userId}
          apprenantNom={apprenant?.nom || ""}
          apprenantPrenom={apprenant?.prenom || ""}
          creneau={signTarget.creneau}
          mode="fc"
          dateEmargement={signTarget.date}
          replaceExisting={signTarget.replaceExisting}
          onSigned={() => {
            setSignTarget(null);
            setRefreshTick((tick) => tick + 1);
          }}
          onSkipped={() => setSignTarget(null)}
        />
      )}
    </div>
  );
}
