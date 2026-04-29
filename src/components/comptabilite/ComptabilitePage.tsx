import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { JustificatifsTab } from "./JustificatifsTab";
import { NotesFraisTab } from "./NotesFraisTab";
import { RapprochementBancaire } from "./RapprochementBancaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Euro, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Download, Filter, Receipt, CreditCard, Banknote, BarChart3,
  Building2, RefreshCw, Link2, ExternalLink, ArrowDownLeft, ArrowUpRight,
  CalendarIcon, CheckCheck, FileText, Upload, Trash2, Eye, FolderOpen,
  Pencil, Check, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Releve {
  id: string;
  nom_fichier: string;
  url: string;
  mois_annee: string;
  banque: string;
  notes: string | null;
  created_at: string;
}

interface Facture {
  id: string;
  numero: string;
  client_nom: string;
  type_financement: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  statut: string | null;
  date_emission: string;
  date_echeance: string | null;
  date_paiement: string | null;
  client_opco: string | null;
  _draftRaw?: any;
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  iban: string;
  currency: string;
}

interface BankTransaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  creditor: string;
  debtor: string;
}

interface Paiement {
  id: string;
  facture_id: string;
  montant: number;
  date_paiement: string;
  moyen_paiement: string;
  notes: string | null;
  created_at: string;
}

// Unified "à payer" item
interface APayer {
  id: string;
  type: "apprenant" | "fournisseur";
  nom: string;
  description: string;
  montant: number;
  date_emission: string;
  statut: string;
  date_paiement: string | null;
  moyen_paiement: string | null;
  source_id: string;
  url: string | null;
}

const statutConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-slate-200 text-slate-700" },
  payee: { label: "Payée", color: "bg-emerald-100 text-emerald-700" },
  paye: { label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  en_attente: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  en_retard: { label: "En retard", color: "bg-destructive/10 text-destructive" },
  annulee: { label: "Annulée", color: "bg-muted text-muted-foreground" },
};

const financementLabels: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  opco: "OPCO",
  france_travail: "France Travail",
  cpf: "CPF",
  fournisseur: "Fournisseur",
};

const moyensPaiement = ["Virement", "Chèque", "Espèces", "Carte bancaire", "Prélèvement"];

const GC_REQUISITION_KEY = "ftransport_gc_requisition";

