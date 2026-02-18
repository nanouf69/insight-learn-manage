import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Loader2, Users, FileText, Receipt, Eye, Building2, CreditCard, Mail, RefreshCw } from "lucide-react";
import { EmailDialog } from "@/components/shared/EmailDialog";
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Fournisseur | null>(null);

  const loadFournisseurs = async () => {
    const { data, error } = await supabase.from('fournisseurs').select('*').order('created_at', { ascending: false });
    if (!error && data) setFournisseurs(data as Fournisseur[]);
    setLoading(false);
  };

  useEffect(() => { loadFournisseurs(); }, []);

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
    const [appRes, docRes, facRes] = await Promise.all([
      supabase.from('fournisseur_apprenants').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
      supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
      supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', f.id).order('created_at', { ascending: false }),
    ]);
    if (appRes.data) setDetailApprenants(appRes.data);
    if (docRes.data) setDetailDocuments(docRes.data);
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

      {/* Detail view */}
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
              <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Documents ({detailDocuments.length})</TabsTrigger>
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
            <TabsContent value="documents">
              {detailDocuments.length === 0 ? <p className="text-muted-foreground py-4">Aucun document</p> : (
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
      ) : (
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
      )}

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
    </div>
  );
}
