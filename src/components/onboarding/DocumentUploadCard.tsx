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
    switch (status) {
      case 'empty':
        return (
          <span className="px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/30 flex-shrink-0">
            Requis
          </span>
        );
      case 'uploading':
        return (
          <span className="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-blue-500/30 flex-shrink-0 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Upload...
          </span>
        );
      case 'analyzing':
        return (
          <span className="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-blue-500/30 flex-shrink-0 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyse IA...
          </span>
        );
      case 'valid':
        return (
          <span className="px-4 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30 flex-shrink-0 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3" />
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="px-4 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium border border-red-500/30 flex-shrink-0 flex items-center gap-2">
            <XCircle className="w-3 h-3" />
            Refusé
          </span>
        );
      case 'pending':
        return (
          <span className="px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium border border-orange-500/30 flex-shrink-0 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            En attente
          </span>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "flex items-center gap-4 bg-white/5 border rounded-2xl p-5 transition-colors",
          status === 'rejected' ? "border-red-500/30" : "border-white/10",
          status === 'valid' ? "border-green-500/30" : "",
          status === 'empty' && "hover:border-blue-500/30 cursor-pointer"
        )}
        onClick={status === 'empty' ? handleFileSelect : undefined}
      >
        {/* Icon */}
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
          status === 'valid' ? "bg-green-500/20" : status === 'rejected' ? "bg-red-500/20" : "bg-blue-500/20"
        )}>
          <Icon className={cn(
            "w-7 h-7",
            status === 'valid' ? "text-green-400" : status === 'rejected' ? "text-red-400" : "text-blue-400"
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-white">{title}</h3>
          {fileName ? (
            <p className="text-white/50 text-sm truncate">{fileName}</p>
          ) : (
            <p className="text-white/50 text-sm">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {status !== 'empty' && status !== 'uploading' && status !== 'analyzing' && (
            <>
              {fileUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(fileUrl, '_blank');
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  title="Voir le document"
                >
                  <Eye className="w-4 h-4 text-white/60" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4 text-white/60 hover:text-red-400" />
              </button>
            </>
          )}
          
          {status === 'empty' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileSelect();
              }}
              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
              title="Télécharger"
            >
              <Upload className="w-4 h-4 text-blue-400" />
            </button>
          )}
          
          {getStatusBadge()}
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
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 ml-4">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Document refusé</p>
            <p className="text-red-300/80 text-sm">{rejectionReason}</p>
            <button
              onClick={handleFileSelect}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Télécharger un nouveau document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
