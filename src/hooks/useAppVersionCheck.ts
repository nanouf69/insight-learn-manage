import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useAppVersionCheck(isAuthenticated: boolean, isAdmin: boolean) {
  const initialVersionRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only run for admins/formateurs — never for apprenants
    if (!isAuthenticated || !isAdmin) return;

    const fetchVersion = async (): Promise<string | null> => {
      try {
        const { data } = await supabase
          .from('app_version' as any)
          .select('version')
          .limit(1)
          .maybeSingle();
        return (data as any)?.version ?? null;
      } catch {
        return null;
      }
    };

    const notifyVersionChange = () => {
      toast.info(
        "Une mise à jour est disponible. Vous pouvez actualiser quand vous avez terminé votre action en cours.",
        { duration: 8000 }
      );
    };

    // Capture initial version on mount
    fetchVersion().then((v) => {
      if (v) initialVersionRef.current = v;
    });

    // Poll every 2 minutes
    intervalRef.current = setInterval(async () => {
      const currentVersion = await fetchVersion();
      if (!currentVersion || !initialVersionRef.current) return;
      if (currentVersion !== initialVersionRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        notifyVersionChange();
      }
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, isAdmin]);
}
