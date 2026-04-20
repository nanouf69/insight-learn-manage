import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, RefreshCw, CheckCircle, AlertCircle, MinusCircle,
  ArrowDownLeft, ArrowUpRight, Search, Tag, FileText,
  Link2, Trash2, Eye, MoreHorizontal, Filter, Download
} from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

interface Transaction {
  id: string;
  date_operation: string;
  libelle: string;
  montant: number;
  solde: number | null;
  banque: string;
  reference: string | null;
  categorie: string | null;
  fournisseur_client: string | null;
  notes: string | null;
  statut: string;
  justificatif_id: string | null;
  source: string;
  created_at: string;
}

interface Justificatif {
  id: string;
  nom_fichier: string;
  url: string;
  montant_ttc: number | null;
  date_operation: string | null;
  categorie: string | null;
  fournisseur: string | null;
  statut: string;
}

const CATEGORIES = [
  { value: "recette_formation", label: "📚 Recette formation", color: "bg-emerald-100 text-emerald-700" },
  { value: "carburant", label: "⛽ Carburant", color: "bg-orange-100 text-orange-700" },
  { value: "repas", label: "🍽️ Repas", color: "bg-yellow-100 text-yellow-700" },
  { value: "materiel", label: "🖥️ Matériel", color: "bg-blue-100 text-blue-700" },
  { value: "fournitures", label: "📎 Fournitures", color: "bg-cyan-100 text-cyan-700" },
  { value: "telephonie", label: "📱 Téléphonie", color: "bg-purple-100 text-purple-700" },
  { value: "loyer", label: "🏢 Loyer", color: "bg-indigo-100 text-indigo-700" },
  { value: "assurance", label: "🛡️ Assurance", color: "bg-green-100 text-green-700" },
  { value: "salaires_formateurs", label: "👨‍🏫 Formateurs", color: "bg-teal-100 text-teal-700" },
  { value: "transport", label: "🚌 Transport", color: "bg-sky-100 text-sky-700" },
  { value: "honoraires", label: "⚖️ Honoraires", color: "bg-violet-100 text-violet-700" },
  { value: "publicite", label: "📢 Publicité", color: "bg-pink-100 text-pink-700" },
  { value: "banque", label: "🏦 Frais bancaires", color: "bg-slate-100 text-slate-700" },
  { value: "impots", label: "🏛️ Impôts & taxes", color: "bg-red-100 text-red-700" },
  { value: "virement_interne", label: "🔄 Virement interne", color: "bg-gray-100 text-gray-700" },
  { value: "autre", label: "📄 Autre", color: "bg-muted text-muted-foreground" },
];

function getCat(value: string | null) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

