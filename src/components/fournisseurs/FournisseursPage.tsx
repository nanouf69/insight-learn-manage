import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Loader2, Users, FileText, Receipt, Eye, Building2, CreditCard, Mail, RefreshCw, SendHorizonal, Upload, Trash2, FolderOpen } from "lucide-react";
import { EmailDialog } from "@/components/shared/EmailDialog";
import { BulkEmailSender } from "@/components/shared/BulkEmailSender";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Fournisseur {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  siren: string | null;
  siret: string | null;
  numero_tva: string | null;
  iban: string | null;
  bic: string | null;
  banque: string | null;
  site_web: string | null;
  token: string;
  actif: boolean;
  created_at: string;
}

export function FournisseursPage() {
  const { toast } = useToast();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bulkEmailFournisseur, setBulkEmailFournisseur] = useState<Fournisseur | null>(null);
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [detailTab, setDetailTab] = useState("coordonnees");
  const [detailApprenants, setDetailApprenants] = useState<any[]>([]);
  const [detailDocuments, setDetailDocuments] = useState<any[]>([]);
  const [detailFactures, setDetailFactures] = useState<any[]>([]);
  const [detailSharedDocs, setDetailSharedDocs] = useState<any[]>([]);
  const [isUploadingSharedDoc, setIsUploadingSharedDoc] = useState(false);
  const [sharedDocTitre, setSharedDocTitre] = useState("");
  const sharedDocFileRef = useRef<HTMLInputElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Fournisseur | null>(null);
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [sendLinkTarget, setSendLinkTarget] = useState<Fournisseur | null>(null);

  // Global docs from suppliers (uploaded_by = 'fournisseur')
  const [globalPageTab, setGlobalPageTab] = useState("liste");
  const [allDocsFromFournisseurs, setAllDocsFromFournisseurs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadFournisseurs = async () => {
    const { data, error } = await supabase.from('fournisseurs').select('*').order('created_at', { ascending: false });
    if (!error && data) setFournisseurs(data as Fournisseur[]);
    setLoading(false);
  };

  const loadAllDocs = async () => {
    setLoadingDocs(true);
    const { data } = await supabase
      .from('fournisseur_shared_docs')
      .select('*, fournisseurs!inner(nom)')
      .eq('uploaded_by', 'fournisseur')
      .order('created_at', { ascending: false });
    if (data) setAllDocsFromFournisseurs(data);
    setLoadingDocs(false);
  };

  useEffect(() => { loadFournisseurs(); loadAllDocs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { error } = await supabase.from('fournisseurs').insert({ nom, email: email || null, telephone: telephone || null, adresse: adresse || null });
      if (error) throw error;
      toast({ title: "Fournisseur créé", description: `${nom} a été ajouté avec succès.` });
      setNom(""); setEmail(""); setTelephone(""); setAdresse(""); setOpen(false);
      loadFournisseurs();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/fournisseur/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !", description: "Le lien d'accès a été copié dans le presse-papier." });
  };

  const viewDetails = async (f: Fournisseur) => {
    setSelectedFournisseur(f);
    setDetailTab("coordonnees");
    const [appRes, docRes, facRes, sharedRes] = await Promise.all([
      supabase.from('fournisseur_apprenants').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
      supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
      supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
      supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
    ]);
    if (appRes.data) setDetailApprenants(appRes.data);
    if (docRes.data) setDetailDocuments(docRes.data);
    if (sharedRes.data) setDetailSharedDocs(sharedRes.data);
    if (facRes.data) setDetailFactures(facRes.data);
  };

  const toggleActif = async (f: Fournisseur) => {
    await supabase.from('fournisseurs').update({ actif: !f.actif }).eq('id', f.id);
    loadFournisseurs();
    toast({ title: f.actif ? "Fournisseur désactivé" : "Fournisseur activé" });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copié !` });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: { action: 'sync-all', userEmail: 'contact@ftransport.fr' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: `Synchronisation terminée : ${data.synced} nouveau(x) email(s) (${data.inbox} reçus, ${data.sent} envoyés)` });
      } else {
        throw new Error('Échec de la synchronisation');
      }
    } catch (err: any) {
      toast({ title: 'Erreur de synchronisation', description: err.message || 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Fournisseurs ({fournisseurs.length})</h2>
          <p className="text-sm text-muted-foreground">Gérez vos fournisseurs et leurs espaces dédiés</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled={syncing} onClick={handleSync}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synchroniser Outlook
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Nouveau fournisseur</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Nom *</Label><Input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du fournisseur" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
                <div className="space-y-2"><Label>Adresse</Label><Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse complète" /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Créer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Global page tabs (only when not in detail view) */}
      {!selectedFournisseur && (
        <Tabs value={globalPageTab} onValueChange={setGlobalPageTab}>
          <TabsList>
            <TabsTrigger value="liste" className="gap-2"><Users className="w-4 h-4" />Fournisseurs</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 relative">
              <FolderOpen className="w-4 h-4" />
              Documents reçus
              {allDocsFromFournisseurs.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {allDocsFromFournisseurs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liste">
            {/* list rendered below */}
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-3 mt-2">
              {loadingDocs ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : allDocsFromFournisseurs.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun document déposé par les fournisseurs.</CardContent></Card>
              ) : (
                allDocsFromFournisseurs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{(doc.fournisseurs as any)?.nom}</span>
                          {" · "}{doc.nom_fichier}
                          {" · "}{new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1"><Eye className="w-3 h-3" />Voir</Button>
                      </a>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                        await supabase.from('fournisseur_shared_docs').delete().eq('id', doc.id);
                        loadAllDocs();
                      }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}


      {/* Detail view or list */}
      {selectedFournisseur ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedFournisseur(null)}>← Retour</Button>
            <h3 className="text-lg font-semibold">{selectedFournisseur.nom}</h3>
            <Badge variant={selectedFournisseur.actif ? "default" : "secondary"}>{selectedFournisseur.actif ? "Actif" : "Inactif"}</Badge>
          </div>

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList>
              <TabsTrigger value="coordonnees" className="gap-2"><Building2 className="w-4 h-4" />Coordonnées</TabsTrigger>
              <TabsTrigger value="bancaire" className="gap-2"><CreditCard className="w-4 h-4" />RIB</TabsTrigger>
              <TabsTrigger value="apprenants" className="gap-2"><Users className="w-4 h-4" />Apprenants ({detailApprenants.length})</TabsTrigger>
              <TabsTrigger value="shared-docs" className="gap-2"><FileText className="w-4 h-4" />Documents partagés ({detailSharedDocs.length})</TabsTrigger>
              <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Docs apprenants ({detailDocuments.length})</TabsTrigger>
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Factures ({detailFactures.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="coordonnees">
              <Card>
                <CardHeader><CardTitle className="text-base">Informations professionnelles</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Raison sociale</p>
                    <p className="font-medium">{selectedFournisseur.nom}</p>
                  </div>
                  {selectedFournisseur.siren && (
                    <div>
                      <p className="text-muted-foreground">SIREN</p>
                      <p className="font-medium font-mono">{selectedFournisseur.siren}</p>
                    </div>
                  )}
                  {selectedFournisseur.siret && (
                    <div>
                      <p className="text-muted-foreground">SIRET</p>
                      <p className="font-medium font-mono">{selectedFournisseur.siret}</p>
                    </div>
                  )}
                  {selectedFournisseur.numero_tva && (
                    <div>
                      <p className="text-muted-foreground">N° TVA</p>
                      <p className="font-medium">{selectedFournisseur.numero_tva}</p>
                    </div>
                  )}
                  {selectedFournisseur.email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedFournisseur.email}</p>
                    </div>
                  )}
                  {selectedFournisseur.telephone && (
                    <div>
                      <p className="text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{selectedFournisseur.telephone}</p>
                    </div>
                  )}
                  {selectedFournisseur.adresse && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Adresse</p>
                      <p className="font-medium">
                        {selectedFournisseur.adresse}
                        {selectedFournisseur.code_postal ? `, ${selectedFournisseur.code_postal}` : ""}
                        {selectedFournisseur.ville ? ` ${selectedFournisseur.ville}` : ""}
                        {selectedFournisseur.pays && selectedFournisseur.pays !== 'France' ? ` — ${selectedFournisseur.pays}` : ""}
                      </p>
                    </div>
                  )}
                  {selectedFournisseur.site_web && (
                    <div>
                      <p className="text-muted-foreground">Site web</p>
                      <a href={`https://${selectedFournisseur.site_web.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                        {selectedFournisseur.site_web}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bancaire">
              <Card>
                <CardHeader><CardTitle className="text-base">Coordonnées bancaires</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {selectedFournisseur.iban ? (
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">IBAN</p>
                          <p className="font-mono font-semibold text-base mt-1">{selectedFournisseur.iban}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedFournisseur.iban!, 'IBAN')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedFournisseur.bic && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="text-muted-foreground text-xs uppercase tracking-wide">BIC / SWIFT</p>
                            <p className="font-mono font-semibold text-base mt-1">{selectedFournisseur.bic}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedFournisseur.bic!, 'BIC')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {selectedFournisseur.banque && (
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Banque</p>
                          <p className="font-medium">{selectedFournisseur.banque}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-4 text-center">Aucune coordonnée bancaire renseignée.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apprenants">
              {detailApprenants.length === 0 ? <p className="text-muted-foreground py-4">Aucun apprenant</p> : (
                <div className="grid gap-3">
                  {detailApprenants.map((a: any) => (
                    <Card key={a.id}><CardContent className="pt-4">
                      <p className="font-medium">{a.prenom} {a.nom}</p>
                      <p className="text-sm text-muted-foreground">{a.formation_choisie || "—"} • {a.email || "—"} • {a.telephone || "—"}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared-docs">
              <div className="space-y-4">
                {/* Upload côté admin */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Envoyer un document au fournisseur</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedFournisseur) return;
                      const fileInput = sharedDocFileRef.current;
                      const files = fileInput?.files;
                      if (!files || files.length === 0) {
                        toast({ title: "Erreur", description: "Veuillez sélectionner un fichier.", variant: "destructive" });
                        return;
                      }
                      setIsUploadingSharedDoc(true);
                      try {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const filePath = `${selectedFournisseur.id}/${Date.now()}_${file.name}`;
                          const { error: uploadErr } = await supabase.storage.from('fournisseur-shared-docs').upload(filePath, file);
                          if (uploadErr) throw uploadErr;
                          const { data: { publicUrl } } = supabase.storage.from('fournisseur-shared-docs').getPublicUrl(filePath);
                          const { error: insertErr } = await supabase.from('fournisseur_shared_docs').insert({
                            fournisseur_id: selectedFournisseur.id,
                            titre: sharedDocTitre || file.name,
                            nom_fichier: file.name,
                            url: publicUrl,
                            uploaded_by: 'admin',
                          });
                          if (insertErr) throw insertErr;
                        }
                        toast({ title: "Document envoyé", description: "Le document a été transmis au fournisseur." });
                        setSharedDocTitre("");
                        if (fileInput) fileInput.value = "";
                        const { data } = await supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', selectedFournisseur.id).order('created_at', { ascending: false });
                        if (data) setDetailSharedDocs(data);
                      } catch (err: any) {
                        toast({ title: "Erreur", description: err.message, variant: "destructive" });
                      } finally {
                        setIsUploadingSharedDoc(false);
                      }
                    }} className="space-y-3">
                      <div>
                        <Label>Titre du document</Label>
                        <Input placeholder="Ex: Contrat, Attestation..." value={sharedDocTitre} onChange={e => setSharedDocTitre(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>Fichier(s)</Label>
                        <input ref={sharedDocFileRef} type="file" multiple className="w-full border rounded-md px-3 py-2 text-sm mt-1" />
                      </div>
                      <Button type="submit" disabled={isUploadingSharedDoc} size="sm" className="gap-2">
                        {isUploadingSharedDoc ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Upload className="w-4 h-4" />Envoyer</>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Liste des documents */}
                {detailSharedDocs.length === 0 ? <p className="text-muted-foreground py-4">Aucun document partagé</p> : (
                  <div className="grid gap-3">
                    {detailSharedDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{doc.titre}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.uploaded_by === 'admin' ? '📤 Envoyé par admin' : '📁 Du fournisseur'} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1"><Eye className="w-3 h-3" />Voir</Button>
                          </a>
                          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={async () => {
                            await supabase.from('fournisseur_shared_docs').delete().eq('id', doc.id);
                            const { data } = await supabase.from('fournisseur_shared_docs').select('*').eq('fournisseur_id', selectedFournisseur!.id).order('created_at', { ascending: false });
                            if (data) setDetailSharedDocs(data);
                          }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              {detailDocuments.length === 0 ? <p className="text-muted-foreground py-4">Aucun document apprenant</p> : (
                <div className="grid gap-3">
                  {detailDocuments.map((d: any) => (
                    <Card key={d.id}><CardContent className="pt-4 flex justify-between items-center">
                      <div><p className="font-medium">{d.titre}</p><p className="text-sm text-muted-foreground">{d.nom_fichier}</p></div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="factures">
              {detailFactures.length === 0 ? <p className="text-muted-foreground py-4">Aucune facture</p> : (
                <div className="grid gap-3">
                  {detailFactures.map((f: any) => (
                    <Card key={f.id}><CardContent className="pt-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{f.nom_fichier}</p>
                        <p className="text-sm text-muted-foreground">→ {f.destinataire}{f.montant ? ` • ${f.montant.toLocaleString('fr-FR')} €` : ""}</p>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : globalPageTab === "liste" ? (
        /* List view */
        <div className="grid gap-4">
          {fournisseurs.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun fournisseur. Cliquez sur "Nouveau fournisseur" pour en ajouter un.</CardContent></Card>
          ) : fournisseurs.map(f => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{f.nom}</p>
                      <Badge variant={f.actif ? "default" : "secondary"}>{f.actif ? "Actif" : "Inactif"}</Badge>
                      {f.pays && f.pays !== 'France' && <Badge variant="outline">{f.pays}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{f.email || "—"} • {f.telephone || "—"}</p>
                    {f.adresse && (
                      <p className="text-xs text-muted-foreground">
                        {f.adresse}{f.code_postal ? `, ${f.code_postal}` : ""}{f.ville ? ` ${f.ville}` : ""}
                      </p>
                    )}
                    {f.iban && (
                      <p className="text-xs font-mono text-muted-foreground">IBAN : {f.iban}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(f.token)} className="gap-1"><Copy className="w-3.5 h-3.5" />Copier le lien</Button>
                    <Button variant="outline" size="sm" onClick={() => viewDetails(f)} className="gap-1"><Eye className="w-3.5 h-3.5" />Voir</Button>
                    {f.email && (
                      <Button variant="default" size="sm" onClick={() => { setSendLinkTarget(f); setSendLinkOpen(true); }} className="gap-1">
                        <SendHorizonal className="w-3.5 h-3.5" />Envoyer le lien
                      </Button>
                    )}
                    {f.email && (
                      <Button variant="outline" size="sm" onClick={() => { setEmailTarget(f); setEmailDialogOpen(true); }} className="gap-1">
                        <Mail className="w-3.5 h-3.5" />Email
                      </Button>
                    )}
                    <Button variant={f.actif ? "destructive" : "default"} size="sm" onClick={() => toggleActif(f)}>
                      {f.actif ? "Désactiver" : "Activer"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Dialog email fournisseur */}
      {emailTarget?.email && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => { setEmailDialogOpen(open); if (!open) setEmailTarget(null); }}
          contactName={emailTarget.nom}
          contactEmail={emailTarget.email}
          queryKey="fournisseur-emails"
        />
      )}

      {/* Envoi du lien d'accès au portail */}
      {sendLinkTarget?.email && (
        <BulkEmailSender
          open={sendLinkOpen}
          onOpenChange={(open) => { setSendLinkOpen(open); if (!open) setSendLinkTarget(null); }}
          title={`Envoyer le lien — ${sendLinkTarget.nom}`}
          description="Envoyez à ce prestataire son lien d'accès personnel à la plateforme."
          subject="🔗 Votre accès à la plateforme FTRANSPORT"
          recipients={[{ id: sendLinkTarget.id, name: sendLinkTarget.nom, email: sendLinkTarget.email! }]}
          getHtmlBody={(recipient) => {
            const portalUrl = `https://insight-learn-manage.lovable.app/fournisseur/${sendLinkTarget.token}`;
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
              Voici votre <strong>lien d'accès personnel</strong> à la plateforme FTRANSPORT. Cet espace vous permet de consulter votre planning, déposer vos factures et suivre vos échanges avec notre équipe.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;background:#eff6ff;border-radius:10px;border-left:4px solid #2563eb;">
                  <p style="margin:0;font-size:14px;color:#1e40af;font-weight:700;">🔗 Votre espace personnel</p>
                  <p style="margin:10px 0 0;font-size:13px;color:#334155;line-height:1.7;">
                    Ce lien est unique et sécurisé. Conservez-le précieusement — il vous donne accès à votre portail dédié.
                  </p>
                  <p style="margin:16px 0 0;text-align:center;">
                    <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;">
                      Accéder à mon espace →
                    </a>
                  </p>
                  <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;text-align:center;word-break:break-all;">${portalUrl}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#64748b;">
              Pour toute question, n'hésitez pas à nous contacter par retour d'email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;">FTRANSPORT</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Centre de formation VTC & TAXI</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">86 Route de Genas, 69003 Lyon</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:12px;color:#64748b;">📞 04.28.29.60.91</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">📧 contact@ftransport.fr</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">🕐 Lun–Ven, 9h–18h</p>
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
      )}

      {/* Notification individuelle fournisseur (ex: Prima Nettoyage) */}
      {bulkEmailFournisseur?.email && (
        <BulkEmailSender
          open={!!bulkEmailFournisseur}
          onOpenChange={(open) => { if (!open) setBulkEmailFournisseur(null); }}
          title={`Notification — ${bulkEmailFournisseur.nom}`}
          description="Informez ce prestataire qu'il doit désormais déposer ses factures sur la plateforme."
          subject="🧾 Dépôt de vos factures — Plateforme FTRANSPORT"
          recipients={[{ id: bulkEmailFournisseur.id, name: bulkEmailFournisseur.nom, email: bulkEmailFournisseur.email! }]}
          getHtmlBody={(recipient) => {
            const portalUrl = `https://insight-learn-manage.lovable.app/fournisseur/${bulkEmailFournisseur.token}`;
            return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2563eb 100%);padding:36px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;">FTRANSPORT</p>
            <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;letter-spacing:1px;">CENTRE DE FORMATION VTC & TAXI</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:15px;color:#64748b;">Bonjour <strong style="color:#1e293b;">${recipient.name}</strong>,</p>
            <p style="margin:16px 0;font-size:15px;color:#334155;line-height:1.7;">
              À partir de maintenant, nous vous demandons de bien vouloir <strong>déposer vos factures directement sur notre plateforme dédiée</strong>.
            </p>
            <!-- CTA Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;background:#eff6ff;border-radius:10px;border-left:4px solid #2563eb;">
                  <p style="margin:0;font-size:14px;color:#1e40af;font-weight:700;">🧾 Comment déposer votre facture ?</p>
                  <p style="margin:10px 0 0;font-size:13px;color:#334155;line-height:1.7;">
                    1. Accédez à votre espace personnel via le lien ci-dessous<br>
                    2. Cliquez sur l'onglet <strong>"Factures"</strong><br>
                    3. Uploadez votre facture au format PDF
                  </p>
                  <p style="margin:16px 0 0;text-align:center;">
                    <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">
                      Accéder à mon espace →
                    </a>
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 8px;font-size:14px;color:#64748b;line-height:1.6;">
              Ce lien est personnel et sécurisé. Il vous permettra de soumettre vos factures et de suivre vos échanges avec notre équipe.
            </p>
            <p style="margin:0;font-size:14px;color:#64748b;">
              Pour toute question, n'hésitez pas à nous contacter par retour d'email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;">FTRANSPORT</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Centre de formation VTC & TAXI</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">86 Route de Genas, 69003 Lyon</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:12px;color:#64748b;">📞 04.28.29.60.91</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">📧 contact@ftransport.fr</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#64748b;">🕐 Lun–Ven, 9h–18h</p>
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
      )}
    </div>
  );
}
