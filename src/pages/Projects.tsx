import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';

const categories = ['All', 'Jewellery', 'Apparel', 'Beauty', 'FMCG', 'Footwear', 'Bags'];

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{p.category}</Badge></TableCell>
                <TableCell>0</TableCell>
                <TableCell>0</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary">{p.status}</Badge>
                    {p.shot_type && <Badge variant="outline" className="text-xs">{SHOT_LABELS[p.shot_type] ?? p.shot_type}</Badge>}
                  </div>
                </TableCell>
                <TableCell><Button variant="outline" size="sm">Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Projects;
