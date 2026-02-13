import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CheckCircle2, XCircle, UserX, Search, RotateCcw, Plus, X, Upload, FileText, Trash2, Download, Users, Mail } from "lucide-react";
import { toast } from "sonner";

export function ExamenReussitePage() {
  const [search, setSearch] = useState("");
  const [repassageSearch, setRepassageSearch] = useState("");
  const [repassageList, setRepassageList] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: apprenants, isLoading } = useQuery({
    queryKey: ['apprenants-examen-janvier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .or('date_examen_theorique.ilike.%janvier%,date_examen_theorique.ilike.%Janvier%')
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
        queryClient.invalidateQueries({ queryKey: ['apprenants-examen-janvier'] });
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
      queryClient.invalidateQueries({ queryKey: ['apprenants-examen-janvier'] });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Examen et Réussite</h1>
          <p className="text-sm text-muted-foreground">Suivi des examens théoriques</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
        // Candidats réussis de l'examen théorique de janvier
        const reussisTheorique = apprenants?.filter(a => (a as any).resultat_examen === 'oui') || [];
        // PA et RP qui ont réussi (pas forcément dans la query janvier)
        const paRpTypes = ['pa-vtc', 'pa-taxi', 'rp-vtc', 'rp-taxi'];
        const reussisPA_RP = (allApprenants || []).filter(a => 
          paRpTypes.includes((a.type_apprenant || '').toLowerCase()) && 
          a.resultat_examen === 'oui' &&
          !reussisTheorique.some(r => r.id === a.id)
        );
        const reussisLettre = [...reussisTheorique, ...reussisPA_RP];
        
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

        const handlePrintLettre = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;

          const taxiRows = taxiReussis.map(a => `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${a.nom} ${a.prenom}</td></tr>`).join('');
          const vtcRows = vtcReussis.map(a => `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${a.nom} ${a.prenom}</td></tr>`).join('');

          // Pad shorter column
          const padTaxi = taxiReussis.length < maxRows ? Array(maxRows - taxiReussis.length).fill('<tr><td style="padding:4px 8px;border:1px solid #ccc;">&nbsp;</td></tr>').join('') : '';
          const padVtc = vtcReussis.length < maxRows ? Array(maxRows - vtcReussis.length).fill('<tr><td style="padding:4px 8px;border:1px solid #ccc;">&nbsp;</td></tr>').join('') : '';

          printWindow.document.write(`
            <html>
            <head><title>Lettre CMA - Résultats examen</title></head>
            <body style="font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6;">
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

              <p><strong>Objet :</strong> Liste des candidats ayant reussi l'examen du 27 janvier 2026</p>
              <p><strong>Dates de passage :</strong> du 23 fevrier au 6 mars 2026</p>

              <p>Madame,</p>
              <p>Veuillez trouver ci-dessous la liste des candidats de notre centre de formation ayant reussi l'examen theorique du 27 janvier 2026 :</p>

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

              <p>Je reste a votre disposition pour toute information complementaire.</p>
              <p style="margin-top:30px;">Cordialement,<br/><br/><strong>FTRANSPORT</strong></p>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        };

        return (
          <Card className="border-l-4 border-l-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-teal-600" />
                  Lettre CMA — Candidats reçus
                </span>
                <Button onClick={handlePrintLettre} disabled={reussisLettre.length === 0} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Générer la lettre ({reussisLettre.length})
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Lettre type pour la CMA (audrey.crevier@cma-auvergnerhonealpes.fr) avec la liste des candidats ayant réussi l'examen du 27 janvier, répartis en TAXI et VTC. Dates de passage : du 23 février au 6 mars 2026.
              </p>
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

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Inscrits à l'examen théorique - Janvier 2026
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
