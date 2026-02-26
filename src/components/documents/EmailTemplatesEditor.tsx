import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Save, X, Mail, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmailTemplate {
  id: string;
  label: string;
  icon: string;
  subject_template: string;
  body_template: string;
  updated_at: string;
}

export function EmailTemplatesEditor() {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("label");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label, subject_template, body_template }: { id: string; label: string; subject_template: string; body_template: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ label, subject_template, body_template })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      setEditingTemplate(null);
      toast({ title: "Modèle mis à jour", description: "Le mail type a été enregistré avec succès." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setEditLabel(t.label);
    setEditSubject(t.subject_template);
    setEditBody(t.body_template);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    updateMutation.mutate({
      id: editingTemplate.id,
      label: editLabel,
      subject_template: editSubject,
      body_template: editBody,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des mails types...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          Variables disponibles : <code className="text-xs bg-muted px-1 rounded">{"{{prenom}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{nom}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{formation}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{date_debut}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{civilite}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{adresse}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{code_postal}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{ville}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{onboarding_url}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{booking_url}}"}</code> <code className="text-xs bg-muted px-1 rounded">{"{{date_jour}}"}</code>
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Mail type</TableHead>
              <TableHead className="font-semibold">Objet</TableHead>
              <TableHead className="font-semibold w-24 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="font-medium text-sm">{t.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {t.subject_template}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Modifier le mail type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nom du modèle</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div>
              <Label>Objet de l'email</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div>
              <Label>Corps de l'email (HTML autorisé)</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[300px] font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