const STATUTS = [
  { value: "non_justifie", label: "Non justifié", icon: AlertCircle, color: "bg-amber-100 text-amber-700" },
  { value: "justifie", label: "Justifié ✓", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
  { value: "ignore", label: "Ignoré", icon: MinusCircle, color: "bg-muted text-muted-foreground" },
];

function getStatut(value: string) {
  return STATUTS.find(s => s.value === value) || STATUTS[0];
}

/**
 * Parse BNP CSV — format exact BNP Paribas Pro (6 colonnes) :
 * Ligne 0 : info compte (ignorée)
 * Lignes suivantes : Date;Type;Sous-type;Libellé long;Date valeur;Montant
 * Montant : "1 500,00" ou "-2 046,30" (espace = milliers, virgule = décimale)
 */
function parseBNPCsv(text: string): Omit<Transaction, "id" | "statut" | "justificatif_id" | "source" | "created_at" | "categorie" | "fournisseur_client" | "notes" | "reference">[] {
  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const results: ReturnType<typeof parseBNPCsv> = [];

  const splitLine = (line: string): string[] =>
    line.split(";").map(c => c.trim().replace(/^"|"$/g, "").trim());

  const parseNum = (s: string): number =>
    parseFloat(s.replace(/\u00A0/g, "").replace(/ /g, "").replace(",", "."));

  const parseDate = (s: string): Date | null => {
    const clean = s.trim();
    try {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return parse(clean, "dd/MM/yyyy", new Date());
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return new Date(clean);
    } catch { /* ignore */ }
    return null;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trim();
    if (!raw) continue;

    const cols = splitLine(raw);

    // Ignorer la 1ère ligne d'info compte (contient "Compte", "****", ou entités HTML "&")
    if (
      cols[0].toLowerCase().includes("compte") ||
      cols[0].includes("****") ||
      cols[0].includes("&amp") ||
      cols[0].includes("&")
    ) continue;

    // La date est toujours en col 0
    const dateObj = parseDate(cols[0]);
    if (!dateObj || isNaN(dateObj.getTime())) continue;

    const date_operation = format(dateObj, "yyyy-MM-dd");

    if (cols.length >= 6) {
      // Format BNP 6 colonnes : Date;Type;Sous-type;Libellé long;Date valeur;Montant
      const type = cols[1] || "";
      const libelleLong = cols[3] || cols[2] || "";
      // Libellé = Type – début du libellé long (max 100 chars)
      const libelle = libelleLong
        ? `${type} – ${libelleLong}`.slice(0, 100)
        : (type || "—");
      const montant = parseNum(cols[5]);
      if (!isNaN(montant) && montant !== 0) {
        results.push({ date_operation, libelle, montant, solde: null, banque: "BNP Paribas" });
      }
    } else if (cols.length >= 3) {
      // Format simplifié : Date;Libellé;Montant[;...]
      const libelle = cols[1] || "—";
      const montant = parseNum(cols[cols.length - 1]);
      if (!isNaN(montant) && montant !== 0) {
        results.push({ date_operation, libelle, montant, solde: null, banque: "BNP Paribas" });
      }
    }
  }
  return results;
}

/**
 * Parse Revolut Business CSV — format standard :
 * Colonnes : Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
 * Montant : "1500.00" ou "-2046.30" (point décimal, signe négatif)
 */
function parseRevolutCsv(text: string): Omit<Transaction, "id" | "statut" | "justificatif_id" | "source" | "created_at" | "categorie" | "fournisseur_client" | "notes" | "reference">[] {
  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const results: ReturnType<typeof parseRevolutCsv> = [];
  if (rawLines.length < 2) return results;

  const sep = rawLines[0].includes("\t") ? "\t" : rawLines[0].split(",").length > rawLines[0].split(";").length ? "," : ";";

  const splitLine = (line: string): string[] => {
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === sep.charAt(0) && !inQuotes) { parts.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    parts.push(current.trim());
    return parts;
  };

  const headerCols = splitLine(rawLines[0]).map(h => h.toLowerCase().trim());
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headerCols.findIndex(h => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateCol = findCol("completed date", "date completed", "completed");
  const startDateCol = findCol("started date", "date started", "started");
  const descCol = findCol("description");
  const amountCol = findCol("amount");
  const balanceCol = findCol("balance");
  const stateCol = findCol("state", "status");
  const typeCol = findCol("type");

  const useDateCol = dateCol >= 0 ? dateCol : startDateCol;
  if (useDateCol < 0 || descCol < 0 || amountCol < 0) return results;

  for (let i = 1; i < rawLines.length; i++) {
    const raw = rawLines[i].trim();
    if (!raw) continue;
    const cols = splitLine(raw);

    if (stateCol >= 0) {
      const state = (cols[stateCol] || "").toLowerCase();
      if (state === "reverted" || state === "declined" || state === "failed") continue;
    }

    const dateStr = (cols[useDateCol] || "").trim();
    let dateObj: Date | null = null;
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) dateObj = new Date(dateStr.slice(0, 10));
      else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) dateObj = parse(dateStr.slice(0, 10), "dd/MM/yyyy", new Date());
      else dateObj = new Date(dateStr);
    } catch { /* ignore */ }
    if (!dateObj || isNaN(dateObj.getTime())) continue;

    const date_operation = format(dateObj, "yyyy-MM-dd");
    const amountStr = (cols[amountCol] || "").replace(/[^\d.\-]/g, "");
    const montant = parseFloat(amountStr);
    if (isNaN(montant) || montant === 0) continue;

    const desc = cols[descCol] || "—";
    const typeStr = typeCol >= 0 ? cols[typeCol] || "" : "";
    const libelle = typeStr && !["card_payment", "transfer", "topup"].includes(typeStr.toLowerCase())
      ? `${typeStr} – ${desc}`.slice(0, 100)
      : desc.slice(0, 100);

    const balanceStr = balanceCol >= 0 ? (cols[balanceCol] || "").replace(/[^\d.\-]/g, "") : "";
    const solde = balanceStr ? parseFloat(balanceStr) : null;

    results.push({ date_operation, libelle, montant, solde: isNaN(solde as number) ? null : solde, banque: "Revolut Pro" });
  }
  return results;
}

/** Auto-detect bank from CSV content */
function detectBankFromCsv(text: string): "bnp" | "revolut" | null {
  const firstLine = text.split("\n")[0].toLowerCase();
  if (firstLine.includes("completed date") || firstLine.includes("description") && firstLine.includes("amount") && firstLine.includes("balance")) return "revolut";
  if (firstLine.includes("compte") || /^\d{2}\/\d{2}\/\d{4}/.test(firstLine.trim()) || firstLine.split(";").length >= 3) return "bnp";
  return null;
}

interface MatchSuggestion {
  scores: { index: number; score: number; raison: string }[];
  meilleur_index: number | null;
  analyse: string;
}


interface ApprenantWithSession {
  id: string;
  nom: string;
  prenom: string;
  civilite: string | null;
  email: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  formation_choisie: string | null;
  type_apprenant: string | null;
  montant_ttc: number | null;
  montant_paye: number | null;
  date_paiement: string | null;
  date_debut_formation: string | null;
  date_fin_formation: string | null;
  session_date_debut: string | null;
  session_date_fin: string | null;
}

