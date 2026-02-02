'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Check, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { signUp, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/financas');
    }
  }, [user, router]);

  const passwordRequirements = [
    { label: 'Mínimo 6 caracteres', met: password.length >= 6 },
    { label: 'Senhas coincidem', met: password === confirmPassword && confirmPassword.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!acceptTerms) {
      setError('Você deve aceitar os termos de uso');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);

      if (result.error) {
        setError(result.error.message);
      } else if (result.emailConfirmationRequired) {
        // Show email confirmation screen
        setEmailSent(true);
      } else {
        // Auto-confirm enabled, redirect to dashboard
        router.push('/financas');
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Email confirmation sent screen
  if (emailSent) {
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
            Verifique seu email
          </h1>
          <p className="text-slate-500">
            Enviamos um link de confirmação para <span className="font-medium text-slate-700">{email}</span>.
            Clique no link para ativar sua conta.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-600 font-medium">O que fazer agora:</p>
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
            <li>Abra seu email (verifique também a pasta de spam)</li>
            <li>Clique no link de confirmação</li>
            <li>Sua conta será ativada automaticamente</li>
          </ol>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-700">
            O link de confirmação expira em 24 horas. Se você não receber o email, verifique sua pasta de spam ou tente se cadastrar novamente.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={() => {
              setEmailSent(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setAcceptTerms(false);
            }}
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-base font-medium"
          >
            <Mail className="mr-2 h-5 w-5" />
            Usar outro email
          </Button>

          <Link href="/login" className="block">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-base font-medium"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Ir para login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Crie sua conta grátis
        </h1>
        <p className="text-slate-500">
          Comece a organizar suas finanças hoje mesmo.
        </p>
      </div>

      {/* Benefits */}
      <div className="flex flex-wrap gap-3">
        {['Sem cartão de crédito', 'Grátis para sempre', 'Dados seguros'].map((benefit) => (
          <div
            key={benefit}
            className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            {benefit}
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="password" className="text-slate-700 font-medium">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Crie uma senha"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
            Confirmar senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirme sua senha"
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
        {(password || confirmPassword) && (
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

        {/* Terms */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            className="mt-1"
            disabled={loading}
          />
          <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
            Eu concordo com os{' '}
            <Link href="/termos" className="text-blue-600 hover:underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacidade" className="text-blue-600 hover:underline">
              Política de Privacidade
            </Link>
          </label>
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
              Criando conta...
            </>
          ) : (
            <>
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </form>

      {/* Login Link */}
      <p className="text-center text-slate-600 pt-2">
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Fazer login
        </Link>
      </p>
    </div>
  );
}
