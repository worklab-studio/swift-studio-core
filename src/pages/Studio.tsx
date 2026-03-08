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
import { toast } from '@/hooks/use-toast';
import { Check, Package, Upload, X, Loader2, ArrowLeft, Download, Link2, Pencil, RotateCcw, Undo2, Play, Share2, RefreshCw } from 'lucide-react';

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
  { id: 'amazon', label: 'Amazon listing (2000×2000, white bg)', default: false },
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
  const [activeStep, setActiveStep] = useState(2);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([1]));
  const [stepSummaries, setStepSummaries] = useState<Record<number, string>>({});

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
        // If project already has generated assets, jump to results
        const generated = assetData?.filter((a: Asset) => a.asset_type === 'ai_generated') ?? [];
        const originals = assetData?.filter((a: Asset) => a.asset_type === 'original') ?? [];
        setAssets(originals);
        if (generated.length > 0) {
          setGeneratedShots(generated.map((a: Asset) => ({
            id: a.id,
            url: a.url,
            shotLabel: a.shot_label || 'hero',
            promptUsed: a.prompt_used || '',
            isEditing: false,
            editPrompt: '',
            isRegenerating: false,
            previousUrl: null,
            showUndo: false,
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

  const thumbnailUrl = assets[0]?.url ?? null;

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

    // Animate progress bar
    const progressInterval = setInterval(() => {
      if (generationAbortRef.current) {
        clearInterval(progressInterval);
        return;
      }
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
          projectId: project.id,
          preset: selectedPreset,
          shotCount,
          additionalContext,
          category: project.category,
          shotType: project.shot_type,
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

      // Small delay before showing results
      await new Promise(r => setTimeout(r, 600));

      const shots: GeneratedShot[] = data.assets.map((a: any) => ({
        id: a.id,
        url: a.url,
        shotLabel: a.shot_label || 'hero',
        promptUsed: a.prompt_used || '',
        isEditing: false,
        editPrompt: '',
        isRegenerating: false,
        previousUrl: null,
        showUndo: false,
      }));

      setGeneratedShots(shots);
      setSelectedExportShots(new Set(shots.map(s => s.id)));
      completeStep(4, `${shots.length} shot${shots.length > 1 ? 's' : ''}`, 5);
      setShowExportPanel(true);
    } catch (e) {
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
        url: data.asset.url,
        promptUsed: data.asset.prompt_used,
        isRegenerating: false,
        editPrompt: '',
        previousUrl,
        showUndo: true,
      });

      // Hide undo after 5 seconds
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

  /* ── Regenerate all ── */
  const handleRegenerateAll = () => {
    toast({
      title: `Regenerate all ${generatedShots.length} shots?`,
      description: `This will replace all shots and cost ${generatedShots.length} credits.`,
      action: (
        <Button size="sm" onClick={() => {
          // Delete existing generated assets and re-run generation
          handleGenerate();
        }}>
          Confirm
        </Button>
      ),
    });
  };

  /* ── Download ── */
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
    const creditCost = calculateVideoCreditCost(videoConfig.duration, videoConfig.resolution);
    
    setVideoGenerating(true);
    videoAbortRef.current = false;
    setVideoStage(VIDEO_STAGES[0]);

    // Cycle through stages
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (videoAbortRef.current) { clearInterval(stageInterval); return; }
      stageIdx = (stageIdx + 1) % VIDEO_STAGES.length;
      setVideoStage(VIDEO_STAGES[stageIdx]);
    }, 5000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          assetId: videoConfig.baseImageId,
          duration: videoConfig.duration,
          resolution: videoConfig.resolution,
          engine: videoConfig.engine,
          projectId: project.id,
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
        id: data.asset.id,
        url: data.asset.url,
        duration: videoConfig.duration,
        resolution: videoConfig.resolution,
        engine: videoConfig.engine,
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/app/projects')}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-8">
      {/* ── Left Panel ── */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 space-y-4">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => navigate('/app/projects')}>
            <ArrowLeft className="h-4 w-4" /> Projects
          </Button>

          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={project.name} className="w-full aspect-square object-cover rounded-lg" />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div>
            <p className="font-medium">{project.name}</p>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="outline" className="capitalize text-xs">{project.category}</Badge>
              <Badge variant="secondary" className="text-xs">{SHOT_LABELS[project.shot_type] ?? project.shot_type}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Step tracker OR Export panel */}
        {showExportPanel && activeStep === 5 ? (
          <ExportPanel
            shots={generatedShots}
            exportFormats={exportFormats}
            setExportFormats={setExportFormats}
            selectedShots={selectedExportShots}
            setSelectedShots={setSelectedExportShots}
            onDownload={handleDownload}
            onBackToSteps={() => setShowExportPanel(false)}
            generatedVideo={generatedVideo}
          />
        ) : (
          <div className="p-4 flex-1">
            <div className="space-y-1">
              {STEPS.map((step) => {
                const isCompleted = completedSteps.has(step.id);
                const isActive = activeStep === step.id;
                const isClickable = isCompleted || isActive;

                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={!isClickable}
                    className={`w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors ${
                      isActive ? 'bg-accent' : isClickable ? 'hover:bg-accent/50' : ''
                    } ${!isClickable ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'border-2 border-primary text-primary'
                          : 'border-2 border-border text-muted-foreground'
                    }`}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {isCompleted && stepSummaries[step.id] && (
                        <p className="text-xs text-muted-foreground truncate">{stepSummaries[step.id]}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Separator />
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Credits remaining: {profile?.credits_remaining ?? 0}</p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {activeStep === 2 && <Step2ModelSetup project={project} modelConfig={modelConfig} setModelConfig={setModelConfig} modelUploadRef={modelUploadRef} onModelUpload={handleModelUpload} onContinue={handleCompleteStep2} />}
        {activeStep === 3 && (
          <Step3StylePreset
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
            credits={credits}
            canGenerate={!!canGenerate}
            onGenerate={handleGenerate}
          />
        )}
        {activeStep === 4 && (
          <Step4Generating
            progress={generationProgress}
            stage={generationStage}
            shotCount={shotCount}
            onCancel={handleCancelGeneration}
          />
        )}
        {activeStep === 5 && (
          <Step5Results
            shots={generatedShots}
            shotCount={shotCount}
            onEditShot={handleEditShot}
            onUndoEdit={handleUndoEdit}
            onCopyLink={handleCopyLink}
            onRegenerateAll={handleRegenerateAll}
            onGenerate={handleGenerate}
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
          />
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   Step 2 — Model Setup
   ════════════════════════════════════════════════ */
function Step2ModelSetup({ project, modelConfig, setModelConfig, modelUploadRef, onModelUpload, onContinue }: {
  project: Project;
  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  modelUploadRef: React.RefObject<HTMLInputElement>;
  onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
}) {
  if (project.shot_type === 'product_showcase') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Model Setup</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure how your product will be presented.</p>
        </div>
        <Card className="bg-muted/30">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <Package className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold">Product Showcase mode</p>
              <p className="text-sm text-muted-foreground mt-1">We'll place your product in professional scenes without a model. Configure your style preferences in the next step.</p>
            </div>
            <Button className="w-full" onClick={onContinue}>Continue to Style →</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Model Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a model and fine-tune the attributes for your shoot.</p>
      </div>

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-3 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Select from our models</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {PLACEHOLDER_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelConfig(prev => ({ ...prev, selectedModel: m.id, uploadedModelUrl: null }))}
                  className={`shrink-0 w-[120px] rounded-xl overflow-hidden border transition-all ${
                    modelConfig.selectedModel === m.id ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'
                  }`}
                >
                  <div className="aspect-[3/4]" style={{ background: m.color }} />
                  <div className="p-2">
                    <p className="text-xs font-medium">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.attrs}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Or upload your own</p>
            <input ref={modelUploadRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onModelUpload} />
            {modelConfig.uploadedModelUrl ? (
              <div className="relative w-32 h-40 rounded-xl overflow-hidden border">
                <img src={modelConfig.uploadedModelUrl} alt="Custom model" className="w-full h-full object-cover" />
                <button
                  onClick={() => setModelConfig(prev => ({ ...prev, uploadedModelUrl: null }))}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => modelUploadRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload a model reference photo</p>
                <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Your model photo is used as a style reference and is not stored after generation.</p>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <Select value={modelConfig.gender} onValueChange={v => setModelConfig(prev => ({ ...prev, gender: v }))}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ethnicity</label>
            <Select value={modelConfig.ethnicity} onValueChange={v => setModelConfig(prev => ({ ...prev, ethnicity: v }))}>
              <SelectTrigger><SelectValue placeholder="Select ethnicity" /></SelectTrigger>
              <SelectContent>
                {['South Asian', 'East Asian', 'Southeast Asian', 'Black / African', 'White / Caucasian', 'Latina / Hispanic', 'Middle Eastern', 'Mixed', 'Other'].map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Body Type</label>
            <Select value={modelConfig.bodyType} onValueChange={v => setModelConfig(prev => ({ ...prev, bodyType: v }))}>
              <SelectTrigger><SelectValue placeholder="Select body type" /></SelectTrigger>
              <SelectContent>
                {['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size'].map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Shoot Background</label>
            <Select value={modelConfig.background} onValueChange={v => setModelConfig(prev => ({ ...prev, background: v }))}>
              <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">AI Engine</label>
            <ToggleGroup type="single" value={modelConfig.aiEngine} onValueChange={v => v && setModelConfig(prev => ({ ...prev, aiEngine: v }))} className="justify-start">
              <ToggleGroupItem value="gemini" className="px-4">Gemini</ToggleGroupItem>
              <ToggleGroupItem value="runway" className="px-4">Runway</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Gemini is faster. Runway produces more realistic lighting.</p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">Both engines preserve your exact product — logos, colors, and proportions.</AlertDescription>
          </Alert>
        </div>
      </div>

      <Button className="w-full" onClick={onContinue}>Continue to Style →</Button>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Step 3 — Style & Preset
   ════════════════════════════════════════════════ */
function Step3StylePreset({ selectedPreset, setSelectedPreset, referenceImage, setReferenceImage, referenceInputRef, onReferenceUpload, shotCount, setShotCount, additionalContext, setAdditionalContext, credits, canGenerate, onGenerate }: {
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
  credits: number;
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Choose a visual style</h2>
        <p className="text-sm text-muted-foreground mt-1">This sets the overall mood for all your shots.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STYLE_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => { setSelectedPreset(p.id); setReferenceImage(null); }}
            className={`rounded-2xl overflow-hidden border text-left transition-all hover:scale-[1.02] duration-150 ${
              selectedPreset === p.id ? 'ring-2 ring-offset-2 ring-primary' : ''
            }`}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          </button>
        ))}

        <input ref={referenceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onReferenceUpload} />
        {referenceImage ? (
          <button
            onClick={() => { setSelectedPreset('custom'); }}
            className={`rounded-2xl overflow-hidden border text-left transition-all hover:scale-[1.02] duration-150 relative ${
              selectedPreset === 'custom' ? 'ring-2 ring-offset-2 ring-primary' : ''
            }`}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setReferenceImage(null); if (selectedPreset === 'custom') setSelectedPreset(null); }}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="p-3">
              <p className="text-sm font-semibold">Custom Reference</p>
              <p className="text-xs text-muted-foreground">Your uploaded reference image</p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => referenceInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors min-h-[200px]"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Upload a reference image</p>
            <p className="text-xs text-muted-foreground">Show us the vibe you're going for</p>
          </button>
        )}
      </div>

      {selectedPreset && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <p className="font-medium">How many shots?</p>
            <p className="text-sm text-muted-foreground">A campaign set includes 5 varied compositions.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShotCount('campaign')}
              className={`rounded-xl border p-5 text-left transition-all ${
                shotCount === 'campaign' ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <p className="font-semibold">Campaign Set</p>
                <Badge className="text-xs">5 shots</Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hero shot</li>
                <li>• Close-up detail</li>
                <li>• Lifestyle / in-context</li>
                <li>• Alternate angle</li>
                <li>• Editorial / mood</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">5 credits</p>
            </button>

            <button
              onClick={() => setShotCount('single')}
              className={`rounded-xl border p-5 text-left transition-all ${
                shotCount === 'single' ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <p className="font-semibold">Single Shot</p>
                <Badge variant="secondary" className="text-xs">1 shot</Badge>
              </div>
              <p className="text-sm text-muted-foreground">One hero image, regenerate as needed.</p>
              <p className="text-xs text-muted-foreground mt-3">1 credit</p>
            </button>
          </div>
        </div>
      )}

      {selectedPreset && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <label className="text-sm font-medium">Any specific direction? (optional)</label>
          <Textarea
            rows={2}
            maxLength={200}
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            placeholder="e.g. I want it to feel very premium, marble background, the ring should be centered on a velvet surface..."
          />
          <p className="text-xs text-right text-muted-foreground">{additionalContext.length}/200</p>
        </div>
      )}

      {selectedPreset && (
        <Button className="w-full" size="lg" disabled={!canGenerate} onClick={onGenerate}>
          Generate — {credits} credit{credits > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Step 4 — Generating (Processing State)
   ════════════════════════════════════════════════ */
function Step4Generating({ progress, stage, shotCount, onCancel }: {
  progress: number;
  stage: string;
  shotCount: string;
  onCancel: () => void;
}) {
  const isCampaign = shotCount === 'campaign';

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto text-center space-y-4 pt-8">
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Generating your shots</h2>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{stage}</p>
      </div>

      {/* Skeleton preview grid */}
      <div className="mt-8">
        {isCampaign ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="aspect-[4/5] rounded-xl" />
              <Skeleton className="aspect-[4/5] rounded-xl" />
              <Skeleton className="aspect-[4/5] rounded-xl" />
              <Skeleton className="aspect-[4/5] rounded-xl" />
            </div>
            <Skeleton className="aspect-[16/9] rounded-xl w-full" />
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <Skeleton className="aspect-[4/5] rounded-xl" />
          </div>
        )}
      </div>

      <div className="text-center">
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel generation
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Step 5 — Results View
   ════════════════════════════════════════════════ */
function Step5Results({ shots, shotCount, onEditShot, onUndoEdit, onCopyLink, onRegenerateAll, onGenerate, updateShot }: {
  shots: GeneratedShot[];
  shotCount: string;
  onEditShot: (shot: GeneratedShot) => void;
  onUndoEdit: (shot: GeneratedShot) => void;
  onCopyLink: (url: string) => void;
  onRegenerateAll: () => void;
  onGenerate: () => void;
  updateShot: (id: string, updates: Partial<GeneratedShot>) => void;
}) {
  const isCampaign = shots.length > 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Your shots are ready</h2>
        <p className="text-sm text-muted-foreground mt-1">Click any shot to edit with a prompt, or download from the export panel.</p>
      </div>

      {isCampaign ? (
        <div className="space-y-4">
          {/* Hero shot spans full width */}
          {shots[0] && (
            <ShotCard shot={shots[0]} index={0} wide onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
          )}
          {/* Remaining shots in 2-col grid */}
          <div className="grid grid-cols-2 gap-4">
            {shots.slice(1).map((shot, i) => (
              <ShotCard key={shot.id} shot={shot} index={i + 1} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {shots[0] && (
            <ShotCard shot={shots[0]} index={0} onEdit={onEditShot} onUndo={onUndoEdit} onCopyLink={onCopyLink} updateShot={updateShot} />
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div className="space-y-3">
        {isCampaign && (
          <Button variant="outline" className="w-full" onClick={onRegenerateAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Regenerate all shots — {shots.length} credits
          </Button>
        )}

        {!isCampaign && (
          <div className="max-w-lg mx-auto space-y-3">
            <Button variant="outline" className="w-full" onClick={onGenerate}>
              Generate another variation — 1 credit
            </Button>
            <Button className="w-full" onClick={onGenerate}>
              Add 4 more shots to make a Campaign Set — 4 credits
            </Button>
          </div>
        )}
      </div>
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
    <div
      className="rounded-xl overflow-hidden border bg-card animate-in fade-in duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Image */}
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

      {/* Footer */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {SHOT_LABEL_DISPLAY[shot.shotLabel] || shot.shotLabel}
          </p>
          <div className="flex items-center gap-1">
            <a href={shot.url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </a>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopyLink(shot.url)}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => updateShot(shot.id, { isEditing: !shot.isEditing })}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit with prompt
            </Button>
          </div>
        </div>

        {/* Undo link */}
        {shot.showUndo && (
          <button
            onClick={() => onUndo(shot)}
            className="flex items-center gap-1 text-xs text-primary hover:underline animate-in fade-in duration-200"
          >
            <Undo2 className="h-3 w-3" /> Undo last edit
          </button>
        )}

        {/* Inline edit panel */}
        {shot.isEditing && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200 border-t pt-3">
            <Textarea
              rows={2}
              placeholder="Describe the change..."
              value={shot.editPrompt}
              onChange={e => updateShot(shot.id, { editPrompt: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5">
              {EDIT_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => updateShot(shot.id, { editPrompt: s })}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onEdit(shot)} disabled={!shot.editPrompt.trim()}>
                Apply — 1 credit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => updateShot(shot.id, { isEditing: false, editPrompt: '' })}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Export Panel (Left sidebar replacement)
   ════════════════════════════════════════════════ */
function ExportPanel({ shots, exportFormats, setExportFormats, selectedShots, setSelectedShots, onDownload, onBackToSteps }: {
  shots: GeneratedShot[];
  exportFormats: Set<string>;
  setExportFormats: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedShots: Set<string>;
  setSelectedShots: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDownload: () => void;
  onBackToSteps: () => void;
}) {
  const toggleFormat = (id: string) => {
    setExportFormats(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleShot = (id: string) => {
    setSelectedShots(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="p-4 flex-1 overflow-y-auto space-y-4">
      <button
        onClick={onBackToSteps}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to steps
      </button>

      <p className="font-medium">Export</p>

      <div className="space-y-2">
        {EXPORT_FORMATS.map(f => (
          <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={exportFormats.has(f.id)}
              onCheckedChange={() => toggleFormat(f.id)}
            />
            {f.label}
          </label>
        ))}
      </div>

      {shots.length > 1 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Select shots to export</p>
          <div className="grid grid-cols-3 gap-1.5">
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
                  <div className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <Button className="w-full" onClick={onDownload} disabled={selectedShots.size === 0}>
        Download selected
      </Button>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Connect Shopify in Settings →
      </p>
    </div>
  );
}

export default Studio;
