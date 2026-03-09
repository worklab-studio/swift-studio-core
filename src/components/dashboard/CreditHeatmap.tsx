import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface Transaction {
  created_at: string;
  amount: number;
}

interface CreditHeatmapProps {
  transactions: Transaction[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

    const dayMap = new Map<string, number>();
    for (const t of transactions) {
      const key = t.created_at.slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Math.abs(t.amount));
    }

    const weeks: { date: Date; count: number }[][] = [];
    const labels: { label: string; weekIndex: number }[] = [];
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
        labels.push({ label: MONTHS[month], weekIndex: weeks.length });
        lastMonth = month;
      }

      week.push({ date: new Date(currentDate), count: dayMap.get(key) ?? 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    let totalSpent = 0;
    for (const t of transactions) {
      totalSpent += Math.abs(t.amount);
    }

    return { grid: weeks, monthLabels: labels, total: totalSpent };
  }, [transactions]);

  const totalWeeks = grid.length;

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <p className="text-lg font-medium">Credit Usage</p>

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
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

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
