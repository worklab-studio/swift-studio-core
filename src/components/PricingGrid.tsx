import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PLANS = [
  {
    name: 'Free',
    monthly: 0,
    features: ['10 image generations', 'Watermarked exports', 'JPG only', '1 project', '1 seat'],
    highlight: false,
  },
  {
    name: 'Starter',
    monthly: 19,
    features: ['100 image generations', '5 video generations', 'No watermark', 'All scenes & presets', 'PNG export'],
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: 49,
    features: ['500 image generations', '20 video generations', '2K resolution', 'Priority queue', 'A/B variants', 'API — 100 calls/mo'],
    highlight: true,
  },
  {
    name: 'Business',
    monthly: 99,
    features: ['2,000 image generations', '80 video generations', 'Bulk upload', 'Shopify push', '3 team seats', 'Full API access'],
    highlight: false,
  },
];

interface PricingGridProps {
  currentPlan?: string;
  onUpgrade?: (plan: string) => void;
}

export const PricingGrid = ({ currentPlan = 'free', onUpgrade }: PricingGridProps) => {
  const [annual, setAnnual] = useState(false);
  const discount = 0.84; // 16% off

  const getPrice = (monthly: number) => {
    if (monthly === 0) return 0;
    return annual ? Math.round(monthly * discount) : monthly;
  };

  const handleClick = (planName: string) => {
    if (onUpgrade) {
      onUpgrade(planName);
    } else {
      toast({ title: 'Coming soon', description: 'Payment integration will be available shortly.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Annual toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className="text-sm font-medium">Annual billing — save 16%</span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan.toLowerCase() === plan.name.toLowerCase();
          const currentIdx = PLANS.findIndex(p => p.name.toLowerCase() === currentPlan.toLowerCase());
          const planIdx = PLANS.indexOf(plan);
          const isDowngrade = planIdx < currentIdx;

          return (
            <Card
              key={plan.name}
              className={`relative p-6 flex flex-col ${plan.highlight ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
                  Most popular
                </Badge>
              )}
              <p className="font-semibold">{plan.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-medium">${getPrice(plan.monthly)}</span>
                {plan.monthly > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <Separator className="my-4" />
              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={isCurrentPlan ? 'outline' : isDowngrade ? 'ghost' : 'default'}
                disabled={isCurrentPlan}
                onClick={() => handleClick(plan.name)}
              >
                {isCurrentPlan ? 'Current plan' : isDowngrade ? 'Downgrade' : 'Upgrade'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
