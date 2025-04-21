import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials, SignOut } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // Assuming supabaseClient is correctly set up

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
  signOut: (options?: SignOut | undefined) => Promise<{ error: AuthError | null; }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", _event, session);
        setSession(session);
        setUser(session?.user ?? null);
        if (loading) {
            setLoading(false);
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loading]); // Rerun effect if loading state changes unexpectedly

  const value = {
    user,
    session,
    loading,
    signUp: (credentials: SignUpWithPasswordCredentials) => supabase.auth.signUp(credentials),
    signIn: (credentials: SignInWithPasswordCredentials) => supabase.auth.signInWithPassword(credentials),
    signOut: (options?: SignOut | undefined) => supabase.auth.signOut(options),
  };

  // Don't render children until the initial session check is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 