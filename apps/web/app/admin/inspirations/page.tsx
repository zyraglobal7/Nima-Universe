'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Upload, X, Loader2, ImageIcon, Tag,
  ToggleLeft, ToggleRight, Trash2, Sparkles, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type UploadState = { storageId: Id<'_storage'>; previewUrl: string; file: File } | null;

function UploadZone({
  upload,
  onFile,
  onClear,
  isUploading,
}: {
  upload: UploadState;
  onFile: (f: File) => void;
  onClear: () => void;
  isUploading: boolean;
}) {
  return (
    <div
      className="relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
      style={{ aspectRatio: '3/4', maxWidth: 220 }}
      onClick={() => !upload && document.getElementById('insp-file-input')?.click()}
    >
      <input
        id="insp-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {upload ? (
        <>
          <Image src={upload.previewUrl} alt="preview" fill className="object-cover" />
          <button
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1 z-10"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </>
      ) : isUploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Uploading…</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="w-10 h-10 opacity-30" />
          <span className="text-sm">Click to upload</span>
        </div>
      )}
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add tag and press Enter"
        />
        <Button type="button" variant="outline" onClick={add} size="sm"><Tag className="w-4 h-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="cursor-pointer gap-1" onClick={() => onChange(tags.filter((x) => x !== t))}>
              {t} <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminInspirationsPage() {
  const inspirations = useQuery(api.tailor.inspirations.adminQueries.list, {});
  const generateUploadUrl = useMutation(api.tailor.inspirations.adminMutations.generateUploadUrl);
  const createInspiration = useMutation(api.tailor.inspirations.adminMutations.create);
  const setActive = useMutation(api.tailor.inspirations.adminMutations.setActive);
  const removeInspiration = useMutation(api.tailor.inspirations.adminMutations.remove);
  const generateDetails = useAction(api.admin.aiActions.generateInspirationDetails);

  const [upload, setUpload] = useState<UploadState>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Image files only'); return; }
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      setUpload({ storageId, previewUrl: URL.createObjectURL(file), file });
      toast.success('Image ready');
    } catch { toast.error('Upload failed'); }
    finally { setIsUploading(false); }
  }, [generateUploadUrl]);

  const handleAIAnalyze = async () => {
    if (!upload) { toast.error('Upload an image first'); return; }
    setIsAnalyzing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(upload.file);
      });
      const res = await generateDetails({ imageUrl: dataUrl });
      if (res.success) {
        if (res.title) setTitle(res.title);
        if (res.description) setDescription(res.description);
        if (res.tags && res.tags.length > 0) setTags(res.tags);
        toast.success('AI analysis complete');
      } else {
        toast.error(res.error ?? 'AI analysis failed');
      }
    } catch { toast.error('AI analysis failed'); }
    finally { setIsAnalyzing(false); }
  };

  const handleSubmit = async () => {
    if (!upload) { toast.error('Upload an image first'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    setIsSubmitting(true);
    try {
      await createInspiration({ storageId: upload.storageId, title: title.trim(), description: description.trim() || undefined, tags });
      toast.success('Inspiration added');
      setUpload(null); setTitle(''); setDescription(''); setTags([]);
    } catch { toast.error('Failed to save'); }
    finally { setIsSubmitting(false); }
  };

  const resetForm = () => {
    setUpload(null); setTitle(''); setDescription(''); setTags([]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Inspirations</h1>
        <p className="text-muted-foreground mt-1">
          Upload style inspirations for tailors to accept. Accepted ones appear in the customer feed.
        </p>
      </div>

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Inspiration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList className="mb-6">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-powered
              </TabsTrigger>
            </TabsList>

            {/* AI tab */}
            <TabsContent value="ai" className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Upload an image and let AI suggest the title, description, and tags.
              </p>
              <UploadZone upload={upload} onFile={handleFileUpload} onClear={resetForm} isUploading={isUploading} />

              {upload && (
                <Button variant="outline" onClick={handleAIAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing…</>
                    : <><Sparkles className="w-4 h-4 mr-2" /> Analyze with AI</>}
                </Button>
              )}

              {(title || description || tags.length > 0) && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">AI suggestions — edit before saving</p>
                    <Button variant="ghost" size="sm" onClick={handleAIAnalyze} disabled={isAnalyzing || !upload}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-run
                    </Button>
                  </div>

                  <div className="space-y-1 max-w-md">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <Label>Tags</Label>
                    <TagInput tags={tags} onChange={setTags} />
                  </div>

                  <Button onClick={handleSubmit} disabled={isSubmitting || !upload || !title}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Save Inspiration
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Manual tab */}
            <TabsContent value="manual" className="space-y-5">
              <UploadZone upload={upload} onFile={handleFileUpload} onClear={resetForm} isUploading={isUploading} />

              <div className="space-y-1 max-w-md">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Floral maxi dress" />
              </div>
              <div className="space-y-1 max-w-md">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes for tailors" rows={2} />
              </div>
              <div className="space-y-1 max-w-md">
                <Label>Tags</Label>
                <TagInput tags={tags} onChange={setTags} />
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting || isUploading || !upload || !title}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Add Inspiration
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Inspirations ({inspirations?.length ?? 0})</h2>
        {inspirations === undefined ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : inspirations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inspirations yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {inspirations.map((inspo) => (
              <div key={inspo._id} className="group border rounded-xl overflow-hidden bg-card">
                <div className="relative aspect-[3/4]">
                  {inspo.imageUrl ? (
                    <Image src={inspo.imageUrl} alt={inspo.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {!inspo.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary">Inactive</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-medium text-sm leading-tight line-clamp-1">{inspo.title}</p>
                  <div className="text-xs text-muted-foreground">{inspo.acceptCount} tailor{inspo.acceptCount !== 1 ? 's' : ''}</div>
                  {inspo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inspo.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs"
                      onClick={() => setActive({ id: inspo._id, isActive: !inspo.isActive })}>
                      {inspo.isActive ? <><ToggleRight className="w-3.5 h-3.5 mr-1" />Deactivate</> : <><ToggleLeft className="w-3.5 h-3.5 mr-1" />Activate</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={async () => { if (!confirm('Delete?')) return; await removeInspiration({ id: inspo._id }); toast.success('Deleted'); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
