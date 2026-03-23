import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Upload, Loader2, Trash2, Users, Search, Filter } from 'lucide-react';
import heic2any from 'heic2any';

/* ── Built-in model data (same 40 as Studio) ── */
const BUILT_IN_MODELS = [
  { id: 'm1', name: 'Priya', gender: 'female', ethnicity: 'South Asian', bodyType: 'slim', skinTone: 'warm brown', ageRange: '24-28', facialFeatures: 'high cheekbones, almond eyes, full lips' },
  { id: 'm2', name: 'Amara', gender: 'female', ethnicity: 'Black African', bodyType: 'athletic', skinTone: 'deep brown', ageRange: '22-26', facialFeatures: 'strong jawline, wide-set eyes, defined brows' },
  { id: 'm3', name: 'Mei', gender: 'female', ethnicity: 'East Asian', bodyType: 'slim', skinTone: 'fair porcelain', ageRange: '23-27', facialFeatures: 'delicate features, monolid eyes, soft cheekbones' },
  { id: 'm4', name: 'Sofia', gender: 'female', ethnicity: 'Latina', bodyType: 'curvy', skinTone: 'olive tan', ageRange: '25-29', facialFeatures: 'expressive eyes, full lips, rounded face' },
  { id: 'm5', name: 'Emma', gender: 'female', ethnicity: 'Caucasian', bodyType: 'athletic', skinTone: 'fair with freckles', ageRange: '24-28', facialFeatures: 'angular jaw, blue-green eyes, defined cheekbones' },
  { id: 'm6', name: 'Fatima', gender: 'female', ethnicity: 'Middle Eastern', bodyType: 'slim', skinTone: 'warm olive', ageRange: '23-27', facialFeatures: 'arched brows, large dark eyes, straight nose' },
  { id: 'm7', name: 'Arjun', gender: 'male', ethnicity: 'South Asian', bodyType: 'athletic', skinTone: 'medium brown', ageRange: '26-30', facialFeatures: 'strong brow, defined jaw, dark intense eyes' },
  { id: 'm8', name: 'James', gender: 'male', ethnicity: 'Caucasian', bodyType: 'average', skinTone: 'light with warm undertones', ageRange: '28-32', facialFeatures: 'square jaw, light stubble, hazel eyes' },
  { id: 'm9', name: 'Kenzo', gender: 'male', ethnicity: 'East Asian Japanese', bodyType: 'slim', skinTone: 'light warm', ageRange: '24-28', facialFeatures: 'sharp features, narrow face, defined cheekbones' },
  { id: 'm10', name: 'Nia', gender: 'female', ethnicity: 'Black', bodyType: 'plus size', skinTone: 'rich dark brown', ageRange: '26-30', facialFeatures: 'round face, warm smile, full cheeks, bright eyes' },
  { id: 'm11', name: 'Aisha', gender: 'female', ethnicity: 'Middle Eastern', bodyType: 'athletic', skinTone: 'golden olive', ageRange: '25-29', facialFeatures: 'strong brows, angular face, piercing dark eyes' },
  { id: 'm12', name: 'Liam', gender: 'male', ethnicity: 'Caucasian', bodyType: 'slim', skinTone: 'pale fair', ageRange: '22-26', facialFeatures: 'sharp cheekbones, green eyes, clean-shaven' },
  { id: 'm13', name: 'Yuki', gender: 'female', ethnicity: 'East Asian Japanese', bodyType: 'average', skinTone: 'light porcelain', ageRange: '24-28', facialFeatures: 'oval face, gentle features, soft brows' },
  { id: 'm14', name: 'Carlos', gender: 'male', ethnicity: 'Latino', bodyType: 'athletic', skinTone: 'medium tan', ageRange: '27-31', facialFeatures: 'strong jaw, dark thick brows, warm brown eyes' },
  { id: 'm15', name: 'Zara', gender: 'female', ethnicity: 'Mixed race', bodyType: 'slim', skinTone: 'caramel', ageRange: '22-26', facialFeatures: 'unique mixed features, light hazel eyes, curly hair' },
  { id: 'm16', name: 'Dev', gender: 'male', ethnicity: 'South Asian', bodyType: 'average', skinTone: 'warm brown', ageRange: '25-29', facialFeatures: 'gentle eyes, trimmed beard, friendly expression' },
  { id: 'm17', name: 'Keiko', gender: 'female', ethnicity: 'East Asian', bodyType: 'curvy', skinTone: 'warm beige', ageRange: '26-30', facialFeatures: 'round face, bright eyes, dimpled cheeks' },
  { id: 'm18', name: 'Marcus', gender: 'male', ethnicity: 'Black', bodyType: 'athletic muscular', skinTone: 'dark brown', ageRange: '25-29', facialFeatures: 'strong jaw, trimmed beard, intense gaze' },
  { id: 'm19', name: 'Anya', gender: 'female', ethnicity: 'Caucasian Slavic', bodyType: 'slim', skinTone: 'fair cool', ageRange: '23-27', facialFeatures: 'high cheekbones, icy blue eyes, sharp features' },
  { id: 'm20', name: 'Omar', gender: 'male', ethnicity: 'Middle Eastern', bodyType: 'average', skinTone: 'warm olive', ageRange: '28-32', facialFeatures: 'dark eyes, well-groomed stubble, strong nose' },
  { id: 'm21', name: 'Luna', gender: 'female', ethnicity: 'Latina', bodyType: 'slim', skinTone: 'warm honey', ageRange: '22-26', facialFeatures: 'wide eyes, soft jawline, subtle dimples' },
  { id: 'm22', name: 'Ravi', gender: 'male', ethnicity: 'South Asian', bodyType: 'slim', skinTone: 'light brown', ageRange: '23-27', facialFeatures: 'lean face, expressive dark eyes, clean-shaven' },
  { id: 'm23', name: 'Hana', gender: 'female', ethnicity: 'Southeast Asian Filipino', bodyType: 'average', skinTone: 'warm golden', ageRange: '24-28', facialFeatures: 'wide-set eyes, button nose, warm smile' },
  { id: 'm24', name: 'Ethan', gender: 'male', ethnicity: 'Caucasian', bodyType: 'athletic', skinTone: 'light tan', ageRange: '26-30', facialFeatures: 'defined jaw, brown eyes, short styled hair' },
  { id: 'm25', name: 'Jasmine', gender: 'female', ethnicity: 'Mixed Black-Asian', bodyType: 'athletic', skinTone: 'medium warm', ageRange: '23-27', facialFeatures: 'striking eyes, sculpted brows, full lips' },
  { id: 'm26', name: 'Kofi', gender: 'male', ethnicity: 'Black West African', bodyType: 'slim', skinTone: 'deep ebony', ageRange: '24-28', facialFeatures: 'angular face, high cheekbones, bright smile' },
  { id: 'm27', name: 'Nina', gender: 'female', ethnicity: 'Caucasian', bodyType: 'plus size', skinTone: 'fair pink', ageRange: '27-31', facialFeatures: 'soft rounded features, blue eyes, warm expression' },
  { id: 'm28', name: 'Takeshi', gender: 'male', ethnicity: 'East Asian Japanese', bodyType: 'athletic', skinTone: 'light warm', ageRange: '26-30', facialFeatures: 'sharp jawline, narrow eyes, defined brows' },
  { id: 'm29', name: 'Isla', gender: 'female', ethnicity: 'Mixed Caucasian-Latina', bodyType: 'curvy', skinTone: 'light olive', ageRange: '25-29', facialFeatures: 'green eyes, wavy hair, rounded cheekbones' },
  { id: 'm30', name: 'Hassan', gender: 'male', ethnicity: 'Middle Eastern', bodyType: 'slim', skinTone: 'olive', ageRange: '24-28', facialFeatures: 'dark deep eyes, angular nose, light beard' },
  { id: 'm31', name: 'Valentina', gender: 'female', ethnicity: 'Latina Brazilian', bodyType: 'athletic', skinTone: 'golden tan', ageRange: '24-28', facialFeatures: 'bright eyes, sculpted face, radiant smile' },
  { id: 'm32', name: 'Jin', gender: 'male', ethnicity: 'East Asian Korean', bodyType: 'average', skinTone: 'fair light', ageRange: '23-27', facialFeatures: 'soft features, straight brows, gentle expression' },
  { id: 'm33', name: 'Adaeze', gender: 'female', ethnicity: 'Black Nigerian', bodyType: 'slim', skinTone: 'deep warm brown', ageRange: '22-26', facialFeatures: 'symmetrical face, high forehead, graceful neck' },
  { id: 'm34', name: 'Noah', gender: 'male', ethnicity: 'Caucasian', bodyType: 'plus size', skinTone: 'fair with warm undertones', ageRange: '29-33', facialFeatures: 'friendly round face, light beard, blue eyes' },
  { id: 'm35', name: 'Suki', gender: 'female', ethnicity: 'Southeast Asian Thai', bodyType: 'slim', skinTone: 'warm golden', ageRange: '22-26', facialFeatures: 'delicate features, almond eyes, soft lips' },
  { id: 'm36', name: 'Mateo', gender: 'male', ethnicity: 'Latino', bodyType: 'slim', skinTone: 'light olive', ageRange: '23-27', facialFeatures: 'lean face, warm brown eyes, tousled hair' },
  { id: 'm37', name: 'Leila', gender: 'female', ethnicity: 'Middle Eastern Persian', bodyType: 'curvy', skinTone: 'warm olive', ageRange: '25-29', facialFeatures: 'large dark eyes, arched brows, full lips' },
  { id: 'm38', name: 'Daniel', gender: 'male', ethnicity: 'Mixed Black-Caucasian', bodyType: 'athletic', skinTone: 'medium caramel', ageRange: '25-29', facialFeatures: 'strong features, curly hair, warm hazel eyes' },
  { id: 'm39', name: 'Chioma', gender: 'female', ethnicity: 'Black Nigerian', bodyType: 'athletic', skinTone: 'dark brown', ageRange: '23-27', facialFeatures: 'sculpted face, bright smile, defined cheekbones' },
  { id: 'm40', name: 'Raj', gender: 'male', ethnicity: 'South Asian', bodyType: 'curvy stocky', skinTone: 'medium brown', ageRange: '28-32', facialFeatures: 'round friendly face, thick brows, warm eyes' },
];

