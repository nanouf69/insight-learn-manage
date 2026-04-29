import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildQuestionImagePath, validateQuestionImageFile } from "./examens-blancs-utils";

type ImageSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface QuestionImageUploadProps {
  image: string | null | undefined;
  context: "module" | "exam";
  contextId: number | string;
  questionId: number | string;
  onImageChange: (url: string | null) => void;
  imageSize?: ImageSize;
  onImageSizeChange?: (size: ImageSize) => void;
}

const SIZE_OPTIONS: { value: ImageSize; label: string; previewClass: string }[] = [
  { value: "sm", label: "Petite", previewClass: "max-h-32" },
  { value: "md", label: "Moyenne", previewClass: "max-h-56" },
  { value: "lg", label: "Grande", previewClass: "max-h-80" },
  { value: "xl", label: "Très grande", previewClass: "max-h-[28rem]" },
  { value: "2xl", label: "Maximale", previewClass: "max-h-[40rem]" },
];

export function QuestionImageUpload({
  image,
  context,
  contextId,
  questionId,
  onImageChange,
  imageSize = "sm",
  onImageSizeChange,
}: QuestionImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateQuestionImageFile(file);
    if (!validation.valid) {
      toast.error((validation as { valid: false; error: string }).error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const path = buildQuestionImagePath(context, contextId, questionId, file.name);
      const { error } = await supabase.storage
        .from("cours-fichiers")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("cours-fichiers")
        .getPublicUrl(path);

      onImageChange(publicUrlData.publicUrl);
      toast.success("Image ajoutée");
    } catch (err: any) {
      console.error("[QuestionImageUpload] Upload error:", err);
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onImageChange(null);
  };

  const currentSizeOption = SIZE_OPTIONS.find((o) => o.value === imageSize) ?? SIZE_OPTIONS[0];

  return (
    <div className="space-y-2">
      {image ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={image}
              alt="Image question"
              className={`${currentSizeOption.previewClass} rounded border object-contain`}
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
              onClick={handleRemove}
              title="Supprimer l'image"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          {onImageSizeChange && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Taille d'affichage :</span>
              {SIZE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={imageSize === opt.value ? "default" : "outline"}
                  className="h-7 text-xs px-2"
                  onClick={() => onImageSizeChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Upload...</>
          ) : (
            <><ImagePlus className="w-3 h-3" /> {image ? "Changer l'image" : "Ajouter une image"}</>
          )}
        </Button>
      </div>
    </div>
  );
}
