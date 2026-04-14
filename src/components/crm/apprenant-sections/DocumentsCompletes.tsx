import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { generateDocumentIndividuelPdf } from "@/lib/pdf/document-individuel";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  signed_at: 'Date de signature',
};

function getLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
}

const SKIP_KEYS = new Set(['_status', '_signature_image', 'signature', 'signatureResponsable', 'apprenant_nom', 'apprenant_prenom']);

export function DocumentsCompletes({ apprenant }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery({
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
    generateDocumentIndividuelPdf(apprenant, {
      type_document: doc.type_document,
      titre: doc.titre,
      donnees: doc.donnees,
      completed_at: doc.completed_at,
    });
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

  return (
    <div className="space-y-4">
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
