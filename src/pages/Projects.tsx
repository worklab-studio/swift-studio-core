import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';

const categories = ['All', 'Jewellery', 'Apparel', 'Beauty', 'FMCG', 'Footwear', 'Bags'];

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-amber-100 text-amber-700 border-0';
    case 'completed': return 'bg-green-100 text-green-700 border-0';
    default: return '';
  }
};

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  shot_type?: string;
  created_at: string;
}

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openDialog } = useNewProjectDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      let query = supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (filter !== 'All') query = query.eq('category', filter.toLowerCase());
      const { data } = await query;
      setProjects(data ?? []);
    };
    fetchProjects();
  }, [user, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Projects</h1>
        <Button onClick={openDialog}>New Project</Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {categories.map((c) => (
            <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No projects yet. Create your first one.</p>
          <Button onClick={openDialog}>New Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="border-0 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => navigate(`/app/projects/${p.id}`)}
            >
              <div className="bg-gradient-to-br from-muted to-muted/50 h-40 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="space-y-1.5">
                  <p className="font-semibold text-base truncate">{p.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="capitalize text-xs bg-primary/10 text-primary border-0">{p.category}</Badge>
                    {p.shot_type && <Badge variant="outline" className="text-xs">{SHOT_LABELS[p.shot_type] ?? p.shot_type}</Badge>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  <Badge variant="secondary" className={statusBadgeClass(p.status)}>{p.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
