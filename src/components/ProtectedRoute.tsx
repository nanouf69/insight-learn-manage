import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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
      setIsAdmin(null);

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (!isActive) return;

      setIsAdmin(!error && data === true);
      setChecking(false);
    };

    checkRole();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

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
    return <Navigate to="/cours" replace />;
  }

  return <>{children}</>;
}
