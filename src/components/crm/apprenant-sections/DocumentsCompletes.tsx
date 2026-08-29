import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, ChevronDown, ChevronUp, FileDown, ExternalLink } from "lucide-react";
import { generateDocumentIndividuelPdf } from "@/lib/pdf/document-individuel";
import { generateEmargementSemainePdf } from "@/lib/pdf/emargement-semaine";
import {
  DOCUMENT_SIGNATURE_TYPES,
  ensureDocumentSignatures,
  findSharedStagiaireSignature,
  findSharedStagiaireSignatureName,
} from "@/lib/pdf/document-signatures";
import { useState } from "react";
import { format, startOfWeek, endOfWeek, getISOWeek, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import { computePresenceHours, formatPresenceHours, isEveningTrainingValue, isFormationContinueValue } from "@/lib/emargementHours";

interface Props {
  apprenant: any;
}

const TYPE_LABELS: Record<string, string> = {
  "test-competences": "Test de compétences",
  "analyse-besoin": "Analyse du besoin",
  "projet-professionnel": "Projet professionnel",
  "evaluation-acquis": "Évaluation des acquis",
  "satisfaction": "Questionnaire de satisfaction",
  "cgv-ri-acceptation": "CGV et Règlement intérieur",
  "cgv-acceptation": "Conditions Générales de Vente",
  "dossier-bienvenue": "Dossier de bienvenue",
  "devis-formation-continue": "Devis Formation Continue",
  "devis-envoi": "Devis envoyé / signé",
  "devis-personnel": "Devis rempli en ligne",
  "emargement-fc": "Feuille d'émargement",
  "emargement-fc-semaine": "Émargement hebdomadaire",
  "doc-fournisseur": "Document fournisseur",
  "document-inscription": "Document d'inscription",
};

const TYPE_COLORS: Record<string, string> = {
  "test-competences": "bg-blue-100 text-blue-800",
  "analyse-besoin": "bg-amber-100 text-amber-800",
  "projet-professionnel": "bg-purple-100 text-purple-800",
  "evaluation-acquis": "bg-emerald-100 text-emerald-800",
  "satisfaction": "bg-pink-100 text-pink-800",
  "cgv-ri-acceptation": "bg-orange-100 text-orange-800",
  "cgv-acceptation": "bg-teal-100 text-teal-800",
  "dossier-bienvenue": "bg-green-100 text-green-800",
  "devis-formation-continue": "bg-indigo-100 text-indigo-800",
  "devis-envoi": "bg-cyan-100 text-cyan-800",
  "devis-personnel": "bg-cyan-500 text-white",
  "emargement-fc": "bg-rose-100 text-rose-800",
  "emargement-fc-semaine": "bg-green-500 text-white",
  "doc-fournisseur": "bg-violet-100 text-violet-800",
  "document-inscription": "bg-sky-100 text-sky-800",
};

const FIELD_LABELS: Record<string, string> = {
  formType: 'Type de formation',
  dateEntretien: "Date d'entretien",
  conseiller: 'Conseiller',
  lieuNaissance: 'Lieu de naissance',
  statutActuel: 'Statut actuel',
  metierActuel: 'Métier actuel',
  anciennete: 'Ancienneté',
  niveauFormation: 'Niveau de formation',
  motivations: 'Motivations',
  dejaTransport: 'Expérience transport',
  detailTransport: 'Détail transport',
  permis3ans: 'Permis > 3 ans',
  datePermis: 'Date du permis',
  modeExercice: "Mode d'exercice",
  plateformes: 'Plateformes envisagées',
  diffTaxiVtc: 'Différence Taxi/VTC',
  modeExerciceTaxi: "Mode d'exercice Taxi",
  demandeADS: 'Demande ADS',
  zoneExercice: "Zone d'exercice",
  zoneAutre: 'Zone (autre)',
  activitesCompl: 'Activités complémentaires',
  demarchesEntreprise: 'Démarches entreprise',
  craintes: 'Craintes',
  commentConnu: 'Comment connu',
  consulteProgram: 'Programme consulté',
  saitExamen: "Connaissance de l'examen",
  connaitZone: 'Connaissance de la zone',
  conduiteUrbaine: 'Conduite urbaine',
  connaitSites: 'Connaissance des sites',
  besoinsAdaptation: 'Besoins adaptation',
  accesOrdinateur: 'Accès ordinateur',
  precisionsBesoins: 'Précisions besoins',
  coherenceProjet: 'Cohérence du projet',
  niveauMotivation: 'Niveau de motivation',
  observations: 'Observations',
  formationLabel: 'Formation',
  situation_actuelle: 'Quelle est votre situation actuelle ?',
  niveau_etude: "Quel est votre niveau d'études ?",
  experience_transport: 'Avez-vous une expérience dans le transport de personnes ?',
  type_experience: 'Si oui, dans quel secteur ?',
  permis_conduire: 'Depuis combien de temps avez-vous le permis B ?',
  motivation: 'Quelle est votre principale motivation pour cette formation ?',
  disponibilite: 'Quelles sont vos disponibilités pour suivre la formation ?',
  financement: 'Quel mode de financement envisagez-vous ?',
  besoins_specifiques: 'Avez-vous des besoins spécifiques ?',
  comment_connu: 'Comment avez-vous connu FTRANSPORT ?',
  attentes: 'Quelles sont vos principales attentes vis-à-vis de la formation ?',
  delai_formation: 'Quand souhaitez-vous commencer la formation ?',
  objectif_court_terme: 'Quel est votre objectif à court terme (6 mois) ?',
  objectif_moyen_terme: 'Quel est votre objectif à moyen terme (1 à 3 ans) ?',
  type_activite: "Quel type d'activité envisagez-vous ?",
  zone_geographique: 'Dans quelle zone géographique souhaitez-vous exercer ?',
  statut_juridique: 'Quel statut juridique envisagez-vous ?',
  vehicule_prevu: 'Avez-vous déjà prévu un véhicule pour votre activité ?',
  budget_investissement: "Quel est votre budget d'investissement estimé ?",
  date_debut_activite: 'Quand souhaitez-vous démarrer votre activité professionnelle ?',
  connaissance_reglementation: 'Connaissez-vous la réglementation du secteur ?',
  plateforme_envisagee: 'Envisagez-vous de travailler avec une plateforme de mise en relation ?',
  accompagnement_souhaite: 'Souhaitez-vous un accompagnement après la formation ?',
  noteGlobale: 'Note globale',
  pointsForts: 'Points forts',
  pointsAmeliorer: 'Points à améliorer',
  suggestions: 'Suggestions',
  commentaires: 'Commentaires',
  cgv_accepted: 'CGV acceptées',
  ri_accepted: 'Règlement intérieur accepté',
  accepted: 'Accepté',
  accepted_at: 'Date acceptation',
  type_formation: 'Type de formation',
  prix: 'Prix',
  duree: 'Durée',
  date_formation: 'Date de formation',
  lieu: 'Lieu',
  date_inscription: "Date d'inscription",
  mode_financement: 'Mode de financement',
  financeur_siren: 'SIREN du financeur',
  financeur_nom: 'Nom du financeur',
  financeur_adresse: 'Adresse du financeur',
  financeur_code_postal: 'Code postal du financeur',
  financeur_ville: 'Ville du financeur',
  financeur_email: 'Email du financeur',
  financeur_telephone: 'Téléphone du financeur',
  signed_at: 'Date de signature',
  devis_signe_url: 'Devis signé',
  fichier_url: 'Fichier signé',
  statut: 'Statut',
  date_emargement: "Date d'émargement",
  demi_journee: 'Demi-journée',
  modele: 'Modèle de devis',
  formation: 'Formation',
  montant: 'Montant',
};

function getLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
}

