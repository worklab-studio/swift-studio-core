import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
}

const SHOT_LABELS: Record<string, string> = { model_shot: 'Model Shot', product_showcase: 'Product Showcase' };

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openDialog } = useNewProjectDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ projects: 0, images: 0, videos: 0, credits: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setProjects(projectsData ?? []);
      setStats({
        projects: projectCount ?? 0,
        images: 0,
        videos: 0,
        credits: 10 - (profile?.credits_remaining ?? 10),
      });
    };
    fetchData();
  }, [user, profile]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const statCards = [
    { label: 'Total Projects', value: stats.projects },
    { label: 'Images Generated', value: stats.images },
    { label: 'Videos Created', value: stats.videos },
    { label: 'Credits Used', value: stats.credits },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl">Good morning, {firstName}</h1>
        <p className="text-muted-foreground mt-1">Here's your studio overview.</p>
      </div>

      {/* Quick action */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Start a new project</p>
            <p className="text-sm text-muted-foreground">Upload a product photo to begin</p>
          </div>
          <Button onClick={openDialog}>New Project</Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <p className="text-3xl font-medium">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent projects */}
      <div className="space-y-4">
        <p className="text-lg font-medium">Recent projects</p>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet. Create your first one!</p>
        ) : (
          <>
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
                        {(p as any).shot_type && <Badge variant="outline" className="text-xs">{SHOT_LABELS[(p as any).shot_type] ?? (p as any).shot_type}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <button
              onClick={() => navigate('/app/projects')}
              className="text-sm text-primary hover:underline"
            >
              View all projects →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
