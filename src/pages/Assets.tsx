import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Download, Link2, Images, Trash2, Play, Loader2, CheckSquare, X, Video, Eye, Sparkles,
} from 'lucide-react';

const assetTypes = ['All', 'Original', 'Generated', 'Video'];

const VIDEO_STAGES = [
  'Analyzing image composition…',
  'Generating motion paths…',
  'Rendering frames…',
  'Encoding video…',
  'Finalizing output…',
];

interface Asset {
  id: string;
  asset_type: string;
  url: string;
  created_at: string;
  project_id: string;
  shot_label?: string | null;
  product_label?: string | null;
}

const ENGINE_CONFIG = {
  veo: {
    ratios: ['16:9', '9:16'],
    durations: [5, 6, 8],
    resolutions: ['720p', '1080p'],
  },
  runway: {
    ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    durations: [5, 10],
    resolutions: ['720p'],
  },
};

const Assets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // View/Preview
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);

  // Video generation
  const [videoAsset, setVideoAsset] = useState<Asset | null>(null);
  const [videoEngine, setVideoEngine] = useState<'veo' | 'runway'>('veo');
  const [videoRatio, setVideoRatio] = useState('16:9');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoResolution, setVideoResolution] = useState('720p');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoStage, setVideoStage] = useState(VIDEO_STAGES[0]);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoAbortRef = useRef(false);

  // AI prompt suggestions
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [aiPromptsLoading, setAiPromptsLoading] = useState(false);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState<number | null>(null);

  const fetchAssets = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('assets')
      .select('*, projects!inner(user_id)')
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false });
    if (filter === 'Original') query = query.eq('asset_type', 'original');
    else if (filter === 'Generated') query = query.eq('asset_type', 'ai_generated');
    else if (filter === 'Video') query = query.eq('asset_type', 'video');
    const { data } = await query;
    setAssets((data as any[])?.map(({ projects, ...rest }: any) => rest) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  // ── Handlers ──

  const handleDownload = async (asset: Asset) => {
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      const ext = asset.asset_type === 'video' ? 'mp4' : 'png';
      const filename = asset.shot_label || asset.product_label || asset.id;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleDelete = async (ids: string[]) => {
    setDeleting(true);
    try {
      const toDelete = assets.filter(a => ids.includes(a.id) && a.asset_type === 'original');
      for (const asset of toDelete) {
        try {
          const pathMatch = asset.url.match(/originals\/(.+)$/);
          if (pathMatch) {
            await supabase.storage.from('originals').remove([pathMatch[1]]);
          }
        } catch { /* storage cleanup best-effort */ }
      }

      const { error } = await supabase.from('assets').delete().in('id', ids);
      if (error) throw error;

      setAssets(prev => prev.filter(a => !ids.includes(a.id)));
      setSelectedIds(new Set());
      toast({ title: `${ids.length} asset${ids.length > 1 ? 's' : ''} deleted` });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Video generation ──

  const openVideoDialog = (asset: Asset) => {
    setVideoAsset(asset);
    setVideoEngine('veo');
    setVideoRatio('16:9');
    setVideoDuration(5);
    setVideoResolution('720p');
    setVideoPrompt('');
    setAiPrompts([]);
    setSelectedPromptIdx(null);
    videoAbortRef.current = false;
  };

  const handleEngineChange = (engine: 'veo' | 'runway') => {
    const cfg = ENGINE_CONFIG[engine];
    setVideoEngine(engine);
    if (!cfg.ratios.includes(videoRatio)) setVideoRatio(cfg.ratios[0]);
    if (!cfg.durations.includes(videoDuration)) setVideoDuration(cfg.durations[0]);
    if (!cfg.resolutions.includes(videoResolution)) setVideoResolution(cfg.resolutions[0]);
  };

  const handleGenerateAiPrompts = async () => {
    if (!videoAsset) return;
    setAiPromptsLoading(true);
    setAiPrompts([]);
    setSelectedPromptIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-prompts', {
        body: {
          productName: videoAsset.product_label || 'product',
          productImageUrl: videoAsset.url,
          category: '',
        },
      });
      if (error || !data?.prompts) {
        toast({ title: 'Failed to generate prompts', variant: 'destructive' });
      } else {
        setAiPrompts(data.prompts);
      }
    } catch {
      toast({ title: 'Failed to generate prompts', variant: 'destructive' });
    } finally {
      setAiPromptsLoading(false);
    }
  };

  const selectAiPrompt = (idx: number) => {
    setSelectedPromptIdx(idx);
    setVideoPrompt(aiPrompts[idx]);
  };

  const handleGenerateVideo = async () => {
    if (!videoAsset) return;
    setVideoGenerating(true);
    setVideoProgress(0);
    videoAbortRef.current = false;

    let stageIdx = 0;
    setVideoStage(VIDEO_STAGES[0]);
    const progressInterval = setInterval(() => {
      setVideoProgress(p => Math.min(p + 2, 95));
    }, 1500);
    const stageInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % VIDEO_STAGES.length;
      setVideoStage(VIDEO_STAGES[stageIdx]);
    }, 5000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          assetId: videoAsset.id,
          duration: videoDuration,
          resolution: videoResolution,
          engine: videoEngine,
          projectId: videoAsset.project_id,
          aspectRatio: videoRatio,
          prompt: videoPrompt || null,
        },
      });
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      if (videoAbortRef.current) return;

      if (error || !data?.asset) {
        toast({ title: 'Video generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
      } else {
        setVideoProgress(100);
        toast({ title: 'Video generated successfully!' });
        fetchAssets();
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      toast({ title: 'Video generation failed', description: e?.message || 'Network error', variant: 'destructive' });
    } finally {
      setVideoGenerating(false);
      if (!videoAbortRef.current) setVideoAsset(null);
    }
  };

  // ── Selection ──

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const typeBadge = (type: string) => {
    if (type === 'original') return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Original</Badge>;
    if (type === 'ai_generated') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Generated</Badge>;
    if (type === 'video') return <Badge className="text-[10px] px-1.5 py-0">Video</Badge>;
    return null;
  };

  const cfg = ENGINE_CONFIG[videoEngine];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">Asset Library</h1>
          {!loading && <span className="text-sm text-muted-foreground">({assets.length})</span>}
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(Array.from(selectedIds))}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={exitSelectMode}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}>
              <CheckSquare className="h-4 w-4 mr-1" /> Select
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {assetTypes.map((t) => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Images className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No assets yet. Generate some from a project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="group relative">
              {selectMode && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedIds.has(a.id)}
                    onCheckedChange={() => toggleSelect(a.id)}
                  />
                </div>
              )}

              <div className={`aspect-square rounded-lg overflow-hidden bg-muted relative ${selectMode && selectedIds.has(a.id) ? 'ring-2 ring-primary' : ''}`}>
                {a.asset_type === 'video' ? (
                  <video src={a.url} className="h-full w-full object-cover" muted loop
                    onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                ) : (
                  <img src={a.url} alt={a.shot_label || ''} className="h-full w-full object-cover" loading="lazy" />
                )}

                {a.asset_type === 'video' && (
                  <div className="absolute bottom-2 left-2 pointer-events-none">
                    <div className="bg-background/80 rounded-full p-1">
                      <Video className="h-3 w-3 text-foreground" />
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                {!selectMode && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <button onClick={() => setViewAsset(a)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors" title="View">
                      <Eye className="h-4 w-4 text-foreground" />
                    </button>
                    <button onClick={() => handleDownload(a)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors" title="Download">
                      <Download className="h-4 w-4 text-foreground" />
                    </button>
                    <button onClick={() => handleCopyLink(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors" title="Copy link">
                      <Link2 className="h-4 w-4 text-foreground" />
                    </button>
                    {a.asset_type !== 'video' && (
                      <button onClick={() => openVideoDialog(a)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors" title="Generate video">
                        <Play className="h-4 w-4 text-foreground" />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(a.id)} className="rounded-full bg-destructive p-2 hover:bg-destructive/80 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive-foreground" />
                    </button>
                  </div>
                )}
              </div>

              {/* Label + badge */}
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <p className="truncate text-xs text-muted-foreground">{a.shot_label || a.product_label || a.url.split('/').pop()}</p>
                {typeBadge(a.asset_type)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View/Preview Dialog ── */}
      <Dialog open={!!viewAsset} onOpenChange={(o) => !o && setViewAsset(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-2 bg-black/95 border-border">
          <DialogHeader className="sr-only">
            <DialogTitle>Asset Preview</DialogTitle>
            <DialogDescription>Preview of the selected asset</DialogDescription>
          </DialogHeader>
          {viewAsset && (
            <div className="flex items-center justify-center w-full" style={{ maxHeight: 'calc(90vh - 2rem)' }}>
              {viewAsset.asset_type === 'video' ? (
                <video src={viewAsset.url} className="max-w-full max-h-[85vh] object-contain rounded" controls autoPlay muted />
              ) : (
                <img src={viewAsset.url} alt={viewAsset.shot_label || ''} className="max-w-full max-h-[85vh] object-contain rounded" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {Array.isArray(deleteTarget) ? `${deleteTarget.length} assets` : 'asset'}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The file will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => handleDelete(Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget!])}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Video Generation Dialog ── */}
      <Dialog open={!!videoAsset} onOpenChange={(o) => { if (!o && !videoGenerating) setVideoAsset(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Video</DialogTitle>
            <DialogDescription>Create a video from this image using AI.</DialogDescription>
          </DialogHeader>

          {videoGenerating ? (
            <div className="space-y-4 py-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                {videoAsset && <img src={videoAsset.url} alt="" className="h-full w-full object-cover opacity-50" />}
              </div>
              <Progress value={videoProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center animate-pulse">{videoStage}</p>
              <Button variant="outline" className="w-full" onClick={() => { videoAbortRef.current = true; setVideoGenerating(false); setVideoAsset(null); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {videoAsset && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={videoAsset.url} alt="" className="h-full w-full object-cover" />
                </div>
              )}

              {/* Engine */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">AI Engine</label>
                <Select value={videoEngine} onValueChange={(v) => handleEngineChange(v as 'veo' | 'runway')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo">Google Veo 3.1</SelectItem>
                    <SelectItem value="runway">Runway Gen4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Aspect Ratio</label>
                <Select value={videoRatio} onValueChange={setVideoRatio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.ratios.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duration</label>
                <Select value={String(videoDuration)} onValueChange={v => setVideoDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.durations.map(d => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resolution</label>
                <Select value={videoResolution} onValueChange={setVideoResolution}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.resolutions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Video Prompt</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAiPrompts}
                    disabled={aiPromptsLoading}
                    className="text-xs h-7"
                  >
                    {aiPromptsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    Generate AI Prompts
                  </Button>
                </div>

                {/* AI prompt suggestions */}
                {aiPrompts.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {aiPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectAiPrompt(idx)}
                        className={`w-full text-left text-xs p-2.5 rounded-md border transition-colors ${
                          selectedPromptIdx === idx
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <span className="text-muted-foreground font-medium mr-1">#{idx + 1}</span>
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {aiPrompts.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex-1 h-px bg-border" />
                    or write custom
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <Textarea
                  value={videoPrompt}
                  onChange={e => { setVideoPrompt(e.target.value); setSelectedPromptIdx(null); }}
                  placeholder="Describe the motion or animation you want…"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button onClick={handleGenerateVideo} className="w-full">
                  <Play className="h-4 w-4 mr-1" /> Generate Video
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assets;
