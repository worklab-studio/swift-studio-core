import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Code, Lock, ShoppingBag, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const Integrations = () => {
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'free';
  const hasPro = ['pro', 'business'].includes(plan);
  const [shopifyConnected] = useState(false);
  const maskedKey = 'sk_live_••••••••••••••••••3f8a';

  const handleCopy = () => {
    navigator.clipboard.writeText('sk_live_demo_key_3f8a');
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl">Integrations</h1>

      {/* Shopify */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#95BF47]/10">
            <ShoppingBag className="h-5 w-5 text-[#95BF47]" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Shopify</p>
            <p className="text-sm text-muted-foreground">Import products and push generated images directly to your store.</p>
          </div>
          {shopifyConnected ? (
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-700 border-green-200">Connected ✓</Badge>
              <button className="text-sm text-muted-foreground hover:underline">Disconnect</button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => toast({ title: 'Coming soon', description: 'Shopify integration will be available shortly.' })}>
              Connect Shopify
            </Button>
          )}
        </CardContent>
      </Card>

      {/* API Access */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Code className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">API Access</p>
            <p className="text-sm text-muted-foreground">Integrate Swift Studio into your workflow with our REST API.</p>
          </div>
          {hasPro ? (
            <div className="flex items-center gap-2">
              <Input value={maskedKey} readOnly className="w-56 font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  API Access
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <p className="text-sm">This feature is available on <span className="font-medium">Pro</span> and above.</p>
                <Button size="sm" className="mt-3 w-full" onClick={() => window.location.href = '/app/billing'}>
                  Upgrade now →
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
