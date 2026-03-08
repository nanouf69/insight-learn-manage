import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { toast } from "sonner";

interface Props {
  apprenantNom?: string;
  apprenantPrenom?: string;
  apprenantEmail?: string;
  apprenantTelephone?: string;
  apprenantAdresse?: string;
  apprenantCodePostal?: string;
  apprenantVille?: string;
  apprenantType?: string;
  apprenantId?: string;
  onComplete: () => void;
  completed?: boolean;
}

interface EligibilityAnswer {
  [key: string]: boolean | null;
}

export default function AnalyseBesoinForm({
  apprenantNom = "",
  apprenantPrenom = "",
  apprenantEmail = "",
  apprenantTelephone = "",
  apprenantAdresse = "",
  apprenantCodePostal = "",
  apprenantVille = "",
  apprenantId = "",
  onComplete,
  completed,
  apprenantType = "",
}: Props) {
  const [nom, setNom] = useState(apprenantNom);
  const [prenom, setPrenom] = useState(apprenantPrenom);
  const [email, setEmail] = useState(apprenantEmail);
  const [telephone, setTelephone] = useState(apprenantTelephone);
  const [adresse, setAdresse] = useState(apprenantAdresse);
  const [codePostal, setCodePostal] = useState(apprenantCodePostal);
  const [ville, setVille] = useState(apprenantVille);

  const initVTC = apprenantType.toUpperCase().includes("VTC") || apprenantType.toUpperCase() === "VA";
  const initTAXI = apprenantType.toUpperCase().includes("TAXI") || apprenantType.toUpperCase() === "TA";
  const [formationVTC, setFormationVTC] = useState(initVTC);
  const [formationTAXI, setFormationTAXI] = useState(initTAXI);

  const eligibilityQuestions = [
    "Avez-vous déjà perdu 6 points d'un coup sur votre permis de conduire ?",
    "Avez-vous déjà été condamné pour conduite d'un véhicule sans permis ?",
    "Avez-vous été condamné pour refus de restitution du permis malgré son annulation, invalidation ou interdiction de l'obtenir ?",
    "Avez-vous déjà été condamné à au moins 6 mois d'emprisonnement pour vol, escroquerie, abus de confiance, atteinte volontaire à l'intégrité de la personne, agression sexuelle ou infraction à la législation sur les stupéfiants (en France ou à l'étranger) ?",
    "Avez-vous le casier judiciaire B3 vierge ?",
  ];

  const complementaryQuestions = [
    "Avez-vous déjà réalisé une formation TAXI (en initiale ou en continue) ?",
    "Êtes-vous en situation de handicap ?",
  ];

  const [eligibility, setEligibility] = useState<EligibilityAnswer>({});
  const [complementary, setComplementary] = useState<EligibilityAnswer>({});
  const [centreFormation, setCentreFormation] = useState("");
  const [typeHandicap, setTypeHandicap] = useState("");
  const [engagementAccepted, setEngagementAccepted] = useState(false);

  // Validation
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Refs for scrolling
  const eligRefs = eligibilityQuestions.map(() => useRef<HTMLDivElement>(null!));
  const compRefs = complementaryQuestions.map(() => useRef<HTMLDivElement>(null!));
  const formationRef = useRef<HTMLDivElement>(null!);
  const engagementRef = useRef<HTMLDivElement>(null!);

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasSigned(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const hasFormation = formationVTC || formationTAXI;

  const handleSubmit = async () => {
    const missing: string[] = [];
    let firstRef: React.RefObject<HTMLDivElement> | null = null;

    if (!hasFormation) {
      missing.push("formation");
      if (!firstRef) firstRef = formationRef;
    }
    eligibilityQuestions.forEach((_, i) => {
      const key = `e${i}`;
      if (eligibility[key] === undefined || eligibility[key] === null) {
        missing.push(key);
        if (!firstRef) firstRef = eligRefs[i];
      }
    });
    complementaryQuestions.forEach((_, i) => {
      const key = `c${i}`;
      if (complementary[key] === undefined || complementary[key] === null) {
        missing.push(key);
        if (!firstRef) firstRef = compRefs[i];
      }
    });
    if (!engagementAccepted) {
      missing.push("engagement");
      if (!firstRef) firstRef = engagementRef;
    }
    if (!hasSigned) {
      missing.push("signature");
    }

    if (missing.length > 0) {
      setInvalidFields(new Set(missing));
      toast.error("Veuillez répondre à toutes les questions obligatoires");
      if (firstRef?.current) {
        firstRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setInvalidFields(new Set());

    if (apprenantId) {
      const signatureData = canvasRef.current?.toDataURL("image/png") || "";
      const saved = await saveFormDocument({
        apprenantId,
        typeDocument: "analyse-besoin",
        titre: "Analyse du besoin – Fiche client",
        donnees: {
          nom, prenom, email, telephone, adresse, codePostal, ville,
          formationVTC, formationTAXI,
          eligibility, complementary, centreFormation, typeHandicap,
          engagementAccepted, signature: signatureData,
        },
      });
      if (saved) toast.success("Analyse du besoin enregistrée !");
    }
    onComplete();
  };

  if (completed) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-5 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <p className="font-semibold text-green-800">Analyse du besoin complétée et signée ✓</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-5 text-center space-y-1">
          <h3 className="font-bold text-lg">ANALYSE DU BESOIN – FICHE CLIENT</h3>
          <p className="text-xs text-muted-foreground">NDA : 84 69 1511469 | SIRET : 82346156100018 | Qualiopi ✓</p>
        </CardContent>
      </Card>

      {/* 1. Coordonnées */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold text-sm text-primary border-b pb-2">1. COORDONNÉES DU STAGIAIRE</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nom</label>
              <Input value={nom} onChange={e => setNom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prénom</label>
              <Input value={prenom} onChange={e => setPrenom(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Adresse</label>
              <Input value={adresse} onChange={e => setAdresse(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Code postal</label>
              <Input value={codePostal} onChange={e => setCodePostal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ville</label>
              <Input value={ville} onChange={e => setVille(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">N° téléphone</label>
              <Input value={telephone} onChange={e => setTelephone(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Informations Formation */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold text-sm text-primary border-b pb-2">2. INFORMATIONS FORMATION</h4>
          <div className="space-y-2" ref={formationRef}>
            <p className={`text-sm font-medium ${invalidFields.has("formation") ? "text-destructive" : ""}`}>
              Formation souhaitée : <span className="text-destructive">*</span>
            </p>
            <div className={`flex flex-wrap gap-4 rounded-lg p-1 ${invalidFields.has("formation") ? "ring-2 ring-destructive/60 bg-destructive/5" : ""}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formationVTC} onCheckedChange={(c) => { setFormationVTC(!!c); setInvalidFields(prev => { const n = new Set(prev); n.delete("formation"); return n; }); }} />
                <span className="text-sm">Habilitation VTC (RS5637)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formationTAXI} onCheckedChange={(c) => { setFormationTAXI(!!c); setInvalidFields(prev => { const n = new Set(prev); n.delete("formation"); return n; }); }} />
                <span className="text-sm">Habilitation TAXI (RS5635)</span>
              </label>
            </div>
            {!hasFormation && !invalidFields.has("formation") && <p className="text-xs text-destructive">⚠️ Veuillez cocher au moins une formation.</p>}
          </div>
        </CardContent>
      </Card>

      {/* 3. Critères d'éligibilité */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold text-sm text-primary border-b pb-2">3. CRITÈRES D'ÉLIGIBILITÉ ET DE MORALITÉ</h4>
          <div className="space-y-3">
            {eligibilityQuestions.map((q, i) => {
              const key = `e${i}`;
              const val = eligibility[key];
              const isInvalid = invalidFields.has(key);
              return (
                <div key={i} ref={eligRefs[i]} className={`flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0 rounded-lg px-2 ${isInvalid ? "ring-2 ring-destructive/60 bg-destructive/5" : ""}`}>
                  <p className={`flex-1 text-sm leading-relaxed font-medium ${isInvalid ? "text-destructive" : ""}`}>{q} <span className="text-destructive">*</span></p>
                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={val === true} onCheckedChange={() => { setEligibility(prev => ({ ...prev, [key]: prev[key] === true ? null : true })); setInvalidFields(prev => { const n = new Set(prev); n.delete(key); return n; }); }} />
                      <span className="text-xs font-medium">Oui</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={val === false} onCheckedChange={() => { setEligibility(prev => ({ ...prev, [key]: prev[key] === false ? null : false })); setInvalidFields(prev => { const n = new Set(prev); n.delete(key); return n; }); }} />
                      <span className="text-xs font-medium">Non</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Informations complémentaires */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold text-sm text-primary border-b pb-2">4. INFORMATIONS COMPLÉMENTAIRES</h4>
          <div className="space-y-3">
            {complementaryQuestions.map((q, i) => {
              const key = `c${i}`;
              const val = complementary[key];
              const isInvalid = invalidFields.has(key);
              return (
                <div key={i} className="space-y-2">
                  <div ref={compRefs[i]} className={`flex items-start gap-3 py-2 border-b border-border/50 rounded-lg px-2 ${isInvalid ? "ring-2 ring-destructive/60 bg-destructive/5" : ""}`}>
                    <p className={`flex-1 text-sm leading-relaxed font-medium ${isInvalid ? "text-destructive" : ""}`}>{q} <span className="text-destructive">*</span></p>
                    <div className="flex items-center gap-3 shrink-0 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={val === true} onCheckedChange={() => { setComplementary(prev => ({ ...prev, [key]: prev[key] === true ? null : true })); setInvalidFields(prev => { const n = new Set(prev); n.delete(key); return n; }); }} />
                        <span className="text-xs font-medium">Oui</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={val === false} onCheckedChange={() => { setComplementary(prev => ({ ...prev, [key]: prev[key] === false ? null : false })); setInvalidFields(prev => { const n = new Set(prev); n.delete(key); return n; }); }} />
                        <span className="text-xs font-medium">Non</span>
                      </label>
                    </div>
                  </div>
                  {i === 0 && complementary[key] === true && (
                    <div className="ml-4">
                      <label className="text-xs text-muted-foreground">Centre de formation :</label>
                      <Input value={centreFormation} onChange={e => setCentreFormation(e.target.value)} placeholder="Nom du centre..." className="mt-1" />
                    </div>
                  )}
                  {i === 1 && complementary[key] === true && (
                    <div className="ml-4">
                      <label className="text-xs text-muted-foreground">Type de handicap :</label>
                      <Textarea value={typeHandicap} onChange={e => setTypeHandicap(e.target.value)} placeholder="Précisez..." className="mt-1" rows={2} />
                      <p className="text-xs text-muted-foreground mt-1">ℹ Le centre est équipé d'un local ERP accessible aux personnes en fauteuil roulant.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Engagement */}
      <Card className={`border-amber-300 bg-amber-50/50 ${invalidFields.has("engagement") ? "ring-2 ring-destructive/60" : ""}`}>
        <CardContent className="p-4 space-y-3" ref={engagementRef}>
          <h4 className="font-bold text-sm text-amber-800 border-b border-amber-200 pb-2">ENGAGEMENT DU STAGIAIRE <span className="text-destructive">*</span></h4>
          <div className="text-sm leading-relaxed space-y-2 text-amber-900">
            <p>
              Je soussigné(e) <strong>{prenom} {nom}</strong>, reconnais avoir été informé(e) par FTRANSPORT de mon obligation de m'inscrire à l'examen de certification et de m'y présenter.
            </p>
            <p>
              Je m'engage à participer à la certification <strong>RS5637 (VTC) / RS5635 (TAXI)</strong> dans les délais convenus avec mon organisme de formation.
            </p>
            <p className="font-semibold">
              En cas de non-présentation sans motif valable, je reconnais encourir une suspension de l'utilisation de mon Compte Personnel de Formation pour une période pouvant aller d'une semaine à un an.
            </p>
            <p className="text-xs italic">
              Réf. : CG – CP titulaire, Article 7 | CGU Mon Compte Formation, Article 7.4
            </p>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <Checkbox checked={engagementAccepted} onCheckedChange={(c) => { setEngagementAccepted(!!c); if (c) setInvalidFields(prev => { const n = new Set(prev); n.delete("engagement"); return n; }); }} />
            <label className={`text-sm cursor-pointer select-none font-medium ${invalidFields.has("engagement") ? "text-destructive" : ""}`} onClick={() => { setEngagementAccepted(!engagementAccepted); if (!engagementAccepted) setInvalidFields(prev => { const n = new Set(prev); n.delete("engagement"); return n; }); }}>
              Lu et approuvé
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card className={invalidFields.has("signature") ? "ring-2 ring-destructive/60" : ""}>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold text-sm text-primary border-b pb-2">SIGNATURE <span className="text-destructive">*</span></h4>
          <p className="text-xs text-muted-foreground">Fait à Lyon, le {new Date().toLocaleDateString("fr-FR")}</p>
          <p className="text-sm font-medium">Signature du stagiaire (précédée de la mention « Lu et approuvé ») :</p>
          <div className="border-2 border-dashed border-border rounded-lg p-1 bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full max-w-[400px] h-[150px] cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSignature}>Effacer la signature</Button>
            {hasSigned && <Badge variant="default" className="bg-green-600">Signé ✓</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <Button className="w-full" onClick={handleSubmit}>
            ✅ Valider l'analyse du besoin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
