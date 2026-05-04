'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Store,
  Phone,
  Mail,
  Globe,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

type PendingSeller = {
  _id: Id<'sellers'>;
  shopName: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  createdAt: number;
  isActive: boolean;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NewSellersPage() {
  const pendingSellers = useQuery(api.admin.queries.getPendingSellers, {});
  const verifySeller = useMutation(api.admin.sellers.verifySeller);
  const rejectSeller = useMutation(api.admin.sellers.rejectSeller);

  const [verifyTarget, setVerifyTarget] = useState<PendingSeller | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingSeller | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleVerify() {
    if (!verifyTarget) return;
    setIsPending(true);
    try {
      await verifySeller({ sellerId: verifyTarget._id });
      toast.success(`${verifyTarget.shopName} verified successfully`);
      setVerifyTarget(null);
    } catch {
      toast.error('Failed to verify seller');
    } finally {
      setIsPending(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setIsPending(true);
    try {
      await rejectSeller({ sellerId: rejectTarget._id, reason: rejectReason || undefined });
      toast.success(`${rejectTarget.shopName} rejected`);
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject seller');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/sellers"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-semibold">New Sellers</h1>
          <p className="text-muted-foreground mt-1">
            Review and verify sellers who have recently signed up. Verification means you&apos;ve
            physically visited their shop and confirmed they&apos;re legitimate.
          </p>
        </div>
      </div>

      {/* Sellers list */}
      {pendingSellers === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-muted animate-pulse rounded w-40" />
                <div className="h-4 bg-muted animate-pulse rounded w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-4 bg-muted animate-pulse rounded w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingSellers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
            <p className="text-muted-foreground mt-1">No sellers awaiting verification.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pendingSellers.map((seller) => (
            <Card key={seller._id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <CardTitle className="text-base leading-tight">{seller.shopName}</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
                <CardDescription className="ml-6">
                  Joined {formatDate(seller.createdAt)}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* Contact info */}
                <div className="space-y-1.5 text-sm">
                  {seller.contactEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{seller.contactEmail}</span>
                    </div>
                  )}
                  {seller.contactPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{seller.contactPhone}</span>
                    </div>
                  )}
                  {seller.websiteUrl && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                      <a
                        href={seller.websiteUrl.startsWith('http') ? seller.websiteUrl : `https://${seller.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground hover:underline flex items-center gap-1"
                      >
                        {seller.websiteUrl}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Store link */}
                <a
                  href={`/shop/${seller.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View store page
                  <ExternalLink className="h-3 w-3" />
                </a>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setVerifyTarget(seller)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => { setRejectTarget(seller); setRejectReason(''); }}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Disqualify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verify confirmation dialog */}
      <Dialog open={verifyTarget !== null} onOpenChange={(open) => { if (!open) setVerifyTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Verify Seller
            </DialogTitle>
            <DialogDescription>
              Confirm you have physically visited{' '}
              <span className="font-semibold">{verifyTarget?.shopName}</span>&apos;s shop and verified
              they are a legitimate seller. Their products will become available for purchase on Nima.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleVerify}
              disabled={isPending}
            >
              {isPending ? 'Verifying…' : 'Yes, Verify Seller'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectTarget !== null} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Disqualify Seller
            </DialogTitle>
            <DialogDescription>
              Reject <span className="font-semibold">{rejectTarget?.shopName}</span>. Their products
              will not be listed on Nima for purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Couldn't verify location, products don't meet quality standards…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? 'Rejecting…' : 'Disqualify Seller'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
