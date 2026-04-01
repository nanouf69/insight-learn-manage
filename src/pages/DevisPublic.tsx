import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

/* ─── CGV TEXT (short version for the public page) ─── */
const CGV_SECTIONS = [
  { title: "ARTICLE 1 — OBJET", text: "Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente." },
  { title: "ARTICLE 2 — DELAI DE RETRACTATION", text: "Conformement a l'article L6353-5 du Code du travail, le Client beneficie d'un delai de retractation de dix jours a compter de la conclusion du contrat de formation professionnelle. Le Client peut exercer son droit de retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT au 86 route de Genas, 69003 Lyon, ou par e-mail a contact@ftransport.fr. Aucun paiement ne sera exige du Client avant l'expiration de ce delai de retractation." },
  { title: "ARTICLE 3 — CONDITIONS FINANCIERES", text: "Tous les prix sont indiques en euros, toutes taxes comprises. Le reglement du prix de la formation est preleve apres le delai de retractation et peut etre echelonne sur le temps. Toute somme non payee a echeance entraine de plein droit l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros." },
  { title: "ARTICLE 4 — INSCRIPTION ET EFFECTIF", text: "L'effectif de chaque formation est limite. Les inscriptions sont prises en compte dans leur ordre d'arrivee. Seuls les contrats dument renseignes, dates, signes et revetus de la mention « Bon pour accord » ont valeur contractuelle." },
  { title: "ARTICLE 5 — DEDIT ET REMPLACEMENT", text: "En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription a une formation ulterieure ou d'obtenir le remboursement integral des sommes versees." },
  { title: "ARTICLE 6 — ANNULATION", text: "Tout module commence est du dans son integralite. En cas d'absence, d'interruption ou d'annulation, la facturation distinguera le prix des journees effectivement suivies et les sommes dues au titre des absences." },
  { title: "ARTICLE 7 — HORAIRES", text: "Les formations se deroulent de 09h00 a 12h00 et de 13h00 a 17h00 avec une pause en milieu de chaque demi-journee, sauf indication contraire." },
  { title: "ARTICLE 8 — PROPRIETE INTELLECTUELLE", text: "L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT constituent des oeuvres protegees par le droit d'auteur et sont la propriete exclusive de FTRANSPORT." },
  { title: "ARTICLE 9 — PROTECTION DES DONNEES", text: "Conformement au RGPD et a la loi n°78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de modification, de rectification des donnees personnelles le concernant. Contact : contact@ftransport.fr" },
  { title: "ARTICLE 10 — DROIT APPLICABLE", text: "Les presentes conditions sont regies par le droit francais. En cas de litige, les Tribunaux competents de Lyon seront seuls competents." },
];

const RIB_INFO = {
  titulaire: "SERVICES PRO FTRANSPORT",
  adresse: "86 ROUTE DE GENAS, 69003 LYON 3EME",
  swift: "QNTOFRP1XXX",
  iban: "FR76 1695 8000 0197 9789 6261 128",
  banque: "16958",
  agence: "00001",
  compte: "97978962611",
  cle: "28",
};

