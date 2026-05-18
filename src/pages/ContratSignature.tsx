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
            <p className="font-bold text-center text-base">CONTRAT DE FRANCHISE</p>
            <p className="text-center">FINALLY ACADEMY LTD / FTRANSPORT SERVICES PRO</p>
            <p className="italic text-center text-muted-foreground text-xs">Version protégée — applicable depuis le début du partenariat</p>

            <p className="font-bold mt-4">ARTICLE PRÉLIMINAIRE — ANNULATION DU CONTRAT PRÉCÉDENT</p>
            <p className="bg-muted/60 border rounded p-2 font-semibold">CLAUSE D'ANNULATION : Le présent contrat annule et remplace intégralement tout accord, contrat de franchise ou document contractuel antérieur conclu entre FTRANSPORT SERVICES PRO et la société RSTARTR (SIRET 913 343 489), ainsi que toute entité liée à RSTARTR (notamment SASU THE BUILDERY). Aucune clause, obligation ou condition financière issue de ces accords ne subsiste à compter de la signature des présentes.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>L'ancien contrat RSTARTR est réputé nul et sans effet.</li>
              <li>Aucune somme calculée sur la base des conditions de l'ancien contrat n'est due.</li>
              <li>Le présent contrat constitue le seul accord régissant les relations entre les parties.</li>
            </ul>

            <p className="font-bold mt-3">ENTRE LES SOUSSIGNÉS</p>
            <p><strong>Le Franchiseur :</strong></p>
            <p>FINALLY ACADEMY LTD — Société de droit britannique<br/>124-128 City Road, London EC1V 2NX, United Kingdom<br/>Company registration number : 16512432<br/>Non assujettie à la TVA (below UK VAT threshold)<br/>Représentée par : {representantNom || "______________"}<br/><em>Ci-après désignée « le Franchiseur »</em></p>
            <p><strong>Le Franchisé :</strong></p>
            <p>FTRANSPORT SERVICES PRO — SASU au capital de 5 000 €<br/>SIRET : 823 461 561 000 18 — NDA : 84 69 15114 69<br/>86 route de Genas, 69003 Lyon<br/>Certifiée Qualiopi — Référencée MonCompteFormation (EDOF)<br/>Représentée par M. Guenichi Naoufal, en qualité de Gérant<br/><em>Ci-après désignée « le Franchisé »</em></p>

            <p className="font-bold mt-3">PRÉAMBULE</p>
            <p>FINALLY ACADEMY LTD propose un concept de franchise dans la formation professionnelle. Le Franchisé, titulaire d'un référencement actif sur MonCompteFormation et certifié Qualiopi, souhaite bénéficier de l'accompagnement du Franchiseur. Le présent contrat est conclu en remplacement intégral de tout accord antérieur (notamment RSTARTR) et définit les nouvelles conditions financières et opérationnelles applicables depuis le début du partenariat.</p>
            <p>Le Franchisé demeure l'unique responsable vis-à-vis de la CDC et de tout organisme de contrôle français. Le Franchiseur, société de droit britannique, ne peut être tenu responsable des obligations réglementaires françaises incombant au Franchisé.</p>

            <p className="font-bold mt-3">ARTICLE 1 — OBJET DU CONTRAT</p>
            <p>Le Franchiseur concède au Franchisé le droit d'utiliser le concept, savoir-faire et outils FINALLY ACADEMY LTD :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mise à disposition d'outils pédagogiques et administratifs</li>
              <li>Apport de prospects / leads qualifiés (conditions Article 5)</li>
              <li>Assistance commerciale et administrative</li>
              <li>Accès à la plateforme e-learning FINALLY ACADEMY</li>
            </ul>
            <p>Le Franchisé conserve son indépendance totale dans la gestion de son activité, de son référencement MCF et de sa certification Qualiopi.</p>

            <p className="font-bold mt-3">ARTICLE 2 — CONDITIONS FINANCIÈRES</p>
            <p><strong>2.1 — Répartition des encaissements</strong></p>
            <p className="bg-muted/60 border rounded p-2 font-semibold">Sur chaque encaissement perçu par FTRANSPORT SERVICES PRO au titre des formations : 50% sont reversés au Franchiseur (FINALLY ACADEMY LTD) et 50% restent acquis au Franchisé. Ces conditions remplacent toute condition antérieure (notamment les 90% prévus dans l'ancien contrat RSTARTR).</p>
            <p>Répartition indicative des 50% Franchiseur :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Redevance de franchise (marque, savoir-faire) : 15%</li>
              <li>Redevance d'assistance et accompagnement : 10%</li>
              <li>Redevance plateforme et outils : 10%</li>
              <li>Redevance apport de clients / leads : 15%</li>
            </ul>
            <p><strong>2.2 — Modalités de paiement</strong></p>
            <p>Paiement par virement bancaire dans un délai de 30 jours à compter de l'encaissement effectif des fonds par le Franchisé. Aucun paiement anticipé exigible. Virements en euros, frais à charge du Franchiseur.</p>
            <p><strong>2.3 — Application rétroactive</strong></p>
            <p>Les conditions 50/50 s'appliquent à toutes les factures émises et encaissements perçus à compter du 1er mai 2025. Les factures antérieures restent soumises à l'ancien régime (10% Franchisé / 90% Franchiseur). Les Articles 3, 4 et 5 s'appliquent depuis le début du partenariat. Toute somme perçue au-delà de 50% à compter du 1er mai 2025 constitue un trop-perçu restituable.</p>

            <p className="font-bold mt-3">ARTICLE 3 — RESPONSABILITÉ</p>
            <p className="bg-muted/60 border rounded p-2 font-semibold">LE FRANCHISÉ N'EST PAS RESPONSABLE DES AGISSEMENTS DU FRANCHISEUR. Toute fraude, pratique déloyale ou manquement commis par FINALLY ACADEMY LTD engage sa seule responsabilité.</p>
            <p><strong>3.1 — Indemnisation obligatoire</strong></p>
            <p>Si FTRANSPORT subit une sanction CDC/DGCCRF/DREETS du fait du Franchiseur, ce dernier indemnise intégralement le Franchisé :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Remboursement des sommes restituées à la CDC</li>
              <li>Pénalités et amendes infligées</li>
              <li>Perte de CA liée à un déréférencement MCF / suspension Qualiopi</li>
              <li>Frais d'avocat, procédure, expertise</li>
              <li>Préjudice d'image et commercial</li>
            </ul>
            <p><strong>3.2 — Garantie de conformité des leads</strong></p>
            <p>Le Franchiseur garantit que tous les leads sont obtenus conformément à la réglementation française (Art. L.6323-8-1 Code du travail, RGPD, interdiction d'avantages indus). En cas de non-conformité, il assume seul la responsabilité civile et pénale.</p>

            <p className="font-bold mt-3">ARTICLE 4 — OBLIGATIONS ET INTERDICTIONS DU FRANCHISEUR</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tout démarchage sans mandat écrit préalable</li>
              <li>Toute utilisation du référencement MCF / Qualiopi de FTRANSPORT à des fins non prévues</li>
              <li>Toute sous-traitance sans accord écrit</li>
              <li>Toute communication aux apprenants non validée</li>
              <li>Tout acte engageant la responsabilité du Franchisé vis-à-vis de la CDC ou DGCCRF</li>
              <li>Toute cession du contrat sans accord écrit</li>
            </ul>

            <p className="font-bold mt-3">ARTICLE 5 — SUSPENSION ET BLOCAGE DES PAIEMENTS</p>
            <p>Le Franchisé peut suspendre immédiatement tout paiement sans mise en demeure préalable en cas de :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manquement aux interdictions de l'Article 4</li>
              <li>Notification CDC/DGCCRF en lien avec le Franchiseur</li>
              <li>Non-conformité avérée ou présumée des leads</li>
              <li>Ouverture d'un contrôle MCF / Qualiopi</li>
              <li>Litige en cours relatif à l'exécution du contrat</li>
            </ul>

            <p className="font-bold mt-3">ARTICLE 6 — RÉSILIATION</p>
            <p><strong>6.1 — Faute grave (sans préavis)</strong></p>
            <p>Résiliation immédiate sans préavis ni indemnité par email ou LRAR en cas de violation Article 4, non-conformité leads, fausse déclaration ou manquement grave.</p>
            <p><strong>6.2 — Sans faute</strong></p>
            <p>Chaque partie peut résilier à tout moment par LRAR avec préavis de 15 jours calendaires, sans indemnité.</p>
            <p><strong>6.3 — Effets de la résiliation</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Le Franchisé cesse d'utiliser la marque et outils FINALLY ACADEMY</li>
              <li>Le Franchiseur restitue sous 30 jours toute somme perçue en trop</li>
              <li>Les formations en cours sont menées à terme</li>
              <li>Les sommes dues au titre de l'Article 3 restent exigibles</li>
            </ul>

            <p className="font-bold mt-3">ARTICLE 7 — CONFIDENTIALITÉ ET PROPRIÉTÉ INTELLECTUELLE</p>
            <p>Le Franchiseur s'engage à la plus stricte confidentialité (apprenants, processus, données financières) pendant le contrat et 5 ans après. Les données apprenants sont propriété exclusive du Franchisé. Tout support pédagogique produit dans le cadre du contrat appartient à FTRANSPORT SERVICES PRO.</p>

            <p className="font-bold mt-3">ARTICLE 8 — DROIT APPLICABLE ET JURIDICTION</p>
            <p>Contrat régi exclusivement par le droit français. Recherche d'une solution amiable sous 30 jours, à défaut compétence exclusive du Tribunal de Commerce de Lyon. Langue : français.</p>

            <p className="font-bold mt-3">ARTICLE 9 — DURÉE ET ENTRÉE EN VIGUEUR</p>
            <p>Entrée en vigueur à la signature, durée indéterminée sous réserve de l'Article 6. Conditions financières 50/50 applicables à compter du 1er mai 2025. Articles 3, 4 et 5 applicables depuis le début du partenariat.</p>
            <p>Exception : la facture n° 1546A du 11 mai 2026 (15 461,40 €) reste soumise à l'ancien régime 10% Franchisé / 90% Franchiseur.</p>
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
