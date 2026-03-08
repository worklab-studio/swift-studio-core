import { LayoutDashboard, Plus, FolderOpen, Images, CreditCard, Plug, Settings, Zap } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Projects', url: '/app/projects', icon: FolderOpen },
  { title: 'Assets', url: '/app/assets', icon: Images },
  { title: 'Billing', url: '/app/billing', icon: CreditCard },
  { title: 'Integrations', url: '/app/integrations', icon: Plug },
  { title: 'Settings', url: '/app/settings', icon: Settings },
];

export const AppSidebar = () => {
  const { profile } = useAuth();
  const { openDialog } = useNewProjectDialog();
  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = 100;
  const pct = (credits / maxCredits) * 100;
  const creditColor = pct > 50 ? 'text-green-600 bg-green-50' : pct > 25 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r bg-sidebar py-6">
      {/* Logo */}
      <div className="px-6 mb-2">
        <span className="font-['Instrument_Serif'] italic text-xl">Swift</span>
        <span className="text-xl font-light ml-1">Studio</span>
      </div>
      <div className="px-6"><Separator /></div>

      {/* Nav */}
      <nav className="flex-1 mt-4 space-y-1 px-3">
        <button
          onClick={() => openDialog()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent text-muted-foreground"
            activeClassName="bg-accent text-foreground font-medium"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Credit pill */}
      <div className="px-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${creditColor}`}>
              <Zap className="h-4 w-4" />
              {credits} credits
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-52">
            <div className="space-y-2">
              <p className="text-sm font-medium capitalize">{profile?.plan ?? 'free'} plan</p>
              <p className="text-xs text-muted-foreground">{credits} credits remaining</p>
              <Button size="sm" className="w-full">Upgrade</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
};
