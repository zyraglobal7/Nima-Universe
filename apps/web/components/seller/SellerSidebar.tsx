'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  Store,
  CreditCard,
  BarChart2,
  Sparkles,
  Plug,
  Scissors,
  Layers,
  ClipboardList,
  ArrowRight,
  ImageIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  {
    title: 'Dashboard',
    href: '/seller/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Products',
    href: '/seller/products',
    icon: Package,
  },
  {
    title: 'Orders',
    href: '/seller/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Finance',
    href: '/seller/finance',
    icon: DollarSign,
  },
  {
    title: 'Analytics',
    href: '/seller/analytics',
    icon: BarChart2,
  },
  {
    title: 'AI Insights',
    href: '/seller/ai-insights',
    icon: Sparkles,
  },
  {
    title: 'API',
    href: '/seller/api',
    icon: Plug,
  },
  {
    title: 'Billing',
    href: '/seller/billing',
    icon: CreditCard,
  },
];

export function SellerSidebar() {
  const pathname = usePathname();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/seller/dashboard">
                {seller?.logoUrl ? (
                  <Avatar className="size-8">
                    <AvatarImage src={seller.logoUrl} alt={seller.shopName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {seller.shopName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Store className="size-4" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-serif font-semibold truncate max-w-[140px]">
                    {seller?.shopName ?? 'Seller Dashboard'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {seller?.verificationStatus === 'verified' ? 'Verified Seller' : 'Seller Portal'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/seller/dashboard'
                    ? pathname === '/seller/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {seller?.sellerType === 'tailor' && (
          <SidebarGroup>
            <SidebarGroupLabel>Tailor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: 'Tailor Dashboard', href: '/seller/tailor', icon: Scissors },
                  { title: 'Inspirations', href: '/seller/tailor/inspirations', icon: ImageIcon },
                  { title: 'Fabrics', href: '/seller/tailor/fabrics', icon: Layers },
                  { title: 'Tailor Orders', href: '/seller/tailor/orders', icon: ClipboardList },
                ].map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === '/seller/tailor'
                          ? pathname === '/seller/tailor'
                          : pathname.startsWith(item.href)
                      }
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border space-y-2 p-2">
        {seller && seller.sellerType !== 'tailor' && (
          <Link
            href="/seller/tailor/onboarding"
            className="group flex items-start gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 to-secondary/8 p-3 transition-all hover:border-primary/40 hover:from-primary/12 hover:to-secondary/12"
          >
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <Scissors className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground leading-tight">Are you a tailor?</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Unlock custom orders, measurements &amp; fabric management.
              </p>
            </div>
            <ArrowRight className="mt-1 size-3.5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Shop Settings">
              <Link href="/seller/settings">
                <Settings className="size-4" />
                <span>Shop Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