export function RapprochementBancaire() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [justificatifs, setJustificatifs] = useState<Justificatif[]>([]);
  const [apprenants, setApprenants] = useState<ApprenantWithSession[]>([]);
  const [fournisseursList, setFournisseursList] = useState<{ id: string; nom: string }[]>([]);
  const [fournisseurCustomInput, setFournisseurCustomInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterType, setFilterType] = useState("tous"); // tous, debit, credit
  const [filterBanque, setFilterBanque] = useState("tous"); // tous, BNP Paribas, Revolut Pro
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [linkDialogId, setLinkDialogId] = useState<string | null>(null);
  const [matchSuggestion, setMatchSuggestion] = useState<MatchSuggestion | null>(null);
  const [matchSuggestionLoading, setMatchSuggestionLoading] = useState(false);
  const [confirmingLink, setConfirmingLink] = useState(false);
  const [syncingRevolut, setSyncingRevolut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch ALL transactions (bypass 1000-row default limit) by paginating
    const fetchAllTxs = async (): Promise<Transaction[]> => {
      const all: Transaction[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("transactions_bancaires")
          .select("*")
          .order("date_operation", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        all.push(...(data as Transaction[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };

    const [txs, { data: just }, { data: apprenantsData }, { data: saData }, { data: fourData }] = await Promise.all([
      fetchAllTxs(),
      supabase.from("justificatifs").select("id, nom_fichier, url, montant_ttc, date_operation, categorie, fournisseur, statut"),
      supabase.from("apprenants").select("id, nom, prenom, date_debut_formation, date_fin_formation"),
      supabase.from("session_apprenants").select("apprenant_id, date_debut, date_fin, sessions(date_debut, date_fin)"),
      supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
    ]);
    if (txs) setTransactions(txs);
    if (fourData) setFournisseursList(fourData as { id: string; nom: string }[]);
    if (just) setJustificatifs(just as Justificatif[]);
    
    // Build apprenants with session dates
    if (apprenantsData) {
      const enriched: ApprenantWithSession[] = (apprenantsData as any[]).map(a => {
        const sa = (saData as any[] || []).find((s: any) => s.apprenant_id === a.id);
        const session = sa?.sessions;
        return {
          id: a.id,
          nom: a.nom,
          prenom: a.prenom,
          date_debut_formation: a.date_debut_formation,
          date_fin_formation: a.date_fin_formation,
          session_date_debut: sa?.date_debut || session?.date_debut || null,
          session_date_fin: sa?.date_fin || session?.date_fin || null,
        };
      });
      setApprenants(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleImportCSV = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const detected = detectBankFromCsv(text);
      let rows: ReturnType<typeof parseBNPCsv>;
      if (detected === "revolut") {
        rows = parseRevolutCsv(text);
      } else {
        rows = parseBNPCsv(text);
      }
      if (rows.length === 0) {
        toast.error("Aucune transaction trouvée dans ce fichier. Vérifiez le format CSV.");
        setImporting(false);
        return;
      }

      // Deduplicate: fetch existing transactions for this bank to compare
      const bankName = rows[0]?.banque || "inconnue";
      const dates = [...new Set(rows.map(r => r.date_operation))];
      const { data: existingRows } = await supabase
        .from("transactions_bancaires")
        .select("date_operation, montant, libelle, reference")
        .in("date_operation", dates)
        .eq("banque", bankName);

      const existingSet = new Set(
        (existingRows || []).map(e =>
          `${e.date_operation}|${e.montant}|${(e.libelle || "").trim().toLowerCase()}`
        )
      );

      const newRows = rows.filter(r => {
        // Dedup by date + montant + libellé
        const key = `${r.date_operation}|${r.montant}|${(r.libelle || "").trim().toLowerCase()}`;
        return !existingSet.has(key);
      });

      const skipped = rows.length - newRows.length;

      if (newRows.length === 0) {
        toast.info(`Toutes les ${rows.length} transactions sont déjà en base. Aucun doublon importé.`);
        setImporting(false);
        return;
      }

      const inserts = newRows.map(r => ({ ...r, statut: "non_justifie", source: "import_csv" }));
      const { error } = await supabase.from("transactions_bancaires").insert(inserts);
      if (error) throw error;

      const msg = skipped > 0
        ? `${newRows.length} nouvelles transactions importées, ${skipped} déjà présentes ignorées.`
        : `${newRows.length} transactions ${bankName} importées !`;
      toast.success(msg);
      await fetchAll();
    } catch (err) {
      toast.error("Erreur import : " + (err instanceof Error ? err.message : "Erreur"));
    }
    setImporting(false);
  };

  const handlePurgeAll = async () => {
    if (!confirm(`Supprimer toutes les ${transactions.length} transactions importées et recommencer à zéro ?`)) return;
    const { error } = await supabase.from("transactions_bancaires").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Toutes les transactions supprimées. Vous pouvez réimporter votre CSV.");
    await fetchAll();
  };

  /** Sync Revolut API transactions into transactions_bancaires */
  const handleSyncRevolut = async () => {
    setSyncingRevolut(true);
    try {
      // First check if a valid Revolut token exists
      const { data: tokenRow, error: tokenErr } = await supabase
        .from("revolut_tokens")
        .select("expires_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenErr || !tokenRow) {
        toast.error("Aucun token Revolut trouvé. Allez sur /revolut-connect pour connecter votre compte Revolut.");
        setSyncingRevolut(false);
        return;
      }

      if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
        toast.error("Le token Revolut a expiré. Reconnectez-vous sur /revolut-connect.");
        setSyncingRevolut(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("revolut-transactions");
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const revolutTxs: any[] = data?.transactions || [];
      if (revolutTxs.length === 0) {
        toast.info("Aucune transaction Revolut récupérée depuis l'API.");
        setSyncingRevolut(false);
        return;
      }

      // Get existing Revolut references to avoid duplicates
      const { data: existing } = await supabase
        .from("transactions_bancaires")
        .select("reference")
        .eq("banque", "Revolut Pro")
        .not("reference", "is", null);
      const existingRefs = new Set((existing || []).map(e => e.reference));

      const completedTxs = revolutTxs.filter((tx: any) => tx.state === "completed" && tx.legs?.length > 0);
      const inserts = completedTxs
        .filter((tx: any) => !existingRefs.has(tx.id))
        .map((tx: any) => {
          const leg = tx.legs[0];
          const desc = tx.description || tx.reference || leg.description || "—";
          const dateStr = (tx.completed_at || tx.created_at || "").slice(0, 10);
          return {
            date_operation: dateStr,
            libelle: desc.slice(0, 100),
            montant: leg.amount,
            solde: null as number | null,
            banque: "Revolut Pro",
            reference: tx.id,
            statut: "non_justifie",
            source: "revolut_api",
          };
        });

      const skipped = completedTxs.length - inserts.length;

      if (inserts.length === 0) {
        toast.info(`Toutes les ${completedTxs.length} transactions Revolut sont déjà synchronisées.`);
        setSyncingRevolut(false);
        return;
      }

      const { error: insertErr } = await supabase.from("transactions_bancaires").insert(inserts);
      if (insertErr) throw insertErr;

      const msg = skipped > 0
        ? `${inserts.length} nouvelles transactions Revolut synchronisées, ${skipped} déjà présentes ignorées.`
        : `${inserts.length} transactions Revolut synchronisées !`;
      toast.success(msg);
      await fetchAll();
    } catch (err) {
      toast.error("Erreur sync Revolut : " + (err instanceof Error ? err.message : "Erreur"));
    }
    setSyncingRevolut(false);
  };

  const quickUpdate = async (id: string, updates: Partial<Transaction>) => {
    await supabase.from("transactions_bancaires").update(updates).eq("id", id);
    await fetchAll();
  };

  const saveEdit = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    await supabase.from("transactions_bancaires").update(editForm).eq("id", id);
    setEditingId(null);
    // Auto-catégoriser les transactions similaires si une catégorie a été choisie
    if (tx && editForm.categorie) {
      const updatedTx = { ...tx, ...editForm } as Transaction;
      const similar = await autoCategorizeSimilar(updatedTx, editForm.categorie);
      if (similar > 0) {
        toast.success(`Sauvegardé ! ${similar} transaction(s) similaire(s) auto-catégorisée(s) ✨`);
      } else {
        toast.success("Mise à jour !");
      }
    } else {
      toast.success("Mise à jour !");
    }
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette transaction ?")) return;
    await supabase.from("transactions_bancaires").delete().eq("id", id);
    toast.success("Supprimée");
    await fetchAll();
  };

  const linkUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingJustif, setUploadingJustif] = useState(false);

  const uploadAndLinkJustificatif = async (txId: string, file: File) => {
    setUploadingJustif(true);
    try {
      const tx = transactions.find(t => t.id === txId);
      // Sanitize filename for Supabase Storage (no €, accents, spaces, special chars)
      const lastDot = file.name.lastIndexOf(".");
      const ext = lastDot >= 0 ? file.name.slice(lastDot) : "";
      const base = (lastDot >= 0 ? file.name.slice(0, lastDot) : file.name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 80) || "justificatif";
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
      const path = `${Date.now()}_${base}${safeExt}`;
      const { error: upErr } = await supabase.storage
        .from("justificatifs")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("justificatifs")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);

      const { data: inserted, error: dbErr } = await supabase
        .from("justificatifs")
        .insert({
          nom_fichier: file.name,
          url: signed?.signedUrl || "",
          statut: "traite",
          date_operation: tx?.date_operation || new Date().toISOString().split("T")[0],
          montant_ttc: tx ? Math.abs(tx.montant) : null,
          fournisseur: tx?.fournisseur_client || null,
          categorie: tx?.categorie || null,
        })
        .select()
        .single();
      if (dbErr) throw dbErr;

      if (inserted?.id) {
        await linkJustificatif(txId, inserted.id);
        toast.success("Justificatif téléversé et associé !");
      }
    } catch (err) {
      toast.error("Erreur upload : " + (err instanceof Error ? err.message : "inconnu"));
    }
    setUploadingJustif(false);
  };

  const openLinkDialog = async (txId: string) => {
    setLinkDialogId(txId);
    setMatchSuggestion(null);
    const tx = transactions.find(t => t.id === txId);
    if (!tx || justificatifs.length === 0) return;

    setMatchSuggestionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-justificatif", {
        body: {
          mode: "suggest",
          transaction: tx,
          justificatifs: justificatifs.map((j, i) => ({ ...j, _idx: i })),
        },
      });
      if (!error && data?.scores) setMatchSuggestion(data as MatchSuggestion);
    } catch { /* silently ignore */ }
    setMatchSuggestionLoading(false);
  };

  const linkJustificatif = async (txId: string, justId: string) => {
    setConfirmingLink(true);

    await supabase.from("transactions_bancaires").update({
      justificatif_id: justId,
      statut: "justifie",
    }).eq("id", txId);
    await supabase.from("justificatifs").update({ statut: "traite" }).eq("id", justId);

    setConfirmingLink(false);
    setLinkDialogId(null);
    await fetchAll();
    toast.success("Justificatif associé");
  };

  // Extraire les mots significatifs d'un libellé (>= 3 chars, non génériques)
  const extractKeywords = (libelle: string): string[] => {
    const stopWords = new Set(["les", "des", "une", "par", "sur", "pour", "avec", "dans", "virement", "paiement", "prelevement", "prlv", "sepa", "facture", "carte", "vir", "remise", "cheque", "fra", "com"]);
    return libelle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));
  };

  // Après avoir catégorisé une transaction, auto-catégoriser les similaires
  const autoCategorizeSimilar = async (sourceTx: Transaction, categorie: string): Promise<number> => {
    const sourceKeywords = extractKeywords(sourceTx.libelle);
    if (sourceKeywords.length === 0) return 0;

    const uncategorized = transactions.filter(
      t => t.id !== sourceTx.id && !t.categorie
    );

    const toUpdate: string[] = [];
    for (const tx of uncategorized) {
      const txKeywords = extractKeywords(tx.libelle);
      const commonWords = sourceKeywords.filter(w => txKeywords.includes(w));
      // Au moins 1 mot commun significatif
      if (commonWords.length >= 1) {
        toUpdate.push(tx.id);
      }
    }

    if (toUpdate.length > 0) {
      await supabase
        .from("transactions_bancaires")
        .update({ categorie })
        .in("id", toUpdate);
    }
    return toUpdate.length;
  };




  // Une transaction catégorisée est considérée comme "justifiée" même sans justificatif lié
  const effectiveStatut = (tx: Transaction): string => {
    if (tx.categorie && tx.categorie.trim() !== "" && tx.statut === "non_justifie") {
      return "justifie";
    }
    return tx.statut;
  };

  // "Catégorisé non justifié" = a une catégorie mais pas de justificatif lié
  const isCategoriseSansJustif = (tx: Transaction): boolean =>
    !!(tx.categorie && tx.categorie.trim() !== "") && !tx.justificatif_id;

  const filtered = transactions.filter(tx => {
    const eff = effectiveStatut(tx);
    const matchStatut =
      filterStatut === "tous" ||
      (filterStatut === "categorise_sans_justif"
        ? isCategoriseSansJustif(tx)
        : eff === filterStatut);
    const matchType = filterType === "tous" || (filterType === "debit" ? tx.montant < 0 : tx.montant > 0);
    const normBanque = (b: string) => b.toLowerCase().replace(/\s+/g, "");
    const matchBanque = filterBanque === "tous" || normBanque(tx.banque) === normBanque(filterBanque);
    const matchSearch = !search ||
      tx.libelle.toLowerCase().includes(search.toLowerCase()) ||
      (tx.fournisseur_client || "").toLowerCase().includes(search.toLowerCase()) ||
      (tx.categorie || "").toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchType && matchSearch && matchBanque;
  });

  // Group by month
  const grouped = filtered.reduce((acc, tx) => {
    const key = format(new Date(tx.date_operation), "MMMM yyyy", { locale: fr });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const nonJustifies = transactions.filter(t => effectiveStatut(t) === "non_justifie").length;
  const totalDebits = transactions.filter(t => t.montant < 0).reduce((s, t) => s + t.montant, 0);
  const totalCredits = transactions.filter(t => t.montant > 0).reduce((s, t) => s + t.montant, 0);
  const pctJustifie = transactions.length > 0
    ? Math.round(transactions.filter(t => { const e = effectiveStatut(t); return e === "justifie" || e === "ignore"; }).length / transactions.length * 100)
    : 0;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  // Match apprenant from transaction libelle (search uppercase name in libelle)
  const findApprenantInLibelle = (libelle: string): ApprenantWithSession | null => {
    const upper = libelle.toUpperCase();
    for (const a of apprenants) {
      const nomUpper = a.nom.toUpperCase();
      if (nomUpper.length >= 3 && upper.includes(nomUpper)) {
        return a;
      }
    }
    return null;
  };

  const formatDateShort = (d: string | null) => {
    if (!d) return null;
    try {
      return format(new Date(d), "dd/MM/yyyy");
    } catch { return d; }
  };

  const linkedJustif = (tx: Transaction) => justificatifs.find(j => j.id === tx.justificatif_id);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Non justifiées</p>
            <p className={cn("text-2xl font-bold", nonJustifies > 0 ? "text-amber-600" : "text-emerald-600")}>
              {nonJustifies}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total débits</p>
            <p className="text-2xl font-bold text-destructive">{fmt(totalDebits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Rapprochement</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{pctJustifie}%</p>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctJustifie}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import zone */}
      <Card>
        <CardContent className="pt-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all",
              "border-border hover:border-primary/50 hover:bg-muted/20"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {importing ? <RefreshCw className="h-6 w-6 text-primary animate-spin" /> : <Upload className="h-6 w-6 text-primary" />}
              </div>
              <div>
                <p className="font-semibold">Importer un relevé CSV — BNP Paribas ou Revolut Pro</p>
                <p className="text-sm text-muted-foreground">Le format est détecté automatiquement (BNP : export CSV / Revolut : Transaction statement CSV)</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={importing} className="flex-shrink-0">
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Import en cours..." : "Choisir un fichier CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={syncingRevolut}
              className="flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); handleSyncRevolut(); }}
            >
              {syncingRevolut ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {syncingRevolut ? "Sync en cours..." : "🟣 Sync Revolut API"}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); }}
          />
          {transactions.length > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                onClick={handlePurgeAll}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Supprimer toutes les transactions ({transactions.length}) et réimporter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un libellé, fournisseur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUTS.map(s => (
            <Button
              key={s.value}
              size="sm"
              variant={filterStatut === s.value ? "default" : "outline"}
              onClick={() => setFilterStatut(filterStatut === s.value ? "tous" : s.value)}
            >
              <s.icon className="h-3.5 w-3.5 mr-1" />
              {s.label}
              <Badge className="ml-1.5 h-4 px-1 text-[10px]">
                {transactions.filter(t => t.statut === s.value).length}
              </Badge>
            </Button>
          ))}
          <Button
            size="sm"
            variant={filterStatut === "categorise_sans_justif" ? "default" : "outline"}
            onClick={() => setFilterStatut(filterStatut === "categorise_sans_justif" ? "tous" : "categorise_sans_justif")}
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            Catégorisé sans justif
            <Badge className="ml-1.5 h-4 px-1 text-[10px]">
              {transactions.filter(t => isCategoriseSansJustif(t)).length}
            </Badge>
          </Button>
          <Button size="sm" variant={filterStatut === "tous" ? "default" : "outline"} onClick={() => setFilterStatut("tous")}>
            Tous
          </Button>
        </div>
        <div className="flex gap-2">
          {[{ v: "tous", l: "Tous" }, { v: "credit", l: "⬆️ Crédits" }, { v: "debit", l: "⬇️ Débits" }].map(f => (
            <Button key={f.v} size="sm" variant={filterType === f.v ? "secondary" : "ghost"} onClick={() => setFilterType(f.v)}>
              {f.l}
            </Button>
          ))}
        </div>
        {/* Filtre par banque — toujours visible */}
        <div className="flex gap-2">
          <Button size="sm" variant={filterBanque === "tous" ? "secondary" : "ghost"} onClick={() => setFilterBanque("tous")}>
            🏦 Toutes
          </Button>
          {["BNP Paribas", "Revolut Pro"].map(b => {
            const normB = (s: string) => s.toLowerCase().replace(/\s+/g, "");
            const count = transactions.filter(t => normB(t.banque) === normB(b)).length;
            return (
              <Button key={b} size="sm" variant={filterBanque === b ? "secondary" : "ghost"} onClick={() => setFilterBanque(filterBanque === b ? "tous" : b)}>
                {b === "BNP Paribas" ? "🔵 BNP" : "🟣 Revolut"}
                <Badge className="ml-1.5 h-4 px-1 text-[10px]">{count}</Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">
              {transactions.length === 0
                ? "Importez votre relevé CSV (BNP ou Revolut) pour commencer le rapprochement"
                : "Aucune transaction ne correspond aux filtres"}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([month, txs]) => {
          const monthDebit = txs.filter(t => t.montant < 0).reduce((s, t) => s + t.montant, 0);
          const monthCredit = txs.filter(t => t.montant > 0).reduce((s, t) => s + t.montant, 0);
          const monthNonJustifies = txs.filter(t => effectiveStatut(t) === "non_justifie").length;

          return (
            <div key={month} className="space-y-2">
              {/* Month header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide capitalize">{month}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {monthNonJustifies > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                      {monthNonJustifies} à justifier
                    </Badge>
                  )}
                  <span className="text-emerald-600 font-medium">{fmt(monthCredit)}</span>
                  <span className="text-destructive font-medium">{fmt(monthDebit)}</span>
                </div>
              </div>

              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {txs.map(tx => {
                    const isEditing = editingId === tx.id;
                    const isDebit = tx.montant < 0;
                    const effStatut = effectiveStatut(tx);
                    const statutCfg = getStatut(effStatut);
                    const StatutIcon = statutCfg.icon;
                    const catCfg = getCat(tx.categorie);
                    const jlié = linkedJustif(tx);
                    const matchedApprenant = !isDebit ? findApprenantInLibelle(tx.libelle) : null;

                    return (
                      <div key={tx.id} className={cn(
                        "p-4 transition-colors",
                        effStatut === "non_justifie" && isDebit ? "hover:bg-amber-50/50" : "hover:bg-muted/20",
                        isEditing && "bg-muted/30"
                      )}>
                        <div className="flex items-start gap-3">
                          {/* Direction icon */}
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            isDebit ? "bg-destructive/10" : "bg-emerald-100"
                          )}>
                            {isDebit
                              ? <ArrowUpRight className="h-4 w-4 text-destructive" />
                              : <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            }
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{tx.libelle}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.date_operation), "dd MMMM yyyy", { locale: fr })}
                                  {tx.banque && (
                                    <span className={cn(
                                      "ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                                      tx.banque.toLowerCase().includes("revolut") ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                       {tx.banque.toLowerCase().includes("bnp") ? "🔵 BNP" : tx.banque.toLowerCase().includes("revolut") ? "🟣 Revolut" : tx.banque}
                                    </span>
                                  )}
                                  {tx.solde != null && <span className="ml-2">· Solde : {fmt(tx.solde)}</span>}
                                </p>
                                {matchedApprenant && (
                                  <p className="text-[10px] text-primary font-medium mt-0.5">
                                    📅 {matchedApprenant.prenom} {matchedApprenant.nom}
                                    {" — "}
                                    {(() => {
                                      const debut = formatDateShort(matchedApprenant.session_date_debut || matchedApprenant.date_debut_formation);
                                      const fin = formatDateShort(matchedApprenant.session_date_fin || matchedApprenant.date_fin_formation);
                                      if (debut && fin) return `${debut} → ${fin}`;
                                      if (debut) return `à partir du ${debut}`;
                                      return "dates non renseignées";
                                    })()}
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={cn("font-bold text-base", isDebit ? "text-destructive" : "text-emerald-600")}>
                                  {isDebit ? "" : "+"}{fmt(tx.montant)}
                                </p>
                              </div>
                            </div>

                            {/* Editing form */}
                            {isEditing ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <Select value={editForm.categorie || ""} onValueChange={v => setEditForm(f => ({ ...f, categorie: v }))}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Catégorie..." /></SelectTrigger>
                                  <SelectContent>
                                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                {fournisseurCustomInput ? (
                                  <div className="flex gap-1">
                                    <Input
                                      placeholder="Saisie libre..."
                                      value={editForm.fournisseur_client || ""}
                                      onChange={e => setEditForm(f => ({ ...f, fournisseur_client: e.target.value }))}
                                      className="h-8 text-xs flex-1"
                                    />
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setFournisseurCustomInput(false)}>Liste</Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <Select
                                      value={editForm.fournisseur_client || ""}
                                      onValueChange={v => {
                                        if (v === "__custom__") {
                                          setFournisseurCustomInput(true);
                                        } else {
                                          setEditForm(f => ({ ...f, fournisseur_client: v }));
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Fournisseur / Client" /></SelectTrigger>
                                      <SelectContent>
                                        {fournisseursList.map(f => (
                                          <SelectItem key={f.id} value={f.nom}>{f.nom}</SelectItem>
                                        ))}
                                        <SelectItem value="__custom__">✏️ Saisie libre...</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <Input
                                  placeholder="Notes"
                                  value={editForm.notes || ""}
                                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                            ) : (
                              /* Display row */
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Statut badge */}
                                <Badge className={cn("text-[10px] gap-1", statutCfg.color)}>
                                  <StatutIcon className="h-2.5 w-2.5" />
                                  {statutCfg.label}
                                </Badge>

                                {/* Category */}
                                {tx.categorie ? (
                                  <Badge className={cn("text-[10px]", catCfg.color)}>{catCfg.label}</Badge>
                                ) : isDebit ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="text-[10px] text-amber-600 underline underline-offset-2 hover:text-amber-800"
                                      onClick={() => {
                                        setEditingId(tx.id);
                                        setFournisseurCustomInput(false);
                                        setEditForm({ categorie: tx.categorie, fournisseur_client: tx.fournisseur_client, notes: tx.notes });
                                      }}
                                    >
                                      + Catégoriser
                                    </button>
                                  </div>
                                ) : null}

                                {/* Fournisseur */}
                                {tx.fournisseur_client && (
                                  <span className="text-xs font-medium">{tx.fournisseur_client}</span>
                                )}

                                {/* Notes */}
                                {tx.notes && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.notes}</span>
                                )}

                                {/* Linked justif */}
                                {jlié && (
                                  <a href={jlié.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                                    <Link2 className="h-3 w-3" />
                                    {jlié.nom_fichier}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="default" className="h-8 px-3 text-xs"
                                  onClick={() => saveEdit(tx.id)}>Sauvegarder</Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2"
                                  onClick={() => setEditingId(null)}>Annuler</Button>
                              </>
                            ) : (
                              <>
                                {/* Quick: link justif with AI */}
                                {effStatut === "non_justifie" && isDebit && (
                                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1"
                                    onClick={() => openLinkDialog(tx.id)}>
                                    <Link2 className="h-3.5 w-3.5" />
                                    Justifier
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingId(tx.id);
                                      setFournisseurCustomInput(false);
                                      setEditForm({ categorie: tx.categorie, fournisseur_client: tx.fournisseur_client, notes: tx.notes });
                                    }}>
                                      ✏️ Modifier / Catégoriser
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openLinkDialog(tx.id)}>
                                      <Link2 className="h-4 w-4 mr-2" /> Associer un justificatif
                                    </DropdownMenuItem>
                                    {tx.statut !== "justifie" && (
                                      <DropdownMenuItem onClick={() => quickUpdate(tx.id, { statut: "justifie" })}>
                                        <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Marquer justifié
                                      </DropdownMenuItem>
                                    )}
                                    {tx.statut !== "ignore" && (
                                      <DropdownMenuItem onClick={() => quickUpdate(tx.id, { statut: "ignore" })}>
                                        <MinusCircle className="h-4 w-4 mr-2" /> Ignorer
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tx.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          );
        })
      )}

      {/* Dialog: link justificatif */}
      <Dialog open={!!linkDialogId} onOpenChange={o => { if (!o) { setLinkDialogId(null); setMatchSuggestion(null); } }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Associer un justificatif
            </DialogTitle>
          </DialogHeader>

          {/* Confirming state */}
          {confirmingLink && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
              <span className="text-sm">Association en cours...</span>
            </div>
          )}

          {/* Upload nouveau justificatif (PDF / image) */}
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 mt-2">
            <input
              ref={linkUploadInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && linkDialogId) uploadAndLinkJustificatif(linkDialogId, f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              disabled={uploadingJustif || confirmingLink}
              onClick={() => linkUploadInputRef.current?.click()}
            >
              {uploadingJustif ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Téléversement…</>
              ) : (
                <><Upload className="h-4 w-4" /> Téléverser un justificatif (PDF / image)</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Le fichier sera enregistré et associé automatiquement à cette transaction
            </p>
          </div>

          {/* Justificatif list — exclut ceux déjà liés à une autre transaction et déduplique */}
          {(() => {
            const linkedIds = new Set(
              transactions
                .filter(t => t.justificatif_id && t.id !== linkDialogId)
                .map(t => t.justificatif_id as string)
            );
            const seen = new Set<string>();
            const availableJustifs = justificatifs.filter(j => {
              if (linkedIds.has(j.id)) return false;
              if (seen.has(j.id)) return false;
              seen.add(j.id);
              return true;
            });
            return (
          <div className="space-y-2 mt-1">
            {availableJustifs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Aucun justificatif disponible — utilisez le bouton ci-dessus pour en ajouter un.
              </p>
            ) : (
              availableJustifs.map((j, idx) => {
                const tx = transactions.find(t => t.id === linkDialogId);
                const montantProche = tx && j.montant_ttc
                  ? Math.abs(Math.abs(tx.montant) - j.montant_ttc) < 1
                  : false;
                const matchScore = matchSuggestion?.scores?.find(s => s.index === idx);
                const isBestMatch = matchSuggestion?.meilleur_index === idx && (matchScore?.score ?? 0) > 30;

                return (
                  <div
                    key={j.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isBestMatch
                        ? "border-emerald-400 bg-emerald-50/60 hover:bg-emerald-50"
                        : montantProche
                        ? "border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50"
                        : "border-border hover:bg-muted/40",
                      confirmingLink && "pointer-events-none opacity-50"
                    )}
                    onClick={() => linkDialogId && !confirmingLink && linkJustificatif(linkDialogId, j.id)}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{j.nom_fichier}</p>
                        {isBestMatch && (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700">Meilleure correspondance</Badge>
                        )}
                        {montantProche && !isBestMatch && (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700">Montant ≈</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {j.fournisseur && <span className="mr-2">{j.fournisseur}</span>}
                        {j.date_operation && format(new Date(j.date_operation), "dd/MM/yyyy")}
                      </p>
                      {matchScore && matchScore.raison && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{matchScore.raison}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      {j.montant_ttc != null && (
                        <p className={cn("text-sm font-semibold",
                          montantProche || isBestMatch ? "text-emerald-600" : ""
                        )}>
                          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(j.montant_ttc)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
