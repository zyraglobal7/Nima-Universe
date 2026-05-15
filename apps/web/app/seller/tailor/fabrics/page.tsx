'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

type FabricStatus = 'active' | 'low_stock' | 'depleted' | 'retired';

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
      await updateFabric({
        fabricId,
        metersAvailable: parseFloat(meters),
        status: newStatus,
      });
      toast.success('Fabric updated');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit fabric</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label>Meters available</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FabricStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as FabricStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save changes
        </Button>
      </div>
    </SheetContent>
  );
}

export default function TailorFabricsPage() {
  const router = useRouter();
  const fabrics = useQuery(api.tailor.fabrics.queries.getMine, {});
  const [editingFabric, setEditingFabric] = useState<{
    id: Id<'fabrics'>;
    metersAvailable: number;
    status: FabricStatus;
  } | null>(null);

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
        <Button onClick={() => router.push('/seller/tailor/fabrics/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add fabric
        </Button>
      </div>

      {fabrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <Package2 className="w-12 h-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No fabrics yet. Add your first fabric to get started.</p>
          <Button onClick={() => router.push('/seller/tailor/fabrics/new')}>Add fabric</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fabrics.map((fabric) => (
            <button
              key={fabric._id}
              onClick={() => setEditingFabric({
                id: fabric._id,
                metersAvailable: fabric.metersAvailable,
                status: fabric.status,
              })}
              className="group text-left rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden"
            >
              <div className="aspect-square relative bg-muted flex items-center justify-center">
                {/* Color swatch */}
                <div
                  className="w-16 h-16 rounded-full border border-white/20 shadow"
                  style={{ backgroundColor: fabric.primaryColor }}
                />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium capitalize">{fabric.fabricType}</p>
                <p className="text-xs text-muted-foreground">{fabric.sku}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{fabric.metersAvailable}m</span>
                  <Badge variant={STATUS_VARIANT[fabric.status]} className="text-xs">
                    {STATUS_LABELS[fabric.status]}
                  </Badge>
                </div>
                <p className="text-xs font-medium">KES {fabric.pricePerMeterKES}/m</p>
              </div>
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
}
