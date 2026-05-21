import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isActive = true;

    const checkRole = async () => {
      if (!user) {
        if (isActive) {
          setIsAdmin(null);
          setChecking(false);
        }
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
        setIsAdmin((previous) => previous);
      } else {
        setIsAdmin(data === true);
      }
      setChecking(false);
    };

    checkRole();

    return () => {
      isActive = false;
    };
  }, [user]);

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
