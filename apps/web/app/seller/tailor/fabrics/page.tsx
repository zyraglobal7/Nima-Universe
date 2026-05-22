'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2, Plus, Package2, X, Upload, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Image from 'next/image';
import type { Id } from '@/convex/_generated/dataModel';

type FabricStatus = 'active' | 'low_stock' | 'depleted' | 'retired';

const FABRIC_TYPES = ['ankara', 'kitenge', 'cotton', 'linen', 'denim', 'silk', 'lace', 'other'];
const PATTERNS = ['solid', 'floral', 'geometric', 'tribal', 'stripes', 'checks', 'abstract'];

const STATUS_LABELS: Record<FabricStatus, string> = {
  active: 'Active', low_stock: 'Low stock', depleted: 'Depleted', retired: 'Retired',
};
const STATUS_VARIANT: Record<FabricStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default', low_stock: 'secondary', depleted: 'destructive', retired: 'outline',
};

function EditFabricSheet({
  fabricId,
  metersAvailable,
  status,
  onClose,
}: {
  fabricId: Id<'fabrics'>;
  metersAvailable: number;
  status: FabricStatus;
  onClose: () => void;
}) {
  const updateFabric = useMutation(api.tailor.fabrics.mutations.updateFabric);
  const [meters, setMeters] = useState(String(metersAvailable));
  const [newStatus, setNewStatus] = useState<FabricStatus>(status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFabric({ fabricId, metersAvailable: parseFloat(meters), status: newStatus });
      toast.success('Fabric updated');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally { setSaving(false); }
  }

  return (
    <SheetContent>
      <SheetHeader><SheetTitle>Edit fabric</SheetTitle></SheetHeader>
      <div className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label>Meters available</Label>
          <Input type="number" min={0} step={0.5} value={meters} onChange={(e) => setMeters(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FabricStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as FabricStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save changes
        </Button>
      </div>
    </SheetContent>
  );
}

interface PhotoPreview { file: File; previewUrl: string; storageId?: Id<'_storage'> }

function AddFabricModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.tailor.fabrics.mutations.generateUploadUrl);
  const addFabric = useMutation(api.tailor.fabrics.mutations.addFabric);
  const analyzeFabric = useAction(api.admin.aiActions.analyzeFabricImage);

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [fabricType, setFabricType] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B4513');
  const [pattern, setPattern] = useState('');
  const [metersAvailable, setMetersAvailable] = useState('');
  const [pricePerMeterKES, setPricePerMeterKES] = useState('');
  const [restockable, setRestockable] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setPhotos([]); setFabricType(''); setPrimaryColor('#8B4513');
    setPattern(''); setMetersAvailable(''); setPricePerMeterKES(''); setRestockable(true);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newPhotos: PhotoPreview[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) throw new Error('Upload failed');
        const { storageId } = await res.json();
        newPhotos.push({ file, previewUrl: URL.createObjectURL(file), storageId });
      }
      setPhotos((p) => [...p, ...newPhotos]);
      toast.success(`${newPhotos.length} photo${newPhotos.length !== 1 ? 's' : ''} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally { setUploading(false); }
  }, [generateUploadUrl]);

  const handleAIAnalyze = async () => {
    if (photos.length === 0) { toast.error('Upload a photo first'); return; }
    setAnalyzing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(photos[0].file);
      });
      const res = await analyzeFabric({ imageUrl: dataUrl });
      if (res.success) {
        if (res.fabricType && FABRIC_TYPES.includes(res.fabricType)) setFabricType(res.fabricType);
        if (res.pattern && PATTERNS.includes(res.pattern)) setPattern(res.pattern);
        if (res.primaryColor) setPrimaryColor(res.primaryColor);
        toast.success('AI analysis complete');
      } else {
        toast.error(res.error ?? 'AI analysis failed');
      }
    } catch { toast.error('AI analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const handleSubmit = async () => {
    if (!fabricType || !pattern || !metersAvailable || !pricePerMeterKES) {
      toast.error('Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const ids = photos.filter((p) => p.storageId).map((p) => p.storageId!);
      await addFabric({ fabricType, primaryColor, pattern, metersAvailable: parseFloat(metersAvailable), pricePerMeterKES: parseFloat(pricePerMeterKES), restockable, photoStorageIds: ids });
      toast.success('Fabric added — pending QC verification');
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fabric');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Add fabric</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          {/* Photo upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              {photos.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAIAnalyze} disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {analyzing ? 'Analyzing…' : 'AI fill fields'}
                </Button>
              )}
            </div>

            {/* Photo previews */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-20 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <Image src={p.previewUrl} alt={`fabric-${i}`} fill className="object-cover" />
                    <button
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                      onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  className="w-20 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors text-xs gap-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
            )}

            {photos.length === 0 && (
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload fabric photos</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG — multiple allowed</p>
                  </>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />

            {photos.length > 0 && uploading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
              </p>
            )}

            {photos.length > 0 && !uploading && fabricType === '' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Tap <strong>AI fill fields</strong> above to auto-fill fabric type, pattern &amp; color.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabric type *</Label>
              <Select value={fabricType} onValueChange={setFabricType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {FABRIC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pattern *</Label>
              <Select value={pattern} onValueChange={setPattern}>
                <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
                <SelectContent>
                  {PATTERNS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primary color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 rounded border border-border cursor-pointer" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meters available *</Label>
              <Input type="number" min={0} step={0.5} placeholder="0" value={metersAvailable}
                onChange={(e) => setMetersAvailable(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Price/meter (KES) *</Label>
              <Input type="number" min={0} step={50} placeholder="0" value={pricePerMeterKES}
                onChange={(e) => setPricePerMeterKES(e.target.value)} />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <Label>Restockable</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={restockable} onCheckedChange={setRestockable} />
                <span className="text-sm text-muted-foreground">{restockable ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add fabric
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TailorFabricsPage() {
  const fabrics = useQuery(api.tailor.fabrics.queries.getMine, {});
  const [editingFabric, setEditingFabric] = useState<{ id: Id<'fabrics'>; metersAvailable: number; status: FabricStatus } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (fabrics === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Fabric stock</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your available fabrics.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add fabric
        </Button>
      </div>

      {fabrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <Package2 className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No fabrics yet. Add your first fabric.</p>
          <Button onClick={() => setAddOpen(true)}>Add fabric</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fabrics.map((fabric) => (
            <button
              key={fabric._id}
              onClick={() => setEditingFabric({ id: fabric._id, metersAvailable: fabric.metersAvailable, status: fabric.status })}
              className="group text-left rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden"
            >
              <div className="aspect-square relative bg-muted overflow-hidden">
                {fabric.photoUrls.length > 0 ? (
                  <Image
                    src={fabric.photoUrls[0]}
                    alt={fabric.fabricType}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border border-white/20 shadow" style={{ backgroundColor: fabric.primaryColor }} />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium capitalize">{fabric.fabricType}</p>
                <p className="text-xs text-muted-foreground capitalize">{fabric.pattern}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{fabric.metersAvailable}m</span>
                  <Badge variant={STATUS_VARIANT[fabric.status]} className="text-xs">{STATUS_LABELS[fabric.status]}</Badge>
                </div>
                <p className="text-xs font-medium">KES {fabric.pricePerMeterKES}/m</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      <Sheet open={!!editingFabric} onOpenChange={(open) => { if (!open) setEditingFabric(null); }}>
        {editingFabric && (
          <EditFabricSheet
            fabricId={editingFabric.id}
            metersAvailable={editingFabric.metersAvailable}
            status={editingFabric.status}
            onClose={() => setEditingFabric(null)}
          />
        )}
      </Sheet>

      {/* Add fabric modal */}
      <AddFabricModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
