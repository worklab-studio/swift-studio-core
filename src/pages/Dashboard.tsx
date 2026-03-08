import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Plus, FolderOpen, ImageIcon, VideoIcon, LayoutGrid, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  shot_type: string;
  created_at: string;
}

interface Asset {
  id: string;
  url: string;
  asset_type: string;
  created_at: string;
}

const SHOT_LABELS: Record<string, string> = {
  model_shot: 'Model Shot',
  product_showcase: 'Product Showcase',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openDialog } = useNewProjectDialog();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState({ projects: 0, images: 0, videos: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [
        { count: projectCount },
        { count: imageCount },
        { count: videoCount },
        { data: recentProjects },
        { data: assets },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('assets').select('*', { count: 'exact', head: true }).neq('asset_type', 'video'),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_type', 'video'),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('assets').select('id, url, asset_type, created_at').order('created_at', { ascending: false }).limit(6),
      ]);
      setStats({ projects: projectCount ?? 0, images: imageCount ?? 0, videos: videoCount ?? 0 });
      setProjects(recentProjects ?? []);
      setRecentAssets(assets ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const creditsTotal = 10;
  const creditsLeft = profile?.credits_remaining ?? creditsTotal;
  const plan = profile?.plan ?? 'free';

  const statCards = [
    { label: 'Projects', value: stats.projects, icon: FolderOpen },
    { label: 'Images', value: stats.images, icon: ImageIcon },
    { label: 'Videos', value: stats.videos, icon: VideoIcon },
  ];

  const quickActions = [
    { label: 'New Project', icon: Plus, action: openDialog },
    { label: 'View Projects', icon: FolderOpen, action: () => navigate('/app/projects') },
    { label: 'Browse Assets', icon: LayoutGrid, action: () => navigate('/app/assets') },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-semibold">
          <span className="text-primary">{getGreeting()},</span> {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your studio overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickActions.map((a) => (
          <Card
            key={a.label}
            className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
            onClick={a.action}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <a.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{a.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credits & Plan */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs">{plan} Plan</Badge>
                <span className="text-sm text-muted-foreground">
                  {creditsLeft} / {creditsTotal} credits remaining
                </span>
              </div>
              <Progress value={(creditsLeft / creditsTotal) * 100} className="h-2" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/billing')}>
            {plan === 'free' ? 'Upgrade' : 'Manage Plan'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Projects + Recent Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Recent Projects</p>
            <button
              onClick={() => navigate('/app/projects')}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No projects yet. Create your first one!</p>
                <Button size="sm" className="mt-3" onClick={openDialog}>
                  New Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/app/projects/${p.id}`)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-xs">{p.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{SHOT_LABELS[p.shot_type] ?? p.shot_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">Open</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Recent Assets</p>
            <button
              onClick={() => navigate('/app/assets')}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : recentAssets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No assets generated yet.</p>
                <Button size="sm" className="mt-3" onClick={openDialog}>
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentAssets.map((a) => (
                <Card key={a.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => navigate('/app/assets')}>
                  <AspectRatio ratio={1}>
                    <img
                      src={a.url}
                      alt="Generated asset"
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  </AspectRatio>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
