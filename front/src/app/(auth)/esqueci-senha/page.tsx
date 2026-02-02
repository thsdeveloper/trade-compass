'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { recoverPassword, user } = useAuth();
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
      const { error: recoveryError } = await recoverPassword(email);
      if (recoveryError) {
        setError(recoveryError.message);
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
            Verifique seu email
          </h1>
          <p className="text-slate-500">
            Enviamos um link de recuperação para <span className="font-medium text-slate-700">{email}</span>.
            Verifique sua caixa de entrada e spam.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-600">O que fazer agora:</p>
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
            <li>Abra o email que enviamos</li>
            <li>Clique no link de recuperação</li>
            <li>Crie uma nova senha segura</li>
          </ol>
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Esqueceu sua senha?
        </h1>
        <p className="text-slate-500">
          Sem problemas! Digite seu email e enviaremos um link para você criar uma nova senha.
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
              Enviando...
            </>
          ) : (
            <>
              Enviar link de recuperação
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
