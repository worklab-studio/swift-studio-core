import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Link, Images } from 'lucide-react';

const assetTypes = ['All', 'Catalog', 'Lifestyle', 'Model', 'Video'];

interface Asset {
  id: string;
  asset_type: string;
  url: string;
  created_at: string;
}

const Assets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!user) return;
    const fetchAssets = async () => {
      let query = supabase.from('assets').select('*, projects!inner(user_id)').eq('projects.user_id', user.id);
      if (filter !== 'All') query = query.eq('asset_type', filter.toLowerCase());
      const { data } = await query;
      setAssets(data ?? []);
    };
    fetchAssets();
  }, [user, filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Asset Library</h1>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {assetTypes.map((t) => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Images className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No assets yet. Generate some from a project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="group relative">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={a.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <button className="rounded-full bg-white p-2"><Download className="h-4 w-4" /></button>
                  <button className="rounded-full bg-white p-2"><Link className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{a.url.split('/').pop()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Assets;
