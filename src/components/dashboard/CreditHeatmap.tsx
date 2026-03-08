import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Transaction {
  created_at: string;
  amount: number;
}

interface CreditHeatmapProps {
  transactions: Transaction[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-primary/15';
  if (count <= 5) return 'bg-primary/30';
  if (count <= 10) return 'bg-primary/60';
  return 'bg-primary';
}

export const CreditHeatmap = ({ transactions }: CreditHeatmapProps) => {
  const { grid, monthLabels, total } = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() - oneYearAgo.getDay()); // align to Sunday

    // Aggregate amounts by date string
    const dayMap = new Map<string, number>();
    for (const t of transactions) {
      const key = t.created_at.slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Math.abs(t.amount));
    }

    // Build 53 weeks × 7 days grid
    const weeks: { date: Date; count: number }[][] = [];
    const labels: { label: string; col: number }[] = [];
    let currentDate = new Date(oneYearAgo);
    let lastMonth = -1;

    let week: { date: Date; count: number }[] = [];
    while (currentDate <= now) {
      const key = currentDate.toISOString().slice(0, 10);
      const month = currentDate.getMonth();

      if (currentDate.getDay() === 0 && week.length > 0) {
        weeks.push(week);
        week = [];
      }

      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], col: weeks.length });
        lastMonth = month;
      }

      week.push({ date: new Date(currentDate), count: dayMap.get(key) ?? 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    let totalSpent = 0;
    for (const t of transactions) {
      if (t.amount < 0) totalSpent += Math.abs(t.amount);
    }

    return { grid: weeks, monthLabels: labels, total: totalSpent };
  }, [transactions]);

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <p className="text-lg font-medium">Credit Usage</p>
        <ScrollArea className="w-full">
          <div className="min-w-[720px]">
            {/* Month labels */}
            <div className="flex ml-8 mb-1 gap-0">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="text-xs text-muted-foreground"
                  style={{
                    position: 'absolute',
                    left: `${m.col * 14 + 32}px`,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-0 mt-5 relative">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-2 shrink-0">
                {DAYS.map((d, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground h-[11px] flex items-center">
                    {d}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-[3px]">
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-[11px] h-[11px] rounded-[2px] ${getIntensityClass(day.count)}`}
                        title={`${day.date.toLocaleDateString()}: ${day.count} credits`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{total} credits spent this year</span>
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
