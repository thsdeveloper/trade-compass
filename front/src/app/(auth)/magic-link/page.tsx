'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export default function MagicLinkPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signInWithMagicLink, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/financas');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: magicLinkError } = await signInWithMagicLink(email);
      if (magicLinkError) {
        setError(magicLinkError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            Link enviado!
          </h1>
          <p className="text-slate-500">
            Enviamos um link de acesso para <span className="font-medium text-slate-700">{email}</span>.
            Clique no link para entrar automaticamente.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 space-y-3 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Dica</span>
          </div>
          <p className="text-sm text-blue-700/80">
            O link é válido por 1 hora. Verifique sua caixa de entrada e spam. Após clicar, você será autenticado automaticamente.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-base font-medium"
          >
            <Mail className="mr-2 h-5 w-5" />
            Enviar para outro email
          </Button>

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
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-2">
          <Sparkles className="h-4 w-4" />
          Sem senha necessária
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Acesso por Magic Link
        </h1>
        <p className="text-slate-500">
          Receba um link de acesso direto no seu email. É rápido, seguro e sem complicação.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '🔒', label: 'Mais seguro' },
          { icon: '⚡', label: 'Mais rápido' },
          { icon: '🧠', label: 'Sem memorizar' },
        ].map((benefit) => (
          <div
            key={benefit.label}
            className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg justify-center sm:justify-start"
          >
            <span>{benefit.icon}</span>
            {benefit.label}
          </div>
        ))}
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

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Enviar Magic Link
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

      {/* Other options */}
      <div className="space-y-3">
        <Link href="/login" className="block">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-base font-medium"
          >
            Entrar com senha
          </Button>
        </Link>

        <p className="text-center text-slate-600">
          Não tem uma conta?{' '}
          <Link
            href="/cadastro"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
