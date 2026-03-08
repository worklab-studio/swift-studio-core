import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Check, Package, Upload, X, Loader2, ArrowLeft, Download, Link2, Pencil, RotateCcw, Undo2, Play, Share2, RefreshCw, ImageIcon, Palette, Eye, Sparkles, Camera } from 'lucide-react';

/* ── Types ── */
interface Project {
  id: string;
  name: string;
  category: string;
  shot_type: string;
  status: string;
}
interface Asset {
  id: string;
  url: string;
  asset_type: string;
  shot_label?: string | null;
  preset_used?: string | null;
  prompt_used?: string | null;
}

interface ModelConfig {
  selectedModel: string | null;
  uploadedModelUrl: string | null;
  gender: string;
  ethnicity: string;
  bodyType: string;
  background: string;
  aiEngine: string;
}

interface GeneratedShot {
  id: string;
  url: string;
  shotLabel: string;
  promptUsed: string;
  isEditing: boolean;
  editPrompt: string;
  isRegenerating: boolean;
  previousUrl: string | null;
  showUndo: boolean;
}

interface VideoConfig {
  baseImageId: string;
  duration: number;
  resolution: string;
  engine: string;
}

interface ProductInfo {
  category: string;
  colors: string[];
  material: string;
  suggestedShots: string[];
  description: string;
}

interface GeneratedVideo {
  id: string;
  url: string;
  duration: number;
  resolution: string;
  engine: string;
}

const VIDEO_STAGES = [
  'Analysing your shot...',
  'Building the scene...',
  'Rendering motion...',
  'Almost there...',
];

const calculateVideoCreditCost = (duration: number, resolution: string) => {
  const resMultiplier = resolution === '1080p' ? 2 : 1;
  return Math.ceil((duration / 2) * resMultiplier);
};

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };
const SHOT_LABEL_DISPLAY: Record<string, string> = {
  hero: 'Hero Shot',
  detail: 'Close-up Detail',
  lifestyle: 'Lifestyle',
  alternate: 'Alternate Angle',
  editorial: 'Editorial',
};

/* ── Placeholder models ── */
const PLACEHOLDER_MODELS = [
  { id: 'm1', name: 'Priya', attrs: 'F · South Asian · Slim', color: 'hsl(355 82% 56% / 0.2)' },
  { id: 'm2', name: 'Amara', attrs: 'F · Black · Athletic', color: 'hsl(30 80% 55% / 0.2)' },
  { id: 'm3', name: 'Mei', attrs: 'F · East Asian · Slim', color: 'hsl(200 60% 55% / 0.2)' },
  { id: 'm4', name: 'Sofia', attrs: 'F · Latina · Curvy', color: 'hsl(340 60% 55% / 0.2)' },
  { id: 'm5', name: 'Emma', attrs: 'F · Caucasian · Athletic', color: 'hsl(220 50% 55% / 0.2)' },
  { id: 'm6', name: 'Fatima', attrs: 'F · Middle Eastern · Slim', color: 'hsl(160 50% 55% / 0.2)' },
  { id: 'm7', name: 'Arjun', attrs: 'M · South Asian · Athletic', color: 'hsl(270 50% 55% / 0.2)' },
  { id: 'm8', name: 'James', attrs: 'M · Caucasian · Average', color: 'hsl(100 40% 55% / 0.2)' },
  { id: 'm9', name: 'Kenzo', attrs: 'M · East Asian · Slim', color: 'hsl(190 50% 55% / 0.2)' },
  { id: 'm10', name: 'Nia', attrs: 'F · Black · Plus Size', color: 'hsl(20 70% 55% / 0.2)' },
];

