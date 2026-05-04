'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Share2,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useAnalyticsDate, useRegisterExport, downloadCsv } from '@/components/admin/analytics';

function fmt(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function kes(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function StatusBadge({ row }: { row: { status: 'pending' | 'credited'; usedAt: number | null; expiresAt: number | null } }) {
  const now = Date.now();
  if (row.usedAt) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 gap-1">
        <ShoppingBag className="w-3 h-3" />
        Used
      </Badge>
    );
  }
  if (row.status === 'credited') {
    const isExpired = row.expiresAt !== null && row.expiresAt <= now;
    if (isExpired) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1">
        <Gift className="w-3 h-3" />
        Active credit
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <Clock className="w-3 h-3" />
      Pending
    </Badge>
  );
}

export default function ReferralAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const data = useQuery(api.admin.analytics.getReferralAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  useRegisterExport(
    data
      ? () =>
          downloadCsv('nima-referrals.csv', [
            ...data.rows.map((r) => ({
              referrer: r.referrerName,
              referrer_email: r.referrerEmail,
              referee: r.refereeName,
              referee_email: r.refereeEmail,
              code: r.referralCode,
              status: r.status,
              credit_kes: r.creditAmountKes,
              credited_at: r.creditedAt ? new Date(r.creditedAt).toISOString() : '',
              expires_at: r.expiresAt ? new Date(r.expiresAt).toISOString() : '',
              used_at: r.usedAt ? new Date(r.usedAt).toISOString() : '',
              created_at: new Date(r.createdAt).toISOString(),
            })),
          ])
      : null
  );

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted animate-pulse rounded w-24 mb-2" />
                <div className="h-4 bg-muted animate-pulse rounded w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary, topReferrers, rows } = data;

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Share2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{summary.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.credited} credited · {summary.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">KES Awarded</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kes(summary.totalKesAwarded)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              across {summary.credited} successful referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Used at Checkout</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kes(summary.totalKesUsed)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.usedAtCheckout} of {summary.credited} credits redeemed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Expired</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kes(summary.totalKesExpired)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.expired} credits expired unused
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top referrers */}
      {topReferrers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top Referrers
            </CardTitle>
            <CardDescription>
              All-time leaderboard — users who have earned the most referral credits
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-6">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Credited</TableHead>
                  <TableHead className="text-right">KES Earned</TableHead>
                  <TableHead className="pr-6 text-right">KES Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReferrers.map((r, i) => (
                  <TableRow key={r.referrerId}>
                    <TableCell className="pl-6 text-muted-foreground font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {r.referralCode || '—'}
                      </code>
                    </TableCell>
                    <TableCell className="text-right text-sm">{r.totalReferrals}</TableCell>
                    <TableCell className="text-right text-sm">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {r.creditedReferrals}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{kes(r.totalKesEarned)}</TableCell>
                    <TableCell className="pr-6 text-right text-sm text-muted-foreground">{kes(r.totalKesUsed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Full referral log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Referral Log
          </CardTitle>
          <CardDescription>
            All referrals in the selected period · {rows.length} shown (max 200)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Share2 className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No referrals in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Credited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="pr-6">Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="pl-6">
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">{row.referrerName}</p>
                          <p className="text-xs text-muted-foreground">{row.referrerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">{row.refereeName}</p>
                          <p className="text-xs text-muted-foreground">{row.refereeEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {row.referralCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge row={row} />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {kes(row.creditAmountKes)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(row.creditedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(row.expiresAt)}</TableCell>
                      <TableCell className="pr-6 text-sm">
                        {row.usedAt ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {fmt(row.usedAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
