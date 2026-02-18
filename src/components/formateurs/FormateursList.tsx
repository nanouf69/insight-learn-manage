import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Phone, Search, GraduationCap, Trash2, Loader2, Pencil, RefreshCw, SendHorizonal } from "lucide-react";
import { EmailDialog } from "@/components/shared/EmailDialog";
import { BulkEmailSender } from "@/components/shared/BulkEmailSender";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormateurForm } from "./FormateurForm";
import { FormateurEditForm } from "./FormateurEditForm";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string | null;
  tarif_horaire: number | null;
  type: string | null;
  civilite: string | null;
  societe_nom: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  siren: string | null;
  numero_tva: string | null;
}

export function FormateursList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });
  const [editFormateur, setEditFormateur] = useState<Formateur | null>(null);
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; formateur: Formateur | null }>({ open: false, formateur: null });
  const queryClient = useQueryClient();

  // Fetch formateurs from database
  const { data: formateurs = [], isLoading } = useQuery({
    queryKey: ['formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateurs')
        .select('*')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data as Formateur[];
    }
  });

  // Fetch fournisseur tokens linked to formateurs
  const { data: fournisseurTokens = [] } = useQuery({
    queryKey: ['fournisseur-tokens-formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('formateur_id, token')
        .not('formateur_id', 'is', null);
      if (error) throw error;
      return data as { formateur_id: string; token: string }[];
    }
  });

  const getFormateurPortalUrl = (formateurId: string) => {
    const found = fournisseurTokens.find(f => f.formateur_id === formateurId);
    if (!found) return null;
    return `${window.location.origin}/fournisseur/${found.token}`;
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formateurs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formateurs'] });
      toast.success(`${deleteDialog.name} a été supprimé`);
      setDeleteDialog({ open: false, id: null, name: "" });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  });

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.id) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  const filteredFormateurs = formateurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.specialites && f.specialites.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const parseSpecialites = (specialites: string | null): string[] => {
    if (!specialites) return [];
    return specialites.split(',').map(s => s.trim()).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formateurs</h1>
          <p className="text-muted-foreground">Gérez votre équipe de formateurs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setBulkEmailOpen(true)}
          >
            <SendHorizonal className="w-4 h-4" />
            Envoyer aux formateurs
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
                  body: { action: 'sync-all', userEmail: 'contact@ftransport.fr' },
                });
                if (error) throw error;
                if (data?.success) {
                  toast.success(`Synchronisation terminée : ${data.synced} nouveau(x) email(s)`);
                  queryClient.invalidateQueries({ queryKey: ['formateur-emails'] });
                } else {
                  throw new Error('Échec');
                }
              } catch (err: any) {
                toast.error('Erreur : ' + (err.message || 'Erreur inconnue'));
              } finally {
                setSyncing(false);
              }
            }}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synchroniser Outlook
          </Button>
          <FormateurForm />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{formateurs.length}</p>
            <p className="text-sm text-muted-foreground">Formateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary/80">
              {formateurs.filter(f => f.type === 'interne').length}
            </p>
            <p className="text-sm text-muted-foreground">Internes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {formateurs.filter(f => f.type === 'externe').length}
            </p>
            <p className="text-sm text-muted-foreground">Externes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un formateur ou une spécialité..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formateurs List */}
      {filteredFormateurs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun formateur trouvé</p>
          <p className="text-sm">Ajoutez votre premier formateur pour commencer</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFormateurs.map((formateur) => (
            <Card key={formateur.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Avatar & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {formateur.prenom[0]}{formateur.nom[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground">
                            {formateur.prenom} {formateur.nom}
                          </h3>
                          <Badge className={formateur.type === 'interne' 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          }>
                            {formateur.type === 'interne' ? 'Interne' : 'Externe'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {formateur.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => setEmailDialog({ open: true, formateur })}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setEditFormateur(formateur)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(formateur.id, `${formateur.prenom} ${formateur.nom}`)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Coordonnées */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {formateur.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            <span>{formateur.email}</span>
                          </div>
                        )}
                        {formateur.telephone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            <span>{formateur.telephone}</span>
                          </div>
                        )}
                        {formateur.tarif_horaire && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{formateur.tarif_horaire}€/h</span>
                          </div>
                        )}
                      </div>

                      {/* Spécialités */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {parseSpecialites(formateur.specialites).map((spec, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce formateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'édition */}
      {editFormateur && (
        <FormateurEditForm
          formateur={editFormateur}
          open={!!editFormateur}
          onOpenChange={(open) => !open && setEditFormateur(null)}
        />
      )}

      {/* Dialog email formateur */}
      {emailDialog.formateur?.email && (
        <EmailDialog
          open={emailDialog.open}
          onOpenChange={(open) => setEmailDialog({ open, formateur: open ? emailDialog.formateur : null })}
          contactName={`${emailDialog.formateur.prenom} ${emailDialog.formateur.nom}`}
          contactEmail={emailDialog.formateur.email}
          queryKey="formateur-emails"
        />
      )}

      {/* Envoi en masse aux formateurs */}
      <BulkEmailSender
        open={bulkEmailOpen}
        onOpenChange={setBulkEmailOpen}
        title="Notification aux formateurs"
        description="Informez tous vos formateurs qu'ils peuvent désormais consulter leur agenda et déposer leurs factures sur la plateforme."
        subject="📅 Accès à votre agenda & dépôt de vos factures — FTRANSPORT"
        recipients={formateurs
          .filter(f => f.email)
          .map(f => ({ id: f.id, name: `${f.prenom} ${f.nom}`, email: f.email! }))}
        getHtmlBody={(recipient) => {
          const portalUrl = getFormateurPortalUrl(recipient.id);
          const agendaSection = portalUrl
            ? `<p style="margin:10px 0 0;text-align:center;">
                <a href="${portalUrl}?tab=planning" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;">
                  Voir mon agenda →
                </a>
              </p>`
            : `<p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">Retrouvez toutes vos sessions planifiées depuis votre portail.</p>`;
          const factureSection = portalUrl
            ? `<p style="margin:10px 0 0;text-align:center;">
                <a href="${portalUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;">
                  Déposer ma facture →
                </a>
              </p>`
            : `<p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Votre lien d'accès vous sera communiqué séparément.</p>`;
          return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2563eb 100%);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;">FTRANSPORT</p>
            <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;letter-spacing:1px;">CENTRE DE FORMATION VTC & TAXI</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:15px;color:#64748b;">Bonjour <strong style="color:#1e293b;">${recipient.name}</strong>,</p>
            <p style="margin:16px 0;font-size:15px;color:#334155;line-height:1.7;">
              Nous avons le plaisir de vous informer que votre <strong>espace formateur</strong> est désormais accessible sur notre plateforme. Vous pouvez dès maintenant :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="padding:18px;background:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">
                  <p style="margin:0;font-size:14px;color:#1e40af;"><strong>📅 Consulter votre agenda</strong></p>
                  <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;">Retrouvez toutes vos sessions planifiées, horaires et formations assignées en temps réel.</p>
                  ${agendaSection}
                </td>
              </tr>
              <tr><td style="padding:8px 0;"></td></tr>
              <tr>
                <td style="padding:18px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;">
                  <p style="margin:0;font-size:14px;color:#15803d;"><strong>🧾 Déposer vos factures</strong></p>
                  <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Uploadez directement vos factures PDF depuis votre portail personnel sécurisé.</p>
                  ${factureSection}
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Pour toute question, répondez directement à cet email ou appelez-nous.</p>
            <p style="margin:8px 0 0;font-size:14px;color:#64748b;">Bonne journée !</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;">FTRANSPORT</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">86 Route de Genas, 69003 Lyon</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:12px;color:#64748b;">📞 04.28.29.60.91</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">📧 contact@ftransport.fr</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
        }}
      />
    </div>
  );
}