'use client';

import { useQuery } from 'convex/react';
import { format } from 'date-fns';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  DataTable,
  useAnalyticsDate,
  useRegisterExport,
  downloadCsv,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

export default function CreditsAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getCreditAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  useRegisterExport(
    analytics
      ? () =>
          downloadCsv('nima-credits-analytics.csv', [
            ...analytics.recentAttempts.map((a) => ({
              user: a.displayName,
              email: a.email,
              package_credits: a.creditAmount,
              amount_kes: a.priceKes,
              status: a.status,
              mpesa_number: a.phoneNumber,
              failure_reason: a.failureReason ?? '',
              date: new Date(a.createdAt).toISOString(),
            })),
          ])
      : null
  );

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <StatsGrid
        stats={[
          {
            label: 'Attempted',
            value: analytics.totalAttempts,
            description: 'All purchase attempts',
          },
          {
            label: 'Completed',
            value: analytics.completed,
            description: 'Successful payments',
          },
          {
            label: 'Failed',
            value: analytics.failed,
            description: 'Failed or timed out',
          },
          {
            label: 'Conversion',
            value: `${analytics.conversionRate}%`,
            description: 'Attempts → completed',
          },
          {
            label: 'Revenue (KES)',
            value: `KES ${analytics.totalRevenueKes.toLocaleString()}`,
            description: 'From completed purchases',
          },
          {
            label: 'Avg Purchase',
            value: `KES ${analytics.avgPurchaseKes.toLocaleString()}`,
            description: 'Per completed transaction',
          },
          {
            label: 'Pending',
            value: analytics.pending,
            description: 'Awaiting payment confirmation',
          },
          {
            label: 'Unique Buyers',
            value: analytics.topBuyers.length > 0
              ? new Set(analytics.recentAttempts.filter(a => a.status === 'completed').map(a => a.userId)).size
              : 0,
            description: 'In period',
          },
        ]}
      />

      {/* Purchase Attempts Trend */}
      <AnalyticsChart
        type="area"
        title="Purchase Attempts Over Time"
        description="Daily credit purchase attempts (all statuses)"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      {/* Revenue Trend */}
      <AnalyticsChart
        type="area"
        title="Revenue Over Time (KES)"
        description="Daily revenue from completed purchases"
        data={analytics.revenueTrend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Package */}
        <AnalyticsChart
          type="bar"
          title="Purchases by Credit Package"
          description="How many times each package was purchased"
          data={analytics.byPackage.map((p) => ({
            name: `${p.credits} credits`,
            count: p.count,
          }))}
          dataKey="count"
          xAxisKey="name"
          height={280}
        />

        {/* By Status */}
        <AnalyticsChart
          type="pie"
          title="Attempts by Status"
          description="Breakdown of purchase attempt outcomes"
          data={analytics.byStatus}
          dataKey="count"
          nameKey="status"
          height={280}
        />
      </div>

      {/* Package Revenue Breakdown */}
      {analytics.byPackage.length > 0 && (
        <DataTable
          title="Revenue by Package"
          description="Credits sold and revenue generated per package size"
          data={analytics.byPackage}
          columns={[
            {
              key: 'credits',
              header: 'Package',
              format: (v) => `${v} credits`,
            },
            {
              key: 'count',
              header: 'Purchases',
              format: (v) => Number(v).toLocaleString(),
            },
            {
              key: 'revenueKes',
              header: 'Revenue (KES)',
              format: (v) => `KES ${Number(v).toLocaleString()}`,
            },
          ]}
        />
      )}

      {/* Top Buyers */}
      {analytics.topBuyers.length > 0 && (
        <DataTable
          title="Top Buyers"
          description="Users who spent the most on credits in this period"
          data={analytics.topBuyers}
          columns={[
            { key: 'displayName', header: 'Name' },
            { key: 'email', header: 'Email' },
            {
              key: 'purchases',
              header: 'Purchases',
              format: (v) => Number(v).toLocaleString(),
            },
            {
              key: 'totalCredits',
              header: 'Credits Bought',
              format: (v) => Number(v).toLocaleString(),
            },
            {
              key: 'totalSpentKes',
              header: 'Total Spent (KES)',
              format: (v) => `KES ${Number(v).toLocaleString()}`,
            },
          ]}
        />
      )}

      {/* Recent Attempts */}
      {analytics.recentAttempts.length > 0 && (
        <DataTable
          title="Recent Purchase Attempts"
          description="Last 50 credit purchase attempts (all statuses)"
          data={analytics.recentAttempts.map((a) => ({
            ...a,
            statusBadge: a.status,
            date: format(new Date(a.createdAt), 'MMM d, yyyy HH:mm'),
            package: `${a.creditAmount} credits`,
            price: `KES ${a.priceKes.toLocaleString()}`,
          }))}
          columns={[
            { key: 'displayName', header: 'User' },
            { key: 'email', header: 'Email' },
            { key: 'package', header: 'Package' },
            { key: 'price', header: 'Amount' },
            {
              key: 'statusBadge',
              header: 'Status',
              format: (v) => {
                const s = String(v);
                return (
                  <Badge variant={statusBadgeVariant(s)} className="capitalize">
                    {s}
                  </Badge>
                );
              },
            },
            { key: 'phoneNumber', header: 'M-Pesa Number' },
            { key: 'date', header: 'Date' },
          ]}
        />
      )}
    </div>
  );
}