/* ── Style presets ── */
const STYLE_PRESETS = [
  { id: 'classic', name: 'Classic', desc: 'Clean studio, neutral tones, timeless', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' },
  { id: 'minimalist', name: 'Minimalist', desc: 'Stark white, breathing room, pure product', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80' },
  { id: 'luxury', name: 'Luxury', desc: 'Dark surfaces, gold accents, soft shadow', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80' },
  { id: 'loud-luxury', name: 'Loud Luxury', desc: 'Bold marble, dramatic lighting, opulence', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80' },
  { id: 'magazine', name: 'Magazine', desc: 'Editorial crops, sharp contrast, print-ready', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80' },
  { id: 'avant-garde', name: 'Avant Garde', desc: 'Unexpected angles, abstract props, art-forward', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80' },
  { id: 'influencer', name: 'Influencer', desc: 'Golden hour, warm tones, candid lifestyle', img: 'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&q=80' },
  { id: 'lifestyle', name: 'Lifestyle', desc: 'Everyday environments, natural light, relatable', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80' },
];

/* ── Steps ── */
const STEPS = [
  { id: 1, label: 'Product' },
  { id: 2, label: 'Model Setup' },
  { id: 3, label: 'Style & Preset' },
  { id: 4, label: 'Generate' },
  { id: 5, label: 'Export' },
];

const GENERATION_STAGES = [
  { threshold: 20, label: 'Preparing your product...' },
  { threshold: 50, label: 'Building the scene...' },
  { threshold: 80, label: 'Rendering your shots...' },
  { threshold: 100, label: 'Finishing up...' },
];

const EXPORT_FORMATS = [
  { id: 'original', label: 'Original resolution (PNG)', default: true },
  { id: 'web', label: 'Web optimized (JPG, 80%)', default: true },
  { id: 'amazon', label: 'Amazon listing (2000×2000)', default: false },
  { id: 'shopify', label: 'Shopify product image', default: false },
  { id: 'ig-square', label: 'Instagram 1:1', default: false },
  { id: 'ig-portrait', label: 'Instagram 4:5', default: false },
  { id: 'ig-story', label: 'Instagram 16:9', default: false },
];

const EDIT_SUGGESTIONS = [
  'make the background darker',
  'add more shadow under the product',
  'change to outdoor setting',
  'warmer lighting',
];

const Studio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepSummaries, setStepSummaries] = useState<Record<number, string>>({});

  // Product images (Step 1)
  const [productImages, setProductImages] = useState<string[]>([]);
  const productUploadRef = useRef<HTMLInputElement>(null);

  // Model config
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    selectedModel: null,
    uploadedModelUrl: null,
    gender: '',
    ethnicity: '',
    bodyType: '',
    background: '',
    aiEngine: 'gemini',
  });

  // Style config
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState<string>('campaign');
  const [additionalContext, setAdditionalContext] = useState('');

  // Generation state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generatedShots, setGeneratedShots] = useState<GeneratedShot[]>([]);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFormats, setExportFormats] = useState<Set<string>>(new Set(EXPORT_FORMATS.filter(f => f.default).map(f => f.id)));
  const [selectedExportShots, setSelectedExportShots] = useState<Set<string>>(new Set());
  const generationAbortRef = useRef(false);

  // Video state
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({ baseImageId: '', duration: 4, resolution: '720p', engine: 'veo' });
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoStage, setVideoStage] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const videoAbortRef = useRef(false);

  // AI Product Recognition
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [analyzingProduct, setAnalyzingProduct] = useState(false);

  const referenceInputRef = useRef<HTMLInputElement>(null);
  const modelUploadRef = useRef<HTMLInputElement>(null);

  /* ── Fetch project data ── */
  useEffect(() => {
    if (!user || !id) return;
    const fetchData = async () => {
      const [{ data: proj }, { data: assetData }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('assets').select('*').eq('project_id', id),
      ]);
      if (proj) {
        setProject(proj);
        const generated = assetData?.filter((a: Asset) => a.asset_type === 'ai_generated') ?? [];
        const originals = assetData?.filter((a: Asset) => a.asset_type === 'original') ?? [];
        setAssets(originals);
        if (generated.length > 0) {
          setGeneratedShots(generated.map((a: Asset) => ({
            id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
            isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
          })));
          setCompletedSteps(new Set([1, 2, 3, 4]));
          setActiveStep(5);
          setShowExportPanel(true);
          setSelectedExportShots(new Set(generated.map((a: Asset) => a.id)));
        }
      }
      if (assetData) {
        const originals = assetData.filter((a: Asset) => a.asset_type === 'original');
        if (originals.length > 0) setAssets(originals);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, id]);

  const thumbnailUrl = productImages[0] ?? assets[0]?.url ?? null;

  /* ── AI Product Analysis ── */
  const analyzeProduct = useCallback(async (imageUrl: string) => {
    setAnalyzingProduct(true);
    try {
      // Convert blob URL to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke('analyze-product', {
        body: { image: base64 },
      });

      if (error || !data) {
        console.error('Product analysis failed:', error);
        setAnalyzingProduct(false);
        return;
      }
      setProductInfo(data);
    } catch (e) {
      console.error('Product analysis error:', e);
    }
    setAnalyzingProduct(false);
  }, []);

  /* ── Step 1 handlers ── */
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUrls = Array.from(files).map(f => URL.createObjectURL(f));
    setProductImages(prev => {
      const updated = [...prev, ...newUrls];
      // Trigger analysis when first image is added
      if (prev.length === 0 && updated.length > 0) {
        analyzeProduct(updated[0]);
      }
      return updated;
    });
    e.target.value = '';
  };

  const handleRemoveProductImage = (index: number) => {
    setProductImages(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      // Re-analyze if hero image changed
      if (index === 0 && next.length > 0) {
        analyzeProduct(next[0]);
      } else if (next.length === 0) {
        setProductInfo(null);
      }
      return next;
    });
  };

  const handleCompleteStep1 = () => {
    if (productImages.length === 0) return;
    completeStep(1, `${productImages.length} image${productImages.length > 1 ? 's' : ''}`, 2);
  };

  /* ── Step navigation ── */
  const goToStep = (step: number) => {
    if (completedSteps.has(step) || step === activeStep) setActiveStep(step);
  };

  const completeStep = useCallback((step: number, summary: string, next: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setStepSummaries(prev => ({ ...prev, [step]: summary }));
    setActiveStep(next);
  }, []);

  const handleCompleteStep2 = () => {
    if (project?.shot_type === 'product_showcase') {
      completeStep(2, 'Product Showcase', 3);
    } else {
      const parts = [modelConfig.aiEngine === 'gemini' ? 'Gemini' : 'Runway'];
      if (modelConfig.gender) parts.push(modelConfig.gender);
      if (modelConfig.ethnicity) parts.push(modelConfig.ethnicity);
      completeStep(2, parts.join(' · '), 3);
    }
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelConfig(prev => ({ ...prev, uploadedModelUrl: url, selectedModel: null }));
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setReferenceImage(url);
      setSelectedPreset('custom');
    }
  };

  /* ── Generation ── */
  const handleGenerate = async () => {
    if (!project || !selectedPreset) return;
    const presetName = STYLE_PRESETS.find(p => p.id === selectedPreset)?.name || selectedPreset;
    completeStep(3, presetName, 4);
    generationAbortRef.current = false;
    setGenerationProgress(0);
    setGenerationStage(GENERATION_STAGES[0].label);

    const progressInterval = setInterval(() => {
      if (generationAbortRef.current) { clearInterval(progressInterval); return; }
      setGenerationProgress(prev => {
        const next = Math.min(prev + 2, 90);
        const stage = GENERATION_STAGES.find(s => next <= s.threshold);
        if (stage) setGenerationStage(stage.label);
        return next;
      });
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('generate-shots', {
        body: {
          projectId: project.id, preset: selectedPreset, shotCount, additionalContext,
          category: project.category, shotType: project.shot_type,
          modelConfig: project.shot_type === 'model_shot' ? modelConfig : null,
        },
      });
      clearInterval(progressInterval);
      if (generationAbortRef.current) return;
      if (error || !data?.assets) {
        toast({ title: 'Generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setActiveStep(3);
        setCompletedSteps(prev => { const n = new Set(prev); n.delete(3); return n; });
        return;
      }
      setGenerationProgress(100);
      setGenerationStage('Done!');
      await new Promise(r => setTimeout(r, 600));

      const shots: GeneratedShot[] = data.assets.map((a: any) => ({
        id: a.id, url: a.url, shotLabel: a.shot_label || 'hero', promptUsed: a.prompt_used || '',
        isEditing: false, editPrompt: '', isRegenerating: false, previousUrl: null, showUndo: false,
      }));
      setGeneratedShots(shots);
      setSelectedExportShots(new Set(shots.map(s => s.id)));
      completeStep(4, `${shots.length} shot${shots.length > 1 ? 's' : ''}`, 5);
      setShowExportPanel(true);
    } catch {
      clearInterval(progressInterval);
      toast({ title: 'Generation failed', description: 'Network error', variant: 'destructive' });
      setActiveStep(3);
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current = true;
    setActiveStep(3);
    setCompletedSteps(prev => { const n = new Set(prev); n.delete(3); return n; });
  };

  /* ── Per-shot editing ── */
  const updateShot = (shotId: string, updates: Partial<GeneratedShot>) => {
    setGeneratedShots(prev => prev.map(s => s.id === shotId ? { ...s, ...updates } : s));
  };

  const handleEditShot = async (shot: GeneratedShot) => {
    if (!shot.editPrompt.trim()) return;
    const previousUrl = shot.url;
    updateShot(shot.id, { isRegenerating: true, isEditing: false });
    try {
      const { data, error } = await supabase.functions.invoke('edit-shot', {
        body: { assetId: shot.id, editPrompt: shot.editPrompt },
      });
      if (error || !data?.asset) {
        toast({ title: 'Edit failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        updateShot(shot.id, { isRegenerating: false, isEditing: true });
        return;
      }
      updateShot(shot.id, {
        url: data.asset.url, promptUsed: data.asset.prompt_used, isRegenerating: false,
        editPrompt: '', previousUrl, showUndo: true,
      });
      setTimeout(() => updateShot(shot.id, { showUndo: false, previousUrl: null }), 5000);
    } catch {
      updateShot(shot.id, { isRegenerating: false, isEditing: true });
      toast({ title: 'Edit failed', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleUndoEdit = async (shot: GeneratedShot) => {
    if (!shot.previousUrl) return;
    await supabase.from('assets').update({ url: shot.previousUrl }).eq('id', shot.id);
    updateShot(shot.id, { url: shot.previousUrl, previousUrl: null, showUndo: false });
  };

  const handleRegenerateAll = () => {
    toast({
      title: `Regenerate all ${generatedShots.length} shots?`,
      description: `This will replace all shots and cost ${generatedShots.length} credits.`,
      action: <Button size="sm" onClick={() => handleGenerate()}>Confirm</Button>,
    });
  };

  const handleDownload = () => {
    const selected = generatedShots.filter(s => selectedExportShots.has(s.id));
    selected.forEach(shot => {
      const link = document.createElement('a');
      link.href = shot.url;
      link.download = `${project?.name || 'shot'}-${shot.shotLabel}.jpg`;
      link.target = '_blank';
      link.click();
    });
    toast({ title: `Downloading ${selected.length} shot${selected.length > 1 ? 's' : ''}` });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
  };

  /* ── Video generation ── */
  const handleGenerateVideo = async () => {
    if (!project || !videoConfig.baseImageId) return;
    setVideoGenerating(true);
    videoAbortRef.current = false;
    setVideoStage(VIDEO_STAGES[0]);
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (videoAbortRef.current) { clearInterval(stageInterval); return; }
      stageIdx = (stageIdx + 1) % VIDEO_STAGES.length;
      setVideoStage(VIDEO_STAGES[stageIdx]);
    }, 5000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          assetId: videoConfig.baseImageId, duration: videoConfig.duration,
          resolution: videoConfig.resolution, engine: videoConfig.engine, projectId: project.id,
        },
      });
      clearInterval(stageInterval);
      if (videoAbortRef.current) return;
      if (error || !data?.asset) {
        toast({ title: 'Video generation failed', description: data?.error || error?.message || 'Unknown error', variant: 'destructive' });
        setVideoGenerating(false);
        return;
      }
      setGeneratedVideo({
        id: data.asset.id, url: data.asset.url, duration: videoConfig.duration,
        resolution: videoConfig.resolution, engine: videoConfig.engine,
      });
      setVideoGenerating(false);
    } catch {
      clearInterval(stageInterval);
      setVideoGenerating(false);
      toast({ title: 'Video generation failed', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleCancelVideo = () => {
    videoAbortRef.current = true;
    setVideoGenerating(false);
  };

  const credits = shotCount === 'campaign' ? 5 : 1;
  const canGenerate = (selectedPreset || referenceImage) && shotCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/app/projects')}>Back to Projects</Button>
      </div>
    );
  }

  // Resolve selected model for viewport preview
  const selectedModelData = PLACEHOLDER_MODELS.find(m => m.id === modelConfig.selectedModel);
  const selectedPresetData = STYLE_PRESETS.find(p => p.id === selectedPreset);

  return (
    <div className="flex h-screen">
      {/* ════════════════════════════════════════════
          LEFT PANEL — Config
         ════════════════════════════════════════════ */}
      <div className="w-[340px] shrink-0 border-r border-border bg-card flex flex-col h-screen overflow-hidden">
        {/* ── Fixed Header ── */}
        <div className="p-4 pb-3 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => navigate('/app/projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="font-medium text-sm truncate flex-1">{project.name}</p>
          </div>

          {/* Horizontal step indicator */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = activeStep === step.id;
                const isClickable = isCompleted || isActive;
                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={!isClickable}
                    className="flex-1 group"
                  >
                    <div className={`h-1.5 rounded-full transition-all ${
                      isCompleted
                        ? 'bg-primary'
                        : isActive
                          ? 'bg-primary/60'
                          : 'bg-border'
                    } ${isClickable ? 'cursor-pointer group-hover:opacity-80' : 'cursor-default'}`} />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">
                {STEPS.find(s => s.id === activeStep)?.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Step {activeStep} of {STEPS.length}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Scrollable active-step content ── */}
        <ScrollArea className="flex-1">
          <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {activeStep === 1 && (
              <Step1Config
                productImages={productImages}
                productUploadRef={productUploadRef}
                onUpload={handleProductImageUpload}
                onRemove={handleRemoveProductImage}
              />
            )}
            {activeStep === 2 && (
              <Step2Config
                project={project}
                modelConfig={modelConfig}
                setModelConfig={setModelConfig}
                modelUploadRef={modelUploadRef}
                onModelUpload={handleModelUpload}
              />
            )}
            {activeStep === 3 && (
              <Step3Config
                selectedPreset={selectedPreset}
                setSelectedPreset={setSelectedPreset}
                referenceImage={referenceImage}
                setReferenceImage={setReferenceImage}
                referenceInputRef={referenceInputRef}
                onReferenceUpload={handleReferenceUpload}
                shotCount={shotCount}
                setShotCount={setShotCount}
                additionalContext={additionalContext}
                setAdditionalContext={setAdditionalContext}
              />
            )}
            {activeStep === 4 && (
              <div className="space-y-4 py-8">
                <div className="flex flex-col items-center text-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">{generationStage || 'Processing...'}</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                  </div>
                  <Progress value={generationProgress} className="h-1.5 w-full max-w-[200px]" />
                </div>
              </div>
            )}
            {activeStep === 5 && (
              <Step5Config
                shots={generatedShots}
                exportFormats={exportFormats}
                setExportFormats={setExportFormats}
                selectedShots={selectedExportShots}
                setSelectedShots={setSelectedExportShots}
                generatedVideo={generatedVideo}
                onRegenerateAll={handleRegenerateAll}
              />
            )}
          </div>
        </ScrollArea>

        {/* ── Fixed Footer CTA ── */}
        <div className="shrink-0 border-t border-border p-4 space-y-2 bg-card">
          {activeStep === 1 && (
            <Button className="w-full" disabled={productImages.length === 0} onClick={handleCompleteStep1}>
              Continue
            </Button>
          )}
          {activeStep === 2 && (
            <Button className="w-full" onClick={handleCompleteStep2}>
              Continue to Style
            </Button>
          )}
          {activeStep === 3 && (
            <Button className="w-full" disabled={!canGenerate} onClick={handleGenerate}>
              Generate — {credits} credit{credits > 1 ? 's' : ''}
            </Button>
          )}
          {activeStep === 4 && (
            <Button variant="outline" className="w-full" onClick={handleCancelGeneration}>
              Cancel
            </Button>
          )}
          {activeStep === 5 && (
            <Button className="w-full" onClick={handleDownload} disabled={selectedExportShots.size === 0}>
              <Download className="h-4 w-4 mr-2" /> Download {selectedExportShots.size} shot{selectedExportShots.size !== 1 ? 's' : ''}
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            {profile?.credits_remaining ?? 0} credits remaining
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Viewport
         ════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-muted/30 h-screen">
        <div className="p-8 min-h-full">
          {activeStep === 1 && (
            <Step1Viewport productImages={productImages} productInfo={productInfo} analyzingProduct={analyzingProduct} />
          )}
          {activeStep === 2 && (
            <Step2Viewport
              project={project}
              modelConfig={modelConfig}
              selectedModelData={selectedModelData}
            />
          )}
          {activeStep === 3 && (
            <Step3Viewport
              selectedPreset={selectedPreset}
              selectedPresetData={selectedPresetData}
              referenceImage={referenceImage}
            />
          )}
          {activeStep === 4 && (
            <Step4Viewport
              progress={generationProgress}
              stage={generationStage}
              shotCount={shotCount}
            />
          )}
          {activeStep === 5 && (
            <Step5Viewport
              shots={generatedShots}
              shotCount={shotCount}
              onEditShot={handleEditShot}
              onUndoEdit={handleUndoEdit}
              onCopyLink={handleCopyLink}
              updateShot={updateShot}
              videoExpanded={videoExpanded}
              setVideoExpanded={setVideoExpanded}
              videoConfig={videoConfig}
              setVideoConfig={setVideoConfig}
              videoGenerating={videoGenerating}
              videoStage={videoStage}
              generatedVideo={generatedVideo}
              onGenerateVideo={handleGenerateVideo}
              onCancelVideo={handleCancelVideo}
              setGeneratedVideo={setGeneratedVideo}
              creditsRemaining={profile?.credits_remaining ?? 0}
              onGenerate={handleGenerate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   LEFT PANEL CONFIG COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Step 1 Config (Left) ── */
function Step1Config({ productImages, productUploadRef, onUpload, onRemove }: {
  productImages: string[];
  productUploadRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) {
  const TOTAL_SLOTS = 7;
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => productImages[i] ?? null);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Product Images</p>
        <p className="text-xs text-muted-foreground mt-1">Add your product photos to get started.</p>
      </div>

      <input ref={productUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />

      <button
        onClick={() => productUploadRef.current?.click()}
        className="w-full h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-accent/30 transition-colors"
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Click to upload · Multiple files</p>
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Upload different angles and shots for better results
      </p>

      {/* Hero slot — first image */}
      <div
        onClick={() => !slots[0] && productUploadRef.current?.click()}
        className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
          slots[0] ? 'border-border' : 'border-dashed border-border hover:border-primary/40 cursor-pointer'
        }`}
      >
        {slots[0] ? (
          <>
            <img src={slots[0]} alt="Main product" className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(0); }}
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
              style={{ opacity: 1 }}
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/70 to-transparent px-2 py-1.5">
              <p className="text-[10px] font-medium text-foreground">Main Shot</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <Camera className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground/60">Main product shot</p>
          </div>
        )}
      </div>

      {/* Grid — slots 2-7 */}
      <div className="grid grid-cols-3 gap-1.5">
        {slots.slice(1).map((url, i) => {
          const slotIndex = i + 1;
          return (
            <div
              key={slotIndex}
              onClick={() => !url && productUploadRef.current?.click()}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                url ? 'border-border' : 'border-dashed border-border hover:border-primary/40 cursor-pointer'
              }`}
            >
              {url ? (
                <>
                  <img src={url} alt={`Angle ${slotIndex + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(slotIndex); }}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 2 Config (Left) ── */
function Step2Config({ project, modelConfig, setModelConfig, modelUploadRef, onModelUpload }: {
  project: Project;
  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  modelUploadRef: React.RefObject<HTMLInputElement>;
  onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (project.shot_type === 'product_showcase') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4 flex items-center gap-3">
          <Package className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">Product Showcase — no model needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Select model</p>
      <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
        {PLACEHOLDER_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModelConfig(prev => ({ ...prev, selectedModel: m.id, uploadedModelUrl: null }))}
            className={`rounded-lg overflow-hidden border transition-all text-left ${
              modelConfig.selectedModel === m.id ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
            }`}
          >
            <div className="aspect-[3/2]" style={{ background: m.color }} />
            <div className="p-1.5">
              <p className="text-[11px] font-medium">{m.name}</p>
              <p className="text-[9px] text-muted-foreground">{m.attrs}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Upload */}
      <input ref={modelUploadRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onModelUpload} />
      {modelConfig.uploadedModelUrl ? (
        <div className="relative w-20 h-24 rounded-lg overflow-hidden border">
          <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full h-full object-cover" />
          <button onClick={() => setModelConfig(prev => ({ ...prev, uploadedModelUrl: null }))} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 flex items-center justify-center">
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <button onClick={() => modelUploadRef.current?.click()} className="w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Upload custom model</p>
        </button>
      )}

      <Separator />

      {/* Attributes */}
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Gender</label>
          <Select value={modelConfig.gender} onValueChange={v => setModelConfig(prev => ({ ...prev, gender: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Ethnicity</label>
          <Select value={modelConfig.ethnicity} onValueChange={v => setModelConfig(prev => ({ ...prev, ethnicity: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['South Asian', 'East Asian', 'Southeast Asian', 'Black / African', 'White / Caucasian', 'Latina / Hispanic', 'Middle Eastern', 'Mixed', 'Other'].map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Body Type</label>
          <Select value={modelConfig.bodyType} onValueChange={v => setModelConfig(prev => ({ ...prev, bodyType: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'].map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Background</label>
          <Select value={modelConfig.background} onValueChange={v => setModelConfig(prev => ({ ...prev, background: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Lifestyle</SelectLabel>
                <SelectItem value="café">Café</SelectItem>
                <SelectItem value="street">Street</SelectItem>
                <SelectItem value="garden">Garden</SelectItem>
                <SelectItem value="beach">Beach</SelectItem>
                <SelectItem value="urban">Urban rooftop</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Studio</SelectLabel>
                <SelectItem value="white-sweep">White sweep</SelectItem>
                <SelectItem value="gray-seamless">Gray seamless</SelectItem>
                <SelectItem value="dark-studio">Dark studio</SelectItem>
                <SelectItem value="colored-gel">Colored gel</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* AI Engine */}
      <div className="space-y-1">
        <label className="text-xs font-medium">AI Engine</label>
        <ToggleGroup type="single" value={modelConfig.aiEngine} onValueChange={v => v && setModelConfig(prev => ({ ...prev, aiEngine: v }))} className="justify-start">
          <ToggleGroupItem value="gemini" className="px-3 h-7 text-xs">Gemini</ToggleGroupItem>
          <ToggleGroupItem value="runway" className="px-3 h-7 text-xs">Runway</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-[10px] text-muted-foreground">Gemini is faster. Runway has better lighting.</p>
      </div>
    </div>
  );
}

/* ── Step 3 Config (Left) ── */
function Step3Config({ selectedPreset, setSelectedPreset, referenceImage, setReferenceImage, referenceInputRef, onReferenceUpload, shotCount, setShotCount, additionalContext, setAdditionalContext }: {
  selectedPreset: string | null;
  setSelectedPreset: (v: string | null) => void;
  referenceImage: string | null;
  setReferenceImage: (v: string | null) => void;
  referenceInputRef: React.RefObject<HTMLInputElement>;
  onReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shotCount: string;
  setShotCount: (v: string) => void;
  additionalContext: string;
  setAdditionalContext: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Style preset</p>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => { setSelectedPreset(p.id); setReferenceImage(null); }}
            className={`rounded-lg overflow-hidden border text-left transition-all ${
              selectedPreset === p.id ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
            }`}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-1.5">
              <p className="text-[11px] font-semibold">{p.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Reference upload */}
      <input ref={referenceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onReferenceUpload} />
      {referenceImage ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={referenceImage} alt="Reference" className="w-full aspect-[4/3] object-cover" />
          <button
            onClick={() => { setReferenceImage(null); if (selectedPreset === 'custom') setSelectedPreset(null); }}
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="p-1.5">
            <p className="text-[11px] font-semibold">Custom Reference</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => referenceInputRef.current?.click()}
          className="w-full h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Upload reference image</p>
        </button>
      )}

      {selectedPreset && (
        <>
          <Separator />
          {/* Shot count */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Shots</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShotCount('campaign')}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  shotCount === 'campaign' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                }`}
              >
                <p className="text-xs font-semibold">Campaign Set</p>
                <p className="text-[10px] text-muted-foreground">5 shots · 5 credits</p>
              </button>
              <button
                onClick={() => setShotCount('single')}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  shotCount === 'single' ? 'ring-2 ring-primary ring-offset-1' : 'hover:border-primary/50'
                }`}
              >
                <p className="text-xs font-semibold">Single Shot</p>
                <p className="text-[10px] text-muted-foreground">1 shot · 1 credit</p>
              </button>
            </div>
          </div>

          {/* Context */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Direction (optional)</label>
            <Textarea
              rows={2}
              maxLength={200}
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="e.g. premium feel, marble bg..."
              className="text-xs min-h-[60px]"
            />
            <p className="text-[10px] text-right text-muted-foreground">{additionalContext.length}/200</p>
          </div>

        </>
      )}
    </div>
  );
}

/* ── Step 5 Config (Left — Export Panel) ── */
function Step5Config({ shots, exportFormats, setExportFormats, selectedShots, setSelectedShots, generatedVideo, onRegenerateAll }: {
  shots: GeneratedShot[];
  exportFormats: Set<string>;
  setExportFormats: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedShots: Set<string>;
  setSelectedShots: React.Dispatch<React.SetStateAction<Set<string>>>;
  generatedVideo: GeneratedVideo | null;
  onRegenerateAll: () => void;
}) {
  const toggleFormat = (id: string) => {
    setExportFormats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleShot = (id: string) => {
    setSelectedShots(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Export formats</p>
      <div className="space-y-1.5">
        {EXPORT_FORMATS.map(f => (
          <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={exportFormats.has(f.id)} onCheckedChange={() => toggleFormat(f.id)} />
            {f.label}
          </label>
        ))}
      </div>

      {shots.length > 1 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Select shots</p>
          <div className="grid grid-cols-3 gap-1">
            {shots.map(shot => (
              <button
                key={shot.id}
                onClick={() => toggleShot(shot.id)}
                className={`relative rounded-md overflow-hidden aspect-square ${
                  selectedShots.has(shot.id) ? 'ring-2 ring-primary' : 'opacity-50'
                }`}
              >
                <img src={shot.url} alt={shot.shotLabel} className="w-full h-full object-cover" />
                {selectedShots.has(shot.id) && (
                  <div className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2 w-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}


      {shots.length > 1 && (
        <Button variant="outline" className="w-full" size="sm" onClick={onRegenerateAll}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Regenerate all
        </Button>
      )}

      {generatedVideo && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Product video</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{generatedVideo.duration}s</Badge>
          </div>
          <a href={generatedVideo.url} download target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <Download className="h-3 w-3" /> Download MP4
            </Button>
          </a>
        </>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   RIGHT PANEL VIEWPORT COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Step 1 Viewport ── */
function Step1Viewport({ productImages, productInfo, analyzingProduct }: { 
  productImages: string[]; 
  productInfo: ProductInfo | null;
  analyzingProduct: boolean;
}) {
  if (productImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Upload product images</p>
          <p className="text-sm text-muted-foreground mt-1">Add photos from different angles to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto space-y-8">
      {/* Hero image */}
      <div>
        <img src={productImages[0]} alt="Product main" className="w-full rounded-2xl shadow-lg object-cover aspect-[4/3]" />
      </div>

      {/* AI Product Recognition */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">AI Product Recognition</p>
          {analyzingProduct && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>

        {analyzingProduct && !productInfo && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {productInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category</p>
                <p className="text-sm font-medium text-foreground">{productInfo.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Material</p>
                <p className="text-sm font-medium text-foreground">{productInfo.material}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Detected Colors</p>
              <div className="flex flex-wrap gap-1.5">
                {productInfo.colors.map((color, i) => (
                  <Badge key={i} variant="secondary" className="text-[11px]">
                    {color}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Suggested Shots</p>
              <div className="flex flex-wrap gap-1.5">
                {productInfo.suggestedShots.map((shot, i) => (
                  <Badge key={i} variant="outline" className="text-[11px]">
                    <Camera className="h-3 w-3 mr-1" />
                    {shot}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{productInfo.description}</p>
            </div>
          </div>
        )}

        {!analyzingProduct && !productInfo && (
          <p className="text-xs text-muted-foreground">Analysis could not be completed. Try uploading a clearer image.</p>
        )}
      </div>

      {/* Additional angles */}
      {productImages.length > 1 && (
        <div className="flex gap-3 justify-center flex-wrap">
          {productImages.slice(1).map((url, i) => (
            <img key={i} src={url} alt={`Angle ${i + 2}`} className="h-28 w-28 rounded-xl object-cover border shadow-sm" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Step 2 Viewport ── */
function Step2Viewport({ project, modelConfig, selectedModelData }: {
  project: Project;
  modelConfig: ModelConfig;
  selectedModelData: typeof PLACEHOLDER_MODELS[0] | undefined;
}) {
  if (project.shot_type === 'product_showcase') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
        <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Product Showcase</p>
          <p className="text-sm text-muted-foreground mt-1">Your product will be placed in professional scenes.</p>
        </div>
      </div>
    );
  }

  // Show uploaded model
  if (modelConfig.uploadedModelUrl) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-md w-full">
          <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full rounded-2xl shadow-lg object-cover aspect-[3/4]" />
          <p className="text-sm text-muted-foreground text-center mt-4">Custom uploaded model</p>
        </div>
      </div>
    );
  }

  // Show selected model
  if (selectedModelData) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-sm w-full">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg" style={{ background: selectedModelData.color }}>
            <div className="h-full flex flex-col items-center justify-end p-6">
              <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 w-full text-center">
                <p className="font-semibold text-lg">{selectedModelData.name}</p>
                <p className="text-sm text-muted-foreground">{selectedModelData.attrs}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Select a model</p>
        <p className="text-sm text-muted-foreground mt-1">Choose from our library or upload your own to preview here.</p>
      </div>
    </div>
  );
}

/* ── Step 3 Viewport ── */
function Step3Viewport({ selectedPreset, selectedPresetData, referenceImage }: {
  selectedPreset: string | null;
  selectedPresetData: typeof STYLE_PRESETS[0] | undefined;
  referenceImage: string | null;
}) {
  // Show reference image
  if (selectedPreset === 'custom' && referenceImage) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-lg w-full">
          <img src={referenceImage} alt="Custom reference" className="w-full rounded-2xl shadow-lg object-cover" />
          <p className="text-center mt-4 font-medium">Custom Reference</p>
          <p className="text-sm text-muted-foreground text-center mt-1">Your uploaded style reference</p>
        </div>
      </div>
    );
  }

  // Show selected preset
  if (selectedPresetData) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="max-w-lg w-full">
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <img src={selectedPresetData.img} alt={selectedPresetData.name} className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white font-semibold text-xl">{selectedPresetData.name}</p>
              <p className="text-white/80 text-sm mt-1">{selectedPresetData.desc}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <Palette className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Choose a style</p>
        <p className="text-sm text-muted-foreground mt-1">Select a preset to preview the visual direction.</p>
      </div>
    </div>
  );
}

/* ── Step 4 Viewport (Generating) ── */
function Step4Viewport({ progress, stage, shotCount }: {
  progress: number;
  stage: string;
  shotCount: string;
}) {
  const isCampaign = shotCount === 'campaign';

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <p className="font-medium text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>Creating your shots</p>
          <p className="text-sm text-muted-foreground mt-1">{stage}</p>
        </div>

        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">{progress}%</p>
      </div>

      {/* Skeleton preview */}
      <div className="w-full max-w-2xl mt-4">
        {isCampaign ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="aspect-[4/5] rounded-xl" />
          </div>
        ) : (
          <div className="max-w-xs mx-auto">
            <Skeleton className="aspect-[4/5] rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 5 Viewport (Results) ── */
function Step5Viewport({ shots, shotCount, onEditShot, onUndoEdit, onCopyLink, updateShot, videoExpanded, setVideoExpanded, videoConfig, setVideoConfig, videoGenerating, videoStage, generatedVideo, onGenerateVideo, onCancelVideo, setGeneratedVideo, creditsRemaining, onGenerate }: {
  shots: GeneratedShot[];
  shotCount: string;
  onEditShot: (shot: GeneratedShot) => void;
  onUndoEdit: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
  videoExpanded: boolean;
  setVideoExpanded: (v: boolean) => void;
  videoConfig: VideoConfig;
  setVideoConfig: React.Dispatch<React.SetStateAction<VideoConfig>>;
  videoGenerating: boolean;
  videoStage: string;
  generatedVideo: GeneratedVideo | null;
  onGenerateVideo: () => void;
  onCancelVideo: () => void;
  setGeneratedVideo: React.Dispatch<React.SetStateAction<GeneratedVideo | null>>;
  creditsRemaining: number;
  onGenerate: () => void;
}) {
  const isCampaign = shots.length > 1;
  const videoCreditCost = calculateVideoCreditCost(videoConfig.duration, videoConfig.resolution);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Your shots are ready</h2>
        <p className="text-sm text-muted-foreground mt-1">Click any shot to edit with a prompt. Use the export panel on the left to download.</p>
      </div>

      {/* Shot grid */}
      {isCampaign ? (
        <div className="space-y-4">
          {shots[0] && <ShotCard shot={shots[0]} index={0} wide onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />}
          <div className="grid grid-cols-2 gap-4">
            {shots.slice(1).map((shot, i) => (
              <ShotCard key={shot.id} shot={shot} index={i + 1} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-lg">
          {shots[0] && <ShotCard shot={shots[0]} index={0} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />}
        </div>
      )}

      {/* Single shot actions */}
      {!isCampaign && (
        <div className="max-w-lg space-y-3">
          <Button variant="outline" className="w-full" onClick={onGenerate}>
            Generate another variation — 1 credit
          </Button>
          <Button className="w-full" onClick={onGenerate}>
            Add 4 more for a Campaign Set — 4 credits
          </Button>
        </div>
      )}

      {/* ── Video CTA Card ── */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-0">
          {!videoExpanded && !videoGenerating && !generatedVideo && (
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Turn your shots into a product video</p>
                <p className="text-sm text-muted-foreground">Cinematic 4–8 second clips. Perfect for Reels, TikTok, and ads.</p>
              </div>
              <Button variant="outline" onClick={() => { setVideoExpanded(true); if (!videoConfig.baseImageId && shots.length > 0) setVideoConfig(prev => ({ ...prev, baseImageId: shots[0].id })); }}>
                Create Video
              </Button>
            </div>
          )}

          {videoExpanded && !videoGenerating && !generatedVideo && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="font-medium">Create a product video</p>
                <Button variant="ghost" size="sm" onClick={() => setVideoExpanded(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Which shot should we animate?</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {shots.map(shot => (
                    <button
                      key={shot.id}
                      onClick={() => setVideoConfig(prev => ({ ...prev, baseImageId: shot.id }))}
                      className={`shrink-0 w-20 h-[100px] rounded-lg overflow-hidden border transition-all ${
                        videoConfig.baseImageId === shot.id ? 'ring-2 ring-accent ring-offset-2' : 'hover:border-accent/50'
                      }`}
                    >
                      <img src={shot.url} alt={shot.shotLabel} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <ToggleGroup type="single" value={String(videoConfig.duration)} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, duration: Number(v) }))} className="justify-start">
                    <ToggleGroupItem value="4" className="px-3">4s</ToggleGroupItem>
                    <ToggleGroupItem value="6" className="px-3">6s</ToggleGroupItem>
                    <ToggleGroupItem value="8" className="px-3">8s</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution</label>
                  <ToggleGroup type="single" value={videoConfig.resolution} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, resolution: v }))} className="justify-start">
                    <ToggleGroupItem value="720p" className="px-3">720p</ToggleGroupItem>
                    <ToggleGroupItem value="1080p" className="px-3">1080p</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Engine</label>
                  <ToggleGroup type="single" value={videoConfig.engine} onValueChange={v => v && setVideoConfig(prev => ({ ...prev, engine: v }))} className="justify-start">
                    <ToggleGroupItem value="veo" className="px-3">Veo 3.1</ToggleGroupItem>
                    <ToggleGroupItem value="runway" className="px-3">Runway 4.5</ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">Veo: cinematic quality. Runway: faster.</p>
                </div>
              </div>
              <Button className="w-full" onClick={onGenerateVideo} disabled={!videoConfig.baseImageId}>
                Generate video — {videoCreditCost} credits
              </Button>
            </div>
          )}

          {videoGenerating && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground text-center">{videoStage}</p>
              <div className="text-center">
                <button onClick={onCancelVideo} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {generatedVideo && !videoGenerating && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <video src={generatedVideo.url} controls autoPlay muted loop className="w-full aspect-video rounded-xl bg-muted" />
              <div className="flex items-center gap-2">
                <a href={generatedVideo.url} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download MP4</Button>
                </a>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(generatedVideo.url); toast({ title: 'Link copied' }); }}>
                  <Share2 className="h-3.5 w-3.5" /> Share link
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setGeneratedVideo(null); setVideoExpanded(true); }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used {calculateVideoCreditCost(generatedVideo.duration, generatedVideo.resolution)} credits · {creditsRemaining} remaining
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════
   ShotCard Component
   ════════════════════════════════════════════════ */
function ShotCard({ shot, index, wide, onEdit, onUndo, onCopyLink, updateShot }: {
  shot: GeneratedShot;
  index: number;
  wide?: boolean;
  onEdit: (shot: GeneratedShot) => void;
  onUndo: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card animate-in fade-in duration-300" style={{ animationDelay: `${index * 100}ms` }}>
      <div className={`relative ${wide ? 'aspect-[16/9]' : 'aspect-[4/5]'} overflow-hidden bg-muted`}>
        <img
          src={shot.url}
          alt={SHOT_LABEL_DISPLAY[shot.shotLabel] || shot.shotLabel}
          className={`w-full h-full object-cover transition-opacity duration-300 ${shot.isRegenerating ? 'opacity-40' : 'opacity-100'}`}
        />
        {shot.isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {SHOT_LABEL_DISPLAY[shot.shotLabel] || shot.shotLabel}
          </p>
          <div className="flex items-center gap-1">
            <a href={shot.url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
            </a>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopyLink(shot.url)}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => updateShot(shot.id, { isEditing: !shot.isEditing })}>
              <Pencil className="h-3.5 w-3.5" /> Edit with prompt
            </Button>
          </div>
        </div>
        {shot.showUndo && (
          <button onClick={() => onUndo(shot)} className="flex items-center gap-1 text-xs text-primary hover:underline animate-in fade-in duration-200">
            <Undo2 className="h-3 w-3" /> Undo last edit
          </button>
        )}
        {shot.isEditing && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200 border-t pt-3">
            <Textarea rows={2} placeholder="Describe the change..." value={shot.editPrompt} onChange={e => updateShot(shot.id, { editPrompt: e.target.value })} />
            <div className="flex flex-wrap gap-1.5">
              {EDIT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => updateShot(shot.id, { editPrompt: s })} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onEdit(shot)} disabled={!shot.editPrompt.trim()}>Apply — 1 credit</Button>
              <Button variant="ghost" size="sm" onClick={() => updateShot(shot.id, { isEditing: false, editPrompt: '' })}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Studio;
