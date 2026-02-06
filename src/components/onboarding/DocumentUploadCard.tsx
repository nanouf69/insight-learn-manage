import { useState, useRef } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, Eye, Trash2, ScanSearch, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploadCardProps {
  docId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sessionId: string;
  expectedNom?: string;
  expectedPrenom?: string;
  onStatusChange?: (docId: string, status: 'pending' | 'valid' | 'rejected', reason?: string) => void;
}

const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp';
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function DocumentUploadCard({
  docId,
  title,
  description,
  icon: Icon,
  sessionId,
  expectedNom,
  expectedPrenom,
  onStatusChange,
}: DocumentUploadCardProps) {
  const [status, setStatus] = useState<'empty' | 'uploading' | 'analyzing' | 'valid' | 'rejected' | 'pending'>('empty');
  const [fileName, setFileName] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      toast.error("Format non accepté. Formats autorisés: PDF, JPG, PNG, HEIC, WebP");
      event.target.value = '';
      return;
    }

    await uploadFile(file);
    event.target.value = '';
  };

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
      
      // For piece_identite and justificatif_domicile: analyze with AI
      if (docId === 'piece_identite' || docId === 'justificatif_domicile') {
        setStatus('analyzing');
        toast.info("Analyse du document en cours...", { duration: 3000 });

        try {
          const requestBody: Record<string, string> = {
            documentUrl: publicUrl,
            documentType: docId,
          };
          
          // For ID documents, include expected name for verification
          if (docId === 'piece_identite' && expectedNom && expectedPrenom) {
            requestBody.expectedNom = expectedNom;
            requestBody.expectedPrenom = expectedPrenom;
          }
          
          const { data, error } = await supabase.functions.invoke('analyze-document', {
            body: requestBody,
          });

          if (error) throw error;

          if (data && !data.isValid && data.rejectionReason) {
            setStatus('rejected');
            setRejectionReason(data.rejectionReason);
            toast.error(`Document invalide : ${data.rejectionReason}`, { duration: 5000 });
            onStatusChange?.(docId, 'rejected', data.rejectionReason);
          } else if (data && data.isValid) {
            setStatus('valid');
            setRejectionReason('');
            toast.success("Document validé ✓", { duration: 3000 });
            onStatusChange?.(docId, 'valid');
          } else {
            // Uncertain result
            setStatus('pending');
            toast.info("Vérification en attente", { duration: 3000 });
            onStatusChange?.(docId, 'pending');
          }
        } catch (analyzeError: any) {
          console.error('Analysis error:', analyzeError);
          // If analysis fails, mark as pending (needs manual verification)
          setStatus('pending');
          toast.info("Vérification automatique non disponible. Le document sera vérifié manuellement.", { duration: 4000 });
          onStatusChange?.(docId, 'pending');
        }
      } else {
        // For photo, mark as valid immediately
        setStatus('valid');
        onStatusChange?.(docId, 'valid');
      }
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

      setStatus('empty');
      setFileName('');
      setFileUrl('');
      setRejectionReason('');
      toast.success("Document supprimé");
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleReAnalyze = async () => {
    if (!fileUrl || (docId !== 'piece_identite' && docId !== 'justificatif_domicile')) return;

    setStatus('analyzing');
    toast.info("Nouvelle analyse en cours...", { duration: 3000 });

    try {
      const requestBody: Record<string, string> = {
        documentUrl: fileUrl,
        documentType: docId,
      };
      
      // For ID documents, include expected name for verification
      if (docId === 'piece_identite' && expectedNom && expectedPrenom) {
        requestBody.expectedNom = expectedNom;
        requestBody.expectedPrenom = expectedPrenom;
      }
      
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: requestBody,
      });

      if (error) throw error;

      if (data && !data.isValid && data.rejectionReason) {
        setStatus('rejected');
        setRejectionReason(data.rejectionReason);
        toast.error(`Document invalide : ${data.rejectionReason}`, { duration: 5000 });
        onStatusChange?.(docId, 'rejected', data.rejectionReason);
      } else if (data && data.isValid) {
        setStatus('valid');
        setRejectionReason('');
        toast.success("Document validé ✓", { duration: 3000 });
        onStatusChange?.(docId, 'valid');
      } else {
        setStatus('pending');
        toast.info("Vérification en attente", { duration: 3000 });
        onStatusChange?.(docId, 'pending');
      }
    } catch (analyzeError: any) {
      console.error('Re-analysis error:', analyzeError);
      setStatus('pending');
      toast.info("Vérification automatique non disponible.", { duration: 4000 });
      onStatusChange?.(docId, 'pending');
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
  const canAnalyze = (docId === 'piece_identite' || docId === 'justificatif_domicile') && hasFile && status !== 'analyzing';

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
                
                {/* Re-analyze with AI button */}
                {canAnalyze && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReAnalyze();
                    }}
                    className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Relancer l'analyse IA"
                  >
                    <ScanSearch className="w-5 h-5 text-blue-500" />
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
          accept={ACCEPTED_FORMATS}
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
    </div>
  );
}