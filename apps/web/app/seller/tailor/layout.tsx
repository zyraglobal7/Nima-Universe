import { TailorGuard } from '@/components/seller/TailorGuard';

export default function TailorLayout({ children }: { children: React.ReactNode }) {
  return <TailorGuard>{children}</TailorGuard>;
}
