import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText, Eye, ChevronDown, ChevronUp, ClipboardCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateControleQualitePdf } from "@/lib/pdf/controle-qualite";

/** Renders donnees content with real question texts instead of raw JSON */
function DonneesRenderer({ donnees }: { donnees: any }) {
  if (!donnees || typeof donnees !== "object") return null;

  // Competences / checklist format: { answers: { "0-0": "oui" }, sections: [...], sectionItems: [[...], [...]] }
  if (donnees.answers && donnees.sections && donnees.sectionItems) {
    return (
      <div className="bg-muted/50 rounded p-3 max-h-80 overflow-y-auto space-y-3">
        {donnees.formationLabel && (
          <p className="text-xs font-semibold text-muted-foreground">{donnees.formationLabel}</p>
        )}
        {(donnees.sections as string[]).map((sectionTitle: string, sIdx: number) => {
          const items: string[] = donnees.sectionItems?.[sIdx] || [];
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

  // Fetch completed documents from DB
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

  const getDocStatus = (doc: ControleDocument): { found: boolean; details?: any } => {
    if (doc.isStatic) return { found: true };
    if (doc.docType) {
      const match = completedDocs.find((d: any) => d.type_document === doc.docType);
      return { found: !!match, details: match };
    }
    if (doc.isProgress) {
      return { found: moduleCompletions.length > 0 };
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
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" />
              Télécharger PDF
            </Button>
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
