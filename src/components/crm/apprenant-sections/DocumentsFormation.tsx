import { useState } from "react";
import { FileText, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateAttestationInscription } from "@/lib/pdf/attestation-inscription";
import { generateAttestationFinFormation } from "@/lib/pdf/attestation-fin-formation";
import { generateAttestationFranceTravail } from "@/lib/pdf/attestation-france-travail";
import { toast } from "sonner";

interface DocumentsFormationProps {
  apprenant: any;
}

export function DocumentsFormation({ apprenant }: DocumentsFormationProps) {
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  const handleGenerateAttestation = async (type: 'inscription' | 'fin-formation' | 'france-travail') => {
    setGeneratingDoc(type);
    try {
      if (type === 'inscription') {
        await generateAttestationInscription(apprenant);
        toast.success("Attestation d'inscription générée");
      } else if (type === 'fin-formation') {
        await generateAttestationFinFormation(apprenant);
        toast.success("Attestation de fin de formation générée");
      } else if (type === 'france-travail') {
        await generateAttestationFranceTravail(apprenant);
        toast.success("Attestation France Travail générée");
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setGeneratingDoc(null);
    }
  };

  const documents = [
    {
      id: 'inscription',
      title: "Attestation d'inscription",
      description: "Confirme l'inscription de l'apprenant à la formation",
      status: 'disponible',
      type: 'inscription' as const,
    },
    {
      id: 'fin-formation',
      title: "Attestation de fin de formation",
      description: "Délivrée à la fin du parcours de formation",
      status: apprenant.date_fin_formation ? 'disponible' : 'en_attente',
      type: 'fin-formation' as const,
    },
    {
      id: 'france-travail',
      title: "Attestation France Travail",
      description: "Formulaire à retourner à France Travail (auto-rempli sauf type de rémunération)",
      status: apprenant.mode_financement === 'france-travail' ? 'disponible' : 'non_applicable',
      type: 'france-travail' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents de Formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.status === 'disponible' && (
                  <>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Disponible
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleGenerateAttestation(doc.type)}
                      disabled={generatingDoc === doc.type}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {generatingDoc === doc.type ? 'Génération...' : 'Télécharger'}
                    </Button>
                  </>
                )}
                {doc.status === 'en_attente' && (
                  <Badge variant="secondary">En attente</Badge>
                )}
                {doc.status === 'non_applicable' && (
                  <Badge variant="outline" className="text-muted-foreground">Non applicable</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
