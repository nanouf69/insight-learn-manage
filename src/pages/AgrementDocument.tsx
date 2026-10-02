import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { isImage, toPdf } from "@/lib/agrementPdf";

/** Lien sécurisé vers un document d'agrément : connexion admin obligatoire. */
export default function AgrementDocument() {
  const { id } = useParams();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`; return; }
      const { data: f, error } = await (supabase as any).from("agrement_pieces_fichiers")
        .select("storage_path, pdf_storage_path, nom_fichier").eq("id", id).maybeSingle();
      if (error || !f) { setMsg("Document introuvable ou accès refusé (compte administrateur requis)."); return; }
      const path = f.pdf_storage_path ?? f.storage_path;
      if (!f.pdf_storage_path && isImage(f.nom_fichier)) {
        const { data } = await supabase.storage.from("agrements").download(path);
        if (!data) { setMsg("Lien indisponible."); return; }
        const pdf = await toPdf(data, f.nom_fichier);
        window.location.replace(URL.createObjectURL(pdf!));
        return;
      }
      const { data } = await supabase.storage.from("agrements").createSignedUrl(path, 300);
      if (!data) { setMsg("Lien indisponible."); return; }
      window.location.replace(data.signedUrl);
    })();
  }, [id]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {msg ?? <Loader2 className="h-6 w-6 animate-spin" />}
    </div>
  );
}
