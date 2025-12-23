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
import { Compass, Lock, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const accessToken = searchParams.get('access_token');

  useEffect(() => {
    if (!accessToken) {
      setError('Link de recuperação inválido ou expirado');
    }
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Token de recuperação ausente');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await resetPassword(accessToken, newPassword);

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/auth');
        }, 2000);
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Compass className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Senha Atualizada!</CardTitle>
              <CardDescription>
                Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    name="newPassword"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                    disabled={!accessToken}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                    disabled={!accessToken}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="error-message">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !accessToken}>
                {loading ? 'Atualizando...' : 'Atualizar Senha'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-primary hover:underline"
              >
                Voltar para login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Carregando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </PageShell>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
