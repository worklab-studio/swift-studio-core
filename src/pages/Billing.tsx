import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PricingGrid } from '@/components/PricingGrid';
import { toast } from '@/hooks/use-toast';

const TOP_UPS = [
  { credits: 25, price: 5 },
  { credits: 100, price: 15 },
  { credits: 500, price: 50 },
  { credits: 1000, price: 90 },
];

const MOCK_TRANSACTIONS = [
  { date: '2026-03-07', description: 'Pro plan — March', credits: 500, amount: '$49.00', status: 'Completed' },
  { date: '2026-03-05', description: 'Credit top-up', credits: 100, amount: '$15.00', status: 'Completed' },
  { date: '2026-02-15', description: 'Video generation', credits: -8, amount: '—', status: 'Completed' },
  { date: '2026-02-07', description: 'Pro plan — February', credits: 500, amount: '$49.00', status: 'Completed' },
  { date: '2026-01-20', description: 'Credit top-up', credits: 25, amount: '$5.00', status: 'Refunded' },
];

const statusColor: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Refunded: 'bg-muted text-muted-foreground',
};

const Billing = () => {
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'free';
  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = plan === 'free' ? 10 : plan === 'starter' ? 100 : plan === 'pro' ? 500 : 2000;
  const used = maxCredits - credits;
  const pct = maxCredits > 0 ? (used / maxCredits) * 100 : 0;

  const handleTopUp = () => {
    toast({ title: 'Coming soon', description: 'Payment integration will be available shortly.' });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl">Billing &amp; Credits</h1>

      {/* Current plan card */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex-1 space-y-3">
            <Badge variant="secondary" className="capitalize">{plan} Plan</Badge>
            <div>
              <span className="text-4xl font-medium">{credits}</span>
              <span className="ml-2 text-muted-foreground">credits remaining</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-sm text-muted-foreground">{used} of {maxCredits} credits used this month</p>
          </div>
          <Button>Upgrade</Button>
        </CardContent>
      </Card>

      {/* Pricing */}
      <div className="space-y-4">
        <p className="font-medium">Plans</p>
        <PricingGrid currentPlan={plan} />
      </div>

      {/* Top-ups */}
      <div className="space-y-4">
        <p className="font-medium">Top up credits</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TOP_UPS.map((t) => (
            <Card key={t.credits}>
              <CardContent className="p-4 text-center space-y-2">
                <p className="text-lg font-medium">{t.credits} credits</p>
                <p className="text-sm text-muted-foreground">${t.price}</p>
                <Button variant="outline" size="sm" className="w-full" onClick={handleTopUp}>Buy</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="space-y-4">
        <p className="font-medium">Transaction history</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_TRANSACTIONS.map((t, i) => (
              <TableRow key={i}>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell className={t.credits < 0 ? 'text-destructive' : ''}>{t.credits > 0 ? `+${t.credits}` : t.credits}</TableCell>
                <TableCell>{t.amount}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor[t.status] ?? ''}>{t.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Billing;
