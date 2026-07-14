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
import { generateFicheProgression, type FicheProgressionData, type ProgressionModule } from "@/lib/pdf/fiche-progression";
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
        // Le PDF du relevé est généré plus bas (après le calcul des temps présentiel/pratique)
        // pour inclure la synthèse complète des durées.

        // 3b) Rapport d'activité élève (HTML — même vue que "Imprimer le rapport")
        try {
          const [actRes, complRes, qrRes] = await Promise.all([
            supabase
              .from("apprenant_module_activites")
              .select("id, module_id, module_nom, action_type, occurred_at")
              .eq("apprenant_id", apprenant.id)
              .order("occurred_at", { ascending: false }),
            supabase
              .from("apprenant_module_completion")
              .select("module_id")
              .eq("apprenant_id", apprenant.id),
            supabase
              .from("apprenant_quiz_results")
              .select("id, quiz_titre, matiere_nom, completed_at")
              .eq("apprenant_id", apprenant.id)
              .order("completed_at", { ascending: false }),
          ]);
          const html = buildRapportActiviteHtml({
            apprenant: {
              nom: apprenant.nom,
              prenom: apprenant.prenom,
              email: apprenant.email,
              type_apprenant: apprenant.type_apprenant,
            },
            connexions: cnxRawRows.map((r: any) => ({
              id: r.id || "",
              started_at: r.started_at,
              ended_at: r.ended_at,
              last_seen_at: r.last_seen_at,
              current_module: r.current_module,
            })),
            activites: ((actRes.data as any[]) || []) as any,
            quizResults: ((qrRes.data as any[]) || []) as any,
            completedModuleIds: new Set(((complRes.data as any[]) || []).map((r: any) => r.module_id as number)),
          });
          releveFolder.file(`rapport-activite_${slug}.html`, html);
        } catch (rapErr) {
          console.error("[bulk-download] rapport activite failed:", rapErr);
        }

        // 3c) Suivi de progression e-learning (PDF Qualiopi)
        try {
          const [actAllRes, complAllRes, qrAllRes, cnxAllRes, emargAllRes, sessInscritsRes, exosRes] = await Promise.all([
            supabase
              .from("apprenant_module_activites")
              .select("module_id, module_nom, action_type, occurred_at")
              .eq("apprenant_id", apprenant.id)
              .order("occurred_at", { ascending: true }),
            supabase
              .from("apprenant_module_completion")
              .select("module_id, completed_at")
              .eq("apprenant_id", apprenant.id),
            supabase
              .from("apprenant_quiz_results")
              .select("quiz_titre, matiere_nom, score_obtenu, score_max, note_sur_20, reussi, duree_secondes, completed_at")
              .eq("apprenant_id", apprenant.id)
              .order("completed_at", { ascending: true }),
            supabase
              .from("apprenant_connexions")
              .select("started_at, ended_at, last_seen_at")
              .eq("apprenant_id", apprenant.id),
            supabase
              .from("emargements_fc" as any)
              .select("date_emargement, demi_journee, absent")
              .eq("apprenant_id", apprenant.id),
            supabase
              .from("session_apprenants")
              .select("session_id, heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, heure_debut, heure_fin, date_debut, date_fin)")
              .eq("apprenant_id", apprenant.id),
            supabase
              .from("reponses_apprenants")
              .select("updated_at")
              .eq("apprenant_id", apprenant.id)
              .eq("completed", true),
          ]);
          if (actAllRes.error) console.error("[bulk-download] activites error:", actAllRes.error);
          if (complAllRes.error) console.error("[bulk-download] completion error:", complAllRes.error);
          if (qrAllRes.error) console.error("[bulk-download] quiz error:", qrAllRes.error);
          const acts = (actAllRes.data as any[]) || [];
          const compls = (complAllRes.data as any[]) || [];
          const quizzes = (qrAllRes.data as any[]) || [];
          const cnxAll = (cnxAllRes.data as any[]) || [];
          const emargAll = (emargAllRes.data as any[]) || [];
          const sessInscrits = (sessInscritsRes.data as any[]) || [];
          const exos = (exosRes.data as any[]) || [];
          const completedIds = new Set(compls.map((c: any) => c.module_id));

          // Group activités by module — derive duration from consecutive occurred_at within same module (cap 15min)
          const modulesMap = new Map<string, { firstDate?: string; lastDate?: string; totalSec: number; moduleId?: number }>();
          const sortedActs = [...acts].sort((a, b) => (a.occurred_at || "").localeCompare(b.occurred_at || ""));
          for (let i = 0; i < sortedActs.length; i++) {
            const a = sortedActs[i];
            const key = a.module_nom || `Module ${a.module_id ?? "?"}`;
            const cur: { firstDate?: string; lastDate?: string; totalSec: number; moduleId?: number } =
              modulesMap.get(key) || { totalSec: 0, moduleId: a.module_id };
            if (!cur.firstDate || (a.occurred_at && a.occurred_at < cur.firstDate)) cur.firstDate = a.occurred_at;
            if (!cur.lastDate || (a.occurred_at && a.occurred_at > cur.lastDate)) cur.lastDate = a.occurred_at;
            const next = sortedActs[i + 1];
            if (next && next.module_id === a.module_id && a.occurred_at && next.occurred_at) {
              const diff = (new Date(next.occurred_at).getTime() - new Date(a.occurred_at).getTime()) / 1000;
              if (diff > 0 && diff < 900) cur.totalSec += diff;
            }
            modulesMap.set(key, cur);
          }
          // Ensure completed modules appear even without activités
          for (const c of compls) {
            const alreadyIn = Array.from(modulesMap.values()).some(v => v.moduleId === c.module_id);
            if (!alreadyIn) {
              modulesMap.set(`Module ${c.module_id}`, {
                totalSec: 0,
                moduleId: c.module_id,
                firstDate: c.completed_at,
                lastDate: c.completed_at,
              });
            }
          }

          // Quiz per matière/module
          const quizByMod = new Map<string, any[]>();
          for (const q of quizzes) {
            const key = q.matiere_nom || "Quiz";
            const arr = quizByMod.get(key) || [];
            arr.push(q);
            quizByMod.set(key, arr);
          }

          const fmtDate = (s?: string) => s ? format(new Date(s), "dd/MM/yyyy") : "-";
          const fmtDur = (sec: number) => {
            if (!sec) return "0h00";
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h}h${String(m).padStart(2, "0")}`;
          };

          const progModules: ProgressionModule[] = Array.from(modulesMap.entries()).map(([nom, info]) => {
            const lignes: ProgressionModule["lignes"] = [{
              type: "cours",
              label: nom,
              date: fmtDate(info.firstDate),
              duree: fmtDur(Math.round(info.totalSec)),
              statut: info.moduleId && completedIds.has(info.moduleId) ? "Termine" : "En cours",
            }];
            const modQuizzes = quizByMod.get(nom) || [];
            for (const q of modQuizzes) {
              const pct = q.score_max ? Math.round((Number(q.score_obtenu) / Number(q.score_max)) * 100) : null;
              const scoreLabel = q.note_sur_20 != null
                ? `${Number(q.note_sur_20).toFixed(1)}/20`
                : pct !== null ? `${pct}%` : "-";
              lignes.push({
                type: "quiz",
                label: q.quiz_titre || "Quiz",
                date: fmtDate(q.completed_at),
                duree: q.duree_secondes ? fmtDur(Number(q.duree_secondes)) : "-",
                score: scoreLabel,
                statut: q.reussi ? "Reussi" : "Realise",
              });
            }
            return { nom, lignes };
          });

          // ---- E-learning : temps TOTAL de connexion (identique au relevé de connexions + rapport d'activité)
          // Somme des sessions (ended_at || last_seen_at) - started_at, plafonnée à 7h par session.
          const MAX_SESSION_MS = 7 * 60 * 60 * 1000;
          let onlineMin = 0;
          for (const c of cnxRawRows) {
            const s = c.started_at;
            const e = c.ended_at || c.last_seen_at;
            if (!s || !e) continue;
            const startMs = new Date(s).getTime();
            const rawEndMs = new Date(e).getTime();
            if (!isFinite(startMs) || !isFinite(rawEndMs)) continue;
            const endMs = Math.min(rawEndMs, startMs + MAX_SESSION_MS);
            const ms = endMs - startMs;
            if (ms > 0) onlineMin += Math.floor(ms / 60000);
          }
          const onlineSec = onlineMin * 60;

          // ---- Présentiel théorie : émargements FC
          const byDate = new Map<string, Set<string>>();
          for (const r of emargAll) {
            if (r.absent) continue;
            const date = String(r.date_emargement || "").slice(0, 10);
            const slot = String(r.demi_journee || "").trim().toLowerCase();
            if (!date || !slot) continue;
            if (!byDate.has(date)) byDate.set(date, new Set());
            byDate.get(date)!.add(slot);
          }
          let theorieHours = 0;
          for (const slots of byDate.values()) {
            const eveningSlot = slots.has("soir") || slots.has("soir_1") || slots.has("soir_2");
            if (eveningSlot) {
              theorieHours += Math.min(
                (slots.has("soir") ? 4 : 0) +
                  (slots.has("soir_1") ? 1.5 : 0) +
                  (slots.has("soir_2") ? 2.5 : 0),
                4,
              );
            } else {
              theorieHours += Math.min((slots.has("matin") ? 3 : 0) + (slots.has("apres_midi") ? 3 : 0), 6);
            }
          }
          const theorieSec = Math.round(theorieHours * 3600);

          // ---- Pratique (présentiel) : sessions de type "pratique" auxquelles l'apprenant est inscrit
          const parseHM = (s?: string | null) => {
            if (!s) return null;
            const m = String(s).match(/^(\d{1,2}):(\d{2})/);
            if (!m) return null;
            return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
          };
          const MAX_PRATIQUE_MIN_PER_SESSION = 6 * 60; // la pratique dépasse rarement 6h par session
          let pratiqueMinutes = 0;
          for (const si of sessInscrits) {
            const sess = si.sessions;
            const type = String(sess?.type_session || "").toLowerCase();
            if (!type.includes("pratique")) continue;
            const hd = parseHM(si.heure_debut_personnalisee) ?? parseHM(sess?.heure_debut);
            const hf = parseHM(si.heure_fin_personnalisee) ?? parseHM(sess?.heure_fin);
            let dur: number;
            if (hd != null && hf != null && hf > hd) {
              dur = hf - hd;
            } else {
              dur = 3 * 60; // valeur par défaut d'une session pratique
            }
            pratiqueMinutes += Math.min(dur, MAX_PRATIQUE_MIN_PER_SESSION);
          }
          const pratiqueSec = pratiqueMinutes * 60;

          const presentielTotalSec = theorieSec + pratiqueSec;
          const grandTotalSec = onlineSec + presentielTotalSec;

          const notes = quizzes
            .filter((q: any) => q.note_sur_20 != null)
            .map((q: any) => Number(q.note_sur_20));
          const avgLabel = notes.length
            ? `${(notes.reduce((s, v) => s + v, 0) / notes.length).toFixed(1)}/20`
            : "-";

          const data: FicheProgressionData = {
            nom: apprenant.nom || "",
            prenom: apprenant.prenom || "",
            formation: apprenant.type_apprenant || apprenant.formation || "-",
            codeFormation: apprenant.code_formation || "-",
            periodeDebut: apprenant.date_debut_cours_en_ligne
              ? format(new Date(apprenant.date_debut_cours_en_ligne), "dd/MM/yyyy")
              : (apprenant.date_debut_formation ? format(new Date(apprenant.date_debut_formation), "dd/MM/yyyy") : "-"),
            periodeFin: apprenant.date_fin_cours_en_ligne
              ? format(new Date(apprenant.date_fin_cours_en_ligne), "dd/MM/yyyy")
              : (apprenant.date_fin_formation ? format(new Date(apprenant.date_fin_formation), "dd/MM/yyyy") : "-"),
            tempsTotal: fmtDur(grandTotalSec),
            tempsEnLigne: fmtDur(onlineSec),
            tempsPresentielTheorie: fmtDur(theorieSec),
            tempsPresentielPratique: fmtDur(pratiqueSec),
            tempsPresentielTotal: fmtDur(presentielTotalSec),
            modules: progModules,
            recap: {
              modulesCompletes: progModules.filter(m => m.lignes[0]?.statut === "Termine").length,
              modulesTotal: progModules.length,
              quizCompletes: quizzes.length,
              quizTotal: quizzes.length,
              scoreMoyen: avgLabel,
              statut: progModules.length > 0 && progModules.every(m => m.lignes[0]?.statut === "Termine")
                ? "FORMATION ENTIEREMENT COMPLETEE"
                : "FORMATION EN COURS",
            },
          };

          const prog = generateFicheProgression(data, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
          if (prog?.blob) {
            zip.folder("suivi-progression")!.file(prog.fileName, prog.blob);
          }

          // Relevé de connexions (avec synthèse des durées : e-learning, théorie, pratique, total)
          try {
            const relevePdf = generateReleveConnexionsPdf(apprenant, cnxRawRows, {
              returnBlob: true,
              tempsPresentielTheorie: fmtDur(theorieSec),
              tempsPratique: fmtDur(pratiqueSec),
              tempsTotal: fmtDur(grandTotalSec),
            }) as { blob: Blob; fileName: string } | undefined;
            if (relevePdf?.blob) {
              releveFolder.file(relevePdf.fileName, relevePdf.blob);
            }
          } catch (pdfErr) {
            console.error("[bulk-download] releve PDF generation failed:", pdfErr);
          }
        } catch (progErr) {
          console.error("[bulk-download] suivi progression failed:", progErr);
          // Fallback: relevé simple sans synthèse
          try {
            const relevePdf = generateReleveConnexionsPdf(apprenant, cnxRawRows, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
            if (relevePdf?.blob) releveFolder.file(relevePdf.fileName, relevePdf.blob);
          } catch {}
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
