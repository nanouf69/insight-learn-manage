import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from "lucide-react";

export type FormationLivre = "vtc" | "taxi" | "ta" | "va";

// Lecture page par page via liens courts délivrés par le serveur après contrôle formation/rôle.
// Aucun lien vers le PDF original n'est demandé côté élève ; le bouton original n'apparaît que si le serveur confirme admin.
async function appel(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("livre-formation", { body });
  if (error) {
    let code = "erreur";
    try { code = (await (error as any).context?.json())?.error ?? code; } catch { /* ignore */ }
    throw new Error(code);
  }
  return data;
}

const MESSAGES: Record<string, string> = {
  formation_non_autorisee: "Ce livre n'est pas celui de votre formation.",
  non_connecte: "Veuillez vous reconnecter pour consulter le livre.",
};

export default function LivreFormationViewer({ formation }: { formation: FormationLivre }) {
  const [total, setTotal] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [urls, setUrls] = useState<Record<number, { url: string; t: number }>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dl, setDl] = useState(false);
  const enCours = useRef(new Set<number>());

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const m = await appel({ formation, action: "manifest" });
      setTotal(m.pages); setAdmin(!!m.admin);
    } catch (e: any) { setErreur(MESSAGES[e.message] ?? "Le livre n'a pas pu être chargé."); }
  }, [formation]);
  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    if (!total) return;
    const lot = Math.floor((page - 1) / 10) * 10 + 1;
    const frais = urls[page] && Date.now() - urls[page].t < 90_000;
    if (frais || enCours.current.has(lot)) return;
    enCours.current.add(lot);
    appel({ formation, action: "pages", debut: lot })
      .then((r) => setUrls((u) => { const n = { ...u }; for (const p of r.pages) n[p.numero] = { url: p.url, t: Date.now() }; return n; }))
      .catch((e: any) => setErreur(MESSAGES[e.message] ?? "Cette page n'a pas pu être chargée."))
      .finally(() => enCours.current.delete(lot));
  }, [page, total, formation, urls]);

  const telecharger = async () => {
    setDl(true);
    try { const r = await appel({ formation, action: "original" }); window.location.href = r.url; }
    catch { setErreur("Téléchargement refusé."); }
    finally { setDl(false); }
  };

  if (erreur && !total) return (
    <div className="p-6 text-center space-y-3"><p className="text-destructive">{erreur}</p><Button variant="outline" onClick={charger}>Réessayer</Button></div>
  );
  if (!total) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const img = urls[page]?.url;
  return (
    <div className="flex flex-col gap-3 select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Page précédente"><ChevronLeft /></Button>
        <span className="text-sm tabular-nums">Page {page} / {total}</span>
        <Button size="sm" variant="outline" disabled={page >= total} onClick={() => setPage(page + 1)} aria-label="Page suivante"><ChevronRight /></Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Dézoomer"><ZoomOut /></Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoomer"><ZoomIn /></Button>
        {admin && (
          <Button size="sm" onClick={telecharger} disabled={dl}>
            {dl ? <Loader2 className="animate-spin" /> : <Download />} PDF original (admin)
          </Button>
        )}
      </div>
      {erreur && <p className="text-sm text-destructive text-center">{erreur}</p>}
      <div className="overflow-auto max-h-[80vh] rounded border bg-muted">
        {img ? (
          <img src={img} alt={`Page ${page}`} draggable={false} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className="mx-auto block"
            onError={() => setUrls((u) => { const n = { ...u }; delete n[page]; return n; })} />
        ) : <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>}
      </div>
    </div>
  );
}
