import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parseDateRange } from "@/lib/parseDateRange";
import { Plus, Loader2, CalendarIcon, Users, FileText, Receipt, Upload, Trash2, Eye, CalendarDays, BarChart3, Mail, Send, Inbox, PenLine, FolderOpen, Download, TrendingUp, BookOpen, GraduationCap, Search, X, ChevronRight, ClipboardSignature } from "lucide-react";
import { generateEmargementFormateurJour } from "@/lib/pdf/emargement-formateur-jour";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { FinancialCharts } from "@/components/comptabilite/FinancialCharts";
import { Textarea } from "@/components/ui/textarea";
import logoFtransport from "@/assets/logo-ftransport.png";
import { RapprochementBancaire } from "@/components/comptabilite/RapprochementBancaire";
import { FormateurResultsTab } from "@/components/fournisseurs/FormateurResultsTab";
import { FormateurQuizViewer } from "@/components/fournisseurs/FormateurQuizViewer";
import { EditableQuizViewer } from "@/components/fournisseurs/EditableQuizViewer";
import { REGLEMENTATION_NATIONALE_EXERCICES, REGLEMENTATION_LOCALE_EXERCICES } from "@/components/cours-en-ligne/exercices/reglementation-exercices-data";
import { CONNAISSANCES_VILLE_QUIZZES } from "@/components/cours-en-ligne/exercices/connaissances-ville-quiz-data";
import { EQUIPEMENTS_TAXI_DATA } from "@/components/cours-en-ligne/equipements-taxi-data";
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from "@/components/cours-en-ligne/controle-connaissances-taxi-data";
import { BILAN_EXAMEN_TA } from "@/components/cours-en-ligne/bilan-examen-ta-data";
import { BILAN_EXERCICES_TA } from "@/components/cours-en-ligne/bilan-exercices-ta-data";
import { CAS_PRATIQUE_TAXI_EXERCICES } from "@/components/cours-en-ligne/cas-pratique-taxi-exercices-data";
import { NotesFraisTab } from "@/components/comptabilite/NotesFraisTab";
import { Badge } from "@/components/ui/badge";
import CoursPublic from "@/pages/CoursPublic";
import { filterFutureExamDates, filterFutureDateStrings } from "@/lib/filterPastDates";

// Dates formations (same as ApprenantForm)
const datesFormations = {
  vtc: { label: "Formation VTC", dates: filterFutureDateStrings(["Du 12 au 25 janvier 2026", "Du 16 au 30 mars 2026", "Du 11 au 24 mai 2026", "Du 6 au 19 juillet 2026", "Du 14 au 27 septembre 2026", "Du 2 au 15 novembre 2026"]) },
  taxi: { label: "Formation TAXI", dates: filterFutureDateStrings(["Du 5 au 26 janvier 2026", "Du 9 au 30 mars 2026", "Du 4 au 25 mai 2026", "Du 29 juin au 20 juillet 2026", "Du 7 au 28 septembre 2026", "Du 26 octobre au 16 novembre 2026"]) },
  ta: { label: "Formation TAXI pour chauffeur VTC (TA)", dates: filterFutureDateStrings(["Du 5 au 26 janvier 2026", "Du 9 au 30 mars 2026", "Du 4 au 25 mai 2026", "Du 29 juin au 20 juillet 2026", "Du 7 au 28 septembre 2026", "Du 26 octobre au 16 novembre 2026"]) }
};

// Dates centralisées
import { ALL_DATES_EXAMEN_THEORIQUE_SHORT, ALL_DATES_EXAMEN_PRATIQUE } from '@/lib/examDatesConfig';
const datesExamenTheorique = filterFutureExamDates(ALL_DATES_EXAMEN_THEORIQUE_SHORT);
const datesExamenPratique = filterFutureDateStrings(ALL_DATES_EXAMEN_PRATIQUE);
const datesFormationContinue = filterFutureDateStrings([
  "26 et 27 mai 2026",
  "23 et 24 juin 2026",
  "21 et 22 juillet 2026",
  "29 et 30 septembre 2026",
  "28 et 29 octobre 2026",
  "17 et 18 novembre 2026",
  "23 et 24 décembre 2026",
]);

const prixFormations: Record<string, string> = {
  "vtc": "1099", "vtc-exam": "1599", "taxi": "1299", "taxi-exam": "1799",
  "passerelle-taxi": "999", "vtc-elearning-1099": "1099", "vtc-elearning": "1599",
  "taxi-elearning": "1299", "passerelle-taxi-elearning": "999", "passerelle-vtc-elearning": "499",
  "vtc-e-presentiel": "1599", "taxi-e-presentiel": "1799", "ta-e-presentiel": "999",
  "continue-vtc": "200", "continue-taxi": "299",
  "marketing-digital-24h": "1500", "marketing-digital-26h": "2100", "marketing-digital-28h": "3300",
  "anglais-17h": "1200", "anglais-28h": "2000", "anglais-35h": "3000", "anglais-45h": "4500"
};

const formationToType: Record<string, string> = {
  "vtc": "vtc", "vtc-exam": "vtc", "vtc-elearning-1099": "vtc-e", "vtc-elearning": "vtc-e",
  "taxi": "taxi", "taxi-exam": "taxi", "taxi-elearning": "taxi-e",
  "passerelle-taxi": "ta", "passerelle-taxi-elearning": "ta-e", "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel", "taxi-e-presentiel": "taxi-e-presentiel", "ta-e-presentiel": "ta-e-presentiel",
  "continue-vtc": "vtc", "continue-taxi": "taxi",
  "marketing-digital-24h": "marketing-digital", "marketing-digital-26h": "marketing-digital", "marketing-digital-28h": "marketing-digital",
  "anglais-17h": "anglais", "anglais-28h": "anglais", "anglais-35h": "anglais", "anglais-45h": "anglais"
};

// Filtre : on n'affiche que les COURS dans le planning fournisseur (pas les examens)
function isCoursBloc(bloc: { discipline_nom?: string | null; formation?: string | null }): boolean {
  const d = (bloc.discipline_nom ?? '').trim().toLowerCase();
  const f = (bloc.formation ?? '').trim().toLowerCase();
  const text = `${d} ${f}`;
  // GARDER uniquement "Examen blanc" (cours d'entraînement)
  if (/examen\s+blanc/i.test(text)) return true;
  // EXCLURE tout ce qui contient "examen" (pratique, théorique, individuel, CMA, etc.)
  if (/examen/i.test(text)) return false;
  return true;
}

interface FournisseurApprenant {
  id: string;
  nom: string;
  prenom: string;
  formation_choisie: string | null;
  created_at: string;
}

interface FournisseurDocument {
  id: string;
  titre: string;
  nom_fichier: string;
  url: string;
  fournisseur_apprenant_id: string;
  created_at: string;
}

interface FournisseurFacture {
  id: string;
  nom_fichier: string;
  url: string;
  destinataire: string;
  montant: number | null;
  description: string | null;
  created_at: string;
}

interface SearchedApprenant {
  id: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
  modules_autorises: number[] | null;
}

