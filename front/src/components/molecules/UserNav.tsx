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
  const { user, profile, signOut, loading } = useAuth();

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-sidebar-accent" />;
  }

  // Header variant with dropdown menu
  if (variant === 'header' && user) {
    const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario';
    const initials = profile?.full_name
      ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : user.email?.slice(0, 2).toUpperCase() || 'U';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0 transition-all duration-150 hover:ring-2 hover:ring-sidebar-ring/40"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sidebar-foreground">
                <span className="text-sm font-medium">{initials}</span>
              </div>
            )}
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
        <Button variant="ghost" size="sm" asChild className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Link href="/auth?mode=login">Entrar</Link>
        </Button>
        <Button size="sm" asChild className="bg-white text-sidebar hover:bg-white/90">
          <Link href="/auth?mode=register">Cadastre-se</Link>
        </Button>
      </div>
    );
  }

  // Default variant (sidebar/mobile)
  if (user) {
    const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario';

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sidebar-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
          <span className="hidden text-sm font-medium text-sidebar-foreground md:inline-block">
            {displayName}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
        <Link href="/auth?mode=login">Entrar</Link>
      </Button>
      <Button size="sm" asChild className="bg-white text-sidebar hover:bg-white/90">
        <Link href="/auth?mode=register">Cadastre-se</Link>
      </Button>
    </div>
  );
}
