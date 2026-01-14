'use client';

import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function UserNav() {
    const { user, signOut, loading } = useAuth();

    if (loading) {
        return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
    }

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
