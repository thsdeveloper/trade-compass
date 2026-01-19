import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { sendMagicLink, loginWithPassword } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const isLoggedIn = !!session;

  const handleDeepLink = useCallback(
    async (url: string) => {
      if (!url) return;

      console.log('Deep link received:', url);

      // Supabase sends tokens in the URL fragment (#), not query params (?)
      // Example: tradecompass://auth#access_token=xxx&refresh_token=xxx
      const hasAuthPath = url.includes('://auth') || url.includes('/auth');

      if (hasAuthPath) {
        // Parse fragment params (after #)
        const fragmentIndex = url.indexOf('#');
        if (fragmentIndex === -1) {
          console.log('No fragment found in URL');
          return;
        }

        const fragment = url.substring(fragmentIndex + 1);
        const params = new URLSearchParams(fragment);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        console.log('Tokens found:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });

        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
              return;
            }

            if (data.session) {
              console.log('Session set successfully');
              setSession(data.session);
              setUser(data.session.user);
            }
          } catch (error) {
            console.error('Error handling deep link:', error);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    handleInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments as string[])[0] === 'auth';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/auth/login' as never);
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isLoading, router]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    const result = await loginWithPassword(email, password);

    if (result.error) {
      return { error: result.error };
    }

    if (result.data?.session) {
      const { data, error } = await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    }

    return {};
  };

  const signInWithMagicLink = async (
    email: string
  ): Promise<{ error?: string }> => {
    const result = await sendMagicLink(email, 'mobile');

    if (result.error) {
      return { error: result.error };
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isLoggedIn,
        signIn,
        signInWithMagicLink,
        signOut,
      }}
    >
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