export default function DevisPublic() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [devis, setDevis] = useState<any>(null);
  const [apprenant, setApprenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");

  // Interactive form state
  const [datePermis, setDatePermis] = useState("");
  const [points6, setPoints6] = useState<boolean | null>(null);
  const [sansPermis, setSansPermis] = useState<boolean | null>(null);
  const [refusRestitution, setRefusRestitution] = useState<boolean | null>(null);
  const [condamnation, setCondamnation] = useState<boolean | null>(null);
  const [casierVierge, setCasierVierge] = useState<boolean | null>(null);
  const [formationDeja, setFormationDeja] = useState<boolean | null>(null);
  const [centreFormation, setCentreFormation] = useState("");
  const [mentionAccord, setMentionAccord] = useState("");
  const [acceptCGV, setAcceptCGV] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide — aucun token trouvé.");
      setLoading(false);
      return;
    }
    loadDevis();
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [loading]);

  const loadDevis = async () => {
    const { data, error: err } = await supabase
      .from("devis_envois")
      .select("*, apprenants(nom, prenom, email, formation_choisie, adresse, code_postal, ville, telephone, date_naissance, civilite)")
      .eq("token", token!)
      .single();

    if (err || !data) {
      setError("Ce lien de devis est invalide ou a expiré.");
      setLoading(false);
      return;
    }

    setDevis(data);
    setApprenant((data as any).apprenants);
    if (data.devis_signe_url) setUploaded(true);
    setLoading(false);
  };

  // Canvas drawing handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); const c = canvasRef.current; if (!c) return; setIsDrawing(true); lastPos.current = getPos(e, c); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx || !lastPos.current) return;
    const pos = getPos(e, c);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasSigned(true);
  };
  const stopDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); setIsDrawing(false); lastPos.current = null; };
  const clearSig = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    setHasSigned(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Le fichier ne doit pas dépasser 10 Mo"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("token", token!);
      formData.append("file", file);
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${baseUrl}/functions/v1/upload-devis-signe`, {
        method: "POST", headers: { apikey: apiKey }, body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      setUploaded(true);
      toast.success("Devis signé envoyé avec succès !");
    } catch (err: any) { console.error(err); toast.error(err.message || "Erreur lors de l'envoi"); }
    finally { setUploading(false); }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Contactez-nous : contact@ftransport.fr — 04.28.29.60.91</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("fr-FR");
  const nom = `${apprenant?.civilite || ""} ${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim();

  /* ═══ YES/NO checkbox helper ═══ */
  const YesNo = ({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) => (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value === true} onChange={() => onChange(true)} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm">Oui</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value === false} onChange={() => onChange(false)} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm">Non</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { page-break-after: always; }
          .devis-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .devis-container * { font-size: 11px !important; }
          .devis-container h1 { font-size: 18px !important; }
          .devis-container h2 { font-size: 14px !important; }
          .devis-container h3 { font-size: 12px !important; }
          input[type="text"], input[type="date"], textarea { border: none !important; border-bottom: 1px solid #000 !important; background: transparent !important; padding: 2px 4px !important; }
          input[type="checkbox"] { -webkit-appearance: checkbox !important; appearance: checkbox !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Top action bar */}
        <div className="no-print sticky top-0 z-50 bg-white/90 backdrop-blur border-b shadow-sm">
          <div className="max-w-[850px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-sm text-gray-800">FTRANSPORT — Devis & Inscription</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4" /> Imprimer / Enregistrer PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="devis-container max-w-[850px] mx-auto p-4 md:p-8 space-y-0">

          {/* ═══ PAGE 1 : DEVIS ET INSCRIPTION ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900 tracking-tight">FTRANSPORT</h1>
              <p className="text-xs text-gray-500 mt-1">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900">DEVIS ET INSCRIPTION</h2>

            {/* Tableau formation */}
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="border p-2 text-left w-1/4">Catégorie</th>
                  <th className="border p-2 text-left w-2/4">Description</th>
                  <th className="border p-2 text-center w-1/8">Quantité</th>
                  <th className="border p-2 text-right w-1/8">Montant HT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2 font-medium">Formation et prestations</td>
                  <td className="border p-2">{devis.formation || devis.modele}</td>
                  <td className="border p-2 text-center">1</td>
                  <td className="border p-2 text-right font-bold">{devis.montant}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-gray-500">
              Centre de formation agréé par la préfecture : n°69-18-001 — NDA : 84 69 15114 69 — SIRET : 823 461 561 000 18.
              Certifié Qualiopi. Ftransport n'est pas assujetti à la TVA. Les prix sont nets de taxe.
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Lieu :</strong> LYON (69)</div>
              <div><strong>Dates :</strong> <input type="text" className="border-b border-gray-400 px-1 w-40 text-sm" placeholder="À compléter" /></div>
            </div>

            <div className="text-sm">
              <strong>Nom et Prénom du stagiaire :</strong> {nom || <input type="text" className="border-b border-gray-400 px-1 w-60 text-sm" placeholder="À compléter" />}
            </div>

            {/* Documents justificatifs */}
            <div className="border-l-4 border-blue-600 pl-4 space-y-2 text-sm">
              <h3 className="font-bold text-gray-900">Pour réserver votre place, vous devez :</h3>
              <p>Remplir le devis (fiche actuelle), la fiche d'inscription et les conditions générales de vente en nous les renvoyant avec votre règlement ainsi que les justificatifs demandés :</p>
              <h3 className="font-bold text-gray-900 mt-3">Documents justificatifs à nous envoyer (photocopies) :</h3>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                <li>Justificatif de domicile</li>
                <li>Pièce d'identité (passeport, carte d'identité, titre de séjour ou permis de conduire)</li>
                <li>Pour les personnes hébergées : justificatif de domicile de l'hébergeur, copie de sa pièce d'identité, attestation d'hébergement signée.</li>
              </ul>
            </div>

            <div className="text-sm">
              <p><strong>Fait à LYON, le</strong> {today}</p>
              <p className="mt-2 italic text-gray-600">Signature précédée de la mention manuscrite « Lu et approuvé, bon pour acceptation du devis » (document à renvoyer)</p>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ PAGE 2 : FICHE D'INSCRIPTION ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900">FICHE D'INSCRIPTION</h2>

            <div className="space-y-1 text-sm">
              <p><strong>Intitulé formation :</strong> {devis.formation || devis.modele}</p>
              <p><strong>Dates de formation :</strong> <input type="text" className="border-b border-gray-400 px-1 w-48 text-sm" placeholder="À compléter" /></p>
            </div>

            <h3 className="font-bold text-gray-900 text-sm mt-4">Coordonnées du stagiaire :</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Prénom et Nom :</strong> {nom || "—"}</div>
              <div><strong>Adresse :</strong> {apprenant?.adresse || <input type="text" className="border-b border-gray-400 px-1 w-48" placeholder="À compléter" />}</div>
              <div><strong>Code postal :</strong> {apprenant?.code_postal || <input type="text" className="border-b border-gray-400 px-1 w-24" placeholder="..." />}</div>
              <div><strong>Ville :</strong> {apprenant?.ville || <input type="text" className="border-b border-gray-400 px-1 w-32" placeholder="..." />}</div>
              <div><strong>N° téléphone :</strong> {apprenant?.telephone || <input type="text" className="border-b border-gray-400 px-1 w-40" placeholder="..." />}</div>
              <div><strong>E-mail :</strong> {apprenant?.email || <input type="text" className="border-b border-gray-400 px-1 w-52" placeholder="..." />}</div>
            </div>

            <h3 className="font-bold text-gray-900 text-sm mt-4">Informations vous concernant :</h3>

            <div className="space-y-1 text-sm">
              <label className="block">
                <strong>Date de votre permis de conduire (jj/mm/aaaa) :</strong>
                <span className="text-xs text-gray-500 ml-1">(Attention il doit avoir plus de 3 ans ou 2 ans si conduite accompagnée)</span>
              </label>
              <input type="text" value={datePermis} onChange={(e) => setDatePermis(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 w-48 text-sm" placeholder="jj/mm/aaaa" />
            </div>

            <div className="space-y-5 mt-4">
              <YesNo label="Avez-vous déjà perdu 6 points d'un coup sur votre permis de conduire ?" value={points6} onChange={setPoints6} />
              <YesNo label="Avez-vous déjà été condamné pour conduite d'un véhicule sans permis ?" value={sansPermis} onChange={setSansPermis} />
              <YesNo label="Avez-vous été condamné pour refus de restitution du permis de conduire malgré l'annulation ou l'invalidation de votre permis de conduire ou l'interdiction de l'obtenir ?" value={refusRestitution} onChange={setRefusRestitution} />
              <YesNo label="Avez-vous déjà été condamné d'au moins 6 mois d'emprisonnement pour vol, escroquerie, abus de confiance, atteinte volontaire à l'intégrité de la personne, agression sexuelle ou infraction à la législation sur les stupéfiants ?" value={condamnation} onChange={setCondamnation} />
              <YesNo label="Avez-vous le casier judiciaire B2 vierge ?" value={casierVierge} onChange={setCasierVierge} />
              <YesNo label="Formation pratique déjà réalisée ?" value={formationDeja} onChange={setFormationDeja} />
            </div>

            {formationDeja === true && (
              <div className="text-sm">
                <label className="block font-medium">Si oui, chez quel centre de formation ?</label>
                <input type="text" value={centreFormation} onChange={(e) => setCentreFormation(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 w-full text-sm mt-1" placeholder="Nom du centre de formation..." />
              </div>
            )}

            <p className="text-sm mt-4"><strong>Fait à Lyon, le</strong> {today}</p>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ PAGE 3 : CGV ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-5 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-lg font-bold text-center text-gray-900">CONDITIONS GÉNÉRALES DE VENTE</h2>

            <p className="text-xs text-gray-600">
              FTRANSPORT est un organisme de formation professionnelle spécialisé dans le secteur du transport.
              Siège social : 86 route de Genas, 69003 Lyon — SIRET : 82346156100018 — N° déclaration : 84 69 15114 69 — Non assujetti à la TVA.
            </p>

            <div className="space-y-4">
              {CGV_SECTIONS.map((s, i) => (
                <div key={i}>
                  <h3 className="font-bold text-xs text-blue-900">{s.title}</h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON
            </div>
          </div>

          {/* ═══ PAGE 4 : SIGNATURE + RIB ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            {/* Renonciation rétractation */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-gray-700 leading-relaxed">
              Je reconnais que la date de début de la formation pratique intervient avant l'expiration du délai légal de rétractation de 14 jours.
              En acceptant ce devis, je demande expressément le démarrage immédiat de la prestation et renonce en conséquence à mon droit de rétractation,
              conformément à l'article L221-25 du Code de la consommation.
            </div>

            {/* Accept CGV */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptCGV} onChange={(e) => setAcceptCGV(e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600" />
              <span className="text-sm text-gray-800">
                J'accepte les Conditions Générales de Vente de FTRANSPORT et je reconnais avoir pris connaissance de l'ensemble du document.
              </span>
            </label>

            {/* Mention manuscrite */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900">
                Écrivez la mention : « Lu et approuvé, Bon pour accord »
              </label>
              <input
                type="text"
                value={mentionAccord}
                onChange={(e) => setMentionAccord(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                placeholder="Lu et approuvé, Bon pour accord"
              />
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-900">Votre signature :</label>
                <button onClick={clearSig} className="text-xs text-blue-600 hover:underline no-print">Effacer</button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-400 text-sm">Signez ici avec votre souris ou votre doigt</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm"><strong>Fait à Lyon, le</strong> {today}</p>

            {/* RIB */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2 mt-6">
              <h3 className="font-bold text-sm text-gray-900">Coordonnées bancaires (RIB)</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div><strong>Titulaire :</strong> {RIB_INFO.titulaire}</div>
                <div><strong>Adresse :</strong> {RIB_INFO.adresse}</div>
                <div><strong>IBAN :</strong> {RIB_INFO.iban}</div>
                <div><strong>BIC/SWIFT :</strong> {RIB_INFO.swift}</div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ ACTIONS (no-print) ═══ */}
          <div className="no-print bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              Finaliser votre inscription
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-blue-900">📋 Comment procéder :</p>
              <ol className="list-decimal ml-5 space-y-1 text-blue-800">
                <li>Remplissez toutes les informations ci-dessus (cases à cocher, date du permis, etc.)</li>
                <li>Écrivez « Lu et approuvé, Bon pour accord » et signez</li>
                <li>Cliquez sur <strong>« Imprimer / Enregistrer PDF »</strong> pour sauvegarder ou imprimer le document</li>
                <li>Envoyez-nous le document signé ci-dessous ou par email à contact@ftransport.fr</li>
              </ol>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4" /> Imprimer / Enregistrer PDF
              </Button>
            </div>

            {/* Upload signed version */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Ou renvoyez le devis signé directement :</h3>
              {uploaded ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Devis signé reçu !</p>
                  <p className="text-sm text-green-600 mt-1">Merci, nous avons bien reçu votre devis signé.</p>
                </div>
              ) : (
                <div>
                  <input type="file" id="devis-file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2 h-20"
                    onClick={() => document.getElementById("devis-file")?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Cliquez pour envoyer le devis signé (PDF, JPG, PNG — Max 10 Mo)</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              📧 contact@ftransport.fr — 📞 04.28.29.60.91
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
