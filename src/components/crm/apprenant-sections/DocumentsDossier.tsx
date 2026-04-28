import { useState } from "react";
import { FolderOpen, FileText, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateReglementInterieurSigne } from "@/lib/pdf/reglement-interieur";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import EmargementsSignesViewer from "@/components/cours-en-ligne/EmargementsSignesViewer";

interface DocumentsDossierProps {
  apprenant: any;
}

export function DocumentsDossier({ apprenant }: DocumentsDossierProps) {
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  // Récupérer les sessions de l'apprenant pour les feuilles d'émargement
  const { data: sessionApprenants = [] } = useQuery({
    queryKey: ['session-apprenants', apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_apprenants')
        .select(`
          *,
          sessions:session_id (
            id,
            nom,
            date_debut,
            date_fin,
            formations:formation_id (nom)
          )
        `)
        .eq('apprenant_id', apprenant.id);
      
      if (error) throw error;
      return data;
    },
  });

  const handleGenerateReglement = async () => {
    setGeneratingDoc('reglement');
    try {
      await generateReglementInterieurSigne(apprenant);
      toast.success("Règlement intérieur signé généré");
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setGeneratingDoc(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Dossier de Formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Feuilles d'émargement signées (signatures apprenant) */}
          <div>
            <h4 className="font-medium mb-3">Feuilles d'émargement signées</h4>
            <EmargementsSignesViewer apprenantId={apprenant.id} completed={true} onComplete={() => {}} />
          </div>

          {/* Sessions liées */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Sessions de formation</h4>
            {sessionApprenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session associée</p>
            ) : (
              <div className="space-y-2">
                {sessionApprenants.map((sa: any) => (
                  <div 
                    key={sa.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {sa.sessions?.nom || sa.sessions?.formations?.nom || 'Session'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sa.sessions?.date_debut} - {sa.sessions?.date_fin}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`#session-${sa.session_id}`}>
                        Voir
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Règlement intérieur */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Règlement intérieur</h4>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium">Règlement intérieur signé</h4>
                  <p className="text-sm text-muted-foreground">
                    Document avec signature de l'apprenant et cachet de l'entreprise
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Disponible
                </Badge>
                <Button 
                  size="sm" 
                  onClick={handleGenerateReglement}
                  disabled={generatingDoc === 'reglement'}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generatingDoc === 'reglement' ? 'Génération...' : 'Télécharger'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
