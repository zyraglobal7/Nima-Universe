'use client';

import { useQuery } from 'convex/react';
import {
  Sparkles,
  Users,
  Heart,
  UserPlus,
  ShoppingCart,
  MessageSquare,
  Wand2,
  TrendingUp,
  Link2,
  Coins,
  Share2,
  Store,
} from 'lucide-react';

import { api } from '@/convex/_generated/api';
import {
  MetricCard,
  MetricCardSkeleton,
  useAnalyticsDate,
  useRegisterExport,
  downloadCsv,
} from '@/components/admin/analytics';

export default function AnalyticsDashboard() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const summary = useQuery(api.admin.analytics.getAnalyticsSummary, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  const itemSources = useQuery(api.admin.analytics.getItemSourceAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  useRegisterExport(
    summary
      ? () =>
          downloadCsv('nima-analytics-summary.csv', [
            { category: 'Try-Ons', metric: 'Total', value: summary.tryOns.total },
            { category: 'Try-Ons', metric: 'Success Rate (%)', value: summary.tryOns.successRate },
            { category: 'Looks', metric: 'Total', value: summary.looks.total },
            { category: 'Looks', metric: 'Saved', value: summary.looks.saved },
            { category: 'Looks', metric: 'Discarded', value: summary.looks.discarded },
            { category: 'Users', metric: 'Total', value: summary.users.total },
            { category: 'Users', metric: 'New in Period', value: summary.users.newInPeriod },
            { category: 'Users', metric: 'Active in Period', value: summary.users.activeInPeriod },
            { category: 'Saves', metric: 'Total', value: summary.saves.total },
            { category: 'Saves', metric: 'Lookbooks Created', value: summary.saves.lookbooksCreated },
            { category: 'Social', metric: 'Friendships', value: summary.social.friendships },
            { category: 'Social', metric: 'Direct Messages', value: summary.social.directMessages },
            { category: 'Cart', metric: 'Total Items', value: summary.cart.totalItems },
            { category: 'Cart', metric: 'Total Value (KES)', value: summary.cart.totalValue },
            { category: 'Chat', metric: 'Threads', value: summary.chat.threads },
            { category: 'Chat', metric: 'Messages', value: summary.chat.messages },
            { category: 'Credits', metric: 'Purchase Attempts', value: summary.credits.totalAttempts },
            { category: 'Credits', metric: 'Completed Purchases', value: summary.credits.completed },
            { category: 'Credits', metric: 'Revenue (KES)', value: summary.credits.totalRevenueKes },
            { category: 'Credits', metric: 'Conversion Rate (%)', value: summary.credits.conversionRate },
            { category: 'Referrals', metric: 'Total', value: summary.referrals.total },
            { category: 'Referrals', metric: 'Credited', value: summary.referrals.credited },
            { category: 'Referrals', metric: 'Pending', value: summary.referrals.pending },
            { category: 'Referrals', metric: 'KES Awarded', value: summary.referrals.totalKesAwarded },
            { category: 'Referrals', metric: 'KES Used at Checkout', value: summary.referrals.totalKesUsed },
          ])
      : null
  );

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Item Try-Ons"
        value={summary.tryOns.total}
        subtitle={`${summary.tryOns.successRate}% success rate`}
        icon={Wand2}
        href="/admin/analytics/try-ons"
        trend={summary.tryOns.trend}
        trendDirection={
          summary.tryOns.total > 0 ? (summary.tryOns.successRate >= 80 ? 'up' : 'neutral') : 'neutral'
        }
      />

      <MetricCard
        title="Looks Created"
        value={summary.looks.total}
        subtitle={`${summary.looks.saved} saved, ${summary.looks.discarded} discarded`}
        icon={Sparkles}
        href="/admin/analytics/looks"
        trend={summary.looks.trend}
      />

      <MetricCard
        title="Users"
        value={summary.users.total}
        subtitle={`${summary.users.newInPeriod} new, ${summary.users.activeInPeriod} active`}
        icon={Users}
        href="/admin/analytics/users"
        trend={summary.users.trend}
        trendDirection={summary.users.newInPeriod > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Saves"
        value={summary.saves.total}
        subtitle={`${summary.saves.lookbooksCreated} lookbooks created`}
        icon={Heart}
        href="/admin/analytics/saves"
        trend={summary.saves.trend}
      />

      <MetricCard
        title="Social Activity"
        value={summary.social.friendships}
        subtitle={`${summary.social.directMessages} DMs sent`}
        icon={UserPlus}
        href="/admin/analytics/social"
        trend={summary.social.trend}
      />

      <MetricCard
        title="Cart Activity"
        value={summary.cart.totalItems}
        subtitle={`$${(summary.cart.totalValue / 100).toFixed(2)} total value`}
        icon={ShoppingCart}
        href="/admin/analytics/cart"
        trend={summary.cart.trend}
      />

      <MetricCard
        title="Chat Messages"
        value={summary.chat.messages}
        subtitle={`${summary.chat.threads} threads`}
        icon={MessageSquare}
        href="/admin/analytics/chat"
        trend={summary.chat.trend}
      />

      <MetricCard
        title="Engagement"
        value={summary.users.activeInPeriod}
        subtitle="Active users in period"
        icon={TrendingUp}
        href="/admin/analytics/users"
        trend={summary.users.trend}
        trendDirection={summary.users.activeInPeriod > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Connect Conversions"
        value="—"
        subtitle="Try-on → cart → purchase"
        icon={Link2}
        href="/admin/analytics/connect"
      />

      <MetricCard
        title="Credit Purchases"
        value={summary.credits.completed}
        subtitle={`KES ${summary.credits.totalRevenueKes.toLocaleString()} revenue · ${summary.credits.conversionRate}% conversion`}
        icon={Coins}
        href="/admin/analytics/credits"
        trend={summary.credits.trend}
        trendDirection={summary.credits.completed > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Referrals"
        value={summary.referrals.total}
        subtitle={`${summary.referrals.credited} credited · KES ${summary.referrals.totalKesAwarded.toLocaleString()} awarded`}
        icon={Share2}
        href="/admin/analytics/referrals"
        trend={summary.referrals.trend}
        trendDirection={summary.referrals.total > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Item Sources"
        value={itemSources ? itemSources.withSource : '—'}
        subtitle={
          itemSources
            ? `${itemSources.coverageRate}% of catalog · ${itemSources.bySource.length} stores`
            : 'Sourced from stores & links'
        }
        icon={Store}
        href="/admin/analytics/items"
        trend={itemSources?.trend}
        trendDirection={
          itemSources && itemSources.newWithSourceInPeriod > 0 ? 'up' : 'neutral'
        }
      />
    </div>
  );
}

