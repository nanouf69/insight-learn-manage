import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';

interface Profile {
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const manualSignOutRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('Failed to fetch profile:', error.message);
        // Retry once after 2s on network errors
        if (retryCount < 1) {
          setTimeout(() => void fetchProfile(userId, retryCount + 1), 2000);
          return;
        }
      }
      setProfile(data);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      if (retryCount < 1) {
        setTimeout(() => void fetchProfile(userId, retryCount + 1), 2000);
      }
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    lastProfileUserIdRef.current = null;
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(prev => {
      // Skip update if it's just a token refresh for the same user.
      // This prevents re-rendering the entire component tree (including active exams)
      // every 10 minutes when useSessionKeepAlive refreshes the token.
      if (prev && nextSession && prev.user?.id === nextSession.user?.id) return prev;
      return nextSession;
    });

    setUser(prev => {
      const newId = nextSession?.user?.id ?? null;
      const prevId = prev?.id ?? null;
      if (newId === prevId) return prev;
      return nextSession?.user ?? null;
    });

    const currentUserId = nextSession?.user?.id ?? null;
    if (!currentUserId) {
      setProfile(null);
      lastProfileUserIdRef.current = null;
      return;
    }

    if (lastProfileUserIdRef.current !== currentUserId) {
      lastProfileUserIdRef.current = currentUserId;
      setTimeout(() => {
        void fetchProfile(currentUserId);
      }, 0);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let isActive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) return;

      if (nextSession?.user) {
        manualSignOutRef.current = false;
        applySession(nextSession);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT' && !manualSignOutRef.current) {
        setTimeout(async () => {
          if (!isActive) return;
          const { data: { session: recoveredSession } } = await supabase.auth.getSession();
          if (!isActive) return;

          if (recoveredSession?.user) {
            applySession(recoveredSession);
          } else {
            clearAuthState();
          }
          setLoading(false);
        }, 350);
        return;
      }

      manualSignOutRef.current = false;
      clearAuthState();
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isActive) return;
      applySession(initialSession);
      setLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [applySession, clearAuthState]);

  const signOut = async () => {
    manualSignOutRef.current = true;
    await supabase.auth.signOut();
    clearAuthState();
  };

  const isAdmin = profile?.role === 'admin';
  useAppVersionCheck(!!user, isAdmin);

  // Stabilize Provider value: only re-render consumers when user/loading/profile
  // actually change — NOT when session token refreshes (which happens every 10min).
  // This prevents exam pages from being remounted during token refresh.
  const contextValue = useMemo(
    () => ({ user, session, loading, profile, signOut }),
    [user, session, loading, profile, signOut],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
