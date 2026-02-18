import { useState, useRef } from "react";
import { FileText, Download, CheckCircle2, Mail, ClipboardList, Upload, Eye, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateAttestationInscription } from "@/lib/pdf/attestation-inscription";
import { generateAttestationFinFormation } from "@/lib/pdf/attestation-fin-formation";
import { generateAttestationFranceTravail } from "@/lib/pdf/attestation-france-travail";
import { generateBienvenueFtransport } from "@/lib/pdf/bienvenue-ftransport";
import { generateEmargementPDF } from "@/components/sessions/EmargementGenerator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface DocumentsFormationProps {
  apprenant: any;
}

type DocType = 'inscription' | 'fin-formation' | 'france-travail' | 'bienvenue' | 'emargement';

export function DocumentsFormation({ apprenant }: DocumentsFormationProps) {
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
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

  // Sessions triées par proximité de date (la plus proche en premier)
  const sortedSessions = sessionData
    ? [...sessionData].sort((a, b) => {
        const sA = a.sessions as any;
        const sB = b.sessions as any;
        if (!sA || !sB) return 0;
        const now = new Date().getTime();
        const diffA = Math.abs(new Date(sA.date_debut).getTime() - now);
        const diffB = Math.abs(new Date(sB.date_debut).getTime() - now);
        return diffA - diffB;
      })
    : [];

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
        await generateAttestationFinFormation(apprenant);
        toast.success("Attestation de fin de formation générée");
      } else if (type === 'france-travail') {
        await generateAttestationFranceTravail(apprenant);
        toast.success("Attestation France Travail générée");
      } else if (type === 'bienvenue') {
        await generateBienvenueFtransport(apprenant);
        toast.success("Document de bienvenue généré");
      } else if (type === 'emargement') {
        // Utiliser la session sélectionnée, ou toutes si '__all__'
        const sessionsToUse = selectedSession
          ? [selectedSession]
          : (sortedSessions.length > 0 ? sortedSessions : []);

        if (sessionsToUse.length > 0) {
          for (const sa of sessionsToUse) {
            const session = sa.sessions as any;
            if (!session) continue;
            const formateurs = session.session_formateurs?.map((sf: any) =>
              sf.formateurs ? `${sf.formateurs.nom} ${sf.formateurs.prenom}` : ''
            ).filter(Boolean);
            const formateursFinaux = formateurs?.length > 0 ? formateurs : ['GUENICHI Naoufal'];

            const sessionApprenants = session.session_apprenants?.map((sa: any) => sa.apprenants).filter(Boolean) || [];
            const apprenantsList = sessionApprenants.length > 0
              ? sessionApprenants
              : [{ id: 0, nom: apprenant.nom, prenom: apprenant.prenom }];

            generateEmargementPDF(
              {
                title: session.nom || session.type_session,
                formation: session.nom || 'FORMATION CONTINUE',
                dateDebut: session.date_debut,
                dateFin: session.date_fin,
                lieu: session.lieu || '86 route de genas 69003 Lyon',
                formateurs: formateursFinaux,
              },
              apprenantsList
            );
          }
        } else {
          // Pas de session : générer depuis les dates de l'apprenant
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
              formateurs: ['GUENICHI Naoufal'],
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

  // Fetch uploaded docs from storage for this learner
  const { data: uploadedDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['formation-docs-uploaded', apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents_inscription')
        .select('*')
        .eq('apprenant_id', apprenant.id)
        .in('type_document', ['emargement', 'attestation-fin-formation']);
      return data || [];
    },
  });

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
      status: apprenant.date_fin_formation ? 'disponible' : 'en_attente',
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
                            {sortedSessions.map((sa, i) => {
                              const s = sa.sessions as any;
                              if (!s) return null;
                              const label = s.nom || s.type_session || `Session ${i + 1}`;
                              const dateLabel = s.date_debut ? ` · ${s.date_debut}` : '';
                              const isFirst = i === 0;
                              return (
                                <SelectItem key={s.id} value={s.id}>
                                  {isFirst ? '⭐ ' : ''}{label}{dateLabel}
                                </SelectItem>
                              );
                            })}
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

