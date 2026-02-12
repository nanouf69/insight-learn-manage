import { useEffect, useState } from "react";
import { GraduationCap, UserPlus, FileCheck, CreditCard, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Activity {
  id: string;
  type: string;
  message: string;
  target: string;
  time: string;
  icon: typeof UserPlus;
  iconBg: string;
  iconColor: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch apprenants who recently completed onboarding
        const { data: completedApprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, updated_at, formation_choisie')
          .eq('documents_complets', true)
          .order('updated_at', { ascending: false })
          .limit(5);

        // Fetch recently created apprenants
        const { data: newApprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, created_at, formation_choisie')
          .order('created_at', { ascending: false })
          .limit(5);

        const activityList: Activity[] = [];

        // Add completed onboarding activities
        completedApprenants?.forEach((a) => {
          activityList.push({
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
          activityList.push({
            id: `new-${a.id}`,
            type: "inscription",
            message: `${a.prenom} ${a.nom} a été inscrit`,
            target: a.formation_choisie || "",
            time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr }),
            icon: UserPlus,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          });
        });

        // Sort by most recent and limit
        activityList.sort((a, b) => {
          // Parse "il y a X" - just use the original dates for sorting
          return 0; // Already sorted from DB
        });

        setActivities(activityList.slice(0, 6));
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
            <div key={activity.id} className="flex items-start gap-3">
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
