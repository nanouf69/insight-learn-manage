import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  tva_rate?: number | null;
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
  { value: "cpf", label: "🎓 CPF", color: "bg-emerald-100 text-emerald-700" },
  { value: "frais_examen_cma", label: "🏛️ Paiement frais examen CMA", color: "bg-indigo-100 text-indigo-700" },
  { value: "carburant", label: "⛽ Carburant", color: "bg-orange-100 text-orange-700" },
  { value: "repas", label: "🍽️ Repas", color: "bg-yellow-100 text-yellow-700" },
  { value: "materiel", label: "🖥️ Matériel", color: "bg-blue-100 text-blue-700" },
  { value: "fournitures", label: "📎 Fournitures", color: "bg-cyan-100 text-cyan-700" },
  { value: "telephonie", label: "📱 Téléphonie & Internet", color: "bg-purple-100 text-purple-700" },
  { value: "abonnement_logiciel", label: "💻 Abonnement logiciel / CRM", color: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "loyer", label: "🏢 Loyer", color: "bg-indigo-100 text-indigo-700" },
  { value: "assurance", label: "🛡️ Assurance", color: "bg-green-100 text-green-700" },
  { value: "salaires_formateurs", label: "👨‍🏫 Formateurs", color: "bg-teal-100 text-teal-700" },
  { value: "salaire", label: "💼 Salaire", color: "bg-lime-100 text-lime-700" },
  { value: "transport", label: "🚌 Transport", color: "bg-sky-100 text-sky-700" },
  { value: "honoraires", label: "⚖️ Honoraires", color: "bg-violet-100 text-violet-700" },
  { value: "publicite", label: "📢 Publicité", color: "bg-pink-100 text-pink-700" },
  { value: "banque", label: "🏦 Frais bancaires", color: "bg-slate-100 text-slate-700" },
  { value: "impots", label: "🏛️ Impôts & taxes", color: "bg-red-100 text-red-700" },
  { value: "virement_interne", label: "🔄 Virement interne", color: "bg-gray-100 text-gray-700" },
  { value: "dividendes", label: "💰 Dividendes", color: "bg-amber-100 text-amber-700" },
  { value: "electricite", label: "⚡ Électricité", color: "bg-yellow-100 text-yellow-700" },
  { value: "entretien_locaux", label: "🧹 Entretien des locaux", color: "bg-teal-100 text-teal-700" },
  { value: "entretien_vehicule", label: "🚗 Entretien véhicule", color: "bg-blue-100 text-blue-700" },
  { value: "compte_courant_associe", label: "🏦 Compte courant associé", color: "bg-purple-100 text-purple-700" },
  { value: "frais_postaux", label: "📮 Frais postaux", color: "bg-rose-100 text-rose-700" },
  { value: "urssaf", label: "🏛️ URSSAF", color: "bg-red-100 text-red-700" },
  { value: "retraite", label: "👴 Retraite", color: "bg-stone-100 text-stone-700" },
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

