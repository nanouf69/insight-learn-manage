import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, Eye, Trash2, ScanSearch, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhotoCropper } from "@/components/crm/apprenant-sections/PhotoCropper";

interface DocumentUploadCardProps {
  docId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sessionId: string;
  apprenantId?: string | null;
  expectedNom?: string;
  expectedPrenom?: string;
  onStatusChange?: (docId: string, status: 'pending' | 'valid' | 'rejected', reason?: string) => void;
}

const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp';
const ACCEPTED_IMAGE_FORMATS = '.jpg,.jpeg,.png,.heic,.heif,.webp';
const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function DocumentUploadCard({
  docId,
  title,
  description,
  icon: Icon,
  sessionId,
  apprenantId,
  expectedNom,
  expectedPrenom,
  onStatusChange,
}: DocumentUploadCardProps) {
  const [status, setStatus] = useState<'empty' | 'uploading' | 'analyzing' | 'valid' | 'rejected' | 'pending'>('empty');
  const [fileName, setFileName] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoredRef = useRef(false);

  // Restore document status from DB or localStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restoreFromLocalStorage = () => {
      const saved = localStorage.getItem(`onboarding_doc_${docId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.status === 'valid' || parsed.status === 'pending') {
            setStatus(parsed.status);
            setFileName(parsed.fileName || '');
            setFileUrl(parsed.fileUrl || '');
            onStatusChange?.(docId, parsed.status);
          }
        } catch {}
      }
    };

    const restoreFromDB = async () => {
      if (!apprenantId) {
        restoreFromLocalStorage();
        return;
      }

      const { data, error } = await supabase
        .from('documents_inscription')
        .select('statut, nom_fichier, url')
        .eq('apprenant_id', apprenantId)
        .eq('type_document', docId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const doc = data[0];
        const docStatus = doc.statut === 'valid' ? 'valid' : doc.statut === 'rejected' ? 'rejected' : 'pending';
        setStatus(docStatus as any);
        setFileName(doc.nom_fichier || '');
        // Build public URL from storage path
        if (doc.url) {
          const { data: urlData } = supabase.storage
            .from('documents-inscription')
            .getPublicUrl(doc.url);
          setFileUrl(urlData?.publicUrl || '');
        }
        onStatusChange?.(docId, docStatus as any);
      } else {
        restoreFromLocalStorage();
      }
    };

    restoreFromDB();
  }, [apprenantId, docId]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE_MB}Mo)`);
      event.target.value = '';
      return;
    }

    // For photo_identite, only accept image files (no PDF)
    if (docId === 'photo_identite') {
      const imageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!imageTypes.includes(file.type) && !imageExtensions.includes(fileExtension || '')) {
        toast.error("La photo d'identité doit être une image (JPG, PNG, HEIC, WebP). Les PDF ne sont pas acceptés.");
        event.target.value = '';
        return;
      }
    } else {
      // Validate file type for other documents
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        toast.error("Format non accepté. Formats autorisés: PDF, JPG, PNG, HEIC, WebP");
        event.target.value = '';
        return;
      }
    }

    // For photo_identite: open cropper instead of uploading directly
    if (docId === 'photo_identite' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropperImageSrc(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
      return;
    }

    await uploadFile(file);
    event.target.value = '';
  };

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'photo_identite.jpg', { type: 'image/jpeg' });
    await uploadFile(file);
  }, []);

  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setFileName(file.name);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${docId}_${Date.now()}.${fileExt}`;
      const filePath = `onboarding/${sessionId}/${fileName}`;

      // Upload the file to storage
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

      const publicUrl = urlData?.publicUrl || '';
      setFileUrl(publicUrl);

      toast.success(`Document "${title}" uploadé avec succès`);
      
      // Save record in documents_inscription table
      if (apprenantId) {
        // Delete any existing record for this doc type first
        await supabase
          .from('documents_inscription')
          .delete()
          .eq('apprenant_id', apprenantId)
          .eq('type_document', docId);

        const { error: dbError } = await supabase
          .from('documents_inscription')
          .insert({
            apprenant_id: apprenantId,
            titre: title,
            type_document: docId,
            nom_fichier: file.name,
            url: filePath,
            statut: 'valid',
          });

        if (dbError) {
          console.error('DB insert error:', dbError);
        }

        // Create notification alert for admin
        const apprenantName = localStorage.getItem('onboarding_prenom') || '';
        const apprenantLastName = localStorage.getItem('onboarding_nom') || '';
        await supabase.from('alertes_systeme' as any).insert({
          type: 'document_upload',
          titre: 'Nouveau document recu',
          message: `${apprenantName} ${apprenantLastName} a uploade "${title}"`,
          details: `Type: ${docId} | Fichier: ${file.name}`,
        } as any);
      }

      // Persist to localStorage as fallback
      localStorage.setItem(`onboarding_doc_${docId}`, JSON.stringify({
        status: 'valid',
        fileName: file.name,
        fileUrl: publicUrl,
        filePath,
      }));

      // Mark as valid immediately
      setStatus('valid');
      onStatusChange?.(docId, 'valid');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Erreur lors de l'upload du document");
      setStatus('empty');
      setFileName('');
    }
  };

  const handleDelete = async () => {
    if (!fileUrl) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents-inscription/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('documents-inscription')
          .remove([filePath]);
      }

      // Also delete from DB if apprenant exists
      if (apprenantId) {
        await supabase
          .from('documents_inscription')
          .delete()
          .eq('apprenant_id', apprenantId)
          .eq('type_document', docId);
      }

      setStatus('empty');
      setFileName('');
      setFileUrl('');
      setRejectionReason('');
      localStorage.removeItem(`onboarding_doc_${docId}`);
      onStatusChange?.(docId, 'pending');
      toast.success("Document supprimé");
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  };


  const getStatusBadge = () => {
    switch (status) {
      case 'empty':
        return null;
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Upload...
          </span>
        );
      case 'analyzing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyse...
          </span>
        );
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Reçu
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
            <XCircle className="w-3 h-3" />
            Refusé
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
            <AlertCircle className="w-3 h-3" />
            Attente
          </span>
        );
    }
  };

  const hasFile = status !== 'empty' && status !== 'uploading';

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "bg-white border-2 rounded-xl p-4 transition-all",
          status === 'rejected' ? "border-red-300" : status === 'valid' ? "border-green-300" : "border-gray-200",
          status === 'empty' && "hover:border-blue-300 cursor-pointer"
        )}
        onClick={status === 'empty' ? handleFileSelect : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Status icon on the left */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
            status === 'valid' ? "bg-green-100" : 
            status === 'rejected' ? "bg-red-100" : 
            status === 'pending' ? "bg-orange-100" :
            "bg-gray-100"
          )}>
            {status === 'valid' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : status === 'rejected' ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : status === 'pending' ? (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            ) : status === 'uploading' || status === 'analyzing' ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <Icon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-500 text-sm">{description}</p>
              </div>
              
              {/* Badge */}
              {getStatusBadge()}
            </div>
            
            {/* Actions row for uploaded files */}
            {hasFile && status !== 'analyzing' && (
              <div className="flex items-center gap-1 mt-3">
                {/* View button */}
                {fileUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(fileUrl, '_blank');
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Voir le document"
                  >
                    <Eye className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                
                
                {/* Reject indicator (for rejected status) */}
                {status === 'rejected' && (
                  <div className="p-2">
                    <Ban className="w-5 h-5 text-red-400" />
                  </div>
                )}
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
                
                {/* Spacer */}
                <div className="flex-1" />
                
                {/* Replace button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileSelect();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
                >
                  <Upload className="w-4 h-4" />
                  Remplacer
                </button>
              </div>
            )}
            
            {/* Upload button for empty state */}
            {status === 'empty' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect();
                }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-sm text-blue-600 font-medium"
              >
                <Upload className="w-4 h-4" />
                Télécharger
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={docId === 'photo_identite' ? ACCEPTED_IMAGE_FORMATS : ACCEPTED_FORMATS}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Rejection reason */}
      {status === 'rejected' && rejectionReason && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 ml-11">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 font-medium text-sm">Document refusé</p>
            <p className="text-red-500 text-sm">{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Photo cropper dialog */}
      {docId === 'photo_identite' && (
        <PhotoCropper
          open={cropperOpen}
          onClose={() => setCropperOpen(false)}
          imageSrc={cropperImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}