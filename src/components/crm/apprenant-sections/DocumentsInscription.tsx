import { useState } from "react";
import { FileCheck, Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DocumentsInscriptionProps {
  apprenant: any;
}

interface DocumentStatus {
  id: string;
  title: string;
  description: string;
  required: boolean;
  uploaded: boolean;
}

export function DocumentsInscription({ apprenant }: DocumentsInscriptionProps) {
  // TODO: Récupérer le statut réel des documents depuis la base de données
  const [documents] = useState<DocumentStatus[]>([
    {
      id: 'piece_identite',
      title: "Pièce d'identité",
      description: "Carte d'identité ou passeport en cours de validité",
      required: true,
      uploaded: false, // À récupérer depuis la BDD
    },
    {
      id: 'permis_conduire',
      title: "Permis de conduire",
      description: "Hors période probatoire",
      required: true,
      uploaded: false,
    },
    {
      id: 'justificatif_domicile',
      title: "Justificatif de domicile",
      description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
      required: true,
      uploaded: false,
    },
    {
      id: 'photo_identite',
      title: "Photo d'identité",
      description: "Format photo d'identité officielle",
      required: true,
      uploaded: false,
    },
    {
      id: 'signature',
      title: "Signature",
      description: "Signature manuscrite sur papier blanc",
      required: true,
      uploaded: false,
    },
  ]);

  const uploadedCount = documents.filter(d => d.uploaded).length;
  const totalRequired = documents.filter(d => d.required).length;
  const progress = (uploadedCount / totalRequired) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          Documents pour Inscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progression du dossier
            </span>
            <span className="text-sm text-muted-foreground">
              {uploadedCount}/{totalRequired} documents
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {uploadedCount < totalRequired && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Dossier incomplet - {totalRequired - uploadedCount} document(s) manquant(s)
            </p>
          )}
        </div>

        {/* Documents list */}
        <div className="space-y-3">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                doc.uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  doc.uploaded ? 'bg-green-100' : 'bg-muted'
                }`}>
                  {doc.uploaded ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{doc.title}</h4>
                    {doc.required && !doc.uploaded && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.uploaded ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Reçu
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Uploader
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Le certificat médical n'est pas requis pour l'inscription à la formation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
