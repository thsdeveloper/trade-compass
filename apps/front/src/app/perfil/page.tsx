'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { EditableAvatar } from '@/components/profile/EditableAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Lock, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export default function PerfilPage() {
  const { user, session, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [originalData, setOriginalData] = useState({
    fullName: '',
    phone: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      const name = profile.full_name || '';
      const phoneNumber = profile.phone || '';
      const avatar = profile.avatar_url || null;

      setFullName(name);
      setPhone(phoneNumber);
      setAvatarUrl(avatar);
      setOriginalData({
        fullName: name,
        phone: phoneNumber,
      });
      setIsLoading(false);
    } else if (!authLoading && user) {
      setIsLoading(false);
    }
  }, [profile, authLoading, user]);

  // Track changes
  useEffect(() => {
    const changed =
      fullName !== originalData.fullName ||
      phone !== originalData.phone;
    setHasChanges(changed);
  }, [fullName, phone, originalData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleAvatarChange = (newUrl: string | null) => {
    setAvatarUrl(newUrl);
    refreshProfile();
  };

  const handleSave = async () => {
    if (!hasChanges || !session?.access_token) return;

    // Validate name
    if (fullName && (fullName.length < 2 || fullName.length > 100)) {
      toast.error('Nome deve ter entre 2 e 100 caracteres');
      return;
    }

    setIsSaving(true);

    try {
      await api.updateProfile(
        {
          full_name: fullName || null,
          phone: phone || null,
        },
        session.access_token
      );

      setOriginalData({
        fullName,
        phone,
      });

      refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <PageShell title="Perfil">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user || !session) {
    return null;
  }

  return (
    <PageShell title="Perfil" description="Gerencie suas informacoes pessoais">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Clique na imagem para alterar sua foto de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <EditableAvatar
              avatarUrl={avatarUrl}
              onAvatarChange={handleAvatarChange}
              accessToken={session.access_token}
              size="lg"
            />
          </CardContent>
        </Card>

        {/* Personal Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Pessoais</CardTitle>
            <CardDescription>
              Atualize seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email nao pode ser alterado
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alteracoes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Seguranca</CardTitle>
            <CardDescription>
              Gerencie suas configuracoes de seguranca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/perfil/alterar-senha">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Alterar senha
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
