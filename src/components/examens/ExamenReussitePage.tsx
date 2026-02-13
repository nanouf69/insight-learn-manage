import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CheckCircle2, XCircle, UserX, Search, RotateCcw, Plus, X, Upload, FileText, Trash2, Download, Users, Mail, GraduationCap, Calendar } from "lucide-react";
import { toast } from "sonner";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Mapping: each theoretical exam date → the next practical exam date (always after)
  const datesExamenTheorique = [
    { date: "27 janvier 2026", lieu: "Villeurbanne", pratiqueIndex: 0 },
    { date: "31 mars 2026", lieu: "Clermont-Ferrand", pratiqueIndex: 1 },
    { date: "26 mai 2026", lieu: "Villeurbanne", pratiqueIndex: 2 },
    { date: "21 juillet 2026", lieu: "Villeurbanne", pratiqueIndex: 3 },
    { date: "29 septembre 2026", lieu: "Villeurbanne", pratiqueIndex: 4 },
    { date: "17 novembre 2026", lieu: "Villeurbanne", pratiqueIndex: 5 },
  ];

  const datesExamenPratique = [
    "Du 23 fevrier au 6 mars 2026",
    "Du 4 au 13 mai 2026",
    "Du 29 juin au 7 juillet 2026",
    "Du 1er au 11 septembre 2026",
    "Du 2 au 13 novembre 2026",
    "Du 16 au 23 decembre 2026",
    "Debut janvier 2027",
  ];

  const handleExamDateChange = (date: string) => {
    setSelectedExamDate(date);
    const match = datesExamenTheorique.find(e => e.date === date);
    if (match !== undefined) {
      setSelectedDatePratique(datesExamenPratique[match.pratiqueIndex]);
    }
  };

  const { data: apprenants, isLoading } = useQuery({
    queryKey: ['apprenants-examen', selectedExamDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .ilike('date_examen_theorique', `%${selectedExamDate}%`)
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
        .select('id, nom, prenom, type_apprenant, telephone, email, date_examen_theorique, date_examen_pratique, resultat_examen')
        .order('nom', { ascending: true });
      if (error) throw error;
      return data;
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

  const handleAnalyzePdf = async (fileName: string) => {
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
        body: JSON.stringify({ fileName }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        toast.error("Erreur : " + (result.error || "Échec de l'analyse"));
      } else {
        const oui = result.details?.filter((d: any) => d.resultat === 'oui').length || 0;
        const non = result.details?.filter((d: any) => d.resultat === 'non').length || 0;
        const absent = result.details?.filter((d: any) => d.resultat === 'absent').length || 0;
        toast.success(`Résultats mis à jour ! ✅ ${oui} admis, ❌ ${non} non admis, 🔶 ${absent} absents`);
        queryClient.invalidateQueries({ queryKey: ['apprenants-examen', selectedExamDate] });
      }
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateResultat = useMutation({
    mutationFn: async ({ id, resultat }: { id: string; resultat: string | null }) => {
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
  });

  const filtered = apprenants?.filter(a =>
    `${a.nom} ${a.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  const reussis = apprenants?.filter(a => (a as any).resultat_examen === 'oui') || [];
  const nonReussis = apprenants?.filter(a => (a as any).resultat_examen === 'non') || [];
  const absents = apprenants?.filter(a => (a as any).resultat_examen === 'absent' || !a.numero_dossier_cma) || [];

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

      {/* Lettre CMA - Réussite examen */}
      {(() => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        // Find the default practical date for the current theoretical exam
        const currentTheorique = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique = currentTheorique ? datesExamenPratique[currentTheorique.pratiqueIndex] : null;
        
        const matchPratique = (datePratique: string | null) => {
          // If no practical date set, match if selected practical date is the default for this theoretical exam
          if (!datePratique) {
            return defaultPratique ? normalize(defaultPratique) === normalize(selectedDatePratique) : false;
          }
          return normalize(datePratique) === normalize(selectedDatePratique);
        };

        // Candidats réussis de l'examen théorique dont la date pratique correspond
        const reussisTheorique = apprenants?.filter(a => 
          (a as any).resultat_examen === 'oui' && matchPratique((a as any).date_examen_pratique)
        ) || [];
        // PA et RP : inclus si leur date pratique correspond
        const paRpTypes = ['pa-vtc', 'pa-taxi', 'rp-vtc', 'rp-taxi'];
        const paRpApprenants = (allApprenants || []).filter(a => 
          paRpTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          matchPratique(a.date_examen_pratique) &&
          !reussisTheorique.some(r => r.id === a.id)
        );
        const reussisLettre = [...reussisTheorique, ...paRpApprenants];


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
            ? new Date(dateDebutPratique).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
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
              ? ` - Début souhaité : ${new Date(dateDebutPratique).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : '';
            const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
              body: {
                action: 'send',
                userEmail: 'contact@ftransport.fr',
                to: 'audrey.crevier@cma-auvergnerhonealpes.fr',
                subject: `Liste candidats reçus - Examen du ${selectedExamDate}${dateDebutText}`,
                body: htmlBody,
              },
            });
            if (error) throw error;
            if (data?.success) {
              toast.success('Email envoyé à la CMA avec succès !');
            } else {
              throw new Error('Échec de l\'envoi');
            }
          } catch (err) {
            console.error('Erreur envoi CMA:', err);
            toast.error('Erreur lors de l\'envoi de l\'email à la CMA');
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
                  <Button onClick={handlePrintLettre} disabled={reussisLettre.length === 0} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Imprimer ({reussisLettre.length})
                  </Button>
                  <Button 
                    onClick={handleSendCMAEmail} 
                    disabled={reussisLettre.length === 0 || sendingCMAEmail} 
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingCMAEmail ? 'Envoi...' : `Envoyer par email (${reussisLettre.length})`}
                  </Button>
                </div>
              </CardTitle>
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
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const currentTheorique2 = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique2 = currentTheorique2 ? datesExamenPratique[currentTheorique2.pratiqueIndex] : null;
        const matchPratiqueFormation = (datePratique: string | null) => {
          if (!datePratique) {
            return defaultPratique2 ? normalize(defaultPratique2) === normalize(selectedDatePratique) : false;
          }
          return normalize(datePratique) === normalize(selectedDatePratique);
        };

        // Tous les candidats à former : réussis + PA (pas les RP), filtrés par date pratique
        const paTypes = ['pa-vtc', 'pa-taxi'];
        const rpTypes = ['rp-vtc', 'rp-taxi'];
        const reussisFormation = apprenants?.filter(a => 
          (a as any).resultat_examen === 'oui' && 
          !rpTypes.includes((a.type_apprenant || '').toLowerCase()) &&
          matchPratiqueFormation((a as any).date_examen_pratique)
        ) || [];
        const paFormation = (allApprenants || []).filter(a => 
          paTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          matchPratiqueFormation(a.date_examen_pratique) &&
          !reussisFormation.some(r => r.id === a.id)
        );
        const tousAFormer = [...reussisFormation, ...paFormation];

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
                Récapitulatif — Formation pratique à planifier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* VTC */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-700">VTC (Présentiel, E-learning, VA, PA VTC)</h4>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vtcList.map((a, i) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium">{a.nom} {a.prenom}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-1">
                    <p className="text-sm font-bold text-blue-800">Total VTC à former : {vtcList.length}</p>
                    <p className="text-sm text-blue-700">4 candidats/jour → <strong>{joursVTC} jour(s)</strong> de formation nécessaires</p>
                  </div>
                </div>

                {/* TAXI */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-amber-700">TAXI (Présentiel, E-learning, TA, PA TAXI)</h4>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Nom Prénom</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taxiList.map((a, i) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium">{a.nom} {a.prenom}</TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                {typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
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

      {/* Planning formation pratique */}
      {(() => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const currentTheorique3 = datesExamenTheorique.find(e => e.date === selectedExamDate);
        const defaultPratique3 = currentTheorique3 ? datesExamenPratique[currentTheorique3.pratiqueIndex] : null;
        const matchPratiquePlanning = (datePratique: string | null) => {
          if (!datePratique) {
            return defaultPratique3 ? normalize(defaultPratique3) === normalize(selectedDatePratique) : false;
          }
          return normalize(datePratique) === normalize(selectedDatePratique);
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

        const vtcPlanning = tousPlanning.filter(a => isVTCType(a.type_apprenant));
        const taxiPlanning = tousPlanning.filter(a => isTAXIType(a.type_apprenant));

        // Generate weekdays starting from Monday Feb 16, 2026, excluding weekends, before March 2
        const getWeekdays = () => {
          const days: Date[] = [];
          const start = new Date(2026, 1, 16); // Feb 16, 2026 (Monday)
          const end = new Date(2026, 2, 7); // March 7, 2026 (exclusive) — period goes to March 6
          let current = new Date(start);
          while (current < end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) {
              days.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
          }
          return days;
        };

        const weekdays = getWeekdays();
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

        // Assign VTC first: 4 per day, then TAXI on separate days: 3 per day
        const joursVTCNeeded = Math.ceil(vtcPlanning.length / 4);
        const joursTAXINeeded = Math.ceil(taxiPlanning.length / 4);
        
        const vtcByDay: Record<string, typeof vtcPlanning> = {};
        vtcPlanning.forEach((a, i) => {
          const dayIndex = Math.floor(i / 4);
          if (dayIndex < weekdays.length) {
            const key = weekdays[dayIndex].toISOString().slice(0, 10);
            if (!vtcByDay[key]) vtcByDay[key] = [];
            vtcByDay[key].push(a);
          }
        });

        // TAXI starts after all VTC days
        const taxiByDay: Record<string, typeof taxiPlanning> = {};
        taxiPlanning.forEach((a, i) => {
          const dayIndex = joursVTCNeeded + Math.floor(i / 4);
          if (dayIndex < weekdays.length) {
            const key = weekdays[dayIndex].toISOString().slice(0, 10);
            if (!taxiByDay[key]) taxiByDay[key] = [];
            taxiByDay[key].push(a);
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
                VTC : 4 candidats/jour • TAXI : 4 candidats/jour • Pas de week-end • Deadline : avant le 6 mars
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {weeks.map((week, wi) => (
                <div key={wi}>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Semaine {wi + 1}</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {week.map(day => {
                      const key = day.toISOString().slice(0, 10);
                      const vtcDay = vtcByDay[key] || [];
                      const taxiDay = taxiByDay[key] || [];
                      const hasContent = vtcDay.length > 0 || taxiDay.length > 0;

                      return (
                        <div key={key} className={`border rounded-lg p-2 min-h-[120px] ${hasContent ? 'bg-background' : 'bg-muted/30'}`}>
                          <div className="text-xs font-bold text-center mb-2 pb-1 border-b">
                            {dayNames[day.getDay()]} {day.getDate()} {monthNames[day.getMonth()]}
                          </div>
                          {vtcDay.length > 0 && (
                            <div className="mb-2">
                              <div className="text-[10px] font-semibold text-blue-700 mb-1">VTC ({vtcDay.length})</div>
                              {vtcDay.map(a => (
                                <div key={a.id} className="text-[11px] px-1 py-0.5 bg-blue-50 rounded mb-0.5 truncate" title={`${a.nom} ${a.prenom}`}>
                                  {a.nom} {a.prenom}
                                </div>
                              ))}
                            </div>
                          )}
                          {taxiDay.length > 0 && (
                            <div>
                              <div className="text-[10px] font-semibold text-amber-700 mb-1">TAXI ({taxiDay.length})</div>
                              {taxiDay.map(a => (
                                <div key={a.id} className="text-[11px] px-1 py-0.5 bg-amber-50 rounded mb-0.5 truncate" title={`${a.nom} ${a.prenom}`}>
                                  {a.nom} {a.prenom}
                                </div>
                              ))}
                            </div>
                          )}
                          {!hasContent && (
                            <div className="text-[10px] text-muted-foreground text-center mt-4">Libre</div>
                          )}
                        </div>
                      );
                    })}
                    {/* Pad empty cells if week has fewer than 5 days */}
                    {Array.from({ length: 5 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="border rounded-lg p-2 min-h-[120px] bg-muted/10" />
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-emerald-50 rounded-lg flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-800">
                    VTC : {vtcPlanning.length} candidats → {Math.ceil(vtcPlanning.length / 4)} jours (du {weekdays[0] ? `${weekdays[0].getDate()} ${monthNames[weekdays[0].getMonth()]}` : ''} au {weekdays[Math.ceil(vtcPlanning.length / 4) - 1] ? `${weekdays[Math.ceil(vtcPlanning.length / 4) - 1].getDate()} ${monthNames[weekdays[Math.ceil(vtcPlanning.length / 4) - 1].getMonth()]}` : ''})
                  </p>
                  <p className="text-sm font-bold text-emerald-800">
                    TAXI : {taxiPlanning.length} candidats → {Math.ceil(taxiPlanning.length / 3)} jours (du {weekdays[0] ? `${weekdays[0].getDate()} ${monthNames[weekdays[0].getMonth()]}` : ''} au {weekdays[Math.ceil(taxiPlanning.length / 3) - 1] ? `${weekdays[Math.ceil(taxiPlanning.length / 3) - 1].getDate()} ${monthNames[weekdays[Math.ceil(taxiPlanning.length / 3) - 1].getMonth()]}` : ''})
                  </p>
                </div>
                <Badge className="bg-emerald-200 text-emerald-900 text-sm px-3 py-1">
                  ✅ Tous formés avant le 2 mars
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
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
                    <TableHead className="text-center">Examen réussi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((apprenant) => {
                    const tLabel = typeLabel[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-';
                    const tColor = typeColor[apprenant.type_apprenant || ''] || 'bg-gray-100 text-gray-800';
                    const resultat = (apprenant as any).resultat_examen || '';

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
                            <SelectTrigger className={`w-28 mx-auto ${
                              resultat === 'oui' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                              resultat === 'non' ? 'border-red-500 text-red-700 bg-red-50' :
                              resultat === 'absent' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non_renseigne">-</SelectItem>
                              <SelectItem value="oui">✅ Oui</SelectItem>
                              <SelectItem value="non">❌ Non</SelectItem>
                              <SelectItem value="absent">🔶 Absent</SelectItem>
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

          {/* List */}
          {repassageApprenants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ancien examen</TableHead>
                    <TableHead className="text-center">Retirer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repassageApprenants.map(a => {
                    const tLabel = typeLabel[a.type_apprenant || ''] || a.type_apprenant || '-';
                    const tColor = typeColor[a.type_apprenant || ''] || 'bg-gray-100 text-gray-800';
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nom}</TableCell>
                        <TableCell>{a.prenom}</TableCell>
                        <TableCell><Badge className={tColor}>{tLabel}</Badge></TableCell>
                        <TableCell>{a.telephone || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{a.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{a.date_examen_theorique || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRepassageList(prev => prev.filter(id => id !== a.id))}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
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
            Uploadez ici le PDF contenant les numéros de dossier avec les résultats d'examen.
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
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      disabled={analyzing}
                      onClick={() => handleAnalyzePdf(file.name)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {analyzing ? "Analyse..." : "Analyser les résultats"}
                    </Button>
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
    </div>
  );
}
