import { useEffect, useState } from "react";
import { GraduationCap, UserPlus, FileCheck, CreditCard, CheckCircle, AlertTriangle, CalendarCheck, Receipt, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Activity {
  id: string;
  apprenantId: string;
  type: string;
  message: string;
  target: string;
  time: string;
  icon: typeof UserPlus;
  iconBg: string;
  iconColor: string;
}

interface RecentActivityProps {
  onNavigateToApprenant?: (apprenantId: string) => void;
}

const getFormationLabel = (code: string): string => {
  const labels: Record<string, string> = {
    'formation-continue-vtc': 'Formation Continue VTC — 200€',
    'formation-continue-taxi': 'Formation Continue TAXI — 299€',
    'vtc': 'Formation VTC',
    'taxi': 'Formation TAXI',
    'vtc-exam': 'Formation VTC avec examen',
    'taxi-exam': 'Formation TAXI avec examen',
    'passage-pratique': 'Passage examen pratique',
    'repassage-pratique': 'Repassage examen pratique',
  };
  return labels[code] || code;
};

export function RecentActivity({ onNavigateToApprenant }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch system alerts (email failures, etc.)
        const { data: alertes } = await supabase
          .from('alertes_systeme')
          .select('*')
          .eq('lu', false)
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch apprenants who recently completed onboarding
        const { data: completedApprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, updated_at, formation_choisie')
          .eq('documents_complets', true)
          .order('updated_at', { ascending: false })
          .limit(5);

        // Fetch recent practical training reservations
        const { data: reservations } = await supabase
          .from('reservations_pratique')
          .select('id, apprenant_id, date_choisie, type_formation, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch apprenant names for reservations
        const resApprenantIds = [...new Set(reservations?.map(r => r.apprenant_id) || [])];
        let resApprenantMap: Record<string, { nom: string; prenom: string }> = {};
        if (resApprenantIds.length > 0) {
          const { data: resApprenants } = await supabase
            .from('apprenants')
            .select('id, nom, prenom')
            .in('id', resApprenantIds);
          resApprenants?.forEach(a => { resApprenantMap[a.id] = a; });
        }

        // Fetch recently created apprenants
        const { data: newApprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, created_at, formation_choisie')
          .order('created_at', { ascending: false })
          .limit(5);

        const activityList: Activity[] = [];

        // Add system alerts first (priority)
        alertes?.forEach((a) => {
          activityList.push({
            apprenantId: '',
            id: `alert-${a.id}`,
            type: "alert",
            message: a.titre,
            target: a.message,
            time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr }),
            icon: AlertTriangle,
            iconBg: "bg-destructive/10",
            iconColor: "text-destructive",
          });
        });

        // Add completed onboarding activities
        completedApprenants?.forEach((a) => {
          activityList.push({
            apprenantId: a.id,
            id: `completed-${a.id}`,
            type: "onboarding_complete",
            message: `${a.prenom} ${a.nom} a terminé son dossier Bienvenue`,
            target: a.formation_choisie || "",
            time: formatDistanceToNow(new Date(a.updated_at), { addSuffix: true, locale: fr }),
            icon: CheckCircle,
            iconBg: "bg-success/10",
            iconColor: "text-success",
          });
        });

        // Add new inscription activities (exclude those already in completed)
        const completedIds = new Set(completedApprenants?.map(a => a.id) || []);
        newApprenants?.filter(a => !completedIds.has(a.id)).forEach((a) => {
          const isFormationContinue = a.formation_choisie?.startsWith('formation-continue');
          const formationLabel = getFormationLabel(a.formation_choisie || "");
          activityList.push({
            apprenantId: a.id,
            id: `new-${a.id}`,
            type: isFormationContinue ? "formation_continue" : "inscription",
            message: isFormationContinue 
              ? `📋 ${a.prenom} ${a.nom} — nouvelle inscription Formation Continue`
              : `${a.prenom} ${a.nom} a été inscrit`,
            target: formationLabel,
            time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr }),
            icon: isFormationContinue ? GraduationCap : UserPlus,
            iconBg: isFormationContinue ? "bg-blue-500/10" : "bg-primary/10",
            iconColor: isFormationContinue ? "text-blue-600" : "text-primary",
          });
        });

        // Add practical training reservation activities
        reservations?.forEach((r) => {
          const app = resApprenantMap[r.apprenant_id];
          if (app) {
            activityList.push({
              apprenantId: r.apprenant_id,
              id: `resa-${r.id}`,
              type: "reservation",
              message: `${app.prenom} ${app.nom} a choisi sa date pratique`,
              target: `${r.type_formation.toUpperCase()} — ${new Date(r.date_choisie).toLocaleDateString('fr-FR')}`,
              time: formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr }),
              icon: CalendarCheck,
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-600",
            });
          }
        });

        // Fetch recent supplier invoices
        const { data: fournisseurFactures } = await supabase
          .from('fournisseur_factures')
          .select('*, fournisseurs!inner(nom)')
          .order('created_at', { ascending: false })
          .limit(5);

        fournisseurFactures?.forEach((f: any) => {
          activityList.push({
            apprenantId: '',
            id: `facture-fournisseur-${f.id}`,
            type: "facture_fournisseur",
            message: `📄 Facture déposée par ${f.fournisseurs?.nom || 'Fournisseur'}`,
            target: `→ ${f.destinataire}${f.montant ? ` — ${Number(f.montant).toLocaleString('fr-FR')}€` : ''}`,
            time: formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: fr }),
            icon: Receipt,
            iconBg: "bg-orange-500/10",
            iconColor: "text-orange-600",
          });
        });

        // Fetch recent received emails
        const { data: recentEmails } = await supabase
          .from('emails')
          .select('id, subject, sender_name, sender_email, received_at, created_at, type, apprenant_id')
          .eq('type', 'received')
          .order('received_at', { ascending: false })
          .limit(5);

        recentEmails?.forEach((e) => {
          const sender = e.sender_name || e.sender_email || 'Inconnu';
          activityList.push({
            apprenantId: e.apprenant_id || '',
            id: `email-${e.id}`,
            type: "email_received",
            message: `✉️ Email reçu de ${sender}`,
            target: e.subject,
            time: formatDistanceToNow(new Date(e.received_at || e.created_at), { addSuffix: true, locale: fr }),
            icon: Mail,
            iconBg: "bg-indigo-500/10",
            iconColor: "text-indigo-600",
          });
        });

        // Fetch recent sent emails to apprenants
        const { data: sentEmails } = await supabase
          .from('emails')
          .select('id, subject, sent_at, created_at, type, apprenant_id')
          .eq('type', 'sent')
          .not('apprenant_id', 'is', null)
          .order('sent_at', { ascending: false })
          .limit(10);

        // Fetch apprenant names for sent emails
        const sentApprenantIds = [...new Set(sentEmails?.map(e => e.apprenant_id).filter(Boolean) || [])];
        let sentApprenantMap: Record<string, { nom: string; prenom: string }> = {};
        if (sentApprenantIds.length > 0) {
          const { data: sentApprenants } = await supabase
            .from('apprenants')
            .select('id, nom, prenom')
            .in('id', sentApprenantIds);
          sentApprenants?.forEach(a => { sentApprenantMap[a.id] = a; });
        }

        sentEmails?.forEach((e) => {
          const app = e.apprenant_id ? sentApprenantMap[e.apprenant_id] : null;
          const recipientName = app ? `${app.prenom} ${app.nom}` : 'apprenant';
          activityList.push({
            apprenantId: e.apprenant_id || '',
            id: `email-sent-${e.id}`,
            type: "email_sent",
            message: `📤 Email envoyé à ${recipientName}`,
            target: e.subject,
            time: formatDistanceToNow(new Date(e.sent_at || e.created_at), { addSuffix: true, locale: fr }),
            icon: Send,
            iconBg: "bg-green-500/10",
            iconColor: "text-green-600",
          });
        });
        // Alerts stay on top, sort rest by most recent
        const alerts = activityList.filter(a => a.type === 'alert');
        const rest = activityList.filter(a => a.type !== 'alert');
        setActivities([...alerts, ...rest].slice(0, 10));
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activité récente</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Activité récente</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité récente</p>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => onNavigateToApprenant?.(activity.apprenantId)}
            >
              <div className={`p-2 rounded-lg ${activity.iconBg}`}>
                <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {activity.message}
                  {activity.target && (
                    <> — <span className="font-medium">{activity.target}</span></>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
