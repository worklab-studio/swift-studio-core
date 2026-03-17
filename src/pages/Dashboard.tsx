import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Plus, FolderOpen, ImageIcon, ArrowRight, Video,
  Gem, Shirt, Footprints, Coffee, Sparkles, Briefcase, Package,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { CreditHeatmap } from '@/components/dashboard/CreditHeatmap';
import { PresetImageGenerator } from '@/components/dashboard/PresetImageGenerator';

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  shot_type: string;
  created_at: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_type: string;
  created_at: string;
}

const SHOT_LABELS: Record<string, string> = {
  model_shot: 'Model Shot',
  product_showcase: 'Product Showcase',
};

const CATEGORY_ICONS: Record<string, typeof Gem> = {
  jewellery: Gem,
  apparel: Shirt,
  footwear: Footprints,
  fmcg: Coffee,
  beauty: Sparkles,
  bags: Briefcase,
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700 border-0',
  completed: 'bg-green-100 text-green-700 border-0',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category.toLowerCase()] ?? Package;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openDialog } = useNewProjectDialog();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ created_at: string; amount: number }[]>([]);
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ projects: 0, images: 0, videos: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        { data: recentProjects },
        { data: recentTx },
        { data: allTx },
        { count: projectCount },
        { count: imageCount },
        { count: videoCount },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('credit_transactions')
          .select('created_at, amount')
          .eq('user_id', user.id),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('asset_type', 'generated'),
        supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('asset_type', 'video'),
      ]);

      setStats({
        projects: projectCount ?? 0,
        images: imageCount ?? 0,
        videos: videoCount ?? 0,
      });

      setProjects(recentProjects ?? []);
      setTransactions(recentTx ?? []);
      setHeatmapData(allTx ?? []);

      // Fetch asset counts per project
      if (recentProjects && recentProjects.length > 0) {
        const ids = recentProjects.map((p: Project) => p.id);
        const { data: assets } = await supabase
          .from('assets')
          .select('project_id')
          .in('project_id', ids);
        const counts: Record<string, number> = {};
        for (const a of assets ?? []) {
          counts[a.project_id] = (counts[a.project_id] ?? 0) + 1;
        }
        setAssetCounts(counts);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-semibold">
          <span className="text-primary">{getGreeting()},</span> {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your studio overview.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              <h3 className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16 mt-1" /> : stats.projects}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Generated Images</p>
              <h3 className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16 mt-1" /> : stats.images}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Generated Videos</p>
              <h3 className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16 mt-1" /> : stats.videos}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage Heatmap */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-[110px] w-full" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      ) : (
        <CreditHeatmap transactions={heatmapData} />
      )}

      {/* Recent Projects + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        {/* Recent Projects */}
        <div className="lg:col-span-3 flex flex-col space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
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
                  <Plus className="h-4 w-4 mr-1" /> New Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => {
                const Icon = getCategoryIcon(p.category);
                return (
                  <Card
                    key={p.id}
                    className="hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/app/projects/${p.id}`)}
                  >
                    <div className="bg-gradient-to-br from-muted to-muted/50 h-28 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="capitalize text-xs bg-primary/10 text-primary border-0">
                          {p.category}
                        </Badge>
                        {p.shot_type && (
                          <Badge variant="outline" className="text-xs">
                            {SHOT_LABELS[p.shot_type] ?? p.shot_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{assetCounts[p.id] ?? 0} assets</span>
                        <Badge variant="secondary" className={STATUS_CLASSES[p.status] ?? ''}>
                          {p.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium">Recent Activity</p>
            <button
              onClick={() => navigate('/app/billing')}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 py-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-3.5 w-10 shrink-0" />
                    </div>
                    {i < 4 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : transactions.length === 0 ? (
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 py-3 opacity-40">
                      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-36 rounded bg-muted" />
                        <div className="h-3 w-20 rounded bg-muted" />
                      </div>
                      <div className="h-3.5 w-10 rounded bg-muted shrink-0" />
                    </div>
                    {i < 4 && <Separator />}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-auto pt-4">No activity yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-4 flex-1">
                {transactions.map((tx, i) => {
                  const isDebit = tx.transaction_type === 'debit' || tx.amount < 0;
                  return (
                    <div key={tx.id}>
                      <div className="flex items-center gap-3 py-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isDebit ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                          {isDebit ? (
                            <ArrowDownCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${isDebit ? 'text-destructive' : 'text-primary'}`}>
                          {isDebit ? '' : '+'}{tx.amount}
                        </span>
                      </div>
                      {i < transactions.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
