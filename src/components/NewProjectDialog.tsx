import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Upload, User, Package, Loader2, Plus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'apparel', emoji: '👗', name: 'Apparel', subtitle: 'Clothing, kurtas, activewear' },
  { id: 'jewellery', emoji: '💍', name: 'Jewellery', subtitle: 'Necklaces, rings, earrings' },
  { id: 'bags', emoji: '👜', name: 'Bags', subtitle: 'Handbags, backpacks, luggage' },
  { id: 'beauty', emoji: '✨', name: 'Beauty', subtitle: 'Makeup, fragrance, tools' },
  { id: 'skincare', emoji: '🧴', name: 'Skincare', subtitle: 'Serums, moisturisers, SPF' },
  { id: 'fmcg', emoji: '🥤', name: 'FMCG', subtitle: 'Food, beverages, snacks' },
  { id: 'footwear', emoji: '👟', name: 'Footwear', subtitle: 'Sneakers, heels, sandals' },
  { id: 'other', emoji: '📦', name: 'Other', subtitle: 'Anything else' },
] as const;

const STEPS = ['Category', 'Shot Type', 'Product'] as const;

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

const Stepper = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {STEPS.map((label, i) => {
      const stepNum = i + 1;
      const isCompleted = currentStep > stepNum;
      const isActive = currentStep === stepNum;
      return (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                isCompleted && 'bg-primary text-primary-foreground',
                isActive && 'bg-primary text-primary-foreground',
                !isCompleted && !isActive && 'border-2 border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
            </div>
            <span className={cn(
              'mt-1.5 text-xs',
              (isActive || isCompleted) ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'h-px w-16 mx-2 mb-5',
              currentStep > stepNum ? 'bg-primary' : 'bg-border'
            )} />
          )}
        </div>
      );
    })}
  </div>
);

const NewProjectDialog = () => {
  const { isOpen, closeDialog } = useNewProjectDialog();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [shotType, setShotType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
      setTimeout(() => {
        setStep(1);
        setCategory('');
        setShotType('');
        setProjectName('');
        setFiles([]);
        setIsCreating(false);
        setAnalyzing(false);
        setAnalyzed(false);
      }, 200);
    }
  };

  // Fake AI analysis
  useEffect(() => {
    if (files.length > 0 && !analyzed && !analyzing) {
      setAnalyzing(true);
      const timer = setTimeout(() => {
        setAnalyzing(false);
        setAnalyzed(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [files.length, analyzed, analyzing]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const additions: FileWithPreview[] = Array.from(newFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        id: `${f.name}-${Date.now()}-${Math.random()}`,
      }));
    if (additions.length) {
      setFiles(prev => [...prev, ...additions]);
      setAnalyzed(false);
    }
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (updated.length === 0) {
        setAnalyzed(false);
        setAnalyzing(false);
      }
      return updated;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const showModelShot = category !== 'other';

  const canContinue = () => {
    if (step === 1) return !!category;
    if (step === 2) return !!shotType;
    if (step === 3) return !!projectName.trim() && files.length > 0;
    return false;
  };

  const handleCreate = async () => {
    if (!user || !canContinue()) return;
    setIsCreating(true);
    try {
      // Create project
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({ name: projectName.trim(), category, shot_type: shotType, user_id: user.id })
        .select('id')
        .single();
      if (projError || !project) throw projError;

      // Upload files
      for (const f of files) {
        const ext = f.file.name.split('.').pop();
        const path = `${user.id}/${project.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('originals').upload(path, f.file);
        if (uploadErr) console.error('Upload error:', uploadErr);
        else {
          const { data: { publicUrl } } = supabase.storage.from('originals').getPublicUrl(path);
          await supabase.from('assets').insert({ project_id: project.id, url: publicUrl, asset_type: 'original' });
        }
      }

      closeDialog();
      navigate(`/app/projects/${project.id}`);
    } catch (err) {
      console.error('Create project error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-8 gap-0">
        <DialogTitle className="sr-only">New Project</DialogTitle>
        <Stepper currentStep={step} />

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium">What are you selling?</p>
              <p className="text-sm text-muted-foreground">We'll tune the AI specifically for your product type.</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map(c => (
                <Card
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:shadow-md',
                    category === c.id
                      ? 'border-2 border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  )}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="font-medium text-sm mt-2">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subtitle}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Shot Type */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium">What kind of shots do you need?</p>
              <p className="text-sm text-muted-foreground">You can generate both — pick your starting point.</p>
            </div>
            <div className={cn('grid gap-4', showModelShot ? 'grid-cols-2' : 'grid-cols-1')}>
              {showModelShot && (
                <Card
                  onClick={() => setShotType('model_shot')}
                  className={cn(
                    'p-6 cursor-pointer transition-all hover:shadow-md',
                    shotType === 'model_shot'
                      ? 'border-2 border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  )}
                >
                  <User className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-semibold">Model Shot</p>
                  <p className="text-sm text-muted-foreground mt-1">AI places your product on a model. Perfect for apparel, jewellery, and beauty.</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge variant="outline" className="text-xs">On-model</Badge>
                    <Badge variant="outline" className="text-xs">Lifestyle</Badge>
                    <Badge variant="outline" className="text-xs">Social</Badge>
                  </div>
                </Card>
              )}
              <Card
                onClick={() => setShotType('product_showcase')}
                className={cn(
                  'p-6 cursor-pointer transition-all hover:shadow-md',
                  shotType === 'product_showcase'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                )}
              >
                <Package className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-semibold">Product Showcase</p>
                <p className="text-sm text-muted-foreground mt-1">Studio and lifestyle scenes with no model. Perfect for catalog, Amazon, and editorial.</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="outline" className="text-xs">Catalog</Badge>
                  <Badge variant="outline" className="text-xs">Amazon</Badge>
                  <Badge variant="outline" className="text-xs">Editorial</Badge>
                </div>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">💡 Tip: Jewellery and beauty work great as product showcases. Apparel and footwear shine with models.</p>
          </div>
        )}

        {/* Step 3: Upload + Name */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-lg font-medium">Upload your product</p>

            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Summer Collection Drop 01"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>

            {files.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 cursor-pointer hover:border-muted-foreground/50 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Drop your product photo here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP, HEIC up to 20MB</p>
                <p className="text-xs text-muted-foreground">Upload multiple angles of the same product</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {files.map(f => (
                    <div key={f.id} className="relative shrink-0">
                      <img src={f.preview} alt="" className="h-16 w-16 rounded-md border object-cover" />
                      <button
                        onClick={() => removeFile(f.id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-muted-foreground/50 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing your product...
                  </div>
                )}
                {analyzed && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Detected: Product image</Badge>
                    <Badge variant="secondary" className="text-xs">Colors: Auto-detected</Badge>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={e => e.target.files && addFiles(e.target.files)}
            />

            <div className="relative flex items-center">
              <Separator className="flex-1" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={() => {}}>
              <ShoppingBag className="h-4 w-4" />
              Import from Shopify
            </Button>
            <p className="text-xs text-muted-foreground text-center">Connect Shopify in Settings →</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-6">
          {step < 3 ? (
            <Button disabled={!canContinue()} onClick={() => setStep(s => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button disabled={!canContinue() || isCreating} onClick={handleCreate}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Project
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
