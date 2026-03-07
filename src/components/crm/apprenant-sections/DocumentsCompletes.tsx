import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
};

const TYPE_COLORS: Record<string, string> = {
  "test-competences": "bg-blue-100 text-blue-800",
  "analyse-besoin": "bg-amber-100 text-amber-800",
  "projet-professionnel": "bg-purple-100 text-purple-800",
  "evaluation-acquis": "bg-emerald-100 text-emerald-800",
  "satisfaction": "bg-pink-100 text-pink-800",
};

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

  const renderFormData = (donnees: any, typeDocument: string) => {
    if (!donnees) return null;

    return (
      <div className="space-y-3 text-sm">
        {Object.entries(donnees).map(([key, value]) => {
          if (key === "signature") {
            return (
              <div key={key} className="space-y-1">
                <span className="font-medium text-muted-foreground">Signature :</span>
                {typeof value === "string" && value.startsWith("data:image") ? (
                  <img src={value} alt="Signature" className="border rounded max-w-[300px] h-auto" />
                ) : (
                  <span className="text-muted-foreground italic"> Oui</span>
                )}
              </div>
            );
          }
          if (typeof value === "object" && value !== null) {
            return (
              <div key={key} className="space-y-1">
                <span className="font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")} :</span>
                <pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            );
          }
          if (value === null || value === undefined || value === "") return null;
          return (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-muted-foreground capitalize shrink-0">{key.replace(/_/g, " ")} :</span>
              <span>{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
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
                <Button variant="outline" size="sm" onClick={() => downloadJSON(doc)}>
                  <Download className="w-4 h-4 mr-1" />
                  Télécharger
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