const FormateurApprenantSearchPreview = ({ token }: { token: string }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedApprenant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedApprenant, setSelectedApprenant] = useState<SearchedApprenant | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: respData } = await supabase.functions.invoke("search-apprenants-formateur", {
          body: { token, query: query.trim() },
        });
        setResults((respData?.data as SearchedApprenant[]) || []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, token]);

  if (selectedApprenant) {
    return (
      <div className="border rounded-xl overflow-hidden bg-background">
        <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Vue de {selectedApprenant.prenom} {selectedApprenant.nom}
            </span>
            {selectedApprenant.type_apprenant && (
              <Badge variant="secondary" className="text-xs">{selectedApprenant.type_apprenant}</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedApprenant(null)}>
            <X className="w-4 h-4 mr-1" /> Fermer
          </Button>
        </div>
        <CoursPublic embedded apprenantOverride={selectedApprenant} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden bg-background">
        <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Aperçu de l'interface apprenant</span>
        </div>
        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-bold text-center">Rechercher un apprenant</h2>
            <p className="text-sm text-muted-foreground text-center">Tapez le nom ou prénom pour accéder à la vue de l'apprenant</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou prénom..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {searching && <p className="text-sm text-muted-foreground text-center">Recherche...</p>}
            {results.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedApprenant(a)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{a.prenom} {a.nom}</span>
                      {a.type_apprenant && (
                        <Badge variant="outline" className="ml-2 text-xs">{a.type_apprenant}</Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Aucun apprenant trouvé</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FournisseurPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fournisseur, setFournisseur] = useState<{ id: string; nom: string; factures_only?: boolean; formateur_id?: string | null; comptable_only?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("apprenants");

  // Apprenants list
  const [apprenants, setApprenants] = useState<FournisseurApprenant[]>([]);
  const [documents, setDocuments] = useState<FournisseurDocument[]>([]);
  const [crmDocuments, setCrmDocuments] = useState<any[]>([]);
  const [factures, setFactures] = useState<FournisseurFacture[]>([]);
  const [planning, setPlanning] = useState<any[]>([]);
  const [emargements, setEmargements] = useState<Record<string, { signature_data_url: string; signed_at: string }>>({});
  const [signatureModal, setSignatureModal] = useState<{ open: boolean; dateKey: string; date: Date | null; blocs: any[] }>({ open: false, dateKey: "", date: null, blocs: [] });
  const [signatureDraft, setSignatureDraft] = useState<string>("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [isUploadingSharedDoc, setIsUploadingSharedDoc] = useState(false);
  const [sharedDocTitre, setSharedDocTitre] = useState("");

  // Relevés bancaires (comptable mode)
  const [releves, setReleves] = useState<any[]>([]);
  // Factures ventes & achats (comptable mode)
  const [facturesVentes, setFacturesVentes] = useState<any[]>([]);
  const [facturesAchats, setFacturesAchats] = useState<any[]>([]);

  // Email state (comptable mode)
  const [comptableEmails, setComptableEmails] = useState<any[]>([]);
  const [composingEmail, setComposingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  // Apprenant form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [selectedFormation, setSelectedFormation] = useState("marketing-digital-24h");
  const [montantTtc, setMontantTtc] = useState("1500");
  const [typeApprenantFormation, setTypeApprenantFormation] = useState("marketing-digital");
  const [creneauHoraire, setCreneauHoraire] = useState("");
  const [dateExamenTheorique, setDateExamenTheorique] = useState("27 janvier 2026");
  const [dateExamenPratique, setDateExamenPratique] = useState("");
  const [selectedDateOption, setSelectedDateOption] = useState(datesFormations.vtc.dates[0]);
  const [dateDebutFormation, setDateDebutFormation] = useState<Date | undefined>();
  const [dateFinFormation, setDateFinFormation] = useState<Date | undefined>();
  const [inscritFranceTravail, setInscritFranceTravail] = useState(false);
  const [documentsComplets, setDocumentsComplets] = useState(false);
  const [financement, setFinancement] = useState("cpf");
  const [organismeFinanceur, setOrganismeFinanceur] = useState("cpf-cdc");

  // Document upload
  const [selectedApprenantForDoc, setSelectedApprenantForDoc] = useState("");
  const [docTitre, setDocTitre] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Facture upload
  const [factureDestinataire, setFactureDestinataire] = useState("Finally Academy Ltd");
  const [factureMontant, setFactureMontant] = useState("");
  const [factureDescription, setFactureDescription] = useState("Prestation de services");
  const [factureMoisAnnee, setFactureMoisAnnee] = useState("");
  const [factureMoisMultiples, setFactureMoisMultiples] = useState<string[]>([]);
  const [isUploadingFacture, setIsUploadingFacture] = useState(false);
  const factureFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFactureFileName, setSelectedFactureFileName] = useState("");

  // Load fournisseur by token
  useEffect(() => {
    const loadFournisseur = async () => {
      if (!token) { setError("Lien invalide"); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('fournisseurs')
        .select('id, nom, actif, factures_only, formateur_id, comptable_only')
        .eq('token', token)
        .maybeSingle();
      if (err || !data) { setError("Lien invalide ou expiré"); setLoading(false); return; }
      if (!data.actif) { setError("Ce compte fournisseur est désactivé"); setLoading(false); return; }
      const facOnly = (data as any).factures_only === true;
      const formateurId = (data as any).formateur_id || null;
      const comptableOnly = (data as any).comptable_only === true;
      setFournisseur({ id: data.id, nom: data.nom, factures_only: facOnly, formateur_id: formateurId, comptable_only: comptableOnly });
      // Pré-remplir le destinataire avec le nom du fournisseur lui-même
      setFactureDestinataire(data.nom);
      if (comptableOnly) setActiveTab("rapprochement");
      else if (formateurId) setActiveTab("planning");
      else if (facOnly) setActiveTab("factures");
      else setActiveTab("apprenants");
      setLoading(false);
    };
    loadFournisseur();
  }, [token]);

  // Load data
  useEffect(() => {
    if (!fournisseur) return;
    const load = async () => {
      const [appRes, docRes, facRes, sharedRes] = await Promise.all([
        supabase.from('fournisseur_apprenants').select('id, nom, prenom, formation_choisie, created_at, notes').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
        supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
        supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
        supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
      ]);
      if (appRes.data) setApprenants(appRes.data);
      if (docRes.data) setDocuments(docRes.data as FournisseurDocument[]);
      if (facRes.data) setFactures(facRes.data as FournisseurFacture[]);
      if (sharedRes.data) setSharedDocs(sharedRes.data);

      // Récupérer les documents CRM (documents_inscription) pour tous les apprenants liés
      if (appRes.data && appRes.data.length > 0) {
        // Extraire les apprenant_id depuis les notes (format: "apprenant_id:UUID")
        const crmIds = appRes.data
          .map((a: any) => {
            const match = a.notes?.match(/apprenant_id:([a-f0-9-]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (crmIds.length > 0) {
          const { data: crmDocs } = await supabase
            .from('documents_inscription')
            .select('id, titre, nom_fichier, url, statut, created_at, apprenant_id, type_document')
            .in('apprenant_id', crmIds)
            .order('created_at', { ascending: false });

          if (crmDocs) {
            // Enrichir avec le nom de l'apprenant
            const docsWithNames = crmDocs.map(doc => {
              const fa = appRes.data!.find((a: any) => {
                const match = a.notes?.match(/apprenant_id:([a-f0-9-]+)/);
                return match && match[1] === doc.apprenant_id;
              });
              return { ...doc, apprenant_nom: fa ? `${fa.prenom} ${fa.nom}` : 'Inconnu' };
            });
            setCrmDocuments(docsWithNames);
          }
        }
      }

      // Charger les emails et relevés si comptable
      if (fournisseur.comptable_only) {
        const { data: emailData } = await supabase
          .from('emails')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (emailData) setComptableEmails(emailData);

        const { data: relevesData } = await supabase
          .from('releves_bancaires')
          .select('*')
          .order('mois_annee', { ascending: false });
        if (relevesData) setReleves(relevesData);

        // Utiliser l'edge function sécurisée pour récupérer les factures (bypasse le RLS admin)
        const { data: facturesResp, error: facturesErr } = await supabase.functions.invoke('get-comptable-factures', {
          body: { token },
        });
        if (!facturesErr && facturesResp) {
          setFacturesVentes(facturesResp.ventes || []);
          setFacturesAchats(facturesResp.achats || []);
        }
      }

      // Charger le planning si c'est un formateur (depuis agenda_blocs)
      // ⚠️ On affiche UNIQUEMENT les COURS — pas les examens pratiques individuels
      if (fournisseur.formateur_id) {
        const { data: planData } = await supabase
          .from('agenda_blocs')
          .select('id, discipline_nom, formation, heure_debut, heure_fin, semaine_debut, jour, discipline_color, formateur_id')
          .eq('formateur_id', fournisseur.formateur_id)
          .order('semaine_debut', { ascending: true });
        if (planData) setPlanning(planData.filter(isCoursBloc));

        // Charger les signatures d'émargement existantes
        const { data: emargData } = await supabase
          .from('formateur_emargements')
          .select('date_jour, signature_data_url, signed_at')
          .eq('fournisseur_id', fournisseur.id);
        if (emargData) {
          const map: Record<string, { signature_data_url: string; signed_at: string }> = {};
          emargData.forEach((e: any) => { map[e.date_jour] = { signature_data_url: e.signature_data_url, signed_at: e.signed_at }; });
          setEmargements(map);
        }
      }
    };
    load();
  }, [fournisseur, showForm]);

  // Realtime: refresh planning automatically when ANY agenda_blocs change
  useEffect(() => {
    if (!fournisseur?.formateur_id) return;
    const formateurId = fournisseur.formateur_id;
    const reloadPlanning = async () => {
      const { data: planData } = await supabase
        .from('agenda_blocs')
        .select('id, discipline_nom, formation, heure_debut, heure_fin, semaine_debut, jour, discipline_color, formateur_id')
        .eq('formateur_id', formateurId)
        .order('semaine_debut', { ascending: true });
      if (planData) setPlanning(planData.filter(isCoursBloc));
    };
    const channel = supabase
      .channel(`agenda-formateur-${formateurId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_blocs' },
        () => { reloadPlanning(); }
      )
      .subscribe();
    const interval = setInterval(reloadPlanning, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fournisseur?.formateur_id]);

  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    if (prixFormations[value]) setMontantTtc(prixFormations[value]);
    if (formationToType[value]) setTypeApprenantFormation(formationToType[value]);
    if (value === "vtc" || value === "vtc-exam") setSelectedDateOption(datesFormations.vtc.dates[0]);
    else if (value === "taxi" || value === "taxi-exam") setSelectedDateOption(datesFormations.taxi.dates[0]);
    else if (value === "passerelle-taxi") setSelectedDateOption(datesFormations.ta.dates[0]);
    else setSelectedDateOption("");
  };

  const resetForm = () => {
    setCivilite(""); setPrenom(""); setNom(""); setEmail(""); setTelephone("");
    setAdresse(""); setCodePostal(""); setVille(""); setSelectedFormation("marketing-digital-24h");
    setMontantTtc("1500"); setTypeApprenantFormation("marketing-digital"); setCreneauHoraire("");
    setDateExamenTheorique(""); setDateExamenPratique("");
    setSelectedDateOption(""); setDateDebutFormation(undefined);
    setDateFinFormation(undefined); setInscritFranceTravail(false); setDocumentsComplets(false);
    setFinancement("cpf"); setOrganismeFinanceur("cpf-cdc");
  };

  const handleSubmitApprenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Insert into main apprenants table so it appears in CRM
      const { data: newApprenant, error: apprenantError } = await supabase
        .from('apprenants')
        .insert({
          civilite: civilite || null,
          nom: nom.trim(), prenom: prenom.trim(),
          email: email.trim() || null, telephone: telephone.trim() || null,
          adresse: adresse.trim() || null, code_postal: codePostal.trim() || null,
          ville: ville.trim() || null, formation_choisie: selectedFormation,
          type_apprenant: typeApprenantFormation, montant_ttc: parseFloat(montantTtc) || null,
          date_debut_formation: dateDebutFormation ? format(dateDebutFormation, "yyyy-MM-dd") : null,
          date_fin_formation: dateFinFormation ? format(dateFinFormation, "yyyy-MM-dd") : null,
          inscrit_france_travail: inscritFranceTravail,
          mode_financement: financement, organisme_financeur: organismeFinanceur || null,
          statut: 'fournisseur',
          notes: `Via fournisseur: ${fournisseur.nom}`,
        })
        .select('id')
        .single();

      if (apprenantError) throw apprenantError;

      // Also insert into fournisseur_apprenants for supplier portal tracking
      await supabase.from('fournisseur_apprenants').insert({
        fournisseur_id: fournisseur.id,
        civilite, nom: nom.trim(), prenom: prenom.trim(),
        email: email.trim() || null, telephone: telephone.trim() || null,
        adresse: adresse.trim() || null, code_postal: codePostal.trim() || null,
        ville: ville.trim() || null, formation_choisie: selectedFormation,
        type_apprenant: typeApprenantFormation, montant_ttc: parseFloat(montantTtc) || null,
        date_formation_catalogue: dateDebutFormation ? format(dateDebutFormation, "yyyy-MM-dd") : null,
        date_examen_pratique: dateFinFormation ? format(dateFinFormation, "yyyy-MM-dd") : null,
        inscrit_france_travail: inscritFranceTravail,
        mode_financement: financement, organisme_financeur: organismeFinanceur || null,
        notes: `apprenant_id:${newApprenant.id}`,
      });

      toast({ title: "Apprenant ajouté", description: `${prenom} ${nom} a été enregistré avec succès.` });
      resetForm();
      setShowForm(false);
      // Refresh apprenants list
      const { data: refreshed } = await supabase.from('fournisseur_apprenants').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (refreshed) setApprenants(refreshed as FournisseurApprenant[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur || !token) return;
    const fileInput = document.getElementById('doc-file') as HTMLInputElement;
    const files = fileInput?.files;
    if (!files || files.length === 0 || !selectedApprenantForDoc) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un apprenant et au moins un fichier.", variant: "destructive" });
      return;
    }
    setIsUploadingDoc(true);
    try {
      // Find the linked apprenant_id from fournisseur_apprenant notes
      let mainApprenantId: string | null = null;
      const { data: faData } = await supabase
        .from('fournisseur_apprenants')
        .select('notes')
        .eq('id', selectedApprenantForDoc)
        .single();
      if (faData?.notes) {
        const match = faData.notes.match(/apprenant_id:(.+)/);
        if (match) mainApprenantId = match[1];
      }

      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', token);
        formData.append('fournisseur_id', fournisseur.id);
        formData.append('type', 'document');
        formData.append('fournisseur_apprenant_id', selectedApprenantForDoc);
        if (mainApprenantId) formData.append('main_apprenant_id', mainApprenantId);

        const { data, error } = await supabase.functions.invoke('upload-fournisseur-document', {
          body: formData,
        });
        if (error) throw new Error(error.message || "Erreur lors de l'upload");
        if (data?.error) throw new Error(data.error);
        successCount++;
      }
      toast({ title: "Documents envoyés", description: `${successCount} document(s) uploadé(s) avec succès.` });
      setSelectedApprenantForDoc(""); fileInput.value = "";
      const { data } = await supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (data) setDocuments(data as FournisseurDocument[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUploadFacture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur || !token) return;
    const fileInput = factureFileInputRef.current ?? (document.getElementById('facture-file') as HTMLInputElement | null);
    const file = fileInput?.files?.[0];
    const isFormateur = !!fournisseur.formateur_id;
    const moisValue = isFormateur
      ? (factureMoisMultiples.length > 0 ? factureMoisMultiples.sort().join(', ') : null)
      : (factureMoisAnnee || null);
    if (!file) {
      toast({ title: "Fichier manquant", description: "Cliquez sur « Parcourir » et sélectionnez le PDF de votre facture avant de cliquer sur « Déposer ».", variant: "destructive" });
      return;
    }
    if (isFormateur && factureMoisMultiples.length === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins un mois.", variant: "destructive" });
      return;
    }
    if (!isFormateur && !!fournisseur.factures_only && !moisValue) {
      toast({ title: "Période manquante", description: "Indiquez le mois et l'année que cette facture couvre.", variant: "destructive" });
      return;
    }
    setIsUploadingFacture(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      formData.append('fournisseur_id', fournisseur.id);
      formData.append('type', 'facture');
      formData.append('destinataire', factureDestinataire);
      if (factureMontant) formData.append('montant', factureMontant);
      if (factureDescription) formData.append('description', factureDescription);
      if (moisValue) formData.append('mois_annee', moisValue);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-fournisseur-document`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data?.error) throw new Error(data?.error || `Erreur ${response.status}`);

      toast({ title: "Facture envoyée", description: `Facture envoyée avec succès.` });
      setFactureMontant(""); setFactureDescription("Prestation de services"); setFactureMoisAnnee(""); setFactureMoisMultiples([]); setSelectedFactureFileName(""); if (fileInput) fileInput.value = "";
      const { data: refreshed } = await supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (refreshed) setFactures(refreshed as FournisseurFacture[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingFacture(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive font-medium text-lg">{error}</p>
          <p className="text-muted-foreground text-sm mt-2">Veuillez vérifier votre lien d'accès.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoFtransport} alt="FTransport" className="h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold">Portail Fournisseur</h1>
              <p className="text-sm text-muted-foreground">{fournisseur?.nom}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {fournisseur?.comptable_only ? (
            // Mode comptable : rapprochement bancaire + graphiques + factures + relevés + documents + messages
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="rapprochement" className="gap-2 text-xs"><BarChart3 className="w-4 h-4" />Rapprochement</TabsTrigger>
              <TabsTrigger value="comptable-graphiques" className="gap-2 text-xs"><TrendingUp className="w-4 h-4" />Graphiques</TabsTrigger>
              <TabsTrigger value="comptable-factures" className="gap-2 text-xs"><Receipt className="w-4 h-4" />Factures</TabsTrigger>
              <TabsTrigger value="comptable-releves" className="gap-2 text-xs"><FolderOpen className="w-4 h-4" />Relevés</TabsTrigger>
              <TabsTrigger value="comptable-notes-frais" className="gap-2 text-xs"><Receipt className="w-4 h-4" />Notes de frais</TabsTrigger>
              <TabsTrigger value="comptable-docs" className="gap-2 text-xs"><FileText className="w-4 h-4" />Documents</TabsTrigger>
              <TabsTrigger value="comptable-messages" className="gap-2 text-xs"><Mail className="w-4 h-4" />Messages</TabsTrigger>
            </TabsList>
          ) : fournisseur?.formateur_id ? (
  // Formateur : planning + cours + résultats + factures + documents
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="planning" className="gap-2"><CalendarDays className="w-4 h-4" />Mon planning</TabsTrigger>
              <TabsTrigger value="cours-formateur" className="gap-2"><BookOpen className="w-4 h-4" />Cours</TabsTrigger>
              <TabsTrigger value="resultats-formateur" className="gap-2"><GraduationCap className="w-4 h-4" />Résultats</TabsTrigger>
              <TabsTrigger value="vue-apprenant" className="gap-2"><Eye className="w-4 h-4" />Vue apprenant</TabsTrigger>
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Mes factures</TabsTrigger>
              <TabsTrigger value="shared-docs" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
            </TabsList>
          ) : fournisseur?.factures_only ? (
            // Factures + documents
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Mes factures</TabsTrigger>
              <TabsTrigger value="shared-docs" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
            </TabsList>
          ) : (
            // Standard : apprenants + documents apprenants + factures + documents partagés
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="apprenants" className="gap-2"><Users className="w-4 h-4" />Apprenants</TabsTrigger>
              <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Docs apprenants</TabsTrigger>
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Factures</TabsTrigger>
              <TabsTrigger value="shared-docs" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
            </TabsList>
          )}

          {/* ============ TAB APPRENANTS ============ */}
          <TabsContent value="apprenants">
            {!showForm ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Mes apprenants ({apprenants.length})</h2>
                  <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" />Ajouter un apprenant</Button>
                </div>
                {apprenants.length === 0 ? (
                  <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun apprenant enregistré. Cliquez sur "Ajouter un apprenant" pour commencer.</CardContent></Card>
                ) : (
                  <div className="grid gap-3">
                    {apprenants.map(a => (
                      <Card key={a.id}>
                        <CardContent className="pt-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{a.prenom} {a.nom}</p>
                            <p className="text-sm text-muted-foreground">{a.formation_choisie || "Pas de formation"} • {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Nouvel apprenant</CardTitle>
                  <CardDescription>Remplissez le formulaire pour enregistrer un apprenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitApprenant} className="space-y-6">
                    {/* Identité */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Identité</h3>
                      <div className="space-y-2">
                        <Label>Civilité</Label>
                        <Select value={civilite} onValueChange={setCivilite}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent><SelectItem value="M.">M.</SelectItem><SelectItem value="Mme">Mme</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nom *</Label><Input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Martin" /></div>
                        <div className="space-y-2"><Label>Prénom *</Label><Input required value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Jean" /></div>
                      </div>
                    </div>

                    {/* Coordonnées */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" /></div>
                        <div className="space-y-2"><Label>Téléphone</Label><Input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
                      </div>
                    </div>

                    {/* France Travail */}
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div><Label className="text-sm font-medium">Inscrit à France Travail</Label><p className="text-xs text-muted-foreground">L'apprenant est-il inscrit à France Travail ?</p></div>
                      <Switch checked={inscritFranceTravail} onCheckedChange={setInscritFranceTravail} />
                    </div>


                    {/* Adresse */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
                      <div className="space-y-2"><Label>Adresse</Label><Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue des Lilas" /></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Code postal</Label><Input maxLength={5} value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="69001" /></div>
                        <div className="space-y-2 col-span-2"><Label>Ville</Label><Input value={ville} onChange={e => setVille(e.target.value)} placeholder="Lyon" /></div>
                      </div>
                    </div>

                    {/* Formation */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation ou Service</h3>
                      <div className="space-y-2">
                        <Label>Formation souhaitée</Label>
                        <Select value={selectedFormation} onValueChange={handleFormationChange}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une formation" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pas_encore_choisi">Pas encore choisi</SelectItem>
                            <SelectGroup><SelectLabel>Marketing Digital</SelectLabel>
                              <SelectItem value="marketing-digital-24h">Marketing Digital 24H - 1 500 €</SelectItem>
                              <SelectItem value="marketing-digital-26h">Marketing Digital 26H - 2 100 €</SelectItem>
                              <SelectItem value="marketing-digital-28h">Marketing Digital 28H - 3 300 €</SelectItem>
                            </SelectGroup>
                            <SelectGroup><SelectLabel>Anglais Professionnel</SelectLabel>
                              <SelectItem value="anglais-17h">Anglais Professionnel 17H - 1 200 €</SelectItem>
                              <SelectItem value="anglais-28h">Anglais Professionnel 28H - 2 000 €</SelectItem>
                              <SelectItem value="anglais-35h">Anglais Professionnel 35H - 3 000 €</SelectItem>
                              <SelectItem value="anglais-45h">Anglais Professionnel 45H - 4 500 €</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Financement */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Financement</h3>
                      <Select value={financement} onValueChange={setFinancement}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF (Mon Compte Formation)</SelectItem>
                          <SelectItem value="personnel">Personnel (auto-financement)</SelectItem>
                          <SelectItem value="opco">OPCO</SelectItem>
                          <SelectItem value="france_travail">France Travail</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prix */}
                    <div className="space-y-2">
                      <Label>Prix de la formation (€)</Label>
                      <Input type="number" value={montantTtc} onChange={e => setMontantTtc(e.target.value)} min="0" step="0.01" />
                    </div>

                    {/* Dates d'entrée et sortie */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Dates de formation</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date d'entrée en formation</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateDebutFormation && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateDebutFormation ? format(dateDebutFormation, "dd/MM/yyyy") : "Choisir une date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={dateDebutFormation} onSelect={setDateDebutFormation} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Date de sortie de formation</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFinFormation && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFinFormation ? format(dateFinFormation, "dd/MM/yyyy") : "Choisir une date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={dateFinFormation} onSelect={setDateFinFormation} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>


                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Annuler</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Enregistrer l'apprenant
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB DOCUMENTS ============ */}
          <TabsContent value="documents">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Envoyer un document</CardTitle><CardDescription>Associez un document à un apprenant</CardDescription></CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Apprenant *</Label>
                        <Select value={selectedApprenantForDoc} onValueChange={setSelectedApprenantForDoc}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un apprenant" /></SelectTrigger>
                          <SelectContent>
                            {apprenants.map(a => <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier(s) *</Label>
                      <Input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple required />
                    </div>
                    <Button type="submit" disabled={isUploadingDoc} className="gap-2">
                      {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Envoyer le document
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Documents CRM (depuis le dossier apprenant) */}
              {crmDocuments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Documents du dossier apprenant ({crmDocuments.length})</h3>
                  <div className="grid gap-3">
                    {crmDocuments.map(d => (
                      <Card key={d.id}>
                        <CardContent className="pt-4 flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{d.titre}</p>
                            <p className="text-sm text-muted-foreground">{d.apprenant_nom} • {d.nom_fichier} • {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <a href={d.url.startsWith('http') ? d.url : supabase.storage.from('documents-inscription').getPublicUrl(d.url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="gap-2 ml-2"><Eye className="w-4 h-4" />Voir</Button>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold">Documents envoyés via portail ({documents.length})</h3>
              {documents.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun document envoyé via le portail.</CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {documents.map(d => (
                    <Card key={d.id}>
                      <CardContent className="pt-4 flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{d.titre}</p>
                          <p className="text-sm text-muted-foreground">{d.nom_fichier} • {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="gap-2 ml-2"><Eye className="w-4 h-4" />Voir</Button>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ TAB FACTURES ============ */}
          <TabsContent value="factures">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Déposer une facture</CardTitle><CardDescription>Envoyez votre facture au prestataire concerné</CardDescription></CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadFacture} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Destinataire</Label>
                      <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm font-medium">{factureDestinataire}</div>
                    </div>
                    {fournisseur?.formateur_id ? (
                      <div className="space-y-2">
                        <Label>Mois couverts *</Label>
                        <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                          {Array.from({ length: 12 }, (_, i) => {
                            const now = new Date();
                            // Générer les 6 derniers mois + 2 à venir
                            const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
                            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                            const checked = factureMoisMultiples.includes(val);
                            return (
                              <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setFactureMoisMultiples(prev =>
                                    checked ? prev.filter(m => m !== val) : [...prev, val]
                                  )}
                                  className="rounded"
                                />
                                <span className="capitalize">{label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {factureMoisMultiples.length > 0 && (
                          <p className="text-xs text-muted-foreground">{factureMoisMultiples.length} mois sélectionné(s)</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Mois et année concernés *</Label>
                        <Input
                          type="month"
                          value={factureMoisAnnee}
                          onChange={e => setFactureMoisAnnee(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Indiquez le mois et l'année que cette facture couvre (ex : 04/2026)</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Montant (€)</Label>
                        <Input type="number" min="0" step="0.01" value={factureMontant} onChange={e => setFactureMontant(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={factureDescription} onChange={e => setFactureDescription(e.target.value)} placeholder="Prestation de services" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier facture * (PDF, JPG ou PNG)</Label>
                      <input
                        ref={factureFileInputRef}
                        id="facture-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="sr-only"
                        onChange={(e) => setSelectedFactureFileName(e.target.files?.[0]?.name || "")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => factureFileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        {selectedFactureFileName || "Choisir le fichier de facture"}
                      </Button>
                    </div>
                    <Button type="submit" disabled={isUploadingFacture} className="gap-2">
                      {isUploadingFacture ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Déposer la facture
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <h3 className="text-lg font-semibold">Factures déposées ({factures.length})</h3>
              {factures.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucune facture déposée.</CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {factures.map(f => (
                    <Card key={f.id}>
                      <CardContent className="pt-4 flex justify-between items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{f.nom_fichier}</p>
                          <p className="text-sm text-muted-foreground">
                            Prestataire : <span className="font-medium">{f.destinataire}</span>
                            {(f as any).mois_annee ? ` • Période : ${(f as any).mois_annee}` : ""}
                            {f.montant ? ` • ${f.montant.toLocaleString('fr-FR')} €` : ""}
                            {" • "}{new Date(f.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={async () => {
                            if (!confirm(`Supprimer définitivement la facture "${f.nom_fichier}" ?`)) return;
                            try {
                              // Tenter de supprimer le fichier du storage (extraire le path depuis l'URL publique)
                              const url = f.url || "";
                              const marker = "/fournisseur-documents/";
                              const idx = url.indexOf(marker);
                              if (idx !== -1) {
                                const path = decodeURIComponent(url.slice(idx + marker.length));
                                await supabase.storage.from("fournisseur-documents").remove([path]);
                              }
                              const { error } = await supabase
                                .from("fournisseur_factures")
                                .delete()
                                .eq("id", f.id);
                              if (error) throw error;
                              setFactures(prev => prev.filter(x => x.id !== f.id));
                              toast({ title: "Facture supprimée" });
                            } catch (err: any) {
                              toast({ title: "Erreur", description: err.message || "Suppression impossible", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ TAB DOCUMENTS PARTAGÉS ============ */}
          <TabsContent value="shared-docs">
            <div className="space-y-6">
              {/* Upload section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Envoyer un document</CardTitle>
                  <CardDescription>Déposez ici vos documents (contrats, fiches, certifications…)</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!fournisseur) return;
                    const fileInput = document.getElementById('shared-doc-file') as HTMLInputElement;
                    const files = fileInput?.files;
                    if (!files || files.length === 0) {
                      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier.", variant: "destructive" });
                      return;
                    }
                    setIsUploadingSharedDoc(true);
                    try {
                      for (let i = 0; i < files.length; i++) {
                         const file = files[i];
                         const safeName = file.name
                           .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprimer accents
                           .replace(/[^a-zA-Z0-9._-]/g, '_'); // remplacer caractères spéciaux
                         const filePath = `${fournisseur.id}/${Date.now()}_${safeName}`;
                        const { error: uploadErr } = await supabase.storage.from('fournisseur-shared-docs').upload(filePath, file);
                        if (uploadErr) throw uploadErr;
                        const { data: { publicUrl } } = supabase.storage.from('fournisseur-shared-docs').getPublicUrl(filePath);
                        const { error: insertErr } = await supabase.from('fournisseur_shared_docs').insert({
                          fournisseur_id: fournisseur.id,
                          titre: sharedDocTitre || file.name,
                          nom_fichier: file.name,
                          url: publicUrl,
                          uploaded_by: 'fournisseur',
                        });
                        if (insertErr) throw insertErr;
                      }
                      toast({ title: "Document envoyé", description: "Le document a été transmis avec succès." });
                      setSharedDocTitre("");
                      fileInput.value = "";
                      const { data } = await supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
                      if (data) setSharedDocs(data);
                    } catch (err: any) {
                      toast({ title: "Erreur", description: err.message, variant: "destructive" });
                    } finally {
                      setIsUploadingSharedDoc(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="shared-doc-titre">Titre du document (optionnel)</Label>
                      <input
                        id="shared-doc-titre"
                        type="text"
                        placeholder="Ex: Contrat de prestation, Attestation..."
                        value={sharedDocTitre}
                        onChange={e => setSharedDocTitre(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shared-doc-file">Fichier(s)</Label>
                      <input id="shared-doc-file" type="file" multiple className="w-full border rounded-md px-3 py-2 text-sm mt-1" />
                    </div>
                    <Button type="submit" disabled={isUploadingSharedDoc} className="gap-2">
                      {isUploadingSharedDoc ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Upload className="w-4 h-4" />Envoyer le document</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Liste des documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Tous les documents ({sharedDocs.length})</CardTitle>
                  <CardDescription>Documents échangés entre vous et Finally Academy</CardDescription>
                </CardHeader>
                <CardContent>
                  {sharedDocs.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center">Aucun document partagé pour le moment.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {sharedDocs.map((doc: any) => (
                        <div key={doc.id} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/30">
                          <div className="flex items-start gap-2">
                            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{doc.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.uploaded_by === 'admin' ? '📤 Finally Academy' : '📁 Votre document'}
                              </p>
                              <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-auto">
                            <Button variant="outline" size="sm" className="gap-1 w-full"><Eye className="w-3 h-3" />Voir</Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ TAB PLANNING (formateurs uniquement) ============ */}
          {fournisseur?.formateur_id && (
            <TabsContent value="planning">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Mon planning de cours</h2>
                {planning.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Aucun créneau planifié pour le moment.
                    </CardContent>
                  </Card>
                ) : (() => {
                  // Grouper par date réelle (semaine_debut + jour)
                  const grouped: Record<string, typeof planning> = {};
                  planning.forEach((bloc: any) => {
                    const [year, month, day] = bloc.semaine_debut.split('-').map(Number);
                    const base = new Date(year, month - 1, day);
                    base.setDate(base.getDate() + bloc.jour);
                    const dateKey = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push({ ...bloc, _dateObj: base });
                  });
                  const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
                  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
                  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                  return (
                    <div className="space-y-4">
                      {sortedKeys.map((dateKey) => {
                        const blocs = grouped[dateKey];
                        const d = blocs[0]._dateObj as Date;
                        const isPast = d < new Date();
                        const label = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
                        return (
                          <div key={dateKey} className={`border rounded-xl overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
                            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b gap-3">
                              <span className="font-semibold text-sm">{label}</span>
                              <div className="flex items-center gap-2">
                                {isPast && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Passé</span>}
                                {emargements[dateKey] ? (
                                  <>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">✓ Signée</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() =>
                                        generateEmargementFormateurJour({
                                          formateurNom: fournisseur?.nom || "Formateur",
                                          date: d,
                                          blocs: blocs as any[],
                                          signatureDataUrl: emargements[dateKey].signature_data_url,
                                          signedAt: new Date(emargements[dateKey].signed_at),
                                        })
                                      }
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Télécharger
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                      setSignatureDraft("");
                                      setSignatureModal({ open: true, dateKey, date: d, blocs: blocs as any[] });
                                    }}
                                  >
                                    <PenLine className="w-3.5 h-3.5" />
                                    Signer émargement
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="divide-y">
                              {(blocs as any[])
                                .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                                .map((bloc: any) => {
                                  const [sh, sm] = bloc.heure_debut.split(':').map(Number);
                                  const [eh, em] = bloc.heure_fin.split(':').map(Number);
                                  const heures = (eh + em/60) - (sh + sm/60);
                                  return (
                                    <div key={bloc.id} className="flex items-center gap-3 px-4 py-3">
                                      <div className="w-3 h-10 rounded-sm shrink-0" style={{ backgroundColor: bloc.discipline_color || '#6366f1' }} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{bloc.discipline_nom}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {bloc.heure_debut} – {bloc.heure_fin} · {heures.toFixed(1)}h · {bloc.formation}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          )}

          {/* ============ TAB COURS FORMATEUR ============ */}
          {fournisseur?.formateur_id && (
            <TabsContent value="cours-formateur">
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Cours — Modules TAXI & TA</h2>
                    <p className="text-sm text-muted-foreground">Tous les supports de cours et exercices des formations TAXI et TA</p>
                  </div>
                </div>

                {/* Réglementation Nationale */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">📘</span> Réglementation Nationale
                    </CardTitle>
                    <CardDescription>Cours PDF sur la réglementation nationale du transport</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a href="/cours/vtc/F_Nationale_1.pdf" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">Réglementation Nationale — Partie 1</p>
                            <p className="text-xs text-muted-foreground">PDF HD</p>
                          </div>
                        </div>
                      </a>
                      <a href="/cours/vtc/F_Nationale_2.pdf" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">Réglementation Nationale — Partie 2</p>
                            <p className="text-xs text-muted-foreground">PDF HD</p>
                          </div>
                        </div>
                      </a>
                    </div>
                    <EditableQuizViewer
                      sections={REGLEMENTATION_NATIONALE_EXERCICES}
                      title="Quiz — Réglementation Nationale"
                      icon="📝"
                      quizId="reglementation-nationale"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">📗</span> Réglementation Locale
                    </CardTitle>
                    <CardDescription>Cours PDF sur la réglementation locale (Lyon)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[1, 2, 3].map(i => (
                        <a key={i} href={`/cours/vtc/F_Locale_${i}.pdf`} target="_blank" rel="noopener noreferrer">
                          <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium text-sm">Réglementation Locale — Partie {i}</p>
                              <p className="text-xs text-muted-foreground">PDF HD</p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    <EditableQuizViewer
                      sections={REGLEMENTATION_LOCALE_EXERCICES}
                      title="Quiz — Réglementation Locale"
                      icon="📝"
                      quizId="reglementation-locale"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* ===== MODULES TAXI SPÉCIFIQUES ===== */}


                {/* Connaissance de la ville TAXI */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">🏙️</span> Connaissance de la ville TAXI
                    </CardTitle>
                    <CardDescription>Géographie, monuments, adresses et lieux importants de Lyon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { nom: "Lyon et ses arrondissements", fichier: "LYON_ET_SES_ARRONDISSEMENTS.pdf" },
                        { nom: "Les gares", fichier: "LES_GARES.pdf" },
                        { nom: "Les hôpitaux", fichier: "LES_HOPITAUX.pdf" },
                        { nom: "Les musées", fichier: "LES_MUSEES.pdf" },
                        { nom: "Les mairies", fichier: "LES_MAIRIES.pdf" },
                        { nom: "Les hôtels", fichier: "LES_HOTELS.pdf" },
                        { nom: "Les parcs", fichier: "LES_PARCS.pdf" },
                        { nom: "Les salles de spectacles", fichier: "LES_SALLES_DE_SPECTACLES.pdf" },
                        { nom: "Les églises", fichier: "LES_EGLISES.pdf" },
                        { nom: "Les châteaux", fichier: "LES_CHATEAUX.pdf" },
                        { nom: "Les fresques", fichier: "LES_FRESQUES.pdf" },
                        { nom: "Les commissariats", fichier: "LES_COMMISSARIATS.pdf" },
                        { nom: "Les consulats", fichier: "LES_CONSULATS.pdf" },
                        { nom: "Les stations de taxi", fichier: "STATIONS_DE_TAXI.pdf" },
                        { nom: "Personnalités lyonnaises", fichier: "LES_PERSONNALITES_PUBLIQUES_LYONNAISES.pdf" },
                        { nom: "Les vins", fichier: "LES_VINS.pdf" },
                        { nom: "Divers", fichier: "LES_DIVERS.pdf" },
                      ].map(item => (
                        <a key={item.fichier} href={`/cours/vtc/${item.fichier}`} target="_blank" rel="noopener noreferrer">
                          <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <FileText className="w-5 h-5 text-orange-500" />
                            <div>
                              <p className="font-medium text-sm">{item.nom}</p>
                              <p className="text-xs text-muted-foreground">PDF</p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    <EditableQuizViewer
                      sections={CONNAISSANCES_VILLE_QUIZZES}
                      title="Quiz — Connaissance de la ville"
                      icon="🏙️"
                      quizId="connaissance-ville"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* Équipements TAXI */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">🚕</span> Équipements TAXI
                    </CardTitle>
                    <CardDescription>Documents et équipements obligatoires pour un taxi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a href="/cours/vtc/Equipements_et_documents_TAXI.pdf" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium text-sm">Équipements et documents TAXI</p>
                            <p className="text-xs text-muted-foreground">PDF complet</p>
                          </div>
                        </div>
                      </a>
                    </div>
                    <EditableQuizViewer
                      sections={EQUIPEMENTS_TAXI_DATA.exercices}
                      title="Quiz — Équipements TAXI"
                      icon="🚕"
                      quizId="equipements-taxi"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* Cas Pratique TAXI */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">📋</span> Cas Pratique TAXI
                    </CardTitle>
                    <CardDescription>Exercices de mise en situation professionnelle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <a href="/cours/vtc/CAS_PRATIQUE.docx" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">Cas Pratique — Exercices</p>
                            <p className="text-xs text-muted-foreground">Document Word</p>
                          </div>
                        </div>
                      </a>
                    </div>
                    <EditableQuizViewer
                      sections={CAS_PRATIQUE_TAXI_EXERCICES}
                      title="Quiz — Cas Pratique TAXI"
                      icon="📋"
                      quizId="cas-pratique-taxi"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>


                {/* Contrôle de connaissances */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">✅</span> Contrôle de connaissances TAXI
                    </CardTitle>
                    <CardDescription>Évaluation des acquis avant l'examen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a href="/cours/vtc/controle_de_connaissances_taxi.docx" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Contrôle de connaissances TAXI</p>
                            <p className="text-xs text-muted-foreground">Document Word</p>
                          </div>
                        </div>
                      </a>
                    </div>
                    <EditableQuizViewer
                      sections={CONTROLE_CONNAISSANCES_TAXI_DATA.exercices}
                      title="Quiz — Contrôle de connaissances"
                      icon="✅"
                      quizId="controle-connaissances-taxi"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* Bilan Exercices TA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">📊</span> Bilan Exercices TA
                    </CardTitle>
                    <CardDescription>Exercices de révision — Réglementation Nationale et Locale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <a href="/cours/vtc/Reglementation_Nationale_Bilan.docx" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-amber-500" />
                          <div>
                            <p className="font-medium text-sm">Bilan Réglementation Nationale</p>
                            <p className="text-xs text-muted-foreground">Document Word</p>
                          </div>
                        </div>
                      </a>
                      <a href="/cours/vtc/Reglementation_Locale_Bilan.docx" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-amber-500" />
                          <div>
                            <p className="font-medium text-sm">Bilan Réglementation Locale</p>
                            <p className="text-xs text-muted-foreground">Document Word</p>
                          </div>
                        </div>
                      </a>
                    </div>
                    <EditableQuizViewer
                      sections={BILAN_EXERCICES_TA}
                      title="Quiz — Bilan Exercices TA"
                      icon="📊"
                      quizId="bilan-exercices-ta"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* Bilan Examen TA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">🎯</span> Bilan Examen TA
                    </CardTitle>
                    <CardDescription>Questions type examen — Réglementation Nationale TAXI & Réglementation Locale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EditableQuizViewer
                      sections={BILAN_EXAMEN_TA}
                      title="Quiz — Bilan Examen TA"
                      icon="🎯"
                      quizId="bilan-examen-ta"
                      fournisseurId={fournisseur?.id || ""}
                    />
                  </CardContent>
                </Card>

                {/* Sources Juridiques */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">📖</span> Sources Juridiques TA
                    </CardTitle>
                    <CardDescription>Références légales et textes officiels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a href="/cours/vtc/Sources_Legales_TA.pdf" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <FileText className="w-5 h-5 text-indigo-500" />
                          <div>
                            <p className="font-medium text-sm">Sources Légales TA</p>
                            <p className="text-xs text-muted-foreground">PDF complet</p>
                          </div>
                        </div>
                      </a>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          )}

          {/* ============ TAB RÉSULTATS FORMATEUR ============ */}
          {fournisseur?.formateur_id && (
            <TabsContent value="resultats-formateur">
              <FormateurResultsTab token={token || ""} />
            </TabsContent>
          )}

          {/* ============ TAB VUE APPRENANT ============ */}
          {fournisseur?.formateur_id && (
            <TabsContent value="vue-apprenant">
              <FormateurApprenantSearchPreview token={token!} />
            </TabsContent>
          )}
          {/* ============ TAB RAPPROCHEMENT (comptable uniquement) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="rapprochement">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Rapprochement bancaire</h2>
                    <p className="text-sm text-muted-foreground">Importez les relevés CSV BNP et associez vos justificatifs</p>
                  </div>
                </div>
                <RapprochementBancaire comptableToken={token || undefined} />
              </div>
            </TabsContent>
          )}

          {/* ============ TAB GRAPHIQUES (comptable uniquement) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-graphiques">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Analyse financière</h2>
                    <p className="text-sm text-muted-foreground">CA mensuel, bénéfices et évolution cumulée</p>
                  </div>
                </div>
                <FinancialCharts />
              </div>
            </TabsContent>
          )}

          {/* ============ TAB FACTURES (comptable) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-factures">
              <div className="space-y-6">
                {/* Factures de ventes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-green-100">
                        <Receipt className="w-4 h-4 text-green-700" />
                      </div>
                      Factures de ventes
                      <span className="ml-auto text-sm font-normal text-muted-foreground">{facturesVentes.length} facture(s)</span>
                    </CardTitle>
                    <CardDescription>Factures émises aux clients (apprenants, OPCO, CPF…)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {facturesVentes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">Aucune facture de vente.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground text-xs">
                              <th className="text-left pb-2 pr-3 font-medium">Client / Apprenant</th>
                              <th className="text-left pb-2 pr-3 font-medium">Formation</th>
                              <th className="text-left pb-2 pr-3 font-medium">Financement</th>
                              <th className="text-left pb-2 pr-3 font-medium">Date</th>
                              <th className="text-right pb-2 pr-3 font-medium">Montant TTC</th>
                              <th className="text-right pb-2 pr-3 font-medium">Payé</th>
                              <th className="text-right pb-2 pr-3 font-medium">Restant</th>
                              <th className="text-left pb-2 font-medium">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facturesVentes.map((f: any) => {
                              const montantPaye = f.montant_paye ?? 0;
                              const montantRestant = f.montant_restant ?? ((f.montant_ttc || 0) - montantPaye);
                              const financementLabel: Record<string, string> = {
                                cpf: 'CPF', opco: 'OPCO', france_travail: 'France Travail',
                                personnel: 'Personnel', particulier: 'Particulier'
                              };
                              return (
                                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/20">
                                  <td className="py-2 pr-3 font-medium">{f.client_nom}</td>
                                  <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[120px] truncate">{f.formation || f.numero || '-'}</td>
                                  <td className="py-2 pr-3">
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
                                      {financementLabel[f.type_financement] || f.type_financement || 'Personnel'}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 text-xs">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                                  <td className="py-2 pr-3 text-right font-semibold">{Number(f.montant_ttc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                                  <td className="py-2 pr-3 text-right text-emerald-600">{Number(montantPaye).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                                  <td className="py-2 pr-3 text-right text-amber-600">{Number(montantRestant).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                                  <td className="py-2">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${f.statut === 'payee' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {f.statut === 'payee' ? 'Payée' : 'En attente'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* Totaux */}
                        <div className="mt-4 pt-4 border-t flex gap-6 justify-end text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Total TTC</p>
                            <p className="font-bold">{facturesVentes.reduce((s: number, f: any) => s + Number(f.montant_ttc || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Encaissé</p>
                            <p className="font-bold text-emerald-600">{facturesVentes.reduce((s: number, f: any) => s + Number(f.montant_paye || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs">Restant dû</p>
                            <p className="font-bold text-amber-600">{facturesVentes.reduce((s: number, f: any) => s + Number(f.montant_restant ?? ((f.montant_ttc || 0) - (f.montant_paye || 0))), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Factures d'achats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-orange-100">
                        <Receipt className="w-4 h-4 text-orange-700" />
                      </div>
                      Factures d'achats
                      <span className="ml-auto text-sm font-normal text-muted-foreground">{facturesAchats.length} facture(s)</span>
                    </CardTitle>
                    <CardDescription>Factures reçues des fournisseurs et formateurs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {facturesAchats.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">Aucune facture d'achat.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {facturesAchats.map((f: any) => (
                          <div key={f.id} className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                                <FileText className="w-5 h-5 text-orange-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{(f.fournisseurs as any)?.nom || f.destinataire}</p>
                                <p className="text-xs text-muted-foreground truncate">{f.nom_fichier}</p>
                                {f.description && <p className="text-xs text-muted-foreground truncate">{f.description}</p>}
                                {f.mois_annee && <p className="text-xs text-muted-foreground">Période : {f.mois_annee}</p>}
                                {f.date_paiement && <p className="text-xs text-muted-foreground">Payé le {new Date(f.date_paiement).toLocaleDateString('fr-FR')}{f.moyen_paiement ? ` · ${f.moyen_paiement}` : ''}</p>}
                                {f.montant && (
                                  <p className="text-sm font-semibold mt-1">{Number(f.montant).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                                )}
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${f.statut === 'payee' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {f.statut === 'payee' ? 'Payée' : 'En attente'}
                                </span>
                              </div>
                            </div>
                            <a href={f.url} target="_blank" rel="noopener noreferrer" download>
                              <Button variant="outline" size="sm" className="w-full gap-2">
                                <Download className="w-3 h-3" />
                                Télécharger
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ============ TAB RELEVÉS (comptable) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-releves">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      Relevés de comptes
                    </CardTitle>
                    <CardDescription>Téléchargez les relevés bancaires mis à disposition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {releves.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Aucun relevé disponible pour le moment.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {releves.map((releve: any) => {
                          const moisLabel = releve.mois_annee
                            ? new Date(releve.mois_annee + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                            : releve.mois_annee;
                          return (
                            <div key={releve.id} className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                  <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm capitalize">{moisLabel}</p>
                                  <p className="text-xs text-muted-foreground truncate">{releve.banque}</p>
                                  <p className="text-xs text-muted-foreground truncate">{releve.nom_fichier}</p>
                                  {releve.notes && <p className="text-xs text-muted-foreground italic mt-1">{releve.notes}</p>}
                                </div>
                              </div>
                              <a href={releve.url} target="_blank" rel="noopener noreferrer" download>
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                  <Download className="w-3 h-3" />
                                  Télécharger
                                </Button>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ============ TAB DOCUMENTS (comptable) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-docs">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Envoyer un document</CardTitle>
                    <CardDescription>Déposez ici vos documents (relevés, justificatifs, rapports…)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!fournisseur) return;
                      const fileInput = document.getElementById('comptable-doc-file') as HTMLInputElement;
                      const files = fileInput?.files;
                      if (!files || files.length === 0) {
                        toast({ title: "Erreur", description: "Veuillez sélectionner un fichier.", variant: "destructive" });
                        return;
                      }
                      setIsUploadingSharedDoc(true);
                      try {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
                          const filePath = `${fournisseur.id}/${Date.now()}_${safeName}`;
                          const { error: uploadErr } = await supabase.storage.from('fournisseur-shared-docs').upload(filePath, file);
                          if (uploadErr) throw uploadErr;
                          const { data: { publicUrl } } = supabase.storage.from('fournisseur-shared-docs').getPublicUrl(filePath);
                          await supabase.from('fournisseur_shared_docs').insert({
                            fournisseur_id: fournisseur.id,
                            titre: sharedDocTitre || file.name,
                            nom_fichier: file.name,
                            url: publicUrl,
                            uploaded_by: 'fournisseur',
                          });
                        }
                        toast({ title: "Document envoyé", description: "Le document a été transmis avec succès." });
                        setSharedDocTitre("");
                        fileInput.value = "";
                        const { data } = await supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
                        if (data) setSharedDocs(data);
                      } catch (err: any) {
                        toast({ title: "Erreur", description: err.message, variant: "destructive" });
                      } finally {
                        setIsUploadingSharedDoc(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="comptable-doc-titre">Titre (optionnel)</Label>
                        <input id="comptable-doc-titre" type="text" placeholder="Ex: Relevé janvier, Rapport mensuel..." value={sharedDocTitre} onChange={e => setSharedDocTitre(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="comptable-doc-file">Fichier(s)</Label>
                        <input id="comptable-doc-file" type="file" multiple className="w-full border rounded-md px-3 py-2 text-sm mt-1" />
                      </div>
                      <Button type="submit" disabled={isUploadingSharedDoc} className="gap-2">
                        {isUploadingSharedDoc ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Upload className="w-4 h-4" />Envoyer</>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Documents partagés ({sharedDocs.length})</CardTitle></CardHeader>
                  <CardContent>
                    {sharedDocs.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">Aucun document pour le moment.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sharedDocs.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/20">
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0"><FileText className="w-4 h-4 text-primary" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{doc.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.uploaded_by === 'admin' ? '📤 De Finally Academy' : '📁 Votre document'} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="gap-1 shrink-0"><Eye className="w-3 h-3" />Voir</Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ============ TAB MESSAGES (comptable) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-messages">
              <div className="space-y-6">
                {/* Composer */}
                {!composingEmail ? (
                  <Button onClick={() => setComposingEmail(true)} className="gap-2">
                    <PenLine className="w-4 h-4" />Écrire un message à Finally Academy
                  </Button>
                ) : (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenLine className="w-4 h-4" />Nouveau message</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Objet</Label>
                        <input className="w-full border rounded-md px-3 py-2 text-sm mt-1" placeholder="Objet du message" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                      </div>
                      <div>
                        <Label>Message</Label>
                        <Textarea placeholder="Votre message..." value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} className="mt-1" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => { setComposingEmail(false); setEmailSubject(""); setEmailBody(""); }}>Annuler</Button>
                        <Button disabled={sendingEmail || !emailSubject.trim()} className="gap-2" onClick={async () => {
                          setSendingEmail(true);
                          try {
                            const htmlBody = emailBody.replace(/\n/g, '<br>');
                            const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
                              body: { action: 'send', userEmail: 'contact@ftransport.fr', to: 'contact@ftransport.fr', subject: `[Comptable] ${emailSubject}`, body: htmlBody },
                            });
                            if (error) throw error;
                            if (data?.success) {
                              await supabase.from('emails').insert({
                                subject: `[Comptable] ${emailSubject}`,
                                body_html: htmlBody,
                                body_preview: emailBody.slice(0, 200),
                                sender_email: 'mledru@socic.fr',
                                sender_name: fournisseur.nom,
                                recipients: ['contact@ftransport.fr'],
                                type: 'received',
                                is_read: false,
                                received_at: new Date().toISOString(),
                              });
                              toast({ title: "Message envoyé !" });
                              setComposingEmail(false); setEmailSubject(""); setEmailBody("");
                              const { data: emailData } = await supabase.from('emails').select('*').order('created_at', { ascending: false }).limit(100);
                              if (emailData) setComptableEmails(emailData);
                            } else throw new Error("Échec de l'envoi");
                          } catch (err: any) {
                            toast({ title: "Erreur", description: err.message, variant: "destructive" });
                          } finally {
                            setSendingEmail(false);
                          }
                        }}>
                          {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sendingEmail ? 'Envoi...' : 'Envoyer'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historique */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Historique des échanges</CardTitle></CardHeader>
                  <CardContent>
                    {comptableEmails.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">Aucun message pour le moment.</p>
                    ) : (
                      <div className="divide-y">
                        {comptableEmails.map((email: any) => (
                          <div key={email.id} className="py-3 cursor-pointer hover:bg-muted/20 rounded px-2" onClick={() => setSelectedEmail(email)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {email.type === 'sent' ? <Send className="w-3.5 h-3.5 text-primary shrink-0" /> : <Inbox className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                <p className="font-medium text-sm truncate">{email.subject}</p>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(email.sent_at || email.received_at || email.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate pl-5">{email.body_preview}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dialog lecture email */}
                {selectedEmail && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmail(null)}>
                    <div className="bg-card rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{selectedEmail.subject}</h3>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>✕</Button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>De : {selectedEmail.sender_name || selectedEmail.sender_email}</p>
                        <p>Date : {new Date(selectedEmail.sent_at || selectedEmail.received_at || selectedEmail.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="border rounded p-4 text-sm bg-background">
                        {selectedEmail.body_html
                          ? <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                          : <p className="text-muted-foreground">{selectedEmail.body_preview || 'Aucun contenu'}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ============ TAB NOTES DE FRAIS (comptable) ============ */}
          {fournisseur?.comptable_only && (
            <TabsContent value="comptable-notes-frais">
              <NotesFraisTab readOnly />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
