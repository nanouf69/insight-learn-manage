import { useState, useRef } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploadCardProps {
  docId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sessionId: string;
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
      
      // For piece_identite, permis_conduire, justificatif_domicile: analyze with AI
      if (docId === 'piece_identite' || docId === 'permis_conduire' || docId === 'justificatif_domicile') {
        setStatus('analyzing');
        toast.info("Analyse du document en cours...", { duration: 3000 });

        try {
          const { data, error } = await supabase.functions.invoke('analyze-document', {
            body: {
              documentUrl: publicUrl,
              documentType: docId,
            },
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
        // For photo and signature, mark as valid immediately
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

  const getStatusBadge = () => {
    const baseClasses = "px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 flex items-center gap-1 sm:gap-2";
    
    switch (status) {
      case 'empty':
        return (
          <span className={`${baseClasses} bg-amber-50 text-amber-600 border border-amber-200`}>
            <span className="hidden sm:inline">Requis</span>
            <span className="sm:hidden">!</span>
          </span>
        );
      case 'uploading':
        return (
          <span className={`${baseClasses} bg-blue-50 text-blue-600 border border-blue-200`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Upload...</span>
          </span>
        );
      case 'analyzing':
        return (
          <span className={`${baseClasses} bg-blue-50 text-blue-600 border border-blue-200`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Analyse...</span>
          </span>
        );
      case 'valid':
        return (
          <span className={`${baseClasses} bg-green-50 text-green-600 border border-green-200`}>
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden sm:inline">Validé</span>
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClasses} bg-red-50 text-red-600 border border-red-200`}>
            <XCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Refusé</span>
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-orange-50 text-orange-600 border border-orange-200`}>
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Attente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "bg-gray-50 border rounded-xl sm:rounded-2xl p-3 sm:p-5 transition-colors",
          status === 'rejected' ? "border-red-300 bg-red-50/50" : "border-gray-200",
          status === 'valid' ? "border-green-300 bg-green-50/50" : "",
          status === 'empty' && "hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer"
        )}
        onClick={status === 'empty' ? handleFileSelect : undefined}
      >
        {/* Mobile layout: stacked */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0",
            status === 'valid' ? "bg-green-100" : status === 'rejected' ? "bg-red-100" : "bg-blue-100"
          )}>
            <Icon className={cn(
              "w-5 h-5 sm:w-7 sm:h-7",
              status === 'valid' ? "text-green-600" : status === 'rejected' ? "text-red-600" : "text-blue-600"
            )} />
          </div>
          
          {/* Content and actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">{title}</h3>
                {fileName ? (
                  <p className="text-gray-500 text-xs sm:text-sm truncate">{fileName}</p>
                ) : (
                  <p className="text-gray-500 text-xs sm:text-sm line-clamp-2">{description}</p>
                )}
              </div>
              
              {/* Badge - always visible */}
              <div className="flex-shrink-0">
                {getStatusBadge()}
              </div>
            </div>
            
            {/* Action buttons - on mobile, below text */}
            <div className="flex items-center gap-2 mt-3">
              {status !== 'empty' && status !== 'uploading' && status !== 'analyzing' && (
                <>
                  {fileUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(fileUrl, '_blank');
                      }}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs sm:text-sm flex items-center gap-1"
                      title="Voir le document"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                      <span className="hidden sm:inline text-gray-600">Voir</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 transition-colors text-xs sm:text-sm flex items-center gap-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    <span className="hidden sm:inline text-gray-600">Supprimer</span>
                  </button>
                </>
              )}
              
              {status === 'empty' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileSelect();
                  }}
                  className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors text-sm flex items-center gap-2 text-blue-600 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
              )}
            </div>
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
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 ml-4">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 font-medium text-sm">Document refusé</p>
            <p className="text-red-500 text-sm">{rejectionReason}</p>
            <button
              onClick={handleFileSelect}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Télécharger un nouveau document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
