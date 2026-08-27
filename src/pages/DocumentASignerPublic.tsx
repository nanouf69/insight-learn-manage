import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { CheckCircle2, Loader2, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { ChampDocument } from "@/lib/documentsASigner";

if (typeof (Promise as any).withResolvers === "undefined") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
} catch {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-signature-public`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface DocData {
  nom: string;
  champs: ChampDocument[];
  statut: string;
  destinataire_nom: string | null;
  reponses: Record<string, string>;
  fileUrl: string | null;
}

export default function DocumentASignerPublic() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<DocData | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [numPages, setNumPages] = useState(0);
  const [largeur, setLargeur] = useState(720);

  useEffect(() => {
    const maj = () => setLargeur(Math.min(720, (containerRef.current?.clientWidth || 720) - 8));
    maj();
    window.addEventListener("resize", maj);
    return () => window.removeEventListener("resize", maj);
  }, [doc]);

  useEffect(() => {
    const charger = async () => {
      try {
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify({ action: "get", token }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Document indisponible");
        setDoc(json.document);
        setReponses(json.document.reponses || {});
      } catch (e: any) {
        setErreur(e.message);
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [token]);

  const envoyer = async () => {
    if (!doc) return;
    const manquants = doc.champs.filter((c) => c.requis && !reponses[c.id]);
    if (manquants.length > 0) {
      toast({
        title: "Champs obligatoires",
        description: `Merci de compléter : ${manquants.map((c) => c.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ action: "submit", token, reponses }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Envoi impossible");
      setDoc({ ...doc, statut: "signe" });
      toast({ title: "Merci !", description: "Votre document a bien été transmis." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erreur || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Document indisponible</h1>
          <p className="text-muted-foreground">{erreur}</p>
        </div>
      </div>
    );
  }

  const signe = doc.statut === "signe";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <FileSignature className="h-8 w-8 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">{doc.nom}</h1>
          <p className="text-muted-foreground text-sm">
            {signe
              ? "Ce document a déjà été complété et signé."
              : "Complétez les zones indiquées puis validez pour transmettre le document à FTRANSPORT."}
          </p>
        </header>

        {signe && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" /> Document signé et transmis
          </div>
        )}

        <div ref={containerRef} className="bg-card border rounded-xl p-3 overflow-auto">
          {doc.fileUrl && (
            <Document file={doc.fileUrl} onLoadSuccess={({ numPages: n }) => setNumPages(n)}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                <div key={p} className="relative inline-block mb-4">
                  <Page pageNumber={p} width={largeur} renderTextLayer={false} renderAnnotationLayer={false} />
                  {doc.champs
                    .filter((c) => c.page === p)
                    .map((c) => (
                      <div
                        key={c.id}
                        style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}
                        className="absolute border-2 border-dashed border-primary/60 bg-primary/5 rounded"
                      >
                        {reponses[c.id] && c.type === "signature" ? (
                          <img src={reponses[c.id]} alt={c.label} className="w-full h-full object-contain" />
                        ) : reponses[c.id] ? (
                          <span className="text-[11px] px-1 flex items-center h-full">{reponses[c.id]}</span>
                        ) : (
                          <span className="text-[10px] px-1 text-primary flex items-center h-full">{c.label}</span>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </Document>
          )}
        </div>

        {!signe && (
          <div className="bg-card border rounded-xl p-5 space-y-5">
            <h2 className="font-semibold">Zones à compléter</h2>
            {doc.champs.map((c) => (
              <div key={c.id} className="space-y-2">
                <Label>
                  {c.label} {c.requis && <span className="text-destructive">*</span>}
                </Label>
                {c.type === "signature" ? (
                  <SignaturePad
                    value={reponses[c.id] || ""}
                    onChange={(v) => setReponses((prev) => ({ ...prev, [c.id]: v }))}
                  />
                ) : (
                  <Input
                    type={c.type === "nombre" ? "number" : "text"}
                    inputMode={c.type === "nombre" ? "numeric" : "text"}
                    value={reponses[c.id] || ""}
                    onChange={(e) => setReponses((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <Button className="w-full" onClick={envoyer} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Valider et transmettre
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
