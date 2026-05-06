import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, Trash2 } from "lucide-react";

interface Notification {
  id: string;
  module_id: number;
  module_nom: string;
  change_summary: string;
  changed_at: string;
}

interface Props {
  apprenantId: string;
  /** If provided, only show notifications for this module. Otherwise show for all accessed modules. */
  moduleId?: number;
}

/**
 * Bannière apprenant affichant les modifications récentes apportées par
 * l'admin aux modules que l'apprenant a déjà consultés.
 * L'apprenant supprime lui-même chaque notification quand il l'a lue.
 */
const ModuleChangeNotificationsBanner = ({ apprenantId, moduleId }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [accessedModuleIds, setAccessedModuleIds] = useState<Set<number>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load accessed module IDs (modules the learner has opened)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("apprenant_module_activites")
        .select("module_id")
        .eq("apprenant_id", apprenantId);
      if (!cancelled) {
        const ids = new Set<number>((data ?? []).map((r) => Number(r.module_id)));
        setAccessedModuleIds(ids);
      }
    })();
    return () => { cancelled = true; };
  }, [apprenantId]);

  // Load dismissals
  const loadDismissals = async () => {
    const { data } = await supabase
      .from("module_notification_dismissals")
      .select("notification_id")
      .eq("apprenant_id", apprenantId);
    setDismissedIds(new Set((data ?? []).map((r) => r.notification_id)));
  };

  useEffect(() => {
    loadDismissals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apprenantId]);

  // Load notifications + realtime
  useEffect(() => {
    let cancelled = false;
    const fetchNotifs = async () => {
      let query = supabase
        .from("module_change_notifications")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);
      if (moduleId !== undefined) query = query.eq("module_id", moduleId);
      const { data } = await query;
      if (!cancelled) setNotifications((data as Notification[]) ?? []);
    };
    fetchNotifs();

    const channel = supabase
      .channel(`module-change-notifs-${apprenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "module_change_notifications" },
        () => fetchNotifs()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [apprenantId, moduleId]);

  const handleDismiss = async (notifId: string) => {
    setDismissedIds((prev) => new Set(prev).add(notifId));
    await supabase.from("module_notification_dismissals").insert({
      apprenant_id: apprenantId,
      notification_id: notifId,
    });
  };

  const visible = notifications.filter((n) => {
    if (dismissedIds.has(n.id)) return false;
    if (moduleId !== undefined) return n.module_id === moduleId;
    return accessedModuleIds.has(Number(n.module_id));
  });

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {visible.map((n) => (
        <Alert key={n.id} className="border-primary/40 bg-primary/5">
          <Bell className="h-4 w-4 text-primary" />
          <div className="flex justify-between items-start gap-3 w-full">
            <div className="flex-1">
              <AlertTitle className="text-primary">
                Mise à jour du module : {n.module_nom}
              </AlertTitle>
              <AlertDescription>
                <div className="text-xs text-muted-foreground mb-2">
                  {new Date(n.changed_at).toLocaleString("fr-FR")}
                </div>
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {n.change_summary}
                </pre>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Pensez à supprimer ce message une fois lu.
                </p>
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(n.id)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default ModuleChangeNotificationsBanner;
