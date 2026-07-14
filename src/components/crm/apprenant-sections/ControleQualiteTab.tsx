import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText, Eye, ChevronDown, ChevronUp, ClipboardCheck, Download, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, startOfWeek, endOfWeek, getISOWeek, getYear, addWeeks, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { generateControleQualitePdf } from "@/lib/pdf/controle-qualite";
import { generateEmargementSemainePdf } from "@/lib/pdf/emargement-semaine";
import { generateReleveConnexionsPdf } from "@/lib/pdf/releve-connexions";
import { buildRapportActiviteHtml } from "@/lib/reports/rapport-activite-html";
import { getCompetencesForFormation } from "@/components/cours-en-ligne/competences-checklist-data";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

/** Renders donnees content with real question texts instead of raw JSON */
function DonneesRenderer({ donnees }: { donnees: any }) {
  if (!donnees || typeof donnees !== "object") return null;

  // Competences / checklist format: { answers: { "0-0": "oui" }, sections: [...], sectionItems: [[...], [...]] }
  if (donnees.answers && donnees.sections) {
    // Fallback to reference data when sectionItems not saved
    const fallbackData = getCompetencesForFormation(donnees.formationLabel);
    const fallbackItems = fallbackData.sections.map(s => s.items);
    return (
      <div className="bg-muted/50 rounded p-3 max-h-80 overflow-y-auto space-y-3">
        {donnees.formationLabel && (
          <p className="text-xs font-semibold text-muted-foreground">{donnees.formationLabel}</p>
        )}
        {(donnees.sections as string[]).map((sectionTitle: string, sIdx: number) => {
          const items: string[] = donnees.sectionItems?.[sIdx] || fallbackItems[sIdx] || [];
          return (
            <div key={sIdx}>
              <p className="text-xs font-bold text-primary mb-1">{sectionTitle}</p>
              <div className="space-y-1">
                {items.map((item: string, iIdx: number) => {
                  const key = `${sIdx}-${iIdx}`;
                  const answer = donnees.answers[key];
                  return (
                    <div key={key} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 font-semibold ${answer === "oui" ? "text-emerald-600" : answer === "non" ? "text-destructive" : "text-muted-foreground"}`}>
                        {answer === "oui" ? "✅ Oui" : answer === "non" ? "❌ Non" : "—"}
                      </span>
                      <span className="text-foreground">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Generic key-value format (analyse-besoin, projet-professionnel, etc.)
  const SKIP_KEYS = ["signature", "signatureResponsable", "_status"];
  const LABELS: Record<string, string> = {
    formType: "Type de formation", dateEntretien: "Date d'entretien", conseiller: "Conseiller",
    lieuNaissance: "Lieu de naissance", statutActuel: "Statut actuel", metierActuel: "Métier actuel",
    motivations: "Motivations", modeExercice: "Mode d'exercice", zoneExercice: "Zone d'exercice",
    craintes: "Craintes", commentConnu: "Comment connu", coherenceProjet: "Cohérence du projet",
    niveauMotivation: "Niveau de motivation", observations: "Observations",
    situation_actuelle: "Situation actuelle", niveau_etude: "Niveau d'études",
    experience_transport: "Expérience transport", motivation: "Motivation",
    financement: "Financement", cgv_accepted: "CGV acceptées", ri_accepted: "RI accepté",
    accepted: "Accepté", accepted_at: "Date d'acceptation", noteGlobale: "Note globale",
    pointsForts: "Points forts", pointsAmeliorer: "Points à améliorer",
    nom: "Nom", prenom: "Prénom", email: "Email", telephone: "Téléphone",
  };

  const entries = Object.entries(donnees).filter(
    ([k, v]) => !SKIP_KEYS.includes(k) && v !== null && v !== undefined && v !== ""
      && !(typeof v === "string" && v.startsWith("data:image/"))
  );

  if (entries.length === 0) return null;

  return (
    <div className="bg-muted/50 rounded p-3 max-h-80 overflow-y-auto space-y-1.5">
      {entries.map(([key, value]) => {
        const label = LABELS[key] || key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, s => s.toUpperCase());
        const display = typeof value === "boolean" ? (value ? "Oui" : "Non")
          : typeof value === "object" ? JSON.stringify(value)
          : String(value);
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-semibold text-muted-foreground shrink-0 min-w-[120px]">{label} :</span>
            <span className="text-foreground">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  apprenant: any;
}

interface ControleDocument {
  id: string;
  label: string;
  description: string;
  category: "formulaire" | "suivi" | "administratif";
  /** Key in apprenant_documents_completes.type_document */
  docType?: string;
  /** If true, check apprenant_module_completion for progress */
  isProgress?: boolean;
  /** If true, check apprenant_connexions for activity */
  isActivity?: boolean;
  /** Static document — always available */
  isStatic?: boolean;
  /** Formation-specific variants */
  formations?: string[];
}

const CONTROLE_DOCUMENTS: ControleDocument[] = [
  {
    id: "fiche-positionnement",
    label: "Fiche de positionnement stagiaire",
    description: "Test de compétences rempli à l'entrée en formation",
    category: "formulaire",
    docType: "test-competences",
  },
  {
    id: "projet-professionnel",
    label: "Questionnaire projet professionnel",
    description: "Projet professionnel TAXI ou VTC",
    category: "formulaire",
    docType: "projet-professionnel",
  },
  {
    id: "verification-prerequis",
    label: "Vérification des prérequis",
    description: "Analyse du besoin TAXI, VTC, TA ou VA",
    category: "formulaire",
    docType: "analyse-besoin",
  },
  {
    id: "cgv-acceptation",
    label: "Conditions Generales de Vente",
    description: "CGV acceptees par le stagiaire (e-learning ou presentiel)",
    category: "formulaire",
    docType: "cgv-acceptation",
  },
  {
    id: "cgv-ri-acceptation",
    label: "CGV et Reglement Interieur",
    description: "CGV et reglement interieur signes (presentiel)",
    category: "formulaire",
    docType: "cgv-ri-acceptation",
  },
  {
    id: "suivi-progression",
    label: "Suivi de progression e-learning",
    description: "Progression des modules et scores obtenus",
    category: "suivi",
    isProgress: true,
  },
  {
    id: "rapport-activite",
    label: "Rapport d'activité e-learning",
    description: "Historique des connexions et activités de l'apprenant",
    category: "suivi",
    isActivity: true,
  },
  {
    id: "evaluation-pedagogique",
    label: "Évaluation pédagogique",
    description: "Évaluation des acquis de l'apprenant",
    category: "formulaire",
    docType: "evaluation-acquis",
  },
  {
    id: "attestation-fin",
    label: "Attestation de fin de formation",
    description: "Document attestant la fin de la formation",
    category: "administratif",
    isStatic: true,
  },
  {
    id: "note-synthese",
    label: "Note de synthèse du parcours stagiaire",
    description: "Synthèse globale du parcours de l'apprenant",
    category: "suivi",
    isProgress: true,
  },
  {
    id: "enquete-satisfaction",
    label: "Enquête de satisfaction",
    description: "Questionnaire de satisfaction TAXI, TA, VTC ou VA",
    category: "formulaire",
    docType: "satisfaction",
  },
  {
    id: "programme-formation",
    label: "Programme de formation",
    description: "Programme officiel TAXI, VTC, TA ou VA",
    category: "administratif",
    isStatic: true,
  },
  {
    id: "tableau-croise",
    label: "Tableau croisé formation / compétences",
    description: "Référentiel de compétences par formation",
    category: "administratif",
    isStatic: true,
  },
  {
    id: "organigramme",
    label: "Organigramme de l'organisme de formation",
    description: "Organisation interne de l'organisme",
    category: "administratif",
    isStatic: true,
  },
  {
    id: "grille-tarifaire",
    label: "Grille tarifaire des formations",
    description: "Tarifs en vigueur pour chaque formation",
    category: "administratif",
    isStatic: true,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  formulaire: "📋 Formulaires stagiaire",
  suivi: "📊 Suivi pédagogique",
  administratif: "📁 Documents administratifs",
};

export function ControleQualiteTab({ apprenant }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast } = useToast();
  const { data: completedDocs = [] } = useQuery({
    queryKey: ["apprenant-documents-completes", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenant_documents_completes" as any)
        .select("*")
        .eq("apprenant_id", apprenant.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch module completion for progress tracking
  const { data: moduleCompletions = [] } = useQuery({
    queryKey: ["apprenant-module-completion", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenant_module_completion")
        .select("*")
        .eq("apprenant_id", apprenant.id);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch connexions for activity report tracking
  const { data: connexions = [] } = useQuery({
    queryKey: ["apprenant-connexions-qualite", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenant_connexions")
        .select("id")
        .eq("apprenant_id", apprenant.id)
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  const getDocStatus = (doc: ControleDocument): { found: boolean; details?: any } => {
    if (doc.isStatic) return { found: true };
    if (doc.docType) {
      const match = completedDocs.find((d: any) => d.type_document === doc.docType);
      return { found: !!match, details: match };
    }
    if (doc.isProgress) {
      return { found: moduleCompletions.length > 0 };
    }
    if (doc.isActivity) {
      return { found: connexions.length > 0 };
    }
    return { found: false };
  };

  const categories = ["formulaire", "suivi", "administratif"] as const;
  const totalDocs = CONTROLE_DOCUMENTS.length;
  const completedCount = CONTROLE_DOCUMENTS.filter(d => getDocStatus(d).found).length;
  const pct = Math.round((completedCount / totalDocs) * 100);

    const handleDownloadPdf = () => {
      const pdfItems = CONTROLE_DOCUMENTS.map(doc => {
        const status = getDocStatus(doc);
        return {
          label: doc.label,
          category: doc.category,
          found: status.found,
          completedAt: status.details?.completed_at,
          donnees: status.details?.donnees || null,
        };
      });
      generateControleQualitePdf(apprenant, pdfItems);
    };

    const escapeCsv = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",;\n\r]/.test(s) ? `"${s}"` : s;
    };
    const toCsv = (rows: any[], columns: string[]) => {
      const header = columns.join(";");
      const lines = rows.map(r => columns.map(c => escapeCsv(r[c])).join(";"));
      return "\uFEFF" + [header, ...lines].join("\r\n");
    };

    const handleDownloadAll = async () => {
      setBulkLoading(true);
      try {
        const formateur = (window.prompt(
          "Nom du formateur à indiquer sur les feuilles d'émargement :",
          "GUENICHI Naoufal",
        ) || "GUENICHI Naoufal").trim();

        const zip = new JSZip();
        const slug = `${apprenant.prenom || ""}-${apprenant.nom || ""}`
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprenant";

        // 1) Contrôle qualité PDF
        const pdfItems = CONTROLE_DOCUMENTS.map(doc => {
          const status = getDocStatus(doc);
          return {
            label: doc.label,
            category: doc.category,
            found: status.found,
            completedAt: status.details?.completed_at,
            donnees: status.details?.donnees || null,
          };
        });
        const cq = generateControleQualitePdf(apprenant, pdfItems, { returnBlob: true });
        if (cq) zip.folder("controle-qualite")!.file(cq.fileName, cq.blob);

        // 2) Feuilles d'émargement hebdomadaires
        const { data: emargData } = await supabase
          .from("emargements_fc" as any)
          .select("*")
          .eq("apprenant_id", apprenant.id)
          .order("date_emargement", { ascending: true });
        const emargements = (emargData as any[]) || [];
        const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; year: number; week: number; sigs: any[] }>();

        const addWeek = (d: Date, sig?: any) => {
          const ws = startOfWeek(d, { weekStartsOn: 1 });
          const we = endOfWeek(d, { weekStartsOn: 1 });
          const year = getYear(ws);
          const week = getISOWeek(ws);
          const key = `${year}-W${String(week).padStart(2, "0")}`;
          if (!weekMap.has(key)) weekMap.set(key, { weekStart: ws, weekEnd: we, year, week, sigs: [] });
          if (sig) weekMap.get(key)!.sigs.push(sig);
        };

        for (const e of emargements) {
          if (!e.date_emargement) continue;
          const d = new Date(e.date_emargement + "T00:00:00");
          addWeek(d, {
            date: e.date_emargement,
            demi_journee: e.demi_journee,
            signed_at: e.signed_at,
            signature: e.signature_data_url,
            confirme_presence_lieu: !!e.confirme_presence_lieu,
            confirme_identite: !!e.confirme_identite,
          });
        }

        // Toujours iterer toutes les semaines de la periode de formation, meme sans signature
        const startStr = apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne;
        const endStr = apprenant.date_fin_formation || apprenant.date_fin_cours_en_ligne;
        if (startStr && endStr) {
          try {
            let cursor = startOfWeek(parseISO(startStr), { weekStartsOn: 1 });
            const stop = endOfWeek(parseISO(endStr), { weekStartsOn: 1 });
            let safety = 0;
            while ((isBefore(cursor, stop) || +cursor === +stop) && safety < 260) {
              addWeek(cursor);
              cursor = addWeeks(cursor, 1);
              safety++;
            }
          } catch {}
        }

        const emargFolder = zip.folder("feuilles-emargement-hebdomadaires")!;
        const sortedWeeks = Array.from(weekMap.values()).sort(
          (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
        );
        for (const w of sortedWeeks) {
          const wsStr = format(w.weekStart, "yyyy-MM-dd");
          const weStr = format(w.weekEnd, "yyyy-MM-dd");
          const label = `Semaine ${w.week} - ${w.year}`;
          const sigs = w.sigs.sort((a, b) => a.date.localeCompare(b.date));
          const res = generateEmargementSemainePdf(apprenant, label, wsStr, weStr, sigs, formateur, { returnBlob: true });
          if (res) emargFolder.file(res.fileName, res.blob);
        }

        // 3) Relevé de connexion (PDF + CSV)
        const { data: cnxData } = await supabase
          .from("apprenant_connexions")
          .select("started_at, ended_at, last_seen_at, last_action_at, end_reason, source, current_module, ip_address, user_agent")
          .eq("apprenant_id", apprenant.id)
          .order("started_at", { ascending: false });
        const cnxRawRows = (cnxData as any[]) || [];
        const releveFolder = zip.folder("releve-connexions")!;
        try {
          const relevePdf = generateReleveConnexionsPdf(apprenant, cnxRawRows, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
          if (relevePdf?.blob) {
            releveFolder.file(relevePdf.fileName, relevePdf.blob);
          } else {
            console.warn("[bulk-download] releve PDF: no blob returned");
          }
        } catch (pdfErr) {
          console.error("[bulk-download] releve PDF generation failed:", pdfErr);
        }


        const cnxRows = cnxRawRows.map(r => ({
          date_debut: r.started_at ? format(new Date(r.started_at), "yyyy-MM-dd HH:mm:ss") : "",
          date_fin: r.ended_at ? format(new Date(r.ended_at), "yyyy-MM-dd HH:mm:ss") : "",
          derniere_activite: r.last_action_at ? format(new Date(r.last_action_at), "yyyy-MM-dd HH:mm:ss") : "",
          duree_min: r.started_at && (r.ended_at || r.last_seen_at)
            ? Math.round((new Date(r.ended_at || r.last_seen_at).getTime() - new Date(r.started_at).getTime()) / 60000)
            : "",
          module: r.current_module || "",
          source: r.source || "",
          fin: r.end_reason || "",
          ip: r.ip_address || "",
          navigateur: r.user_agent || "",
        }));
        const cnxCsv = toCsv(cnxRows, ["date_debut","date_fin","derniere_activite","duree_min","module","source","fin","ip","navigateur"]);
        releveFolder.file(`releve-connexions_${slug}.csv`, cnxCsv);

        // 4) Trace des emails envoyés / reçus (CSV)
        const { data: emailsData } = await supabase
          .from("emails")
          .select("type, subject, sender_email, sender_name, recipients, sent_at, received_at, created_at, is_read, has_attachments, body_preview")
          .eq("apprenant_id", apprenant.id)
          .order("created_at", { ascending: false });
        const emailRows = ((emailsData as any[]) || []).map(e => ({
          type: e.type === "sent" ? "Envoyé" : "Reçu",
          date: (e.sent_at || e.received_at || e.created_at)
            ? format(new Date(e.sent_at || e.received_at || e.created_at), "yyyy-MM-dd HH:mm:ss") : "",
          sujet: e.subject || "",
          expediteur: e.sender_name ? `${e.sender_name} <${e.sender_email || ""}>` : (e.sender_email || ""),
          destinataires: Array.isArray(e.recipients) ? e.recipients.join(", ") : (e.recipients || ""),
          lu: e.is_read ? "Oui" : "Non",
          pieces_jointes: e.has_attachments ? "Oui" : "Non",
          apercu: (e.body_preview || "").replace(/\s+/g, " ").slice(0, 500),
        }));
        const emailCsv = toCsv(emailRows, ["type","date","sujet","expediteur","destinataires","lu","pieces_jointes","apercu"]);
        zip.folder("emails")!.file(`emails_${slug}.csv`, emailCsv);

        const blob = await zip.generateAsync({ type: "blob" });
        const today = format(new Date(), "yyyy-MM-dd");
        saveAs(blob, `dossier-complet_${slug}_${today}.zip`);

        toast({
          title: "Téléchargement prêt",
          description: `Contrôle qualité, ${weekMap.size} feuille(s) d'émargement, ${cnxRows.length} connexion(s), ${emailRows.length} email(s).`,
        });
      } catch (err: any) {
        console.error("[bulk-download]", err);
        toast({
          title: "Erreur",
          description: err?.message || "Impossible de générer l'archive.",
          variant: "destructive",
        });
      } finally {
        setBulkLoading(false);
      }
    };


    return (
    <div className="space-y-6">
      {/* Summary header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Contrôle qualité — Dossier apprenant
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleDownloadAll}
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Tout télécharger (ZIP)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Complétude du dossier</span>
                <span className="text-sm font-bold">{completedCount} / {totalDocs} documents</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <Badge variant={pct === 100 ? "default" : "secondary"} className={pct === 100 ? "bg-emerald-500" : ""}>
              {pct}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Documents by category */}
      {categories.map(cat => {
        const docs = CONTROLE_DOCUMENTS.filter(d => d.category === cat);
        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{CATEGORY_LABELS[cat]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map(doc => {
                const status = getDocStatus(doc);
                const isExpanded = expandedId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-3 transition-all ${status.found ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800' : 'border-destructive/30 bg-destructive/5'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {status.found ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                        <div>
                          <p className={`font-medium text-sm ${!status.found ? 'text-destructive' : ''}`}>
                            {doc.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status.found ? (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-xs">
                            ✅ Présent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                            ❌ Manquant
                          </Badge>
                        )}
                        {status.details && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && status.details && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Complété le :{" "}
                            {format(new Date(status.details.completed_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                          </span>
                          {status.details.module_id && (
                            <span>Module #{status.details.module_id}</span>
                          )}
                        </div>
                        {status.details.donnees && (
                          <DonneesRenderer donnees={status.details.donnees} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
