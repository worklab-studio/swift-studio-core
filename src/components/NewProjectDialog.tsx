import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Camera, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'apparel', emoji: '👗', name: 'Apparel' },
  { id: 'jewellery', emoji: '💍', name: 'Jewellery' },
  { id: 'bags', emoji: '👜', name: 'Bags' },
  { id: 'beauty', emoji: '✨', name: 'Beauty' },
  { id: 'skincare', emoji: '🧴', name: 'Skincare' },
  { id: 'fmcg', emoji: '🥤', name: 'FMCG' },
  { id: 'footwear', emoji: '👟', name: 'Footwear' },
  { id: 'other', emoji: '📦', name: 'Other' },
] as const;

const NewProjectDialog = () => {
  const { isOpen, closeDialog } = useNewProjectDialog();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultOutput, setDefaultOutput] = useState<'photos' | 'videos'>('photos');
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
      setTimeout(() => {
        setCategory('');
        setProjectName('');
        setDescription('');
        setDefaultOutput('photos');
        setIsCreating(false);
      }, 200);
    }
  };

  const canCreate = !!projectName.trim() && !!category;

  const handleCreate = async () => {
    if (!user || !canCreate) return;
    setIsCreating(true);
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          category,
          description: description.trim() || null,
          default_output: defaultOutput,
          user_id: user.id,
        } as any)
        .select('id')
        .single();
      if (error || !project) throw error;
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
        <DialogTitle className="text-xl font-semibold mb-6">Create New Project</DialogTitle>

        <div className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Summer Collection Drop 01"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <Card
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'px-3 py-2.5 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center text-center',
                    category === c.id
                      ? 'border-2 border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/30'
                  )}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <p className="font-medium text-xs mt-1">{c.name}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="Brief description of your product or collection..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[72px] resize-none"
            />
          </div>

          {/* Default Output */}
          <div className="space-y-2">
            <Label>Default Output</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                onClick={() => setDefaultOutput('photos')}
                className={cn(
                  'p-4 cursor-pointer transition-all flex items-center gap-3',
                  defaultOutput === 'photos'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                )}
              >
                <Camera className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">Photos</p>
                  <p className="text-xs text-muted-foreground">Generate product images</p>
                </div>
              </Card>
              <Card
                onClick={() => setDefaultOutput('videos')}
                className={cn(
                  'p-4 cursor-pointer transition-all flex items-center gap-3',
                  defaultOutput === 'videos'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                )}
              >
                <Video className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">Videos</p>
                  <p className="text-xs text-muted-foreground">Generate product videos</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button disabled={!canCreate || isCreating} onClick={handleCreate}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
