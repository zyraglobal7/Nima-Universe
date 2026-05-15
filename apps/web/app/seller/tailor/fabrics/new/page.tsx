'use client';

import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

const FABRIC_TYPES = ['ankara', 'kitenge', 'cotton', 'linen', 'denim', 'silk', 'lace', 'other'];
const PATTERNS = ['solid', 'floral', 'geometric', 'tribal', 'stripes', 'checks', 'abstract'];

export default function AddFabricPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.userImages.mutations.generateUploadUrl);
  const addFabric = useMutation(api.tailor.fabrics.mutations.addFabric);

  const [fabricType, setFabricType] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B4513');
  const [pattern, setPattern] = useState('');
  const [metersAvailable, setMetersAvailable] = useState('');
  const [pricePerMeterKES, setPricePerMeterKES] = useState('');
  const [restockable, setRestockable] = useState(true);
  const [uploadedStorageIds, setUploadedStorageIds] = useState<Id<'_storage'>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const ids: Id<'_storage'>[] = [];
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!res.ok) throw new Error('Upload failed');
        const { storageId } = await res.json();
        ids.push(storageId);
      }
      setUploadedStorageIds((prev) => [...prev, ...ids]);
      toast.success(`${ids.length} photo${ids.length > 1 ? 's' : ''} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!fabricType || !pattern || !metersAvailable || !pricePerMeterKES) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await addFabric({
        fabricType,
        primaryColor,
        pattern,
        metersAvailable: parseFloat(metersAvailable),
        pricePerMeterKES: parseFloat(pricePerMeterKES),
        restockable,
        photoStorageIds: uploadedStorageIds,
      });
      toast.success('Fabric added — pending QC verification');
      router.push('/seller/tailor/fabrics');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fabric');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-xl font-serif font-semibold">Add fabric</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nima QC will verify your photos before the fabric goes live.
        </p>
      </div>

      {/* Photo upload */}
      <div className="space-y-2">
        <Label>Photos</Label>
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoUpload(e.target.files)}
        />
        {uploadedStorageIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{uploadedStorageIds.length} photo{uploadedStorageIds.length > 1 ? 's' : ''} uploaded</span>
            <button
              className="text-xs text-destructive flex items-center gap-1"
              onClick={() => setUploadedStorageIds([])}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fabric type *</Label>
          <Select value={fabricType} onValueChange={setFabricType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FABRIC_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pattern *</Label>
          <Select value={pattern} onValueChange={setPattern}>
            <SelectTrigger>
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent>
              {PATTERNS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Primary color</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-12 rounded border border-border cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#8B4513"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Meters available *</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            value={metersAvailable}
            onChange={(e) => setMetersAvailable(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Price per meter (KES) *</Label>
          <Input
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={pricePerMeterKES}
            onChange={(e) => setPricePerMeterKES(e.target.value)}
          />
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
  );
}
