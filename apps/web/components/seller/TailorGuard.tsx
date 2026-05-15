'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Scissors } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { SellerHeader } from '@/components/seller/SellerHeader';

interface TailorGuardProps {
  children: React.ReactNode;
}

export function TailorGuard({ children }: TailorGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  const isOnboarding = pathname === '/seller/tailor/onboarding';

  useEffect(() => {
    if (isOnboarding) return;
    if (seller === null) {
      router.push('/seller/onboarding');
    } else if (seller !== undefined && seller.sellerType !== 'tailor') {
      router.push('/seller');
    }
  }, [seller, router, isOnboarding]);

  // Onboarding: render bare (full-screen, no sidebar shell)
  if (isOnboarding) return <>{children}</>;

  if (seller === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading tailor portal...</p>
        </div>
      </div>
    );
  }

  if (seller === null || seller.sellerType !== 'tailor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scissors className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-medium text-foreground mb-2">Tailor Portal</h1>
          <p className="text-muted-foreground">This area is for tailor accounts only.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <SellerSidebar />
      <SidebarInset>
        <SellerHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
