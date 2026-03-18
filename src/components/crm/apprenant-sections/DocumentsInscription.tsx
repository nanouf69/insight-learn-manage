import { useState, useRef, useEffect, useCallback } from "react";
import { FileCheck, Upload, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, Eye, Ban, Plus, ScanSearch, CalendarDays, AlertTriangle, Check, Download } from "lucide-react";
import { generateRecapitulatifPDF } from "@/lib/pdf/recapitulatif-inscription";
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
import { PhotoCropper } from "./PhotoCropper";

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
    description: "⚠️ Fond clair obligatoire (blanc, beige ou bleu) - Uniquement la tête",
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
  
  // Photo cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [pendingPhotoDocId, setPendingPhotoDocId] = useState<string>('');
  
  // Questions obligatoires
  const [question1, setQuestion1] = useState<boolean | null>(null);
  const [question2, setQuestion2] = useState<boolean | null>(null);
  const [question3, setQuestion3] = useState<boolean | null>(null);

  // Permis de conduire date validation
  const [datePermis, setDatePermis] = useState('');
  const [isConduiteAccompagnee, setIsConduiteAccompagnee] = useState<boolean | null>(null);
  
  // Justificatif de domicile month selection
  const [moisJustificatif, setMoisJustificatif] = useState('');

  // Permis date validation helpers
  const isPermisDateTooOld = (() => {
    if (!datePermis) return false;
    const permisDate = new Date(datePermis);
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    return permisDate <= threeYearsAgo;
  })();

  const permisBlocked = isPermisDateTooOld && isConduiteAccompagnee !== true;

  // Justificatif month validation
  const isJustificatifTooOld = (() => {
    if (!moisJustificatif) return false;
    const [year, month] = moisJustificatif.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, 1);
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return selectedDate < threeMonthsAgo;
  })();

  // Generate month options
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  })();

  // Fetch existing documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [apprenant.id]);

  const fetchDocuments = async () => {
    try {
      // Fetch documents from database
      const { data: dbDocs, error } = await supabase
        .from('documents_inscription')
        .select('*')
        .eq('apprenant_id', apprenant.id);

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      // Map document types with their upload status from database
      const updatedDocuments: DocumentStatus[] = DOCUMENT_TYPES.map(docType => {
        const dbDoc = dbDocs?.find(d => d.type_document === docType.id);
        
        if (dbDoc) {
          return {
            ...docType,
            uploaded: true,
            status: dbDoc.statut as 'valid' | 'rejected' | 'pending',
            rejectionReason: dbDoc.motif_refus || undefined,
            url: dbDoc.url,
            fileName: dbDoc.nom_fichier,
          };
        }
        return {
          ...docType,
          uploaded: false,
          status: 'pending' as const,
        };
      });

      // Fetch custom documents and generated documents from database
      const standardTypeIds = DOCUMENT_TYPES.map(d => d.id);
      const customDocs: CustomDocument[] = (dbDocs?.filter(d => !standardTypeIds.includes(d.type_document)) || []).map(d => ({
        id: d.id,
        title: d.titre,
        description: d.description || 'Document supplémentaire',
        uploaded: true,
        url: d.url,
        fileName: d.nom_fichier,
      }));

      setDocuments(updatedDocuments);
      setCustomDocuments(customDocs);
    } catch (error) {
      console.error('Error:', error);
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

      // First, delete any existing file for this document type from storage
      const existingDoc = documents.find(d => d.id === docId);
      if (existingDoc?.fileName) {
        await supabase.storage
          .from('documents-inscription')
          .remove([`${apprenant.id}/${existingDoc.fileName}`]);
      }

      // Upload the new file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents-inscription')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents-inscription')
        .getPublicUrl(filePath);

      const docType = DOCUMENT_TYPES.find(d => d.id === docId);
      const docTitle = isCustom ? docId : (docType?.title || docId);
      const docDescription = isCustom ? 'Document supplémentaire' : (docType?.description || '');
      
      const initialStatus = 'valid';

      // Delete existing record in database for this document type
      if (!isCustom) {
        await supabase
          .from('documents_inscription')
          .delete()
          .eq('apprenant_id', apprenant.id)
          .eq('type_document', docId);
      }

      // Insert new record in database
      const { error: dbError } = await supabase
        .from('documents_inscription')
        .insert({
          apprenant_id: apprenant.id,
          type_document: isCustom ? 'custom' : docId,
          titre: docTitle,
          description: docDescription,
          url: urlData?.publicUrl || '',
          nom_fichier: fileName,
          statut: initialStatus,
        });

      if (dbError) {
        throw dbError;
      }

      toast.success(`Document "${docTitle}" uploadé avec succès`);
      
      // Refresh the documents list
      await fetchDocuments();

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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents-inscription')
        .remove([`${apprenant.id}/${doc.fileName}`]);

      if (storageError) throw storageError;

      // Delete from database
      if (isCustom) {
        await supabase
          .from('documents_inscription')
          .delete()
          .eq('id', docId);
      } else {
        await supabase
          .from('documents_inscription')
          .delete()
          .eq('apprenant_id', apprenant.id)
          .eq('type_document', docId);
      }

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
      // Update the document status in database
      await supabase
        .from('documents_inscription')
        .update({
          statut: 'rejected',
          motif_refus: reason,
        })
        .eq('apprenant_id', apprenant.id)
        .eq('type_document', rejectionDialog.docId);

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

  // Formats acceptés
  const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp';
  const ACCEPTED_FORMATS_DISPLAY = 'PDF, JPG, PNG, HEIC, WebP';
  const MAX_FILE_SIZE_MB = 4;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = (docId: string, event: React.ChangeEvent<HTMLInputElement>, isCustom = false) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE_MB}Mo)`);
        event.target.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
      
      // Pour la photo d'identité, seules les images sont acceptées (pas de PDF)
      if (docId === 'photo_identite') {
        const imageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
        
        if (!imageTypes.includes(file.type) && !imageExtensions.includes(fileExtension || '')) {
          toast.error("Pour la photo d'identité, seules les images sont acceptées (JPG, PNG, HEIC, WebP)");
          event.target.value = '';
          return;
        }
      } else if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        toast.error(`Format non accepté. Formats autorisés: ${ACCEPTED_FORMATS_DISPLAY}`);
        event.target.value = '';
        return;
      }
      
      // Si c'est une photo d'identité (image), ouvrir le cropper
      if (docId === 'photo_identite' && file.type.startsWith('image/')) {
        console.log('Opening photo cropper for:', docId);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            console.log('Image loaded, opening cropper dialog');
            setCropperImageSrc(e.target.result as string);
            setPendingPhotoDocId(docId);
            setCropperOpen(true);
          }
        };
        reader.onerror = (e) => {
          console.error('Error reading file:', e);
          toast.error("Erreur lors de la lecture du fichier");
        };
        reader.readAsDataURL(file);
        return; // Important: don't proceed to normal upload
      }
      
      handleUpload(docId, file, isCustom);
    }
    // Reset input
    event.target.value = '';
  };

  // Callback après le recadrage de la photo
  const handlePhotoCropComplete = useCallback(async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'photo_identite.jpg', { type: 'image/jpeg' });
    await handleUpload(pendingPhotoDocId, file, false);
    setPendingPhotoDocId('');
    setCropperImageSrc('');
  }, [pendingPhotoDocId]);

  const openDocument = async (url: string) => {
    // If url is a full public URL, extract the path
    const bucketPrefix = '/storage/v1/object/public/documents-inscription/';
    let filePath = url;
    if (url.includes(bucketPrefix)) {
      filePath = url.split(bucketPrefix)[1];
    } else if (url.startsWith('http')) {
      // Try to extract path from any URL format
      const match = url.match(/documents-inscription\/(.+)$/);
      if (match) filePath = match[1];
    }
    
    // Generate a signed URL for private bucket access
    const { data, error } = await supabase.storage
      .from('documents-inscription')
      .createSignedUrl(filePath, 300);
    
    if (error || !data?.signedUrl) {
      toast.error("Impossible d'ouvrir le document");
      console.error('Signed URL error:', error);
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const validDocuments = documents.filter(d => d.uploaded && d.status === 'valid');
  const uploadedCount = validDocuments.length;
  const totalRequired = documents.filter(d => d.required).length;
  const progress = totalRequired > 0 ? (uploadedCount / totalRequired) * 100 : 0;

  const rejectedDocs = documents.filter(d => d.status === 'rejected');

  // Signature stagiaire obligatoire — bloque la validation du dossier
  const signatureDoc = documents.find(d => d.id === 'signature');
  const isSignatureUploaded = signatureDoc?.uploaded && signatureDoc?.status === 'valid';
  const dossierComplet = uploadedCount === totalRequired && totalRequired > 0 && rejectedDocs.length === 0 && isSignatureUploaded;
          <p className="text-xs text-muted-foreground mt-3">
            📎 Formats acceptés : {ACCEPTED_FORMATS_DISPLAY} • Max {MAX_FILE_SIZE_MB}Mo par fichier
          </p>
        </div>

        {/* Bouton télécharger le document de bienvenue */}
        <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50 flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">Document de bienvenue</h4>
            <p className="text-xs text-muted-foreground">Récapitulatif d'inscription généré depuis les données de l'apprenant</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              generateRecapitulatifPDF({
                nom: apprenant.nom || '',
                prenom: apprenant.prenom || '',
                email: apprenant.email || '',
                telephone: apprenant.telephone || '',
                numeroDossier: apprenant.numero_dossier_cma || '',
                typeExamen: apprenant.type_examen || '',
                dateExamen: apprenant.date_examen_theorique || '',
                lieuExamen: apprenant.lieu_examen || '',
                b2Vierge: apprenant.b2_vierge || false,
                motDePasseCma: apprenant.mot_de_passe_cma || '',
              });
              toast.success("Document de bienvenue téléchargé");
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger le PDF
          </Button>
        </div>

        {/* Documents list */}
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id}>
              <div 
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
                    accept={ACCEPTED_FORMATS}
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

              {/* Permis de conduire: date + conduite accompagnée */}
              {doc.id === 'permis_conduire' && (
                <div className={`mt-2 border rounded-lg p-4 space-y-3 ${permisBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="w-4 h-4" />
                      Date d'obtention du permis de conduire
                    </label>
                    <input
                      type="date"
                      value={datePermis}
                      onChange={(e) => {
                        setDatePermis(e.target.value);
                        setIsConduiteAccompagnee(null);
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {isPermisDateTooOld && (
                    <div className={`border rounded-lg p-3 space-y-2 ${permisBlocked ? 'border-destructive/30 bg-destructive/10' : 'border-amber-300 bg-amber-50'}`}>
                      <p className="text-sm font-medium">
                        ⚠️ Votre permis a plus de 3 ans. Avez-vous obtenu votre permis en conduite accompagnée ?
                      </p>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="crm_conduite_accompagnee"
                            checked={isConduiteAccompagnee === true}
                            onChange={() => setIsConduiteAccompagnee(true)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Oui</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="crm_conduite_accompagnee"
                            checked={isConduiteAccompagnee === false}
                            onChange={() => setIsConduiteAccompagnee(false)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Non</span>
                        </label>
                      </div>
                      {isConduiteAccompagnee === false && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-destructive text-sm font-medium">
                            Permis hors période probatoire de 3 ans. Dossier non accepté.
                          </p>
                        </div>
                      )}
                      {isConduiteAccompagnee === true && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-green-100 rounded-lg">
                          <Check className="w-4 h-4 text-green-600" />
                          <p className="text-green-700 text-sm">Conduite accompagnée acceptée (période probatoire de 2 ans).</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Justificatif de domicile: month selector */}
              {doc.id === 'justificatif_domicile' && (
                <div className={`mt-2 border rounded-lg p-4 ${isJustificatifTooOld ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <CalendarDays className="w-4 h-4" />
                    Mois du justificatif
                  </label>
                  <select
                    value={moisJustificatif}
                    onChange={(e) => setMoisJustificatif(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sélectionnez le mois du justificatif...</option>
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {isJustificatifTooOld && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-destructive text-sm font-medium">
                        Ce justificatif date de plus de 3 mois. Veuillez fournir un document plus récent.
                      </p>
                    </div>
                  )}
                </div>
              )}
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

        {/* Questions obligatoires */}
        <div className="mt-6 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Questions obligatoires
          </h4>
          <div className="space-y-4">
            {/* Question 1 */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                1) Avez-vous perdu 6 points d'un coup (une seule infraction) sur votre permis de conduire ?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question1"
                    checked={question1 === false}
                    onChange={() => setQuestion1(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Non</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question1"
                    checked={question1 === true}
                    onChange={() => setQuestion1(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Oui</span>
                </label>
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                2) Avez-vous déjà été condamné(e) ferme ou avec sursis à 6 mois minimum de prison ?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question2"
                    checked={question2 === false}
                    onChange={() => setQuestion2(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Non</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question2"
                    checked={question2 === true}
                    onChange={() => setQuestion2(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Oui</span>
                </label>
              </div>
            </div>

            {/* Question 3 */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                3) Avez-vous déjà été condamné(e) pour conduite sans permis ?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question3"
                    checked={question3 === false}
                    onChange={() => setQuestion3(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Non</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="question3"
                    checked={question3 === true}
                    onChange={() => setQuestion3(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Oui</span>
                </label>
              </div>
            </div>

            {/* Avertissement si une réponse est "Oui" */}
            {(question1 === true || question2 === true || question3 === true) && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive font-bold text-lg flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  Merci de recontacter le centre au 04 28 29 60 91
                </p>
              </div>
            )}

            {/* Indicateur si toutes les questions sont répondues "Non" */}
            {question1 === false && question2 === false && question3 === false && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Toutes les conditions sont remplies
                </p>
              </div>
            )}
          </div>
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
                accept={ACCEPTED_FORMATS}
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

      {/* Photo Cropper Dialog - en dehors du Card pour éviter les problèmes de z-index */}
      <PhotoCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setCropperImageSrc('');
          setPendingPhotoDocId('');
        }}
        imageSrc={cropperImageSrc}
        onCropComplete={handlePhotoCropComplete}
      />
    </Card>
  );
}