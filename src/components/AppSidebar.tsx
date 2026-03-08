import { LayoutDashboard, Plus, FolderOpen, Images, CreditCard, Plug, Settings, LogOut, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '@/assets/Logo.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';
import { useNavigate, Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainNav = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Projects', url: '/app/projects', icon: FolderOpen },
  { title: 'Assets', url: '/app/assets', icon: Images },
];

const accountNav = [
  { title: 'Billing', url: '/app/billing', icon: CreditCard },
  { title: 'Integrations', url: '/app/integrations', icon: Plug },
  { title: 'Settings', url: '/app/settings', icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const { user, profile, signOut } = useAuth();
  const { openDialog } = useNewProjectDialog();
  const navigate = useNavigate();

  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = 100;
  const pct = (credits / maxCredits) * 100;
  const initials = (profile?.full_name ?? user?.email ?? '?').slice(0, 2).toUpperCase();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const navLinkClass = collapsed
    ? "flex items-center justify-center rounded-lg p-2.5 text-sm transition-colors hover:bg-muted hover:text-foreground text-muted-foreground"
    : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted hover:text-foreground text-muted-foreground";
  const navLinkActive = "bg-primary/10 text-primary font-medium";

  const renderNavItem = (item: { title: string; url: string; icon: React.ElementType }) => {
    const link = (
      <NavLink key={item.url} to={item.url} end className={navLinkClass} activeClassName={navLinkActive}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-background py-6 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo + collapse toggle */}
        <div className={`mb-6 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Swift Studio" className="h-6 w-6 shrink-0" />
            {!collapsed && (
              <div>
                <span className="font-['Instrument_Serif'] italic text-xl text-primary">Swift</span>
                <span className="text-xl font-light ml-1">Studio</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={onToggle} className="rounded-md p-1 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* New Project */}
        <div className={collapsed ? 'px-2 mb-4' : 'px-3 mb-4'}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openDialog()}
                  className="flex w-full items-center justify-center rounded-lg p-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New Project</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => openDialog()}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </button>
          )}
        </div>

        {/* Nav sections */}
        <nav className={`flex-1 space-y-6 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <div>
            {!collapsed && <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Main</p>}
            <div className="space-y-0.5">
              {mainNav.map(renderNavItem)}
            </div>
          </div>
          <div>
            {!collapsed && <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Account</p>}
            <div className="space-y-0.5">
              {accountNav.map(renderNavItem)}
            </div>
          </div>
        </nav>

        {/* Bottom section */}
        <div className={`pt-4 space-y-2 border-t ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* Credits */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/app/billing" className="flex items-center justify-center rounded-xl border bg-card p-2.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{credits} / {maxCredits} credits</TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Credits</p>
              <div className="flex items-baseline gap-1 mb-2.5">
                <span className="text-2xl font-semibold">{credits}</span>
                <span className="text-sm text-muted-foreground">/ {maxCredits} remaining</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={pct} className="h-2 flex-1" />
                <Link to="/app/billing" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                  Top up
                </Link>
              </div>
            </div>
          )}

          {/* Profile */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => navigate('/app/settings')} className="flex w-full items-center justify-center rounded-xl border bg-card p-2.5 hover:bg-accent/50 transition-colors">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-xl border bg-card p-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="shrink-0 rounded-md p-1.5 hover:bg-accent transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-40">
                    <DropdownMenuItem onClick={() => navigate('/app/settings')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/app/billing')}>Billing</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-3.5 w-3.5 mr-2" />Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
