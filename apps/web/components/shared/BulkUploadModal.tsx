'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { applyWatermarkToBlob } from '@/lib/utils/watermark';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  FolderOpen,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Ghost,
  RotateCcw,
  Images,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = 'queued' | 'uploading' | 'enriching' | 'done' | 'error';

interface BulkItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  price: string;
  ghostMannequin: boolean;
  status: ItemStatus;
  error?: string;
  itemId?: Id<'items'>;
}

interface SellerContext {
  _id: Id<'sellers'>;
  shopName: string;
  websiteUrl?: string;
  tier?: 'basic' | 'starter' | 'growth' | 'premium';
  watermarkEnabled?: boolean;
}

interface StatsContext {
  totalProducts: number;
  productLimit: number | null;
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'seller' | 'admin';
  seller?: SellerContext | null;
  stats?: StatsContext | null;
  onComplete?: (itemIds: Id<'items'>[]) => void;
}

const MAX_BATCH = 300; // max items per bulk upload session

function nameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === 'uploading' || status === 'enriching') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return null;
}

function statusLabel(status: ItemStatus): string {
  if (status === 'uploading') return 'Uploading…';
  if (status === 'enriching') return 'AI analyzing…';
  if (status === 'done') return 'Done';
  if (status === 'error') return 'Failed';
  return '';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BulkUploadModal({
  open,
  onOpenChange,
  mode,
  seller,
  stats,
  onComplete,
}: BulkUploadModalProps) {
  // stage: 0=website prompt, 1=review, 2=processing, 3=complete
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [websiteUrlInput, setWebsiteUrlInput] = useState('');
  const [websiteUrlSaving, setWebsiteUrlSaving] = useState(false);

  // Admin: selected seller ('_nima' = Nima catalog sentinel; '' = unset)
  const NIMA_SENTINEL = '_nima';
  const [selectedSellerId, setSelectedSellerId] = useState<Id<'sellers'> | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Convex hooks
  const generateSellerUploadUrl = useMutation(api.sellers.mutations.generateUploadUrl);
  const generateAdminUploadUrl = useMutation(api.admin.items.generateUploadUrl);
  const getAdminStorageUrl = useMutation(api.admin.items.getStorageUrl);
  const getSellerStorageUrl = useMutation(api.sellers.mutations.getStorageUrl);
  const createSellerProduct = useMutation(api.sellers.mutations.createSellerProduct);
  const addSellerItemImage = useMutation(api.sellers.mutations.addItemImage);
  const createAdminItem = useMutation(api.admin.items.createItem);
  const addAdminItemImage = useMutation(api.admin.items.addItemImage);
  const bulkEnrichItem = useAction(api.admin.aiActions.bulkEnrichItem);
  const generateGhostMannequin = useAction(api.admin.aiActions.generateGhostMannequin);
  const saveWebsiteUrl = useMutation(api.sellers.mutations.updateWebsiteUrl);

  // Admin: sellers list for selector
  const sellersData = useQuery(
    api.admin.queries.listSellersAdmin,
    mode === 'admin' ? { limit: 200 } : 'skip'
  );
  const sellerForAdmin = useQuery(
    api.admin.queries.getSellerForAdmin,
    mode === 'admin' && selectedSellerId ? { sellerId: selectedSellerId as Id<'sellers'> } : 'skip'
  );

  // Determine if we need to show the website URL prompt (stage 0).
  // Guard seller !== undefined so we don't flash stage 0 while the query is loading.
  const needsWebsiteUrl = mode === 'seller' && seller !== undefined && !seller?.websiteUrl;

  // Track the previous open value so re-renders (e.g. seller query re-emit) don't
  // reset the stage while the modal is already open and mid-processing.
  const openRef = useRef(false);
  useEffect(() => {
    if (open === openRef.current) return; // open didn't actually change
    openRef.current = open;

    if (!open) {
      // Revoke all preview URLs on close
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
      setStage(1);
      setIsDragging(false);
      setSelectedSellerId('');
    } else {
      setStage(needsWebsiteUrl ? 0 : 1);
    }
  }, [open, needsWebsiteUrl]);

  // Compute remaining slots (returns MAX_BATCH for unlimited plans)
  const remainingSlots = useCallback((): number => {
    if (mode === 'seller') {
      if (!stats) return MAX_BATCH;
      if (stats.productLimit === null) return MAX_BATCH; // unlimited plan
      return Math.max(0, stats.productLimit - stats.totalProducts);
    }
    if (mode === 'admin' && sellerForAdmin) {
      const tierLimits: Record<string, number | null> = {
        basic: 20, starter: 100, growth: 500, premium: null,
      };
      const tier = sellerForAdmin.tier ?? 'basic';
      const limit = tierLimits[tier];
      if (limit === null) return MAX_BATCH;
      return Math.max(0, limit - sellerForAdmin.activeProductCount);
    }
    return MAX_BATCH; // admin without selected seller: no limit
  }, [mode, stats, sellerForAdmin]);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const imageFiles = newFiles.filter((f) => f.type.startsWith('image/'));
      const slots = remainingSlots();
      const existingCount = items.length;
      const canAdd = Math.min(slots, MAX_BATCH) - existingCount;

      if (canAdd <= 0) {
        alert(
          slots <= 0
            ? `You've reached your product limit. Upgrade your plan to add more.`
            : `You've reached the batch limit of ${MAX_BATCH} images.`
        );
        return;
      }

      const toAdd = imageFiles.slice(0, canAdd);
      if (toAdd.length < imageFiles.length) {
        const reason = slots < MAX_BATCH
          ? `${slots} slot${slots !== 1 ? 's' : ''} remaining on your plan`
          : `batch limit of ${MAX_BATCH}`;
        alert(
          `Only ${canAdd} more product${canAdd !== 1 ? 's' : ''} can be added (${reason}). ${imageFiles.length - toAdd.length} image${imageFiles.length - toAdd.length !== 1 ? 's were' : ' was'} ignored.`
        );
      }

      const newItems: BulkItem[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: nameFromFilename(file.name),
        price: '',
        ghostMannequin: false,
        status: 'queued',
      }));

      setItems((prev) => [...prev, ...newItems]);
    },
    [items.length, remainingSlots]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    addFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files: File[] = [];

    // Try to read folder entries using the File System Access API
    if (e.dataTransfer.items) {
      const entries: FileSystemEntry[] = [];
      for (const item of Array.from(e.dataTransfer.items)) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      if (entries.length > 0) {
        const readEntry = (entry: FileSystemEntry): Promise<File[]> => {
          if (entry.isFile) {
            return new Promise((resolve) => {
              (entry as FileSystemFileEntry).file(
                (f) => resolve([f]),
                () => resolve([])
              );
            });
          }
          if (entry.isDirectory) {
            return new Promise((resolve) => {
              const reader = (entry as FileSystemDirectoryEntry).createReader();
              const readAll = (accumulated: File[]) => {
                reader.readEntries(async (subEntries) => {
                  if (subEntries.length === 0) {
                    resolve(accumulated);
                  } else {
                    const subFiles = await Promise.all(subEntries.map(readEntry));
                    readAll([...accumulated, ...subFiles.flat()]);
                  }
                });
              };
              readAll([]);
            });
          }
          return Promise.resolve([]);
        };

        const nestedFiles = await Promise.all(entries.map(readEntry));
        files.push(...nestedFiles.flat());
      }
    }

    if (files.length === 0 && e.dataTransfer.files.length > 0) {
      files.push(...Array.from(e.dataTransfer.files));
    }

    addFiles(files);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateItem = (id: string, updates: Partial<BulkItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  // ─── Processing ─────────────────────────────────────────────────────────────

  const processItem = async (item: BulkItem): Promise<void> => {
    const isAdmin = mode === 'admin';

    try {
      // 1. Upload original image (no watermark yet — AI steps run first)
      updateItem(item.id, { status: 'uploading' });

      const uploadUrl = isAdmin
        ? await generateAdminUploadUrl({})
        : await generateSellerUploadUrl({});

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': item.file.type },
        body: item.file,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const { storageId: originalStorageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };

      // 2. Get image URL for AI steps
      const imageUrl = isAdmin
        ? await getAdminStorageUrl({ storageId: originalStorageId })
        : await getSellerStorageUrl({ storageId: originalStorageId });

      if (!imageUrl) throw new Error('Failed to get image URL');

      // 3. Ghost mannequin (optional)
      let finalStorageId: Id<'_storage'> = originalStorageId;
      let finalImageUrl = imageUrl;

      if (item.ghostMannequin) {
        const gmResult = await generateGhostMannequin({ imageUrl });
        if (gmResult.success && gmResult.storageId && gmResult.url) {
          finalStorageId = gmResult.storageId;
          finalImageUrl = gmResult.url;
        }
      }

      // 4. Watermark (seller mode only, applied after ghost mannequin so AI never erodes it)
      if (!isAdmin && seller?.watermarkEnabled && seller?.shopName) {
        const sourceBlob = await fetch(finalImageUrl).then((r) => r.blob());
        const wmBlob = await applyWatermarkToBlob(sourceBlob, seller.shopName);
        const wmUploadUrl = await generateSellerUploadUrl({});
        const wmResponse = await fetch(wmUploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': wmBlob.type },
          body: wmBlob,
        });
        if (wmResponse.ok) {
          const { storageId: wmStorageId } = await wmResponse.json() as { storageId: Id<'_storage'> };
          finalStorageId = wmStorageId;
          // keep finalImageUrl pointing to the unwatermarked image for AI enrichment below
        }
      }

      // 5. AI enrichment
      updateItem(item.id, { status: 'enriching' });
      const enrichResult = await bulkEnrichItem({ imageUrl: finalImageUrl });

      const enrichData = enrichResult.success && enrichResult.data ? enrichResult.data : null;

      // 5. Create item
      const price = parseFloat(item.price) || 0;

      let createdItemId: Id<'items'>;

      if (isAdmin) {
        const targetSellerId = selectedSellerId ? (selectedSellerId as Id<'sellers'>) : undefined;
        const targetSellerInfo = sellerForAdmin;
        createdItemId = await createAdminItem({
          name: item.name,
          description: enrichData?.description,
          category: enrichData?.category ?? 'top',
          subcategory: enrichData?.subcategory,
          gender: enrichData?.suggestedGender ?? 'unisex',
          price,
          currency: 'KES',
          colors: enrichData?.colors ?? [],
          sizes: [],
          material: enrichData?.material,
          tags: enrichData?.tags ?? [],
          occasion: enrichData?.occasion,
          season: enrichData?.season,
          brand: enrichData?.brand,
          sourceStore: targetSellerInfo?.shopName,
          sourceUrl: targetSellerInfo?.websiteUrl,
          sellerId: targetSellerId,
        });
      } else {
        createdItemId = await createSellerProduct({
          name: item.name,
          description: enrichData?.description,
          category: enrichData?.category ?? 'top',
          subcategory: enrichData?.subcategory,
          gender: enrichData?.suggestedGender ?? 'unisex',
          price,
          currency: 'KES',
          colors: enrichData?.colors ?? [],
          sizes: [],
          material: enrichData?.material,
          tags: enrichData?.tags ?? [],
          occasion: enrichData?.occasion,
          season: enrichData?.season,
          brand: enrichData?.brand,
          sourceStore: seller?.shopName,
          sourceUrl: seller?.websiteUrl,
        });
      }

      // 6. Add image
      if (isAdmin) {
        await addAdminItemImage({
          itemId: createdItemId,
          storageId: finalStorageId,
          imageType: 'front',
          isPrimary: true,
        });
      } else {
        await addSellerItemImage({
          itemId: createdItemId,
          storageId: finalStorageId,
          imageType: 'front',
          isPrimary: true,
        });
      }

      updateItem(item.id, { status: 'done', itemId: createdItemId });
    } catch (err) {
      updateItem(item.id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleDone = async () => {
    if (items.length === 0) return;

    // Pre-flight: trim items to remaining slots so we never hit a server-side limit error
    const slots = remainingSlots();
    if (slots < items.length) {
      const trimmed = items.slice(0, slots);
      const dropped = items.length - slots;
      items.slice(slots).forEach((i) => URL.revokeObjectURL(i.previewUrl));
      setItems(trimmed);
      alert(
        `Your plan allows ${slots} more product${slots !== 1 ? 's' : ''}. ${dropped} item${dropped !== 1 ? 's were' : ' was'} removed. Upgrade your plan to upload more.`
      );
      return; // let user see the trimmed list before confirming
    }

    setStage(2);

    // Process items sequentially to avoid rate limits
    for (const item of items) {
      if (item.status !== 'queued' && item.status !== 'error') continue;
      await processItem(item);
    }

    setStage(3);
    const createdIds = items
      .filter((i) => i.status === 'done' && i.itemId)
      .map((i) => i.itemId!);
    onComplete?.(createdIds);
  };

  const retryFailed = async () => {
    const failedItems = items.filter((i) => i.status === 'error');
    if (failedItems.length === 0) return;

    // Reset failed items to queued
    setItems((prev) =>
      prev.map((i) => (i.status === 'error' ? { ...i, status: 'queued', error: undefined } : i))
    );

    setStage(2);
    for (const item of failedItems) {
      await processItem({ ...item, status: 'queued', error: undefined });
    }
    setStage(3);
  };

  const handleSaveWebsiteUrl = async () => {
    if (!websiteUrlInput.trim()) return;
    setWebsiteUrlSaving(true);
    try {
      await saveWebsiteUrl({ websiteUrl: websiteUrlInput.trim() });
      setStage(1);
    } catch {
      // error shown by convex
    } finally {
      setWebsiteUrlSaving(false);
    }
  };

  // ─── Computed values ────────────────────────────────────────────────────────

  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const processingCount = items.filter(
    (i) => i.status === 'uploading' || i.status === 'enriching'
  ).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0;

  const allDone = totalCount > 0 && doneCount + errorCount === totalCount;
  const canProceed = items.length > 0 && items.every((i) => i.price !== '' || parseFloat(i.price) >= 0);

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderDropZone = () => (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-surface/50'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Images className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="font-medium text-text-primary">
            {isDragging ? 'Drop images here' : 'Drag & drop a folder or images'}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Up to {Math.min(remainingSlots(), MAX_BATCH)} images · JPEG, PNG, WebP
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Select Images
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
          >
            <FolderOpen className="h-4 w-4 mr-1.5" />
            Select Folder
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept="image/*"
        // @ts-expect-error webkitdirectory not in standard types
        webkitdirectory=""
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );

  // ─── Stage 0: Website URL ───────────────────────────────────────────────────

  if (stage === 0 && mode === 'seller') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add your website URL</DialogTitle>
            <DialogDescription>
              We&apos;ll use this as the source URL for your products. You can update it later in Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                placeholder="https://yourshop.com"
                value={websiteUrlInput}
                onChange={(e) => setWebsiteUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveWebsiteUrl()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStage(1)}>
                Skip for now
              </Button>
              <Button onClick={handleSaveWebsiteUrl} disabled={!websiteUrlInput.trim() || websiteUrlSaving}>
                {websiteUrlSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Stage 1: Review grid ──────────────────────────────────────────────────

  if (stage === 1) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] flex flex-col"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay shown when dragging over an already-populated list */}
          {isDragging && items.length > 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Images className="h-8 w-8" />
                <p className="font-medium">Drop images to add more</p>
              </div>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bulk Upload
              {items.length > 0 && (
                <Badge variant="secondary">{items.length} image{items.length !== 1 ? 's' : ''}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {items.length === 0
                ? 'Select images to upload. AI will fill in descriptions and tags — you control the name and price.'
                : 'Set the name and price for each item. AI will fill in descriptions, tags, and other details automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
            {/* Admin seller selector */}
            {mode === 'admin' && (
              <div className="space-y-2">
                <Label>Upload for seller (optional)</Label>
                <Select
                  value={selectedSellerId || NIMA_SENTINEL}
                  onValueChange={(v) =>
                    setSelectedSellerId(v === NIMA_SENTINEL ? '' : (v as Id<'sellers'>))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a seller (or leave blank for Nima catalog)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NIMA_SENTINEL}>Nima catalog (no seller)</SelectItem>
                    {sellersData?.sellers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.shopName}{' '}
                        <span className="text-muted-foreground text-xs ml-1">({s.tier ?? 'basic'})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sellerForAdmin && (
                  <p className="text-xs text-text-secondary">
                    {sellerForAdmin.shopName} · {sellerForAdmin.activeProductCount} active products
                    {(() => {
                      const tierLimits: Record<string, number | null> = {
                        basic: 20, starter: 100, growth: 500, premium: null,
                      };
                      const limit = tierLimits[sellerForAdmin.tier ?? 'basic'];
                      if (limit === null) return ' · unlimited';
                      const rem = Math.max(0, limit - sellerForAdmin.activeProductCount);
                      return ` · ${rem} slot${rem !== 1 ? 's' : ''} remaining`;
                    })()}
                  </p>
                )}
              </div>
            )}

            {/* Drop zone (always visible when no items, or as an add-more button) */}
            {items.length === 0 ? (
              renderDropZone()
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-3 pr-1">
                  {/* Add more banner */}
                  {items.length < Math.min(remainingSlots(), MAX_BATCH) && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-border rounded-lg py-2.5 text-sm text-text-secondary hover:border-primary/50 hover:text-text-primary transition-colors"
                    >
                      + Add more images ({Math.min(remainingSlots(), MAX_BATCH) - items.length} remaining)
                    </button>
                  )}

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-lg border border-border bg-surface/30"
                    >
                      {/* Preview */}
                      <div className="relative flex-shrink-0 h-20 w-20 rounded-md overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Fields */}
                      <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 items-start">
                        <div className="space-y-1">
                          <Label className="text-xs text-text-secondary">Name</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            placeholder="Product name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-text-secondary">Price (KES)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, { price: e.target.value })}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            id={`gm-${item.id}`}
                            checked={item.ghostMannequin}
                            onCheckedChange={(v) => updateItem(item.id, { ghostMannequin: v })}
                            className="scale-90"
                          />
                          <Label htmlFor={`gm-${item.id}`} className="text-xs text-text-secondary flex items-center gap-1 cursor-pointer">
                            <Ghost className="h-3 w-3" />
                            Ghost mannequin
                          </Label>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex-shrink-0 text-text-secondary hover:text-text-primary mt-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Hidden inputs for adding more */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  // @ts-expect-error webkitdirectory not in standard types
                  webkitdirectory=""
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (() => {
            const slots = remainingSlots();
            const atPlanLimit = mode === 'seller' && !!stats && stats.productLimit !== null && slots === 0;
            const overLimit = slots > 0 && items.length > slots;
            return (
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {atPlanLimit && (
                  <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      You&apos;ve reached your plan&apos;s product limit.
                    </p>
                    <a href="/seller/billing" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Upgrade
                    </a>
                  </div>
                )}
                {overLimit && (
                  <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Only {slots} of {items.length} items will be processed — plan limit reached.
                    </p>
                    {mode === 'seller' && (
                      <a href="/seller/billing" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 ml-4 flex-shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                        Upgrade
                      </a>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-secondary">
                    {items.length} item{items.length !== 1 ? 's' : ''} ready
                    {items.some((i) => i.ghostMannequin) && (
                      <span className="ml-2 text-primary">
                        · {items.filter((i) => i.ghostMannequin).length} with ghost mannequin
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleDone} disabled={atPlanLimit}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Done — Process {Math.min(items.length, Math.max(slots, items.length))} item{items.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Stage 2: Processing ───────────────────────────────────────────────────

  if (stage === 2) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Processing {totalCount} item{totalCount !== 1 ? 's' : ''}…
            </DialogTitle>
            <DialogDescription>
              Please keep this window open. Items are being uploaded and analyzed by AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-hidden">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-text-secondary text-center">
              {doneCount} done · {errorCount} failed · {processingCount} in progress
            </p>

            <ScrollArea className="flex-1 min-h-0 max-h-80">
              <div className="space-y-2 pr-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-md"
                  >
                    <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.error && (
                        <p className="text-xs text-destructive truncate">{item.error}</p>
                      )}
                      {!item.error && item.status !== 'queued' && (
                        <p className="text-xs text-text-secondary">{statusLabel(item.status)}</p>
                      )}
                    </div>
                    <StatusIcon status={item.status} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Stage 3: Complete ─────────────────────────────────────────────────────

  const isLimitError = (error?: string) =>
    !!error && /limit|upgrade|plan/i.test(error);

  const limitErrorCount = items.filter(
    (i) => i.status === 'error' && isLimitError(i.error)
  ).length;
  const retryableCount = errorCount - limitErrorCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {errorCount === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Upload complete
          </DialogTitle>
          <DialogDescription>
            {doneCount} item{doneCount !== 1 ? 's' : ''} created successfully
            {errorCount > 0 && `, ${errorCount} failed`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {limitErrorCount > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {limitErrorCount} item{limitErrorCount !== 1 ? 's' : ''} couldn&apos;t be uploaded — you&apos;ve reached your plan&apos;s product limit.
              </p>
              {mode === 'seller' && (
                <a
                  href="/seller/billing"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade your plan to add more products
                </a>
              )}
            </div>
          )}

          {retryableCount > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">Failed items:</p>
              {items
                .filter((i) => i.status === 'error' && !isLimitError(i.error))
                .map((i) => (
                  <p key={i.id} className="text-xs text-destructive">
                    {i.name}: {i.error}
                  </p>
                ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {retryableCount > 0 && (
              <Button variant="outline" onClick={retryFailed}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry failed ({retryableCount})
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>
              {errorCount > 0 ? 'Close' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
