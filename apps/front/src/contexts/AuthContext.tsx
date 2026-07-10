'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { api, type Profile } from '@/lib/api';

export type { Profile };

/**
 * Authentication Context Type
 *
 * Provides authentication state and methods for the entire application.
 */
interface AuthContextType {
  /** Currently authenticated user (null if not authenticated) */
  user: User | null;
  /** Current session with tokens (null if not authenticated) */
  session: Session | null;
  /** User profile data (null if not loaded or not authenticated) */
  profile: Profile | null;
  /** Whether authentication state is being initialized */
  loading: boolean;
  /** Authenticate user with email and password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Create new user account */
  signUp: (email: string, password: string) => Promise<{ error: Error | null; emailConfirmationRequired?: boolean; message?: string }>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  /** Initiate password recovery flow */
  recoverPassword: (email: string) => Promise<{ error: Error | null; message?: string }>;
  /** Complete password reset with token */
  resetPassword: (token: string, newPassword: string) => Promise<{ error: Error | null; message?: string }>;
  /** Request magic link for passwordless authentication */
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null; message?: string }>;
  /** Set session from tokens (for magic link hash fragment) */
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<{ error: Error | null }>;
  /** Refresh profile data from server */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * Manages authentication state and provides auth methods to the application.
 * This component integrates both the backend API and Supabase client for
 * complete authentication flow:
 *
 * 1. Backend API handles authentication logic and validation
 * 2. Supabase client manages session persistence and real-time sync
 *
 * Features:
 * - Session persistence across page refreshes
 * - Real-time auth state synchronization across tabs
 * - Automatic token refresh
 * - Error handling for all auth operations
 *
 * @example
 * ```tsx
 * // In app layout
 * <AuthProvider>
 *   <YourApp />
 * </AuthProvider>
 *
 * // In components
 * const { user, signIn, signOut } = useAuth();
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  /**
   * Refresh profile data from server
   */
  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }

    try {
      const profileData = await api.getProfile(session.access_token);
      setProfile(profileData);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Get initial session from Supabase (for SSR/session persistence)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (including from other tabs)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch profile when session changes
  useEffect(() => {
    if (session?.access_token) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session?.access_token, refreshProfile]);

  /**
   * Sign in user with email and password
   *
   * Flow:
   * 1. Calls backend API to validate credentials
   * 2. Backend authenticates with Supabase and returns session
   * 3. Sets session in Supabase client for persistence
   * 4. Auth state is automatically updated via onAuthStateChange
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Object with error (null on success)
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        // Call backend API for login
        const response = await api.login(email, password);

        if (response.session) {
          // Set the session in Supabase client for persistence and real-time sync
          const { error } = await supabase.auth.setSession({
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
          });

          if (error) {
            return { error };
          }

          return { error: null };
        }

        return { error: new Error('Falha no login') };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Erro ao fazer login') };
      }
    },
    [supabase]
  );

  /**
   * Create new user account
   *
   * Flow:
   * 1. Calls backend API to create user
   * 2. Backend creates user in Supabase and returns session
   * 3. Sets session in Supabase client for persistence
   * 4. Auth state is automatically updated via onAuthStateChange
   *
   * @param email - User's email address
   * @param password - User's password (min 6 characters)
   * @returns Object with error (null on success)
   */
  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null; emailConfirmationRequired?: boolean; message?: string }> => {
      try {
        // Call backend API for registration
        const response = await api.register(email, password);

        // If email confirmation is required, return success with flag
        if (response.emailConfirmationRequired) {
          return {
            error: null,
            emailConfirmationRequired: true,
            message: response.message || 'Verifique seu email para confirmar o cadastro.'
          };
        }

        if (response.session) {
          // Set the session in Supabase client for persistence
          const { error } = await supabase.auth.setSession({
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
          });

          if (error) {
            return { error };
          }

          return { error: null };
        }

        return { error: new Error('Falha no registro') };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Erro ao criar conta') };
      }
    },
    [supabase]
  );

  /**
   * Sign out current user
   *
   * Flow:
   * 1. Notifies backend of logout (best effort)
   * 2. Clears session from Supabase client
   * 3. Auth state is automatically updated via onAuthStateChange
   *
   * Note: Always clears local session even if backend call fails
   */
  const signOut = useCallback(async () => {
    try {
      // Call backend logout if we have a session
      if (session?.access_token) {
        await api.logout(session.access_token);
      }
    } catch (err) {
      console.error('Error calling backend logout:', err);
    } finally {
      // Always clear local session and profile
      setProfile(null);
      await supabase.auth.signOut();
    }
  }, [supabase, session]);

  /**
   * Initiate password recovery flow
   *
   * Sends password reset email to the user.
   * The email contains a link to /auth/reset-password with a token.
   *
   * @param email - User's email address
   * @returns Object with error (null on success) and optional message
   */
  const recoverPassword = useCallback(
    async (email: string) => {
      try {
        const response = await api.recoverPassword(email);
        return { error: null, message: response.message };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Erro ao solicitar recuperação de senha'),
          message: undefined
        };
      }
    },
    []
  );

  /**
   * Complete password reset with recovery token
   *
   * Updates user's password using the token from recovery email.
   *
   * @param token - Access token from recovery email link
   * @param newPassword - New password (min 6 characters)
   * @returns Object with error (null on success) and optional message
   */
  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      try {
        const response = await api.resetPassword(token, newPassword);
        return { error: null, message: response.message };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Erro ao redefinir senha'),
          message: undefined
        };
      }
    },
    []
  );

  /**
   * Request magic link for passwordless authentication
   *
   * Sends a magic link to the user's email. When clicked, the link
   * will authenticate the user automatically via /auth/callback.
   *
   * Flow:
   * 1. User enters email
   * 2. Backend sends magic link via Supabase
   * 3. User clicks link in email
   * 4. Link redirects to /auth/callback with token
   * 5. Callback page exchanges token for session
   * 6. User is authenticated
   *
   * @param email - User's email address
   * @returns Object with error (null on success) and optional message
   */
  const signInWithMagicLink = useCallback(
    async (email: string) => {
      try {
        const response = await api.signInWithMagicLink(email);
        return { error: null, message: response.message };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Erro ao enviar link de acesso'),
          message: undefined
        };
      }
    },
    []
  );

  /**
   * Set session from tokens (for magic link hash fragment)
   *
   * Used when the magic link redirects with tokens in the URL hash.
   * Uses the same Supabase client instance to ensure onAuthStateChange is triggered.
   */
  const setSessionFromTokens = useCallback(
    async (accessToken: string, refreshToken: string) => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          return { error };
        }

        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Erro ao estabelecer sessão') };
      }
    },
    [supabase]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      recoverPassword,
      resetPassword,
      signInWithMagicLink,
      setSessionFromTokens,
      refreshProfile,
    }),
    [user, session, profile, loading, signIn, signUp, signOut, recoverPassword, resetPassword, signInWithMagicLink, setSessionFromTokens, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 *
 * Must be used within an AuthProvider component.
 *
 * @throws Error if used outside AuthProvider
 * @returns Authentication context with user, session, and auth methods
 *
 * @example
 * ```tsx
 * const { user, signIn, signOut } = useAuth();
 *
 * if (user) {
 *   return <div>Welcome {user.email}</div>
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
