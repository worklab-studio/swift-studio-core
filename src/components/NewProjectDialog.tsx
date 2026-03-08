import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'apparel', name: 'Apparel' },
  { id: 'jewellery', name: 'Jewellery' },
  { id: 'bags', name: 'Bags' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'skincare', name: 'Skincare' },
  { id: 'fmcg', name: 'FMCG' },
  { id: 'footwear', name: 'Footwear' },
  { id: 'other', name: 'Other' },
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
        <div className="mb-6">
          <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Set up your product shoot in seconds</p>
        </div>

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
                    'px-3 py-2 cursor-pointer transition-all',
                    category === c.id
                      ? 'border-primary/30'
                      : 'hover:border-muted-foreground/20'
                  )}
                >
                  <p className={cn('font-medium text-sm', category === c.id && 'text-primary')}>{c.name}</p>
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
            <RadioGroup
              value={defaultOutput}
              onValueChange={(v) => setDefaultOutput(v as 'photos' | 'videos')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="photos" id="output-photos" />
                <Label htmlFor="output-photos" className="cursor-pointer font-normal">Photos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="videos" id="output-videos" />
                <Label htmlFor="output-videos" className="cursor-pointer font-normal">Videos</Label>
              </div>
            </RadioGroup>
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