export function RapprochementBancaire({ comptableToken }: { comptableToken?: string } = {}) {
  const isComptableMode = !!comptableToken;

  // Helper : invoque l'edge function comptable-rapprochement avec le token
  const invokeComptable = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("comptable-rapprochement", {
      body: { token: comptableToken, action, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [comptableToken]);

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
  const [filterMois, setFilterMois] = useState("tous"); // tous ou "1".."12"
  const [filterAnnee, setFilterAnnee] = useState("tous"); // tous ou "2025", "2026"...
  const [filterCategorie, setFilterCategorie] = useState("tous"); // tous, sans, ou value de CATEGORIES
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [linkDialogId, setLinkDialogId] = useState<string | null>(null);
  const [matchSuggestion, setMatchSuggestion] = useState<MatchSuggestion | null>(null);
  const [matchSuggestionLoading, setMatchSuggestionLoading] = useState(false);
  const [confirmingLink, setConfirmingLink] = useState(false);
  const [syncingRevolut, setSyncingRevolut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog de proposition de catégorisation en masse
  const [similarPropose, setSimilarPropose] = useState<{
    sourceTx: Transaction;
    categorie: string;
    matches: { tx: Transaction; commonWords: string[] }[];
  } | null>(null);
  const [applyingSimilar, setApplyingSimilar] = useState(false);
  const [similarSelectedIds, setSimilarSelectedIds] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    const showLoader = !options?.silent;
    if (showLoader) setLoading(true);

    // Mode comptable : tout via edge function
    if (isComptableMode) {
      try {
        const data = await invokeComptable("list");
        const txs = (data.transactions || []) as Transaction[];
        const just = (data.justificatifs || []) as Justificatif[];
        const apprenantsData = (data.apprenants || []) as any[];
        const saData = (data.session_apprenants || []) as any[];
        const fourData = (data.fournisseurs || []) as { id: string; nom: string }[];

        setTransactions(txs);
        setJustificatifs(just);
        setFournisseursList(fourData);

        const enriched: ApprenantWithSession[] = apprenantsData.map((a) => {
          const sa = saData.find((s: any) => s.apprenant_id === a.id);
          const session = sa?.sessions;
          return {
            id: a.id,
            nom: a.nom,
            prenom: a.prenom,
            civilite: a.civilite,
            email: a.email,
            adresse: a.adresse,
            code_postal: a.code_postal,
            ville: a.ville,
            formation_choisie: a.formation_choisie,
            type_apprenant: a.type_apprenant,
            montant_ttc: a.montant_ttc,
            montant_paye: a.montant_paye,
            date_paiement: a.date_paiement,
            date_debut_formation: a.date_debut_formation,
            date_fin_formation: a.date_fin_formation,
            session_date_debut: sa?.date_debut || session?.date_debut || null,
            session_date_fin: sa?.date_fin || session?.date_fin || null,
          };
        });
        setApprenants(enriched);
      } catch (err) {
        toast.error("Erreur de chargement : " + (err instanceof Error ? err.message : "inconnu"));
      }
      if (showLoader) setLoading(false);
      return;
    }

    // Mode admin : requêtes Supabase directes
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
      supabase.from("apprenants").select("id, nom, prenom, civilite, email, adresse, code_postal, ville, formation_choisie, type_apprenant, montant_ttc, montant_paye, date_paiement, date_debut_formation, date_fin_formation").is("deleted_at", null),
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
          civilite: a.civilite,
          email: a.email,
          adresse: a.adresse,
          code_postal: a.code_postal,
          ville: a.ville,
          formation_choisie: a.formation_choisie,
          type_apprenant: a.type_apprenant,
          montant_ttc: a.montant_ttc,
          montant_paye: a.montant_paye,
          date_paiement: a.date_paiement,
          date_debut_formation: a.date_debut_formation,
          date_fin_formation: a.date_fin_formation,
          session_date_debut: sa?.date_debut || session?.date_debut || null,
          session_date_fin: sa?.date_fin || session?.date_fin || null,
        };
      });
      setApprenants(enriched);
    }
    if (showLoader) setLoading(false);
  }, [isComptableMode, invokeComptable]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-confirmation des paiements Formation Continue (≥ 50 €)
  // Détecte les virements créditeurs qui matchent un apprenant FC non encore payé,
  // marque le paiement sur la fiche apprenant et envoie la convocation FC.
  const autoProcessedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading || transactions.length === 0 || apprenants.length === 0) return;
    if (isComptableMode) return; // Mode comptable : pas d'auto-traitement (réservé admin)

    const isFC = (a: ApprenantWithSession): boolean => {
      const fc = (a.formation_choisie || "").toLowerCase();
      const ta = (a.type_apprenant || "").toLowerCase();
      return fc.includes("continue") || ta.includes("continue") || ta.startsWith("fc");
    };

    const findFCApprenantInLibelle = (libelle: string): ApprenantWithSession | null => {
      const upper = libelle.toUpperCase();
      // On ne matche QUE les apprenants FC : nom OU prénom suffit (min 4 car. pour limiter les faux positifs)
      for (const a of apprenants) {
        if (!isFC(a)) continue;
        const nomUpper = (a.nom || "").toUpperCase();
        const prenomUpper = (a.prenom || "").toUpperCase();
        const nomMatch = nomUpper.length >= 4 && upper.includes(nomUpper);
        const prenomMatch = prenomUpper.length >= 4 && upper.includes(prenomUpper);
        if (nomMatch || prenomMatch) return a;
      }
      return null;
    };

    const formatFRDate = (iso: string): string => {
      try {
        return format(new Date(iso), "dd MMMM yyyy", { locale: fr });
      } catch { return iso; }
    };

    const buildConvocationBody = (
      a: ApprenantWithSession,
      bodyTemplate: string,
    ): string => {
      const formationLabel =
        (a.formation_choisie || "").toLowerCase().includes("taxi")
          ? "Formation continue TAXI"
          : "Formation continue VTC";
      const dateDebut = a.session_date_debut || a.date_debut_formation || "";
      const dateJour = format(new Date(), "dd MMMM yyyy", { locale: fr });
      const vars: Record<string, string> = {
        civilite: a.civilite || "",
        prenom: a.prenom || "",
        nom: a.nom || "",
        adresse: a.adresse || "",
        code_postal: a.code_postal || "",
        ville: a.ville || "",
        date_jour: dateJour,
        formation: formationLabel,
        date_debut: dateDebut ? formatFRDate(dateDebut) : "à confirmer",
      };
      let out = bodyTemplate;
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
      }
      return out;
    };

    (async () => {
      // Charger le template UNE SEULE FOIS
      const { data: tmpl } = await supabase
        .from("email_templates")
        .select("subject_template, body_template")
        .eq("id", "confirmation-formation-continue")
        .maybeSingle();
      if (!tmpl) {
        console.warn("[auto-FC] Template 'confirmation-formation-continue' introuvable");
        return;
      }

      const fcCount = apprenants.filter(isFC).length;
      console.log(`[auto-FC] Démarrage : ${transactions.length} tx, ${apprenants.length} apprenants (${fcCount} FC)`);

      let matched = 0;
      for (const tx of transactions) {
        if (tx.montant < 50) continue; // crédit ≥ 50€ uniquement
        if (autoProcessedRef.current.has(tx.id)) continue;
        if (tx.categorie === "recette_formation" && tx.fournisseur_client) continue; // déjà traité

        const apprenant = findFCApprenantInLibelle(tx.libelle);
        if (!apprenant) continue;
        if (!apprenant.email) {
          console.warn(`[auto-FC] Match ${apprenant.prenom} ${apprenant.nom} mais sans email — skip`);
          continue;
        }
        if (apprenant.date_paiement && (apprenant.montant_paye || 0) > 0) continue; // déjà marqué payé
        matched++;
        console.log(`[auto-FC] Match : tx ${tx.id} (${tx.montant}€, ${tx.libelle}) → ${apprenant.prenom} ${apprenant.nom}`);

        autoProcessedRef.current.add(tx.id);

        try {
          // 1) Marquer le paiement sur la fiche apprenant
          await supabase
            .from("apprenants")
            .update({
              montant_paye: tx.montant,
              date_paiement: tx.date_operation,
              moyen_paiement: "Virement",
            })
            .eq("id", apprenant.id);

          // 2) Catégoriser la transaction (recette + nom apprenant)
          await supabase
            .from("transactions_bancaires")
            .update({
              categorie: "recette_formation",
              fournisseur_client: `${apprenant.prenom} ${apprenant.nom}`,
              statut: "justifie",
            })
            .eq("id", tx.id);

          // 3) Envoyer la convocation FC
          const subject = (tmpl.subject_template || "")
            .replace(/{{\s*prenom\s*}}/g, apprenant.prenom)
            .replace(/{{\s*nom\s*}}/g, apprenant.nom);
          const body = buildConvocationBody(apprenant, tmpl.body_template || "");

          await supabase.functions.invoke("sync-outlook-emails", {
            body: {
              action: "send",
              userEmail: "contact@ftransport.fr",
              to: apprenant.email,
              subject,
              body,
              apprenantId: apprenant.id,
            },
          });

          toast.success(
            `💸 Paiement reçu de ${apprenant.prenom} ${apprenant.nom} (${fmt(tx.montant)}) — convocation FC envoyée`,
            { duration: 6000 }
          );
        } catch (err) {
          console.error("[auto-FC] Erreur traitement", apprenant.id, err);
          autoProcessedRef.current.delete(tx.id); // permet retry au prochain refresh
        }
      }
      console.log(`[auto-FC] Terminé : ${matched} match(es) traité(s)`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, apprenants, loading]);


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

  const preserveScroll = async (fn: () => Promise<void>) => {
    const y = window.scrollY;
    await fn();
    const restore = () => window.scrollTo({ top: y, left: 0, behavior: "auto" });
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    window.setTimeout(restore, 150);
  };

  // Après avoir mis à jour une transaction, propose la même catégorisation pour les similaires
  const proposeSimilarIfNeeded = (sourceTx: Transaction, categorie: string | null | undefined) => {
    if (!categorie) return;
    const updatedTx = { ...sourceTx, categorie } as Transaction;
    const matches = findSimilarUncategorized(updatedTx);
    if (matches.length > 0) {
      setSimilarPropose({ sourceTx: updatedTx, categorie, matches });
      setSimilarSelectedIds(new Set(matches.map(m => m.tx.id)));
    }
  };

  const quickUpdate = async (id: string, updates: Partial<Transaction>) => {
    const tx = transactions.find(t => t.id === id);
    await preserveScroll(async () => {
      // Update optimiste local pour éviter le flash de re-render
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } as Transaction : t));
      if (isComptableMode) {
        await invokeComptable("update", { id, updates });
      } else {
        await supabase.from("transactions_bancaires").update(updates).eq("id", id);
      }
      await fetchAll({ silent: true });
    });
    // Si une catégorie vient d'être posée, proposer la propagation
    if (tx && updates.categorie && updates.categorie !== tx.categorie) {
      proposeSimilarIfNeeded(tx, updates.categorie);
    }
  };

  const saveEdit = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    const newCategorie = editForm.categorie;
    const categorieChanged = !!(tx && newCategorie && newCategorie !== tx.categorie);
    await preserveScroll(async () => {
      // Update optimiste local
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...editForm } as Transaction : t));
      if (isComptableMode) {
        await invokeComptable("update", { id, updates: editForm });
      } else {
        await supabase.from("transactions_bancaires").update(editForm).eq("id", id);
      }
      setEditingId(null);
      toast.success("Mise à jour !");
      await fetchAll({ silent: true });
    });
    // Proposer la propagation après le re-render
    if (tx && categorieChanged) {
      proposeSimilarIfNeeded(tx, newCategorie);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette transaction ?")) return;
    if (isComptableMode) {
      await invokeComptable("delete", { id });
    } else {
      await supabase.from("transactions_bancaires").delete().eq("id", id);
    }
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

    if (isComptableMode) {
      try {
        await invokeComptable("link_justificatif", {
          transaction_id: txId,
          justificatif_id: justId,
        });
      } catch (err) {
        toast.error("Erreur : " + (err instanceof Error ? err.message : "inconnu"));
        setConfirmingLink(false);
        return;
      }
    } else {
      await supabase.from("transactions_bancaires").update({
        justificatif_id: justId,
        statut: "justifie",
      }).eq("id", txId);
      await supabase.from("justificatifs").update({ statut: "traite" }).eq("id", justId);
    }

    await preserveScroll(async () => {
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, justificatif_id: justId, statut: "justifie" } : t));
      setJustificatifs(prev => prev.map(j => j.id === justId ? { ...j, statut: "traite" } : j));
      setConfirmingLink(false);
      setLinkDialogId(null);
      await fetchAll({ silent: true });
      toast.success("Justificatif associé");
    });
  };

  // Extraire les mots significatifs d'un libellé (>= 3 chars, non génériques)
  const extractKeywords = (libelle: string): string[] => {
    const forcedKeywords = new Set(["cma", "cmar", "cpf"]);
    const stopWords = new Set([
      "les", "des", "une", "par", "sur", "pour", "avec", "dans", "aux", "sans", "son", "ses", "que", "qui",
      "virement", "paiement", "prelevement", "prlv", "sepa", "facture", "carte", "vir", "remise", "cheque",
      "fra", "com", "ech", "ref", "mdt", "emetteur", "id", "rum", "icr", "ics", "rib", "iban", "bic",
      "achat", "retrait", "depot", "frais", "commission", "interets", "interet", "valeur",
      "date", "mois", "annee", "jour", "the", "and", "from", "via",
    ]);
    return libelle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => {
        if (forcedKeywords.has(w)) return true;
        if (w.length < 4) return false;
        if (stopWords.has(w)) return false;
        // ignorer tokens purement numériques (références, dates)
        if (/^\d+$/.test(w)) return false;
        // ignorer tokens ressemblant à des références (chiffres + lettres mélangés, peu lisibles)
        const digits = (w.match(/\d/g) || []).length;
        if (digits > 0 && digits >= w.length / 2) return false;
        return true;
      });
  };

  // Suggérer une catégorie basée sur des transactions similaires déjà catégorisées
  const suggestCategorieFromSimilar = (tx: Transaction): { categorie: string | null; fournisseur_client: string | null } => {
    const sourceKeywords = extractKeywords(tx.libelle);
    if (sourceKeywords.length === 0) return { categorie: null, fournisseur_client: null };

    // Comptage des catégories trouvées sur transactions similaires déjà catégorisées
    const counts = new Map<string, { count: number; fournisseur: string | null }>();
    for (const other of transactions) {
      if (other.id === tx.id || !other.categorie || other.categorie === "autre") continue;
      const otherKeywords = extractKeywords(other.libelle);
      const common = sourceKeywords.filter(w => otherKeywords.includes(w));
      if (common.length >= 1) {
        const existing = counts.get(other.categorie);
        counts.set(other.categorie, {
          count: (existing?.count || 0) + 1,
          fournisseur: existing?.fournisseur || other.fournisseur_client || null,
        });
      }
    }
    if (counts.size === 0) return { categorie: null, fournisseur_client: null };

    // Catégorie la plus fréquente
    let best: { cat: string; count: number; fournisseur: string | null } | null = null;
    counts.forEach((v, cat) => {
      if (!best || v.count > best.count) best = { cat, count: v.count, fournisseur: v.fournisseur };
    });
    return { categorie: best!.cat, fournisseur_client: best!.fournisseur };
  };

  // Trouver les transactions sans vraie catégorisation (vide ou "Autre") qui partagent un mot significatif
  const findSimilarUncategorized = (sourceTx: Transaction): { tx: Transaction; commonWords: string[] }[] => {
    const sourceKeywords = extractKeywords(sourceTx.libelle);
    if (sourceKeywords.length === 0) return [];
    const results: { tx: Transaction; commonWords: string[] }[] = [];
    for (const tx of transactions) {
      if (tx.id === sourceTx.id) continue;
      if (tx.categorie && tx.categorie.trim() !== "" && tx.categorie !== "autre") continue;
      const txKeywords = extractKeywords(tx.libelle);
      const commonWords = sourceKeywords.filter(w => txKeywords.includes(w));
      if (commonWords.length >= 1) {
        results.push({ tx, commonWords: Array.from(new Set(commonWords)) });
      }
    }
    return results;
  };

  // Appliquer la catégorisation aux transactions sélectionnées
  const applyCategorieToTransactions = async (ids: string[], categorie: string): Promise<number> => {
    if (ids.length === 0) return 0;
    if (isComptableMode) {
      await invokeComptable("bulk_update_categorie", { ids, categorie });
    } else {
      await supabase
        .from("transactions_bancaires")
        .update({ categorie })
        .in("id", ids);
    }
    return ids.length;
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
    const d = tx.date_operation ? new Date(tx.date_operation) : null;
    const matchAnnee = filterAnnee === "tous" || (d && String(d.getFullYear()) === filterAnnee);
    const matchMois = filterMois === "tous" || (d && String(d.getMonth() + 1) === filterMois);
    const matchCategorie =
      filterCategorie === "tous" ||
      (filterCategorie === "sans"
        ? !tx.categorie || tx.categorie.trim() === ""
        : tx.categorie === filterCategorie);
    return matchStatut && matchType && matchSearch && matchBanque && matchAnnee && matchMois && matchCategorie;
  });

  // Liste des années et mois disponibles dans les transactions
  const anneesDisponibles = Array.from(new Set(
    transactions
      .map(t => t.date_operation ? new Date(t.date_operation).getFullYear() : null)
      .filter((y): y is number => y !== null)
  )).sort((a, b) => b - a);
  const MOIS_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // Group by month
  const grouped = filtered.reduce((acc, tx) => {
    const key = format(new Date(tx.date_operation), "MMMM yyyy", { locale: fr });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Numérotation globale des lignes filtrées (1-indexée) pour affichage "n / total"
  const filteredIndexById = new Map<string, number>();
  filtered.forEach((t, i) => filteredIndexById.set(t.id, i + 1));
  const filteredTotal = filtered.length;

  const nonJustifies = transactions.filter(t => effectiveStatut(t) === "non_justifie").length;
  const totalDebits = transactions.filter(t => t.montant < 0).reduce((s, t) => s + t.montant, 0);
  const totalCredits = transactions.filter(t => t.montant > 0).reduce((s, t) => s + t.montant, 0);
  const pctJustifie = transactions.length > 0
    ? Math.round(transactions.filter(t => { const e = effectiveStatut(t); return e === "justifie" || e === "ignore"; }).length / transactions.length * 100)
    : 0;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  // Totaux pour les transactions actuellement filtrées (statut + catégorie + type + ...)
  const filteredCredits = filtered.filter(t => t.montant > 0).reduce((s, t) => s + t.montant, 0);
  const filteredDebits = filtered.filter(t => t.montant < 0).reduce((s, t) => s + t.montant, 0);
  const filteredNet = filteredCredits + filteredDebits;

  // Libellés affichés selon les filtres
  const statutLabel = (() => {
    if (filterStatut === "tous") return "Tous statuts";
    if (filterStatut === "categorise_sans_justif") return "Catégorisé sans justif";
    return STATUTS.find(s => s.value === filterStatut)?.label || filterStatut;
  })();
  const categorieLabel = filterCategorie === "tous"
    ? "Toutes catégories"
    : filterCategorie === "sans"
      ? "Sans catégorie"
      : (CATEGORIES.find(c => c.value === filterCategorie)?.label || filterCategorie);
  const typeLabel = filterType === "tous" ? "Tous" : filterType === "credit" ? "Crédits" : "Débits";

  // Export PDF de la liste filtrée
  const handleDownloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTableMod: any = await import("jspdf-autotable");
      const autoTable = autoTableMod.default || autoTableMod;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      doc.setFontSize(14);
      doc.text("Rapprochement bancaire — Export", 14, 14);
      doc.setFontSize(10);
      const filtresLigne = `Statut: ${statutLabel} | Catégorie: ${categorieLabel} | Type: ${typeLabel} | Banque: ${filterBanque === "tous" ? "Toutes" : filterBanque} | Année: ${filterAnnee === "tous" ? "Toutes" : filterAnnee} | Mois: ${filterMois === "tous" ? "Tous" : (MOIS_LABELS[parseInt(filterMois) - 1] || filterMois)}`;
      doc.text(filtresLigne, 14, 21);
      doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 27);

      const rows = filtered.map(t => [
        t.date_operation ? format(new Date(t.date_operation), "dd/MM/yyyy") : "",
        t.banque || "",
        (t.libelle || "").slice(0, 80),
        t.categorie || "—",
        t.statut || "",
        fmt(t.montant),
      ]);

      autoTable(doc, {
        startY: 32,
        head: [["Date", "Banque", "Libellé", "Catégorie", "Statut", "Montant"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 5: { halign: "right" } },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 40;
      doc.setFontSize(10);
      doc.text(`Total crédits : ${fmt(filteredCredits)}`, 14, finalY + 8);
      doc.text(`Total débits  : ${fmt(filteredDebits)}`, 14, finalY + 14);
      doc.setFont(undefined, "bold");
      doc.text(`Solde net     : ${fmt(filteredNet)}`, 14, finalY + 20);
      doc.text(`Nombre de transactions : ${filtered.length}`, 120, finalY + 20);

      doc.save(`rapprochement_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
      toast.success("PDF téléchargé");
    } catch (e: any) {
      toast.error("Erreur PDF: " + (e?.message || e));
    }
  };

  // Export Excel de la liste filtrée
  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      // Catégories sans TVA récupérable
      const NO_TVA = new Set([
        "impots", "salaire", "salaires_formateurs", "urssaf", "retraite",
        "banque", "virement_interne", "dividendes", "compte_courant_associe",
        "frais_examen_cma", "cpf", "recette_formation",
      ]);
      const TVA_RATE = 0.20;
      const rows = filtered.map(t => {
        const ttc = Number(t.montant) || 0;
        const noTva = !t.categorie || NO_TVA.has(t.categorie);
        const ht = noTva ? ttc : +(ttc / (1 + TVA_RATE)).toFixed(2);
        const tva = noTva ? 0 : +(ttc - ht).toFixed(2);
        return {
          Date: t.date_operation ? format(new Date(t.date_operation), "dd/MM/yyyy") : "",
          Banque: t.banque || "",
          Libellé: t.libelle || "",
          Catégorie: (CATEGORIES.find(c => c.value === t.categorie)?.label || t.categorie || "—"),
          Statut: STATUTS.find(s => s.value === t.statut)?.label || t.statut || "",
          "Fournisseur/Client": t.fournisseur_client || "",
          "HT": ht,
          "TVA (20%)": tva,
          "TTC": ttc,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      // Format monétaire €
      const range = XLSX.utils.decode_range(ws["!ref"] as string);
      for (let R = 1; R <= range.e.r; R++) {
        for (const C of [6, 7, 8]) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr]) ws[addr].z = '#,##0.00 €;[Red]-#,##0.00 €';
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapprochement");

      const totalTTC = rows.reduce((s, r) => s + r.TTC, 0);
      const totalHT = rows.reduce((s, r) => s + r.HT, 0);
      const totalTVA = rows.reduce((s, r) => s + r["TVA (20%)"], 0);

      const summary = [
        ["Filtres", `${statutLabel} · ${categorieLabel} · ${typeLabel}`],
        ["Banque", filterBanque === "tous" ? "Toutes" : filterBanque],
        ["Année", filterAnnee === "tous" ? "Toutes" : filterAnnee],
        ["Mois", filterMois === "tous" ? "Tous" : (MOIS_LABELS[parseInt(filterMois) - 1] || filterMois)],
        ["Nombre de transactions", filtered.length],
        ["Total crédits (TTC)", filteredCredits],
        ["Total débits (TTC)", filteredDebits],
        ["Solde net (TTC)", filteredNet],
        ["Total HT", totalHT],
        ["Total TVA (20%)", totalTVA],
        ["Total TTC", totalTTC],
        ["Généré le", format(new Date(), "dd/MM/yyyy HH:mm")],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, "Résumé");

      XLSX.writeFile(wb, `rapprochement_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
      toast.success("Excel téléchargé");
    } catch (e: any) {
      toast.error("Erreur Excel: " + (e?.message || e));
    }
  };
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

      {/* Import zone — uniquement pour les admins */}
      {!isComptableMode && (
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
      )}

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
        {/* Filtre par mois et année */}
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterAnnee} onValueChange={setFilterAnnee}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">📅 Toutes années</SelectItem>
              {anneesDisponibles.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMois} onValueChange={setFilterMois}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">🗓️ Tous les mois</SelectItem>
              {MOIS_LABELS.map((label, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategorie} onValueChange={setFilterCategorie}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">🏷️ Toutes catégories</SelectItem>
              <SelectItem value="sans">⚪ Sans catégorie</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterMois !== "tous" || filterAnnee !== "tous" || filterCategorie !== "tous") && (
            <Button size="sm" variant="ghost" onClick={() => { setFilterMois("tous"); setFilterAnnee("tous"); setFilterCategorie("tous"); }}>
              ✕ Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Bannière de totaux des transactions filtrées + export PDF */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-medium">{filtered.length} transaction(s)</span>
              <span className="text-muted-foreground">— {statutLabel} · {categorieLabel} · {typeLabel}</span>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <span className="text-emerald-600 font-semibold">⬆ {fmt(filteredCredits)}</span>
              <span className="text-destructive font-semibold">⬇ {fmt(filteredDebits)}</span>
              <span className={cn("font-bold px-2 py-0.5 rounded", filteredNet >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                Net : {fmt(filteredNet)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={handleDownloadPdf} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              PDF ({filtered.length})
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadExcel} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Excel ({filtered.length})
            </Button>
          </div>
        </CardContent>
      </Card>

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
                          {/* Direction icon + line number */}
                          <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center",
                              isDebit ? "bg-destructive/10" : "bg-emerald-100"
                            )}>
                              {isDebit
                                ? <ArrowUpRight className="h-4 w-4 text-destructive" />
                                : <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                              }
                            </div>
                            <span className="text-[9px] text-muted-foreground tabular-nums leading-none">
                              {filteredIndexById.get(tx.id)}/{filteredTotal}
                            </span>
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
                                        const suggestion = !tx.categorie ? suggestCategorieFromSimilar(tx) : { categorie: null, fournisseur_client: null };
                                        setEditingId(tx.id);
                                        setFournisseurCustomInput(false);
                                        setEditForm({
                                          categorie: tx.categorie || suggestion.categorie,
                                          fournisseur_client: tx.fournisseur_client || suggestion.fournisseur_client,
                                          notes: tx.notes,
                                        });
                                        if (!tx.categorie && suggestion.categorie) {
                                          const catLabel = CATEGORIES.find(c => c.value === suggestion.categorie)?.label || suggestion.categorie;
                                          toast.info(`Catégorie suggérée : ${catLabel} (libellé similaire détecté)`);
                                        }
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
                                      const suggestion = !tx.categorie ? suggestCategorieFromSimilar(tx) : { categorie: null, fournisseur_client: null };
                                      setEditingId(tx.id);
                                      setFournisseurCustomInput(false);
                                      setEditForm({
                                        categorie: tx.categorie || suggestion.categorie,
                                        fournisseur_client: tx.fournisseur_client || suggestion.fournisseur_client,
                                        notes: tx.notes,
                                      });
                                      if (!tx.categorie && suggestion.categorie) {
                                        const catLabel = CATEGORIES.find(c => c.value === suggestion.categorie)?.label || suggestion.categorie;
                                        toast.info(`Catégorie suggérée : ${catLabel} (libellé similaire détecté)`);
                                      }
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

      {/* Dialog : proposition de catégorisation en masse */}
      <Dialog open={!!similarPropose} onOpenChange={(open) => { if (!open) { setSimilarPropose(null); setSimilarSelectedIds(new Set()); } }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              ✨ Catégoriser les transactions similaires
            </DialogTitle>
          </DialogHeader>
          {similarPropose && (() => {
            const catLabel = CATEGORIES.find(c => c.value === similarPropose.categorie)?.label || similarPropose.categorie;
            const allIds = similarPropose.matches.map(m => m.tx.id);
            const allChecked = allIds.length > 0 && allIds.every(id => similarSelectedIds.has(id));
            const someChecked = allIds.some(id => similarSelectedIds.has(id));
            const selectedCount = similarSelectedIds.size;
            const toggleAll = () => {
              if (allChecked) setSimilarSelectedIds(new Set());
              else setSimilarSelectedIds(new Set(allIds));
            };
            const toggleOne = (id: string) => {
              setSimilarSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            };
            return (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Vous venez de catégoriser <span className="font-medium text-foreground">"{similarPropose.sourceTx.libelle}"</span> en <Badge variant="secondary">{catLabel}</Badge>.
                </div>
                <div className="text-sm flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <strong>{similarPropose.matches.length}</strong> autre(s) transaction(s) non catégorisée(s) partagent un mot commun. Décochez celles à exclure.
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {allChecked ? "Tout décocher" : "Tout cocher"}
                  </Button>
                </div>
                <div className="border rounded-lg divide-y max-h-[60vh] overflow-y-auto">
                  {similarPropose.matches.map(({ tx, commonWords }) => {
                    const checked = similarSelectedIds.has(tx.id);
                    return (
                      <label
                        key={tx.id}
                        className={`p-3 text-sm flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${checked ? "" : "opacity-50"}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(tx.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="break-words" title={tx.libelle}>{tx.libelle}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(parse(tx.date_operation, "yyyy-MM-dd", new Date()), "dd MMM yyyy", { locale: fr })}
                            {" — "}
                            <span className="font-medium">
                              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(tx.montant)}
                            </span>
                          </div>
                          <div className="text-xs mt-1 flex flex-wrap gap-1">
                            {commonWords.map(w => (
                              <Badge key={w} variant="outline" className="text-[10px]">{w}</Badge>
                            ))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setSimilarPropose(null); setSimilarSelectedIds(new Set()); }} disabled={applyingSimilar}>
                    Non, garder tel quel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!similarPropose) return;
                      const ids = Array.from(similarSelectedIds);
                      if (ids.length === 0) {
                        toast.error("Aucune transaction sélectionnée");
                        return;
                      }
                      setApplyingSimilar(true);
                      try {
                        // Update optimiste
                        setTransactions(prev => prev.map(t =>
                          ids.includes(t.id) ? { ...t, categorie: similarPropose.categorie } : t
                        ));
                        await applyCategorieToTransactions(ids, similarPropose.categorie);
                        toast.success(`${ids.length} transaction(s) catégorisée(s) ✨`);
                        setSimilarPropose(null);
                        setSimilarSelectedIds(new Set());
                        await fetchAll({ silent: true });
                      } catch (err) {
                        toast.error("Erreur : " + (err instanceof Error ? err.message : "inconnu"));
                      } finally {
                        setApplyingSimilar(false);
                      }
                    }}
                    disabled={applyingSimilar || selectedCount === 0}
                  >
                    {applyingSimilar ? "Application..." : `Oui, appliquer aux ${selectedCount}`}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
