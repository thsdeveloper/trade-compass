'use client';

import Link from 'next/link';
import { User, LogOut, Settings, CreditCard, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserNavProps {
  variant?: 'default' | 'header';
}

export function UserNav({ variant = 'default' }: UserNavProps) {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
  }

  // Header variant with dropdown menu
  if (variant === 'header' && user) {
    const initials = user.email?.slice(0, 2).toUpperCase() || 'U';
    const displayName = user.email?.split('@')[0] || 'Usuário';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0 transition-all duration-150 hover:ring-2 hover:ring-ring/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-medium">{initials}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/configuracoes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/assinatura" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Assinatura</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/ajuda" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>Ajuda</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Header variant without user
  if (variant === 'header' && !user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth?mode=login">Entrar</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/auth?mode=register">Cadastre-se</Link>
        </Button>
      </div>
    );
  }

  // Default variant (sidebar/mobile)
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium md:inline-block">
            {user.email?.split('@')[0]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth?mode=login">Entrar</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/auth?mode=register">Cadastre-se</Link>
      </Button>
    </div>
  );
}
