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
import { Check, Package, User, Upload, X, Loader2, ArrowLeft } from 'lucide-react';

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

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };

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

  const referenceInputRef = useRef<HTMLInputElement>(null);
  const modelUploadRef = useRef<HTMLInputElement>(null);

  /* ── Fetch project data ── */
  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [{ data: proj }, { data: assetData }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('assets').select('*').eq('project_id', id).eq('asset_type', 'original'),
      ]);
      if (proj) setProject(proj);
      if (assetData) setAssets(assetData);
      setLoading(false);
    };
    fetch();
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

        {/* Step tracker */}
        <div className="p-4 flex-1">
          <div className="space-y-1">
            {STEPS.map((step, i) => {
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
                  {/* Circle indicator */}
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
          />
        )}
        {activeStep === 4 && <PlaceholderStep title="Generate" description="AI generation coming in Phase 4." />}
        {activeStep === 5 && <PlaceholderStep title="Export" description="Export & download coming in Phase 5." />}
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

  // Model Shot flow
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Model Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a model and fine-tune the attributes for your shoot.</p>
      </div>

      <div className="grid grid-cols-5 gap-8">
        {/* Left — Model selection (3 cols) */}
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

        {/* Right — Attributes (2 cols) */}
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
function Step3StylePreset({ selectedPreset, setSelectedPreset, referenceImage, setReferenceImage, referenceInputRef, onReferenceUpload, shotCount, setShotCount, additionalContext, setAdditionalContext, credits, canGenerate }: {
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
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>Choose a visual style</h2>
        <p className="text-sm text-muted-foreground mt-1">This sets the overall mood for all your shots.</p>
      </div>

      {/* Preset grid */}
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

        {/* Upload reference card */}
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

      {/* Shot count — shows after preset selection */}
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

      {/* Additional context */}
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

      {/* Generate button */}
      {selectedPreset && (
        <Button className="w-full" size="lg" disabled={!canGenerate}>
          Generate — {credits} credit{credits > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Placeholder Step
   ════════════════════════════════════════════════ */
function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-medium" style={{ fontFamily: "'Instrument Serif', serif" }}>{title}</h2>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Studio;
