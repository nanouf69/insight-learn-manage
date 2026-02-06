import { useState, useRef, useEffect } from "react";
import { FileCheck, Upload, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentsInscriptionProps {
  apprenant: any;
}

interface DocumentStatus {
  id: string;
  title: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  url?: string;
  fileName?: string;
}

const DOCUMENT_TYPES = [
  {
    id: 'piece_identite',
    title: "Pièce d'identité",
    description: "Carte d'identité ou passeport en cours de validité",
    required: true,
  },
  {
    id: 'permis_conduire',
    title: "Permis de conduire",
    description: "Hors période probatoire",
    required: true,
  },
  {
    id: 'justificatif_domicile',
    title: "Justificatif de domicile",
    description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
    required: true,
  },
  {
    id: 'photo_identite',
    title: "Photo d'identité",
    description: "Format photo d'identité officielle",
    required: true,
  },
  {
    id: 'signature',
    title: "Signature",
    description: "Signature manuscrite sur papier blanc",
    required: true,
  },
];

export function DocumentsInscription({ apprenant }: DocumentsInscriptionProps) {
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch existing documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [apprenant.id]);

  const fetchDocuments = async () => {
    try {
      // List files in the apprenant's folder
      const { data: files, error } = await supabase.storage
        .from('documents-inscription')
        .list(`${apprenant.id}/`);

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      // Map document types with their upload status
      const updatedDocuments: DocumentStatus[] = DOCUMENT_TYPES.map(docType => {
        const uploadedFile = files?.find(f => f.name.startsWith(docType.id));
        if (uploadedFile) {
          const { data: urlData } = supabase.storage
            .from('documents-inscription')
            .getPublicUrl(`${apprenant.id}/${uploadedFile.name}`);
          
          return {
            ...docType,
            uploaded: true,
            url: urlData?.publicUrl,
            fileName: uploadedFile.name,
          };
        }
        return {
          ...docType,
          uploaded: false,
        };
      });

      setDocuments(updatedDocuments);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpload = async (docId: string, file: File) => {
    setUploadingId(docId);
    
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${docId}_${Date.now()}.${fileExt}`;
      const filePath = `${apprenant.id}/${fileName}`;

      // First, delete any existing file for this document type
      const existingDoc = documents.find(d => d.id === docId);
      if (existingDoc?.fileName) {
        await supabase.storage
          .from('documents-inscription')
          .remove([`${apprenant.id}/${existingDoc.fileName}`]);
      }

      // Upload the new file
      const { error: uploadError } = await supabase.storage
        .from('documents-inscription')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      toast.success(`Document "${DOCUMENT_TYPES.find(d => d.id === docId)?.title}" uploadé avec succès`);
      
      // Refresh the documents list
      await fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Erreur lors de l'upload du document");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc?.fileName) return;

    try {
      const { error } = await supabase.storage
        .from('documents-inscription')
        .remove([`${apprenant.id}/${doc.fileName}`]);

      if (error) throw error;

      toast.success("Document supprimé");
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleFileSelect = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const handleFileChange = (docId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 10Mo)");
        return;
      }
      handleUpload(docId, file);
    }
    // Reset input
    event.target.value = '';
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const uploadedCount = documents.filter(d => d.uploaded).length;
  const totalRequired = documents.filter(d => d.required).length;
  const progress = totalRequired > 0 ? (uploadedCount / totalRequired) * 100 : 0;

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
          {uploadedCount === totalRequired && totalRequired > 0 && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Dossier complet
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
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                  onChange={(e) => handleFileChange(doc.id, e)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                />
                
                {doc.uploaded ? (
                  <>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Reçu
                    </Badge>
                    {doc.url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDocument(doc.url!)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFileSelect(doc.id)}
                      disabled={uploadingId === doc.id}
                    >
                      {uploadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Remplacer
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleFileSelect(doc.id)}
                    disabled={uploadingId === doc.id}
                  >
                    {uploadingId === doc.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
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
