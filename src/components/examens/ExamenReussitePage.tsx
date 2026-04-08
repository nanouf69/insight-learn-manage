import { useState, useRef, useCallback } from "react";
import { filterFutureExamDates, filterFutureDateStrings } from "@/lib/filterPastDates";
import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT } from '@/lib/examDatesConfig';
import { safeDateParse, formatDateFR, formatDateShortFR } from "@/lib/safeDateParse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CheckCircle2, XCircle, UserX, Search, RotateCcw, Plus, X, Upload, FileText, Trash2, Download, Users, Mail, GraduationCap, Calendar, MessageSquare, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit } from "lucide-react";

export function ExamenReussitePage() {
  const [search, setSearch] = useState("");
  const [repassageSearch, setRepassageSearch] = useState("");
  const [repassageList, setRepassageList] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedExamDate, setSelectedExamDate] = useState("27 janvier 2026");
  const [selectedDatePratique, setSelectedDatePratique] = useState("Du 23 fevrier au 6 mars 2026");
  const [dateDebutPratique, setDateDebutPratique] = useState("");
  const [sendingCMAEmail, setSendingCMAEmail] = useState(false);
  const [sendingVTCPratique, setSendingVTCPratique] = useState(false);
  const [sendingTAXIPratique, setSendingTAXIPratique] = useState(false);
  const [sentVTCPratique, setSentVTCPratique] = useState(false);
  const [sentTAXIPratique, setSentTAXIPratique] = useState(false);
  const [sendingVTCRelance, setSendingVTCRelance] = useState(false);
  const [sendingTAXIRelance, setSendingTAXIRelance] = useState(false);
  const [sentVTCRelance, setSentVTCRelance] = useState(false);
  const [sentTAXIRelance, setSentTAXIRelance] = useState(false);
  const [uploadingPlanning, setUploadingPlanning] = useState(false);
  const [analyzingPlanning, setAnalyzingPlanning] = useState(false);
  const [sendingVTCSMS, setSendingVTCSMS] = useState(false);
  const [sentVTCSMS, setSentVTCSMS] = useState(false);
  const [sendingTAXISMS, setSendingTAXISMS] = useState(false);
  const [sentTAXISMS, setSentTAXISMS] = useState(false);
  const [sendingRepassage, setSendingRepassage] = useState(false);
  const [sentRepassage, setSentRepassage] = useState(false);
  const [sendingFelicitations, setSendingFelicitations] = useState(false);
  const [sentFelicitations, setSentFelicitations] = useState(false);
  const [sendingRepassagePratique, setSendingRepassagePratique] = useState(false);
  const [sentRepassagePratique, setSentRepassagePratique] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMailType, setPreviewMailType] = useState<'felicitations' | 'repassage_pratique'>('felicitations');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewRecipients, setPreviewRecipients] = useState<any[]>([]);
  const [previewTab, setPreviewTab] = useState<string>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planningFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleSendRepassageEmails = async () => {
    const echoues = apprenants?.filter(a => (a as any).resultat_examen === 'non' && a.email) || [];
    if (echoues.length === 0) return;
    setSendingRepassage(true);
    let sent = 0;
    for (const apprenant of echoues) {
      const type = (apprenant.type_apprenant || '').toLowerCase();
      let formation = 'VTC';
      if (type.includes('ta-e') || type === 'ta') formation = 'TAXI (mobilité VTC vers TAXI)';
      else if (type.includes('taxi') || type.includes('ta-i')) formation = 'TAXI';

      const subject = `Réinscription à l'examen théorique T3P - ${apprenant.prenom} ${apprenant.nom}`;
      const body = `Bonjour ${apprenant.prenom},<br><br>Suite à votre précédent examen théorique ${formation}, vous devez procéder à une nouvelle inscription pour repasser l'examen théorique.<br><br>📌 <strong>ÉTAPES À SUIVRE :</strong><br><br><strong>1️⃣ Rendez-vous sur le site :</strong><br>👉 <a href="https://www.exament3p.fr" target="_blank">www.exament3p.fr</a><br><br><strong>2️⃣ Connectez-vous avec :</strong><br>• Login : votre adresse email<br>• Mot de passe : cliquez sur "Mot de passe oublié" pour en créer un nouveau<br><br><strong>3️⃣ Une fois connecté(e), procédez à votre réinscription à l'examen théorique</strong> en suivant les instructions du site.<br><br>⚠️ <strong>IMPORTANT — Département 69 obligatoire :</strong><br><span style="color: red; font-size: 16px; font-weight: bold;">🔴 ATTENTION : Lors de votre réinscription, vous devez IMPÉRATIVEMENT sélectionner le département 69 (Rhône), même si vous résidez dans un autre département. Si vous choisissez un autre département, nous ne pourrons pas vous former ni vous louer un véhicule pour l'examen pratique.</span><br><br>⚠️ <strong>IMPORTANT :</strong> Une fois votre réinscription effectuée sur le site, merci de nous recontacter immédiatement afin que nous puissions finaliser votre dossier et vous accompagner pour la suite.<br><br>📞 Tél : <strong>04 28 29 60 91</strong><br>📧 Email : contact@ftransport.fr<br><br>N'hésitez pas à nous contacter si vous rencontrez des difficultés lors de votre réinscription.<br><br>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon`;

      try {
        await supabase.functions.invoke('sync-outlook-emails', {
          body: { action: 'send', userEmail: 'contact@ftransport.fr', to: apprenant.email, subject, body, apprenantId: apprenant.id }
        });
        sent++;
      } catch (e) {
        console.error(`Erreur envoi repassage à ${apprenant.email}:`, e);
      }
    }
    setSendingRepassage(false);
    setSentRepassage(true);
    toast.success(`📧 ${sent}/${echoues.length} email(s) "Repassage examen théorique" envoyé(s)`);
  };

  // Déplacer un candidat à la prochaine session d'entraînement
  const handleDecalerProchaineSession = async (apprenantId: string, apprenantNom: string) => {
    try {
      // Mark presence_pratique = 'deplace' in session_apprenants for pratique sessions
      const { data: sessionsApprenant } = await supabase
        .from('session_apprenants')
        .select('id, session_id, sessions!inner(type_session)')
        .eq('apprenant_id', apprenantId)
        .eq('sessions.type_session', 'pratique' as any);
      if (sessionsApprenant && sessionsApprenant.length > 0) {
        for (const sa of sessionsApprenant) {
          await supabase
            .from('session_apprenants')
            .update({ presence_pratique: 'deplace' })
            .eq('id', sa.id);
        }
      }
      // Update resultat_examen_pratique in apprenants
      await supabase
        .from('apprenants')
        .update({ resultat_examen_pratique: 'deplace' } as any)
        .eq('id', apprenantId);
      // Delete existing reservation so they can book a new one next session
      await supabase.from('reservations_pratique').delete().eq('apprenant_id', apprenantId);
      queryClient.invalidateQueries({ queryKey: ['deplaces-session-pratique'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-pratique-planning'] });
      queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
      toast.success(`${apprenantNom} déplacé(e) à la prochaine session — inclus dans la lettre CMA et les candidats à former`);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Échec'));
    }
  };

  // Annuler le statut "déplacé" d'un candidat
  const handleAnnulerDeplace = async (apprenantId: string, apprenantNom: string) => {
    try {
      const { data: sessionsApprenant } = await supabase
        .from('session_apprenants')
        .select('id, session_id, sessions!inner(type_session)')
        .eq('apprenant_id', apprenantId)
        .eq('presence_pratique', 'deplace')
        .eq('sessions.type_session', 'pratique' as any);
      if (sessionsApprenant && sessionsApprenant.length > 0) {
        for (const sa of sessionsApprenant) {
          await supabase
            .from('session_apprenants')
            .update({ presence_pratique: 'present' })
            .eq('id', sa.id);
        }
      }
      await supabase
        .from('apprenants')
        .update({ resultat_examen_pratique: null } as any)
        .eq('id', apprenantId);
      queryClient.invalidateQueries({ queryKey: ['deplaces-session-pratique'] });
      queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
      toast.success(`Statut "Déplacé" annulé pour ${apprenantNom}`);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Échec'));
    }
  };

  // Cancel a reservation
  const handleCancelReservation = async (apprenantId: string, apprenantNom: string) => {
    try {
      const { error } = await supabase
        .from('reservations_pratique')
        .delete()
        .eq('apprenant_id', apprenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['reservations-pratique-planning'] });
      toast.success(`Réservation de ${apprenantNom} annulée`);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Échec'));
    }
  };

  // Assign a date to a candidate and notify by email
  const handleAssignDate = async (apprenantId: string, apprenantNom: string, date: string, typeFormation: string) => {
    try {
      // Delete existing reservation first (upsert by apprenant_id which is unique)
      await supabase.from('reservations_pratique').delete().eq('apprenant_id', apprenantId);
      const { error } = await supabase
        .from('reservations_pratique')
        .insert({ apprenant_id: apprenantId, date_choisie: date, type_formation: typeFormation });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['reservations-pratique-planning'] });
      toast.success(`Date ${date} assignée à ${apprenantNom}`);

      // Send notification email
      const apprenant = allApprenants?.find(a => a.id === apprenantId);
      if (apprenant?.email) {
        const dateFormatted = formatDateFR(date);
        const typeUpper = typeFormation.toUpperCase();
        const exerciceLink = typeFormation === 'vtc' 
          ? 'https://app.formative.com/join/DNFDZS' 
          : 'https://app.formative.com/join/ZT924H';
        const subject = `Votre date de formation pratique ${typeUpper} - ${apprenant.prenom} ${apprenant.nom}`;
        const body = `Bonjour ${apprenant.prenom},<br><br>Votre date de formation pratique ${typeUpper} a été fixée au :<br><br><strong>📅 ${dateFormatted}</strong><br><br>📍 RDV au 86 Route de Genas 69003 Lyon à 9h.<br>🍽️ Pause déjeuner à Confluences de 12h à 13h.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices :<br><a href="${exerciceLink}">${exerciceLink}</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
        try {
          await supabase.functions.invoke('sync-outlook-emails', {
            body: { action: 'send', userEmail: 'contact@ftransport.fr', to: apprenant.email, subject, body, apprenantId }
          });
          toast.success(`Email de notification envoyé à ${apprenant.email}`);
        } catch {
          toast.error("Date assignée mais l'email n'a pas pu être envoyé");
        }
      }
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'Échec'));
    }
  };

  // Dates centralisées — on garde TOUTES les dates (y compris passées) pour consulter les résultats
  const datesExamenTheorique = ALL_DATES_EXAMEN_REUSSITE;
  const datesExamenPratique = ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT;

  const handleExamDateChange = (date: string) => {
    setSelectedExamDate(date);
    const match = datesExamenTheorique.find(e => e.date === date);
    if (match !== undefined) {
      setSelectedDatePratique(datesExamenPratique[match.pratiqueIndex]);
    }
  };

  const handlePlanningUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 4 Mo)");
      return;
    }
    setUploadingPlanning(true);
    try {
      const fileName = `planning-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("exam-results")
        .upload(fileName, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      setUploadingPlanning(false);
      setAnalyzingPlanning(true);
      const { data, error } = await supabase.functions.invoke("parse-exam-planning", {
        body: { fileName },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(
          `${data.totalUpdated} date(s) d'examen mise(s) à jour${data.totalNotFound > 0 ? ` • ${data.totalNotFound} candidat(s) non trouvé(s)` : ''}`,
          { duration: 8000 }
        );
        if (data.notFound?.length > 0) {
          console.log("Candidats non trouvés:", data.notFound);
        }
        queryClient.invalidateQueries({ queryKey: ['apprenants'] });
        queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
      } else {
        toast.error(data?.error || "Erreur lors de l'analyse");
      }
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Échec de l'analyse"));
    } finally {
      setUploadingPlanning(false);
      setAnalyzingPlanning(false);
      if (planningFileInputRef.current) planningFileInputRef.current.value = '';
    }
  };

  const { data: apprenants, isLoading } = useQuery({
    queryKey: ['apprenants-examen', selectedExamDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .ilike('date_examen_theorique', `%${selectedExamDate}%`)
        .is('deleted_at', null)
        .order('nom', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: allApprenants } = useQuery({
    queryKey: ['all-apprenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('id, nom, prenom, type_apprenant, telephone, email, date_examen_theorique, date_examen_pratique, heure_examen_pratique, resultat_examen, resultat_examen_pratique, numero_dossier_cma')
        .is('deleted_at', null)
        .order('nom', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch apprenants marqués "Déplacé à la prochaine session"
  // Source 1 : session_apprenants.presence_pratique = 'deplace' (candidats inscrits en session pratique)
  // Source 2 : apprenants.resultat_examen_pratique = 'deplace' (candidats sans session pratique, ex: Sarah)
  const { data: deplacesSessionPratique } = useQuery({
    queryKey: ['deplaces-session-pratique'],
    queryFn: async () => {
      const [{ data: dataSession }, { data: dataApprenants }] = await Promise.all([
        supabase
          .from('session_apprenants')
          .select('apprenant_id, session_id, sessions!inner(type_session)')
          .eq('presence_pratique', 'deplace')
          .eq('sessions.type_session', 'pratique'),
        supabase
          .from('apprenants')
          .select('id')
          .eq('resultat_examen_pratique', 'deplace'),
      ]);
      const idsSession = (dataSession || []).map((d: any) => d.apprenant_id);
      const idsApprenants = (dataApprenants || []).map((d: any) => d.id);
      return [...new Set([...idsSession, ...idsApprenants])];
    },
  });

  // Fetch reservations pratique
  const { data: reservationsPratique } = useQuery({
    queryKey: ['reservations-pratique-planning'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations_pratique')
        .select('id, date_choisie, type_formation, apprenant_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch uploaded PDF files
  const { data: examFiles, refetch: refetchFiles } = useQuery({
    queryKey: ['exam-result-files'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('exam-results')
        .list('', { sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      return data || [];
    },
  });

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error("Seuls les fichiers PDF sont acceptés");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }
    setUploading(true);
    const fileName = `resultats-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('exam-results')
      .upload(fileName, file);
    setUploading(false);
    if (error) {
      toast.error("Erreur lors de l'upload : " + error.message);
    } else {
      toast.success("PDF uploadé avec succès");
      refetchFiles();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteFile = async (fileName: string) => {
    const { error } = await supabase.storage
      .from('exam-results')
      .remove([fileName]);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Fichier supprimé");
      refetchFiles();
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('exam-results')
      .createSignedUrl(fileName, 60);
    if (error || !data?.signedUrl) {
      toast.error("Erreur lors du téléchargement");
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleAnalyzePdf = async (fileName: string, examType: 'admissibilite' | 'admission') => {
    setAnalyzing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-exam-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ fileName, examType }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        toast.error("Erreur : " + (result.error || "Échec de l'analyse"));
      } else {
        const totalExtracted = result.totalExtracted || 0;
        const totalMatched = result.totalMatched || 0;
        const totalNotFound = result.totalNotFound || 0;
        const oui = result.matched?.filter((d: any) => d.resultat === 'oui').length || 0;
        const non = result.matched?.filter((d: any) => d.resultat === 'non').length || 0;
        const typeLabel = examType === 'admission' ? 'Admission (Pratique)' : 'Admissibilité (Théorie)';

        toast.success(
          `${typeLabel} : ${totalMatched} résultats mappés sur ${totalExtracted} candidats — ${totalNotFound} non trouvé(s)\n✅ ${oui} admis, ❌ ${non} ajourné(s)`,
          { duration: 10000 }
        );

        if (result.notFound?.length > 0) {
          const names = result.notFound.map((n: any) => `${n.nom} ${n.prenom}`).join(', ');
          toast.warning(`⚠️ Candidats non trouvés (saisie manuelle requise) : ${names}`, { duration: 15000 });
          console.log("Candidats non trouvés:", result.notFound);
        }

        queryClient.invalidateQueries({ queryKey: ['apprenants-examen', selectedExamDate] });
        queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
      }
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateResultat = useMutation({
    mutationFn: async ({ id, resultat }: { id: string; resultat: string | null }) => {
      // Vérifier que l'apprenant a une date d'examen avant de le mettre en absent
      if (resultat === 'absent') {
        const apprenant = apprenants?.find(a => a.id === id);
        if (!apprenant?.date_examen_theorique) {
          throw new Error("Impossible de mettre en absent : l'apprenant n'est inscrit à aucune date d'examen");
        }
      }
      const { error } = await supabase
        .from('apprenants')
        .update({ resultat_examen: resultat } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apprenants-examen', selectedExamDate] });
      toast.success("Résultat mis à jour");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour");
    },
  });

  const filtered = apprenants?.filter(a =>
    `${a.nom} ${a.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  const reussis = apprenants?.filter(a => (a as any).resultat_examen === 'oui') || [];
  const nonReussis = apprenants?.filter(a => (a as any).resultat_examen === 'non') || [];
  const absents = apprenants?.filter(a => (a as any).resultat_examen === 'absent') || [];

  const repassageCandidates = allApprenants?.filter(a =>
    !repassageList.includes(a.id) &&
    `${a.nom} ${a.prenom}`.toLowerCase().includes(repassageSearch.toLowerCase())
  ) || [];

  const repassageApprenants = allApprenants?.filter(a => repassageList.includes(a.id)) || [];

  const typeLabel: Record<string, string> = {
    'vtc': 'VTC', 'vtc-e': 'VTC E', 'vtc-e-presentiel': 'VTC E Présentiel',
    'taxi': 'TAXI', 'taxi-e': 'TAXI E', 'taxi-e-presentiel': 'TAXI E Présentiel',
    'ta': 'TA', 'ta-e': 'TA E', 'va': 'VA', 'va-e': 'VA E',
    'pa-vtc': 'PA VTC', 'pa-taxi': 'PA TAXI', 'rp-vtc': 'RP VTC', 'rp-taxi': 'RP TAXI',
  };

  const typeColor: Record<string, string> = {
    'vtc': 'bg-blue-100 text-blue-800', 'vtc-e': 'bg-blue-100 text-blue-800',
    'taxi': 'bg-amber-100 text-amber-800', 'taxi-e': 'bg-amber-100 text-amber-800',
    'ta': 'bg-purple-100 text-purple-800', 'ta-e': 'bg-purple-100 text-purple-800',
    'va': 'bg-green-100 text-green-800', 'va-e': 'bg-green-100 text-green-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Examen et Réussite</h1>
          <p className="text-sm text-muted-foreground">Suivi des examens théoriques</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedExamDate} onValueChange={handleExamDateChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Date d'examen" />
            </SelectTrigger>
            <SelectContent>
              {datesExamenTheorique.map(e => (
                <SelectItem key={e.date} value={e.date}>{e.date} — {e.lieu}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Examen réussi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{reussis.length}</div>
            {reussis.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {reussis.map(a => (
                  <div key={a.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>{a.nom} {a.prenom}</span>
                    <Badge variant="outline" className="text-[10px] px-1">{a.date_examen_theorique}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Non réussi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{nonReussis.length}</div>
            {nonReussis.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {nonReussis.map(a => (
                  <div key={a.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>{a.nom} {a.prenom}</span>
                    <Badge variant="outline" className="text-[10px] px-1">{a.date_examen_theorique}</Badge>
                  </div>
                ))}
              </div>
            )}
            {nonReussis.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={sendingRepassage || sentRepassage} className={`mt-2 w-full gap-1.5 text-xs ${sentRepassage ? 'text-green-700 border-green-300' : ''}`}>
                    {sentRepassage ? <CheckCircle2 className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                    {sendingRepassage ? 'Envoi...' : sentRepassage ? 'Envoyé ✓' : `Email repassage (${nonReussis.filter(a => a.email).length})`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Envoyer l'email de repassage théorique ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'email "Repassage examen théorique" sera envoyé à {nonReussis.filter(a => a.email).length} apprenant(s) ayant échoué. Il contient le lien vers exament3p.fr et l'obligation de choisir le département 69.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSendRepassageEmails}>Confirmer l'envoi</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-500" />
              Absent / Pas de n° dossier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{absents.length}</div>
            {absents.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {absents.map(a => (
                  <div key={a.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>{a.nom} {a.prenom}</span>
                    {!a.numero_dossier_cma && <Badge variant="destructive" className="text-[10px] px-1">Pas de CMA</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Récapitulatif par catégorie */}
      {(() => {
        const inscrits = apprenants || [];
        const getCategorie = (type: string | null) => {
          if (!type) return 'Autre';
          const t = type.toLowerCase();
          if (['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e'].includes(t)) return 'TAXI';
          if (['vtc', 'vtc-e', 'vtc-e-presentiel', 'va-e'].includes(t)) return 'VTC';
          return 'Autre';
        };
        const taxis = inscrits.filter(a => getCategorie(a.type_apprenant) === 'TAXI');
        const vtcs = inscrits.filter(a => getCategorie(a.type_apprenant) === 'VTC');
        const autres = inscrits.filter(a => getCategorie(a.type_apprenant) === 'Autre');

        const renderGroup = (title: string, list: typeof inscrits, color: string, badgeClass: string) => (
          list.length > 0 && (
            <Card key={title} className={`border-l-4 ${color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {title}
                  </span>
                  <Badge className={badgeClass}>{list.length} apprenant(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prénom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date d'examen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.nom}</TableCell>
                          <TableCell>{a.prenom}</TableCell>
                          <TableCell>
                            <Badge className={typeColor[a.type_apprenant || ''] || 'bg-gray-100 text-gray-800'}>
                              {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{a.date_examen_theorique || '-'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        );

        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Récapitulatif des inscrits par catégorie — Total : {inscrits.length}
            </h2>
            {renderGroup('TAXI (Taxi, Taxi E, TA, TA E)', taxis, 'border-l-amber-500', 'bg-amber-100 text-amber-800')}
            {renderGroup('VTC (VTC, VTC E, VA E)', vtcs, 'border-l-blue-500', 'bg-blue-100 text-blue-800')}
            {renderGroup('Autre', autres, 'border-l-gray-400', 'bg-gray-100 text-gray-800')}
          </div>
        );
      })()}

      {/* Check if all results are filled */}
      {(() => {
        const totalInscrits = apprenants?.length || 0;
        const sansResultat = apprenants?.filter(a => !(a as any).resultat_examen) || [];
        const resultatsComplets = totalInscrits > 0 && sansResultat.length === 0;

        if (!resultatsComplets) {
          return (
            <Card className="border-l-4 border-l-orange-500 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800">Résultats d'examen incomplets</p>
                    <p className="text-sm text-orange-700 mt-1">
                      {sansResultat.length} apprenant(s) sur {totalInscrits} n'ont pas encore de résultat renseigné.
                      Le planning de formation pratique et la lettre CMA ne seront disponibles qu'une fois tous les résultats saisis.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sansResultat.slice(0, 10).map(a => (
                        <Badge key={a.id} variant="outline" className="text-orange-700 border-orange-300 text-xs">
                          {a.nom} {a.prenom}
                        </Badge>
                      ))}
                      {sansResultat.length > 10 && (
                        <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs">
                          +{sansResultat.length - 10} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return null;
      })()}

      {/* Lettre CMA - Réussite examen */}
      {(() => {
        const totalInscrits = apprenants?.length || 0;
        const sansResultat = apprenants?.filter(a => !(a as any).resultat_examen) || [];
        const resultatsIncomplets = totalInscrits === 0 || sansResultat.length > 0;

        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        // Find the default practical date for the current theoretical exam
        const currentTheorique = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique = currentTheorique ? datesExamenPratique[currentTheorique.pratiqueIndex] : null;
        
        const parsePeriodRangeCMA = (period: string): { start: Date; end: Date } | null => {
          const norm = period.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const moisMap: Record<string, number> = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };
          const match2 = norm.match(/du\s+(\d+)(?:er)?\s+(\w+)\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match2) {
            const [, d1, m1, d2, m2, y] = match2;
            return { start: new Date(+y, moisMap[m1] ?? 0, +d1), end: new Date(+y, moisMap[m2] ?? 0, +d2) };
          }
          const match1 = norm.match(/du\s+(\d+)(?:er)?\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match1) {
            const [, d1, d2, m, y] = match1;
            return { start: new Date(+y, moisMap[m] ?? 0, +d1), end: new Date(+y, moisMap[m] ?? 0, +d2) };
          }
          return null;
        };
        const isISODateCMA = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
        const periodRangeCMA = parsePeriodRangeCMA(selectedDatePratique);

        const matchPratique = (datePratique: string | null) => {
          if (!datePratique) {
            return defaultPratique ? normalize(defaultPratique) === normalize(selectedDatePratique) : false;
          }
          if (normalize(datePratique) === normalize(selectedDatePratique)) return true;
          if (isISODateCMA(datePratique) && periodRangeCMA) {
            const d = new Date(datePratique);
            return d >= periodRangeCMA.start && d <= periodRangeCMA.end;
          }
          return false;
        };

        // Candidats réussis de l'examen théorique (sans filtre sur la date pratique)
        const reussisTheorique = apprenants?.filter(a => 
          (a as any).resultat_examen === 'oui'
        ) || [];
        // PA et RP : inclus si leur date d'examen théorique correspond à la date sélectionnée
        const paRpTypes = ['pa-vtc', 'pa-taxi', 'rp-vtc', 'rp-taxi'];
        const paRpApprenants = (allApprenants || []).filter(a => 
          paRpTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          a.date_examen_theorique?.includes(selectedExamDate) &&
          !reussisTheorique.some(r => r.id === a.id)
        );
        // Candidats déplacés à la prochaine session (depuis sessions pratiques précédentes)
        const deplacesApprenantsCMA = (allApprenants || []).filter(a =>
          (deplacesSessionPratique || []).includes(a.id) &&
          !reussisTheorique.some(r => r.id === a.id) &&
          !paRpApprenants.some(r => r.id === a.id)
        );
        const reussisLettre = [...reussisTheorique, ...paRpApprenants, ...deplacesApprenantsCMA];


        const getCategorieCMA = (type: string | null) => {
          if (!type) return null;
          const t = type.toLowerCase();
          if (['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e', 'pa-taxi', 'rp-taxi'].includes(t)) return 'TAXI';
          if (['vtc', 'vtc-e', 'vtc-e-presentiel', 'va-e', 'pa-vtc', 'rp-vtc'].includes(t)) return 'VTC';
          return null;
        };

        const taxiReussis = reussisLettre.filter(a => getCategorieCMA(a.type_apprenant) === 'TAXI');
        const vtcReussis = reussisLettre.filter(a => getCategorieCMA(a.type_apprenant) === 'VTC');
        const maxRows = Math.max(taxiReussis.length, vtcReussis.length);

        const generateLettreHTML = () => {
          const taxiRows = taxiReussis.map(a => `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${a.nom} ${a.prenom}</td></tr>`).join('');
          const vtcRows = vtcReussis.map(a => `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${a.nom} ${a.prenom}</td></tr>`).join('');
          const padTaxi = taxiReussis.length < maxRows ? Array(maxRows - taxiReussis.length).fill('<tr><td style="padding:4px 8px;border:1px solid #ccc;">&nbsp;</td></tr>').join('') : '';
          const padVtc = vtcReussis.length < maxRows ? Array(maxRows - vtcReussis.length).fill('<tr><td style="padding:4px 8px;border:1px solid #ccc;">&nbsp;</td></tr>').join('') : '';

          const dateDebutText = dateDebutPratique 
            ? formatDateFR(dateDebutPratique, { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

          return `
            <div style="font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6;">
              <div style="text-align:right;margin-bottom:30px;">
                <p><strong>FTRANSPORT</strong><br/>
                Centre de formation<br/>
                Lyon</p>
                <p>Le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              <div style="margin-bottom:20px;">
                <p><strong>A l'attention de :</strong><br/>
                Mme Audrey CREVIER<br/>
                Chambre des Metiers et de l'Artisanat<br/>
                Auvergne-Rhone-Alpes<br/>
                <a href="mailto:audrey.crevier@cma-auvergnerhonealpes.fr">audrey.crevier@cma-auvergnerhonealpes.fr</a></p>
              </div>

              <p><strong>Objet :</strong> Liste des candidats ayant reussi l'examen du ${selectedExamDate}</p>
              <p><strong>Dates de passage pratique :</strong> ${selectedDatePratique}</p>
              ${dateDebutText ? `<p><strong>Début souhaité des passages :</strong> à partir du ${dateDebutText}</p>` : ''}

              <p>Madame,</p>
              <p>Veuillez trouver ci-dessous la liste des candidats de notre centre de formation ayant reussi l'examen theorique du ${selectedExamDate} :</p>

              <div style="display:flex;gap:20px;margin:20px 0;">
                <div style="flex:1;">
                  <table style="width:100%;border-collapse:collapse;">
                    <thead>
                      <tr><th style="padding:6px 8px;border:1px solid #ccc;background:#fef3c7;text-align:left;">TAXI (${taxiReussis.length})</th></tr>
                    </thead>
                    <tbody>${taxiRows}${padTaxi}</tbody>
                    <tfoot>
                      <tr><td style="padding:6px 8px;border:1px solid #ccc;background:#fef9e7;font-weight:bold;">Total : ${taxiReussis.length}</td></tr>
                    </tfoot>
                  </table>
                </div>
                <div style="flex:1;">
                  <table style="width:100%;border-collapse:collapse;">
                    <thead>
                      <tr><th style="padding:6px 8px;border:1px solid #ccc;background:#dbeafe;text-align:left;">VTC (${vtcReussis.length})</th></tr>
                    </thead>
                    <tbody>${vtcRows}${padVtc}</tbody>
                    <tfoot>
                      <tr><td style="padding:6px 8px;border:1px solid #ccc;background:#eff6ff;font-weight:bold;">Total : ${vtcReussis.length}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <p><strong>Total general : ${reussisLettre.length} candidat(s)</strong> — ${taxiReussis.length} TAXI, ${vtcReussis.length} VTC</p>

              <p><strong>Important :</strong> Nous disposons d'un seul vehicule disponible pour les epreuves pratiques.</p>

              <p>Je reste a votre disposition pour toute information complementaire.</p>
              <p style="margin-top:30px;">Cordialement,<br/><br/><strong>FTRANSPORT</strong></p>
            </div>
          `;
        };

        const handlePrintLettre = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
          printWindow.document.write(`
            <html>
            <head><title>Lettre CMA - Résultats examen</title></head>
            <body>${generateLettreHTML()}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        };

        const handleSendCMAEmail = async () => {
          if (reussisLettre.length === 0) return;
          setSendingCMAEmail(true);
          try {
            const htmlBody = generateLettreHTML();
            const dateDebutText = dateDebutPratique 
              ? ` - Début souhaité : ${formatDateFR(dateDebutPratique, { day: 'numeric', month: 'long', year: 'numeric' })}`
              : '';
            const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
              body: {
                action: 'send',
                userEmail: 'contact@ftransport.fr',
                to: 'audrey.crevier@cma-auvergnerhonealpes.fr',
                subject: `Liste candidats reçus - Examen du ${selectedExamDate}${dateDebutText}`,
                body: htmlBody,
                requestReadReceipt: true,
              },
            });
            if (error) {
              // Log alert in DB from frontend as fallback
              await supabase.from('alertes_systeme').insert({
                type: 'email_error',
                titre: 'Échec envoi Lettre CMA',
                message: `Erreur lors de l'envoi à audrey.crevier@cma-auvergnerhonealpes.fr : ${error.message || 'Erreur inconnue'}`,
                details: `Examen: ${selectedExamDate}\nCandidats: ${reussisLettre.length}`,
              });
              throw error;
            }
            if (data?.success) {
              // Enregistrer l'email envoyé dans la table emails
              const dateDebutTextForSubject = dateDebutPratique 
                ? ` - Début souhaité : ${formatDateFR(dateDebutPratique, { day: 'numeric', month: 'long', year: 'numeric' })}`
                : '';
              await supabase.from('emails').insert({
                subject: `Liste candidats reçus - Examen du ${selectedExamDate}${dateDebutTextForSubject}`,
                body_html: htmlBody,
                body_preview: `Liste des ${reussisLettre.length} candidats reçus à l'examen du ${selectedExamDate}`,
                sender_email: 'contact@ftransport.fr',
                recipients: ['audrey.crevier@cma-auvergnerhonealpes.fr'],
                type: 'sent',
                is_read: true,
                sent_at: new Date().toISOString(),
              });
              toast.success('Email envoyé à la CMA avec accusé de réception demandé !');
            } else {
              await supabase.from('alertes_systeme').insert({
                type: 'email_error',
                titre: 'Échec envoi Lettre CMA',
                message: `L'envoi à audrey.crevier@cma-auvergnerhonealpes.fr a échoué.`,
                details: `Examen: ${selectedExamDate}\nCandidats: ${reussisLettre.length}`,
              });
              throw new Error('Échec de l\'envoi');
            }
          } catch (err) {
            console.error('Erreur envoi CMA:', err);
            toast.error('Erreur lors de l\'envoi — alerte ajoutée au tableau de bord');
          } finally {
            setSendingCMAEmail(false);
          }
        };

        return (
          <Card className="border-l-4 border-l-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-teal-600" />
                  Lettre CMA — Candidats reçus
                </span>
                <div className="flex items-center gap-2">
                  <Button onClick={handlePrintLettre} disabled={reussisLettre.length === 0 || resultatsIncomplets} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Imprimer ({reussisLettre.length})
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={reussisLettre.length === 0 || sendingCMAEmail || resultatsIncomplets} 
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {sendingCMAEmail ? 'Envoi...' : `Envoyer par email (${reussisLettre.length})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer l'envoi à la CMA</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3 text-sm">
                            <p><strong>Destinataire :</strong> audrey.crevier@cma-auvergnerhonealpes.fr</p>
                            <p><strong>Objet :</strong> Liste candidats reçus - Examen du {selectedExamDate}</p>
                            <p><strong>Dates pratique :</strong> {selectedDatePratique}</p>
                            {dateDebutPratique && (
                              <p><strong>Début souhaité des passages :</strong> à partir du {formatDateFR(dateDebutPratique, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            )}
                            <div className="flex gap-4">
                              <p><strong>TAXI :</strong> {taxiReussis.length} candidat(s)</p>
                              <p><strong>VTC :</strong> {vtcReussis.length} candidat(s)</p>
                            </div>
                            <p><strong>Total :</strong> {reussisLettre.length} candidat(s)</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              ✓ Un accusé de réception sera demandé
                            </p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSendCMAEmail}>
                          Confirmer l'envoi
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
              {resultatsIncomplets && sansResultat.length > 0 && (
                <div className="mt-3 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
                  <p className="text-red-700 font-bold text-lg flex items-center gap-2">
                    <XCircle className="h-6 w-6" />
                    ⚠️ RÉSULTATS D'EXAMEN MANQUANTS — Impossible d'envoyer la lettre
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    {sansResultat.length} candidat(s) inscrit(s) à l'examen du {selectedExamDate} n'ont pas encore de résultat renseigné :
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sansResultat.map(a => (
                      <Badge key={a.id} className="bg-red-200 text-red-800 border-red-400 text-sm font-semibold px-3 py-1">
                        {a.nom} {a.prenom} — ☎️ {a.telephone || 'pas de tél'}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-red-600 text-xs mt-2 italic">
                    Saisissez le résultat (Oui / Non / Absent) de chaque candidat dans le tableau ci-dessus avant d'envoyer la lettre.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <p className="text-sm text-muted-foreground">Dates de passage pratique :</p>
                <Select value={selectedDatePratique} onValueChange={setSelectedDatePratique}>
                  <SelectTrigger className="w-72 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {datesExamenPratique.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">À partir du :</p>
                <Input 
                  type="date" 
                  value={dateDebutPratique} 
                  onChange={(e) => setDateDebutPratique(e.target.value)}
                  className="w-48 h-8 text-sm"
                  placeholder="Date de début souhaitée"
                />
              </div>
              {reussisLettre.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-amber-700">TAXI ({taxiReussis.length})</h4>
                    <div className="space-y-1">
                      {taxiReussis.map(a => (
                        <div key={a.id} className="text-sm px-2 py-1 bg-amber-50 rounded">{a.nom} {a.prenom}</div>
                      ))}
                      {taxiReussis.length === 0 && <p className="text-xs text-muted-foreground">Aucun</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-blue-700">VTC ({vtcReussis.length})</h4>
                    <div className="space-y-1">
                      {vtcReussis.map(a => (
                        <div key={a.id} className="text-sm px-2 py-1 bg-blue-50 rounded">{a.nom} {a.prenom}</div>
                      ))}
                      {vtcReussis.length === 0 && <p className="text-xs text-muted-foreground">Aucun</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Récapitulatif formation pratique */}
      {(() => {
        // Block access if not all exam results are filled
        const totalInscritsFormer = apprenants?.length || 0;
        const sansResultatFormer = apprenants?.filter(a => !(a as any).resultat_examen) || [];
        if (totalInscritsFormer === 0 || sansResultatFormer.length > 0) return null;

        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const currentTheorique2 = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique2 = currentTheorique2 ? datesExamenPratique[currentTheorique2.pratiqueIndex] : null;
        // Parse date range from period string like "Du 23 fevrier au 6 mars 2026"
        const parsePeriodRange = (period: string): { start: Date; end: Date } | null => {
          const norm = period.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const moisMap: Record<string, number> = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };
          // Match "du X mois au Y mois annee" or "du X au Y mois annee"
          const match2 = norm.match(/du\s+(\d+)(?:er)?\s+(\w+)\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match2) {
            const [, d1, m1, d2, m2, y] = match2;
            return { start: new Date(+y, moisMap[m1] ?? 0, +d1), end: new Date(+y, moisMap[m2] ?? 0, +d2) };
          }
          const match1 = norm.match(/du\s+(\d+)(?:er)?\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match1) {
            const [, d1, d2, m, y] = match1;
            return { start: new Date(+y, moisMap[m] ?? 0, +d1), end: new Date(+y, moisMap[m] ?? 0, +d2) };
          }
          return null;
        };
        const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
        const periodRange = parsePeriodRange(selectedDatePratique);

        const matchPratiqueFormation = (datePratique: string | null) => {
          if (!datePratique) {
            return defaultPratique2 ? normalize(defaultPratique2) === normalize(selectedDatePratique) : false;
          }
          // Direct text match
          if (normalize(datePratique) === normalize(selectedDatePratique)) return true;
          // ISO date match within selected period range
          if (isISODate(datePratique) && periodRange) {
            const d = new Date(datePratique);
            return d >= periodRange.start && d <= periodRange.end;
          }
          return false;
        };

        // Tous les candidats à former : réussis (pas les RP) — sans filtre sur la date pratique
        const paTypes = ['pa-vtc', 'pa-taxi'];
        const rpTypes = ['rp-vtc', 'rp-taxi'];
        const reussisFormation = apprenants?.filter(a => 
          (a as any).resultat_examen === 'oui' && 
          !rpTypes.includes((a.type_apprenant || '').toLowerCase())
        ) || [];
        const paFormation = (allApprenants || []).filter(a => 
          paTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          a.date_examen_theorique?.includes(selectedExamDate) &&
          (a as any).resultat_examen === 'oui' &&
          !reussisFormation.some(r => r.id === a.id)
        );
        // Candidats déplacés à la prochaine session (sessions pratiques précédentes)
        const deplacesFormation = (allApprenants || []).filter(a =>
          (deplacesSessionPratique || []).includes(a.id) &&
          !reussisFormation.some(r => r.id === a.id) &&
          !paFormation.some(r => r.id === a.id)
        );
        // tousAFormer inclut les déplacés (ils apparaissent aussi dans leur propre section "Décalés")
        const tousAFormer = [...reussisFormation, ...paFormation, ...deplacesFormation];

        const isVTC = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return ['vtc', 'vtc-e', 'vtc-e-presentiel', 'va-e', 'pa-vtc'].includes(t);
        };
        const isTAXI = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return ['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e', 'pa-taxi'].includes(t);
        };

        const vtcList = tousAFormer.filter(a => isVTC(a.type_apprenant));
        const taxiList = tousAFormer.filter(a => isTAXI(a.type_apprenant));
        const joursVTC = Math.ceil(vtcList.length / 4);
        const joursTAXI = Math.ceil(taxiList.length / 3);
        const maxRows = Math.max(vtcList.length, taxiList.length);

        return (
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                Candidats à former
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* VTC */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-blue-700">VTC (Présentiel, E-learning, VA, PA VTC)</h4>
                  <div className="flex flex-wrap gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={vtcList.length === 0 || sendingVTCPratique || sentVTCPratique} className={`gap-1.5 text-xs ${sentVTCPratique ? 'text-green-700 border-green-300' : ''}`}>
                          {sentVTCPratique ? <CheckCircle2 className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {sendingVTCPratique ? 'Envoi...' : sentVTCPratique ? 'Envoyé ✓' : `Email dates (${vtcList.filter(a => a.email).length})`}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Envoyer les emails VTC - Dates pratique</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                              <p>Envoyer l'email "Félicitations VTC - Choix date pratique" à {vtcList.filter(a => a.email).length} candidat(s) ayant un email renseigné ?</p>
                              <p className="font-medium text-blue-700">📅 Entraînement VTC : du 16 au 24 février 2026</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            const candidates = vtcList.filter(a => a.email);
                            if (candidates.length === 0) return;
                            setSendingVTCPratique(true);
                            let sent = 0;
                            for (const a of candidates) {
                              const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=vtc`;
                              const subject = `Félicitations - Choix de votre date de formation pratique VTC - ${a.prenom} ${a.nom}`;
                              const body = `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (de 9h à 17h).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique VTC" : Quizz Lyon et Questions à apprendre.<br>Ou cliquez sur le lien suivant : <a href="https://app.formative.com/join/DNFDZS">https://app.formative.com/join/DNFDZS</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
                              try {
                                const { error } = await supabase.functions.invoke('sync-outlook-emails', {
                                  body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id }
                                });
                                if (!error) sent++;
                              } catch {}
                            }
                            setSendingVTCPratique(false);
                            setSentVTCPratique(true);
                            toast.success(`${sent}/${candidates.length} email(s) VTC envoyé(s)`);
                          }}>Envoyer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Relancer VTC */}
                    {(() => {
                      const vtcSansResa = vtcList.filter(a => a.email && !reservationsPratique?.some(r => r.apprenant_id === a.id));
                      return vtcSansResa.length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={sendingVTCRelance || sentVTCRelance} className={`gap-1.5 text-xs ${sentVTCRelance ? 'text-green-700 border-green-300' : 'text-orange-700 border-orange-300'}`}>
                              {sentVTCRelance ? <CheckCircle2 className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                              {sendingVTCRelance ? 'Envoi...' : sentVTCRelance ? 'Relancé ✓' : `Relancer (${vtcSansResa.length})`}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Relancer les VTC sans réservation</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2 text-sm">
                                  <p>Envoyer un rappel à <strong>{vtcSansResa.length}</strong> candidat(s) VTC qui n'ont pas encore choisi de créneau :</p>
                                  <ul className="list-disc pl-4">{vtcSansResa.map(a => <li key={a.id}>{a.nom} {a.prenom}</li>)}</ul>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                setSendingVTCRelance(true);
                                let sent = 0;
                                for (const a of vtcSansResa) {
                                  const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=vtc`;
                                  const subject = `RAPPEL - Choisissez votre date de formation pratique VTC - ${a.prenom} ${a.nom}`;
                                  const body = `Bonjour ${a.prenom},<br><br>Nous n'avons pas encore reçu votre choix de date pour la formation pratique VTC.<br><br>⚠️ Il est impératif de réserver votre créneau au plus vite.<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique VTC" : Quizz Lyon et Questions à apprendre.<br>Ou cliquez sur le lien suivant : <a href="https://app.formative.com/join/DNFDZS">https://app.formative.com/join/DNFDZS</a><br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
                                  try {
                                    const { error } = await supabase.functions.invoke('sync-outlook-emails', {
                                      body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id }
                                    });
                                    if (!error) sent++;
                                  } catch {}
                                }
                                setSendingVTCRelance(false);
                                setSentVTCRelance(true);
                                toast.success(`${sent}/${vtcSansResa.length} rappel(s) VTC envoyé(s)`);
                              }}>Envoyer les rappels</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;
                    })()}
                    {/* SMS VTC */}
                    {(() => {
                      const vtcSansResa = vtcList.filter(a => a.telephone && !reservationsPratique?.some(r => r.apprenant_id === a.id));
                      return vtcSansResa.length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={sendingVTCSMS || sentVTCSMS} className={`gap-1.5 text-xs ${sentVTCSMS ? 'text-green-700 border-green-300' : 'text-purple-700 border-purple-300'}`}>
                              {sentVTCSMS ? <CheckCircle2 className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                              {sendingVTCSMS ? 'Envoi...' : sentVTCSMS ? 'SMS ✓' : `SMS (${vtcSansResa.length})`}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Relancer par SMS les VTC sans réservation</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2 text-sm">
                                  <p>Envoyer un SMS à <strong>{vtcSansResa.length}</strong> candidat(s) VTC :</p>
                                  <ul className="list-disc pl-4">{vtcSansResa.map(a => <li key={a.id}>{a.nom} {a.prenom} — {a.telephone}</li>)}</ul>
                                  <div className="bg-muted p-3 rounded text-xs mt-2">
                                    <p className="font-medium mb-1">Message (personnalisé par candidat) :</p>
                                    <p>FTRANSPORT: Bonjour, vous n'avez pas encore choisi votre date de formation pratique VTC. Attention, il n'y aura pas d'autres dates d'entrainement. Reservez ici: [lien personnalise]</p>
                                  </div>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                setSendingVTCSMS(true);
                                let sent = 0;
                                try {
                                  for (const a of vtcSansResa) {
                                    const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=vtc`;
                                    const message = `FTRANSPORT: Bonjour, vous n'avez pas encore choisi votre date de formation pratique VTC. Attention, il n'y aura pas d'autres dates d'entrainement. Reservez ici: ${bookingUrl}`;
                                    const { data, error } = await supabase.functions.invoke('send-sms-ovh', {
                                      body: { receivers: [a.telephone!], message },
                                    });
                                    if (!error && data?.success) sent++;
                                  }
                                  setSentVTCSMS(true);
                                  toast.success(`${sent}/${vtcSansResa.length} SMS VTC envoyé(s)`);
                                } catch (err: any) {
                                  toast.error('Erreur SMS: ' + (err.message || 'Échec'));
                                } finally {
                                  setSendingVTCSMS(false);
                                }
                              }}>Envoyer les SMS</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;
                    })()}
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vtcList.map((a, i) => {
                          const reservation = reservationsPratique?.find(r => r.apprenant_id === a.id);
                          const hasReservation = !!reservation;
                          // VTC available dates: Feb 16-24, 2026 (weekdays only)
                          const vtcDates = ['2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-02-24'];
                          return (
                          <TableRow key={a.id}>
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium flex items-center gap-2">
                              {!hasReservation && <X className="h-4 w-4 text-red-500 shrink-0" />}
                              {hasReservation && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                              {a.nom} {a.prenom}
                              {hasReservation && <span className="text-xs text-muted-foreground">({reservation.date_choisie})</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {hasReservation && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Annuler la réservation">
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Supprimer la réservation du {reservation.date_choisie} pour <strong>{a.nom} {a.prenom}</strong> ? L'élève pourra rechoisir une date.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Non</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleCancelReservation(a.id, `${a.nom} ${a.prenom}`)}>Oui, annuler</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title={hasReservation ? "Changer la date" : "Choisir une date"}>
                                      <CalendarPlus className="h-3.5 w-3.5 text-blue-600" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" align="end">
                                    <p className="text-xs font-medium mb-2">{hasReservation ? 'Changer' : 'Choisir'} la date pour {a.prenom} :</p>
                                    <div className="grid gap-1">
                                      {vtcDates.map(d => (
                                        <Button key={d} variant={reservation?.date_choisie === d ? "default" : "outline"} size="sm" className="text-xs justify-start" onClick={() => handleAssignDate(a.id, `${a.nom} ${a.prenom}`, d, 'vtc')}>
                                          {formatDateShortFR(d)}
                                        </Button>
                                      ))}
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <p className="text-xs text-muted-foreground mb-1">Ou choisir une autre date :</p>
                                      <Input type="date" className="h-8 text-xs" onChange={(e) => { if (e.target.value) handleAssignDate(a.id, `${a.nom} ${a.prenom}`, e.target.value, 'vtc'); }} />
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-orange-700 border-orange-300 hover:bg-orange-50 gap-1.5"
                                        onClick={() => handleDecalerProchaineSession(a.id, `${a.nom} ${a.prenom}`)}
                                      >
                                        <CalendarPlus className="h-3.5 w-3.5" />
                                        Déplacer à la prochaine session
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-1">
                    <p className="text-sm font-bold text-blue-800">Total VTC à former : {vtcList.length}</p>
                    <p className="text-sm text-blue-700">4 candidats/jour → <strong>{joursVTC} jour(s)</strong> de formation nécessaires</p>
                  </div>
                </div>

                {/* TAXI */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-amber-700">TAXI (Présentiel, E-learning, TA, PA TAXI)</h4>
                  <div className="flex flex-wrap gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={taxiList.length === 0 || sendingTAXIPratique || sentTAXIPratique} className={`gap-1.5 text-xs ${sentTAXIPratique ? 'text-green-700 border-green-300' : ''}`}>
                          {sentTAXIPratique ? <CheckCircle2 className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {sendingTAXIPratique ? 'Envoi...' : sentTAXIPratique ? 'Envoyé ✓' : `Email dates (${taxiList.filter(a => a.email).length})`}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Envoyer les emails TAXI - Dates pratique</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                              <p>Envoyer l'email "Félicitations TAXI - Choix date pratique" à {taxiList.filter(a => a.email).length} candidat(s) ayant un email renseigné ?</p>
                              <p className="font-medium text-amber-700">📅 Entraînement TAXI : du 25 au 27 février 2026</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            const candidates = taxiList.filter(a => a.email);
                            if (candidates.length === 0) return;
                            setSendingTAXIPratique(true);
                            let sent = 0;
                            for (const a of candidates) {
                              const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=taxi`;
                              const subject = `Félicitations - Choix de votre date de formation pratique TAXI - ${a.prenom} ${a.nom}`;
                              const body = `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (jusqu'à 17h au maximum).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre.<br>Ou cliquez ici : <a href="https://app.formative.com/join/ZT924H">https://app.formative.com/join/ZT924H</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
                              try {
                                const { error } = await supabase.functions.invoke('sync-outlook-emails', {
                                  body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id }
                                });
                                if (!error) sent++;
                              } catch {}
                            }
                            setSendingTAXIPratique(false);
                            setSentTAXIPratique(true);
                            toast.success(`${sent}/${candidates.length} email(s) TAXI envoyé(s)`);
                          }}>Envoyer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Relancer TAXI */}
                    {(() => {
                      const taxiSansResa = taxiList.filter(a => a.email && !reservationsPratique?.some(r => r.apprenant_id === a.id));
                      return taxiSansResa.length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={sendingTAXIRelance || sentTAXIRelance} className={`gap-1.5 text-xs ${sentTAXIRelance ? 'text-green-700 border-green-300' : 'text-orange-700 border-orange-300'}`}>
                              {sentTAXIRelance ? <CheckCircle2 className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                              {sendingTAXIRelance ? 'Envoi...' : sentTAXIRelance ? 'Relancé ✓' : `Relancer (${taxiSansResa.length})`}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Relancer les TAXI sans réservation</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2 text-sm">
                                  <p>Envoyer un rappel à <strong>{taxiSansResa.length}</strong> candidat(s) TAXI qui n'ont pas encore choisi de créneau :</p>
                                  <ul className="list-disc pl-4">{taxiSansResa.map(a => <li key={a.id}>{a.nom} {a.prenom}</li>)}</ul>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                setSendingTAXIRelance(true);
                                let sent = 0;
                                for (const a of taxiSansResa) {
                                  const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=taxi`;
                                  const subject = `RAPPEL - Choisissez votre date de formation pratique TAXI - ${a.prenom} ${a.nom}`;
                                  const body = `Bonjour ${a.prenom},<br><br>Nous n'avons pas encore reçu votre choix de date pour la formation pratique TAXI.<br><br>⚠️ Il est impératif de réserver votre créneau au plus vite.<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre.<br>Ou cliquez ici : <a href="https://app.formative.com/join/ZT924H">https://app.formative.com/join/ZT924H</a><br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
                                  try {
                                    const { error } = await supabase.functions.invoke('sync-outlook-emails', {
                                      body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id }
                                    });
                                    if (!error) sent++;
                                  } catch {}
                                }
                                setSendingTAXIRelance(false);
                                setSentTAXIRelance(true);
                                toast.success(`${sent}/${taxiSansResa.length} rappel(s) TAXI envoyé(s)`);
                              }}>Envoyer les rappels</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;
                    })()}
                    {/* SMS TAXI */}
                    {(() => {
                      const taxiSansResa = taxiList.filter(a => a.telephone && !reservationsPratique?.some(r => r.apprenant_id === a.id));
                      return taxiSansResa.length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={sendingTAXISMS || sentTAXISMS} className={`gap-1.5 text-xs ${sentTAXISMS ? 'text-green-700 border-green-300' : 'text-purple-700 border-purple-300'}`}>
                              {sentTAXISMS ? <CheckCircle2 className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                              {sendingTAXISMS ? 'Envoi...' : sentTAXISMS ? 'SMS ✓' : `SMS (${taxiSansResa.length})`}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Relancer par SMS les TAXI sans réservation</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2 text-sm">
                                  <p>Envoyer un SMS à <strong>{taxiSansResa.length}</strong> candidat(s) TAXI :</p>
                                  <ul className="list-disc pl-4">{taxiSansResa.map(a => <li key={a.id}>{a.nom} {a.prenom} — {a.telephone}</li>)}</ul>
                                  <div className="bg-muted p-3 rounded text-xs mt-2">
                                    <p className="font-medium mb-1">Message (personnalisé par candidat) :</p>
                                    <p>FTRANSPORT: Bonjour, vous n'avez pas encore choisi votre date de formation pratique TAXI. Attention, il n'y aura pas d'autres dates d'entrainement. Reservez ici: [lien personnalise]</p>
                                  </div>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={async () => {
                                setSendingTAXISMS(true);
                                let sent = 0;
                                try {
                                  for (const a of taxiSansResa) {
                                    const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}&type=taxi`;
                                    const message = `FTRANSPORT: Bonjour, vous n'avez pas encore choisi votre date de formation pratique TAXI. Attention, il n'y aura pas d'autres dates d'entrainement. Reservez ici: ${bookingUrl}`;
                                    const { data, error } = await supabase.functions.invoke('send-sms-ovh', {
                                      body: { receivers: [a.telephone!], message },
                                    });
                                    if (!error && data?.success) sent++;
                                  }
                                  setSentTAXISMS(true);
                                  toast.success(`${sent}/${taxiSansResa.length} SMS TAXI envoyé(s)`);
                                } catch (err: any) {
                                  toast.error('Erreur SMS: ' + (err.message || 'Échec'));
                                } finally {
                                  setSendingTAXISMS(false);
                                }
                              }}>Envoyer les SMS</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;
                    })()}
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxiList.map((a, i) => {
                          const reservation = reservationsPratique?.find(r => r.apprenant_id === a.id);
                          const hasReservation = !!reservation;
                          const taxiDates = ['2026-02-25','2026-02-26','2026-02-27'];
                          return (
                          <TableRow key={a.id}>
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium flex items-center gap-2">
                              {!hasReservation && <X className="h-4 w-4 text-red-500 shrink-0" />}
                              {hasReservation && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                              {a.nom} {a.prenom}
                              {hasReservation && <span className="text-xs text-muted-foreground">({reservation.date_choisie})</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {hasReservation && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Annuler la réservation">
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Supprimer la réservation du {reservation.date_choisie} pour <strong>{a.nom} {a.prenom}</strong> ? L'élève pourra rechoisir une date.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Non</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleCancelReservation(a.id, `${a.nom} ${a.prenom}`)}>Oui, annuler</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title={hasReservation ? "Changer la date" : "Choisir une date"}>
                                      <CalendarPlus className="h-3.5 w-3.5 text-amber-600" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" align="end">
                                    <p className="text-xs font-medium mb-2">{hasReservation ? 'Changer' : 'Choisir'} la date pour {a.prenom} :</p>
                                    <div className="grid gap-1">
                                      {taxiDates.map(d => (
                                        <Button key={d} variant={reservation?.date_choisie === d ? "default" : "outline"} size="sm" className="text-xs justify-start" onClick={() => handleAssignDate(a.id, `${a.nom} ${a.prenom}`, d, 'taxi')}>
                                          {formatDateShortFR(d)}
                                        </Button>
                                      ))}
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <p className="text-xs text-muted-foreground mb-1">Ou choisir une autre date :</p>
                                      <Input type="date" className="h-8 text-xs" onChange={(e) => { if (e.target.value) handleAssignDate(a.id, `${a.nom} ${a.prenom}`, e.target.value, 'taxi'); }} />
                                    </div>
                                    <div className="border-t mt-2 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs text-orange-700 border-orange-300 hover:bg-orange-50 gap-1.5"
                                        onClick={() => handleDecalerProchaineSession(a.id, `${a.nom} ${a.prenom}`)}
                                      >
                                        <CalendarPlus className="h-3.5 w-3.5" />
                                        Déplacer à la prochaine session
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg space-y-1">
                    <p className="text-sm font-bold text-amber-800">Total TAXI à former : {taxiList.length}</p>
                    <p className="text-sm text-amber-700">3 candidats/jour → <strong>{joursTAXI} jour(s)</strong> de formation nécessaires</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                <p className="text-sm font-semibold">Total général : {tousAFormer.length} candidat(s) à former</p>
                <p className="text-sm text-muted-foreground">
                  {vtcList.length} VTC ({joursVTC}j) + {taxiList.length} TAXI ({joursTAXI}j)
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Planning formation pratique - from reservations + computed fallback */}
      {(() => {
        const totalInscritsP = apprenants?.length || 0;
        const sansResultatP = apprenants?.filter(a => !(a as any).resultat_examen) || [];
        if (totalInscritsP === 0 || sansResultatP.length > 0) return null;

        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

        // Build apprenant map
        const appMap: Record<string, { id: string; nom: string; prenom: string; type_apprenant: string | null }> = {};
        (allApprenants || []).forEach(a => { appMap[a.id] = a; });

        // IDs who have a reservation
        const reservedIds = new Set((reservationsPratique || []).map(r => r.apprenant_id));

        // Group reservations by date
        const byDate: Record<string, { vtc: any[]; taxi: any[] }> = {};
        (reservationsPratique || []).forEach(r => {
          if (!byDate[r.date_choisie]) byDate[r.date_choisie] = { vtc: [], taxi: [] };
          const app = appMap[r.apprenant_id];
          if (app) {
            if (r.type_formation.toLowerCase() === 'vtc') {
              byDate[r.date_choisie].vtc.push(app);
            } else {
              byDate[r.date_choisie].taxi.push(app);
            }
          }
        });

        // Compute candidates who should be on the planning but haven't reserved yet
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const currentTheorique3 = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique3 = currentTheorique3 ? datesExamenPratique[currentTheorique3.pratiqueIndex] : null;
        const parsePeriodRange3 = (period: string): { start: Date; end: Date } | null => {
          const norm = period.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const moisMap: Record<string, number> = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };
          const match2 = norm.match(/du\s+(\d+)(?:er)?\s+(\w+)\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match2) {
            const [, d1, m1, d2, m2, y] = match2;
            return { start: new Date(+y, moisMap[m1] ?? 0, +d1), end: new Date(+y, moisMap[m2] ?? 0, +d2) };
          }
          const match1 = norm.match(/du\s+(\d+)(?:er)?\s+au\s+(\d+)(?:er)?\s+(\w+)\s+(\d{4})/);
          if (match1) {
            const [, d1, d2, m, y] = match1;
            return { start: new Date(+y, moisMap[m] ?? 0, +d1), end: new Date(+y, moisMap[m] ?? 0, +d2) };
          }
          return null;
        };
        const isISODate3 = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
        const periodRange3 = parsePeriodRange3(selectedDatePratique);

        const matchPratiquePlanning = (datePratique: string | null) => {
          if (!datePratique) {
            return defaultPratique3 ? normalize(defaultPratique3) === normalize(selectedDatePratique) : false;
          }
          if (normalize(datePratique) === normalize(selectedDatePratique)) return true;
          if (isISODate3(datePratique) && periodRange3) {
            const d = new Date(datePratique);
            return d >= periodRange3.start && d <= periodRange3.end;
          }
          return false;
        };

        const paTypes = ['pa-vtc', 'pa-taxi'];
        const rpTypes = ['rp-vtc', 'rp-taxi'];
        const reussisPlanning = apprenants?.filter(a => 
          (a as any).resultat_examen === 'oui' && 
          !rpTypes.includes((a.type_apprenant || '').toLowerCase()) &&
          matchPratiquePlanning((a as any).date_examen_pratique)
        ) || [];
        const paPlanning = (allApprenants || []).filter(a => 
          paTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          matchPratiquePlanning(a.date_examen_pratique) &&
          !reussisPlanning.some(r => r.id === a.id)
        );
        const tousPlanning = [...reussisPlanning, ...paPlanning];

        const isVTCType = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return ['vtc', 'vtc-e', 'vtc-e-presentiel', 'va-e', 'pa-vtc'].includes(t);
        };
        const isTAXIType = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return ['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e', 'pa-taxi'].includes(t);
        };

        // Count unreserved candidates
        const unreservedVTCCount = tousPlanning.filter(a => isVTCType(a.type_apprenant) && !reservedIds.has(a.id)).length;
        const unreservedTAXICount = tousPlanning.filter(a => isTAXIType(a.type_apprenant) && !reservedIds.has(a.id)).length;

        // Generate weekdays Feb 16 - Mar 6
        const weekdays: Date[] = [];
        const start = new Date(2026, 1, 16);
        const end = new Date(2026, 2, 7);
        let cur = new Date(start);
        while (cur < end) {
          if (cur.getDay() !== 0 && cur.getDay() !== 6) weekdays.push(new Date(cur));
          cur.setDate(cur.getDate() + 1);
        }

        const totalVTC = tousPlanning.filter(a => isVTCType(a.type_apprenant)).length;
        const totalTAXI = tousPlanning.filter(a => isTAXIType(a.type_apprenant)).length;
        const totalReserved = (reservationsPratique || []).length;

        // Determine which days are VTC, TAXI, or exams
        // VTC: Feb 16-24 (indices 0-6), TAXI: Feb 25-27 (indices 7-9), Week 3 (Mar 2-6): exams
        const dayTypeMap: Record<string, 'vtc' | 'taxi' | 'examen'> = {};
        weekdays.forEach((d) => {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const month = d.getMonth();
          const date = d.getDate();
          if (month === 2) { // March = exams
            dayTypeMap[key] = 'examen';
          } else if (month === 1 && date >= 25) { // Feb 25+
            dayTypeMap[key] = 'taxi';
          } else {
            dayTypeMap[key] = 'vtc';
          }
        });

        // Group by week
        const weeks: Date[][] = [];
        let currentWeek: Date[] = [];
        weekdays.forEach((d, i) => {
          currentWeek.push(d);
          if (d.getDay() === 5 || i === weekdays.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
          }
        });

        return (
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Planning formation pratique — Du 16 février au 6 mars 2026
                </CardTitle>
              <p className="text-sm text-muted-foreground">
                VTC : {totalVTC} candidats • TAXI : {totalTAXI} candidats • {totalReserved} réservation(s) confirmée(s)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {weeks.map((week, wi) => (
                <div key={wi}>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Semaine {wi + 1}</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {week.map(day => {
                      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                      const dayData = byDate[key];
                      const vtcReserved = dayData?.vtc || [];
                      const taxiReserved = dayData?.taxi || [];
                      const expectedType = dayTypeMap[key];
                      const hasReservations = vtcReserved.length > 0 || taxiReserved.length > 0;

                      return (
                        <div key={key} className={`border rounded-lg p-2 min-h-[120px] ${(hasReservations || expectedType) ? 'bg-background' : 'bg-muted/30'}`}>
                          <div className="text-xs font-bold text-center mb-2 pb-1 border-b">
                            {dayNames[day.getDay()]} {day.getDate()} {monthNames[day.getMonth()]}
                          </div>
                          
                          {/* Show label for expected type */}
                          {expectedType === 'vtc' && (
                            <div className="mb-2">
                              <div className="text-[10px] font-semibold text-blue-700 mb-1">Formation pratique VTC</div>
                              {vtcReserved.length > 0 ? vtcReserved.map((a: any) => (
                                <div key={a.id} className="text-[11px] px-1 py-0.5 bg-blue-100 rounded mb-0.5 truncate font-semibold flex items-center justify-between group" title={`${a.nom} ${a.prenom}`}>
                                  <span>{a.nom} {a.prenom} ✓</span>
                                  <button onClick={() => handleCancelReservation(a.id, `${a.nom} ${a.prenom}`)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-1 shrink-0" title="Annuler">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )) : (
                                <div className="text-[10px] text-muted-foreground italic">En attente de réservations</div>
                              )}
                            </div>
                          )}
                          {expectedType === 'taxi' && (
                            <div>
                              <div className="text-[10px] font-semibold text-amber-700 mb-1">Formation pratique TAXI</div>
                              {taxiReserved.length > 0 ? taxiReserved.map((a: any) => (
                                <div key={a.id} className="text-[11px] px-1 py-0.5 bg-amber-100 rounded mb-0.5 truncate font-semibold flex items-center justify-between group" title={`${a.nom} ${a.prenom}`}>
                                  <span>{a.nom} {a.prenom} ✓</span>
                                  <button onClick={() => handleCancelReservation(a.id, `${a.nom} ${a.prenom}`)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-1 shrink-0" title="Annuler">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )) : (
                                <div className="text-[10px] text-muted-foreground italic">En attente de réservations</div>
                              )}
                            </div>
                          )}
                          {expectedType === 'examen' && (
                            <div>
                              <div className="text-[10px] font-semibold text-red-700 mb-1">📋 Examens pratiques</div>
                              <div className="text-[10px] text-muted-foreground italic">Semaine d'examens</div>
                            </div>
                          )}
                          {!expectedType && !hasReservations && (
                            <div className="text-[10px] text-muted-foreground text-center mt-4">Libre</div>
                          )}
                        </div>
                      );
                    })}
                    {Array.from({ length: 5 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="border rounded-lg p-2 min-h-[120px] bg-muted/10" />
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-emerald-50 rounded-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-800">
                    VTC : {totalVTC} candidats • TAXI : {totalTAXI} candidats • Semaine 3 : Examens
                  </p>
                  <p className="text-xs text-emerald-700">
                    {totalReserved > 0 ? `${totalReserved} réservation(s) confirmée(s)` : 'Aucune réservation confirmée — les noms apparaîtront quand les candidats choisiront leur date'}
                  </p>
                </div>
                <Badge className="bg-emerald-200 text-emerald-900 text-sm px-3 py-1">
                  {totalVTC + totalTAXI} candidat(s) à former
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Décalés à la prochaine session */}
      {(() => {
        const deplacesAff = (allApprenants || []).filter(a =>
          (deplacesSessionPratique || []).includes(a.id)
        );

        const isVTC = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return t.includes('vtc') || t === 'va' || t === 'pa-vtc';
        };
        const isTAXI = (type: string | null) => {
          if (!type) return false;
          const t = type.toLowerCase();
          return t.includes('taxi') || t.includes('ta') || t === 'pa-taxi';
        };

        const typeColor: Record<string, string> = {
          'vtc': 'bg-blue-100 text-blue-800', 'vtc-e': 'bg-blue-100 text-blue-800',
          'taxi': 'bg-amber-100 text-amber-800', 'taxi-e': 'bg-amber-100 text-amber-800',
          'ta': 'bg-orange-100 text-orange-800', 'va': 'bg-purple-100 text-purple-800',
          'pa-vtc': 'bg-sky-100 text-sky-800', 'pa-taxi': 'bg-yellow-100 text-yellow-800',
          'rp-vtc': 'bg-indigo-100 text-indigo-800', 'rp-taxi': 'bg-red-100 text-red-800',
        };

        if (!selectedExamDate) return null;

        return (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <CalendarPlus className="h-5 w-5" />
                Décalés à la prochaine session
                {deplacesAff.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-800 ml-2">{deplacesAff.length}</Badge>
                )}
              </CardTitle>
              <p className="text-xs text-orange-600 mt-1">
                Ces candidats sont automatiquement inclus dans la lettre CMA et dans les « Candidats à former » de la prochaine session.
              </p>
            </CardHeader>
            <CardContent>
              {deplacesAff.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Aucun candidat décalé pour cette session.</p>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* VTC */}
                  <div>
                    <h4 className="text-sm font-bold text-blue-700 mb-2">VTC</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deplacesAff.filter(a => isVTC(a.type_apprenant)).map((a, i) => (
                          <TableRow key={a.id} className="bg-orange-50/50">
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">
                              {a.nom} {a.prenom}
                              <Badge className="ml-2 bg-orange-100 text-orange-800 text-[10px]">📅 Décalé</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${typeColor[a.type_apprenant?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800'}`}>
                                {a.type_apprenant?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 gap-1 h-7 px-2"
                                onClick={() => handleAnnulerDeplace(a.id, `${a.nom} ${a.prenom}`)}
                              >
                                <X className="h-3 w-3" /> Annuler
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {deplacesAff.filter(a => isVTC(a.type_apprenant)).length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground italic">Aucun</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* TAXI */}
                  <div>
                    <h4 className="text-sm font-bold text-amber-700 mb-2">TAXI</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deplacesAff.filter(a => isTAXI(a.type_apprenant)).map((a, i) => (
                          <TableRow key={a.id} className="bg-orange-50/50">
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">
                              {a.nom} {a.prenom}
                              <Badge className="ml-2 bg-orange-100 text-orange-800 text-[10px]">📅 Décalé</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${typeColor[a.type_apprenant?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800'}`}>
                                {a.type_apprenant?.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 gap-1 h-7 px-2"
                                onClick={() => handleAnnulerDeplace(a.id, `${a.nom} ${a.prenom}`)}
                              >
                                <X className="h-3 w-3" /> Annuler
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {deplacesAff.filter(a => isTAXI(a.type_apprenant)).length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground italic">Aucun</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}


      {(() => {
        // All candidates who have a date_examen_pratique (registered at CMA)
        const candidatsPratique = (allApprenants || []).filter(a => a.date_examen_pratique);
        
        const getCategoriePratique = (type: string | null) => {
          if (!type) return null;
          const t = type.toLowerCase();
          if (['taxi', 'taxi-e', 'taxi-e-presentiel', 'ta', 'ta-e', 'pa-taxi', 'rp-taxi'].includes(t)) return 'TAXI';
          if (['vtc', 'vtc-e', 'vtc-e-presentiel', 'va-e', 'pa-vtc', 'rp-vtc'].includes(t)) return 'VTC';
          return null;
        };

        const taxiPratique = candidatsPratique.filter(a => getCategoriePratique(a.type_apprenant) === 'TAXI');
        const vtcPratique = candidatsPratique.filter(a => getCategoriePratique(a.type_apprenant) === 'VTC');

        const sendSatisfactionEmail = async (apprenant: any) => {
          try {
            // Fetch the satisfaction template
            const { data: tpl } = await supabase
              .from('email_templates')
              .select('subject_template, body_template')
              .eq('id', 'questionnaire-satisfaction-pratique')
              .single();
            if (!tpl || !apprenant.email) return;

            const formation = apprenant.type_apprenant || 'VTC';
            const subject = tpl.subject_template
              .replace(/\{\{formation\}\}/g, formation)
              .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
              .replace(/\{\{nom\}\}/g, apprenant.nom || '');
            const body = tpl.body_template
              .replace(/\{\{formation\}\}/g, formation)
              .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
              .replace(/\{\{nom\}\}/g, apprenant.nom || '');

            const htmlBody = body.replace(/\n/g, '<br>');
            const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
              body: {
                action: 'send',
                userEmail: 'contact@ftransport.fr',
                to: apprenant.email,
                subject,
                body: htmlBody,
              },
            });
            if (!error && data?.success) {
              await supabase.from('emails').insert({
                subject,
                body_html: htmlBody,
                body_preview: body.slice(0, 200),
                sender_email: 'contact@ftransport.fr',
                recipients: [apprenant.email],
                type: 'sent',
                is_read: true,
                sent_at: new Date().toISOString(),
                apprenant_id: apprenant.id,
              });
            }
          } catch (e) {
            console.error("Erreur envoi questionnaire satisfaction:", e);
          }
        };

        const updateResultatPratique = async (id: string, resultat: string | null) => {
          try {
            // Get current result before update to avoid re-sending
            const candidat = candidatsPratique.find(a => a.id === id);
            const previousResult = (candidat as any)?.resultat_examen_pratique;

            // Update resultat_examen_pratique in apprenants
            const { error } = await supabase
              .from('apprenants')
              .update({ resultat_examen_pratique: resultat } as any)
              .eq('id', id);
            if (error) throw error;

            // If "deplace", also mark presence_pratique = 'deplace' in session_apprenants for pratique sessions
            if (resultat === 'deplace') {
              const { data: sessionsApprenant } = await supabase
                .from('session_apprenants')
                .select('id, session_id, sessions!inner(type_session)')
                .eq('apprenant_id', id)
                .eq('sessions.type_session', 'pratique' as any);
              if (sessionsApprenant && sessionsApprenant.length > 0) {
                for (const sa of sessionsApprenant) {
                  await supabase
                    .from('session_apprenants')
                    .update({ presence_pratique: 'deplace' })
                    .eq('id', sa.id);
                }
              }
              // Also delete existing reservation so they can book a new one
              await supabase.from('reservations_pratique').delete().eq('apprenant_id', id);
              queryClient.invalidateQueries({ queryKey: ['deplaces-session-pratique'] });
              queryClient.invalidateQueries({ queryKey: ['reservations-pratique-planning'] });
              toast.success("Candidat déplacé à la prochaine session — il peut réserver un nouveau créneau");
            } else if (resultat !== 'deplace') {
              toast.success("Résultat pratique mis à jour");
            }

            // Send satisfaction questionnaire email when result changes to "oui"
            if (resultat === 'oui' && previousResult !== 'oui' && candidat) {
              sendSatisfactionEmail(candidat);
              toast.success("📋 Questionnaire de satisfaction envoyé automatiquement");
            }

            queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
          } catch (err: any) {
            toast.error(err.message || "Erreur");
          }
        };

        const renderPratiqueTable = (list: typeof candidatsPratique) => (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Nom Prénom</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead className="text-center w-44">Résultat / Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a, i) => {
                  const resultatP = (a as any).resultat_examen_pratique || '';
                  return (
                    <TableRow key={a.id} className={resultatP === 'deplace' ? 'bg-orange-50/50' : ''}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {a.nom} {a.prenom}
                          {resultatP === 'deplace' && (
                            <Badge className="ml-2 bg-orange-100 text-orange-800 text-[10px]">📅 Déplacé</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0">
                          {a.email && <div>📧 {a.email}</div>}
                          {a.telephone && <div>📞 {a.telephone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{a.date_examen_pratique ? formatDateShortFR(a.date_examen_pratique) : '-'}</TableCell>
                      <TableCell className="text-xs">{(a as any).heure_examen_pratique || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={resultatP || "non_renseigne"}
                          onValueChange={(val) => updateResultatPratique(a.id, val === "non_renseigne" ? null : val)}
                        >
                          <SelectTrigger className={`w-36 mx-auto text-xs ${
                            resultatP === 'oui' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                            resultatP === 'non' ? 'border-red-500 text-red-700 bg-red-50' :
                            resultatP === 'deplace' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non_renseigne">-</SelectItem>
                            <SelectItem value="oui">✅ Oui</SelectItem>
                            <SelectItem value="non">❌ Non</SelectItem>
                            <SelectItem value="deplace">📅 Déplacé prochaine session</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );

        const reussisPratique = candidatsPratique.filter(a => (a as any).resultat_examen_pratique === 'oui').length;
        const echouesPratique = candidatsPratique.filter(a => (a as any).resultat_examen_pratique === 'non').length;
        const deplacesPratique = candidatsPratique.filter(a => (a as any).resultat_examen_pratique === 'deplace').length;
        const enAttentePratique = candidatsPratique.filter(a => !(a as any).resultat_examen_pratique).length;

        return candidatsPratique.length > 0 ? (
          <Card className="border-l-4 border-l-rose-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-rose-600" />
                  Résultats examen pratique — Inscrits CMA
                </span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800">✅ {reussisPratique}</Badge>
                  <Badge className="bg-red-100 text-red-800">❌ {echouesPratique}</Badge>
                  {deplacesPratique > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">📅 {deplacesPratique} déplacé(s)</Badge>
                  )}
                  <Badge variant="outline">En attente : {enAttentePratique}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-amber-700">TAXI ({taxiPratique.length})</h4>
                  {taxiPratique.length > 0 ? renderPratiqueTable(taxiPratique) : (
                    <p className="text-xs text-muted-foreground">Aucun candidat TAXI inscrit</p>
                  )}
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-blue-700">VTC ({vtcPratique.length})</h4>
                  {vtcPratique.length > 0 ? renderPratiqueTable(vtcPratique) : (
                    <p className="text-xs text-muted-foreground">Aucun candidat VTC inscrit</p>
                  )}
                </div>
              </div>
              <div className="mt-4 p-3 bg-rose-50 rounded-lg flex items-center justify-between">
                <p className="text-sm font-bold text-rose-800">Total inscrits CMA : {candidatsPratique.length}</p>
                <p className="text-sm text-rose-700">
                  {reussisPratique} réussi(s) • {echouesPratique} échoué(s) • {deplacesPratique > 0 ? `${deplacesPratique} déplacé(s) • ` : ''}{enAttentePratique} en attente
                </p>
              </div>
              {deplacesPratique > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                  <CalendarPlus className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-orange-800">
                    <strong>{deplacesPratique} candidat(s) déplacé(s)</strong> sont automatiquement inclus dans la lettre CMA et la liste des candidats à former pour la prochaine session.
                  </p>
                </div>
              )}

              {/* Mails Types — Résultats pratique */}
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  📧 Mails Types — Résultats pratique
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Félicitations */}
                  {(() => {
                    const reussisEmail = candidatsPratique.filter(a => (a as any).resultat_examen_pratique === 'oui' && a.email);
                    return (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-800">Félicitations — Admis</span>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{reussisEmail.length}</Badge>
                          </div>
                          <Button size="sm" disabled={reussisEmail.length === 0 || sendingFelicitations || sentFelicitations} className={`gap-1.5 text-xs ${sentFelicitations ? 'bg-emerald-600' : ''}`}
                            onClick={() => {
                              const defaultSubject = `Félicitations - Vous êtes professionnel du transport de personnes`;
                              const defaultBody = `Bonjour,\n\nFélicitations, vous êtes maintenant professionnel du transport de personnes.\n\nNous vous remercions de votre confiance et nous vous souhaitons une belle aventure dans ce secteur d'activité.\n\nAvant de vous donner la procédure pour effectuer la demande de carte professionnelle, nous vous demanderons de bien vouloir rédiger un avis sur le centre de formation sur google et réaliser une très courte évaluation concernant la formation sur le compte CPF.\n\nVoici le lien pour mettre un avis sur google :\nhttps://www.google.fr/search?source=hp&ei=RLZFXJSwLIS5gwejzIdg&q=ftransport&btnK=Recherche+Google&oq=ftransport&gs_l=psy-ab.3.0.0i10l2j0i10i30l6j0i5i30j0i5i10i30.1107.3123..3553...0.0..0.64.535.10......0....1..gws-wiz.....0..0i131j0.rJF72XtZ4i8#btnK=Recherche%20Google&lrd=0x47f4c1cfb1d26135:0x7b288437c427e7b9,1,,,\n\nVoici la démarche pour évaluer la formation sur le CPF :\n1. Connectez-vous sur le site www.moncompteformation.gouv.fr\n2. Connectez-vous avec France connect\n3. Cliquez sur dossier\n4. Cliquez sur la formation que vous avez réalisée\n5. Cliquez sur évaluer ma formation\n\nAprès avoir effectué ces deux tâches, merci de nous contacter pour que l'on puisse vous informer de la démarche à suivre pour la demande de carte professionnelle.\n\nCordialement.\n\nFTRANSPORT\nCentre de formation\n86 Route de genas 69003 Lyon\n04.28.29.60.91\nDe 9h à 17h sur rendez-vous`;
                              setPreviewMailType('felicitations');
                              setPreviewSubject(defaultSubject);
                              setPreviewBody(defaultBody);
                              setPreviewRecipients(reussisEmail);
                              setPreviewOpen(true);
                            }}>
                            {sentFelicitations ? <CheckCircle2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {sendingFelicitations ? 'Envoi...' : sentFelicitations ? 'Envoyé ✓' : `Envoyer (${reussisEmail.length})`}
                          </Button>
                        </div>
                        <p className="text-[11px] text-emerald-700">Avis Google + évaluation CPF + carte professionnelle</p>
                      </div>
                    );
                  })()}

                  {/* Repassage pratique */}
                  {(() => {
                    const echouesEmail = candidatsPratique.filter(a => (a as any).resultat_examen_pratique === 'non' && a.email);
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-800">Repassage — Ajourné</span>
                            <Badge className="bg-red-100 text-red-800 text-[10px]">{echouesEmail.length}</Badge>
                          </div>
                          <Button size="sm" variant="destructive" disabled={echouesEmail.length === 0 || sendingRepassagePratique || sentRepassagePratique} className={`gap-1.5 text-xs ${sentRepassagePratique ? 'bg-green-600' : ''}`}
                            onClick={() => {
                              const defaultSubject = `Réinscription à l'examen pratique T3P`;
                              const defaultBody = `Bonjour {{prenom}},\n\nSuite à votre précédent examen pratique, vous devez procéder à une nouvelle inscription pour repasser l'examen pratique.\n\n📌 ÉTAPES À SUIVRE :\n\n1️⃣ Rendez-vous sur le site :\n👉 www.exament3p.fr\n\n2️⃣ Connectez-vous avec :\n• Login : votre adresse email\n• Mot de passe : cliquez sur "Mot de passe oublié" pour en créer un nouveau\n\n3️⃣ Une fois connecté(e), procédez à votre réinscription à l'examen pratique en suivant les instructions du site.\n\n⚠️ IMPORTANT — Département 69 obligatoire :\n🔴 ATTENTION : Lors de votre réinscription, vous devez IMPÉRATIVEMENT sélectionner le département 69 (Rhône), même si vous résidez dans un autre département. Si vous choisissez un autre département, nous ne pourrons pas vous former ni vous louer un véhicule pour l'examen pratique.\n\n⚠️ IMPORTANT : Une fois votre réinscription effectuée sur le site, merci de nous recontacter immédiatement afin que nous puissions finaliser votre dossier et vous accompagner pour la suite.\n\n📞 Tél : 04 28 29 60 91\n📧 Email : contact@ftransport.fr\n\nN'hésitez pas à nous contacter si vous rencontrez des difficultés lors de votre réinscription.\n\nCordialement,\nL'équipe Ftransport\n86 Route de Genas, 69003 Lyon`;
                              setPreviewMailType('repassage_pratique');
                              setPreviewSubject(defaultSubject);
                              setPreviewBody(defaultBody);
                              setPreviewRecipients(echouesEmail);
                              setPreviewOpen(true);
                            }}>
                            {sentRepassagePratique ? <CheckCircle2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {sendingRepassagePratique ? 'Envoi...' : sentRepassagePratique ? 'Envoyé ✓' : `Envoyer (${echouesEmail.length})`}
                          </Button>
                        </div>
                        <p className="text-[11px] text-red-700">Réinscription exament3p.fr + département 69 obligatoire</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Inscrits à l'examen théorique - {selectedExamDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered && filtered.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>N° Dossier CMA</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date d'examen</TableHead>
                    <TableHead className="text-center">Admissibilité (Théorie)</TableHead>
                    <TableHead className="text-center">Admission (Pratique)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((apprenant) => {
                    const tLabel = typeLabel[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-';
                    const tColor = typeColor[apprenant.type_apprenant || ''] || 'bg-gray-100 text-gray-800';
                    const resultat = (apprenant as any).resultat_examen || '';
                    const resultatPratique = (apprenant as any).resultat_examen_pratique || '';

                    return (
                      <TableRow key={apprenant.id}>
                        <TableCell className="font-medium">{apprenant.nom}</TableCell>
                        <TableCell>{apprenant.prenom}</TableCell>
                        <TableCell><Badge className={tColor}>{tLabel}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={!apprenant.numero_dossier_cma ? "border-destructive text-destructive" : ""}>
                            {apprenant.numero_dossier_cma || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className={!apprenant.telephone ? "text-destructive font-medium" : ""}>
                          {apprenant.telephone || "-"}
                        </TableCell>
                        <TableCell className={`max-w-[200px] truncate ${!apprenant.email ? "text-destructive font-medium" : ""}`}>
                          {apprenant.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary">{apprenant.date_examen_theorique}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={resultat || "non_renseigne"}
                            onValueChange={(val) =>
                              updateResultat.mutate({
                                id: apprenant.id,
                                resultat: val === "non_renseigne" ? null : val,
                              })
                            }
                          >
                            <SelectTrigger className={`w-32 mx-auto text-xs ${
                              resultat === 'oui' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                              resultat === 'non' ? 'border-red-500 text-red-700 bg-red-50' :
                              resultat === 'absent' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                              resultat === 'deplace' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non_renseigne">-</SelectItem>
                              <SelectItem value="oui">✅ Admis</SelectItem>
                              <SelectItem value="non">❌ Ajourné</SelectItem>
                              <SelectItem value="absent">🔶 Absent</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={resultatPratique || "non_renseigne"}
                            onValueChange={async (val) => {
                              const newVal = val === "non_renseigne" ? null : val;
                              try {
                                await supabase
                                  .from('apprenants')
                                  .update({ resultat_examen_pratique: newVal } as any)
                                  .eq('id', apprenant.id);
                                queryClient.invalidateQueries({ queryKey: ['apprenants-examen', selectedExamDate] });
                                toast.success("Résultat pratique mis à jour");
                              } catch (err: any) {
                                toast.error(err.message || "Erreur");
                              }
                            }}
                          >
                            <SelectTrigger className={`w-32 mx-auto text-xs ${
                              resultatPratique === 'oui' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                              resultatPratique === 'non' ? 'border-red-500 text-red-700 bg-red-50' :
                              resultatPratique === 'deplace' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non_renseigne">-</SelectItem>
                              <SelectItem value="oui">✅ Admis</SelectItem>
                              <SelectItem value="non">❌ Ajourné</SelectItem>
                              <SelectItem value="deplace">📅 Déplacé</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucun apprenant trouvé
            </div>
          )}
          {apprenants && apprenants.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total : {apprenants.length} apprenant(s) inscrit(s)
            </div>
          )}
        </CardContent>
      </Card>
      {/* Repassage examen théorique */}
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-violet-500" />
            Repassage examen théorique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & add */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un apprenant à ajouter..."
              value={repassageSearch}
              onChange={(e) => setRepassageSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {repassageSearch.length >= 2 && repassageCandidates.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
              {repassageCandidates.slice(0, 8).map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    setRepassageList(prev => [...prev, a.id]);
                    setRepassageSearch("");
                    toast.success(`${a.nom} ${a.prenom} ajouté au repassage`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-sm transition-colors"
                >
                  <span className="font-medium">{a.nom} {a.prenom}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                    </Badge>
                    <Plus className="h-4 w-4 text-violet-500" />
                  </div>
                </button>
              ))}
            </div>
            )}
          {repassageApprenants.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Aucun apprenant ajouté au repassage. Utilisez la recherche ci-dessus pour en ajouter.
            </div>
          )}
          {repassageApprenants.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {repassageApprenants.length} apprenant(s) en repassage
            </div>
          )}
        </CardContent>
      </Card>
      {/* PDF Résultats d'examen */}
      <Card className="border-l-4 border-l-sky-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-500" />
            Dossier PDF - Résultats d'examen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Uploadez le PDF des résultats d'examen, puis cliquez sur "Analyser" en choisissant le type d'épreuve (Admissibilité = théorie, Admission = pratique). Les résultats seront mappés automatiquement par Nom + Prénom.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleUploadPdf}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Upload en cours..." : "Ajouter un PDF"}
            </Button>
          </div>

          {examFiles && examFiles.length > 0 ? (
            <div className="rounded-md border divide-y">
              {examFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-sky-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          disabled={analyzing}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {analyzing ? "Analyse..." : "Analyser les résultats"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 z-[9999]" align="end" sideOffset={5} onOpenAutoFocus={(e) => e.preventDefault()}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Type d'épreuve :</p>
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleAnalyzePdf(file.name, 'admissibilite'); }}
                          >
                            📝 Admissibilité (Théorie)
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleAnalyzePdf(file.name, 'admission'); }}
                          >
                            🚗 Admission (Pratique)
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => handleDownloadFile(file.name)} title="Télécharger">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(file.name)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun PDF uploadé. Cliquez sur "Ajouter un PDF" pour commencer.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview/Edit Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {previewMailType === 'felicitations' ? '📧 Aperçu — Félicitations (Admis)' : '📧 Aperçu — Repassage pratique (Ajourné)'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span><strong>{previewRecipients.length}</strong> destinataire(s)</span>
          </div>

          <ScrollArea className="max-h-24 border rounded-md p-2 text-xs space-y-0.5">
            {previewRecipients.map(a => (
              <div key={a.id} className="flex justify-between py-0.5">
                <span className="font-medium">{a.nom} {a.prenom}</span>
                <span className="text-muted-foreground">{a.email}</span>
              </div>
            ))}
          </ScrollArea>

          <Tabs value={previewTab} onValueChange={setPreviewTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-fit">
              <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Aperçu</TabsTrigger>
              <TabsTrigger value="edit" className="gap-1.5"><Edit className="h-3.5 w-3.5" /> Modifier</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-3">
              <div className="border rounded-lg p-4 bg-white space-y-3 overflow-y-auto max-h-[45vh]">
                <div className="border-b pb-2">
                  <p className="text-xs text-muted-foreground">Objet :</p>
                  <p className="font-semibold text-sm">{previewSubject}{previewMailType === 'felicitations' ? ' - {{prenom}} {{nom}}' : ' - {{prenom}} {{nom}}'}</p>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: previewBody.replace(/\n/g, '<br>').replace(/{{prenom}}/g, '<span class="bg-blue-100 text-blue-800 px-1 rounded text-xs">{{prénom}}</span>').replace(/{{nom}}/g, '<span class="bg-blue-100 text-blue-800 px-1 rounded text-xs">{{nom}}</span>') }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                💡 Les variables <span className="bg-blue-100 text-blue-800 px-1 rounded">{'{{prénom}}'}</span> et <span className="bg-blue-100 text-blue-800 px-1 rounded">{'{{nom}}'}</span> seront remplacées automatiquement pour chaque destinataire.
              </p>
            </TabsContent>

            <TabsContent value="edit" className="flex-1 min-h-0 mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="mail-subject" className="text-sm font-medium">Objet du mail</Label>
                <Input id="mail-subject" value={previewSubject} onChange={e => setPreviewSubject(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="mail-body" className="text-sm font-medium">Corps du message</Label>
                <Textarea id="mail-body" value={previewBody} onChange={e => setPreviewBody(e.target.value)} className="min-h-[35vh] font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground">
                  💡 Utilisez {'{{prenom}}'} et {'{{nom}}'} pour personnaliser le message. Les retours à la ligne seront convertis en HTML.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              disabled={
                (previewMailType === 'felicitations' && (sendingFelicitations || sentFelicitations)) ||
                (previewMailType === 'repassage_pratique' && (sendingRepassagePratique || sentRepassagePratique))
              }
              variant={previewMailType === 'repassage_pratique' ? 'destructive' : 'default'}
              className="gap-1.5"
              onClick={async () => {
                const recipients = previewRecipients;
                if (previewMailType === 'felicitations') {
                  setSendingFelicitations(true);
                  setPreviewOpen(false);
                  let sent = 0;
                  for (const a of recipients) {
                    const subject = `${previewSubject} - ${a.prenom} ${a.nom}`;
                    const body = previewBody
                      .replace(/{{prenom}}/g, a.prenom)
                      .replace(/{{nom}}/g, a.nom)
                      .replace(/\n/g, '<br>');
                    try {
                      await supabase.functions.invoke('sync-outlook-emails', { body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id } });
                      sent++;
                    } catch (e) { console.error(e); }
                  }
                  setSendingFelicitations(false);
                  setSentFelicitations(true);
                  toast.success(`📧 ${sent}/${recipients.length} email(s) "Félicitations" envoyé(s)`);
                } else {
                  setSendingRepassagePratique(true);
                  setPreviewOpen(false);
                  let sent = 0;
                  for (const a of recipients) {
                    const subject = `${previewSubject} - ${a.prenom} ${a.nom}`;
                    const body = previewBody
                      .replace(/{{prenom}}/g, a.prenom)
                      .replace(/{{nom}}/g, a.nom)
                      .replace(/\n/g, '<br>');
                    try {
                      await supabase.functions.invoke('sync-outlook-emails', { body: { action: 'send', userEmail: 'contact@ftransport.fr', to: a.email, subject, body, apprenantId: a.id } });
                      sent++;
                    } catch (e) { console.error(e); }
                  }
                  setSendingRepassagePratique(false);
                  setSentRepassagePratique(true);
                  toast.success(`📧 ${sent}/${recipients.length} email(s) "Repassage pratique" envoyé(s)`);
                }
              }}
            >
              <Mail className="h-4 w-4" />
              Confirmer l'envoi ({previewRecipients.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