export function ComptabilitePage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [fournisseurFactures, setFournisseurFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterFinancement, setFilterFinancement] = useState<string>("all");
  const [filterTypeFlux, setFilterTypeFlux] = useState<"all" | "ventes" | "achats">("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [draftPreview, setDraftPreview] = useState<Facture | null>(null);
  const [validatingDraft, setValidatingDraft] = useState(false);

  // À payer state
  const [payerFilter, setPayerFilter] = useState<"tous" | "en_attente" | "paye">("tous");
  const [payerSearch, setPayerSearch] = useState("");
  // Per-row payment form state
  const [paymentDates, setPaymentDates] = useState<Record<string, Date | undefined>>({});
  const [paymentMoyens, setPaymentMoyens] = useState<Record<string, string>>({});
  const [savingPayment, setSavingPayment] = useState<Record<string, boolean>>({});
  // Partial payments state
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [expandedFacture, setExpandedFacture] = useState<string | null>(null);
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});

  // GoCardless state
  const [gcRequisitionId, setGcRequisitionId] = useState<string | null>(null);
  const [gcAccounts, setGcAccounts] = useState<BankAccount[]>([]);
  const [gcSelectedAccountId, setGcSelectedAccountId] = useState<string | null>(null);
  const [gcTransactions, setGcTransactions] = useState<BankTransaction[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  // Relevés de comptes state
  const [releves, setReleves] = useState<Releve[]>([]);
  const [relevesLoading, setRelevesLoading] = useState(false);
  const [uploadingReleve, setUploadingReleve] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [releveForm, setReleveForm] = useState({ mois_annee: format(new Date(), "yyyy-MM"), banque: "Revolut Bank UAB", notes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFournisseurFactures = async () => {
    const { data, error } = await supabase
      .from("fournisseur_factures")
      .select("*, fournisseurs!inner(nom)")
      .order("created_at", { ascending: false });
    if (!error && data) setFournisseurFactures(data);
  };

  const fetchPaiements = async () => {
    const { data, error } = await supabase
      .from("fournisseur_paiements")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (!error && data) setPaiements(data as Paiement[]);
  };

  const getPaiementsForFacture = (factureId: string) => {
    return paiements.filter(p => p.facture_id === factureId);
  };

  const getTotalPayeForFacture = (factureId: string) => {
    return getPaiementsForFacture(factureId).reduce((s, p) => s + Number(p.montant), 0);
  };

  const handleAjouterPaiement = async (item: APayer) => {
    const date = paymentDates[item.id];
    const moyen = paymentMoyens[item.id];
    const montantStr = partialAmounts[item.id];
    const montant = parseFloat(montantStr);
    if (!date) { toast.error("Sélectionnez une date de paiement"); return; }
    if (!moyen) { toast.error("Sélectionnez un moyen de paiement"); return; }
    if (!montant || montant <= 0) { toast.error("Saisissez un montant valide"); return; }
    const reste = item.montant - getTotalPayeForFacture(item.source_id);
    if (montant > reste + 0.01) { toast.error(`Le montant dépasse le reste à payer (${formatMontant(reste)})`); return; }
    
    setSavingPayment(prev => ({ ...prev, [item.id]: true }));
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const { error } = await supabase.from("fournisseur_paiements").insert({
        facture_id: item.source_id,
        montant,
        date_paiement: dateStr,
        moyen_paiement: moyen,
      });
      if (error) throw error;

      // Check if fully paid
      const newTotalPaye = getTotalPayeForFacture(item.source_id) + montant;
      if (newTotalPaye >= item.montant - 0.01) {
        await supabase.from("fournisseur_factures").update({ 
          statut: "paye", 
          date_paiement: dateStr, 
          moyen_paiement: moyen 
        }).eq("id", item.source_id);
      } else {
        // Update with partial info
        await supabase.from("fournisseur_factures").update({ 
          statut: "en_attente",
          date_paiement: dateStr, 
          moyen_paiement: moyen 
        }).eq("id", item.source_id);
      }

      toast.success(`Paiement de ${formatMontant(montant)} enregistré pour ${item.nom}`);
      setPartialAmounts(prev => ({ ...prev, [item.id]: "" }));
      setPaymentDates(prev => ({ ...prev, [item.id]: undefined }));
      setPaymentMoyens(prev => ({ ...prev, [item.id]: "" }));
      await Promise.all([fetchFournisseurFactures(), fetchPaiements()]);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
    setSavingPayment(prev => ({ ...prev, [item.id]: false }));
  };

  const handleSupprimerPaiement = async (paiementId: string, factureId: string) => {
    const { error } = await supabase.from("fournisseur_paiements").delete().eq("id", paiementId);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    // Recalculate status
    const remaining = paiements.filter(p => p.id !== paiementId && p.facture_id === factureId);
    const totalPaye = remaining.reduce((s, p) => s + Number(p.montant), 0);
    const facture = fournisseurFactures.find((f: any) => f.id === factureId);
    const montantFacture = facture ? Number(facture.montant) : 0;
    if (totalPaye >= montantFacture - 0.01 && montantFacture > 0) {
      // still fully paid
    } else {
      await supabase.from("fournisseur_factures").update({ statut: "en_attente" }).eq("id", factureId);
    }
    toast.success("Paiement supprimé");
    await Promise.all([fetchFournisseurFactures(), fetchPaiements()]);
  };

  const loadDrafts = (): Facture[] => {
    try {
      const drafts: Facture[] = [];
      // Brouillon courant (clé legacy)
      const raw = localStorage.getItem("facture_draft_v1");
      if (raw) {
        const d = JSON.parse(raw);
        const lignes: any[] = Array.isArray(d.lignes) ? d.lignes : [];
        const montantHT = lignes.reduce((s, l) => s + (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 1) * (1 - (Number(l.remise) || 0) / 100), 0);
        const montantTVA = lignes.reduce((s, l) => {
          const ht = (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 1) * (1 - (Number(l.remise) || 0) / 100);
          const taux = l.tvaType === "EXO" ? 0 : (Number(l.tvaTaux) || 20);
          return s + ht * (taux / 100);
        }, 0);
        drafts.push({
          id: `draft-${d.numeroInterne || "current"}`,
          numero: d.numeroInterne || d.numero || "BROUILLON",
          client_nom: d.refDossier || "(client non défini)",
          type_financement: d.typeFinanceur === "particulier" ? "particulier" : "professionnel",
          montant_ht: montantHT,
          montant_tva: montantTVA,
          montant_ttc: montantHT + montantTVA,
          statut: "brouillon",
          date_emission: d.date || new Date().toISOString().split("T")[0],
          date_echeance: d.dateEcheance || null,
          date_paiement: null,
          client_opco: null,
          _draftRaw: d,
        });
      }
      return drafts;
    } catch (e) {
      console.warn("Erreur chargement brouillons", e);
      return [];
    }
  };

  const generateDraftHTML = (d: any): string => {
    const fmtDate = (s?: string) => {
      if (!s) return "";
      try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return s; }
    };
    const lignes: any[] = Array.isArray(d?.lignes) ? d.lignes : [];
    const calcLigneHT = (l: any) => (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 1) * (1 - (Number(l.remise) || 0) / 100);
    const totalHT = lignes.reduce((s, l) => s + calcLigneHT(l), 0);
    const totalTVA = lignes.reduce((s, l) => {
      const taux = l.tvaType === "EXO" ? 0 : (Number(l.tvaTaux) || 20);
      return s + calcLigneHT(l) * (taux / 100);
    }, 0);
    const totalTTC = totalHT + totalTVA;

    const lignesHTML = lignes.map((l: any) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${l.stagiaire || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${l.designation || ""}${l.dateDebut ? `<br><small>Du ${fmtDate(l.dateDebut)} au ${fmtDate(l.dateFin)}</small>` : ""}${l.lieu ? `<br><small>Lieu : ${l.lieu}</small>` : ""}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${l.tvaType || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(Number(l.prixUnitaire)||0).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(Number(l.quantite)||1).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${l.remise || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${calcLigneHT(l).toFixed(2)}</td>
      </tr>
    `).join("");

    const clientHTML = d?.refDossier ? d.refDossier : "(client non défini)";

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${d?.numeroInterne || ""}</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#111}.header{display:flex;justify-content:space-between;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#2563eb}.title{text-align:right}.title h1{font-size:18px;margin:0}.info-row{display:flex;justify-content:space-between;margin-bottom:20px}.info-box{width:48%}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f3f4f6;padding:10px;border:1px solid #ddd;text-align:left}.totals{text-align:right;margin-top:20px}.bank-info{margin-top:30px;padding:15px;background:#f9fafb;border:1px solid #e5e7eb}.conditions{margin-top:20px;padding:15px;background:#fefce8;border:1px solid #fde68a;font-size:11px;line-height:1.5}.conditions h4{margin:0 0 8px 0;font-size:12px;color:#92400e}.footer{margin-top:30px;font-size:10px;color:#666;text-align:center;border-top:1px solid #ddd;padding-top:15px}.draft-banner{background:#fde68a;color:#92400e;padding:8px 12px;text-align:center;font-weight:bold;margin-bottom:12px;border-radius:4px}</style></head><body>
      <div class="draft-banner">⚠ BROUILLON — Facture non validée</div>
      <div class="header"><div><div class="logo">🚌 FTRANSPORT</div><div>Spécialiste Formations Transport</div></div><div class="title"><h1>FACTURE ${d?.duplicata ? "DUPLICATA " : ""}N°${d?.numero || ""}</h1><p>Numéro : ${d?.numeroInterne || ""}</p><p>Date de facturation : ${fmtDate(d?.date)}</p><p>Date d'échéance : ${fmtDate(d?.dateEcheance)}</p></div></div>
      <div class="info-row"><div class="info-box"><strong>Émetteur :</strong><br>FTRANSPORT<br>86 route de genas<br>69003 Lyon<br>SIRET : 82346156100016<br>Tél.: 0428296091<br>Email: contact@ftransport.fr</div><div class="info-box"><strong>Adressée à :</strong><br>${clientHTML}${d?.refConvention ? `<br>Réf à rappeler : ${d.refConvention}` : ""}</div></div>
      <h3>Désignation</h3>
      <table><thead><tr><th>Stagiaire</th><th>Désignation</th><th>TVA</th><th>P.U. HT</th><th>Qté</th><th>Rem</th><th>Total HT</th></tr></thead><tbody>${lignesHTML || `<tr><td colspan="7" style="padding:12px;text-align:center;color:#888;border:1px solid #ddd;">Aucune prestation</td></tr>`}</tbody></table>
      <div class="totals"><p><strong>Total HT :</strong> ${totalHT.toFixed(2)} €</p><p><strong>Total TVA :</strong> ${totalTVA.toFixed(2)} €</p><p style="font-size:16px;"><strong>Total TTC :</strong> ${totalTTC.toFixed(2)} €</p></div>
      <div class="bank-info"><h4>Règlement par virement :</h4><p>Banque : Revolut Bank UAB | IBAN : FR76 2823 3000 0185 7527 9099 426 | BIC : REVOFRP2</p></div>
      <div class="conditions"><h4>Conditions de règlement</h4><p>Paiement par virement bancaire ou en espèces à réception de facture. Date d'échéance : ${fmtDate(d?.dateEcheance)}. Aucun escompte accordé pour paiement anticipé. En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal en vigueur seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40,00 €, conformément aux articles L441-10 et D441-5 du Code de commerce.</p></div>
      <div class="footer"><p>SASU FTRANSPORT - SIRET : 82346156100016 - TVA non applicable - article 293 B du CGI</p></div>
    </body></html>`;
  };

  const validateDraft = async (draft: Facture) => {
    const d = draft._draftRaw;
    if (!d) {
      toast.error("Brouillon introuvable");
      return;
    }
    const lignes: any[] = Array.isArray(d.lignes) ? d.lignes : [];
    if (lignes.length === 0) {
      toast.error("Le brouillon ne contient aucune prestation");
      return;
    }
    setValidatingDraft(true);
    try {
      const calcLigneHT = (l: any) => (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 1) * (1 - (Number(l.remise) || 0) / 100);
      const montantHT = lignes.reduce((s, l) => s + calcLigneHT(l), 0);
      const montantTVA = lignes.reduce((s, l) => {
        const taux = l.tvaType === "EXO" ? 0 : (Number(l.tvaTaux) || 20);
        return s + calcLigneHT(l) * (taux / 100);
      }, 0);
      const montantTTC = montantHT + montantTVA;
      const tvaTaux = montantHT > 0 ? Math.round((montantTVA / montantHT) * 100) : 0;
      const sessionLine: any = lignes.find((l: any) => l.type === "session" && l.sessionId);

      const payload: any = {
        numero: d.numeroInterne || d.numero,
        date_emission: d.date,
        date_echeance: d.dateEcheance || null,
        type_financement: d.typeFinanceur === "particulier" ? "particulier" : "professionnel",
        client_nom: d.refDossier || "(client non défini)",
        montant_ht: montantHT,
        tva_taux: tvaTaux,
        montant_tva: montantTVA,
        montant_ttc: montantTTC,
        statut: "en_attente",
        apprenant_id: d.typeFinanceur === "particulier" ? d.selectedApprenantId : null,
        session_id: sessionLine?.sessionId || null,
      };

      const { error } = await supabase.from("factures").insert(payload);
      if (error) throw error;

      try { localStorage.removeItem("facture_draft_v1"); } catch {}
      toast.success("Facture validée et enregistrée définitivement");
      setDraftPreview(null);
      await fetchFactures();
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur lors de la validation : ${e.message ?? e}`);
    } finally {
      setValidatingDraft(false);
    }
  };

  const fetchFactures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .order("date_emission", { ascending: false });
    if (error) {
      toast.error("Erreur lors du chargement des factures");
    } else {
      const drafts = loadDrafts();
      setFactures([...drafts, ...(data || [])]);
    }
    setLoading(false);
  };

  const fetchReleves = useCallback(async () => {
    setRelevesLoading(true);
    const { data, error } = await supabase
      .from("releves_bancaires")
      .select("*")
      .order("mois_annee", { ascending: false });
    if (!error && data) setReleves(data as Releve[]);
    setRelevesLoading(false);
  }, []);

  useEffect(() => {
    fetchFactures();
    fetchFournisseurFactures();
    fetchPaiements();
    fetchReleves();
    const savedRequisition = localStorage.getItem(GC_REQUISITION_KEY);
    if (savedRequisition) {
      setGcRequisitionId(savedRequisition);
      setBridgeConnected(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReleveUpload = async (file: File) => {
    if (!file) return;
    setUploadingReleve(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("releves-bancaires")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("releves-bancaires").getPublicUrl(path);
      // Use signed URL for private bucket
      const { data: signedData } = await supabase.storage.from("releves-bancaires").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || urlData.publicUrl;

      const { error: dbError } = await supabase.from("releves_bancaires").insert({
        nom_fichier: file.name,
        url,
        mois_annee: releveForm.mois_annee,
        banque: releveForm.banque,
        notes: releveForm.notes || null,
      });
      if (dbError) throw dbError;

      toast.success("Relevé déposé avec succès !");
      setReleveForm({ mois_annee: format(new Date(), "yyyy-MM"), banque: "Revolut Bank UAB", notes: "" });
      await fetchReleves();
    } catch (err) {
      toast.error("Erreur lors du dépôt : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setUploadingReleve(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReleveUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleReleveUpload(file);
  };

  const handleDeleteReleve = async (releve: Releve) => {
    if (!confirm(`Supprimer le relevé "${releve.nom_fichier}" ?`)) return;
    await supabase.from("releves_bancaires").delete().eq("id", releve.id);
    toast.success("Relevé supprimé");
    await fetchReleves();
  };

  // Édition inline d'un relevé (nom + banque)
  const [editingReleveId, setEditingReleveId] = useState<string | null>(null);
  const [editReleveForm, setEditReleveForm] = useState<{ nom_fichier: string; banque: string; mois_annee: string }>({ nom_fichier: "", banque: "", mois_annee: "" });

  const startEditReleve = (r: Releve) => {
    setEditingReleveId(r.id);
    setEditReleveForm({ nom_fichier: r.nom_fichier, banque: r.banque, mois_annee: r.mois_annee || "" });
  };

  const cancelEditReleve = () => {
    setEditingReleveId(null);
    setEditReleveForm({ nom_fichier: "", banque: "", mois_annee: "" });
  };

  const saveEditReleve = async (id: string) => {
    const nom = editReleveForm.nom_fichier.trim();
    const banque = editReleveForm.banque.trim();
    const moisAnnee = editReleveForm.mois_annee.trim();
    if (!nom || !banque) {
      toast.error("Le nom et la banque sont obligatoires");
      return;
    }
    if (moisAnnee && !/^\d{4}-\d{2}$/.test(moisAnnee)) {
      toast.error("La période doit être au format AAAA-MM");
      return;
    }
    const { error } = await supabase
      .from("releves_bancaires")
      .update({ nom_fichier: nom, banque, mois_annee: moisAnnee || null })
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success("Relevé mis à jour");
    cancelEditReleve();
    await fetchReleves();
  };




  const callGC = async (action: string, extra: Record<string, string> = {}) => {
    const res = await supabase.functions.invoke("bridge-bank", {
      body: { action, ...extra },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.available === false) throw new Error(res.data.error || "GoCardless non configuré");
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const handleConnectBank = async () => {
    setBridgeLoading(true);
    try {
      const data = await callGC("create_requisition");
      const reqId = data.id;
      const linkUrl = data.link;
      setGcRequisitionId(reqId);
      localStorage.setItem(GC_REQUISITION_KEY, reqId);
      if (linkUrl) {
        window.open(linkUrl, "_blank");
        toast.info("Connectez votre banque dans la fenêtre qui s'ouvre, puis revenez ici et cliquez sur 'Synchroniser les comptes'");
        setBridgeConnected(true);
      }
    } catch (err) {
      toast.error("Erreur connexion banque: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleFetchAccounts = async () => {
    if (!gcRequisitionId) return;
    setBridgeLoading(true);
    try {
      const data = await callGC("list_accounts", { requisition_id: gcRequisitionId });
      const accounts: BankAccount[] = data.accounts || [];
      setGcAccounts(accounts);
      if (accounts.length > 0) setGcSelectedAccountId(accounts[0].id);
      toast.success(`${accounts.length} compte(s) récupéré(s)`);
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleFetchTransactions = async () => {
    const accountId = gcSelectedAccountId;
    if (!accountId) { toast.error("Sélectionnez un compte"); return; }
    setBridgeLoading(true);
    try {
      const data = await callGC("list_transactions", { account_id: accountId });
      setGcTransactions(data.transactions || []);
      toast.success(`${(data.transactions || []).length} transaction(s) récupérée(s)`);
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(GC_REQUISITION_KEY);
    setGcRequisitionId(null);
    setGcAccounts([]);
    setGcTransactions([]);
    setGcSelectedAccountId(null);
    setBridgeConnected(false);
    toast.success("Déconnecté du compte bancaire");
  };

  const fournisseurFacturesAsFactures = useMemo<Facture[]>(() => {
    return (fournisseurFactures || []).map((f: any) => {
      const ttc = Number(f.montant) || 0;
      return {
        id: `fournisseur-${f.id}`,
        numero: f.numero_facture || f.reference || `FOURN-${String(f.id).slice(0, 8)}`,
        client_nom: f.fournisseurs?.nom || "Fournisseur",
        type_financement: "fournisseur",
        montant_ht: ttc,
        montant_tva: 0,
        montant_ttc: ttc,
        statut: f.statut === "paye" ? "payee" : (f.statut || "en_attente"),
        date_emission: (f.date_emission || f.created_at || "").toString().split("T")[0],
        date_echeance: f.date_echeance || null,
        date_paiement: f.date_paiement || null,
        client_opco: null,
      };
    });
  }, [fournisseurFactures]);

  const allFactures = useMemo<Facture[]>(() => {
    return [...factures, ...fournisseurFacturesAsFactures];
  }, [factures, fournisseurFacturesAsFactures]);

  const filteredFactures = useMemo(() => {
    return allFactures.filter((f) => {
      const matchSearch =
        f.numero.toLowerCase().includes(search.toLowerCase()) ||
        f.client_nom.toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === "all" || f.statut === filterStatut;
      const matchFinancement = filterFinancement === "all" || f.type_financement === filterFinancement;
      const isAchat = f.type_financement === "fournisseur";
      const matchTypeFlux =
        filterTypeFlux === "all" ||
        (filterTypeFlux === "achats" && isAchat) ||
        (filterTypeFlux === "ventes" && !isAchat);
      return matchSearch && matchStatut && matchFinancement && matchTypeFlux;
    });
  }, [allFactures, search, filterStatut, filterFinancement, filterTypeFlux]);

  const totalCA = useMemo(() => factures.reduce((s, f) => (f.statut !== "annulee" && f.statut !== "brouillon") ? s + Number(f.montant_ttc) : s, 0), [factures]);
  const totalPaye = useMemo(() => factures.filter(f => f.statut === "payee").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnAttente = useMemo(() => factures.filter(f => f.statut === "en_attente").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnRetard = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return factures.filter(f => f.statut === "en_attente" && f.date_echeance && f.date_echeance < today).reduce((s, f) => s + Number(f.montant_ttc), 0);
  }, [factures]);

  const parFinancement = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    factures.forEach((f) => {
      if (f.statut === "annulee") return;
      const key = f.type_financement || "particulier";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += Number(f.montant_ttc);
    });
    return map;
  }, [factures]);

  const formatMontant = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const getStatutBadge = (statut: string | null) => {
    const s = statut || "en_attente";
    const config = statutConfig[s] || statutConfig.en_attente;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const handleExportCSV = () => {
    const headers = ["Numéro", "Client", "Financement", "Montant HT", "TVA", "Montant TTC", "Statut", "Date émission", "Échéance", "Date paiement"];
    const rows = filteredFactures.map((f) => [
      f.numero, f.client_nom, financementLabels[f.type_financement] || f.type_financement,
      f.montant_ht, f.montant_tva, f.montant_ttc,
      statutConfig[f.statut || "en_attente"]?.label || f.statut,
      f.date_emission, f.date_echeance || "", f.date_paiement || "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const aPayerItems = fournisseurFactures.map((f: any) => ({
    id: `fournisseur-${f.id}`,
    type: "fournisseur" as const,
    nom: f.fournisseurs?.nom || "Fournisseur",
    description: f.description || f.nom_fichier,
    montant: Number(f.montant) || 0,
    date_emission: f.created_at,
    statut: f.statut || "en_attente",
    date_paiement: f.date_paiement || null,
    moyen_paiement: f.moyen_paiement || null,
    source_id: f.id,
    url: f.url || null,
  })).sort((a: APayer, b: APayer) => new Date(b.date_emission).getTime() - new Date(a.date_emission).getTime());

  const filteredAPayerItems = aPayerItems.filter((item: APayer) => {
    const matchSearch =
      item.nom.toLowerCase().includes(payerSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(payerSearch.toLowerCase());
    const matchFilter =
      payerFilter === "tous" ||
      (payerFilter === "paye" && item.statut === "paye") ||
      (payerFilter === "en_attente" && item.statut !== "paye");
    return matchSearch && matchFilter;
  });

  const totalAPayer = aPayerItems.filter((i: APayer) => i.statut !== "paye").reduce((s: number, i: APayer) => s + i.montant, 0);
  const totalPaye2 = aPayerItems.filter((i: APayer) => i.statut === "paye").reduce((s: number, i: APayer) => s + i.montant, 0);

  // handleMarquerPaye removed - using handleAjouterPaiement instead

  const nbAPayer = aPayerItems.filter((i: APayer) => i.statut !== "paye").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="a-payer" className="gap-2 relative">
            <CheckCheck className="h-4 w-4" /> À payer / Payé
            {nbAPayer > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {nbAPayer > 9 ? "9+" : nbAPayer}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-2">
            <Receipt className="h-4 w-4" /> Toutes les factures
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Filter className="h-4 w-4" /> Par catégorie
          </TabsTrigger>
          <TabsTrigger value="banque" className="gap-2">
            <Building2 className="h-4 w-4" /> Compte bancaire
          </TabsTrigger>
          <TabsTrigger value="fournisseurs" className="gap-2">
            <Receipt className="h-4 w-4" /> Factures fournisseurs
          </TabsTrigger>
          <TabsTrigger value="releves" className="gap-2">
            <FolderOpen className="h-4 w-4" /> Relevés de comptes
            <Badge className="ml-1 h-5 px-1.5 text-[10px]">{releves.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="justificatifs" className="gap-2">
            <Receipt className="h-4 w-4" /> Justificatifs
          </TabsTrigger>
          <TabsTrigger value="notes-frais" className="gap-2">
            <Euro className="h-4 w-4" /> Notes de frais
          </TabsTrigger>
          <TabsTrigger value="rapprochement" className="gap-2 relative">
            <Link2 className="h-4 w-4" /> Rapprochement bancaire
          </TabsTrigger>
        </TabsList>

        {/* === VUE D'ENSEMBLE === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold">{formatMontant(totalCA)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Encaissé</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMontant(totalPaye)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-amber-600">{formatMontant(totalEnAttente)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En retard</p>
                    <p className="text-2xl font-bold text-destructive">{formatMontant(totalEnRetard)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition par type de financement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(parFinancement).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {key === "particulier" ? <CreditCard className="h-5 w-5 text-primary" /> : <Banknote className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium">{financementLabels[key] || key}</p>
                        <p className="text-sm text-muted-foreground">{val.count} facture{val.count > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatMontant(val.total)}</p>
                  </div>
                ))}
                {Object.keys(parFinancement).length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-8">Aucune facture enregistrée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === À PAYER / PAYÉ === */}
        <TabsContent value="a-payer" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total à régler</p>
                    <p className="text-2xl font-bold text-destructive">{formatMontant(totalAPayer)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total payé</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMontant(totalPaye2)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-amber-600">{nbAPayer}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={payerSearch} onChange={e => setPayerSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              {(["tous", "en_attente", "paye"] as const).map(f => (
                <Button
                  key={f}
                  variant={payerFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPayerFilter(f)}
                >
                  {f === "tous" ? "Tous" : f === "en_attente" ? "À payer" : "Payés"}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {filteredAPayerItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture trouvée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant total</TableHead>
                      <TableHead className="text-right">Payé</TableHead>
                      <TableHead className="text-right">Reste</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAPayerItems.map((item) => {
                      const isPaid = item.statut === "paye";
                      const totalPayeFacture = getTotalPayeForFacture(item.source_id);
                      const reste = Math.max(0, item.montant - totalPayeFacture);
                      const facturePaiements = getPaiementsForFacture(item.source_id);
                      const isExpanded = expandedFacture === item.id;
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow className={cn(isPaid ? "opacity-60" : "", "cursor-pointer hover:bg-muted/50")} onClick={() => setExpandedFacture(isExpanded ? null : item.id)}>
                            <TableCell className="font-medium">{item.nom}</TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{item.description}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMontant(item.montant)}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">{formatMontant(totalPayeFacture)}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">{reste > 0 ? formatMontant(reste) : "—"}</TableCell>
                            <TableCell>{formatDate(item.date_emission)}</TableCell>
                            <TableCell>
                              {item.url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-8 text-xs"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const match = item.url!.match(/\/storage\/v1\/object\/public\/(.+)/);
                                      if (!match) { window.open(item.url!, '_blank'); return; }
                                      const fullPath = decodeURIComponent(match[1]);
                                      const bucketName = fullPath.split('/')[0];
                                      const filePath = fullPath.substring(bucketName.length + 1);
                                      const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 300);
                                      if (error || !data?.signedUrl) { toast.error("Impossible de générer le lien"); return; }
                                      window.open(data.signedUrl, '_blank');
                                    } catch { toast.error("Erreur lors du téléchargement"); }
                                  }}
                                >
                                  <Download className="h-3 w-3" /> Télécharger
                                </Button>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Payé</Badge>
                              ) : totalPayeFacture > 0 ? (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Partiel</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedFacture(isExpanded ? null : item.id); }}>
                                {isExpanded ? "▲ Fermer" : "▼ Paiements"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-4">
                                <div className="space-y-3">
                                  {/* Historique des paiements */}
                                  {facturePaiements.length > 0 && (
                                    <div>
                                      <p className="text-sm font-semibold mb-2">Historique des paiements</p>
                                      <div className="space-y-1">
                                        {facturePaiements.map(p => (
                                          <div key={p.id} className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                                            <div className="flex items-center gap-4">
                                              <span className="text-sm font-medium">{formatMontant(Number(p.montant))}</span>
                                              <span className="text-sm text-muted-foreground">{formatDate(p.date_paiement)}</span>
                                              <Badge variant="outline" className="text-xs">{p.moyen_paiement}</Badge>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-xs text-destructive hover:text-destructive"
                                              onClick={() => handleSupprimerPaiement(p.id, p.facture_id)}
                                            >
                                              <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Formulaire d'ajout */}
                                  {!isPaid && (
                                    <div className="border-t pt-3">
                                      <p className="text-sm font-semibold mb-2">Ajouter un paiement (reste : {formatMontant(reste)})</p>
                                      <div className="flex flex-wrap items-end gap-2">
                                        <div>
                                          <label className="text-xs text-muted-foreground">Montant</label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder={formatMontant(reste).replace(/[^\d,.]/g, '')}
                                            value={partialAmounts[item.id] || ""}
                                            onChange={e => setPartialAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            className="w-[120px] h-8 text-sm"
                                            onClick={e => e.stopPropagation()}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-muted-foreground">Date</label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal h-8", !paymentDates[item.id] && "text-muted-foreground")} onClick={e => e.stopPropagation()}>
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {paymentDates[item.id] ? format(paymentDates[item.id]!, "dd/MM/yyyy") : "Date..."}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar mode="single" selected={paymentDates[item.id]} onSelect={(d) => setPaymentDates(prev => ({ ...prev, [item.id]: d }))} initialFocus className="p-3 pointer-events-auto" locale={fr} />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                        <div>
                                          <label className="text-xs text-muted-foreground">Moyen</label>
                                          <Select value={paymentMoyens[item.id] || ""} onValueChange={(v) => setPaymentMoyens(prev => ({ ...prev, [item.id]: v }))}>
                                            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Moyen..." /></SelectTrigger>
                                            <SelectContent>
                                              {moyensPaiement.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAjouterPaiement(item); }} disabled={savingPayment[item.id]} className="gap-1 h-8 text-xs">
                                          <CheckCheck className="h-3 w-3" />
                                          {savingPayment[item.id] ? "..." : "Enregistrer"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {isPaid && facturePaiements.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">Paiement marqué sans détail (ancien système)</p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TOUTES LES FACTURES === */}
        <TabsContent value="factures" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par numéro ou client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterTypeFlux} onValueChange={(v) => setFilterTypeFlux(v as "all" | "ventes" | "achats")}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ventes & Achats</SelectItem>
                <SelectItem value="ventes">Ventes uniquement</SelectItem>
                <SelectItem value="achats">Achats uniquement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="payee">Payée</SelectItem>
                <SelectItem value="en_retard">En retard</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFinancement} onValueChange={setFilterFinancement}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Financement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="opco">OPCO</SelectItem>
                <SelectItem value="france_travail">France Travail</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : filteredFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture trouvée</p>
                </div>
              ) : (
                (() => {
                  const ventes = filteredFactures.filter(f => f.type_financement !== "fournisseur");
                  const achats = filteredFactures.filter(f => f.type_financement === "fournisseur");
                  const totalVentes = ventes.reduce((s, f) => s + Number(f.montant_ttc), 0);
                  const totalAchats = achats.reduce((s, f) => s + Number(f.montant_ttc), 0);

                  const renderRows = (list: Facture[]) => list.map((f) => {
                    const isDraft = f.statut === "brouillon";
                    return (
                      <TableRow
                        key={f.id}
                        className={isDraft ? "cursor-pointer hover:bg-amber-50" : ""}
                        onClick={isDraft ? () => setDraftPreview(f) : undefined}
                        title={isDraft ? "Cliquer pour prévisualiser et valider la facture" : undefined}
                      >
                        <TableCell className="font-medium">{f.numero}</TableCell>
                        <TableCell>{f.client_nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{financementLabels[f.type_financement] || f.type_financement}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatMontant(Number(f.montant_ttc))}</TableCell>
                        <TableCell>{getStatutBadge(f.statut)}</TableCell>
                        <TableCell>{formatDate(f.date_emission)}</TableCell>
                        <TableCell>{formatDate(f.date_echeance)}</TableCell>
                        <TableCell>{formatDate(f.date_paiement)}</TableCell>
                      </TableRow>
                    );
                  });

                  const headerRow = (
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Financement</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Émission</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Paiement</TableHead>
                    </TableRow>
                  );

                  return (
                    <div className="space-y-6 p-2">
                      {/* VENTES */}
                      <div>
                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-l-4 border-emerald-500 rounded-t">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-emerald-700" />
                            <h3 className="font-semibold text-emerald-900">Factures de ventes (clients)</h3>
                            <Badge variant="secondary">{ventes.length}</Badge>
                          </div>
                          <div className="text-sm font-semibold text-emerald-900">
                            Total : {formatMontant(totalVentes)}
                          </div>
                        </div>
                        {ventes.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4">Aucune facture de vente</p>
                        ) : (
                          <Table>
                            <TableHeader>{headerRow}</TableHeader>
                            <TableBody>{renderRows(ventes)}</TableBody>
                          </Table>
                        )}
                      </div>

                      {/* ACHATS */}
                      <div>
                        <div className="flex items-center justify-between px-3 py-2 bg-orange-50 border-l-4 border-orange-500 rounded-t">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-orange-700" />
                            <h3 className="font-semibold text-orange-900">Factures d'achats (fournisseurs)</h3>
                            <Badge variant="secondary">{achats.length}</Badge>
                          </div>
                          <div className="text-sm font-semibold text-orange-900">
                            Total : {formatMontant(totalAchats)}
                          </div>
                        </div>
                        {achats.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4">Aucune facture d'achat</p>
                        ) : (
                          <Table>
                            <TableHeader>{headerRow}</TableHeader>
                            <TableBody>{renderRows(achats)}</TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end text-sm text-muted-foreground">
            {filteredFactures.length} facture{filteredFactures.length > 1 ? "s" : ""} — Total: {formatMontant(filteredFactures.reduce((s, f) => s + Number(f.montant_ttc), 0))}
          </div>
        </TabsContent>

        {/* === PAR CATÉGORIE === */}
        <TabsContent value="categories" className="space-y-6">
          {Object.entries(parFinancement).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucune facture enregistrée</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(parFinancement).map(([key, val]) => {
              const catFactures = factures.filter(f => (f.type_financement || "particulier") === key && f.statut !== "annulee");
              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {key === "particulier" ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                        {financementLabels[key] || key}
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{val.count} facture{val.count > 1 ? "s" : ""}</p>
                        <p className="font-semibold">{formatMontant(val.total)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N°</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Montant TTC</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Émission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catFactures.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.numero}</TableCell>
                            <TableCell>{f.client_nom}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMontant(Number(f.montant_ttc))}</TableCell>
                            <TableCell>{getStatutBadge(f.statut)}</TableCell>
                            <TableCell>{formatDate(f.date_emission)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* === COMPTE BANCAIRE === */}
        <TabsContent value="banque" className="space-y-6">
          {!bridgeConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connectez votre compte bancaire</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Synchronisez votre compte bancaire via GoCardless Open Banking (gratuit) pour voir vos transactions en temps réel.
                </p>
                <Button onClick={handleConnectBank} disabled={bridgeLoading} className="gap-2" size="lg">
                  <Link2 className="h-5 w-5" />
                  {bridgeLoading ? "Connexion en cours..." : "Connecter ma banque"}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Connexion sécurisée via GoCardless Open Banking (PSD2 agréé)
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compte bancaire connecté</h3>
                    <p className="text-sm text-muted-foreground">Via GoCardless Open Banking</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDisconnect} disabled={bridgeLoading} className="gap-2" size="sm">
                    <ExternalLink className="h-4 w-4" /> Déconnecter
                  </Button>
                  <Button variant="outline" onClick={handleFetchAccounts} disabled={bridgeLoading} className="gap-2" size="sm">
                    <RefreshCw className={`h-4 w-4 ${bridgeLoading ? "animate-spin" : ""}`} /> Synchroniser les comptes
                  </Button>
                  {gcSelectedAccountId && (
                    <Button variant="outline" onClick={handleFetchTransactions} disabled={bridgeLoading} className="gap-2" size="sm">
                      <RefreshCw className={`h-4 w-4 ${bridgeLoading ? "animate-spin" : ""}`} /> Transactions
                    </Button>
                  )}
                </div>
              </div>

              {gcAccounts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gcAccounts.map((account) => (
                    <Card
                      key={account.id}
                      className={`cursor-pointer transition-all ${gcSelectedAccountId === account.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setGcSelectedAccountId(account.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{account.name}</p>
                          <Badge variant="outline">{account.currency}</Badge>
                        </div>
                        <p className="text-2xl font-bold">{formatMontant(Number(account.balance))}</p>
                        {account.iban && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">{account.iban}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {gcTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dernières transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gcTransactions.slice(0, 50).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.date)}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              {t.amount >= 0 ? (
                                <ArrowDownLeft className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                              <span className="truncate">{t.description}</span>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {t.amount >= 0 ? "+" : ""}{formatMontant(t.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {gcAccounts.length === 0 && gcTransactions.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-center">
                      Cliquez sur "Synchroniser les comptes" pour récupérer vos comptes bancaires.<br />
                      <span className="text-xs">Si vous venez de vous connecter, attendez quelques secondes puis synchronisez.</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* === FACTURES FOURNISSEURS === */}
        <TabsContent value="fournisseurs" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total factures fournisseurs</p>
                <p className="text-2xl font-bold">{fournisseurFactures.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Montant total</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatMontant(fournisseurFactures.reduce((s, f) => s + (Number(f.montant) || 0), 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Fournisseurs actifs</p>
                <p className="text-2xl font-bold">{new Set(fournisseurFactures.map(f => f.fournisseur_id)).size}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Factures fournisseurs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fournisseurFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture fournisseur</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date paiement</TableHead>
                      <TableHead>Moyen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fournisseurFactures.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.fournisseurs?.nom || "—"}</TableCell>
                        <TableCell>{f.nom_fichier}</TableCell>
                        <TableCell><Badge variant="outline">{f.destinataire}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">
                          {f.montant ? formatMontant(Number(f.montant)) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.description || "—"}</TableCell>
                        <TableCell>{getStatutBadge(f.statut || "en_attente")}</TableCell>
                        <TableCell>{formatDate(f.date_paiement)}</TableCell>
                        <TableCell>{f.moyen_paiement || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RELEVÉS DE COMPTES === */}
        <TabsContent value="releves" className="space-y-6">
          {/* Upload zone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" /> Déposer un relevé de compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Mois / Année</label>
                  <Input
                    type="month"
                    value={releveForm.mois_annee}
                    onChange={e => setReleveForm(f => ({ ...f, mois_annee: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Banque</label>
                  <Select value={releveForm.banque} onValueChange={v => setReleveForm(f => ({ ...f, banque: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revolut Bank UAB">Revolut Bank UAB</SelectItem>
                      <SelectItem value="BNP Paribas">BNP Paribas</SelectItem>
                      <SelectItem value="Société Générale">Société Générale</SelectItem>
                      <SelectItem value="Crédit Agricole">Crédit Agricole</SelectItem>
                      <SelectItem value="LCL">LCL</SelectItem>
                      <SelectItem value="Caisse d'Épargne">Caisse d'Épargne</SelectItem>
                      <SelectItem value="Banque Postale">Banque Postale</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes (optionnel)</label>
                  <Input
                    placeholder="Ex: compte courant principal"
                    value={releveForm.notes}
                    onChange={e => setReleveForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Drag & drop zone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingReleve ? (
                  <>
                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Dépôt en cours...</p>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Glissez votre relevé ici</p>
                      <p className="text-sm text-muted-foreground">ou cliquez pour parcourir vos fichiers</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, OFX, CSV — max 20 Mo</p>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.ofx,.csv,.xlsx,.qif" className="hidden" onChange={handleFileChange} />
            </CardContent>
          </Card>

          {/* Liste des relevés */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" /> Relevés archivés ({releves.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {relevesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : releves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Aucun relevé déposé pour l'instant</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Déposé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releves.map((r) => {
                      const isEditing = editingReleveId === r.id;
                      return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            {isEditing ? (
                              <Input
                                value={editReleveForm.nom_fichier}
                                onChange={e => setEditReleveForm(f => ({ ...f, nom_fichier: e.target.value }))}
                                className="h-8 text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate max-w-[200px]">{r.nom_fichier}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editReleveForm.banque} onValueChange={v => setEditReleveForm(f => ({ ...f, banque: v }))}>
                              <SelectTrigger className="h-8 text-sm w-[170px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Revolut Bank UAB">Revolut Bank UAB</SelectItem>
                                <SelectItem value="BNP Paribas">BNP Paribas</SelectItem>
                                <SelectItem value="Société Générale">Société Générale</SelectItem>
                                <SelectItem value="Crédit Agricole">Crédit Agricole</SelectItem>
                                <SelectItem value="LCL">LCL</SelectItem>
                                <SelectItem value="Caisse d'Épargne">Caisse d'Épargne</SelectItem>
                                <SelectItem value="Banque Postale">Banque Postale</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{r.banque}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {isEditing ? (
                            <Input
                              type="month"
                              value={editReleveForm.mois_annee}
                              onChange={e => setEditReleveForm(f => ({ ...f, mois_annee: e.target.value }))}
                              className="h-8 text-sm w-[150px]"
                            />
                          ) : r.mois_annee ? (() => {
                            const [y, m] = r.mois_annee.split("-");
                            const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                            return format(d, "MMMM yyyy", { locale: fr });
                          })() : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.notes || "—"}</TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-8 text-primary"
                                  onClick={() => saveEditReleve(r.id)}
                                >
                                  <Check className="h-3 w-3" /> Valider
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={cancelEditReleve}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-8"
                                  onClick={() => window.open(r.url, "_blank")}
                                >
                                  <Eye className="h-3 w-3" /> Voir
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-8"
                                  onClick={() => startEditReleve(r)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteReleve(r)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === JUSTIFICATIFS === */}
        <TabsContent value="justificatifs" className="space-y-6">
          <JustificatifsTab />
        </TabsContent>

        {/* === NOTES DE FRAIS === */}
        <TabsContent value="notes-frais" className="space-y-6">
          <NotesFraisTab />
        </TabsContent>

        {/* === RAPPROCHEMENT BANCAIRE === */}
        <TabsContent value="rapprochement" className="space-y-6">
          <RapprochementBancaire />
        </TabsContent>
      </Tabs>

      {/* Aperçu et validation d'un brouillon de facture */}
      <Dialog open={!!draftPreview} onOpenChange={(open) => { if (!open) setDraftPreview(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Brouillon — Facture {draftPreview?.numero} ({draftPreview?.client_nom})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden border-y bg-muted">
            {draftPreview && (
              <iframe
                title="Aperçu facture brouillon"
                srcDoc={generateDraftHTML(draftPreview._draftRaw)}
                className="w-full h-[65vh] bg-white"
              />
            )}
          </div>
          <DialogFooter className="px-6 py-4 gap-2">
            <Button variant="outline" onClick={() => setDraftPreview(null)} disabled={validatingDraft}>
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!draftPreview?._draftRaw) return;
                const html = generateDraftHTML(draftPreview._draftRaw);
                const w = window.open("", "_blank");
                if (!w) { toast.error("Popup bloquée"); return; }
                w.document.write(html);
                w.document.close();
                w.onload = () => { setTimeout(() => { w.focus(); w.print(); }, 300); };
              }}
              disabled={validatingDraft}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
            <Button
              onClick={() => draftPreview && validateDraft(draftPreview)}
              disabled={validatingDraft}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {validatingDraft ? "Validation..." : "Valider la facture définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
