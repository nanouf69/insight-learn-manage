import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FolderPlus, Upload, Eye, Trash2, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

interface Props {
  apprenantId: string;
}

interface LibreDoc {
  id: string;
  titre: string;
  nom_fichier: string | null;
  url: string | null;
  created_at: string | null;
}

export function DossierDocumentsLibres({ apprenantId }: Props) {
  const [docs, setDocs] = useState<LibreDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!apprenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents_inscription")
      .select("id, titre, nom_fichier, url, created_at, type_document")
      .eq("apprenant_id", apprenantId)
      .like("type_document", "libre%")
      .order("created_at", { ascending: false });
    if (error) console.error("[documents-libres]", error);
    setDocs((data as any[]) || []);
    setLoading(false);
  }, [apprenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        if (file.size > 4 * 1024 * 1024) {
          toast.error(`${file.name} : fichier trop volumineux (max 4 Mo)`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("apprenant_id", apprenantId);
        formData.append("titre", file.name);
        formData.append(
          "type_document",
          `libre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        );
        const { data, error } = await supabase.functions.invoke("upload-document-inscription", {
          body: formData,
        });
        if (error || !(data as any)?.success) {
          throw new Error(error?.message || (data as any)?.error || "Upload échoué");
        }
        ok++;
      } catch (e: any) {
        toast.error(`${file.name} : ${e?.message || "erreur d'upload"}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (ok > 0) {
      toast.success(`${ok} document(s) ajouté(s) au dossier`);
      load();
    }
  };

  const handleView = async (doc: LibreDoc) => {
    if (!doc.url) return;
    const path = doc.url.includes("/documents-inscription/")
      ? doc.url.split("/documents-inscription/")[1]
      : doc.url;
    const { data, error } = await supabase.storage
      .from("documents-inscription")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Impossible d'ouvrir le document");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: LibreDoc) => {
    const { error } = await supabase.from("documents_inscription").delete().eq("id", doc.id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    if (doc.url) {
      const path = doc.url.includes("/documents-inscription/")
        ? doc.url.split("/documents-inscription/")[1]
        : doc.url;
      await supabase.storage.from("documents-inscription").remove([path]);
    }
    toast.success("Document supprimé");
    load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            Documents ajoutés au dossier
            <Badge variant="secondary">{docs.length}</Badge>
          </CardTitle>
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Ajouter un document
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun document libre. Ajoutez n'importe quel fichier depuis votre ordinateur (PDF, image, Word, Excel… max 4 Mo).
          </p>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.titre || doc.nom_fichier}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy HH:mm") : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleView(doc)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
