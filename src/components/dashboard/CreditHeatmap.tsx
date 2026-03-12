import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Transaction {
  created_at: string;
  amount: number;
}

interface CreditHeatmapProps {
  transactions: Transaction[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-primary/15';
  if (count <= 5) return 'bg-primary/30';
  if (count <= 10) return 'bg-primary/60';
  return 'bg-primary';
}

// Seeded pseudo-random for deterministic mock data
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generateMockCount(dateKey: string): number {
  const seed = dateKey.split('-').reduce((a, b) => a + parseInt(b), 0);
  const r = seededRandom(seed);
  if (r < 0.6) return 0;
  if (r < 0.75) return Math.ceil(seededRandom(seed + 1) * 2);
  if (r < 0.88) return Math.ceil(seededRandom(seed + 2) * 5);
  return Math.ceil(seededRandom(seed + 3) * 12);
}

export const CreditHeatmap = ({ transactions }: CreditHeatmapProps) => {
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const year = parseInt(selectedYear);

  const { grid, monthLabels, total } = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    // Build map of real transaction data
    const dayMap = new Map<string, number>();
    for (const t of transactions) {
      const key = t.created_at.slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Math.abs(t.amount));
    }

    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const startDow = jan1.getDay(); // 0=Sun

    const weeks: { date: Date; count: number }[][] = [];
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    // Pad first week with empty cells
    let week: { date: Date; count: number }[] = [];
    for (let i = 0; i < startDow; i++) {
      week.push({ date: new Date(year, 0, 1 - startDow + i), count: -1 }); // -1 = hidden
    }

    let currentDate = new Date(jan1);
    while (currentDate <= dec31) {
      const key = currentDate.toISOString().slice(0, 10);
      const month = currentDate.getMonth();

      if (currentDate.getDay() === 0 && week.length > 0) {
        weeks.push(week);
        week = [];
      }

      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], weekIndex: weeks.length });
        lastMonth = month;
      }

      let count: number;
      if (key > todayKey) {
        count = 0; // future
      } else if (dayMap.has(key)) {
        count = dayMap.get(key)!;
      } else {
        count = generateMockCount(key); // mock for past days without real data
      }

      week.push({ date: new Date(currentDate), count });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    // Total
    let totalSpent = 0;
    for (const w of weeks) {
      for (const d of w) {
        if (d.count > 0) totalSpent += d.count;
      }
    }

    return { grid: weeks, monthLabels: labels, total: totalSpent };
  }, [transactions, year]);

  const totalWeeks = grid.length;

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-medium">Credit Usage</p>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month labels */}
        <div className="relative h-4">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute text-xs text-muted-foreground"
              style={{ left: `${(m.weekIndex / totalWeeks) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <TooltipProvider delayDuration={0}>
          <div className="flex w-full gap-[2px]">
            {grid.map((week, wi) => (
              <div key={wi} className="flex-1 flex flex-col gap-[2px]">
                {week.map((day, di) => (
                  day.count === -1 ? (
                    <div key={di} className="w-full aspect-square" />
                  ) : (
                    <Tooltip key={di}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-full aspect-square rounded-[2px] ${getIntensityClass(day.count)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>{day.date.toLocaleDateString()}: {day.count} credits</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{total} credits spent in {year}</span>
          <div className="flex items-center gap-1">
            <span>Less</span>
            <div className="w-[11px] h-[11px] rounded-[2px] bg-muted" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/15" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/30" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/60" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-primary" />
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
