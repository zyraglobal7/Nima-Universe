import { TailorGuard } from '@/components/seller/TailorGuard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { SellerHeader } from '@/components/seller/SellerHeader';

export default function TailorLayout({ children }: { children: React.ReactNode }) {
  return (
    <TailorGuard>
      <SidebarProvider>
        <SellerSidebar />
        <SidebarInset>
          <SellerHeader />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TailorGuard>
  );
}
