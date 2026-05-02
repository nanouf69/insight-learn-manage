import { useState, useRef } from "react";
import { FileText, Download, CheckCircle2, Mail, ClipboardList, Upload, Eye, CalendarDays, BarChart3, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateAttestationInscription } from "@/lib/pdf/attestation-inscription";
import { generateAttestationFinFormation } from "@/lib/pdf/attestation-fin-formation";
import { generateAttestationFranceTravail } from "@/lib/pdf/attestation-france-travail";
import { generateBienvenueFtransport } from "@/lib/pdf/bienvenue-ftransport";
import { generateEmargementPDF } from "@/components/sessions/EmargementGenerator";
import { generateEmargementIndividuelPDF } from "@/components/sessions/EmargementIndividuelGenerator";
import { buildSessionAgendaDays } from "@/lib/buildSessionAgendaDays";
import { generateFicheProgressionGuenichi } from "@/lib/pdf/fiche-progression";
import { generateAttestationFCVTC } from "@/lib/pdf/attestation-fc-vtc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface DocumentsFormationProps {
  apprenant: any;
}

type DocType = 'inscription' | 'fin-formation' | 'france-travail' | 'bienvenue' | 'emargement' | 'progression' | 'attestation-fc';

export function DocumentsFormation({ apprenant }: DocumentsFormationProps) {
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('__all__');
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Récupérer les sessions de l'apprenant pour l'émargement
  const { data: sessionData } = useQuery({
    queryKey: ['apprenant-sessions', apprenant.id],
    queryFn: async () => {
      const { data: sessionApprenants } = await supabase
        .from('session_apprenants')
        .select(`
          session_id,
          sessions (
            id, nom, date_debut, date_fin, lieu, type_session,
            session_formateurs (
              formateurs ( nom, prenom )
            ),
            session_apprenants (
              apprenants ( id, nom, prenom )
            )
          )
        `)
        .eq('apprenant_id', apprenant.id);
      return sessionApprenants;
    },
  });

  // Sessions : à venir triées du plus proche au plus loin, puis passées du plus récent au plus ancien
  const now = new Date();
  const upcomingSessions = (sessionData || [])
    .filter(sa => {
      const s = sa.sessions as any;
      return s && new Date(s.date_fin) >= now;
    })
    .sort((a, b) => {
      const sA = a.sessions as any;
      const sB = b.sessions as any;
      return new Date(sA.date_debut).getTime() - new Date(sB.date_debut).getTime();
    });

  const pastSessions = (sessionData || [])
    .filter(sa => {
      const s = sa.sessions as any;
      return s && new Date(s.date_fin) < now;
    })
    .sort((a, b) => {
      const sA = a.sessions as any;
      const sB = b.sessions as any;
      return new Date(sB.date_fin).getTime() - new Date(sA.date_fin).getTime();
    });

  const sortedSessions = [...upcomingSessions, ...pastSessions];

  // Session sélectionnée (ou toutes si '__all__')
  const selectedSession = selectedSessionId === '__all__'
    ? null
    : sortedSessions.find(s => (s.sessions as any)?.id === selectedSessionId);

  const handleGenerateAttestation = async (type: DocType) => {
    setGeneratingDoc(type);
    try {
      if (type === 'inscription') {
        await generateAttestationInscription(apprenant);
        toast.success("Attestation d'inscription générée");
      } else if (type === 'fin-formation') {
        // Récupérer les sessions de l'apprenant
        const { data: saRows } = await supabase
          .from('session_apprenants')
          .select('session_id, sessions(id, type_session, heure_debut, heure_fin, date_debut, date_fin)')
          .eq('apprenant_id', apprenant.id);
        const sessions = (saRows || []).map((r: any) => r.sessions).filter(Boolean);

        // Récupérer les connexions e-learning
        const { data: connexions } = await supabase
          .from('apprenant_connexions')
          .select('started_at, ended_at, last_seen_at')
          .eq('apprenant_id', apprenant.id)
          .not('ended_at', 'is', null);

        await generateAttestationFinFormation(apprenant, sessions, connexions || []);
        toast.success("Attestation de fin de formation générée");
      } else if (type === 'france-travail') {
        await generateAttestationFranceTravail(apprenant);
        toast.success("Attestation France Travail générée");
      } else if (type === 'attestation-fc') {
        const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
        const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
        const dateFin = apprenant.date_fin_formation || apprenant.date_debut_formation || new Date().toISOString().split('T')[0];
        await generateAttestationFCVTC({
          nom: apprenant.nom,
          prenom: apprenant.prenom,
          dateFin,
          dateDebut: apprenant.date_debut_formation,
          adresse: apprenant.adresse,
          codePostal: apprenant.code_postal,
          ville: apprenant.ville,
          telephone: apprenant.telephone,
          email: apprenant.email,
          dateNaissance: apprenant.date_naissance,
          formation,
        });
        toast.success(`Attestation Formation Continue ${formation} générée`);
      } else if (type === 'progression') {
        generateFicheProgressionGuenichi();
        toast.success("Fiche de progression generee");
      } else if (type === 'bienvenue') {
        await generateBienvenueFtransport(apprenant);
        toast.success("Document de bienvenue généré");
      } else if (type === 'emargement') {
        // Utiliser la session sélectionnée, ou toutes si '__all__'
        const sessionsToUse = selectedSession
          ? [selectedSession]
          : (sortedSessions.length > 0 ? sortedSessions : []);

        if (sessionsToUse.length > 0) {
          let generated = 0;
          for (const sa of sessionsToUse) {
            const session = sa.sessions as any;
            if (!session) continue;

            const formateurs = session.session_formateurs?.map((sf: any) =>
              sf.formateurs ? `${sf.formateurs.nom} ${sf.formateurs.prenom}` : ''
            ).filter(Boolean);
            const formateursFinaux = formateurs?.length > 0 ? formateurs : ['Naoufal GUENICHI'];

            // Construire la liste des jours d'émargement à partir de l'agenda réel
            // (détection auto journée/soir + horaires réels)
            const agendaDays = await buildSessionAgendaDays({
              dateDebut: session.date_debut,
              dateFin: session.date_fin,
              title: session.nom,
              type_session: session.type_session,
              typeApprenant: apprenant.type_apprenant,
            });

            if (agendaDays.length === 0) continue;

            // Libellé formation cohérent avec le type d'apprenant
            const t = (apprenant.type_apprenant || '').toLowerCase();
            const isTaxi = t.includes('taxi');
            const isVTC = !isTaxi && (t.includes('vtc') || t === 'va' || t === 'va-e');
            const formationLabel = session.nom
              || (isTaxi ? 'Formation TAXI' : isVTC ? 'Formation VTC' : 'Formation');

            generateEmargementIndividuelPDF(
              {
                formation: formationLabel,
                dateDebut: session.date_debut,
                dateFin: session.date_fin,
                lieu: session.lieu || '86 route de genas 69003 Lyon',
                formateurs: formateursFinaux,
              },
              {
                nom: apprenant.nom,
                prenom: apprenant.prenom,
                type_apprenant: apprenant.type_apprenant || '',
                telephone: apprenant.telephone || '',
              },
              agendaDays,
            );
            generated++;
            // Petit délai entre téléchargements pour éviter blocage navigateur
            if (sessionsToUse.length > 1) await new Promise(r => setTimeout(r, 400));
          }
          if (generated === 0) {
            toast.error("Aucun jour d'émargement trouvé pour cette/ces session(s).");
            return;
          }
        } else {
          // Pas de session : générer depuis les dates de l'apprenant (fallback FC)
          const dateDebut = apprenant.date_debut_formation || new Date().toISOString().split('T')[0];
          const dateFin = apprenant.date_fin_formation || dateDebut;
          const formation = apprenant.type_apprenant
            ? apprenant.type_apprenant.toUpperCase().includes('TAXI') ? 'FORMATION CONTINUE TAXI' : 'FORMATION CONTINUE VTC'
            : 'FORMATION CONTINUE';

          generateEmargementPDF(
            {
              title: formation,
              formation,
              dateDebut,
              dateFin,
              lieu: '86 route de genas 69003 Lyon',
              formateurs: ['Naoufal GUENICHI'],
            },
            [{ id: 0, nom: apprenant.nom, prenom: apprenant.prenom }]
          );
        }
        toast.success("Feuille d'émargement générée");
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleSendAttestationFCByEmail = async () => {
    if (!apprenant.email) {
      toast.error("Cet apprenant n'a pas d'adresse email");
      return;
    }
    setSendingEmail('attestation-fc');
    try {
      const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
      const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
      const dateFin = apprenant.date_fin_formation || apprenant.date_debut_formation || new Date().toISOString().split('T')[0];

      const result = await generateAttestationFCVTC({
        nom: apprenant.nom,
        prenom: apprenant.prenom,
        dateFin,
        dateDebut: apprenant.date_debut_formation,
        adresse: apprenant.adresse,
        codePostal: apprenant.code_postal,
        ville: apprenant.ville,
        telephone: apprenant.telephone,
        email: apprenant.email,
        dateNaissance: apprenant.date_naissance,
        formation,
      }, { returnBlob: true });

      if (!result?.blob) throw new Error("Impossible de générer le PDF");

      const arrayBuffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);

      const subject = `Votre attestation de formation continue ${formation}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">FTRANSPORT</h1>
            <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC & TAXI</p>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p>Bonjour ${apprenant.prenom} ${apprenant.nom},</p>
            <p>Veuillez trouver ci-joint votre <strong>attestation de formation continue ${formation}</strong> (valable 5 ans).</p>
            <p>Conservez précieusement ce document, il pourra vous être demandé lors d'un contrôle.</p>
            <p>Cordialement,<br/>L'équipe FTRANSPORT</p>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280;">
            <p><strong>FTRANSPORT</strong> – 86 Route de Genas, 69003 Lyon</p>
            <p>📞 04 28 29 60 91 | 📧 contact@ftransport.fr</p>
          </div>
        </div>
      `;

      const { error } = await supabase.functions.invoke('send-document-email', {
        body: {
          apprenantId: apprenant.id,
          recipientEmail: apprenant.email,
          recipientName: `${apprenant.prenom} ${apprenant.nom}`,
          subject,
          htmlBody,
          attachmentName: result.fileName,
          attachmentBase64: base64,
          attachmentContentType: 'application/pdf',
        },
      });
      if (error) throw error;
      toast.success(`Attestation envoyée par email à ${apprenant.email}`);
    } catch (error: any) {
      console.error('Erreur envoi email:', error);
      toast.error(`Erreur lors de l'envoi : ${error?.message || 'inconnue'}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const { data: uploadedDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['formation-docs-uploaded', apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents_inscription')
        .select('*')
        .eq('apprenant_id', apprenant.id)
        .in('type_document', ['emargement', 'attestation-fin-formation', 'facture-fc'])
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const facturesArchivees = (uploadedDocs || []).filter((d: any) => d.type_document === 'facture-fc');

  const handleUploadFile = async (docId: string, file: File) => {
    setUploadingDoc(docId);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${apprenant.id}/${docId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents-inscription')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents-inscription')
        .getPublicUrl(filePath);

      const titlesMap: Record<string, string> = {
        'emargement': "Feuille d'émargement",
        'attestation-fin-formation': "Attestation de fin de formation",
      };

      await supabase.from('documents_inscription').insert({
        apprenant_id: apprenant.id,
        titre: titlesMap[docId] || docId,
        nom_fichier: file.name,
        type_document: docId,
        url: publicUrl,
        statut: 'valide',
      });

      toast.success("Document uploadé avec succès");
      refetchDocs();
      queryClient.invalidateQueries({ queryKey: ['formation-docs-uploaded', apprenant.id] });
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error("Erreur lors de l'upload du document");
    } finally {
      setUploadingDoc(null);
    }
  };

  const getUploadedDoc = (docId: string) =>
    uploadedDocs?.find(d => d.type_document === docId);

  const documents = [
    {
      id: 'bienvenue',
      title: "Document de Bienvenue",
      description: "Guide d'inscription avec le lien vers les étapes à suivre",
      status: 'disponible',
      type: 'bienvenue' as const,
      icon: Mail,
    },
    {
      id: 'inscription',
      title: "Attestation d'inscription",
      description: "Confirme l'inscription de l'apprenant à la formation",
      status: 'disponible',
      type: 'inscription' as const,
      icon: FileText,
    },
    {
      id: 'fin-formation',
      title: "Attestation de fin de formation",
      description: "Délivrée à la fin du parcours de formation",
      status: (apprenant.date_fin_formation || apprenant.date_examen_pratique) ? 'disponible' : 'en_attente',
      type: 'fin-formation' as const,
      icon: FileText,
    },
    {
      id: 'emargement',
      title: "Feuille d'émargement",
      description: "Feuille de présence de la session de formation",
      status: 'disponible',
      type: 'emargement' as const,
      icon: ClipboardList,
    },
    {
      id: 'france-travail',
      title: "Attestation France Travail",
      description: "Formulaire à retourner à France Travail (auto-rempli sauf type de rémunération)",
      status: apprenant.mode_financement === 'france-travail' ? 'disponible' : 'non_applicable',
      type: 'france-travail' as const,
      icon: FileText,
    },
    {
      id: 'progression',
      title: "Fiche de progression e-learning",
      description: "Suivi detaille module par module avec quiz, dates, durees et scores",
      status: 'disponible',
      type: 'progression' as const,
      icon: BarChart3,
    },
    {
      id: 'attestation-fc',
      title: (() => {
        const t = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
        const f = t.includes('TAXI') ? 'TAXI' : 'VTC';
        return `Attestation Formation Continue ${f}`;
      })(),
      description: "Attestation officielle de formation continue obligatoire (valable 5 ans)",
      status: 'disponible',
      type: 'attestation-fc' as const,
      icon: FileText,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents de Formation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => {
            const canUpload = doc.id === 'emargement' || doc.id === 'attestation-fin-formation' || doc.id === 'fin-formation';
            const uploadedDoc = canUpload ? getUploadedDoc(doc.id === 'fin-formation' ? 'attestation-fin-formation' : doc.id) : null;
            const uploadKey = doc.id === 'fin-formation' ? 'attestation-fin-formation' : doc.id;

            return (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <doc.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{doc.title}</h4>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                    {/* Sélecteur de session pour l'émargement */}
                    {doc.id === 'emargement' && sortedSessions.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                          <SelectTrigger className="h-7 text-xs w-56">
                            <SelectValue placeholder="Choisir une session" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Toutes les sessions</SelectItem>
                            {upcomingSessions.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-xs text-primary">📅 À venir</SelectLabel>
                                {upcomingSessions.map((sa, i) => {
                                  const s = sa.sessions as any;
                                  if (!s) return null;
                                  const label = s.nom || s.type_session || `Session ${i + 1}`;
                                  const dateLabel = s.date_debut ? ` · ${s.date_debut}` : '';
                                  return (
                                    <SelectItem key={s.id} value={s.id}>
                                      {i === 0 ? '⭐ ' : ''}{label}{dateLabel}
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            )}
                            {upcomingSessions.length > 0 && pastSessions.length > 0 && (
                              <SelectSeparator />
                            )}
                            {pastSessions.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-xs text-muted-foreground">🕐 Passées</SelectLabel>
                                {pastSessions.map((sa, i) => {
                                  const s = sa.sessions as any;
                                  if (!s) return null;
                                  const label = s.nom || s.type_session || `Session ${i + 1}`;
                                  const dateLabel = s.date_debut ? ` · ${s.date_debut}` : '';
                                  return (
                                    <SelectItem key={s.id} value={s.id} className="text-muted-foreground">
                                      {label}{dateLabel}
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {uploadedDoc && (
                      <p className="text-xs text-primary mt-0.5">✓ Fichier importé : {uploadedDoc.nom_fichier}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'disponible' && (
                    <>
                      <Badge variant="outline" className="text-primary border-primary">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Disponible
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleGenerateAttestation(doc.type)}
                        disabled={generatingDoc === doc.type}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {generatingDoc === doc.type ? 'Génération...' : 'Générer'}
                      </Button>
                      {doc.id === 'attestation-fc' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSendAttestationFCByEmail}
                          disabled={sendingEmail === 'attestation-fc' || !apprenant.email}
                          title={!apprenant.email ? "Aucune adresse email" : `Envoyer à ${apprenant.email}`}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendingEmail === 'attestation-fc' ? 'Envoi...' : 'Envoyer par email'}
                        </Button>
                      )}
                    </>
                  )}
                  {doc.status === 'en_attente' && (
                    <Badge variant="secondary">En attente</Badge>
                  )}
                  {doc.status === 'non_applicable' && (
                    <Badge variant="outline" className="text-muted-foreground">Non applicable</Badge>
                  )}

                  {/* Bouton upload pour les docs qu'on peut importer depuis l'ordinateur */}
                  {canUpload && (
                    <>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[uploadKey] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile(uploadKey, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRefs.current[uploadKey]?.click()}
                        disabled={uploadingDoc === uploadKey}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingDoc === uploadKey ? 'Import...' : 'Importer'}
                      </Button>
                      {uploadedDoc && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a href={uploadedDoc.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

