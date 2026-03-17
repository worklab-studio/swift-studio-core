import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ImageIcon, Check, AlertCircle } from 'lucide-react';

const CATEGORIES = ['jewellery', 'bags_luggage', 'beauty_personal_care', 'fmcg', 'footwear'];
const PRESETS = ['classic', 'minimalist', 'luxury', 'loud-luxury', 'magazine', 'avant-garde', 'influencer', 'lifestyle'];

const CATEGORY_LABELS: Record<string, string> = {
  jewellery: 'Jewellery',
  bags_luggage: 'Bags & Luggage',
  beauty_personal_care: 'Beauty & Personal Care',
  fmcg: 'FMCG',
  footwear: 'Footwear',
};

type Status = 'pending' | 'generating' | 'done' | 'error';

interface CellState {
  status: Status;
  url?: string;
  error?: string;
}

export function PresetImageGenerator() {
  const [grid, setGrid] = useState<Record<string, CellState>>({});
  const [running, setRunning] = useState(false);
  const [currentItem, setCurrentItem] = useState('');

  const total = CATEGORIES.length * PRESETS.length;
  const doneCount = Object.values(grid).filter(c => c.status === 'done').length;
  const errorCount = Object.values(grid).filter(c => c.status === 'error').length;

  const key = (cat: string, preset: string) => `${cat}::${preset}`;

  const generateAll = async () => {
    setRunning(true);
    for (const category of CATEGORIES) {
      for (const presetId of PRESETS) {
        const k = key(category, presetId);
        if (grid[k]?.status === 'done') continue;

        setCurrentItem(`${CATEGORY_LABELS[category]} → ${presetId}`);
        setGrid(prev => ({ ...prev, [k]: { status: 'generating' } }));

        try {
          const { data, error } = await supabase.functions.invoke('generate-preset-images', {
            body: { category, presetId },
          });

          if (error) throw error;
          setGrid(prev => ({ ...prev, [k]: { status: 'done', url: data.url } }));
        } catch (err: any) {
          console.error(`Failed ${k}:`, err);
          setGrid(prev => ({ ...prev, [k]: { status: 'error', error: err.message } }));
          // Wait a bit on error (might be rate limit)
          await new Promise(r => setTimeout(r, 5000));
        }

        // Delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    setRunning(false);
    setCurrentItem('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">🎨 Generate Preset Thumbnails</CardTitle>
          <Badge variant="secondary" className="text-xs">Temporary</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate unique AI style preset images for all categories ({total} images total).
          This will take a few minutes.
        </p>

        {running && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-muted-foreground">{currentItem}</span>
            </div>
            <Progress value={(doneCount / total) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{doneCount}/{total} done{errorCount > 0 ? ` · ${errorCount} errors` : ''}</p>
          </div>
        )}

        {!running && doneCount > 0 && (
          <p className="text-sm text-primary font-medium">{doneCount}/{total} images generated{errorCount > 0 ? ` · ${errorCount} errors` : ''}</p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-8 gap-1.5 text-[10px]">
          {/* Header */}
          <div />
          {PRESETS.map(p => <div key={p} className="text-center font-medium text-muted-foreground truncate capitalize">{p}</div>)}
          
          {CATEGORIES.map(cat => (
            <>
              <div key={cat} className="font-medium text-muted-foreground flex items-center truncate pr-1">
                {CATEGORY_LABELS[cat]}
              </div>
              {PRESETS.map(presetId => {
                const cell = grid[key(cat, presetId)];
                return (
                  <div
                    key={`${cat}-${presetId}`}
                    className="aspect-square rounded border bg-muted flex items-center justify-center overflow-hidden"
                  >
                    {cell?.status === 'done' && cell.url ? (
                      <img src={cell.url} alt="" className="w-full h-full object-cover" />
                    ) : cell?.status === 'generating' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : cell?.status === 'error' ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <Button onClick={generateAll} disabled={running} size="sm">
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating...</>
          ) : doneCount > 0 ? (
            <><Check className="h-4 w-4 mr-1" /> Continue / Retry</>
          ) : (
            'Generate All Preset Images'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
