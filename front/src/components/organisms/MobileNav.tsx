'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { NavDrawer } from '@/components/organisms/NavDrawer';

export function MobileNav() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
        <NavDrawer variant="mobile" onNavigate={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
