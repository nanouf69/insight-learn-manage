import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const withTimeout = async <T,>(operation: PromiseLike<T> | T, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
  });

  try {
    return await Promise.race<T>([Promise.resolve(operation), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const adminRoleCache = new Map<string, boolean>();
const negativeRoleChecks = new Map<string, number>();

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const lastKnownAdminRef = useRef<boolean | null>(null);
  const lastKnownUserIdRef = useRef<string | null>(null);
  const consecutiveNegativeChecksRef = useRef(0);

  useEffect(() => {
    let isActive = true;

    const checkRole = async () => {
      if (!user) {
        if (isActive) {
          lastKnownAdminRef.current = null;
          lastKnownUserIdRef.current = null;
          consecutiveNegativeChecksRef.current = 0;
          setIsAdmin(null);
          setChecking(false);
        }
        return;
      }

      if (lastKnownUserIdRef.current !== user.id) {
        lastKnownUserIdRef.current = user.id;
        lastKnownAdminRef.current = adminRoleCache.get(user.id) ?? null;
        consecutiveNegativeChecksRef.current = 0;
        setIsAdmin(lastKnownAdminRef.current);
      }

      const cachedAdmin = adminRoleCache.get(user.id);
      if (cachedAdmin === true) {
        lastKnownAdminRef.current = true;
        setIsAdmin(true);
        setChecking(false);
        return;
      }
      setChecking(true);

      const { data, error } = await withTimeout(
        supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        }),
        12000,
      ).catch((error) => ({ data: null, error }));

      if (!isActive) return;

      if (error) {
        // A transient backend/network timeout must not be treated as “non admin”,
        // otherwise the dashboard bounces to the learner portal and flickers.
        if (lastKnownUserIdRef.current === user.id && lastKnownAdminRef.current !== null) {
          setIsAdmin(lastKnownAdminRef.current);
          setChecking(false);
          return;
        }
        setTimeout(() => {
          if (isActive) setRetryNonce((value) => value + 1);
        }, 1500);
        return;
      }

      if (data !== true) {
        consecutiveNegativeChecksRef.current += 1;
        const globalNegativeChecks = (negativeRoleChecks.get(user.id) ?? 0) + 1;
        negativeRoleChecks.set(user.id, globalNegativeChecks);

        // Avoid a single stale/temporary “false” role response bouncing an admin
        // to /cours-public, which then redirects back here and causes flicker.
        if (consecutiveNegativeChecksRef.current < 3 || globalNegativeChecks < 3) {
          setTimeout(() => {
            if (isActive) setRetryNonce((value) => value + 1);
          }, 500);
          return;
        }
      } else {
        consecutiveNegativeChecksRef.current = 0;
        negativeRoleChecks.delete(user.id);
        adminRoleCache.set(user.id, true);
      }

      lastKnownUserIdRef.current = user.id;
      lastKnownAdminRef.current = data === true;
      setIsAdmin(data === true);
      setChecking(false);
    };

    checkRole();

    return () => {
      isActive = false;
    };
  }, [user, retryNonce]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/cours-public" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
