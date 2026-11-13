import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, Plus, Loader2, Trash2, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { CATEGORIES_PRESENCE, HEURES_VALIDEES_EVENT, libelleHeureValidee, normaliserHeuresValidees, lirePresencesAdministratives } from "@/lib/heuresValideesAdmin";
import { PresenceDecisionDialog, type PresenceDecisionCible } from './PresenceDecisionDialog';
import { PRESENCE_REVOCATIONS_ACTIVE } from '@/lib/presenceRevocations';
import { envoyerDecisionPresence } from '@/lib/presenceDecisionTransport';
import { motifPresenceSchema } from '@/lib/motifPresence';

interface Props {
  apprenantId: string;
}

interface HeureValideeRow {
  id: string;
  heures: number;
  motif: string | null;
  created_at: string;
  date_presence: string | null;
  categorie: string | null;
  annulee: boolean;
  versionDecision: number;
}

/**
 * Saisie manuelle d'heures de présence validées par un administrateur.
 * Append-only : chaque validation est une nouvelle ligne conservée en base,
 * jamais modifiée ni supprimée. Le total s'ajoute aux heures signées.
 */
export function HeuresPresentielValidees({ apprenantId }: Props) {
  const queryClient = useQueryClient();
  const [heures, setHeures] = useState("");
  const [motif, setMotif] = useState("");
  const [datePresence, setDatePresence] = useState("");
  const [categorie, setCategorie] = useState("");
  const [saving, setSaving] = useState(false);
  const addLock = useRef(false);
  const [cible, setCible] = useState<PresenceDecisionCible | null>(null);

  const { data: rows, isError, refetch } = useQuery<HeureValideeRow[]>({
    queryKey: ["presentiel-heures-validees", apprenantId],
    enabled: !!apprenantId,
    queryFn: () => lirePresencesAdministratives(apprenantId, true),
  });

  const projection = rows || [];
  const total = projection.filter(r=>!r.annulee).reduce((sum, r) => sum + Math.round(Number(r.heures)*60), 0)/60;

  const ouvrirDecision = async (id: string) => {
    try {
      const {data:userData,error:authError}=await supabase.auth.getUser();
      const uid=userData?.user?.id;
      if(authError||!uid)throw new Error('Session expirée');
      const {data:role,error}=await supabase.from('user_roles').select('role').eq('user_id',uid).eq('role','admin').maybeSingle();
      if(error||!role)throw new Error('Administrateur requis');
      const p=projection.find(x=>x.id===id);
      if(!p)return;
      setCible({id:p.id,heures:Number(p.heures),date:p.date_presence,categorie:p.categorie,annulee:p.annulee,version:p.versionDecision});
    }catch{toast.error('Accès administrateur vérifié requis : aucune heure modifiée');}
  };

  const handleAdd = async () => {
    const value = Number(String(heures).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 500) {
      toast.error("Indiquez un nombre d'heures valide (ex : 6 ou 3.5)");
      return;
    }
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePresence) || datePresence > today) {
      toast.error("Indiquez la date réelle de présence (pas dans le futur)");
      return;
    }
    if (!CATEGORIES_PRESENCE[categorie]) {
      toast.error("Choisissez la catégorie de présence");
      return;
    }
    const motifValide = motifPresenceSchema.safeParse(motif);
    if (!motifValide.success) {
      toast.error("Le motif ne doit pas dépasser 200 caractères");
      return;
    }
    if (addLock.current) return;
    addLock.current = true;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { toast.error("Session expirée : reconnectez-vous"); return; }
      // Insertion unique, confirmée par la relecture serveur de la ligne créée.
      const { data: inserted, error } = await supabase.from("presentiel_heures_validees" as any).insert({
        apprenant_id: apprenantId,
        heures: value,
        motif: motifValide.data,
        date_presence: datePresence,
        categorie,
        created_by: uid,
      } as any).select("id").single();
      if (error || !(inserted as any)?.id) {
        toast.error("Enregistrement non confirmé par le serveur : rien n'a été compté");
        return;
      }
      toast.success(`${value}h de présence enregistrées et confirmées`);
      setHeures(""); setMotif(""); setDatePresence(""); setCategorie("");
      // Rafraîchit tous les écrans de cet élève (et seulement lui) + jalons.
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(apprenantId) || String(q.queryKey[0] ?? "").startsWith("jalons") });
      window.dispatchEvent(new CustomEvent(HEURES_VALIDEES_EVENT, { detail: { apprenantId } }));
    } finally {
      addLock.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="w-full py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Heures de présence validées manuellement</span>
        <span className="text-xs text-muted-foreground">
          {isError ? 'Lecture impossible : total non confirmé' : total > 0 ? `Total validé : ${total}h` : "Aucune heure validée manuellement"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Heures (ex : 6)"
          value={heures}
          onChange={(e) => setHeures(e.target.value)}
          className="w-full"
        />
        <Input
          type="text"
          placeholder="Motif (facultatif)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          className="w-full"
          maxLength={200}
        />
        <Input type="date" aria-label="Date de présence" value={datePresence} onChange={(e) => setDatePresence(e.target.value)} className="w-full" />
        <select aria-label="Catégorie de présence" value={categorie} onChange={(e) => setCategorie(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Catégorie…</option>
          {Object.entries(CATEGORIES_PRESENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Valider les heures
        </Button>
      </div>
      {(rows || []).length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {normaliserHeuresValidees(projection).slice().reverse().map((r) => (
            <li key={r.id} className="flex flex-col gap-2 border-t py-3">
              <span className="break-words">{r.heures}h — {libelleHeureValidee(r)} ({format(new Date(r.createdAt), "HH:mm")})
              {r.motif ? ` — ${r.motif}` : " — motif non renseigné"}</span>
              {projection.find(x=>x.id===r.id)?.annulee && <span>Validation annulée — original conservé, heures non comptées</span>}
              <Button variant="outline" size="sm" className="self-start" onClick={()=>void ouvrirDecision(r.id)}>
                {projection.find(x=>x.id===r.id)?.annulee?<Undo2 className="mr-2 h-4 w-4"/>:<Trash2 className="mr-2 h-4 w-4"/>}{projection.find(x=>x.id===r.id)?.annulee?'Restaurer':'Supprimer'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PresenceDecisionDialog cible={cible} apprenantId={apprenantId} transport={PRESENCE_REVOCATIONS_ACTIVE ? envoyerDecisionPresence : undefined} onClose={()=>setCible(null)} onConfirmed={async()=>{await refetch();await queryClient.invalidateQueries({predicate:q=>q.queryKey.includes(apprenantId)});window.dispatchEvent(new CustomEvent(HEURES_VALIDEES_EVENT,{detail:{apprenantId}}));}}/>
    </section>
  );
}
