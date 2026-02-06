import { useState, useRef, useEffect } from "react";
import { FileCheck, Upload, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, Eye, Ban, Plus, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  status?: 'valid' | 'rejected' | 'pending';
  rejectionReason?: string;
  needsValidation?: boolean;
}

interface CustomDocument {
  id: string;
  title: string;
  description: string;
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
    needsValidation: true,
  },
  {
    id: 'permis_conduire',
    title: "Permis de conduire",
    description: "Hors période probatoire",
    required: true,
    needsValidation: true,
  },
  {
    id: 'justificatif_domicile',
    title: "Justificatif de domicile",
    description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
    required: true,
    needsValidation: true,
  },
  {
    id: 'photo_identite',
    title: "Photo d'identité",
    description: "Format photo d'identité officielle",
    required: true,
    needsValidation: false,
  },
  {
    id: 'signature',
    title: "Signature",
    description: "Signature manuscrite sur papier blanc",
    required: true,
    needsValidation: false,
  },
];

const REJECTION_REASONS: Record<string, { value: string; label: string }[]> = {
  piece_identite: [
    { value: 'expired', label: "Pièce d'identité périmée" },
    { value: 'unreadable', label: "Document illisible" },
    { value: 'invalid', label: "Document non conforme" },
  ],
  permis_conduire: [
    { value: 'expired', label: "Permis de conduire périmé" },
    { value: 'probatoire', label: "Permis en période probatoire (moins de 3 ans)" },
    { value: 'unreadable', label: "Document illisible" },
    { value: 'invalid', label: "Document non conforme" },
  ],
  justificatif_domicile: [
    { value: 'too_old', label: "Justificatif de plus de 3 mois" },
    { value: 'unreadable', label: "Document illisible" },
    { value: 'invalid', label: "Document non conforme" },
  ],
};

