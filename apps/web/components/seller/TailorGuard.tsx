'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Scissors } from 'lucide-react';

interface TailorGuardProps {
  children: React.ReactNode;
}

export function TailorGuard({ children }: TailorGuardProps) {
  const router = useRouter();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  useEffect(() => {
    if (seller === null) {
      router.push('/seller/onboarding');
    } else if (seller !== undefined && seller.sellerType !== 'tailor') {
      // Has a seller account but not a tailor — redirect to regular dashboard
      router.push('/seller');
    }
  }, [seller, router]);

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

  return <>{children}</>;
}
