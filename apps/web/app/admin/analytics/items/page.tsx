'use client';

import { useQuery } from 'convex/react';

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

export default function ItemSourceAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getItemSourceAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  useRegisterExport(
    analytics
      ? () =>
          downloadCsv(
            'nima-item-sources.csv',
            analytics.bySource.map((s) => ({
              source: s.source,
              items: s.count,
            }))
          )
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
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <StatsGrid
        stats={[
          { label: 'Total Items', value: analytics.totalItems },
          {
            label: 'With Source',
            value: analytics.withSource,
            description: `${analytics.coverageRate}% of catalog`,
          },
          {
            label: 'Missing Source',
            value: analytics.withoutSource,
            description: 'No store or link',
          },
          {
            label: 'New in Period',
            value: analytics.newInPeriod,
            description: `${analytics.newWithSourceInPeriod} with a source`,
          },
        ]}
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="area"
        title="Sourced Items Added Over Time"
        description="Items with a source added per day in the selected period"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Sources */}
        <AnalyticsChart
          type="bar"
          title="Top 10 Sources"
          description="Stores / links contributing the most items"
          data={analytics.topSources}
          dataKey="count"
          xAxisKey="source"
          layout="horizontal"
          height={400}
          formatXAxis={(value) =>
            value.length > 22 ? value.slice(0, 22) + '...' : value
          }
        />

        {/* By Domain */}
        <AnalyticsChart
          type="pie"
          title="Items by Domain"
          description="Where source links point (e.g. instagram.com)"
          data={analytics.byDomain}
          dataKey="count"
          nameKey="domain"
          height={400}
        />
      </div>

      {/* Full Source Breakdown */}
      <DataTable
        title="All Sources"
        description="Every store / source and how many catalog items it contributes"
        data={analytics.bySource}
        columns={[
          { key: 'source', header: 'Source' },
          {
            key: 'count',
            header: 'Items',
            format: (v) => Number(v).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}
