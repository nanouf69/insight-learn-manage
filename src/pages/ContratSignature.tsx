import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, FileText, Eraser } from "lucide-react";
import { buildContratFranchiseContent, generateContratFranchisePdf, type ContratFranchiseBlock } from "@/lib/pdf/contrat-franchise";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Contrat {
  id: string;
  titre: string;
  status: string;
  destinataire_nom: string | null;
  destinataire_email: string | null;
  signed_at: string | null;
  signed_pdf_url: string | null;
  representant_nom: string | null;
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

export default function ContratSignature() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [representantNom, setRepresentantNom] = useState("");
  const [initiales, setInitiales] = useState("");
  const [initialesTouched, setInitialesTouched] = useState(false);
  const [lieu, setLieu] = useState("London");
  const [accepted, setAccepted] = useState(false);
  const [mentionManuscrite, setMentionManuscrite] = useState("");
  const MENTION_REQUISE = "Lu et approuvé - Bon pour accord";
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[''`]/g, "'");
  const mentionValide = normalize(mentionManuscrite) === normalize(MENTION_REQUISE);
  const [submitting, setSubmitting] = useState(false);

  // Auto-derive initiales depuis le nom
  useEffect(() => {
    if (initialesTouched) return;
    const auto = representantNom
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 4);
    setInitiales(auto);
  }, [representantNom, initialesTouched]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/signer-contrat-franchise?token=${token}`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Contrat introuvable");
        setContrat(json.contrat);
        setRepresentantNom(json.contrat.representant_nom || "");
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Signature pad
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * 2;
      c.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    };
    resize();
    const pos = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const down = (e: PointerEvent) => {
      drawingRef.current = true;
      hasSignatureRef.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const up = () => { drawingRef.current = false; };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [contrat]);

  const clearSignature = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    hasSignatureRef.current = false;
  };

  const handleSign = async () => {
    if (!representantNom.trim()) { toast({ title: "Nom complet du représentant requis", variant: "destructive" }); return; }
    if (!initiales.trim()) { toast({ title: "Initiales requises", variant: "destructive" }); return; }
    if (!lieu.trim()) { toast({ title: "Lieu de signature requis", variant: "destructive" }); return; }
    if (!hasSignatureRef.current) { toast({ title: "Signature requise", variant: "destructive" }); return; }
    if (!accepted) { toast({ title: "Vous devez cocher 'Lu et approuvé'", variant: "destructive" }); return; }
    if (!mentionValide) { toast({ title: "Mention manuscrite incorrecte", description: `Recopiez exactement : « ${MENTION_REQUISE} »`, variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const sigDataUrl = canvasRef.current!.toDataURL("image/png");
      const today = new Date();
      const dateStr = today.toLocaleDateString("fr-FR");
      const pdfBlob = generateContratFranchisePdf({
        representantNom: representantNom.trim(),
        lieu: lieu || "London",
        date: dateStr,
        signatureDataUrl: sigDataUrl,
        initiales: initiales.trim().toUpperCase(),
      });
      const pdfBase64 = await blobToBase64(pdfBlob);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/signer-contrat-franchise`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({
          token,
          representantNom: representantNom.trim(),
          lieu: lieu || "London",
          signatureDataUrl: sigDataUrl,
          initiales: initiales.trim().toUpperCase(),
          pdfBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de la signature");
      setContrat((c) => c ? { ...c, status: "signe", signed_at: new Date().toISOString(), signed_pdf_url: json.signed_pdf_url, representant_nom: representantNom } : c);
      toast({ title: "Contrat signé ✓", description: "Le PDF signé a été transmis à FTRANSPORT." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (err || !contrat) {
    return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md"><CardContent className="pt-6 text-center text-destructive">{err || "Contrat introuvable"}</CardContent></Card></div>;
  }

  if (contrat.status === "signe") {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Contrat déjà signé</h1>
            <p className="text-muted-foreground">Signé le {new Date(contrat.signed_at!).toLocaleString("fr-FR")} par {contrat.representant_nom}</p>
            {contrat.signed_pdf_url && (
              <a href={contrat.signed_pdf_url} target="_blank" rel="noreferrer">
                <Button><FileText className="w-4 h-4 mr-2" />Télécharger le PDF signé</Button>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const downloadBlankPdf = () => {
    const blob = generateContratFranchisePdf({
      representantNom: representantNom.trim() || "[À COMPLÉTER PAR LE FRANCHISEUR]",
      lieu: lieu || "London",
      date: new Date().toLocaleDateString("fr-FR"),
      signatureDataUrl: "",
      initiales: initiales || "—",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Contrat-Franchise-FINALLY-ACADEMY-FTRANSPORT.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const contratBlocks = buildContratFranchiseContent({
    representantNom: representantNom.trim() || "______________",
    lieu: lieu || "London",
    date: new Date().toLocaleDateString("fr-FR"),
    signatureDataUrl: "",
    initiales: initiales || "—",
  });

  const renderContractBlock = (block: ContratFranchiseBlock, index: number) => {
    const text = "text" in block ? (typeof block.text === "function" ? block.text({ representantNom, lieu, date: new Date().toLocaleDateString("fr-FR"), signatureDataUrl: "", initiales }) : block.text) : "";
    if (block.type === "title") return <p key={index} className="font-bold text-center text-base">{text}</p>;
    if (block.type === "subtitle") return <p key={index} className="text-center">{text}</p>;
    if (block.type === "italic") return <p key={index} className="italic text-center text-muted-foreground text-xs">{text}</p>;
    if (block.type === "heading2") return <p key={index} className="font-bold mt-4">{text}</p>;
    if (block.type === "heading3") return <p key={index} className="font-semibold mt-3">{text}</p>;
    if (block.type === "noteHeading") return <p key={index} className="font-bold italic mt-4">{text}</p>;
    if (block.type === "box") return <p key={index} className="bg-muted/60 border rounded p-2 font-semibold whitespace-pre-line">{text}</p>;
    if (block.type === "paragraph") return <p key={index} className="whitespace-pre-line">{text}</p>;
    if (block.type === "bullets") {
      return (
        <ul key={index} className="list-disc pl-5 space-y-1">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{typeof item === "function" ? item({ representantNom, lieu, date: new Date().toLocaleDateString("fr-FR"), signatureDataUrl: "", initiales }) : item}</li>
          ))}
        </ul>
      );
    }
    if (block.type === "table") {
      return (
        <div key={index} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const content = typeof cell === "function" ? cell({ representantNom, lieu, date: new Date().toLocaleDateString("fr-FR"), signatureDataUrl: "", initiales }) : cell;
                    return (
                      <td key={cellIndex} className={`border p-2 align-top whitespace-pre-line ${rowIndex < (block.headerRows || 0) || rowIndex >= block.rows.length - 2 ? "font-semibold bg-muted/60" : ""}`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{contrat.titre}</h1>
          <p className="text-muted-foreground mt-2">Veuillez lire l'intégralité du contrat, puis le compléter et le signer ci-dessous</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contrat intégral</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={downloadBlankPdf} className="gap-2">
              <FileText className="w-4 h-4" />Télécharger le PDF
            </Button>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed max-h-[600px] overflow-y-auto space-y-3 bg-card border rounded p-4">
            {contratBlocks.map(renderContractBlock)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Signature du Franchiseur — FINALLY ACADEMY LTD</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom complet du représentant *</Label>
              <Input value={representantNom} onChange={(e) => setRepresentantNom(e.target.value)} placeholder="Ex : John Smith" />
            </div>
            <div>
              <Label>Initiales (paraphe sur chaque page) *</Label>
              <Input
                value={initiales}
                onChange={(e) => { setInitiales(e.target.value.toUpperCase().slice(0, 4)); setInitialesTouched(true); }}
                placeholder="Ex : JS"
                maxLength={4}
                className="uppercase font-bold tracking-widest"
              />
              <p className="text-xs text-muted-foreground mt-1">Ces initiales seront apposées en pied de chaque page du contrat.</p>
            </div>
            <div>
              <Label>Lieu de signature *</Label>
              <Input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="London" />
            </div>
            <div>
              <Label>Date de signature</Label>
              <Input value={new Date().toLocaleDateString("fr-FR")} disabled />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Signature manuscrite *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                  <Eraser className="w-3 h-3 mr-1" />Effacer
                </Button>
              </div>
              <canvas ref={canvasRef} className="w-full h-48 border-2 border-dashed rounded bg-white touch-none cursor-crosshair" />
              <p className="text-xs text-muted-foreground mt-1">Signez avec la souris ou votre doigt (mobile)</p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              <span>J'ai lu l'intégralité du contrat et je l'approuve — <strong>« Lu et approuvé — Bon pour accord »</strong></span>
            </label>
            <div>
              <Label>Mention manuscrite obligatoire *</Label>
              <Input
                value={mentionManuscrite}
                onChange={(e) => setMentionManuscrite(e.target.value)}
                placeholder={MENTION_REQUISE}
                className={mentionManuscrite && !mentionValide ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recopiez exactement : <strong>« {MENTION_REQUISE} »</strong>
                {mentionManuscrite && (mentionValide
                  ? <span className="text-green-600 ml-2">✓ Validé</span>
                  : <span className="text-destructive ml-2">✗ Texte non conforme</span>)}
              </p>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              ⚠️ <strong>Sans signature ET sans mention manuscrite recopiée à l'identique, le contrat ne sera PAS validé.</strong>
            </div>
            <Button
              onClick={handleSign}
              disabled={submitting || !accepted || !mentionValide || !representantNom.trim() || !initiales.trim() || !lieu.trim() || !hasSignatureRef.current}
              className="w-full"
              size="lg"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signature en cours...</> : "Signer et envoyer le contrat"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
