'use client';

import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Globe,
  Loader2,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ScrapedProduct } from '@/app/api/scrape-store/route';

type Category =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outfit'
  | 'outerwear'
  | 'shoes'
  | 'accessory'
  | 'bag'
  | 'jewelry'
  | 'swimwear';
type Gender = 'male' | 'female' | 'unisex';

interface EditableProduct extends ScrapedProduct {
  id: string;
  selected: boolean;
}

const CATEGORIES: Category[] = [
  'top',
  'bottom',
  'dress',
  'outfit',
  'outerwear',
  'shoes',
  'accessory',
  'bag',
  'jewelry',
  'swimwear',
];
const GENDERS: Gender[] = ['female', 'male', 'unisex'];

export function StoreImporter() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'importing' | 'done'>(
    'idle'
  );
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const importScrapedProducts = useAction(api.sellers.actions.importScrapedProducts);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Please enter a store URL');
      return;
    }

    setStatus('loading');
    setError(null);
    setProducts([]);
    setImportResult(null);

    try {
      const res = await fetch(`/api/scrape-store?url=${encodeURIComponent(trimmed)}`);
      let data: { products?: ScrapedProduct[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response wasn't JSON (e.g. auth redirect or server error page)
      }
      console.log('[StoreImporter] API response:', res.status, data);

      if (!res.ok) {
        console.error('[StoreImporter] Error detail:', data);
        setError(data.error || `Request failed (HTTP ${res.status}). Try again or check the URL.`);
        setStatus('idle');
        return;
      }

      const editable: EditableProduct[] = (data.products as ScrapedProduct[]).map((p, i) => ({
        ...p,
        id: `p_${i}`,
        selected: true,
      }));

      if (editable.length === 0) {
        setError('No products with images were found in this store.');
        setStatus('idle');
        return;
      }

      setProducts(editable);
      setStatus('preview');
    } catch {
      setError('Failed to connect. Check the URL and try again.');
      setStatus('idle');
    }
  };

  const handleImport = async () => {
    const selected = products.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.error('Select at least one product to import');
      return;
    }

    setStatus('importing');
    try {
      const result = await importScrapedProducts({
        products: selected.map((p) => ({
          name: p.name,
          description: p.description || undefined,
          price: p.price,
          originalPrice: p.originalPrice,
          category: p.category,
          subcategory: p.subcategory,
          gender: p.gender,
          colors: p.colors,
          sizes: p.sizes,
          tags: p.tags,
          inStock: p.inStock,
          sourceUrl: p.sourceUrl,
          sku: p.sku,
          imageUrls: p.imageUrls,
        })),
      });

      setImportResult(result);
      setStatus('done');

      if (result.created > 0) {
        toast.success(
          `${result.created} product${result.created !== 1 ? 's' : ''} imported successfully`
        );
      }
    } catch {
      toast.error('Import failed. Please try again.');
      setStatus('preview');
    }
  };

  const toggleAll = (checked: boolean) => {
    setProducts((prev) => prev.map((p) => ({ ...p, selected: checked })));
  };

  const toggleProduct = (id: string, checked: boolean) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, selected: checked } : p)));
  };

  const updateCategory = (id: string, category: Category) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, category } : p)));
  };

  const updateGender = (id: string, gender: Gender) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, gender } : p)));
  };

  const selectedCount = products.filter((p) => p.selected).length;
  const allSelected = products.length > 0 && selectedCount === products.length;

  const reset = () => {
    setStatus('idle');
    setProducts([]);
    setImportResult(null);
    setError(null);
    setUrl('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Import from Your Store
        </CardTitle>
        <CardDescription>
          Paste your Shopify store URL to preview and import your products directly into Nima.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL row */}
        <div className="flex gap-2">
          <Input
            placeholder="https://yourstore.myshopify.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && status !== 'loading' && status !== 'importing') {
                handleFetch();
              }
            }}
            disabled={status === 'loading' || status === 'importing'}
            className="flex-1"
          />
          <Button
            onClick={handleFetch}
            disabled={status === 'loading' || status === 'importing'}
            variant="outline"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching…
              </>
            ) : (
              'Preview'
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Done */}
        {status === 'done' && importResult && (
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Import complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {importResult.created} product{importResult.created !== 1 ? 's' : ''} imported
              {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ''}.
              {importResult.skipped > 0 && ' You may have reached your plan’s product limit.'}
            </p>
            {importResult.errors.length > 0 && (
              <div className="space-y-1 text-sm text-destructive">
                {importResult.errors.slice(0, 3).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {importResult.errors.length > 3 && (
                  <p>…and {importResult.errors.length - 3} more errors</p>
                )}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={reset}>
              Import from another store
            </Button>
          </div>
        )}

        {/* Preview table */}
        {(status === 'preview' || status === 'importing') && products.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(!!v)}
                  disabled={status === 'importing'}
                />
                <label htmlFor="select-all" className="cursor-pointer text-sm text-muted-foreground">
                  {selectedCount} of {products.length} selected
                </label>
              </div>
              <Badge variant="secondary">
                <Package className="mr-1 h-3 w-3" />
                {products.length} found
              </Badge>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="border-b border-border">
                      <th className="w-8 p-3" />
                      <th className="w-12 p-3" />
                      <th className="p-3 text-left font-medium text-text-secondary">Product</th>
                      <th className="p-3 text-left font-medium text-text-secondary">Price</th>
                      <th className="p-3 text-left font-medium text-text-secondary">Category</th>
                      <th className="p-3 text-left font-medium text-text-secondary">Gender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className={product.selected ? '' : 'opacity-40'}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={product.selected}
                            onCheckedChange={(v) => toggleProduct(product.id, !!v)}
                            disabled={status === 'importing'}
                          />
                        </td>
                        <td className="p-3">
                          {product.imageUrls[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrls[0]}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover bg-surface-alt"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          <p className="max-w-[200px] truncate font-medium">{product.name}</p>
                          <span
                            className={`text-xs ${product.inStock ? 'text-green-600' : 'text-muted-foreground'}`}
                          >
                            {product.inStock ? 'In stock' : 'Out of stock'}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-medium">
                            KES {product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="ml-1 text-xs text-muted-foreground line-through">
                              {product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Select
                            value={product.category}
                            onValueChange={(v) => updateCategory(product.id, v as Category)}
                            disabled={status === 'importing'}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Select
                            value={product.gender}
                            onValueChange={(v) => updateGender(product.id, v as Gender)}
                            disabled={status === 'importing'}
                          >
                            <SelectTrigger className="h-8 w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDERS.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || status === 'importing'}
              >
                {status === 'importing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Supports Shopify stores only. Images are served from your store's CDN and are not
          re-uploaded to Nima.
        </p>
      </CardContent>
    </Card>
  );
}
