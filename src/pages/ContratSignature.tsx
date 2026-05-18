import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, FileText, Eraser } from "lucide-react";
import { generateContratFranchisePdf } from "@/lib/pdf/contrat-franchise";

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
        setRepresentantNom(json.contrat.representant_nom || json.contrat.destinataire_nom || "");
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
    if (!representantNom.trim()) { toast({ title: "Nom du représentant requis", variant: "destructive" }); return; }
    if (!initiales.trim()) { toast({ title: "Initiales requises", variant: "destructive" }); return; }
    if (!hasSignatureRef.current) { toast({ title: "Signature requise", variant: "destructive" }); return; }
    if (!accepted) { toast({ title: "Vous devez cocher 'Lu et approuvé'", variant: "destructive" }); return; }
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

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{contrat.titre}</h1>
          <p className="text-muted-foreground mt-2">Veuillez compléter et signer le contrat ci-dessous</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Aperçu du contrat</CardTitle></CardHeader>
          <CardContent className="prose prose-sm max-w-none text-sm leading-relaxed max-h-96 overflow-y-auto space-y-3 bg-card border rounded p-4">
            <p><strong>CONTRAT DE FRANCHISE — FINALLY ACADEMY LTD / FTRANSPORT SERVICES PRO</strong></p>
            <p><strong>Article préliminaire :</strong> Le présent contrat annule et remplace intégralement tout accord antérieur conclu avec RSTARTR (SIRET 913 343 489) ou toute entité liée (notamment SASU THE BUILDERY).</p>
            <p><strong>Article 1 — Objet :</strong> Concession du droit d'utiliser le concept, savoir-faire et outils FINALLY ACADEMY (outils pédagogiques, leads qualifiés, assistance, plateforme e-learning).</p>
            <p><strong>Article 2 — Conditions financières :</strong> Sur chaque encaissement : <strong>50%</strong> reversés au Franchiseur, <strong>50%</strong> au Franchisé. Paiement par virement sous 30 jours après encaissement effectif. Application rétroactive au 1er mai 2025.</p>
            <p><strong>Article 3 — Responsabilité :</strong> Le Franchisé n'est pas responsable des agissements du Franchiseur. Indemnisation intégrale en cas de sanction CDC/DGCCRF/DREETS imputable au Franchiseur. Garantie de conformité des leads (RGPD, Art. L.6323-8-1).</p>
            <p><strong>Article 4 — Interdictions du Franchiseur :</strong> Pas de démarchage sans mandat, pas d'utilisation détournée du référencement MCF/Qualiopi, pas de sous-traitance sans accord.</p>
            <p><strong>Article 5 — Suspension :</strong> Suspension immédiate des paiements possible en cas de manquement ou contrôle CDC/Qualiopi.</p>
            <p><strong>Article 6 — Résiliation :</strong> Immédiate pour faute grave, ou avec préavis de 15 jours sans faute.</p>
            <p><strong>Article 7 — Confidentialité :</strong> Données apprenants propriété exclusive du Franchisé. Confidentialité 5 ans après cessation.</p>
            <p><strong>Article 8 — Droit applicable :</strong> Droit français, Tribunal de Commerce de Lyon.</p>
            <p><strong>Article 9 — Durée :</strong> Indéterminée. Conditions 50/50 applicables au 1er mai 2025. Exception : facture n° 1546A du 11/05/2026 reste à 10/90.</p>
            <p className="italic text-muted-foreground">Le PDF complet signé vous sera envoyé après validation.</p>
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
              <Label>Lieu de signature</Label>
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
            <Button onClick={handleSign} disabled={submitting} className="w-full" size="lg">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signature en cours...</> : "Signer et envoyer le contrat"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