type BuiltInModel = typeof BUILT_IN_MODELS[0];

interface CustomModel {
  id: string;
  user_id: string;
  name: string;
  gender: string;
  ethnicity: string;
  body_type: string;
  skin_tone: string;
  age_range: string;
  facial_features: string;
  portrait_url: string | null;
  reference_images: string[];
  created_at: string;
}

const GENDER_OPTIONS = ['all', 'female', 'male'];
const ETHNICITY_OPTIONS = ['all', 'South Asian', 'Black', 'East Asian', 'Caucasian', 'Latina', 'Middle Eastern', 'Mixed', 'Southeast Asian'];
const BODY_TYPE_OPTIONS = ['all', 'slim', 'athletic', 'average', 'curvy', 'plus size'];

const Models = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('library');
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [loadingPortraits, setLoadingPortraits] = useState(true);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ethnicityFilter, setEthnicityFilter] = useState('all');
  const [bodyTypeFilter, setBodyTypeFilter] = useState('all');

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '', gender: 'female', ethnicity: '', bodyType: 'average',
    skinTone: '', ageRange: '', facialFeatures: '',
  });
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load portraits
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('model_portraits').select('model_key, image_url');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(r => { map[r.model_key] = r.image_url; });
        setPortraits(map);
      }
      setLoadingPortraits(false);
    };
    load();
  }, []);

  // Load custom models
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('custom_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setCustomModels(data as unknown as CustomModel[]);
      setLoadingCustom(false);
    };
    load();
  }, [user]);

  // Filter built-in models
  const filteredBuiltIn = BUILT_IN_MODELS.filter(m => {
    if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
    if (ethnicityFilter !== 'all' && !m.ethnicity.toLowerCase().includes(ethnicityFilter.toLowerCase())) return false;
    if (bodyTypeFilter !== 'all' && !m.bodyType.toLowerCase().includes(bodyTypeFilter.toLowerCase())) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Handle reference file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const processedFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      let processedFile = file;
      if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        try {
          const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob;
          processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        } catch { /* skip */ }
      }
      processedFiles.push(processedFile);
      previews.push(URL.createObjectURL(processedFile));
    }

    setRefFiles(prev => [...prev, ...processedFiles]);
    setRefPreviews(prev => [...prev, ...previews]);
  };

  const removeRefFile = (idx: number) => {
    URL.revokeObjectURL(refPreviews[idx]);
    setRefFiles(prev => prev.filter((_, i) => i !== idx));
    setRefPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Create custom model
  const handleCreate = async () => {
    if (!user || !newModel.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    if (refFiles.length === 0) {
      toast({ title: 'Upload at least one reference photo', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      // 1. Upload reference images
      const imageUrls: string[] = [];
      for (const file of refFiles) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `models/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('originals').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('originals').getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      // 2. Generate portrait
      let portraitUrl: string | null = null;
      try {
        const { data: portraitData, error: portraitErr } = await supabase.functions.invoke('generate-model-portraits', {
          body: {
            model: {
              id: crypto.randomUUID(),
              name: newModel.name,
              gender: newModel.gender,
              ethnicity: newModel.ethnicity,
              bodyType: newModel.bodyType,
              skinTone: newModel.skinTone,
              ageRange: newModel.ageRange,
              facialFeatures: newModel.facialFeatures,
            },
          },
        });
        if (!portraitErr && portraitData?.imageUrl) {
          portraitUrl = portraitData.imageUrl;
        }
      } catch {
        // Portrait generation is optional, continue without it
      }

      // 3. Save to database
      const { error: insertErr } = await supabase.from('custom_models').insert({
        user_id: user.id,
        name: newModel.name,
        gender: newModel.gender,
        ethnicity: newModel.ethnicity,
        body_type: newModel.bodyType,
        skin_tone: newModel.skinTone,
        age_range: newModel.ageRange,
        facial_features: newModel.facialFeatures,
        portrait_url: portraitUrl,
        reference_images: imageUrls,
      } as any);

      if (insertErr) throw insertErr;

      // 4. Refresh list
      const { data: refreshed } = await supabase
        .from('custom_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (refreshed) setCustomModels(refreshed as unknown as CustomModel[]);

      // Reset
      setShowCreate(false);
      setNewModel({ name: '', gender: 'female', ethnicity: '', bodyType: 'average', skinTone: '', ageRange: '', facialFeatures: '' });
      refPreviews.forEach(p => URL.revokeObjectURL(p));
      setRefFiles([]);
      setRefPreviews([]);
      toast({ title: 'Model created', description: `${newModel.name} has been added to your models.` });
    } catch (err: any) {
      toast({ title: 'Failed to create model', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Delete custom model
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('custom_models').delete().eq('id', deleteTarget);
      if (error) throw error;
      setCustomModels(prev => prev.filter(m => m.id !== deleteTarget));
      toast({ title: 'Model deleted' });
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">Browse the AI model library or create your own custom models.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="mt-2 sm:mt-0">
          <Plus className="h-4 w-4 mr-1" /> Create Model
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">
            <Users className="h-4 w-4 mr-1.5" /> Library ({filteredBuiltIn.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            My Models ({customModels.length})
          </TabsTrigger>
        </TabsList>

        {/* Filters — only show on Library tab */}
        {activeTab === 'library' && (
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map(g => (
                  <SelectItem key={g} value={g}>{g === 'all' ? 'All Genders' : g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ethnicityFilter} onValueChange={setEthnicityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ETHNICITY_OPTIONS.map(e => (
                  <SelectItem key={e} value={e}>{e === 'all' ? 'All Ethnicities' : e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bodyTypeFilter} onValueChange={setBodyTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BODY_TYPE_OPTIONS.map(b => (
                  <SelectItem key={b} value={b}>{b === 'all' ? 'All Body Types' : b.charAt(0).toUpperCase() + b.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Library Tab */}
        <TabsContent value="library" className="mt-4">
          {loadingPortraits ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBuiltIn.map(m => (
                <ModelCard key={m.id} model={m} portraitUrl={portraits[m.id]} />
              ))}
              {filteredBuiltIn.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  No models match your filters.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* My Models Tab */}
        <TabsContent value="custom" className="mt-4">
          {loadingCustom ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Create card */}
              <button
                onClick={() => setShowCreate(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 aspect-[3/4] hover:border-primary/40 hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Create Model</span>
              </button>

              {customModels.map(m => (
                <CustomModelCard key={m.id} model={m} onDelete={() => setDeleteTarget(m.id)} />
              ))}

              {customModels.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  You haven't created any custom models yet.
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Model Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={newModel.name} onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sarah" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={newModel.gender} onValueChange={v => setNewModel(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Body Type</Label>
                <Select value={newModel.bodyType} onValueChange={v => setNewModel(p => ({ ...p, bodyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="curvy">Curvy</SelectItem>
                    <SelectItem value="plus size">Plus Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ethnicity</Label>
                <Input value={newModel.ethnicity} onChange={e => setNewModel(p => ({ ...p, ethnicity: e.target.value }))} placeholder="e.g. South Asian" />
              </div>
              <div className="space-y-1.5">
                <Label>Age Range</Label>
                <Input value={newModel.ageRange} onChange={e => setNewModel(p => ({ ...p, ageRange: e.target.value }))} placeholder="e.g. 24-28" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Skin Tone</Label>
                <Input value={newModel.skinTone} onChange={e => setNewModel(p => ({ ...p, skinTone: e.target.value }))} placeholder="e.g. warm brown" />
              </div>
              <div className="space-y-1.5">
                <Label>Facial Features</Label>
                <Input value={newModel.facialFeatures} onChange={e => setNewModel(p => ({ ...p, facialFeatures: e.target.value }))} placeholder="e.g. high cheekbones" />
              </div>
            </div>

            {/* Reference Photos */}
            <div className="space-y-1.5">
              <Label>Reference Photos *</Label>
              <p className="text-xs text-muted-foreground">Upload 1 or more angled shots of the model for best results.</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {refPreviews.map((url, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeRefFile(i)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <input type="file" className="hidden" accept="image/*,.heic,.heif" multiple onChange={handleFileSelect} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {creating ? 'Creating...' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this custom model. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Sub-components ── */

const ModelCard = ({ model, portraitUrl }: { model: BuiltInModel; portraitUrl?: string }) => (
  <Card className="group overflow-hidden border hover:shadow-md transition-shadow">
    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
      {portraitUrl ? (
        <img src={portraitUrl} alt={model.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Users className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
    </div>
    <CardContent className="p-3">
      <p className="text-sm font-medium truncate">{model.name}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{model.gender === 'female' ? 'F' : 'M'}</Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 truncate max-w-[80px]">{model.ethnicity}</Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{model.bodyType}</Badge>
      </div>
    </CardContent>
  </Card>
);

const CustomModelCard = ({ model, onDelete }: { model: CustomModel; onDelete: () => void }) => (
  <Card className="group overflow-hidden border hover:shadow-md transition-shadow relative">
    <button
      onClick={e => { e.stopPropagation(); onDelete(); }}
      className="absolute top-2 right-2 z-10 rounded-full bg-background/80 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
      {model.portrait_url ? (
        <img src={model.portrait_url} alt={model.name} className="h-full w-full object-cover" loading="lazy" />
      ) : model.reference_images?.[0] ? (
        <img src={model.reference_images[0]} alt={model.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Users className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
    </div>
    <CardContent className="p-3">
      <p className="text-sm font-medium truncate">{model.name}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{model.gender === 'female' ? 'F' : 'M'}</Badge>
        {model.ethnicity && <Badge variant="outline" className="text-[10px] px-1.5 py-0 truncate max-w-[80px]">{model.ethnicity}</Badge>}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{model.body_type}</Badge>
      </div>
      {model.reference_images?.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">{model.reference_images.length} ref photo{model.reference_images.length !== 1 ? 's' : ''}</p>
      )}
    </CardContent>
  </Card>
);

export default Models;
