'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Compass, Mail, Lock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'recover' | 'magic-link';

function AuthPageContent() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isInitialized, setIsInitialized] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, recoverPassword, signInWithMagicLink, setSessionFromTokens } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle initial mode from URL
  useEffect(() => {
    if (!isInitialized) {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'register' || urlMode === 'login' || urlMode === 'recover' || urlMode === 'magic-link') {
        setMode(urlMode as AuthMode);
      }
      setIsInitialized(true);
    }

    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams, isInitialized]);

  // Handle hash fragment with access_token (implicit flow from magic link)
  useEffect(() => {
    const handleHashFragment = async () => {
      // Check if there's a hash fragment with tokens
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          setLoading(true);
          // Clear the hash immediately to prevent retry loops
          window.history.replaceState(null, '', window.location.pathname);

          try {
            // Use AuthContext method to set session (same Supabase instance)
            const { error } = await setSessionFromTokens(accessToken, refreshToken);

            if (error) {
              setError('Erro ao estabelecer sessão: ' + error.message);
            } else {
              // Redirect to dashboard
              router.push('/financas');
              return;
            }
          } catch (err) {
            console.error('Error setting session from hash:', err);
            setError('Erro ao processar link de autenticação');
          } finally {
            setLoading(false);
          }
        }
      }
    };

    handleHashFragment();
  }, [router, setSessionFromTokens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'recover') {
        const { error: recoveryError, message } = await recoverPassword(email);

        if (recoveryError) {
          setError(recoveryError.message);
        } else {
          setSuccess(message || 'Email de recuperação enviado com sucesso!');
          setEmail('');
        }
      } else if (mode === 'magic-link') {
        const { error: magicLinkError, message } = await signInWithMagicLink(email);

        if (magicLinkError) {
          setError(magicLinkError.message);
        } else {
          setSuccess(message || 'Link de acesso enviado para seu email!');
          setEmail('');
        }
      } else {
        const { error: authError } = mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password);

        if (authError) {
          setError(authError.message);
        } else {
          router.push('/financas');
        }
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Entrar';
      case 'register':
        return 'Criar Conta';
      case 'recover':
        return 'Recuperar Senha';
      case 'magic-link':
        return 'Acesso Sem Senha';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login':
        return 'Acesse sua conta para gerenciar sua watchlist';
      case 'register':
        return 'Crie uma conta para começar a monitorar ativos';
      case 'recover':
        return 'Digite seu email para receber o link de recuperação';
      case 'magic-link':
        return 'Receba um link de acesso direto no seu email';
    }
  };

  const getSubmitLabel = () => {
    if (loading) return 'Carregando...';

    switch (mode) {
      case 'login':
        return 'Entrar';
      case 'register':
        return 'Criar Conta';
      case 'recover':
        return 'Enviar Link';
      case 'magic-link':
        return 'Enviar Link de Acesso';
    }
  };

  return (
    <PageShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode !== 'recover' && mode !== 'magic-link' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      name="password"
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive" data-testid={mode === 'magic-link' ? 'magic-link-error' : 'error-message'}>
                  {error}
                </p>
              )}

              {success && (
                <p className="text-sm text-green-600" data-testid={mode === 'magic-link' ? 'magic-link-sent-message' : 'success-message'}>
                  {success}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {getSubmitLabel()}
                {mode === 'recover' ? (
                  <ArrowRight className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
              {mode === 'recover' || mode === 'magic-link' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex items-center justify-center gap-1 text-primary hover:underline w-full"
                  data-testid="back-to-login"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para login
                </button>
              ) : (
                <>
                  <div>
                    {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-primary hover:underline"
                    >
                      {mode === 'login' ? 'Criar conta' : 'Fazer login'}
                    </button>
                  </div>

                  {mode === 'login' && (
                    <>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('recover');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-primary hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('magic-link');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-primary hover:underline"
                          data-testid="magic-link-mode-button"
                        >
                          Entrar sem senha (Magic Link)
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageShell>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
