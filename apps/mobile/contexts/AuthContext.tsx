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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { sendMagicLink, loginWithPassword } from '@/lib/api';
import { getProfile } from '@/lib/profile-api';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  monthly_income: number | null;
  onboarding_goals: string[] | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  /** true entre o envio do OTP de cadastro e a conclusão do onboarding */
  pendingOnboarding: boolean;
  setPendingOnboarding: (pending: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ONBOARDING_PENDING_KEY = '@trade-compass/onboarding-pending';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOnboarding, setPendingOnboardingState] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const isLoggedIn = !!session;

  const setPendingOnboarding = useCallback((pending: boolean) => {
    setPendingOnboardingState(pending);
    // Persistência assíncrona; o estado em memória guia a navegação.
    if (pending) {
      AsyncStorage.setItem(ONBOARDING_PENDING_KEY, 'true').catch(() => undefined);
    } else {
      AsyncStorage.removeItem(ONBOARDING_PENDING_KEY).catch(() => undefined);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }

    try {
      const result = await getProfile();
      if (result.data) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [session]);

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
        const pending = await AsyncStorage.getItem(ONBOARDING_PENDING_KEY);
        setPendingOnboardingState(pending === 'true');

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

  // Fetch profile when session changes
  useEffect(() => {
    if (session) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session, refreshProfile]);

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

    const rootSegment = (segments as string[])[0];
    const inAuthGroup = rootSegment === 'auth';
    const inOnboardingGroup = rootSegment === 'onboarding';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/auth/welcome' as never);
    } else if (isLoggedIn && inAuthGroup) {
      // Cadastro recém-verificado continua no onboarding; login normal vai às tabs.
      router.replace(
        (pendingOnboarding ? '/onboarding/name' : '/(tabs)') as never
      );
    } else if (isLoggedIn && inOnboardingGroup && !pendingOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isLoading, pendingOnboarding, router]);

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
    setProfile(null);
    setPendingOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isLoggedIn,
        pendingOnboarding,
        setPendingOnboarding,
        signIn,
        signInWithMagicLink,
        signOut,
        refreshProfile,
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