const SKIP_KEYS = new Set(['_status', '_signature_image', 'apprenant_nom', 'apprenant_prenom']);

export function DocumentsCompletes({ apprenant }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Rafraîchissement temps réel : dès qu'un document d'inscription est ajouté/modifié
  // par l'apprenant (étape 1 du tunnel), on ré-hydrate l'onglet Formulaires.
  useEffect(() => {
    if (!apprenant?.id) return;
    const channel = supabase
      .channel(`docs-completes-${apprenant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents_inscription", filter: `apprenant_id=eq.${apprenant.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["apprenant-documents-completes", apprenant.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [apprenant?.id, queryClient]);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["apprenant-documents-completes", apprenant.id],
    queryFn: async () => {
      const norm = (s: string) => (s || "").toString().trim().toLowerCase();
      const apprNom = norm(apprenant.nom);
      const apprPrenom = norm(apprenant.prenom);
      const apprEmail = norm(apprenant.email);

      // Build a permissive OR filter: match by email, by (nom,prenom), or inverted (prenom,nom)
      const orParts: string[] = [];
      if (apprEmail) orParts.push(`email.ilike.${apprEmail}`);
      // PostgREST OR doesn't support AND grouping easily; fetch broadly and filter client-side
      const fournApprPromise = (apprNom || apprPrenom || apprEmail)
        ? supabase
            .from("fournisseur_apprenants" as any)
            .select("id, nom, prenom, email")
            .or([
              apprEmail ? `email.ilike.${apprEmail}` : null,
              apprNom ? `nom.ilike.${apprNom}` : null,
              apprNom ? `prenom.ilike.${apprNom}` : null,
            ].filter(Boolean).join(","))
        : Promise.resolve({ data: [], error: null } as any);

      const [docsRes, devisRes, emargRes, fournApprRes, inscriptionRes] = await Promise.all([
        supabase
          .from("apprenant_documents_completes" as any)
          .select("*")
          .eq("apprenant_id", apprenant.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("devis_envois" as any)
          .select("*")
          .eq("apprenant_id", apprenant.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("emargements_fc" as any)
          .select("*")
          .eq("apprenant_id", apprenant.id)
          .order("signed_at", { ascending: false }),
        fournApprPromise,
        supabase
          .from("documents_inscription" as any)
          .select("id, type_document, nom_fichier, url, statut, created_at")
          .eq("apprenant_id", apprenant.id)
          .order("created_at", { ascending: false }),
      ]);

      if (docsRes.error) throw docsRes.error;

      const rawDocs = ((docsRes.data as any[]) || []);

      const signatureApprenant = findSharedStagiaireSignature(rawDocs);
      const signatureApprenantNom = findSharedStagiaireSignatureName(rawDocs);

      const baseDocs = rawDocs.map((d) => {
        const donnees = DOCUMENT_SIGNATURE_TYPES.has(d.type_document)
          ? ensureDocumentSignatures(d.donnees, signatureApprenant, signatureApprenantNom)
          : { ...(d.donnees || {}) };
        return {
          id: d.id,
          type_document: d.type_document,
          titre: d.titre,
          donnees,
          completed_at: d.completed_at,
        };
      });

      const devisDocs = ((devisRes.data as any[]) || []).map((d) => {
        const isSigned = !!d.devis_signe_url || d.statut === "signe" || !!d.signed_at;
        return {
          id: `devis-envoi-${d.id}`,
          type_document: "devis-envoi",
          titre: `Devis ${d.modele || ""}${d.formation ? ` — ${d.formation}` : ""}${isSigned ? " (signé)" : " (envoyé)"}`,
          donnees: {
            modele: d.modele,
            formation: d.formation,
            montant: d.montant,
            statut: isSigned ? "Signé" : (d.statut || "Envoyé"),
            fichier_url: d.fichier_url,
            devis_signe_url: d.devis_signe_url || (isSigned ? d.fichier_url : null),
            pdf_disponible: d.fichier_url ? "Oui" : "Non (PDF non enregistré)",
            signed_at: d.signed_at,
          },
          completed_at: d.signed_at || d.created_at,
        };
      });

      // Le CRM doit se baser sur les émargements réellement signés, sans dépendre
      // de l'agenda/session : les FC peuvent être créées uniquement avec dates début/fin.
      const emargements = ((emargRes.data as any[]) || []);


      const emargDocs = emargements.map((e) => ({
        id: `emarg-${e.id}`,
        type_document: "emargement-fc",
        titre: `Émargement — ${e.date_emargement} (${e.demi_journee}) — ${e.absent ? "ABSENT" : "Présent"}`,
        donnees: {
          date_emargement: e.date_emargement,
          demi_journee: e.demi_journee,
          signed_at: e.signed_at,
          signature: e.signature_data_url,
          absent: !!e.absent,
          motif_absence: e.motif_absence || null,
          justificatif_url: e.justificatif_url || null,
        },
        completed_at: e.signed_at,
      }));

      // Build weekly aggregated emargement docs (one per ISO week)
      const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; year: number; week: number; sigs: any[] }>();
      for (const e of emargements) {
        const d = new Date(e.date_emargement + "T00:00:00");
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        const year = getYear(ws);
        const week = getISOWeek(d);
        const key = `${year}-W${String(week).padStart(2, "0")}`;
        if (!weekMap.has(key)) weekMap.set(key, { weekStart: ws, weekEnd: we, year, week, sigs: [] });
        weekMap.get(key)!.sigs.push({
          date: e.date_emargement,
          demi_journee: e.demi_journee,
          signed_at: e.signed_at,
          signature: e.signature_data_url,
          confirme_presence_lieu: !!e.confirme_presence_lieu,
          confirme_identite: !!e.confirme_identite,
        });
      }
      const weekDocs = Array.from(weekMap.entries()).map(([key, w]) => {
        const wsStr = format(w.weekStart, "yyyy-MM-dd");
        const weStr = format(w.weekEnd, "yyyy-MM-dd");
        const latest = w.sigs
          .map((s) => new Date(s.signed_at).getTime())
          .reduce((a, b) => Math.max(a, b), 0);
        return {
          id: `emarg-semaine-${key}`,
          type_document: "emargement-fc-semaine",
          titre: `Semaine ${w.week} (${format(w.weekStart, "dd/MM")} → ${format(w.weekEnd, "dd/MM/yyyy")}) — ${w.sigs.length} signature(s)`,
          donnees: {
            week_label: `Semaine ${w.week} - ${w.year}`,
            week_start: wsStr,
            week_end: weStr,
            signatures: w.sigs.sort((a, b) => a.date.localeCompare(b.date)),
          },
          completed_at: new Date(latest).toISOString(),
        };
      });


      // Fournisseur documents linked via matching fournisseur_apprenant (email or nom+prenom, either order)
      let fournDocs: any[] = [];
      const fournApprCandidates = ((fournApprRes as any)?.data as any[]) || [];
      const matchingIds = fournApprCandidates
        .filter((x: any) => {
          const n = norm(x.nom);
          const p = norm(x.prenom);
          const e = norm(x.email);
          if (apprEmail && e && e === apprEmail) return true;
          if (apprNom && apprPrenom && n === apprNom && p === apprPrenom) return true;
          if (apprNom && apprPrenom && n === apprPrenom && p === apprNom) return true;
          return false;
        })
        .map((x: any) => x.id);
      if (matchingIds.length > 0) {
        const fdRes = await supabase
          .from("fournisseur_documents" as any)
          .select("*")
          .in("fournisseur_apprenant_id", matchingIds)
          .order("created_at", { ascending: false });
        fournDocs = ((fdRes.data as any[]) || []).map((d) => ({
          id: `fourn-doc-${d.id}`,
          type_document: "doc-fournisseur",
          titre: d.titre || d.nom_fichier || "Document",
          donnees: {
            nom_fichier: d.nom_fichier,
            type_document: d.type_document,
            fichier_url: d.url,
          },
          completed_at: d.created_at,
        }));
      }

      // Documents d'inscription (étape 1 du tunnel : pièce d'identité recto/verso, photo, justificatif de domicile…)
      // Indispensable pour les apprenants en formation continue qui ne remplissent que l'étape 1.
      const INSCRIPTION_LABELS: Record<string, string> = {
        piece_identite_recto: "Pièce d'identité (recto)",
        piece_identite_verso: "Pièce d'identité (verso)",
        photo_identite: "Photo d'identité",
        justificatif_domicile: "Justificatif de domicile",
        permis_conduire_recto: "Permis de conduire (recto)",
        permis_conduire_verso: "Permis de conduire (verso)",
        carte_vitale: "Carte vitale",
        signature: "Signature",
      };
      const inscriptionRows = ((inscriptionRes as any)?.data as any[]) || [];
      const inscriptionDocs: any[] = [];
      if (inscriptionRows.length > 0) {
        const paths = inscriptionRows.map((r) => r.url).filter(Boolean);
        const { data: signed } = await supabase.storage
          .from("documents-inscription")
          .createSignedUrls(paths, 3600);
        const urlByPath = new Map<string, string>();
        (signed || []).forEach((s: any, i: number) => {
          if (s?.signedUrl) urlByPath.set(paths[i], s.signedUrl);
        });
        for (const r of inscriptionRows) {
          const signedUrl = urlByPath.get(r.url) || r.url;
          inscriptionDocs.push({
            id: `inscription-${r.id}`,
            type_document: "document-inscription",
            titre: `${INSCRIPTION_LABELS[r.type_document] || r.type_document} — ${r.nom_fichier || ""}`.trim(),
            donnees: {
              nom_fichier: r.nom_fichier,
              type_document: r.type_document,
              statut: r.statut,
              fichier_url: signedUrl,
            },
            completed_at: r.created_at,
          });
        }
      }

      const all = [...baseDocs, ...devisDocs, ...emargDocs, ...weekDocs, ...fournDocs, ...inscriptionDocs];
      all.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
      return all;
    },
  });

  const downloadJSON = (doc: any) => {
    const blob = new Blob([JSON.stringify(doc.donnees, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type_document}_${apprenant.nom}_${apprenant.prenom}_${format(new Date(doc.completed_at), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (doc: any) => {
    if (doc.type_document === "emargement-fc-semaine") {
      const formateur = (window.prompt(
        "Nom du formateur à indiquer sur la feuille d'émargement :",
        "GUENICHI Naoufal",
      ) || "GUENICHI Naoufal").trim();
      generateEmargementSemainePdf(
        apprenant,
        doc.donnees?.week_label || doc.titre,
        doc.donnees?.week_start,
        doc.donnees?.week_end,
        doc.donnees?.signatures || [],
        formateur,
      );
      return;
    }
    generateDocumentIndividuelPdf(apprenant, {
      type_document: doc.type_document,
      titre: doc.titre,
      donnees: doc.donnees,
      completed_at: doc.completed_at,
    });
  };

  const renderEmargementSemaine = (donnees: any) => {
    const sigs: any[] = donnees?.signatures || [];
    const DEMI: Record<string, string> = {
      matin: "Matin",
      apres_midi: "Après-midi",
      soir: "Soir",
      soir_1: "Soir 1 (17h-18h30)",
      soir_2: "Soir 2 (18h30-21h)",
    };
    if (sigs.length === 0) return <p className="text-sm text-muted-foreground">Aucune signature pour cette semaine.</p>;
    return (
      <div className="space-y-2">
        <p className="text-sm"><strong>Période :</strong> du {donnees.week_start} au {donnees.week_end}</p>
        <div className="grid gap-2">
          {sigs.map((s, i) => (
            <div key={i} className="flex items-center gap-3 border rounded p-2">
              <div className="text-xs text-muted-foreground w-40 shrink-0">
                <p className="font-medium text-foreground">{s.date}</p>
                <p>{DEMI[s.demi_journee] || s.demi_journee}</p>
              </div>
              {s.signature?.startsWith?.("data:image") ? (
                <img src={s.signature} alt="Signature" className="border rounded h-16 bg-white" />
              ) : (
                <span className="text-xs italic text-muted-foreground">(Non signé)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTestCompetences = (donnees: any) => {
    if (!donnees?.sections || !donnees?.answers) return null;
    return (
      <div className="space-y-4">
        {donnees.formationLabel && (
          <p className="text-sm"><strong>Formation :</strong> {donnees.formationLabel}</p>
        )}
        {(donnees.sections as string[]).map((sectionTitle: string, si: number) => {
          const sectionItems: string[] | undefined = donnees.sectionItems?.[si];
          const sectionAnswers = Object.entries(donnees.answers as Record<string, string>)
            .filter(([key]) => key.startsWith(`${si}-`))
            .sort(([a], [b]) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));
          return (
            <div key={si} className="space-y-1">
              <h4 className="font-semibold text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">{sectionTitle}</h4>
              {sectionAnswers.map(([key, value]) => {
                const qIdx = parseInt(key.split('-')[1]);
                const questionText = sectionItems?.[qIdx] || `Question ${qIdx + 1}`;
                return (
                  <div key={key} className="flex items-start gap-2 pl-3 py-1 text-sm border-b border-border/30">
                    <span className="text-muted-foreground flex-1">{questionText}</span>
                    <Badge variant={value === "oui" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {value}
                    </Badge>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderQCMDocument = (donnees: any, title: string) => {
    if (!donnees?.reponses) return null;
    return (
      <div className="space-y-3">
        {donnees.formation && (
          <p className="text-sm"><strong>Formation :</strong> {donnees.formation}</p>
        )}
        <h4 className="font-semibold text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">{title}</h4>
        {Object.entries(donnees.reponses).map(([key, value]) => {
          const question = getLabel(key);
          const answer = Array.isArray(value) ? (value as string[]).join(', ') : String(value || '(Non répondu)');
          return (
            <div key={key} className="pl-3 py-1 text-sm border-b border-border/30">
              <p className="font-medium text-foreground">{question}</p>
              <p className="text-muted-foreground ml-2">{answer}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSatisfaction = (donnees: any) => {
    const NOTES: Record<number, string> = { 1: 'Très insatisfait', 2: 'Insatisfait', 3: 'Neutre', 4: 'Satisfait', 5: 'Très satisfait' };
    if (!donnees?.parties) return null;
    return (
      <div className="space-y-3">
        {(donnees.parties as any[]).map((partie: any, pi: number) => (
          <div key={pi} className="space-y-1">
            <h4 className="font-semibold text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">{partie.titre}</h4>
            {(partie.criteres || []).map((c: any, ci: number) => (
              <div key={ci} className="flex items-center gap-2 pl-3 py-1 text-sm border-b border-border/30">
                <span className="text-muted-foreground flex-1">{c.label}</span>
                <span className="font-medium">{c.value != null ? `${c.value}/5 — ${NOTES[c.value] || ''}` : 'Non répondu'}</span>
              </div>
            ))}
          </div>
        ))}
        {['noteGlobale', 'pointsForts', 'pointsAmeliorer', 'suggestions', 'commentaires'].map(k =>
          donnees[k] ? (
            <div key={k} className="pl-3 py-1 text-sm">
              <span className="font-medium">{getLabel(k)} :</span> {String(donnees[k])}
            </div>
          ) : null
        )}
      </div>
    );
  };

  const renderEvaluationAcquis = (donnees: any) => {
    const NIVEAUX: Record<string, string> = { A: 'Acquis', B: 'En cours', C: 'Non acquis', D: 'Non évalué' };
    if (!donnees?.parties) return null;
    return (
      <div className="space-y-3">
        {(donnees.parties as any[]).map((partie: any, pi: number) => (
          <div key={pi} className="space-y-1">
            <h4 className="font-semibold text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">{partie.titre}</h4>
            {(partie.competences || []).map((c: any, ci: number) => (
              <div key={ci} className="flex items-center gap-2 pl-3 py-1 text-sm border-b border-border/30">
                <span className="text-muted-foreground flex-1">{c.label}</span>
                <Badge variant={c.value === 'A' ? 'default' : 'secondary'} className="text-xs">
                  {NIVEAUX[c.value] || c.value || 'Non évalué'}
                </Badge>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderFieldsDocument = (donnees: any) => {
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(donnees).map(([key, value]) => {
          if (SKIP_KEYS.has(key)) return null;
          if (key === "signature" || (typeof value === 'string' && (value as string).startsWith?.("data:image"))) {
            return (
              <div key={key} className="space-y-1">
                <span className="font-medium text-muted-foreground">{getLabel(key)} :</span>
                {typeof value === "string" && value.startsWith("data:image") ? (
                  <img src={value} alt="Signature" className="border rounded max-w-[300px] h-auto" />
                ) : (
                  <span className="text-muted-foreground italic"> Oui</span>
                )}
              </div>
            );
          }
          if (value === null || value === undefined || value === "") return null;
          if ((key === "devis_signe_url" || key === "fichier_url") && typeof value === "string") {
            return (
              <div key={key} className="flex items-center gap-2 pl-3">
                <span className="font-medium text-muted-foreground shrink-0">{getLabel(key)} :</span>
                <Button variant="outline" size="sm" asChild className="h-8 gap-1">
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir / télécharger
                  </a>
                </Button>
              </div>
            );
          }
          if (typeof value === 'boolean') {
            return (
              <div key={key} className="flex gap-2 pl-3">
                <span className="font-medium text-muted-foreground">{getLabel(key)} :</span>
                <Badge variant={value ? "default" : "secondary"} className="text-xs">{value ? "Oui" : "Non"}</Badge>
              </div>
            );
          }
          if (typeof value === "object" && !Array.isArray(value)) return null;
          if (Array.isArray(value)) {
            return (
              <div key={key} className="pl-3">
                <span className="font-medium text-muted-foreground">{getLabel(key)} :</span>
                <span className="ml-1">{(value as any[]).map(v => String(v)).join(', ')}</span>
              </div>
            );
          }
          return (
            <div key={key} className="flex gap-2 pl-3">
              <span className="font-medium text-muted-foreground shrink-0">{getLabel(key)} :</span>
              <span>{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFormData = (donnees: any, typeDocument: string) => {
    if (!donnees) return null;

    switch (typeDocument) {
      case 'test-competences':
        return renderTestCompetences(donnees);
      case 'analyse-besoin':
        if (donnees.reponses) return renderQCMDocument(donnees, 'ANALYSE DU BESOIN');
        return renderFieldsDocument(donnees);
      case 'projet-professionnel':
        if (donnees.reponses) return renderQCMDocument(donnees, 'PROJET PROFESSIONNEL');
        return renderFieldsDocument(donnees);
      case 'satisfaction':
        return renderSatisfaction(donnees);
      case 'evaluation-acquis':
        return renderEvaluationAcquis(donnees);
      case 'emargement-fc-semaine':
        return renderEmargementSemaine(donnees);
      case 'emargement-fc':
        return (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge className={donnees.absent ? "bg-destructive text-destructive-foreground" : "bg-emerald-100 text-emerald-800"}>
                {donnees.absent ? "Absent" : "Présent"}
              </Badge>
              <span className="text-muted-foreground">
                {donnees.date_emargement} — {donnees.demi_journee}
              </span>
            </div>
            {donnees.absent ? (
              <>
                <div>
                  <p className="font-medium">Motif de l'absence :</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {donnees.motif_absence || "—"}
                  </p>
                </div>
                {donnees.justificatif_url ? (
                  <a
                    href={donnees.justificatif_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    <FileDown className="w-4 h-4" />
                    Voir le justificatif
                  </a>
                ) : (
                  <p className="text-xs text-destructive">Aucun justificatif fourni</p>
                )}
              </>
            ) : donnees.signature ? (
              <div>
                <p className="font-medium mb-1">Signature :</p>
                <img src={donnees.signature} alt="Signature" className="border rounded max-h-32" />
              </div>
            ) : null}
          </div>
        );
      default:
        return renderFieldsDocument(donnees);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Chargement des documents complétés...
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun document complété</p>
          <p className="text-sm mt-1">Les formulaires remplis par l'apprenant apparaîtront ici.</p>
        </CardContent>
      </Card>
    );
  }

  // Calcul des heures de présence basé sur les signatures d'émargement
  const emargementsRaw = (documents || []).filter((d: any) => {
    const hasSignature = !!d.donnees?.signature || !!d.donnees?.signed_at || !!d.completed_at;
    return d.type_document === "emargement-fc" && hasSignature && !d.donnees?.absent;
  });
  const isEvening = isEveningTrainingValue(apprenant?.creneau_horaire, apprenant?.formation_choisie, apprenant?.type_apprenant);
  const isFC = isFormationContinueValue(apprenant?.type_apprenant, apprenant?.formation_choisie);
  const totalHeures = computePresenceHours(
    emargementsRaw.map((d: any) => ({
      date_emargement: d.donnees?.date_emargement,
      demi_journee: d.donnees?.demi_journee,
      absent: d.donnees?.absent,
    })),
    {
      isEvening,
      isFormationContinue: isFC,
      maxHours: isEvening ? 40 : 60,
      dateStart: apprenant?.date_debut_formation,
      dateEnd: apprenant?.date_fin_formation,
    },
  );

  const uniqueMap = new Map<string, any>();
  for (const d of emargementsRaw) {
    const date = d.donnees?.date_emargement || "";
    const demi = (d.donnees?.demi_journee || "").toString().trim().toLowerCase();
    if (!date || !demi) continue;
    const k = `${date}__${demi}`;
    if (!uniqueMap.has(k)) uniqueMap.set(k, d);
  }
  const emargementsSignes = Array.from(uniqueMap.values());
  const joursPresence = new Set<string>();
  for (const d of emargementsSignes) {
    if (d.donnees?.date_emargement) joursPresence.add(d.donnees.date_emargement);
  }
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total heures de présence (basé sur les signatures)</p>
            <p className="text-2xl font-bold text-primary">{formatPresenceHours(totalHeures)}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p><strong className="text-foreground">{emargementsSignes.length}</strong> demi-journée(s) signée(s)</p>
            <p><strong className="text-foreground">{joursPresence.size}</strong> jour(s) de présence</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents complétés par l'apprenant ({documents.length})
          </CardTitle>
        </CardHeader>
      </Card>


      {documents.map((doc: any) => (
        <Card key={doc.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={TYPE_COLORS[doc.type_document] || "bg-muted"}>
                  {TYPE_LABELS[doc.type_document] || doc.type_document}
                </Badge>
                <div>
                  <p className="font-medium text-sm">{doc.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    Complété le {format(new Date(doc.completed_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                >
                  {expandedId === doc.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {expandedId === doc.id ? "Masquer" : "Voir"}
                </Button>
                <Button variant="default" size="sm" onClick={() => downloadPDF(doc)} className="gap-1">
                  <FileDown className="w-4 h-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadJSON(doc)} className="gap-1">
                  <Download className="w-4 h-4" />
                  JSON
                </Button>
              </div>
            </div>
            {expandedId === doc.id && (
              <div className="mt-4 pt-4 border-t">
                {renderFormData(doc.donnees, doc.type_document)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
