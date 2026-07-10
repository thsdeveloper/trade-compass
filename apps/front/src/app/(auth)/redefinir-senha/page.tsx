'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';

function RedefinirSenhaForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // First check query params (for backwards compatibility)
    let token = searchParams.get('access_token');

    // If not in query params, check hash fragment (Supabase sends tokens here)
    if (!token && typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      token = params.get('access_token');
    }

    setAccessToken(token);
    setIsInitialized(true);

    if (!token) {
      setError('Link de recuperação inválido ou expirado');
    }
  }, [searchParams]);

  const passwordRequirements = [
    { label: 'Mínimo 6 caracteres', met: newPassword.length >= 6 },
    { label: 'Senhas coincidem', met: newPassword === confirmPassword && confirmPassword.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!accessToken) {
      setError('Token de recuperação ausente');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await resetPassword(accessToken, newPassword);

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center lg:justify-start">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Senha atualizada!
          </h1>
          <p className="text-slate-500">
            Sua senha foi alterada com sucesso. Você será redirecionado para a página de login.
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center lg:justify-start gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Redirecionando...</span>
        </div>

        {/* Manual redirect */}
        <Link href="/login" className="block">
          <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-base font-medium shadow-lg shadow-blue-500/25">
            Ir para login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  // Invalid token state
  if (!accessToken) {
    return (
      <div className="space-y-8">
        {/* Error Icon */}
        <div className="flex justify-center lg:justify-start">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Link inválido
          </h1>
          <p className="text-slate-500">
            O link de recuperação é inválido ou expirou. Por favor, solicite um novo link.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/esqueci-senha" className="block">
            <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-base font-medium shadow-lg shadow-blue-500/25">
              Solicitar novo link
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="/login" className="block">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-base font-medium"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar para login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Criar nova senha
        </h1>
        <p className="text-slate-500">
          Digite sua nova senha abaixo. Escolha uma senha forte e única.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-slate-700 font-medium">
            Nova senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
            Confirmar nova senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
              minLength={6}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Password Requirements */}
        {(newPassword || confirmPassword) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {passwordRequirements.map((req) => (
              <div
                key={req.label}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  req.met ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    req.met ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}
                >
                  {req.met && <Check className="h-3 w-3" />}
                </div>
                {req.label}
              </div>
            ))}
          </div>
        )}

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
              Atualizando senha...
            </>
          ) : (
            <>
              Atualizar senha
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </form>

      {/* Back to Login */}
      <Link href="/login" className="block">
        <Button
          variant="ghost"
          className="w-full h-12 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-base font-medium"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar para login
        </Button>
      </Link>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <RedefinirSenhaForm />
    </Suspense>
  );
}
