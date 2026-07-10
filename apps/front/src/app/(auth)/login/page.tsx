'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { signIn, user, setSessionFromTokens } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/financas');
    }
  }, [user, router]);

  // Handle URL parameters and hash fragments
  useEffect(() => {
    if (!isInitialized) {
      const urlError = searchParams.get('error');
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
      setIsInitialized(true);
    }

    // Handle hash fragment with access_token (implicit flow from magic link)
    const handleHashFragment = async () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          setLoading(true);
          window.history.replaceState(null, '', window.location.pathname);

          try {
            const { error } = await setSessionFromTokens(accessToken, refreshToken);
            if (error) {
              setError('Erro ao estabelecer sessão: ' + error.message);
            } else {
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
  }, [searchParams, isInitialized, router, setSessionFromTokens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
      } else {
        router.push('/financas');
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Bem-vindo de volta
        </h1>
        <p className="text-slate-500">
          Entre na sua conta para continuar gerenciando suas finanças.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-700 font-medium">
              Senha
            </Label>
            <Link
              href="/esqueci-senha"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
              minLength={6}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-500">ou</span>
        </div>
      </div>

      {/* Magic Link */}
      <Link href="/magic-link">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-base font-medium transition-all"
        >
          <Mail className="mr-2 h-5 w-5" />
          Entrar sem senha (Magic Link)
        </Button>
      </Link>

      {/* Register Link */}
      <p className="text-center text-slate-600">
        Ainda não tem uma conta?{' '}
        <Link
          href="/cadastro"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