export function DocumentsInscription({ apprenant }: DocumentsInscriptionProps) {
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [customDocuments, setCustomDocuments] = useState<CustomDocument[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    docId: string;
    docTitle: string;
  }>({ open: false, docId: '', docTitle: '' });
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [addDocDialog, setAddDocDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
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
        const rejectedFile = files?.find(f => f.name.startsWith(`rejected_${docType.id}`));
        
        if (rejectedFile) {
          // Parse rejection reason from filename
          const reasonMatch = rejectedFile.name.match(/rejected_[^_]+_(.+)\.[^.]+$/);
          const rejectionReason = reasonMatch ? decodeURIComponent(reasonMatch[1]) : 'Document refusé';
          
          const { data: urlData } = supabase.storage
            .from('documents-inscription')
            .getPublicUrl(`${apprenant.id}/${rejectedFile.name}`);
          
          return {
            ...docType,
            uploaded: true,
            status: 'rejected' as const,
            rejectionReason,
            url: urlData?.publicUrl,
            fileName: rejectedFile.name,
          };
        }
        
        if (uploadedFile) {
          const { data: urlData } = supabase.storage
            .from('documents-inscription')
            .getPublicUrl(`${apprenant.id}/${uploadedFile.name}`);
          
          return {
            ...docType,
            uploaded: true,
            status: 'valid' as const,
            url: urlData?.publicUrl,
            fileName: uploadedFile.name,
          };
        }
        return {
          ...docType,
          uploaded: false,
          status: 'pending' as const,
        };
      });

      // Fetch custom documents
      const customFiles = files?.filter(f => f.name.startsWith('custom_')) || [];
      const customDocs: CustomDocument[] = customFiles.map(f => {
        const { data: urlData } = supabase.storage
          .from('documents-inscription')
          .getPublicUrl(`${apprenant.id}/${f.name}`);
        
        // Parse title from filename: custom_title_timestamp.ext
        const match = f.name.match(/custom_(.+?)_\d+\.[^.]+$/);
        const title = match ? decodeURIComponent(match[1]) : 'Document';
        
        return {
          id: f.name,
          title,
          description: 'Document supplémentaire',
          uploaded: true,
          url: urlData?.publicUrl,
          fileName: f.name,
        };
      });

      setDocuments(updatedDocuments);
      setCustomDocuments(customDocs);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Analyze document with AI to check expiration
  const analyzeDocument = async (docId: string, documentUrl: string) => {
    // Only analyze piece_identite, permis_conduire, and justificatif_domicile
    if (docId !== 'piece_identite' && docId !== 'permis_conduire' && docId !== 'justificatif_domicile') {
      return;
    }

    setAnalyzingId(docId);
    toast.info("Analyse du document en cours...", { duration: 3000 });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentUrl,
          documentType: docId,
        },
      });

      if (error) throw error;

      if (data && !data.isValid && data.rejectionReason) {
        // Document is not valid - auto-reject it
        toast.error(`Document invalide : ${data.rejectionReason}`, { duration: 5000 });
        
        // Find the document and reject it
        const doc = documents.find(d => d.id === docId);
        if (doc?.fileName) {
          // Get the file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents-inscription')
            .download(`${apprenant.id}/${doc.fileName}`);

          if (!downloadError && fileData) {
            // Delete the original file
            await supabase.storage
              .from('documents-inscription')
              .remove([`${apprenant.id}/${doc.fileName}`]);

            // Re-upload with rejected prefix
            const fileExt = doc.fileName.split('.').pop();
            const rejectedFileName = `rejected_${doc.id}_${encodeURIComponent(data.rejectionReason)}.${fileExt}`;
            
            await supabase.storage
              .from('documents-inscription')
              .upload(`${apprenant.id}/${rejectedFileName}`, fileData, {
                cacheControl: '3600',
                upsert: true
              });

            await fetchDocuments();
          }
        }
      } else if (data && data.isValid) {
        toast.success("Document validé ✓", { duration: 3000 });
        if (data.details) {
          console.log('Document details:', data.details);
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      // Don't show error to user, just log it - manual validation still possible
      toast.info("Vérification automatique non disponible. Veuillez vérifier manuellement.", { duration: 4000 });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleUpload = async (docId: string, file: File, isCustom = false) => {
    setUploadingId(docId);
    
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = isCustom 
        ? `custom_${encodeURIComponent(docId)}_${Date.now()}.${fileExt}`
        : `${docId}_${Date.now()}.${fileExt}`;
      const filePath = `${apprenant.id}/${fileName}`;

      // First, delete any existing file for this document type
      const existingDoc = documents.find(d => d.id === docId);
      if (existingDoc?.fileName) {
        await supabase.storage
          .from('documents-inscription')
          .remove([`${apprenant.id}/${existingDoc.fileName}`]);
      }

      // Also delete any rejected version
      const { data: files } = await supabase.storage
        .from('documents-inscription')
        .list(`${apprenant.id}/`);
      
      const rejectedFile = files?.find(f => f.name.startsWith(`rejected_${docId}`));
      if (rejectedFile) {
        await supabase.storage
          .from('documents-inscription')
          .remove([`${apprenant.id}/${rejectedFile.name}`]);
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

      const docTitle = isCustom ? docId : DOCUMENT_TYPES.find(d => d.id === docId)?.title;
      toast.success(`Document "${docTitle}" uploadé avec succès`);
      
      // Refresh the documents list
      await fetchDocuments();

      // If it's a piece_identite, permis_conduire, or justificatif_domicile, analyze it automatically
      if (!isCustom && (docId === 'piece_identite' || docId === 'permis_conduire' || docId === 'justificatif_domicile')) {
        const { data: urlData } = supabase.storage
          .from('documents-inscription')
          .getPublicUrl(filePath);
        
        if (urlData?.publicUrl) {
          // Small delay to ensure file is fully uploaded
          setTimeout(() => {
            analyzeDocument(docId, urlData.publicUrl);
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Erreur lors de l'upload du document");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (docId: string, isCustom = false) => {
    const doc = isCustom 
      ? customDocuments.find(d => d.id === docId)
      : documents.find(d => d.id === docId);
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

  const handleReject = async () => {
    const doc = documents.find(d => d.id === rejectionDialog.docId);
    if (!doc?.fileName) return;

    const reason = selectedReason === 'other' ? customReason : selectedReason;
    if (!reason) {
      toast.error("Veuillez sélectionner un motif de refus");
      return;
    }

    try {
      // Get the file first
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents-inscription')
        .download(`${apprenant.id}/${doc.fileName}`);

      if (downloadError) throw downloadError;

      // Delete the original file
      await supabase.storage
        .from('documents-inscription')
        .remove([`${apprenant.id}/${doc.fileName}`]);

      // Re-upload with rejected prefix and reason in filename
      const fileExt = doc.fileName.split('.').pop();
      const rejectedFileName = `rejected_${doc.id}_${encodeURIComponent(reason)}.${fileExt}`;
      
      await supabase.storage
        .from('documents-inscription')
        .upload(`${apprenant.id}/${rejectedFileName}`, fileData, {
          cacheControl: '3600',
          upsert: true
        });

      toast.success(`Document refusé : ${reason}`);
      setRejectionDialog({ open: false, docId: '', docTitle: '' });
      setSelectedReason('');
      setCustomReason('');
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du refus du document");
    }
  };

  const openRejectionDialog = (docId: string, docTitle: string) => {
    setRejectionDialog({ open: true, docId, docTitle });
    setSelectedReason('');
    setCustomReason('');
  };

  const handleAddCustomDocument = () => {
    if (!newDocTitle.trim()) {
      toast.error("Veuillez entrer un titre pour le document");
      return;
    }
    
    // Trigger file upload for this custom document
    const inputId = `custom_${newDocTitle}`;
    fileInputRefs.current[inputId]?.click();
    setAddDocDialog(false);
    setNewDocTitle('');
    setNewDocDescription('');
  };

  const handleFileSelect = (docId: string) => {
    fileInputRefs.current[docId]?.click();
  };

  const handleFileChange = (docId: string, event: React.ChangeEvent<HTMLInputElement>, isCustom = false) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 10Mo)");
        return;
      }
      handleUpload(docId, file, isCustom);
    }
    // Reset input
    event.target.value = '';
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const validDocuments = documents.filter(d => d.uploaded && d.status === 'valid');
  const uploadedCount = validDocuments.length;
  const totalRequired = documents.filter(d => d.required).length;
  const progress = totalRequired > 0 ? (uploadedCount / totalRequired) * 100 : 0;

  const rejectedDocs = documents.filter(d => d.status === 'rejected');

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
          {rejectedDocs.length > 0 && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <Ban className="w-3 h-3" />
              {rejectedDocs.length} document(s) refusé(s) à remplacer
            </p>
          )}
          {uploadedCount < totalRequired && rejectedDocs.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Dossier incomplet - {totalRequired - uploadedCount} document(s) manquant(s)
            </p>
          )}
          {uploadedCount === totalRequired && totalRequired > 0 && rejectedDocs.length === 0 && (
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
                doc.status === 'rejected' 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : doc.status === 'valid' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  doc.status === 'rejected'
                    ? 'bg-destructive/20'
                    : doc.status === 'valid' 
                      ? 'bg-green-100' 
                      : 'bg-muted'
                }`}>
                  {doc.status === 'rejected' ? (
                    <Ban className="w-5 h-5 text-destructive" />
                  ) : doc.status === 'valid' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${doc.status === 'rejected' ? 'text-destructive' : ''}`}>
                      {doc.title}
                    </h4>
                    {doc.required && !doc.uploaded && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  <p className={`text-sm ${doc.status === 'rejected' ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                    {doc.description}
                  </p>
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <p className="text-base text-destructive font-bold mt-2 flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      REFUSÉ : {doc.rejectionReason}
                    </p>
                  )}
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
                    {doc.status === 'rejected' ? (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="w-3 h-3 mr-1" />
                        Refusé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Reçu
                      </Badge>
                    )}
                    {doc.url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDocument(doc.url!)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {doc.status === 'valid' && doc.needsValidation && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => doc.url && analyzeDocument(doc.id, doc.url)}
                          disabled={analyzingId === doc.id}
                          title="Analyser automatiquement le document"
                          className="text-primary hover:text-primary"
                        >
                          {analyzingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ScanSearch className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openRejectionDialog(doc.id, doc.title)}
                          className="text-destructive hover:text-destructive"
                          title="Refuser le document manuellement"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
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

          {/* Custom documents */}
          {customDocuments.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
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
                  onClick={() => handleDelete(doc.id, true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add custom document button */}
          <Button 
            variant="outline" 
            className="w-full border-dashed"
            onClick={() => setAddDocDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un document supplémentaire
          </Button>
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Le certificat médical n'est pas requis pour l'inscription à la formation.
          </p>
        </div>

        {/* Rejection Dialog */}
        <Dialog open={rejectionDialog.open} onOpenChange={(open) => setRejectionDialog({ ...rejectionDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refuser le document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Vous allez refuser le document "{rejectionDialog.docTitle}". Sélectionnez le motif de refus :
              </p>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un motif" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS[rejectionDialog.docId as keyof typeof REJECTION_REASONS]?.map((reason) => (
                    <SelectItem key={reason.value} value={reason.label}>
                      {reason.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Autre motif...</SelectItem>
                </SelectContent>
              </Select>
              {selectedReason === 'other' && (
                <Input
                  placeholder="Précisez le motif de refus..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectionDialog({ open: false, docId: '', docTitle: '' })}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Refuser le document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Document Dialog */}
        <Dialog open={addDocDialog} onOpenChange={setAddDocDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un document supplémentaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="docTitle">Titre du document</Label>
                <Input
                  id="docTitle"
                  placeholder="Ex: Attestation employeur"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docDesc">Description (optionnelle)</Label>
                <Input
                  id="docDesc"
                  placeholder="Ex: Document fourni par l'employeur"
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                />
              </div>
              {/* Hidden input for custom doc */}
              <input
                type="file"
                ref={(el) => { fileInputRefs.current[`custom_${newDocTitle}`] = el; }}
                onChange={(e) => handleFileChange(newDocTitle, e, true)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDocDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddCustomDocument}>
                <Upload className="w-4 h-4 mr-2" />
                Sélectionner un fichier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}