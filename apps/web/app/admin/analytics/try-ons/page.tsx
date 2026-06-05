'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  DataTable,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function TryOnsAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getTryOnAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  const sellerAnalytics = useQuery(api.admin.analytics.getSellerTryOnAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <StatsGrid
        stats={[
          { label: 'Total Try-Ons', value: analytics.total },
          { label: 'Completed', value: analytics.completed, description: 'Successfully generated' },
          { label: 'Failed', value: analytics.failed, description: 'Generation errors' },
          { label: 'Success Rate', value: `${analytics.successRate}%` },
        ]}
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="area"
        title="Try-Ons Over Time"
        description="Daily try-on requests"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <AnalyticsChart
          type="pie"
          title="Try-Ons by Category"
          description="Distribution across item categories"
          data={analytics.byCategory}
          dataKey="count"
          nameKey="category"
          height={300}
        />

        {/* By Status */}
        <AnalyticsChart
          type="pie"
          title="Try-Ons by Status"
          description="Current status distribution"
          data={analytics.byStatus}
          dataKey="count"
          nameKey="status"
          height={300}
        />
      </div>

      {/* Top Items */}
      <AnalyticsChart
        type="bar"
        title="Top 10 Most Tried-On Items"
        description="Items with the most try-on requests"
        data={analytics.topItems}
        dataKey="count"
        xAxisKey="name"
        layout="horizontal"
        height={400}
        formatXAxis={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
      />

      {/* Provider Stats */}
      {analytics.byProvider.length > 0 && (
        <DataTable
          title="Performance by Provider"
          description="Try-on generation statistics by AI provider"
          data={analytics.byProvider}
          columns={[
            { key: 'provider', header: 'Provider' },
            { key: 'count', header: 'Total Requests', format: (v) => Number(v).toLocaleString() },
            { key: 'successRate', header: 'Success Rate', format: (v) => `${v}%` },
          ]}
        />
      )}

      {/* ---- Seller Try-Ons (customer try-ons via seller share links) ---- */}
      <div className="pt-4">
        <h2 className="text-lg font-semibold mb-1">Seller Try-Ons</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Try-ons from public seller links (<code>/[store]/try-on/[product]</code>) — by volume,
          source website, and item.
        </p>

        {!sellerAnalytics ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <StatsGrid
              stats={[
                { label: 'Total Seller Try-Ons', value: sellerAnalytics.total },
                { label: 'Completed', value: sellerAnalytics.completed, description: 'Successfully generated' },
                { label: 'Failed', value: sellerAnalytics.failed, description: 'Generation errors' },
                { label: 'Success Rate', value: `${sellerAnalytics.successRate}%` },
              ]}
            />

            <AnalyticsChart
              type="area"
              title="Seller Try-Ons Over Time"
              description="Daily try-ons from seller links"
              data={sellerAnalytics.trend}
              dataKey="count"
              height={300}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <AnalyticsChart
                type="pie"
                title="Try-Ons by Source"
                description="Which website / source customers came from"
                data={sellerAnalytics.bySource}
                dataKey="count"
                nameKey="source"
                height={300}
              />

              <DataTable
                title="Top Tried-On Products"
                description="Most tried-on items via seller links"
                data={sellerAnalytics.topItems}
                columns={[
                  { key: 'name', header: 'Product' },
                  { key: 'shop', header: 'Store' },
                  { key: 'count', header: 'Try-Ons', format: (v) => Number(v).toLocaleString() },
                ]}
              />
            </div>

            <DataTable
              title="Try-Ons by Source Website"
              description="Referrer host or utm_source per try-on"
              data={sellerAnalytics.bySource}
              columns={[
                { key: 'source', header: 'Source' },
                { key: 'count', header: 'Try-Ons', format: (v) => Number(v).toLocaleString() },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

